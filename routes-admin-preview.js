const express=require('express');
const {pool,activeYear,subjectSummary,round1}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const r=express.Router();
r.use(auth,requireRole('admin'));

async function activeRoleUser(id,role){
  const {rows}=await pool.query('SELECT id,rut,full_name,role,active FROM users WHERE id=$1 AND role=$2 AND active=TRUE',[Number(id),role]);
  return rows[0]||null;
}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`))}

r.get('/student/:id',async(req,res)=>{
  try{
    const student=await activeRoleUser(req.params.id,'student');
    if(!student)return apiError(res,404,'Estudiante no encontrado');
    const y=await activeYear();
    const en=await pool.query('SELECT e.course_id,c.name course_name FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=$1 AND e.academic_year_id=$2 LIMIT 1',[student.id,y.id]);
    if(!en.rows[0])return res.json({previewUser:{id:student.id,rut:student.rut,fullName:student.full_name,role:'student'},activeYear:y,course:null,subjects:[],overall:{status:'in_progress',average:null}});
    const course=en.rows[0];
    const {rows}=await pool.query(`SELECT s.id subject_id,s.name subject_name,u.full_name teacher_name,ev.id evaluation_id,ev.name evaluation_name,ev.eval_date,ev.semester,ev.weight::float,ev.status,g.grade::float
      FROM teaching_assignments ta
      JOIN subjects s ON s.id=ta.subject_id
      LEFT JOIN users u ON u.id=ta.teacher_id
      LEFT JOIN evaluations ev ON ev.assignment_id=ta.id
      LEFT JOIN grades g ON g.evaluation_id=ev.id AND g.student_id=$1
      WHERE ta.course_id=$2 AND ta.academic_year_id=$3 AND ta.active=TRUE
      ORDER BY s.name,ev.semester,ev.eval_date NULLS LAST,ev.id`,[student.id,course.course_id,y.id]);
    const map=new Map();
    for(const x of rows){
      if(!map.has(x.subject_id))map.set(x.subject_id,{id:x.subject_id,name:x.subject_name,teacherName:x.teacher_name||null,evaluations:[]});
      if(x.evaluation_id)map.get(x.subject_id).evaluations.push({id:x.evaluation_id,name:x.evaluation_name,date:x.eval_date,semester:x.semester,weight:Number(x.weight),status:x.status,grade:x.grade===null?null:Number(x.grade)});
    }
    const subjects=[...map.values()].map(s=>({...s,summary:subjectSummary(s.evaluations)}));
    const annuals=subjects.map(s=>s.summary.annual).filter(a=>a.status==='final');
    const allFinal=subjects.length>0&&annuals.length===subjects.length;
    const overall=allFinal?{status:'final',average:round1(annuals.reduce((n,a)=>n+a.average,0)/annuals.length)}:{status:'in_progress',average:null};
    res.json({previewUser:{id:student.id,rut:student.rut,fullName:student.full_name,role:'student'},activeYear:y,course:{id:course.course_id,name:course.course_name},subjects,overall});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar la vista del estudiante')}
});

r.get('/teacher/:id',async(req,res)=>{
  try{
    const teacher=await activeRoleUser(req.params.id,'teacher');
    if(!teacher)return apiError(res,404,'Profesor no encontrado');
    const y=await activeYear();
    const {rows}=await pool.query(`SELECT ta.id,s.name subject_name,c.name course_name,
      (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id=c.id AND e.academic_year_id=$2) student_count,
      (SELECT COUNT(*)::int FROM evaluations ev WHERE ev.assignment_id=ta.id) evaluation_count
      FROM teaching_assignments ta
      JOIN subjects s ON s.id=ta.subject_id
      JOIN courses c ON c.id=ta.course_id
      WHERE ta.teacher_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE
      ORDER BY c.level_order,c.name,s.name`,[teacher.id,y.id]);
    res.json({previewUser:{id:teacher.id,rut:teacher.rut,fullName:teacher.full_name,role:'teacher'},activeYear:y,assignments:rows.map(x=>({id:x.id,subjectName:x.subject_name,courseName:x.course_name,studentCount:x.student_count,evaluationCount:x.evaluation_count}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar la vista del profesor')}
});

r.get('/teacher/:teacherId/assignments/:assignmentId',async(req,res)=>{
  try{
    const teacher=await activeRoleUser(req.params.teacherId,'teacher');
    if(!teacher)return apiError(res,404,'Profesor no encontrado');
    const q=await pool.query(`SELECT ta.id,ta.course_id,ta.academic_year_id,s.name subject_name,c.name course_name,ay.year
      FROM teaching_assignments ta
      JOIN subjects s ON s.id=ta.subject_id
      JOIN courses c ON c.id=ta.course_id
      JOIN academic_years ay ON ay.id=ta.academic_year_id
      WHERE ta.id=$1 AND ta.teacher_id=$2 AND ta.active=TRUE`,[Number(req.params.assignmentId),teacher.id]);
    const a=q.rows[0];
    if(!a)return apiError(res,404,'Clase no encontrada');
    const [students,evals,grades]=await Promise.all([
      pool.query(`SELECT u.id,u.rut,u.full_name FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.course_id=$1 AND e.academic_year_id=$2 AND u.active=TRUE ORDER BY u.full_name`,[a.course_id,a.academic_year_id]),
      pool.query('SELECT id,name,eval_date,semester,weight::float,status FROM evaluations WHERE assignment_id=$1 ORDER BY semester,eval_date NULLS LAST,id',[a.id]),
      pool.query('SELECT g.evaluation_id,g.student_id,g.grade::float FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id WHERE ev.assignment_id=$1',[a.id])
    ]);
    const coverage={1:0,2:0};for(const ev of evals.rows)if(ev.status==='completed')coverage[ev.semester]+=Number(ev.weight);
    res.json({previewUser:{id:teacher.id,rut:teacher.rut,fullName:teacher.full_name,role:'teacher'},assignment:{id:a.id,subjectName:a.subject_name,courseName:a.course_name,year:a.year},students:students.rows.map(x=>({id:x.id,rut:x.rut,fullName:x.full_name})),evaluations:evals.rows.map(x=>({id:x.id,name:x.name,date:x.eval_date,semester:x.semester,weight:Number(x.weight),status:x.status})),grades:grades.rows.map(x=>({evaluationId:x.evaluation_id,studentId:x.student_id,grade:Number(x.grade)})),completedWeight:coverage});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar la clase del profesor')}
});

r.get('/teacher/:teacherId/assignments/:assignmentId/attendance',async(req,res)=>{
  try{
    const teacher=await activeRoleUser(req.params.teacherId,'teacher');if(!teacher)return apiError(res,404,'Profesor no encontrado');
    const q=await pool.query(`SELECT ta.id,ta.course_id,ta.academic_year_id,s.name subject_name,c.name course_name,ay.year
      FROM teaching_assignments ta JOIN subjects s ON s.id=ta.subject_id JOIN courses c ON c.id=ta.course_id JOIN academic_years ay ON ay.id=ta.academic_year_id
      WHERE ta.id=$1 AND ta.teacher_id=$2 AND ta.active=TRUE`,[Number(req.params.assignmentId),teacher.id]);
    const a=q.rows[0];if(!a)return apiError(res,404,'Clase no encontrada');
    const date=String(req.query.date||new Date().toISOString().slice(0,10));if(!validDate(date))return apiError(res,400,'Fecha inválida');
    const [students,records,days]=await Promise.all([
      pool.query(`SELECT u.id,u.rut,u.full_name FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.course_id=$1 AND e.academic_year_id=$2 AND u.active=TRUE ORDER BY u.full_name`,[a.course_id,a.academic_year_id]),
      pool.query('SELECT student_id,status FROM attendance_records WHERE assignment_id=$1 AND attendance_date=$2',[a.id,date]),
      pool.query(`SELECT attendance_date::text date,COUNT(*) FILTER (WHERE status='present')::int present_count,COUNT(*) FILTER (WHERE status='absent')::int absent_count FROM attendance_records WHERE assignment_id=$1 GROUP BY attendance_date ORDER BY attendance_date DESC LIMIT 40`,[a.id])
    ]);
    const map=new Map(records.rows.map(x=>[x.student_id,x.status]));
    const list=students.rows.map(x=>({id:x.id,rut:x.rut,fullName:x.full_name,status:map.get(x.id)||null}));
    res.json({assignment:{id:a.id,subjectName:a.subject_name,courseName:a.course_name,year:a.year},date,students:list,summary:{present:list.filter(x=>x.status==='present').length,absent:list.filter(x=>x.status==='absent').length,unmarked:list.filter(x=>!x.status).length},days:days.rows.map(x=>({date:x.date,present:Number(x.present_count),absent:Number(x.absent_count)}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar la vista de asistencia')}
});

module.exports=r;
