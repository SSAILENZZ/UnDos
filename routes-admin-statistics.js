const express=require('express');
const {pool,activeYear}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const r=express.Router();
r.use(auth,requireRole('admin'));
const CHILE_TODAY=`(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date`;

r.get('/statistics',async(_req,res)=>{
  try{
    const y=await activeYear();
    const [base,attendance,courses,subjects,upcoming]=await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE role='student' AND active=TRUE) students,
          (SELECT COUNT(*)::int FROM users WHERE role='teacher' AND active=TRUE) teachers,
          (SELECT COUNT(*)::int FROM courses WHERE academic_year_id=$1 AND active=TRUE) courses,
          (SELECT COUNT(*)::int FROM subjects WHERE active=TRUE) subjects,
          (SELECT COUNT(*)::int FROM teaching_assignments ta JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE) assignments,
          (SELECT COUNT(*)::int FROM enrollments e JOIN users u ON u.id=e.student_id JOIN courses c ON c.id=e.course_id WHERE e.academic_year_id=$1 AND u.role='student' AND u.active=TRUE AND c.active=TRUE) enrollments,
          (SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE) evaluations,
          (SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE AND ev.status='completed') evaluations_completed,
          (SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE AND ev.status='pending') evaluations_pending,
          (SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE AND ev.eval_date>=${CHILE_TODAY} AND ev.eval_date<${CHILE_TODAY}+INTERVAL '8 days') evaluations_next7,
          (SELECT COUNT(*)::int FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE) grades_count,
          (SELECT AVG(g.grade)::float FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE) grades_average
      `,[y.id]),
      pool.query(`
        SELECT COUNT(*)::int total,
               COUNT(*) FILTER(WHERE ar.status='present')::int present,
               COUNT(*) FILTER(WHERE ar.status='absent')::int absent,
               COUNT(DISTINCT ar.attendance_date)::int days
        FROM attendance_records ar
        JOIN teaching_assignments ta ON ta.id=ar.assignment_id
        JOIN courses c ON c.id=ta.course_id
        JOIN subjects s ON s.id=ta.subject_id
        JOIN users u ON u.id=ta.teacher_id
        WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE
      `,[y.id]),
      pool.query(`
        SELECT c.id,c.name,c.level_order,
          (SELECT COUNT(*)::int FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.course_id=c.id AND e.academic_year_id=$1 AND u.role='student' AND u.active=TRUE) students,
          (SELECT COUNT(*)::int FROM teaching_assignments ta JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE AND s.active=TRUE AND u.active=TRUE) assignments,
          (SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE AND s.active=TRUE AND u.active=TRUE) evaluations,
          (SELECT AVG(g.grade)::float FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE AND s.active=TRUE AND u.active=TRUE) grade_average,
          (SELECT COUNT(*)::int FROM attendance_records ar JOIN teaching_assignments ta ON ta.id=ar.assignment_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE AND s.active=TRUE AND u.active=TRUE) attendance_total,
          (SELECT COUNT(*)::int FROM attendance_records ar JOIN teaching_assignments ta ON ta.id=ar.assignment_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE AND s.active=TRUE AND u.active=TRUE AND ar.status='present') attendance_present
        FROM courses c
        WHERE c.academic_year_id=$1 AND c.active=TRUE
        ORDER BY c.level_order,c.name
      `,[y.id]),
      pool.query(`
        SELECT s.id,s.name,
          COUNT(DISTINCT ta.id) FILTER(WHERE c.active=TRUE AND u.active=TRUE)::int assignments,
          COUNT(DISTINCT ev.id) FILTER(WHERE c.active=TRUE AND u.active=TRUE)::int evaluations,
          COUNT(DISTINCT ev.id) FILTER(WHERE ev.status='pending' AND c.active=TRUE AND u.active=TRUE)::int pending,
          (SELECT AVG(g.grade)::float FROM grades g JOIN evaluations ev2 ON ev2.id=g.evaluation_id JOIN teaching_assignments ta2 ON ta2.id=ev2.assignment_id JOIN courses c2 ON c2.id=ta2.course_id JOIN users u2 ON u2.id=ta2.teacher_id WHERE ta2.subject_id=s.id AND ta2.academic_year_id=$1 AND ta2.active=TRUE AND c2.active=TRUE AND u2.active=TRUE) grade_average
        FROM subjects s
        LEFT JOIN teaching_assignments ta ON ta.subject_id=s.id AND ta.academic_year_id=$1 AND ta.active=TRUE
        LEFT JOIN courses c ON c.id=ta.course_id
        LEFT JOIN users u ON u.id=ta.teacher_id
        WHERE s.active=TRUE
        GROUP BY s.id,s.name
        ORDER BY s.name
      `,[y.id]),
      pool.query(`
        SELECT ev.id,ev.name,ev.eval_date::text date,ev.weight::float,ev.status,
               c.id course_id,c.name course_name,s.id subject_id,s.name subject_name,u.full_name teacher_name
        FROM evaluations ev
        JOIN teaching_assignments ta ON ta.id=ev.assignment_id
        JOIN courses c ON c.id=ta.course_id
        JOIN subjects s ON s.id=ta.subject_id
        JOIN users u ON u.id=ta.teacher_id
        WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE
          AND ev.eval_date>=${CHILE_TODAY} AND ev.eval_date<${CHILE_TODAY}+INTERVAL '15 days'
        ORDER BY ev.eval_date,c.level_order,c.name,s.name
        LIMIT 60
      `,[y.id])
    ]);
    const b=base.rows[0]||{},a=attendance.rows[0]||{};
    const total=Number(a.total||0),present=Number(a.present||0);
    res.json({activeYear:y,summary:{students:Number(b.students||0),teachers:Number(b.teachers||0),courses:Number(b.courses||0),subjects:Number(b.subjects||0),assignments:Number(b.assignments||0),enrollments:Number(b.enrollments||0),evaluations:Number(b.evaluations||0),evaluationsCompleted:Number(b.evaluations_completed||0),evaluationsPending:Number(b.evaluations_pending||0),evaluationsNext7:Number(b.evaluations_next7||0),gradesCount:Number(b.grades_count||0),gradesAverage:b.grades_average==null?null:Number(b.grades_average),attendanceTotal:total,attendancePresent:present,attendanceAbsent:Number(a.absent||0),attendanceDays:Number(a.days||0),attendancePercentage:total?Math.round((present*1000)/total)/10:null},courses:courses.rows.map(x=>({id:x.id,name:x.name,students:Number(x.students||0),assignments:Number(x.assignments||0),evaluations:Number(x.evaluations||0),gradeAverage:x.grade_average==null?null:Number(x.grade_average),attendanceTotal:Number(x.attendance_total||0),attendancePresent:Number(x.attendance_present||0),attendancePercentage:Number(x.attendance_total||0)?Math.round(Number(x.attendance_present||0)*1000/Number(x.attendance_total))/10:null})),subjects:subjects.rows.map(x=>({id:x.id,name:x.name,assignments:Number(x.assignments||0),evaluations:Number(x.evaluations||0),pending:Number(x.pending||0),gradeAverage:x.grade_average==null?null:Number(x.grade_average)})),upcoming:upcoming.rows.map(x=>({id:x.id,name:x.name,date:x.date,weight:Number(x.weight),status:x.status,courseId:x.course_id,courseName:x.course_name,subjectId:x.subject_id,subjectName:x.subject_name,teacherName:x.teacher_name}))});
  }catch(e){console.error(e);apiError(res,500,'No se pudieron cargar las estadísticas administrativas')}
});
module.exports=r;
