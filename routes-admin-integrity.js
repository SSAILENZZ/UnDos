const express=require('express');
const bcrypt=require('bcryptjs');
const {pool,normalizeRut,validateRut,activeYear}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const {recordAudit}=require('./audit');
const r=express.Router();
r.use(auth,requireRole('admin'));

const parseBool=v=>{if(v===true||v===1||v==='1'||String(v).toLowerCase()==='true')return true;if(v===false||v===0||v==='0'||String(v).toLowerCase()==='false')return false;return null};
const optionalId=v=>v===undefined||v===null||v===''?null:Number(v);
const positiveInt=v=>Number.isInteger(v)&&v>0;

r.post('/users',async(req,res)=>{
  const c=await pool.connect();
  try{
    const rut=normalizeRut(req.body.rut),fullName=String(req.body.fullName||'').trim(),role=String(req.body.role||''),password=String(req.body.password||''),courseId=optionalId(req.body.courseId);
    if(!validateRut(rut))return apiError(res,400,'El RUT no es válido');
    if(!fullName)return apiError(res,400,'Falta el nombre');
    if(!['student','teacher','admin'].includes(role))return apiError(res,400,'Rol inválido');
    if(password.length<8)return apiError(res,400,'La contraseña debe tener al menos 8 caracteres');
    if(courseId!==null&&!positiveInt(courseId))return apiError(res,400,'Curso inválido');
    await c.query('BEGIN');
    const y=await activeYear(c);let course=null;
    if(role==='student'&&courseId!==null){const q=await c.query('SELECT id,name FROM courses WHERE id=$1 AND academic_year_id=$2 AND active=TRUE',[courseId,y.id]);course=q.rows[0];if(!course){await c.query('ROLLBACK');return apiError(res,400,'El curso no pertenece al año escolar activo o está archivado')}}
    const hash=await bcrypt.hash(password,12),q=await c.query('INSERT INTO users(rut,full_name,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,rut,full_name,role,active',[rut,fullName,hash,role]),u=q.rows[0];
    if(role==='student'&&course)await c.query('INSERT INTO enrollments(student_id,course_id,academic_year_id) VALUES($1,$2,$3)',[u.id,course.id,y.id]);
    await c.query('COMMIT');
    await recordAudit({actorId:req.user.id,actorRole:req.user.role,action:'user.create',entityType:'user',entityId:u.id,description:`Creó la cuenta de ${u.full_name} como ${u.role}.`,metadata:{rut:u.rut,role:u.role,courseId:course?.id||null,courseName:course?.name||null,academicYear:y.year}});
    res.status(201).json({id:u.id,rut:u.rut,fullName:u.full_name,role:u.role,active:u.active});
  }catch(e){await c.query('ROLLBACK').catch(()=>{});if(e.code==='23505')return apiError(res,409,'Ese RUT ya existe');console.error(e);apiError(res,500,'No se pudo crear el usuario')}finally{c.release()}
});

r.patch('/users/:id',async(req,res)=>{
  const c=await pool.connect();
  try{
    const id=Number(req.params.id);if(!positiveInt(id))return apiError(res,400,'Usuario inválido');
    await c.query('BEGIN');
    const q=await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[id]),old=q.rows[0];if(!old){await c.query('ROLLBACK');return apiError(res,404,'Usuario no encontrado')}
    const rut=req.body.rut!==undefined?normalizeRut(req.body.rut):old.rut,fullName=req.body.fullName!==undefined?String(req.body.fullName).trim():old.full_name,role=req.body.role!==undefined?String(req.body.role):old.role,parsedActive=req.body.active!==undefined?parseBool(req.body.active):old.active;
    if(parsedActive===null){await c.query('ROLLBACK');return apiError(res,400,'Estado de cuenta inválido')}
    const active=parsedActive;
    if(!validateRut(rut)||!fullName||!['student','teacher','admin'].includes(role)){await c.query('ROLLBACK');return apiError(res,400,'Datos inválidos')}
    if(id===req.user.id&&!active){await c.query('ROLLBACK');return apiError(res,400,'No puedes desactivar tu propia cuenta')}
    if(id===req.user.id&&role!=='admin'){await c.query('ROLLBACK');return apiError(res,400,'No puedes cambiar tu propio rol de administrador')}
    if(old.role==='admin'&&(role!=='admin'||!active)){const admins=await c.query("SELECT COUNT(*)::int total FROM users WHERE role='admin' AND active=TRUE AND id<>$1",[id]);if(Number(admins.rows[0]?.total||0)<1){await c.query('ROLLBACK');return apiError(res,400,'Debe quedar al menos un administrador activo')}}
    const y=await activeYear(c);let deactivatedAssignments=0;
    if(old.role==='teacher'&&(role!=='teacher'||!active)){const dq=await c.query('UPDATE teaching_assignments SET active=FALSE WHERE teacher_id=$1 AND academic_year_id=$2 AND active=TRUE',[id,y.id]);deactivatedAssignments=dq.rowCount||0}
    const {rows}=await c.query('UPDATE users SET rut=$1,full_name=$2,role=$3,active=$4,updated_at=NOW() WHERE id=$5 RETURNING id,rut,full_name,role,active',[rut,fullName,role,active,id]),u=rows[0];
    await c.query('COMMIT');
    await recordAudit({actorId:req.user.id,actorRole:req.user.role,action:'user.update',entityType:'user',entityId:id,description:`Actualizó la cuenta de ${u.full_name}.`,metadata:{before:{rut:old.rut,fullName:old.full_name,role:old.role,active:old.active},after:{rut:u.rut,fullName:u.full_name,role:u.role,active:u.active},deactivatedAssignments,academicYear:y.year}});
    res.json({id:u.id,rut:u.rut,fullName:u.full_name,role:u.role,active:u.active});
  }catch(e){await c.query('ROLLBACK').catch(()=>{});if(e.code==='23505')return apiError(res,409,'Ese RUT ya existe');console.error(e);apiError(res,500,'No se pudo actualizar el usuario')}finally{c.release()}
});

