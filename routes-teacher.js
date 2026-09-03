const express=require('express');
const {pool,activeYear}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const r=express.Router();
r.use(auth,requireRole('teacher'));

async function getAssignment(req,id){
  const {rows}=await pool.query(`SELECT ta.*,s.name subject_name,c.name course_name,ay.year
    FROM teaching_assignments ta
    JOIN subjects s ON s.id=ta.subject_id
    JOIN courses c ON c.id=ta.course_id
    JOIN academic_years ay ON ay.id=ta.academic_year_id
    WHERE ta.id=$1 AND ta.teacher_id=$2 AND ta.active=TRUE`,[id,req.user.id]);
  return rows[0]||null;
}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`))}
async function attendancePayload(a,date){
  const [students,records]=await Promise.all([
    pool.query(`SELECT u.id,u.rut,u.full_name FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.course_id=$1 AND e.academic_year_id=$2 AND u.active=TRUE ORDER BY u.full_name`,[a.course_id,a.academic_year_id]),
    pool.query('SELECT student_id,status FROM attendance_records WHERE assignment_id=$1 AND attendance_date=$2',[a.id,date])
  ]);
  const map=new Map(records.rows.map(x=>[x.student_id,x.status]));
  const list=students.rows.map(x=>({id:x.id,rut:x.rut,fullName:x.full_name,status:map.get(x.id)||null}));
  return {assignment:{id:a.id,subjectName:a.subject_name,courseName:a.course_name,year:a.year},date,students:list,summary:{present:list.filter(x=>x.status==='present').length,absent:list.filter(x=>x.status==='absent').length,unmarked:list.filter(x=>!x.status).length}};
}

r.get('/assignments',async(req,res)=>{
  try{
    const y=await activeYear();
    const {rows}=await pool.query(`SELECT ta.id,s.name subject_name,c.name course_name,
      (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id=c.id AND e.academic_year_id=$2) student_count,
      (SELECT COUNT(*)::int FROM evaluations ev WHERE ev.assignment_id=ta.id) evaluation_count
      FROM teaching_assignments ta
      JOIN subjects s ON s.id=ta.subject_id
      JOIN courses c ON c.id=ta.course_id
      WHERE ta.teacher_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE
      ORDER BY c.level_order,c.name,s.name`,[req.user.id,y.id]);
    res.json({activeYear:y,assignments:rows.map(x=>({id:x.id,subjectName:x.subject_name,courseName:x.course_name,studentCount:x.student_count,evaluationCount:x.evaluation_count}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudieron cargar tus cursos')}
});

r.get('/catalog',async(req,res)=>{
  try{
    const y=await activeYear();
    const [courses,subjects,assigned]=await Promise.all([
      pool.query(`SELECT c.id,c.name,c.level_order,
        (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id=c.id AND e.academic_year_id=c.academic_year_id) student_count
        FROM courses c WHERE c.academic_year_id=$1 AND c.active=TRUE ORDER BY c.level_order,c.name`,[y.id]),
      pool.query('SELECT id,name FROM subjects WHERE active=TRUE ORDER BY name'),
      pool.query('SELECT course_id,subject_id FROM teaching_assignments WHERE teacher_id=$1 AND academic_year_id=$2 AND active=TRUE',[req.user.id,y.id])
    ]);
    res.json({activeYear:y,courses:courses.rows.map(x=>({id:x.id,name:x.name,studentCount:x.student_count})),subjects:subjects.rows.map(x=>({id:x.id,name:x.name})),assigned:assigned.rows.map(x=>({courseId:x.course_id,subjectId:x.subject_id}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudieron cargar los cursos y materias disponibles')}
});

r.post('/assignments',async(req,res)=>{
  try{
    const y=await activeYear(),courseId=Number(req.body.courseId),subjectId=Number(req.body.subjectId);
    if(!Number.isInteger(courseId)||!Number.isInteger(subjectId))return apiError(res,400,'Selecciona un curso y una materia válidos');
    const [course,subject]=await Promise.all([
      pool.query('SELECT id,name FROM courses WHERE id=$1 AND academic_year_id=$2 AND active=TRUE',[courseId,y.id]),
      pool.query('SELECT id,name FROM subjects WHERE id=$1 AND active=TRUE',[subjectId])
    ]);
    if(!course.rows[0])return apiError(res,404,'El curso no está disponible en el año académico actual');
    if(!subject.rows[0])return apiError(res,404,'La materia no está disponible');
    const {rows}=await pool.query(`INSERT INTO teaching_assignments(teacher_id,subject_id,course_id,academic_year_id,active)
      VALUES($1,$2,$3,$4,TRUE)
      ON CONFLICT(teacher_id,subject_id,course_id,academic_year_id)
      DO UPDATE SET active=TRUE
      RETURNING id`,[req.user.id,subjectId,courseId,y.id]);
    res.status(201).json({id:rows[0].id,courseName:course.rows[0].name,subjectName:subject.rows[0].name});
  }catch(e){console.error(e);apiError(res,500,'No se pudo agregar el curso y la materia')}
});

r.get('/assignments/:id',async(req,res)=>{
  try{
    const a=await getAssignment(req,Number(req.params.id));
    if(!a)return apiError(res,404,'Clase no encontrada');
    const [students,evals,grades]=await Promise.all([
      pool.query(`SELECT u.id,u.rut,u.full_name FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.course_id=$1 AND e.academic_year_id=$2 AND u.active=TRUE ORDER BY u.full_name`,[a.course_id,a.academic_year_id]),
      pool.query('SELECT id,name,eval_date,semester,weight::float,status FROM evaluations WHERE assignment_id=$1 ORDER BY semester,eval_date NULLS LAST,id',[a.id]),
      pool.query('SELECT g.evaluation_id,g.student_id,g.grade::float FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id WHERE ev.assignment_id=$1',[a.id])
    ]);
    const coverage={1:0,2:0};
    for(const ev of evals.rows)if(ev.status==='completed')coverage[ev.semester]+=Number(ev.weight);
    res.json({assignment:{id:a.id,subjectName:a.subject_name,courseName:a.course_name,year:a.year},students:students.rows.map(x=>({id:x.id,rut:x.rut,fullName:x.full_name})),evaluations:evals.rows.map(x=>({id:x.id,name:x.name,date:x.eval_date,semester:x.semester,weight:Number(x.weight),status:x.status})),grades:grades.rows.map(x=>({evaluationId:x.evaluation_id,studentId:x.student_id,grade:Number(x.grade)})),completedWeight:coverage});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar el libro de clases')}
});

r.get('/assignments/:id/attendance/dates',async(req,res)=>{
  try{
    const a=await getAssignment(req,Number(req.params.id));if(!a)return apiError(res,404,'Clase no encontrada');
    const {rows}=await pool.query(`SELECT attendance_date::text date,
      COUNT(*) FILTER (WHERE status='present')::int present_count,
      COUNT(*) FILTER (WHERE status='absent')::int absent_count
      FROM attendance_records WHERE assignment_id=$1 GROUP BY attendance_date ORDER BY attendance_date DESC LIMIT 40`,[a.id]);
    res.json({days:rows.map(x=>({date:x.date,present:Number(x.present_count),absent:Number(x.absent_count)}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar el historial de asistencia')}
});

r.get('/assignments/:id/attendance',async(req,res)=>{
  try{
    const a=await getAssignment(req,Number(req.params.id));if(!a)return apiError(res,404,'Clase no encontrada');
    const date=String(req.query.date||new Date().toISOString().slice(0,10));if(!validDate(date))return apiError(res,400,'Fecha inválida');
    res.json(await attendancePayload(a,date));
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar la asistencia')}
});

r.post('/assignments/:id/attendance',async(req,res)=>{
  const c=await pool.connect();
  try{
    const a=await getAssignment(req,Number(req.params.id));if(!a)return apiError(res,404,'Clase no encontrada');
    const date=String(req.body.date||'');if(!validDate(date))return apiError(res,400,'Fecha inválida');
    const records=Array.isArray(req.body.records)?req.body.records:[];if(!records.length)return apiError(res,400,'No hay registros de asistencia');
    await c.query('BEGIN');
    for(const item of records){
      const studentId=Number(item.studentId),status=item.status==null?null:String(item.status);
      if(!Number.isInteger(studentId)||!['present','absent',null].includes(status))throw new Error('Registro inválido');
      const en=await c.query('SELECT 1 FROM enrollments WHERE student_id=$1 AND course_id=$2 AND academic_year_id=$3',[studentId,a.course_id,a.academic_year_id]);
      if(!en.rows[0])throw new Error('Estudiante fuera del curso');
      if(status===null)await c.query('DELETE FROM attendance_records WHERE assignment_id=$1 AND student_id=$2 AND attendance_date=$3',[a.id,studentId,date]);
      else await c.query(`INSERT INTO attendance_records(assignment_id,student_id,attendance_date,status,recorded_by)
        VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(assignment_id,student_id,attendance_date)
        DO UPDATE SET status=EXCLUDED.status,recorded_by=EXCLUDED.recorded_by,updated_at=NOW()`,[a.id,studentId,date,status,req.user.id]);
    }
    await c.query('COMMIT');
    res.json(await attendancePayload(a,date));
  }catch(e){await c.query('ROLLBACK').catch(()=>{});console.error(e);apiError(res,400,e.message==='Registro inválido'?'Registro de asistencia inválido':e.message==='Estudiante fuera del curso'?'El estudiante no pertenece a este curso':'No se pudo guardar la asistencia')}
  finally{c.release()}
});

r.post('/assignments/:id/evaluations',async(req,res)=>{
  try{
    const a=await getAssignment(req,Number(req.params.id));
    if(!a)return apiError(res,404,'Clase no encontrada');
    const name=String(req.body.name||'').trim(),semester=Number(req.body.semester),weight=Number(req.body.weight),status=req.body.status==='completed'?'completed':'pending',date=req.body.date||null;
    if(!name||![1,2].includes(semester)||!(weight>0&&weight<=100))return apiError(res,400,'Datos de evaluación inválidos');
    const q=await pool.query('SELECT COALESCE(SUM(weight),0)::float total FROM evaluations WHERE assignment_id=$1 AND semester=$2',[a.id,semester]);
    if(Number(q.rows[0].total)+weight>100.001)return apiError(res,400,'La ponderación total del semestre no puede superar 100%');
    const {rows}=await pool.query('INSERT INTO evaluations(assignment_id,name,eval_date,semester,weight,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,eval_date,semester,weight::float,status',[a.id,name,date,semester,weight,status]);
    res.status(201).json(rows[0]);
  }catch(e){console.error(e);apiError(res,500,'No se pudo crear la evaluación')}
});

r.patch('/evaluations/:id',async(req,res)=>{
  try{
    const id=Number(req.params.id),q=await pool.query(`SELECT ev.* FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ev.id=$1 AND ta.teacher_id=$2`,[id,req.user.id]),old=q.rows[0];
    if(!old)return apiError(res,404,'Evaluación no encontrada');
    const name=req.body.name!==undefined?String(req.body.name).trim():old.name,semester=req.body.semester!==undefined?Number(req.body.semester):old.semester,weight=req.body.weight!==undefined?Number(req.body.weight):Number(old.weight),status=req.body.status!==undefined?req.body.status:old.status,date=req.body.date!==undefined?(req.body.date||null):old.eval_date;
    if(!name||![1,2].includes(semester)||!(weight>0&&weight<=100)||!['pending','completed'].includes(status))return apiError(res,400,'Datos de evaluación inválidos');
    const sum=await pool.query('SELECT COALESCE(SUM(weight),0)::float total FROM evaluations WHERE assignment_id=$1 AND semester=$2 AND id<>$3',[old.assignment_id,semester,id]);
    if(Number(sum.rows[0].total)+weight>100.001)return apiError(res,400,'La ponderación total del semestre no puede superar 100%');
    const {rows}=await pool.query('UPDATE evaluations SET name=$1,eval_date=$2,semester=$3,weight=$4,status=$5,updated_at=NOW() WHERE id=$6 RETURNING id,name,eval_date,semester,weight::float,status',[name,date,semester,weight,status,id]);
    res.json(rows[0]);
  }catch(e){console.error(e);apiError(res,500,'No se pudo actualizar la evaluación')}
});

r.post('/evaluations/:id/grades',async(req,res)=>{
  const c=await pool.connect();
  try{
    const id=Number(req.params.id),q=await c.query(`SELECT ta.course_id,ta.academic_year_id FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ev.id=$1 AND ta.teacher_id=$2`,[id,req.user.id]),ev=q.rows[0];
    if(!ev)return apiError(res,404,'Evaluación no encontrada');
    const grades=Array.isArray(req.body.grades)?req.body.grades:[];
    await c.query('BEGIN');
    for(const item of grades){
      const studentId=Number(item.studentId),en=await c.query('SELECT 1 FROM enrollments WHERE student_id=$1 AND course_id=$2 AND academic_year_id=$3',[studentId,ev.course_id,ev.academic_year_id]);
      if(!en.rows[0])throw new Error('Estudiante fuera del curso');
      if(item.grade===null||item.grade===''||item.grade===undefined)await c.query('DELETE FROM grades WHERE evaluation_id=$1 AND student_id=$2',[id,studentId]);
      else{
        const g=Number(item.grade);
        if(!Number.isFinite(g)||g<2||g>7||Math.round(g*10)!==g*10)throw new Error('Nota inválida');
        await c.query('INSERT INTO grades(evaluation_id,student_id,grade) VALUES($1,$2,$3) ON CONFLICT(evaluation_id,student_id) DO UPDATE SET grade=EXCLUDED.grade,updated_at=NOW()',[id,studentId,g]);
      }
    }
    await c.query('COMMIT');res.json({ok:true});
  }catch(e){await c.query('ROLLBACK').catch(()=>{});console.error(e);apiError(res,400,e.message==='Nota inválida'?'Las notas deben estar entre 2.0 y 7.0 con un decimal':'No se pudieron guardar las notas')}
  finally{c.release()}
});

module.exports=r;
