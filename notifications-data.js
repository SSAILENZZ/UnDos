const {pool,activeYear}=require('./db');

const CHILE_TODAY=`(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date`;
let ready=null;
function ensureNotificationSchema(){
  if(!ready)ready=pool.query(`
    CREATE TABLE IF NOT EXISTS notifications(
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'info',
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','important')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link_page TEXT,
      entity_type TEXT,
      entity_id TEXT,
      dedupe_key TEXT,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id,read_at,created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe ON notifications(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
  `).catch(e=>{ready=null;throw e});
  return ready;
}

function clean(v,max=500){return String(v||'').trim().slice(0,max)}
async function createNotification({userId,type='info',priority='normal',title,body,linkPage=null,entityType=null,entityId=null,dedupeKey=null}){
  await ensureNotificationSchema();
  const uid=Number(userId);if(!Number.isInteger(uid)||uid<=0||!clean(title,140)||!clean(body,800))return null;
  const {rows}=await pool.query(`INSERT INTO notifications(user_id,type,priority,title,body,link_page,entity_type,entity_id,dedupe_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING id`,[uid,clean(type,40)||'info',priority==='important'?'important':'normal',clean(title,140),clean(body,800),linkPage?clean(linkPage,80):null,entityType?clean(entityType,60):null,entityId==null?null:clean(entityId,100),dedupeKey?clean(dedupeKey,180):null]);
  return rows[0]?.id||null;
}
async function activeCourseStudents(courseId,yearId){
  const {rows}=await pool.query(`SELECT u.id FROM enrollments e JOIN users u ON u.id=e.student_id JOIN courses c ON c.id=e.course_id WHERE e.course_id=$1 AND e.academic_year_id=$2 AND u.role='student' AND u.active=TRUE AND c.active=TRUE`,[Number(courseId),Number(yearId)]);return rows.map(x=>Number(x.id));
}
async function notifyCourse(courseId,yearId,data){const ids=await activeCourseStudents(courseId,yearId);await Promise.all(ids.map(userId=>createNotification({...data,userId})));return ids.length}
async function notifyAnnouncement(announcementId){
  await ensureNotificationSchema();
  const {rows}=await pool.query(`SELECT a.*,c.academic_year_id FROM announcements a LEFT JOIN courses c ON c.id=a.course_id WHERE a.id=$1 AND a.active=TRUE`,[Number(announcementId)]);const a=rows[0];if(!a)return 0;
  let q,params=[];
  if(a.audience==='all')q=`SELECT id,role FROM users WHERE active=TRUE AND role IN ('student','teacher')`;
  else if(a.audience==='students')q=`SELECT id,role FROM users WHERE active=TRUE AND role='student'`;
  else if(a.audience==='teachers')q=`SELECT id,role FROM users WHERE active=TRUE AND role='teacher'`;
  else{q=`SELECT DISTINCT u.id,u.role FROM enrollments e JOIN users u ON u.id=e.student_id JOIN courses c ON c.id=e.course_id WHERE e.course_id=$1 AND e.academic_year_id=$2 AND u.active=TRUE AND u.role='student' AND c.active=TRUE`;params=[a.course_id,a.academic_year_id]}
  const recipients=(await pool.query(q,params)).rows;const important=a.priority==='important';
  await Promise.all(recipients.map(x=>createNotification({userId:x.id,type:'announcement',priority:important?'important':'normal',title:important?'Comunicado importante':'Nuevo comunicado',body:a.title,linkPage:'communications',entityType:'announcement',entityId:a.id,dedupeKey:`announcement:${a.id}`})));
  return recipients.length;
}
async function notifyEvaluation(evaluationId,{updated=false}={}){
  const {rows}=await pool.query(`SELECT ev.id,ev.name,ev.eval_date::text date,ev.weight::float,ta.course_id,ta.academic_year_id,s.name subject_name,c.name course_name FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN subjects s ON s.id=ta.subject_id JOIN courses c ON c.id=ta.course_id WHERE ev.id=$1 AND ta.active=TRUE AND c.active=TRUE`,[Number(evaluationId)]);const e=rows[0];if(!e)return 0;
  const date=e.date||'sin fecha definida',body=`${e.subject_name} · ${e.name} · ${date}${e.weight?` · ${Number(e.weight)}%`:''}`;
  return notifyCourse(e.course_id,e.academic_year_id,{type:'evaluation',priority:'important',title:updated?'Evaluación actualizada':'Nueva evaluación programada',body,linkPage:'student-calendar',entityType:'evaluation',entityId:e.id,dedupeKey:`evaluation:${e.id}:${e.date||'none'}:${e.name}:${Number(e.weight||0)}`});
}
async function notifyGrades(evaluationId,grades){
  const {rows}=await pool.query(`SELECT ev.id,ev.name,s.name subject_name FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN subjects s ON s.id=ta.subject_id WHERE ev.id=$1 AND ta.active=TRUE`,[Number(evaluationId)]);const e=rows[0];if(!e)return 0;let total=0;
  for(const item of Array.isArray(grades)?grades:[]){const studentId=Number(item.studentId),g=Number(item.grade);if(!Number.isInteger(studentId)||!Number.isFinite(g)||g<2||g>7)continue;await createNotification({userId:studentId,type:'grade',priority:'important',title:'Nueva calificación',body:`${e.subject_name} · ${e.name}: ${g.toFixed(1)}`,linkPage:'student-home',entityType:'evaluation',entityId:e.id,dedupeKey:`grade:${e.id}:${studentId}:${g.toFixed(1)}`});total++}return total;
}
async function syncUpcomingEvaluations(userId){
  const y=await activeYear();const en=(await pool.query(`SELECT e.course_id FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=$1 AND e.academic_year_id=$2 AND c.active=TRUE LIMIT 1`,[Number(userId),y.id])).rows[0];if(!en)return;
  const {rows}=await pool.query(`SELECT ev.id,ev.name,ev.eval_date::text date,ev.weight::float,s.name subject_name FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.course_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE AND ev.eval_date BETWEEN ${CHILE_TODAY} AND ${CHILE_TODAY}+INTERVAL '3 days' ORDER BY ev.eval_date,s.name`,[en.course_id,y.id]);
  for(const e of rows)await createNotification({userId,type:'reminder',priority:'important',title:'Evaluación próxima',body:`${e.subject_name} · ${e.name} · ${e.date}${e.weight?` · ${Number(e.weight)}%`:''}`,linkPage:'student-calendar',entityType:'evaluation',entityId:e.id,dedupeKey:`reminder:${e.id}:${e.date}`});
}
module.exports={ensureNotificationSchema,createNotification,notifyCourse,notifyAnnouncement,notifyEvaluation,notifyGrades,syncUpcomingEvaluations};
