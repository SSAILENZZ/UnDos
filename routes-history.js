const express=require('express');
const {pool,subjectSummary,round1}=require('./db');
const {auth,apiError}=require('./auth');
const r=express.Router();
r.use(auth);

function roleOnly(req,res,role){
  if(req.user?.role!==role){apiError(res,403,'No tienes permiso para ver esta información');return false}
  return true;
}

async function getStudent(studentId){
  const {rows}=await pool.query("SELECT id,rut,full_name,role,active FROM users WHERE id=$1 AND role='student'",[Number(studentId)]);
  return rows[0]||null;
}
async function getTeacher(teacherId){
  const {rows}=await pool.query("SELECT id,rut,full_name,role,active FROM users WHERE id=$1 AND role='teacher'",[Number(teacherId)]);
  return rows[0]||null;
}

async function studentYearData(studentId,yearId){
  const yq=await pool.query('SELECT id,year,active FROM academic_years WHERE id=$1',[Number(yearId)]),year=yq.rows[0];
  if(!year)return null;
  const en=await pool.query(`SELECT c.id course_id,c.name course_name
    FROM enrollments e JOIN courses c ON c.id=e.course_id
    WHERE e.student_id=$1 AND e.academic_year_id=$2 LIMIT 1`,[Number(studentId),year.id]);
  if(!en.rows[0])return {year,course:null,subjects:[],overall:{status:'in_progress',average:null}};
  const course=en.rows[0];
  const {rows}=await pool.query(`SELECT s.id subject_id,s.name subject_name,t.full_name teacher_name,
    ev.id evaluation_id,ev.name evaluation_name,ev.eval_date,ev.semester,ev.weight::float,ev.status,g.grade::float
    FROM teaching_assignments ta
    JOIN subjects s ON s.id=ta.subject_id
    JOIN users t ON t.id=ta.teacher_id
    LEFT JOIN evaluations ev ON ev.assignment_id=ta.id
    LEFT JOIN grades g ON g.evaluation_id=ev.id AND g.student_id=$1
    WHERE ta.course_id=$2 AND ta.academic_year_id=$3
    ORDER BY s.name,ev.semester,ev.eval_date NULLS LAST,ev.id`,[Number(studentId),course.course_id,year.id]);
  const map=new Map();
  for(const x of rows){
    if(!map.has(x.subject_id))map.set(x.subject_id,{id:x.subject_id,name:x.subject_name,teacherName:x.teacher_name,evaluations:[]});
    if(x.evaluation_id)map.get(x.subject_id).evaluations.push({id:x.evaluation_id,name:x.evaluation_name,date:x.eval_date,semester:x.semester,weight:Number(x.weight),status:x.status,grade:x.grade===null?null:Number(x.grade)});
  }
  const subjects=[...map.values()].map(s=>({...s,summary:subjectSummary(s.evaluations)}));
  const annuals=subjects.map(s=>s.summary.annual).filter(a=>a.status==='final');
  const allFinal=subjects.length>0&&annuals.length===subjects.length;
  const overall=allFinal?{status:'final',average:round1(annuals.reduce((n,a)=>n+a.average,0)/annuals.length)}:{status:'in_progress',average:null};
  return {year,course:{id:course.course_id,name:course.course_name},subjects,overall};
}

async function studentHistory(studentId){
  const {rows}=await pool.query(`SELECT DISTINCT ay.id,ay.year,ay.active
    FROM enrollments e JOIN academic_years ay ON ay.id=e.academic_year_id
    WHERE e.student_id=$1 ORDER BY ay.year DESC`,[Number(studentId)]);
  const years=[];
  for(const y of rows){const data=await studentYearData(studentId,y.id);if(data)years.push(data)}
  return years;
}

