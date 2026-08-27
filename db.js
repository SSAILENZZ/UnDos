const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function normalizeRut(input) {
  const clean=String(input||'').toUpperCase().replace(/[^0-9K]/g,'');
  if(clean.length<2)return '';
  const body=clean.slice(0,-1).replace(/^0+/,'')||'0';
  return `${body}-${clean.slice(-1)}`;
}
function validateRut(input){
  const rut=normalizeRut(input),[body,dv]=rut.split('-');
  if(!body||!dv||!/^\d+$/.test(body))return false;
  let sum=0,m=2;for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*m;m=m===7?2:m+1}
  const r=11-(sum%11),expected=r===11?'0':r===10?'K':String(r);return expected===dv;
}
async function activeYear(client=pool){const {rows}=await client.query('SELECT id,year FROM academic_years WHERE active=TRUE ORDER BY year DESC LIMIT 1');if(!rows[0])throw new Error('No hay año académico activo');return rows[0]}
function round1(n){return Math.round((Number(n)+Number.EPSILON)*10)/10}
function subjectSummary(evaluations){
  const result={semesters:{1:{status:'in_progress',average:null,totalWeight:0},2:{status:'in_progress',average:null,totalWeight:0}},annual:{status:'in_progress',average:null}};
  for(const sem of [1,2]){const list=evaluations.filter(e=>e.semester===sem),total=list.reduce((s,e)=>s+Number(e.weight),0),complete=list.length>0&&Math.abs(total-100)<.01&&list.every(e=>e.status==='completed'&&e.grade!=null);result.semesters[sem].totalWeight=round1(total);if(complete){const avg=list.reduce((s,e)=>s+Number(e.grade)*Number(e.weight)/100,0);result.semesters[sem]={status:'final',average:round1(avg),totalWeight:100}}}
  if(result.semesters[1].status==='final'&&result.semesters[2].status==='final')result.annual={status:'final',average:round1((result.semesters[1].average+result.semesters[2].average)/2)};
  return result;
}
async function initDatabase(){
  await pool.query(`
CREATE TABLE IF NOT EXISTS academic_years(id SERIAL PRIMARY KEY,year INTEGER UNIQUE NOT NULL,active BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS courses(id SERIAL PRIMARY KEY,academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,name TEXT NOT NULL,level_order INTEGER NOT NULL DEFAULT 0,active BOOLEAN NOT NULL DEFAULT TRUE,UNIQUE(academic_year_id,name));
CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,rut TEXT UNIQUE NOT NULL,full_name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS subjects(id SERIAL PRIMARY KEY,name TEXT UNIQUE NOT NULL,active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS enrollments(id SERIAL PRIMARY KEY,student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(student_id,academic_year_id));
CREATE TABLE IF NOT EXISTS teaching_assignments(id SERIAL PRIMARY KEY,teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,active BOOLEAN NOT NULL DEFAULT TRUE,UNIQUE(teacher_id,subject_id,course_id,academic_year_id));
CREATE TABLE IF NOT EXISTS evaluations(id SERIAL PRIMARY KEY,assignment_id INTEGER NOT NULL REFERENCES teaching_assignments(id) ON DELETE CASCADE,name TEXT NOT NULL,eval_date DATE,semester INTEGER NOT NULL CHECK(semester IN (1,2)),weight NUMERIC(5,2) NOT NULL CHECK(weight>0 AND weight<=100),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS grades(id SERIAL PRIMARY KEY,evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,grade NUMERIC(3,1) NOT NULL CHECK(grade>=2.0 AND grade<=7.0),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(evaluation_id,student_id));
CREATE INDEX IF NOT EXISTS idx_enrollments_year_course ON enrollments(academic_year_id,course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_year ON teaching_assignments(teacher_id,academic_year_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_assignment ON evaluations(assignment_id);
CREATE INDEX IF NOT EXISTS idx_grades_eval_student ON grades(evaluation_id,student_id);`);
  const yearNum=new Date().getFullYear();
  await pool.query('INSERT INTO academic_years(year,active) VALUES($1,TRUE) ON CONFLICT(year) DO NOTHING',[yearNum]);
  const anyActive=await pool.query('SELECT 1 FROM academic_years WHERE active=TRUE LIMIT 1');if(!anyActive.rows[0])await pool.query('UPDATE academic_years SET active=(year=$1)',[yearNum]);
  const year=await activeYear();
  for(const [name,order] of [['7° Básico',7],['8° Básico',8],['1° Medio',9],['2° Medio',10],['3° Medio',11],['4° Medio',12]])await pool.query('INSERT INTO courses(academic_year_id,name,level_order) VALUES($1,$2,$3) ON CONFLICT(academic_year_id,name) DO NOTHING',[year.id,name,order]);
  for(const name of ['Lenguaje y Comunicación','Matemática','Inglés','Historia','Ciencias','Educación Física','Tecnología'])await pool.query('INSERT INTO subjects(name) VALUES($1) ON CONFLICT(name) DO NOTHING',[name]);
  if(process.env.BOOTSTRAP_ADMIN_RUT&&process.env.BOOTSTRAP_ADMIN_PASSWORD){const admins=await pool.query("SELECT 1 FROM users WHERE role='admin' LIMIT 1");if(!admins.rows[0]){const rut=normalizeRut(process.env.BOOTSTRAP_ADMIN_RUT);if(validateRut(rut)){const hash=await bcrypt.hash(process.env.BOOTSTRAP_ADMIN_PASSWORD,12);await pool.query('INSERT INTO users(rut,full_name,password_hash,role) VALUES($1,$2,$3,\'admin\')',[rut,process.env.BOOTSTRAP_ADMIN_NAME||'Administrador UnDos',hash])}}}
}
module.exports={pool,normalizeRut,validateRut,activeYear,round1,subjectSummary,initDatabase};
