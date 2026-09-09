const express=require('express');
const {pool,activeYear}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const {chileMonth,validMonth,monthRange}=require('./date-utils');
const r=express.Router();
r.use(auth,requireRole('student'));
let ready=null;
function ensureSchema(){if(!ready)ready=pool.query(`CREATE TABLE IF NOT EXISTS lesson_contents(id SERIAL PRIMARY KEY,assignment_id INTEGER NOT NULL REFERENCES teaching_assignments(id) ON DELETE CASCADE,content_date DATE NOT NULL,title TEXT NOT NULL,description TEXT,created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());CREATE INDEX IF NOT EXISTS idx_lesson_contents_assignment_date ON lesson_contents(assignment_id,content_date);`).catch(e=>{ready=null;throw e});return ready}
r.get('/calendar',async(req,res)=>{try{
  await ensureSchema();const y=await activeYear(),rawMonth=req.query.month==null?'':String(req.query.month);if(rawMonth&&!validMonth(rawMonth))return apiError(res,400,'Mes inválido');const month=rawMonth||chileMonth(),[start,end]=monthRange(month);
  const en=await pool.query(`SELECT e.course_id,c.name course_name FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=$1 AND e.academic_year_id=$2 AND c.active=TRUE LIMIT 1`,[req.user.id,y.id]);
  if(!en.rows[0])return res.json({activeYear:y,month,rule:{maxEvaluationsPerCoursePerDay:2},course:null,subjects:[],evaluations:[],contents:[]});const course=en.rows[0];
  const [subjects,evals,contents]=await Promise.all([
    pool.query(`SELECT ta.id assignment_id,s.id subject_id,s.name subject_name,u.full_name teacher_name FROM teaching_assignments ta JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.course_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE AND s.active=TRUE AND u.active=TRUE ORDER BY s.name,u.full_name`,[course.course_id,y.id]),
    pool.query(`SELECT ev.id,ev.name,ev.eval_date::text date,ev.semester,ev.weight::float,ev.status,s.id subject_id,s.name subject_name,u.full_name teacher_name FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.course_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE AND s.active=TRUE AND u.active=TRUE AND ev.eval_date >= $3 AND ev.eval_date < $4 ORDER BY ev.eval_date,s.name`,[course.course_id,y.id,start,end]),
    pool.query(`SELECT lc.id,lc.content_date::text date,lc.title,lc.description,s.id subject_id,s.name subject_name,u.full_name teacher_name FROM lesson_contents lc JOIN teaching_assignments ta ON ta.id=lc.assignment_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.course_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE AND s.active=TRUE AND u.active=TRUE AND lc.content_date >= $3 AND lc.content_date < $4 ORDER BY lc.content_date,s.name`,[course.course_id,y.id,start,end])
  ]);
  res.json({activeYear:y,month,rule:{maxEvaluationsPerCoursePerDay:2},course:{id:course.course_id,name:course.course_name},subjects:subjects.rows.map(x=>({assignmentId:x.assignment_id,id:x.subject_id,name:x.subject_name,teacherName:x.teacher_name})),evaluations:evals.rows.map(x=>({id:x.id,name:x.name,date:x.date,semester:x.semester,weight:Number(x.weight),status:x.status,subjectId:x.subject_id,subjectName:x.subject_name,teacherName:x.teacher_name})),contents:contents.rows.map(x=>({id:x.id,date:x.date,title:x.title,description:x.description||'',subjectId:x.subject_id,subjectName:x.subject_name,teacherName:x.teacher_name}))});
}catch(e){console.error(e);apiError(res,500,'No se pudo cargar tu calendario académico')}});
module.exports=r;