async function teacherHistory(teacherId){
  const {rows:years}=await pool.query(`SELECT DISTINCT ay.id,ay.year,ay.active
    FROM teaching_assignments ta JOIN academic_years ay ON ay.id=ta.academic_year_id
    WHERE ta.teacher_id=$1 ORDER BY ay.year DESC`,[Number(teacherId)]);
  const out=[];
  for(const y of years){
    const {rows}=await pool.query(`SELECT ta.id,s.name subject_name,c.name course_name,ta.active,
      (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id=ta.course_id AND e.academic_year_id=ta.academic_year_id) student_count,
      (SELECT COUNT(*)::int FROM evaluations ev WHERE ev.assignment_id=ta.id) evaluation_count,
      (SELECT COUNT(*)::int FROM evaluations ev WHERE ev.assignment_id=ta.id AND ev.status='completed') completed_evaluation_count
      FROM teaching_assignments ta
      JOIN subjects s ON s.id=ta.subject_id
      JOIN courses c ON c.id=ta.course_id
      WHERE ta.teacher_id=$1 AND ta.academic_year_id=$2
      ORDER BY c.level_order,c.name,s.name`,[Number(teacherId),y.id]);
    out.push({year:y,assignments:rows.map(x=>({id:x.id,subjectName:x.subject_name,courseName:x.course_name,active:x.active,studentCount:x.student_count,evaluationCount:x.evaluation_count,completedEvaluationCount:x.completed_evaluation_count}))});
  }
  return out;
}

r.get('/student',async(req,res)=>{
  if(!roleOnly(req,res,'student'))return;
  try{res.json({user:req.user,years:await studentHistory(req.user.id)})}catch(e){console.error(e);apiError(res,500,'No se pudo cargar tu historial académico')}
});

r.get('/teacher',async(req,res)=>{
  if(!roleOnly(req,res,'teacher'))return;
  try{res.json({user:req.user,years:await teacherHistory(req.user.id)})}catch(e){console.error(e);apiError(res,500,'No se pudo cargar tu historial docente')}
});

r.get('/admin/student/:id',async(req,res)=>{
  if(!roleOnly(req,res,'admin'))return;
  try{const u=await getStudent(req.params.id);if(!u)return apiError(res,404,'Estudiante no encontrado');res.json({previewUser:{id:u.id,rut:u.rut,fullName:u.full_name,role:'student'},years:await studentHistory(u.id)})}catch(e){console.error(e);apiError(res,500,'No se pudo cargar el historial del estudiante')}
});

r.get('/admin/teacher/:id',async(req,res)=>{
  if(!roleOnly(req,res,'admin'))return;
  try{const u=await getTeacher(req.params.id);if(!u)return apiError(res,404,'Profesor no encontrado');res.json({previewUser:{id:u.id,rut:u.rut,fullName:u.full_name,role:'teacher'},years:await teacherHistory(u.id)})}catch(e){console.error(e);apiError(res,500,'No se pudo cargar el historial del profesor')}
});

r.get('/admin',async(req,res)=>{
  if(!roleOnly(req,res,'admin'))return;
  try{
    const {rows}=await pool.query(`SELECT ay.id,ay.year,ay.active,
      (SELECT COUNT(*)::int FROM enrollments e WHERE e.academic_year_id=ay.id) student_count,
      (SELECT COUNT(DISTINCT ta.teacher_id)::int FROM teaching_assignments ta WHERE ta.academic_year_id=ay.id) teacher_count,
      (SELECT COUNT(*)::int FROM courses c WHERE c.academic_year_id=ay.id) course_count,
      (SELECT COUNT(*)::int FROM teaching_assignments ta WHERE ta.academic_year_id=ay.id) assignment_count,
      (SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ta.academic_year_id=ay.id) evaluation_count,
      (SELECT COUNT(*)::int FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ta.academic_year_id=ay.id) grade_count
      FROM academic_years ay ORDER BY ay.year DESC`);
    res.json({years:rows.map(x=>({id:x.id,year:x.year,active:x.active,studentCount:x.student_count,teacherCount:x.teacher_count,courseCount:x.course_count,assignmentCount:x.assignment_count,evaluationCount:x.evaluation_count,gradeCount:x.grade_count}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar el historial académico')}
});

module.exports=r;
