const {pool,activeYear,subjectSummary,round1}=require('./db');

function mapOverall(subjects){
  const annuals=subjects.map(s=>s.summary.annual).filter(x=>x.status==='final');
  return subjects.length>0&&annuals.length===subjects.length
    ?{status:'final',average:round1(annuals.reduce((n,x)=>n+Number(x.average),0)/annuals.length)}
    :{status:'in_progress',average:null};
}

async function yearProfile(studentId,enrollment){
  const activeYear=Boolean(enrollment.year_active);
  const [academic,attendance]=await Promise.all([
    pool.query(`SELECT ta.id assignment_id,s.id subject_id,s.name subject_name,u.full_name teacher_name,
      ev.id evaluation_id,ev.name evaluation_name,ev.eval_date::text eval_date,ev.semester,ev.weight::float,ev.status,g.grade::float
      FROM teaching_assignments ta
      JOIN subjects s ON s.id=ta.subject_id
      LEFT JOIN users u ON u.id=ta.teacher_id
      LEFT JOIN evaluations ev ON ev.assignment_id=ta.id
      LEFT JOIN grades g ON g.evaluation_id=ev.id AND g.student_id=$1
      WHERE ta.course_id=$2 AND ta.academic_year_id=$3 AND ($4::boolean=FALSE OR ta.active=TRUE)
      ORDER BY s.name,ta.id,ev.semester,ev.eval_date NULLS LAST,ev.id`,[studentId,enrollment.course_id,enrollment.academic_year_id,activeYear]),
    pool.query(`SELECT ar.attendance_date::text date,ar.status
      FROM attendance_records ar
      JOIN teaching_assignments ta ON ta.id=ar.assignment_id
      WHERE ar.student_id=$1 AND ta.course_id=$2 AND ta.academic_year_id=$3
      ORDER BY ar.attendance_date DESC`,[studentId,enrollment.course_id,enrollment.academic_year_id])
  ]);
  const subjectsMap=new Map(),gradeValues=[];
  for(const x of academic.rows){
    if(!subjectsMap.has(x.assignment_id))subjectsMap.set(x.assignment_id,{assignmentId:Number(x.assignment_id),subjectId:Number(x.subject_id),name:x.subject_name,teacherName:x.teacher_name||null,evaluations:[]});
    if(x.evaluation_id){
      const grade=x.grade==null?null:Number(x.grade);if(grade!=null)gradeValues.push(grade);
      subjectsMap.get(x.assignment_id).evaluations.push({id:Number(x.evaluation_id),name:x.evaluation_name,date:x.eval_date,semester:Number(x.semester),weight:Number(x.weight),status:x.status,grade});
    }
  }
  const subjects=[...subjectsMap.values()].map(s=>({...s,summary:subjectSummary(s.evaluations)}));
  const present=attendance.rows.filter(x=>x.status==='present').length,absent=attendance.rows.filter(x=>x.status==='absent').length,total=present+absent;
  const evaluations=subjects.reduce((n,s)=>n+s.evaluations.length,0),completed=subjects.reduce((n,s)=>n+s.evaluations.filter(e=>e.status==='completed').length,0);
  return {
    yearId:Number(enrollment.academic_year_id),year:Number(enrollment.year),active:activeYear,
    course:{id:Number(enrollment.course_id),name:enrollment.course_name},
    subjects,overall:mapOverall(subjects),gradeAverage:gradeValues.length?round1(gradeValues.reduce((a,b)=>a+b,0)/gradeValues.length):null,
    attendance:{total,present,absent,days:new Set(attendance.rows.map(x=>x.date)).size,percentage:total?round1(present*100/total):null},
    evaluations:{total:evaluations,completed,pending:evaluations-completed}
  };
}

async function buildStudentProfile(studentId){
  const id=Number(studentId);if(!Number.isInteger(id)||id<=0)return null;
  const [userQ,year,enrollmentsQ]=await Promise.all([
    pool.query("SELECT id,rut,full_name,role,active,created_at,updated_at FROM users WHERE id=$1 AND role='student'",[id]),
    activeYear(),
    pool.query(`SELECT e.academic_year_id,e.course_id,c.name course_name,ay.year,ay.active year_active
      FROM enrollments e JOIN courses c ON c.id=e.course_id JOIN academic_years ay ON ay.id=e.academic_year_id
      WHERE e.student_id=$1 ORDER BY ay.year DESC`,[id])
  ]);
  const user=userQ.rows[0];if(!user)return null;
  const years=[];for(const en of enrollmentsQ.rows)years.push(await yearProfile(id,en));
  const current=years.find(x=>x.yearId===Number(year.id))||null;
  const attendanceTotal=years.reduce((n,x)=>n+x.attendance.total,0),attendancePresent=years.reduce((n,x)=>n+x.attendance.present,0);
  return {
    user:{id:Number(user.id),rut:user.rut,fullName:user.full_name,role:user.role,active:Boolean(user.active),createdAt:user.created_at,updatedAt:user.updated_at},
    activeYear:{id:Number(year.id),year:Number(year.year)},current,years,
    totals:{years:years.length,subjects:current?.subjects.length||0,evaluations:years.reduce((n,x)=>n+x.evaluations.total,0),attendanceTotal,attendancePercentage:attendanceTotal?round1(attendancePresent*100/attendanceTotal):null}
  };
}

module.exports={buildStudentProfile};
