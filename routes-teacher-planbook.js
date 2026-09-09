const express=require('express');
const {pool,activeYear}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const r=express.Router();r.use(auth,requireRole('teacher'));
let ready=null;
function ensureSchema(){if(!ready)ready=pool.query(`
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
  ALTER TABLE lesson_contents ADD COLUMN IF NOT EXISTS unit_name TEXT;
  ALTER TABLE lesson_contents ADD COLUMN IF NOT EXISTS objective TEXT;
  ALTER TABLE lesson_contents ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'planned';
  ALTER TABLE lesson_contents ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX IF NOT EXISTS idx_lesson_contents_assignment_date ON lesson_contents(assignment_id,content_date);
`).catch(e=>{ready=null;throw e});return ready}
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const statuses=new Set(['planned','in_progress','completed']);
function clean(body,old={}){let status=body.status===undefined?(old.plan_status||'planned'):String(body.status);if(!statuses.has(status))status='planned';let progress=body.progress===undefined?Number(old.progress||0):Math.round(Number(body.progress));if(!Number.isFinite(progress))progress=0;progress=Math.max(0,Math.min(100,progress));if(status==='completed')progress=100;return {date:body.date===undefined?(old.content_date?String(old.content_date).slice(0,10):''):String(body.date),title:body.title===undefined?String(old.title||''):String(body.title).trim(),description:body.description===undefined?String(old.description||''):String(body.description||'').trim(),unitName:body.unitName===undefined?String(old.unit_name||''):String(body.unitName||'').trim(),objective:body.objective===undefined?String(old.objective||''):String(body.objective||'').trim(),status,progress}}
async function ownAssignment(id,userId){const {rows}=await pool.query(`SELECT ta.id,ta.academic_year_id,c.name course_name,s.name subject_name FROM teaching_assignments ta JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.id=$1 AND ta.teacher_id=$2 AND ta.active=TRUE`,[Number(id),userId]);return rows[0]||null}
r.get('/planning',async(req,res)=>{try{await ensureSchema();const y=await activeYear();const [a,c]=await Promise.all([
  pool.query(`SELECT ta.id,c.name course_name,s.name subject_name,(SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id=ta.course_id AND e.academic_year_id=ta.academic_year_id) student_count,(SELECT COUNT(*)::int FROM evaluations ev WHERE ev.assignment_id=ta.id) evaluation_count FROM teaching_assignments ta JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.teacher_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE ORDER BY c.level_order,c.name,s.name`,[req.user.id,y.id]),
  pool.query(`SELECT lc.id,lc.assignment_id,lc.content_date::text date,lc.title,COALESCE(lc.description,'') description,COALESCE(lc.unit_name,'') unit_name,COALESCE(lc.objective,'') objective,COALESCE(lc.plan_status,'planned') plan_status,COALESCE(lc.progress,0)::int progress,c.name course_name,s.name subject_name FROM lesson_contents lc JOIN teaching_assignments ta ON ta.id=lc.assignment_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.teacher_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE ORDER BY lc.content_date DESC,lc.id DESC`,[req.user.id,y.id])
]);res.json({activeYear:y,assignments:a.rows.map(x=>({id:x.id,courseName:x.course_name,subjectName:x.subject_name,studentCount:Number(x.student_count||0),evaluationCount:Number(x.evaluation_count||0)})),items:c.rows.map(x=>({id:x.id,assignmentId:x.assignment_id,date:x.date,title:x.title,description:x.description,unitName:x.unit_name,objective:x.objective,status:x.plan_status,progress:Number(x.progress||0),courseName:x.course_name,subjectName:x.subject_name}))})}catch(e){console.error(e);apiError(res,500,'No se pudo cargar la planificación docente')}});
r.post('/planning/contents',async(req,res)=>{try{await ensureSchema();const assignmentId=Number(req.body.assignmentId),a=await ownAssignment(assignmentId,req.user.id);if(!a)return apiError(res,404,'Clase no encontrada');const x=clean(req.body);if(!validDate(x.date)||!x.title)return apiError(res,400,'Indica una fecha y un título válidos');const {rows}=await pool.query(`INSERT INTO lesson_contents(assignment_id,content_date,title,description,created_by,unit_name,objective,plan_status,progress) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[assignmentId,x.date,x.title,x.description||null,req.user.id,x.unitName||null,x.objective||null,x.status,x.progress]);res.status(201).json({id:rows[0].id})}catch(e){console.error(e);apiError(res,500,'No se pudo guardar la planificación')}});
r.patch('/planning/contents/:id',async(req,res)=>{try{await ensureSchema();const q=await pool.query(`SELECT lc.* FROM lesson_contents lc JOIN teaching_assignments ta ON ta.id=lc.assignment_id WHERE lc.id=$1 AND ta.teacher_id=$2`,[Number(req.params.id),req.user.id]),old=q.rows[0];if(!old)return apiError(res,404,'Planificación no encontrada');const x=clean(req.body,old);if(!validDate(x.date)||!x.title)return apiError(res,400,'Datos de planificación inválidos');await pool.query(`UPDATE lesson_contents SET content_date=$1,title=$2,description=$3,unit_name=$4,objective=$5,plan_status=$6,progress=$7,updated_at=NOW() WHERE id=$8`,[x.date,x.title,x.description||null,x.unitName||null,x.objective||null,x.status,x.progress,old.id]);res.json({ok:true})}catch(e){console.error(e);apiError(res,500,'No se pudo actualizar la planificación')}});
r.delete('/planning/contents/:id',async(req,res)=>{try{await ensureSchema();const q=await pool.query(`DELETE FROM lesson_contents lc USING teaching_assignments ta WHERE lc.id=$1 AND lc.assignment_id=ta.id AND ta.teacher_id=$2 RETURNING lc.id`,[Number(req.params.id),req.user.id]);if(!q.rowCount)return apiError(res,404,'Planificación no encontrada');res.json({ok:true})}catch(e){console.error(e);apiError(res,500,'No se pudo eliminar la planificación')}});
module.exports=r;
