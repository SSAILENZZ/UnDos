const express=require('express');
const {pool,activeYear}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const r=express.Router();
r.use(auth,requireRole('teacher'));

let schemaReady=null;
function ensureSchema(){
  if(!schemaReady)schemaReady=pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_contents(
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER NOT NULL REFERENCES teaching_assignments(id) ON DELETE CASCADE,
      content_date DATE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lesson_contents_assignment_date ON lesson_contents(assignment_id,content_date);
  `).catch(e=>{schemaReady=null;throw e});
  return schemaReady;
}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`))}
function validMonth(v){return /^\d{4}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(`${v}-01T00:00:00Z`))}
function monthRange(month){const start=new Date(`${month}-01T00:00:00Z`),end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);return [start.toISOString().slice(0,10),end.toISOString().slice(0,10)]}
async function ownAssignment(id,userId){const {rows}=await pool.query(`SELECT ta.id,ta.course_id,ta.academic_year_id,c.name course_name,s.name subject_name FROM teaching_assignments ta JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.id=$1 AND ta.teacher_id=$2 AND ta.active=TRUE`,[Number(id),userId]);return rows[0]||null}
async function dailyEvalCount(courseId,yearId,date,excludeId=0){const {rows}=await pool.query(`SELECT COUNT(*)::int total FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ta.course_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE AND ev.eval_date=$3 AND ev.id<>$4`,[courseId,yearId,date,Number(excludeId)||0]);return Number(rows[0]?.total||0)}

/* Regla escolar: máximo dos evaluaciones para un mismo curso durante el mismo día. */
r.post('/assignments/:id/evaluations',async(req,res,next)=>{
  try{
    const date=req.body?.date||null;if(!date)return next();if(!validDate(date))return apiError(res,400,'La fecha de la evaluación no es válida');
    const a=await ownAssignment(req.params.id,req.user.id);if(!a)return next();
    if(await dailyEvalCount(a.course_id,a.academic_year_id,date)>=2)return apiError(res,409,`El curso ${a.course_name} ya tiene 2 evaluaciones programadas para ese día. Elige otra fecha.`);
    next();
  }catch(e){console.error(e);apiError(res,500,'No se pudo verificar el calendario de evaluaciones')}
});
r.patch('/evaluations/:id',async(req,res,next)=>{
  try{
    const {rows}=await pool.query(`SELECT ev.id,ev.eval_date,ta.course_id,ta.academic_year_id,c.name course_name FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN courses c ON c.id=ta.course_id WHERE ev.id=$1 AND ta.teacher_id=$2`,[Number(req.params.id),req.user.id]);
    const ev=rows[0];if(!ev)return next();
    const date=req.body?.date===undefined?(ev.eval_date?String(ev.eval_date).slice(0,10):null):(req.body.date||null);
    if(!date)return next();if(!validDate(date))return apiError(res,400,'La fecha de la evaluación no es válida');
    if(await dailyEvalCount(ev.course_id,ev.academic_year_id,date,ev.id)>=2)return apiError(res,409,`El curso ${ev.course_name} ya tiene 2 evaluaciones programadas para ese día. Elige otra fecha.`);
    next();
  }catch(e){console.error(e);apiError(res,500,'No se pudo verificar el calendario de evaluaciones')}
});

