const express=require('express');
const ExcelJS=require('exceljs');
const PDFDocument=require('pdfkit');
const {pool,activeYear,round1}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const {recordAudit}=require('./audit');
const r=express.Router();
r.use(auth);

const SCHOOL='Liceo Tecnológico Montemaria';
const PRODUCT='UnDos';
const validFormat=f=>['xlsx','pdf'].includes(String(f||'').toLowerCase());
const n=v=>v==null?null:Number(v);
const pct=(a,b)=>b?round1(Number(a)*100/Number(b)):null;
const fmt=v=>v==null?'—':String(v);
const fmtGrade=v=>v==null?'—':Number(v).toFixed(1);
const fmtPct=v=>v==null?'—':`${Number(v).toFixed(Number(v)%1?1:0)}%`;
const fmtDate=v=>{if(!v)return 'Sin fecha';const s=String(v).slice(0,10),[y,m,d]=s.split('-');return y&&m&&d?`${d}/${m}/${y}`:s};
const safeFile=s=>String(s||'reporte').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'reporte';
function downloadHeaders(res,type,name){
  const ascii=safeFile(name)+(type==='pdf'?'.pdf':'.xlsx');
  res.setHeader('Content-Type',type==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',`attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(ascii)}`);
  res.setHeader('Cache-Control','no-store');
}
function styleSheet(ws){
  ws.views=[{state:'frozen',ySplit:1}];
  ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
  ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0A3760'}};
  ws.getRow(1).alignment={vertical:'middle'};
  ws.autoFilter={from:{row:1,column:1},to:{row:1,column:Math.max(1,ws.columnCount)}};
  ws.eachRow((row,idx)=>{row.alignment={vertical:'top',wrapText:true};if(idx>1&&idx%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F9FC'}}});
}
function autoWidths(ws,min=10,max=34){
  ws.columns.forEach(col=>{let width=min;col.eachCell({includeEmpty:true},cell=>{const len=String(cell.value??'').length;width=Math.max(width,Math.min(max,len+2))});col.width=width});
}
async function sendWorkbook(res,wb,name){downloadHeaders(res,'xlsx',name);await wb.xlsx.write(res);res.end()}
function pdfStart(res,name,{landscape=false}={}){
  downloadHeaders(res,'pdf',name);
  const doc=new PDFDocument({size:'A4',layout:landscape?'landscape':'portrait',margin:38,info:{Title:name,Author:SCHOOL,Creator:PRODUCT}});
  doc.pipe(res);return doc;
}
function pdfHeader(doc,title,subtitle=''){
  doc.fillColor('#0A3760').font('Helvetica-Bold').fontSize(18).text(SCHOOL);
  doc.fillColor('#F05A24').fontSize(10).text(`${PRODUCT} · Gestión académica`);
  doc.moveDown(.7).fillColor('#172334').fontSize(17).text(title);
  if(subtitle)doc.fillColor('#66758A').font('Helvetica').fontSize(9).text(subtitle);
  doc.moveDown(.8).strokeColor('#F05A24').lineWidth(2).moveTo(doc.page.margins.left,doc.y).lineTo(doc.page.width-doc.page.margins.right,doc.y).stroke().moveDown(.8);
}
function pdfFooter(doc){
  const range=doc.bufferedPageRange();
  for(let i=range.start;i<range.start+range.count;i++){
    doc.switchToPage(i);doc.font('Helvetica').fontSize(7).fillColor('#8491A3').text(`Generado por ${PRODUCT} · ${new Date().toLocaleDateString('es-CL')}`,doc.page.margins.left,doc.page.height-24,{width:doc.page.width-doc.page.margins.left-doc.page.margins.right,align:'center'});
  }
}
function pdfSection(doc,title){if(doc.y>doc.page.height-95)doc.addPage();doc.moveDown(.4).fillColor('#0A3760').font('Helvetica-Bold').fontSize(12).text(title);doc.moveDown(.35)}
function pdfKeyValues(doc,items,cols=2){
  const usable=doc.page.width-doc.page.margins.left-doc.page.margins.right,gap=10,w=(usable-gap*(cols-1))/cols;
  for(let i=0;i<items.length;i+=cols){const y=doc.y;let maxH=0;for(let j=0;j<cols;j++){const item=items[i+j];if(!item)continue;const x=doc.page.margins.left+j*(w+gap);doc.roundedRect(x,y,w,42,6).fillAndStroke('#F7F9FC','#DFE6EF');doc.fillColor('#66758A').font('Helvetica').fontSize(7).text(item[0],x+9,y+8,{width:w-18});doc.fillColor('#172334').font('Helvetica-Bold').fontSize(13).text(fmt(item[1]),x+9,y+20,{width:w-18});maxH=42}doc.y=y+maxH+8}
}
function pdfSimpleTable(doc,headers,rows,widths){
  const left=doc.page.margins.left,total=widths.reduce((a,b)=>a+b,0),rowPad=4;
  const drawRow=(cells,header=false)=>{
    const font=header?'Helvetica-Bold':'Helvetica',size=header?7.5:7,color=header?'#FFFFFF':'#172334',fill=header?'#0A3760':null;
    const heights=cells.map((c,i)=>doc.heightOfString(fmt(c),{width:widths[i]-rowPad*2,font,size}));const h=Math.max(18,...heights.map(x=>x+rowPad*2));
    if(doc.y+h>doc.page.height-doc.page.margins.bottom-18){doc.addPage();drawRow(headers,true)}
    const y=doc.y;if(fill)doc.rect(left,y,total,h).fill(fill);let x=left;
    cells.forEach((c,i)=>{if(!header)doc.rect(x,y,widths[i],h).stroke('#DFE6EF');doc.fillColor(color).font(font).fontSize(size).text(fmt(c),x+rowPad,y+rowPad,{width:widths[i]-rowPad*2,height:h-rowPad*2});x+=widths[i]});doc.y=y+h;
  };
  drawRow(headers,true);for(const row of rows)drawRow(row,false);doc.moveDown(.5);
}
async function auditExport(req,scope,kind,format,meta={}){await recordAudit({actorId:req.user.id,actorRole:req.user.role,action:'export',entityType:'report',entityId:`${scope}:${kind}`,description:`Exportó ${kind} en formato ${format.toUpperCase()}`,metadata:{scope,kind,format,...meta}})}

async function adminStudents(yearId,courseId=null){
  const p=[yearId];let filter='';if(courseId){p.push(courseId);filter=` AND c.id=$${p.length}`}
  const {rows}=await pool.query(`SELECT u.id,u.rut,u.full_name,c.id course_id,c.name course_name,u.active FROM users u LEFT JOIN enrollments e ON e.student_id=u.id AND e.academic_year_id=$1 LEFT JOIN courses c ON c.id=e.course_id WHERE u.role='student' ${filter} ORDER BY c.level_order NULLS LAST,c.name NULLS LAST,u.full_name`,p);return rows;
}
async function adminAttendance(yearId,courseId=null){
  const p=[yearId];let filter='';if(courseId){p.push(courseId);filter=` AND c.id=$${p.length}`}
  const {rows}=await pool.query(`SELECT u.id,u.rut,u.full_name,c.name course_name,COUNT(ar.id)::int total,COUNT(ar.id) FILTER(WHERE ar.status='present')::int present,COUNT(ar.id) FILTER(WHERE ar.status='absent')::int absent,COUNT(DISTINCT ar.attendance_date)::int days FROM enrollments e JOIN users u ON u.id=e.student_id JOIN courses c ON c.id=e.course_id LEFT JOIN attendance_records ar ON ar.student_id=u.id LEFT JOIN teaching_assignments ta ON ta.id=ar.assignment_id AND ta.academic_year_id=e.academic_year_id WHERE e.academic_year_id=$1 ${filter} GROUP BY u.id,u.rut,u.full_name,c.name,c.level_order ORDER BY c.level_order,c.name,u.full_name`,p);return rows.map(x=>({...x,percentage:Number(x.total)?pct(x.present,x.total):null}));
}
async function adminStatistics(yearId){
  const [base,attendance,courses]=await Promise.all([
    pool.query(`SELECT (SELECT COUNT(*)::int FROM users WHERE role='student' AND active=TRUE) students,(SELECT COUNT(*)::int FROM users WHERE role='teacher' AND active=TRUE) teachers,(SELECT COUNT(*)::int FROM courses WHERE academic_year_id=$1 AND active=TRUE) courses,(SELECT COUNT(*)::int FROM subjects WHERE active=TRUE) subjects,(SELECT COUNT(*)::int FROM teaching_assignments WHERE academic_year_id=$1 AND active=TRUE) assignments,(SELECT COUNT(*)::int FROM enrollments WHERE academic_year_id=$1) enrollments,(SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE) evaluations,(SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE AND ev.status='completed') completed,(SELECT AVG(g.grade)::float FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE) grade_average`,[yearId]),
    pool.query(`SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE ar.status='present')::int present,COUNT(*) FILTER(WHERE ar.status='absent')::int absent,COUNT(DISTINCT ar.attendance_date)::int days FROM attendance_records ar JOIN teaching_assignments ta ON ta.id=ar.assignment_id WHERE ta.academic_year_id=$1 AND ta.active=TRUE`,[yearId]),
    pool.query(`SELECT c.id,c.name,c.level_order,(SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id=c.id AND e.academic_year_id=$1) students,(SELECT COUNT(*)::int FROM evaluations ev JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE) evaluations,(SELECT AVG(g.grade)::float FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id JOIN teaching_assignments ta ON ta.id=ev.assignment_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE) grade_average,(SELECT COUNT(*)::int FROM attendance_records ar JOIN teaching_assignments ta ON ta.id=ar.assignment_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE) attendance_total,(SELECT COUNT(*)::int FROM attendance_records ar JOIN teaching_assignments ta ON ta.id=ar.assignment_id WHERE ta.course_id=c.id AND ta.academic_year_id=$1 AND ta.active=TRUE AND ar.status='present') attendance_present FROM courses c WHERE c.academic_year_id=$1 AND c.active=TRUE ORDER BY c.level_order,c.name`,[yearId])
  ]);const b=base.rows[0]||{},a=attendance.rows[0]||{};return {summary:{...b,attendance_total:Number(a.total||0),attendance_present:Number(a.present||0),attendance_absent:Number(a.absent||0),attendance_days:Number(a.days||0),attendance_percentage:Number(a.total)?pct(a.present,a.total):null},courses:courses.rows.map(x=>({...x,attendance_percentage:Number(x.attendance_total)?pct(x.attendance_present,x.attendance_total):null}))};
}
async function assignmentData(assignmentId,teacherId=null){
  const p=[assignmentId];let teacherFilter='';if(teacherId){p.push(teacherId);teacherFilter=` AND ta.teacher_id=$${p.length}`}
  const q=await pool.query(`SELECT ta.id,ta.course_id,ta.academic_year_id,c.name course_name,s.name subject_name,u.full_name teacher_name,ay.year FROM teaching_assignments ta JOIN courses c ON c.id=ta.course_id JOIN subjects s ON s.id=ta.subject_id JOIN users u ON u.id=ta.teacher_id JOIN academic_years ay ON ay.id=ta.academic_year_id WHERE ta.id=$1 ${teacherFilter}`,p);const a=q.rows[0];if(!a)return null;
  const [students,evals,grades,attendance]=await Promise.all([
    pool.query(`SELECT u.id,u.rut,u.full_name FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.course_id=$1 AND e.academic_year_id=$2 ORDER BY u.full_name`,[a.course_id,a.academic_year_id]),
    pool.query('SELECT id,name,eval_date::text date,semester,weight::float,status FROM evaluations WHERE assignment_id=$1 ORDER BY semester,eval_date NULLS LAST,id',[a.id]),
    pool.query('SELECT g.evaluation_id,g.student_id,g.grade::float FROM grades g JOIN evaluations ev ON ev.id=g.evaluation_id WHERE ev.assignment_id=$1',[a.id]),
    pool.query(`SELECT ar.attendance_date::text date,ar.student_id,ar.status FROM attendance_records ar WHERE ar.assignment_id=$1 ORDER BY ar.attendance_date,ar.student_id`,[a.id])
  ]);return {assignment:a,students:students.rows,evaluations:evals.rows,grades:grades.rows,attendance:attendance.rows};
}
function currentAverage(studentId,evals,gradeMap){
  const completed=evals.filter(e=>e.status==='completed');if(!completed.length)return null;let weighted=0,total=0;
  for(const e of completed){const g=gradeMap.get(`${e.id}-${studentId}`);if(g==null)continue;weighted+=Number(g)*Number(e.weight);total+=Number(e.weight)}return total?round1(weighted/total):null;
}
async function adminGradebookCourse(yearId,courseId){
  const course=(await pool.query('SELECT id,name FROM courses WHERE id=$1 AND academic_year_id=$2',[courseId,yearId])).rows[0];if(!course)return null;
  const {rows}=await pool.query(`SELECT ta.id FROM teaching_assignments ta WHERE ta.course_id=$1 AND ta.academic_year_id=$2 AND ta.active=TRUE ORDER BY ta.id`,[courseId,yearId]);const assignments=[];for(const x of rows){const d=await assignmentData(x.id);if(d)assignments.push(d)}return {course,assignments};
}
async function studentReport(studentId){
  const y=await activeYear();const en=(await pool.query(`SELECT c.id,c.name FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=$1 AND e.academic_year_id=$2 LIMIT 1`,[studentId,y.id])).rows[0];
  const user=(await pool.query('SELECT id,rut,full_name FROM users WHERE id=$1',[studentId])).rows[0];if(!user)return null;
  if(!en)return {activeYear:y,user,course:null,subjects:[],attendance:{total:0,present:0,absent:0,percentage:null,records:[]}};
  const [academic,att]=await Promise.all([
    pool.query(`SELECT ta.id assignment_id,s.name subject_name,t.full_name teacher_name,ev.id evaluation_id,ev.name evaluation_name,ev.eval_date::text date,ev.semester,ev.weight::float,ev.status,g.grade::float FROM teaching_assignments ta JOIN subjects s ON s.id=ta.subject_id JOIN users t ON t.id=ta.teacher_id LEFT JOIN evaluations ev ON ev.assignment_id=ta.id LEFT JOIN grades g ON g.evaluation_id=ev.id AND g.student_id=$1 WHERE ta.course_id=$2 AND ta.academic_year_id=$3 AND ta.active=TRUE ORDER BY s.name,ev.semester,ev.eval_date NULLS LAST`,[studentId,en.id,y.id]),
    pool.query(`SELECT ar.attendance_date::text date,ar.status,s.name subject_name FROM attendance_records ar JOIN teaching_assignments ta ON ta.id=ar.assignment_id JOIN subjects s ON s.id=ta.subject_id WHERE ar.student_id=$1 AND ta.academic_year_id=$2 AND ta.course_id=$3 ORDER BY ar.attendance_date DESC,s.name`,[studentId,y.id,en.id])
  ]);
  const sm=new Map();for(const x of academic.rows){if(!sm.has(x.assignment_id))sm.set(x.assignment_id,{assignmentId:x.assignment_id,name:x.subject_name,teacherName:x.teacher_name,evaluations:[]});if(x.evaluation_id)sm.get(x.assignment_id).evaluations.push({id:x.evaluation_id,name:x.evaluation_name,date:x.date,semester:x.semester,weight:Number(x.weight),status:x.status,grade:x.grade==null?null:Number(x.grade)})}
  const total=att.rows.length,present=att.rows.filter(x=>x.status==='present').length,absent=att.rows.filter(x=>x.status==='absent').length;
  return {activeYear:y,user,course:en,subjects:[...sm.values()],attendance:{total,present,absent,percentage:total?pct(present,total):null,records:att.rows}};
}

function gradebookWorkbook(data,title){
  const wb=new ExcelJS.Workbook();wb.creator=PRODUCT;wb.title=title;const gm=new Map(data.grades.map(g=>[`${g.evaluation_id}-${g.student_id}`,Number(g.grade)]));
  for(const sem of [1,2]){const evs=data.evaluations.filter(e=>Number(e.semester)===sem);const ws=wb.addWorksheet(`${sem} semestre`);ws.columns=[{header:'Estudiante',key:'student'},{header:'RUT',key:'rut'},...evs.map((e,i)=>({header:`${e.name} (${Number(e.weight)}%)`,key:`e${i}`})),{header:'Promedio actual',key:'avg'}];
    for(const st of data.students){const row={student:st.full_name,rut:st.rut,avg:fmtGrade(currentAverage(st.id,evs,gm))};evs.forEach((e,i)=>row[`e${i}`]=gm.get(`${e.id}-${st.id}`)??'');ws.addRow(row)}styleSheet(ws);autoWidths(ws,11,28)}
  const aws=wb.addWorksheet('Asistencia');aws.columns=[{header:'Estudiante',key:'student'},{header:'RUT',key:'rut'},{header:'Presentes',key:'present'},{header:'Ausentes',key:'absent'},{header:'Registros',key:'total'},{header:'Asistencia',key:'pct'}];
  for(const st of data.students){const rows=data.attendance.filter(x=>x.student_id===st.id),present=rows.filter(x=>x.status==='present').length,absent=rows.filter(x=>x.status==='absent').length;aws.addRow({student:st.full_name,rut:st.rut,present,absent,total:rows.length,pct:rows.length?fmtPct(pct(present,rows.length)):'—'})}styleSheet(aws);autoWidths(aws,11,30);return wb;
}
function gradebookPdf(res,data,name){
  const doc=pdfStart(res,name,{landscape:true});doc.bufferPages=true;pdfHeader(doc,`${data.assignment.course_name} · ${data.assignment.subject_name}`,`Profesor: ${data.assignment.teacher_name} · Año ${data.assignment.year}`);const gm=new Map(data.grades.map(g=>[`${g.evaluation_id}-${g.student_id}`,Number(g.grade)]));
  for(const sem of [1,2]){const evs=data.evaluations.filter(e=>Number(e.semester)===sem);pdfSection(doc,`${sem}° semestre`);if(!evs.length){doc.font('Helvetica').fontSize(9).fillColor('#66758A').text('Sin evaluaciones registradas.');continue}const usable=doc.page.width-doc.page.margins.left-doc.page.margins.right;const evalWidth=Math.max(48,Math.min(72,(usable-210)/Math.max(1,evs.length))),widths=[150,75,...evs.map(()=>evalWidth),70];const headers=['Estudiante','RUT',...evs.map(e=>`${e.name}\n${Number(e.weight)}%`),'Prom.'];const rows=data.students.map(st=>[st.full_name,st.rut,...evs.map(e=>fmtGrade(gm.get(`${e.id}-${st.id}`))),fmtGrade(currentAverage(st.id,evs,gm))]);pdfSimpleTable(doc,headers,rows,widths)}pdfFooter(doc);doc.end();
}

r.get('/admin/:kind.:format',requireRole('admin'),async(req,res)=>{
  try{
    const format=String(req.params.format).toLowerCase(),kind=String(req.params.kind),y=await activeYear();if(!validFormat(format))return apiError(res,400,'Formato no válido');const courseId=req.query.courseId?Number(req.query.courseId):null;
    if(kind==='students'){
      const rows=await adminStudents(y.id,courseId);await auditExport(req,'admin',kind,format,{courseId});const name=`estudiantes-${y.year}`;
      if(format==='xlsx'){const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Estudiantes');ws.columns=[{header:'Nombre',key:'name'},{header:'RUT',key:'rut'},{header:'Curso',key:'course'},{header:'Estado',key:'status'}];rows.forEach(x=>ws.addRow({name:x.full_name,rut:x.rut,course:x.course_name||'Sin curso',status:x.active?'Activo':'Inactivo'}));styleSheet(ws);autoWidths(ws);return sendWorkbook(res,wb,name)}
      const doc=pdfStart(res,name);doc.bufferPages=true;pdfHeader(doc,'Listado de estudiantes',`Año escolar ${y.year}`);pdfSimpleTable(doc,['Nombre','RUT','Curso','Estado'],rows.map(x=>[x.full_name,x.rut,x.course_name||'Sin curso',x.active?'Activo':'Inactivo']),[210,100,120,70]);pdfFooter(doc);return doc.end();
    }
    if(kind==='attendance'){
      const rows=await adminAttendance(y.id,courseId);await auditExport(req,'admin',kind,format,{courseId});const name=`asistencia-${y.year}`;
      if(format==='xlsx'){const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Resumen asistencia');ws.columns=[{header:'Estudiante',key:'student'},{header:'RUT',key:'rut'},{header:'Curso',key:'course'},{header:'Presentes',key:'present'},{header:'Ausentes',key:'absent'},{header:'Registros',key:'total'},{header:'Asistencia',key:'pct'}];rows.forEach(x=>ws.addRow({student:x.full_name,rut:x.rut,course:x.course_name,present:Number(x.present),absent:Number(x.absent),total:Number(x.total),pct:fmtPct(x.percentage)}));styleSheet(ws);autoWidths(ws);return sendWorkbook(res,wb,name)}
      const doc=pdfStart(res,name,{landscape:true});doc.bufferPages=true;pdfHeader(doc,'Resumen de asistencia',`Año escolar ${y.year}`);pdfSimpleTable(doc,['Estudiante','RUT','Curso','Presentes','Ausentes','Asistencia'],rows.map(x=>[x.full_name,x.rut,x.course_name,Number(x.present),Number(x.absent),fmtPct(x.percentage)]),[180,90,110,65,65,75]);pdfFooter(doc);return doc.end();
    }
    if(kind==='statistics'){
      const d=await adminStatistics(y.id);await auditExport(req,'admin',kind,format);const name=`estadisticas-${y.year}`;
      if(format==='xlsx'){const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Resumen');ws.columns=[{header:'Indicador',key:'k'},{header:'Valor',key:'v'}];const s=d.summary;[['Estudiantes activos',s.students],['Profesores activos',s.teachers],['Cursos',s.courses],['Materias',s.subjects],['Clases asignadas',s.assignments],['Matrículas',s.enrollments],['Evaluaciones',s.evaluations],['Evaluaciones realizadas',s.completed],['Promedio de notas',fmtGrade(s.grade_average)],['Asistencia general',fmtPct(s.attendance_percentage)],['Días con asistencia',s.attendance_days]].forEach(x=>ws.addRow({k:x[0],v:x[1]}));styleSheet(ws);autoWidths(ws);const cs=wb.addWorksheet('Cursos');cs.columns=[{header:'Curso',key:'course'},{header:'Estudiantes',key:'students'},{header:'Evaluaciones',key:'evals'},{header:'Promedio',key:'avg'},{header:'Asistencia',key:'att'}];d.courses.forEach(x=>cs.addRow({course:x.name,students:Number(x.students),evals:Number(x.evaluations),avg:fmtGrade(x.grade_average),att:fmtPct(x.attendance_percentage)}));styleSheet(cs);autoWidths(cs);return sendWorkbook(res,wb,name)}
      const doc=pdfStart(res,name);doc.bufferPages=true;pdfHeader(doc,'Estadísticas administrativas',`Año escolar ${y.year}`);const s=d.summary;pdfKeyValues(doc,[['Estudiantes',s.students],['Profesores',s.teachers],['Cursos',s.courses],['Asignaciones',s.assignments],['Evaluaciones',s.evaluations],['Promedio de notas',fmtGrade(s.grade_average)],['Asistencia general',fmtPct(s.attendance_percentage)],['Días con asistencia',s.attendance_days]]);pdfSection(doc,'Resumen por curso');pdfSimpleTable(doc,['Curso','Estudiantes','Evaluaciones','Promedio','Asistencia'],d.courses.map(x=>[x.name,x.students,x.evaluations,fmtGrade(x.grade_average),fmtPct(x.attendance_percentage)]),[150,75,80,75,80]);pdfFooter(doc);return doc.end();
    }
    if(kind==='gradebook'){
      if(!Number.isInteger(courseId)||courseId<=0)return apiError(res,400,'Selecciona un curso');const d=await adminGradebookCourse(y.id,courseId);if(!d)return apiError(res,404,'Curso no encontrado');await auditExport(req,'admin',kind,format,{courseId});const name=`libro-notas-${d.course.name}-${y.year}`;
      if(format==='xlsx'){const wb=new ExcelJS.Workbook();wb.creator=PRODUCT;for(const ad of d.assignments){const gm=new Map(ad.grades.map(g=>[`${g.evaluation_id}-${g.student_id}`,Number(g.grade)]));for(const sem of [1,2]){const evs=ad.evaluations.filter(e=>Number(e.semester)===sem),sheetName=`${ad.assignment.subject_name.slice(0,20)} S${sem}`.replace(/[\\/*?:\[\]]/g,'-').slice(0,31);const ws=wb.addWorksheet(sheetName);ws.columns=[{header:'Estudiante',key:'student'},{header:'RUT',key:'rut'},...evs.map((e,i)=>({header:`${e.name} (${e.weight}%)`,key:`e${i}`})),{header:'Promedio actual',key:'avg'}];ad.students.forEach(st=>{const row={student:st.full_name,rut:st.rut,avg:fmtGrade(currentAverage(st.id,evs,gm))};evs.forEach((e,i)=>row[`e${i}`]=gm.get(`${e.id}-${st.id}`)??'');ws.addRow(row)});styleSheet(ws);autoWidths(ws,11,28)}}if(!wb.worksheets.length)wb.addWorksheet('Sin asignaturas').addRow(['No hay clases asignadas a este curso.']);return sendWorkbook(res,wb,name)}
      const doc=pdfStart(res,name,{landscape:true});doc.bufferPages=true;pdfHeader(doc,`Libro de notas · ${d.course.name}`,`Año escolar ${y.year}`);for(const ad of d.assignments){pdfSection(doc,`${ad.assignment.subject_name} · ${ad.assignment.teacher_name}`);const gm=new Map(ad.grades.map(g=>[`${g.evaluation_id}-${g.student_id}`,Number(g.grade)]));for(const sem of [1,2]){const evs=ad.evaluations.filter(e=>Number(e.semester)===sem);doc.font('Helvetica-Bold').fontSize(9).fillColor('#172334').text(`${sem}° semestre`);if(!evs.length){doc.font('Helvetica').fontSize(8).fillColor('#66758A').text('Sin evaluaciones.');continue}const rows=ad.students.map(st=>[st.full_name,...evs.slice(0,5).map(e=>fmtGrade(gm.get(`${e.id}-${st.id}`))),fmtGrade(currentAverage(st.id,evs,gm))]);const usable=doc.page.width-doc.page.margins.left-doc.page.margins.right,rest=usable-170-65,ew=rest/Math.max(1,Math.min(5,evs.length));pdfSimpleTable(doc,['Estudiante',...evs.slice(0,5).map(e=>e.name),'Prom.'],rows,[170,...evs.slice(0,5).map(()=>ew),65]);if(evs.length>5)doc.font('Helvetica').fontSize(7).fillColor('#66758A').text(`El PDF muestra las primeras 5 evaluaciones; el Excel contiene ${evs.length}.`)}}pdfFooter(doc);return doc.end();
    }
    return apiError(res,404,'Tipo de reporte no encontrado');
  }catch(e){console.error(e);if(!res.headersSent)return apiError(res,500,'No se pudo generar el reporte');try{res.end()}catch{}}
});

r.get('/teacher/assignment/:id/:kind.:format',requireRole('teacher'),async(req,res)=>{
  try{const format=String(req.params.format).toLowerCase(),kind=String(req.params.kind),id=Number(req.params.id);if(!validFormat(format))return apiError(res,400,'Formato no válido');if(!['gradebook','attendance'].includes(kind))return apiError(res,404,'Reporte no encontrado');const d=await assignmentData(id,req.user.id);if(!d)return apiError(res,404,'Clase no encontrada');await auditExport(req,'teacher',kind,format,{assignmentId:id});const name=`${kind==='gradebook'?'libro-notas':'asistencia'}-${d.assignment.course_name}-${d.assignment.subject_name}-${d.assignment.year}`;
    if(kind==='gradebook'){if(format==='xlsx')return sendWorkbook(res,gradebookWorkbook(d,name),name);return gradebookPdf(res,d,name)}
    if(format==='xlsx'){const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Resumen');ws.columns=[{header:'Estudiante',key:'student'},{header:'RUT',key:'rut'},{header:'Presentes',key:'present'},{header:'Ausentes',key:'absent'},{header:'Registros',key:'total'},{header:'Asistencia',key:'pct'}];for(const st of d.students){const rows=d.attendance.filter(x=>x.student_id===st.id),present=rows.filter(x=>x.status==='present').length,absent=rows.filter(x=>x.status==='absent').length;ws.addRow({student:st.full_name,rut:st.rut,present,absent,total:rows.length,pct:rows.length?fmtPct(pct(present,rows.length)):'—'})}styleSheet(ws);autoWidths(ws);const detail=wb.addWorksheet('Detalle');detail.columns=[{header:'Fecha',key:'date'},{header:'Estudiante',key:'student'},{header:'RUT',key:'rut'},{header:'Estado',key:'status'}];const sm=new Map(d.students.map(x=>[x.id,x]));d.attendance.forEach(x=>{const st=sm.get(x.student_id);detail.addRow({date:fmtDate(x.date),student:st?.full_name||'',rut:st?.rut||'',status:x.status==='present'?'Presente':'Ausente'})});styleSheet(detail);autoWidths(detail);return sendWorkbook(res,wb,name)}
    const doc=pdfStart(res,name);doc.bufferPages=true;pdfHeader(doc,`Asistencia · ${d.assignment.course_name}`,`${d.assignment.subject_name} · ${d.assignment.teacher_name} · Año ${d.assignment.year}`);const rows=d.students.map(st=>{const rr=d.attendance.filter(x=>x.student_id===st.id),p=rr.filter(x=>x.status==='present').length,a=rr.filter(x=>x.status==='absent').length;return [st.full_name,st.rut,p,a,fmtPct(rr.length?pct(p,rr.length):null)]});pdfSimpleTable(doc,['Estudiante','RUT','Presentes','Ausentes','Asistencia'],rows,[210,100,65,65,70]);pdfFooter(doc);return doc.end();
  }catch(e){console.error(e);if(!res.headersSent)return apiError(res,500,'No se pudo generar el reporte');try{res.end()}catch{}}
});

r.get('/student/report.:format',requireRole('student'),async(req,res)=>{
  try{const format=String(req.params.format).toLowerCase();if(!validFormat(format))return apiError(res,400,'Formato no válido');const d=await studentReport(req.user.id);if(!d)return apiError(res,404,'Estudiante no encontrado');await auditExport(req,'student','personal',format);const name=`reporte-academico-${d.user.full_name}-${d.activeYear.year}`;
    if(format==='xlsx'){const wb=new ExcelJS.Workbook(),summary=wb.addWorksheet('Resumen');summary.columns=[{header:'Dato',key:'k'},{header:'Valor',key:'v'}];[['Estudiante',d.user.full_name],['RUT',d.user.rut],['Curso',d.course?.name||'Sin curso'],['Año escolar',d.activeYear.year],['Asistencia',fmtPct(d.attendance.percentage)]].forEach(x=>summary.addRow({k:x[0],v:x[1]}));styleSheet(summary);autoWidths(summary);const notes=wb.addWorksheet('Notas');notes.columns=[{header:'Materia',key:'subject'},{header:'Profesor',key:'teacher'},{header:'Evaluación',key:'evaluation'},{header:'Fecha',key:'date'},{header:'Semestre',key:'semester'},{header:'Ponderación',key:'weight'},{header:'Estado',key:'status'},{header:'Nota',key:'grade'}];d.subjects.forEach(s=>s.evaluations.forEach(e=>notes.addRow({subject:s.name,teacher:s.teacherName,evaluation:e.name,date:fmtDate(e.date),semester:e.semester,weight:`${e.weight}%`,status:e.status==='completed'?'Realizada':'Pendiente',grade:e.grade==null?'':Number(e.grade)})));styleSheet(notes);autoWidths(notes);const att=wb.addWorksheet('Asistencia');att.columns=[{header:'Fecha',key:'date'},{header:'Materia',key:'subject'},{header:'Estado',key:'status'}];d.attendance.records.forEach(x=>att.addRow({date:fmtDate(x.date),subject:x.subject_name,status:x.status==='present'?'Presente':'Ausente'}));styleSheet(att);autoWidths(att);return sendWorkbook(res,wb,name)}
    const doc=pdfStart(res,name);doc.bufferPages=true;pdfHeader(doc,'Reporte académico personal',`${d.user.full_name} · ${d.user.rut} · ${d.course?.name||'Sin curso'} · Año ${d.activeYear.year}`);pdfKeyValues(doc,[['Curso',d.course?.name||'Sin curso'],['Asistencia',fmtPct(d.attendance.percentage)],['Presentes',d.attendance.present],['Ausentes',d.attendance.absent]]);pdfSection(doc,'Notas por asignatura');for(const s of d.subjects){doc.font('Helvetica-Bold').fontSize(10).fillColor('#0A3760').text(`${s.name} · ${s.teacherName}`);const rows=s.evaluations.map(e=>[e.name,fmtDate(e.date),`${e.weight}%`,e.status==='completed'?'Realizada':'Pendiente',fmtGrade(e.grade)]);if(rows.length)pdfSimpleTable(doc,['Evaluación','Fecha','Peso','Estado','Nota'],rows,[190,80,55,75,55]);else doc.font('Helvetica').fontSize(8).fillColor('#66758A').text('Sin evaluaciones registradas.')}pdfFooter(doc);return doc.end();
  }catch(e){console.error(e);if(!res.headersSent)return apiError(res,500,'No se pudo generar tu reporte');try{res.end()}catch{}}
});

module.exports=r;
