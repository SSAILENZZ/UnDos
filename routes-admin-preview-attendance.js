const express=require('express');
const {pool,activeYear,round1}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const r=express.Router();
r.use(auth,requireRole('admin'));

r.get('/student/:id/attendance',async(req,res)=>{
  try{
    const studentId=Number(req.params.id);
    const uq=await pool.query("SELECT id,rut,full_name FROM users WHERE id=$1 AND role='student' AND active=TRUE",[studentId]);
    const student=uq.rows[0];if(!student)return apiError(res,404,'Estudiante no encontrado');
    const y=await activeYear();
    const en=await pool.query(`SELECT e.course_id,c.name course_name FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=$1 AND e.academic_year_id=$2 AND c.active=TRUE LIMIT 1`,[studentId,y.id]);
    if(!en.rows[0])return res.json({previewUser:{id:student.id,rut:student.rut,fullName:student.full_name,role:'student'},activeYear:y,course:null,summary:{total:0,present:0,absent:0,days:0,percentage:null},subjects:[],records:[]});
    const course=en.rows[0];
    const {rows}=await pool.query(`SELECT ar.attendance_date::text date,ar.status,ta.id assignment_id,s.id subject_id,s.name subject_name,t.full_name teacher_name
      FROM attendance_records ar JOIN teaching_assignments ta ON ta.id=ar.assignment_id JOIN subjects s ON s.id=ta.subject_id JOIN users t ON t.id=ta.teacher_id
      WHERE ar.student_id=$1 AND ta.academic_year_id=$2 AND ta.course_id=$3 ORDER BY ar.attendance_date DESC,s.name,ta.id`,[studentId,y.id,course.course_id]);
    const total=rows.length,present=rows.filter(x=>x.status==='present').length,absent=rows.filter(x=>x.status==='absent').length,days=new Set(rows.map(x=>x.date)).size;
    const map=new Map();for(const x of rows){if(!map.has(x.subject_id))map.set(x.subject_id,{id:x.subject_id,name:x.subject_name,teacherName:x.teacher_name,total:0,present:0,absent:0,percentage:null});const s=map.get(x.subject_id);s.total++;if(x.status==='present')s.present++;else if(x.status==='absent')s.absent++}
    const subjects=[...map.values()].map(s=>({...s,percentage:s.total?round1(s.present*100/s.total):null})).sort((a,b)=>a.name.localeCompare(b.name,'es'));
    res.json({previewUser:{id:student.id,rut:student.rut,fullName:student.full_name,role:'student'},activeYear:y,course:{id:course.course_id,name:course.course_name},summary:{total,present,absent,days,percentage:total?round1(present*100/total):null},subjects,records:rows.map(x=>({date:x.date,status:x.status,assignmentId:x.assignment_id,subjectId:x.subject_id,subjectName:x.subject_name,teacherName:x.teacher_name}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar la asistencia del estudiante')}
});
module.exports=r;