r.get('/calendar',async(req,res)=>{
  try{
    await ensureSchema();const y=await activeYear();
    const now=new Date(),fallback=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`,month=validMonth(req.query.month)?String(req.query.month):fallback,[start,end]=monthRange(month);
    const [assignments,evals,contents]=await Promise.all([
      pool.query(`SELECT ta.id,ta.teacher_id,u.full_name teacher_name,ta.course_id,c.name course_name,ta.subject_id,s.name subject_name FROM teaching_assignments ta JOIN users u ON u.id=ta.teacher_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND u.active=TRUE AND c.active=TRUE AND s.active=TRUE ORDER BY u.full_name,c.level_order,c.name,s.name`,[y.id]),
      pool.query(`SELECT ev.id,ev.assignment_id,ev.name,ev.eval_date::text date,ev.semester,ev.weight::float,ev.status,ta.teacher_id,u.full_name teacher_name,ta.course_id,c.name course_name,s.name subject_name FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN users u ON u.id=ta.teacher_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND ev.eval_date >= $2 AND ev.eval_date < $3 ORDER BY ev.eval_date,c.level_order,c.name,s.name`,[y.id,start,end]),
      pool.query(`SELECT lc.id,lc.assignment_id,lc.content_date::text date,lc.title,lc.description,ta.teacher_id,u.full_name teacher_name,ta.course_id,c.name course_name,s.name subject_name FROM lesson_contents lc JOIN teaching_assignments ta ON ta.id=lc.assignment_id JOIN users u ON u.id=ta.teacher_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND lc.content_date >= $2 AND lc.content_date < $3 ORDER BY lc.content_date,c.level_order,c.name,s.name`,[y.id,start,end])
    ]);
    res.json({activeYear:y,month,rule:{maxEvaluationsPerCoursePerDay:2},assignments:assignments.rows.map(x=>({id:x.id,teacherId:x.teacher_id,teacherName:x.teacher_name,courseId:x.course_id,courseName:x.course_name,subjectId:x.subject_id,subjectName:x.subject_name,own:x.teacher_id===req.user.id})),evaluations:evals.rows.map(x=>({id:x.id,assignmentId:x.assignment_id,name:x.name,date:x.date,semester:x.semester,weight:Number(x.weight),status:x.status,teacherId:x.teacher_id,teacherName:x.teacher_name,courseId:x.course_id,courseName:x.course_name,subjectName:x.subject_name,own:x.teacher_id===req.user.id})),contents:contents.rows.map(x=>({id:x.id,assignmentId:x.assignment_id,date:x.date,title:x.title,description:x.description||'',teacherId:x.teacher_id,teacherName:x.teacher_name,courseId:x.course_id,courseName:x.course_name,subjectName:x.subject_name,own:x.teacher_id===req.user.id}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar el calendario docente')}
});

r.get('/assignments/:id/contents',async(req,res)=>{
  try{await ensureSchema();const a=await ownAssignment(req.params.id,req.user.id);if(!a)return apiError(res,404,'Clase no encontrada');const {rows}=await pool.query('SELECT id,content_date::text date,title,description FROM lesson_contents WHERE assignment_id=$1 ORDER BY content_date DESC,id DESC',[a.id]);res.json({contents:rows})}catch(e){console.error(e);apiError(res,500,'No se pudieron cargar los contenidos')}
});
r.post('/assignments/:id/contents',async(req,res)=>{
  try{
    await ensureSchema();const a=await ownAssignment(req.params.id,req.user.id);if(!a)return apiError(res,404,'Clase no encontrada');
    const date=String(req.body.date||''),title=String(req.body.title||'').trim(),description=String(req.body.description||'').trim();if(!validDate(date)||!title)return apiError(res,400,'Indica una fecha y un título válidos');
    const {rows}=await pool.query('INSERT INTO lesson_contents(assignment_id,content_date,title,description,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id,content_date::text date,title,description',[a.id,date,title,description||null,req.user.id]);res.status(201).json(rows[0]);
  }catch(e){console.error(e);apiError(res,500,'No se pudo registrar el contenido')}
});
r.patch('/contents/:id',async(req,res)=>{
  try{
    await ensureSchema();const q=await pool.query(`SELECT lc.*,ta.teacher_id FROM lesson_contents lc JOIN teaching_assignments ta ON ta.id=lc.assignment_id WHERE lc.id=$1 AND ta.teacher_id=$2`,[Number(req.params.id),req.user.id]),old=q.rows[0];if(!old)return apiError(res,404,'Contenido no encontrado');
    const date=req.body.date!==undefined?String(req.body.date):String(old.content_date).slice(0,10),title=req.body.title!==undefined?String(req.body.title).trim():old.title,description=req.body.description!==undefined?String(req.body.description).trim():(old.description||'');if(!validDate(date)||!title)return apiError(res,400,'Datos de contenido inválidos');
    const {rows}=await pool.query('UPDATE lesson_contents SET content_date=$1,title=$2,description=$3,updated_at=NOW() WHERE id=$4 RETURNING id,content_date::text date,title,description',[date,title,description||null,old.id]);res.json(rows[0]);
  }catch(e){console.error(e);apiError(res,500,'No se pudo actualizar el contenido')}
});
r.delete('/contents/:id',async(req,res)=>{
  try{await ensureSchema();const q=await pool.query(`DELETE FROM lesson_contents lc USING teaching_assignments ta WHERE lc.id=$1 AND lc.assignment_id=ta.id AND ta.teacher_id=$2 RETURNING lc.id`,[Number(req.params.id),req.user.id]);if(!q.rowCount)return apiError(res,404,'Contenido no encontrado');res.json({ok:true})}catch(e){console.error(e);apiError(res,500,'No se pudo borrar el contenido')}
});

module.exports=r;
