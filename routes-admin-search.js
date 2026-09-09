const express=require('express');
const {pool,activeYear}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const r=express.Router();
r.use(auth,requireRole('admin'));

function cleanQuery(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,80)}
function compactRut(v){return String(v||'').toUpperCase().replace(/[^0-9K]/g,'')}

r.get('/search',async(req,res)=>{
  try{
    const q=cleanQuery(req.query.q);
    const y=await activeYear();
    if(q.length<2)return res.json({query:q,activeYear:y,total:0,groups:{users:[],courses:[],subjects:[],classes:[]}});
    const like=`%${q}%`,starts=`${q}%`,compact=compactRut(q),compactLike=compact?`%${compact}%`:'__NO_RUT_MATCH__';
    const [users,courses,subjects,classes]=await Promise.all([
      pool.query(`
        SELECT u.id,u.rut,u.full_name,u.role,u.active,c.id course_id,c.name course_name,
          CASE WHEN LOWER(u.full_name)=LOWER($4) THEN 0 WHEN LOWER(u.full_name) LIKE LOWER($5) THEN 1 ELSE 2 END rank
        FROM users u
        LEFT JOIN enrollments e ON e.student_id=u.id AND e.academic_year_id=$1 AND u.role='student'
        LEFT JOIN courses c ON c.id=e.course_id AND c.active=TRUE
        WHERE u.role IN ('student','teacher')
          AND (u.full_name ILIKE $2 OR u.rut ILIKE $2 OR REGEXP_REPLACE(UPPER(u.rut),'[^0-9K]','','g') LIKE $3)
        ORDER BY rank,u.active DESC,u.role,u.full_name
        LIMIT 14`,[y.id,like,compactLike,q,starts]),
      pool.query(`
        SELECT c.id,c.name,c.active,c.level_order,
          COUNT(DISTINCT u.id)::int student_count,
          COUNT(DISTINCT ta.id) FILTER(WHERE ta.active=TRUE)::int assignment_count
        FROM courses c
        LEFT JOIN enrollments e ON e.course_id=c.id AND e.academic_year_id=$1
        LEFT JOIN users u ON u.id=e.student_id AND u.role='student' AND u.active=TRUE
        LEFT JOIN teaching_assignments ta ON ta.course_id=c.id AND ta.academic_year_id=$1
        WHERE c.academic_year_id=$1 AND c.name ILIKE $2
        GROUP BY c.id,c.name,c.active,c.level_order
        ORDER BY CASE WHEN LOWER(c.name)=LOWER($3) THEN 0 WHEN LOWER(c.name) LIKE LOWER($4) THEN 1 ELSE 2 END,c.level_order,c.name
        LIMIT 10`,[y.id,like,q,starts]),
      pool.query(`
        SELECT s.id,s.name,s.active,
          COUNT(DISTINCT ta.id) FILTER(WHERE ta.academic_year_id=$1 AND ta.active=TRUE)::int assignment_count,
          COUNT(DISTINCT ta.teacher_id) FILTER(WHERE ta.academic_year_id=$1 AND ta.active=TRUE)::int teacher_count
        FROM subjects s
        LEFT JOIN teaching_assignments ta ON ta.subject_id=s.id
        WHERE s.name ILIKE $2
        GROUP BY s.id,s.name,s.active
        ORDER BY CASE WHEN LOWER(s.name)=LOWER($3) THEN 0 WHEN LOWER(s.name) LIKE LOWER($4) THEN 1 ELSE 2 END,s.name
        LIMIT 10`,[y.id,like,q,starts]),
      pool.query(`
        SELECT ta.id,c.id course_id,c.name course_name,s.id subject_id,s.name subject_name,
          u.id teacher_id,u.full_name teacher_name,
          (SELECT COUNT(*)::int FROM enrollments e JOIN users su ON su.id=e.student_id WHERE e.course_id=c.id AND e.academic_year_id=$1 AND su.role='student' AND su.active=TRUE) student_count,
          (SELECT COUNT(*)::int FROM evaluations ev WHERE ev.assignment_id=ta.id) evaluation_count
        FROM teaching_assignments ta
        JOIN courses c ON c.id=ta.course_id
        JOIN subjects s ON s.id=ta.subject_id
        JOIN users u ON u.id=ta.teacher_id
        WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND c.active=TRUE AND s.active=TRUE AND u.active=TRUE
          AND (c.name ILIKE $2 OR s.name ILIKE $2 OR u.full_name ILIKE $2 OR (c.name||' '||s.name||' '||u.full_name) ILIKE $2)
        ORDER BY c.level_order,c.name,s.name,u.full_name
        LIMIT 12`,[y.id,like])
    ]);
    const groups={
      users:users.rows.map(x=>({id:x.id,rut:x.rut,fullName:x.full_name,role:x.role,active:x.active,courseId:x.course_id,courseName:x.course_name||null})),
      courses:courses.rows.map(x=>({id:x.id,name:x.name,active:x.active,studentCount:Number(x.student_count||0),assignmentCount:Number(x.assignment_count||0)})),
      subjects:subjects.rows.map(x=>({id:x.id,name:x.name,active:x.active,assignmentCount:Number(x.assignment_count||0),teacherCount:Number(x.teacher_count||0)})),
      classes:classes.rows.map(x=>({id:x.id,courseId:x.course_id,courseName:x.course_name,subjectId:x.subject_id,subjectName:x.subject_name,teacherId:x.teacher_id,teacherName:x.teacher_name,studentCount:Number(x.student_count||0),evaluationCount:Number(x.evaluation_count||0)}))
    };
    res.json({query:q,activeYear:y,total:Object.values(groups).reduce((n,a)=>n+a.length,0),groups});
  }catch(e){console.error(e);apiError(res,500,'No se pudo realizar la búsqueda global')}
});

module.exports=r;
