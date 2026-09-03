const express=require('express');
const {pool,activeYear}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const r=express.Router();
r.use(auth,requireRole('admin'));

/* Vista administrativa limpia: no mezcla cursos archivados con los activos. */
r.get('/overview',async(_req,res)=>{
  try{
    const y=await activeYear();
    const [years,courses,subjects,users,assignments]=await Promise.all([
      pool.query('SELECT id,year,active FROM academic_years ORDER BY year DESC'),
      pool.query('SELECT id,name,level_order,active FROM courses WHERE academic_year_id=$1 AND active=TRUE ORDER BY level_order,name',[y.id]),
      pool.query('SELECT id,name,active FROM subjects ORDER BY name'),
      pool.query(`SELECT u.id,u.rut,u.full_name,u.role,u.active,c.id course_id,c.name course_name FROM users u LEFT JOIN enrollments e ON e.student_id=u.id AND e.academic_year_id=$1 LEFT JOIN courses c ON c.id=e.course_id ORDER BY CASE u.role WHEN 'admin' THEN 1 WHEN 'teacher' THEN 2 ELSE 3 END,u.full_name`,[y.id]),
      pool.query(`SELECT ta.id,ta.teacher_id,u.full_name teacher_name,ta.subject_id,s.name subject_name,ta.course_id,c.name course_name,ta.active FROM teaching_assignments ta JOIN users u ON u.id=ta.teacher_id JOIN subjects s ON s.id=ta.subject_id JOIN courses c ON c.id=ta.course_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE ORDER BY c.level_order,c.name,s.name,u.full_name`,[y.id])
    ]);
    res.json({activeYear:y,years:years.rows,courses:courses.rows,subjects:subjects.rows,users:users.rows.map(x=>({id:x.id,rut:x.rut,fullName:x.full_name,role:x.role,active:x.active,courseId:x.course_id,courseName:x.course_name})),assignments:assignments.rows.map(x=>({id:x.id,teacherId:x.teacher_id,teacherName:x.teacher_name,subjectId:x.subject_id,subjectName:x.subject_name,courseId:x.course_id,courseName:x.course_name,active:x.active}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar el panel de administración')}
});

r.patch('/courses/:id',async(req,res)=>{
  try{
    const id=Number(req.params.id),y=await activeYear();
    const q=await pool.query('SELECT * FROM courses WHERE id=$1 AND academic_year_id=$2',[id,y.id]),old=q.rows[0];if(!old)return apiError(res,404,'Curso no encontrado');
    const name=req.body.name!==undefined?String(req.body.name).trim():old.name,levelOrder=req.body.levelOrder!==undefined?Number(req.body.levelOrder):old.level_order;
    if(!name||!Number.isFinite(levelOrder))return apiError(res,400,'Datos del curso inválidos');
    const {rows}=await pool.query('UPDATE courses SET name=$1,level_order=$2 WHERE id=$3 RETURNING id,name,level_order,active',[name,levelOrder,id]);res.json(rows[0]);
  }catch(e){if(e.code==='23505')return apiError(res,409,'Ya existe un curso con ese nombre este año');console.error(e);apiError(res,500,'No se pudo editar el curso')}
});

r.delete('/courses/:id',async(req,res)=>{
  const c=await pool.connect();
  try{
    const id=Number(req.params.id),y=await activeYear(c);
    const q=await c.query('SELECT id,name FROM courses WHERE id=$1 AND academic_year_id=$2 AND active=TRUE',[id,y.id]);if(!q.rows[0])return apiError(res,404,'Curso no encontrado');
    const deps=await c.query(`SELECT
      (SELECT COUNT(*)::int FROM enrollments WHERE course_id=$1) enrollments,
      (SELECT COUNT(*)::int FROM teaching_assignments WHERE course_id=$1) assignments`,[id]);
    const hasData=Number(deps.rows[0].enrollments)>0||Number(deps.rows[0].assignments)>0;
    if(hasData){await c.query('BEGIN');await c.query('UPDATE courses SET active=FALSE WHERE id=$1',[id]);await c.query('UPDATE teaching_assignments SET active=FALSE WHERE course_id=$1',[id]);await c.query('COMMIT');return res.json({ok:true,archived:true,message:'El curso fue archivado para conservar su historial académico.'})}
    await c.query('DELETE FROM courses WHERE id=$1',[id]);res.json({ok:true,archived:false,message:'Curso eliminado.'});
  }catch(e){await c.query('ROLLBACK').catch(()=>{});console.error(e);apiError(res,500,'No se pudo borrar el curso')}finally{c.release()}
});
module.exports=r;