r.post('/enrollments',async(req,res)=>{
  try{
    const studentId=Number(req.body.studentId),courseId=Number(req.body.courseId),y=await activeYear();
    if(!positiveInt(studentId)||!positiveInt(courseId))return apiError(res,400,'Datos de matrícula inválidos');
    const [s,course,old]=await Promise.all([
      pool.query("SELECT id,full_name FROM users WHERE id=$1 AND role='student' AND active=TRUE",[studentId]),
      pool.query('SELECT id,name FROM courses WHERE id=$1 AND academic_year_id=$2 AND active=TRUE',[courseId,y.id]),
      pool.query('SELECT c.id,c.name FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=$1 AND e.academic_year_id=$2',[studentId,y.id])
    ]);
    if(!s.rows[0])return apiError(res,400,'El usuario no es un estudiante activo');
    if(!course.rows[0])return apiError(res,400,'El curso no pertenece al año escolar activo o está archivado');
    await pool.query('INSERT INTO enrollments(student_id,course_id,academic_year_id) VALUES($1,$2,$3) ON CONFLICT(student_id,academic_year_id) DO UPDATE SET course_id=EXCLUDED.course_id',[studentId,courseId,y.id]);
    await recordAudit({actorId:req.user.id,actorRole:req.user.role,action:'enrollment.update',entityType:'enrollment',entityId:`${studentId}:${y.id}`,description:`Asignó a ${s.rows[0].full_name} al curso ${course.rows[0].name}.`,metadata:{studentId,academicYear:y.year,beforeCourseId:old.rows[0]?.id||null,beforeCourseName:old.rows[0]?.name||null,afterCourseId:courseId,afterCourseName:course.rows[0].name}});
    res.json({ok:true});
  }catch(e){console.error(e);apiError(res,500,'No se pudo asignar el curso')}
});

r.post('/assignments',async(req,res)=>{
  try{
    const teacherId=Number(req.body.teacherId),subjectId=Number(req.body.subjectId),courseId=Number(req.body.courseId),y=await activeYear();
    if(![teacherId,subjectId,courseId].every(positiveInt))return apiError(res,400,'Datos de asignación inválidos');
    const [t,s,c,existing]=await Promise.all([
      pool.query("SELECT id,full_name FROM users WHERE id=$1 AND role='teacher' AND active=TRUE",[teacherId]),
      pool.query('SELECT id,name FROM subjects WHERE id=$1 AND active=TRUE',[subjectId]),
      pool.query('SELECT id,name FROM courses WHERE id=$1 AND academic_year_id=$2 AND active=TRUE',[courseId,y.id]),
      pool.query('SELECT id,active FROM teaching_assignments WHERE teacher_id=$1 AND subject_id=$2 AND course_id=$3 AND academic_year_id=$4',[teacherId,subjectId,courseId,y.id])
    ]);
    if(!t.rows[0])return apiError(res,400,'Profesor inválido o inactivo');
    if(!s.rows[0]||!c.rows[0])return apiError(res,400,'La materia o el curso no están activos');
    if(existing.rows[0]?.active)return apiError(res,409,'Esa asignación ya existe');
    const {rows}=await pool.query(`INSERT INTO teaching_assignments(teacher_id,subject_id,course_id,academic_year_id,active) VALUES($1,$2,$3,$4,TRUE) ON CONFLICT(teacher_id,subject_id,course_id,academic_year_id) DO UPDATE SET active=TRUE RETURNING id`,[teacherId,subjectId,courseId,y.id]);
    const reactivated=!!existing.rows[0];
    await recordAudit({actorId:req.user.id,actorRole:req.user.role,action:reactivated?'assignment.reactivate':'assignment.create',entityType:'teaching_assignment',entityId:rows[0].id,description:`${reactivated?'Reactivó':'Asignó'} ${s.rows[0].name} · ${c.rows[0].name} para ${t.rows[0].full_name}.`,metadata:{teacherId,teacherName:t.rows[0].full_name,subjectId,subjectName:s.rows[0].name,courseId,courseName:c.rows[0].name,academicYear:y.year}});
    res.status(reactivated?200:201).json({id:rows[0].id,reactivated});
  }catch(e){console.error(e);apiError(res,500,'No se pudo asignar la clase')}
});

module.exports=r;
