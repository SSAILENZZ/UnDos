(()=>{
const U=window.U,$=U.$,S=U.state;

const style=document.createElement('style');
style.textContent=`
.history-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}
.history-card{width:100%;text-align:left;background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;transition:.18s;color:var(--text)}
.history-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:#d4dee7}
.history-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.history-card h3{margin:0;color:var(--text);font-size:18px}.history-card p{margin:5px 0 0;color:var(--muted);font-size:12px}
.history-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.history-metric{background:#f8fafc;border-radius:10px;padding:10px}.history-metric small{display:block;color:var(--muted);font-size:10px}.history-metric strong{display:block;color:var(--blue);margin-top:3px;font-size:16px}
.history-detail{margin-top:16px}.history-year-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.history-year-head h2{margin:0;font-size:20px}.history-year-head p{margin:4px 0 0;color:var(--muted);font-size:13px}
.history-note{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;color:var(--muted);font-size:13px;line-height:1.5}
@media(max-width:1050px){.history-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.history-grid{grid-template-columns:1fr}.history-metrics{grid-template-columns:1fr 1fr}.history-year-head{align-items:flex-start;flex-direction:column}}
`;
document.head.appendChild(style);

const baseRenderShell=U.renderShell;
U.renderShell=()=>{
  baseRenderShell();
  const nav=$('#nav'),role=S.user?.role;if(!nav)return;
  if(role==='student'&&!nav.querySelector('[data-page="student-history"]'))nav.insertAdjacentHTML('beforeend','<button class="nav-btn" data-page="student-history"><span class="nav-icon">◷</span><span>Historial</span></button>');
  if(role==='teacher'&&!nav.querySelector('[data-page="teacher-history"]'))nav.insertAdjacentHTML('beforeend','<button class="nav-btn" data-page="teacher-history"><span class="nav-icon">◷</span><span>Historial</span></button>');
  if(role==='admin'&&!nav.querySelector('[data-page="admin-history"]'))nav.insertAdjacentHTML('beforeend','<button class="nav-btn" data-page="admin-history"><span class="nav-icon">◫</span><span>Historial</span></button>');
};

const baseNavigate=U.navigate;
function begin(page){
  S.page=page;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const c=$('#content');if(c)c.innerHTML='<div class="card empty">Cargando…</div>';
}
U.navigate=async page=>{
  if(page==='student-history'){begin(page);try{return await renderStudentHistory()}catch(e){return fail(e)}}
  if(page==='teacher-history'){begin(page);try{return await renderTeacherHistory()}catch(e){return fail(e)}}
  if(page==='admin-history'){begin(page);try{return await renderAdminHistory()}catch(e){return fail(e)}}
  return baseNavigate(page);
};
function fail(e){const c=$('#content');if(c)c.innerHTML=`<div class="card"><h2>No se pudo cargar</h2><p class="form-error">${U.esc(e.message)}</p></div>`}

function grade(v){return v?.status==='final'?Number(v.average).toFixed(1):'En proceso'}
function currentBadge(y){return y.active?'<span class="badge ok">Año actual</span>':'<span class="badge">Histórico</span>'}

async function renderStudentHistory(){
  const d=await U.api('/api/history/student');
  U.setPage('Historial académico','Todos tus años escolares');
  renderStudentHistoryContent(d.years,false);
}
function renderStudentHistoryContent(years,isPreview){
  const c=$('#content');if(!c)return;
  if(!years.length){c.innerHTML='<div class="welcome"><div><h1>Historial académico</h1><p>Aquí aparecerán tus años escolares cuando existan registros.</p></div></div><div class="card empty">Todavía no hay años guardados en tu historial.</div>';return}
  c.innerHTML=`<div class="welcome"><div><h1>Historial académico</h1><p>Revisa cursos y promedios de cada año escolar.</p></div></div>
    <div class="history-grid">${years.map((y,i)=>`<button class="history-card" data-student-history-year="${i}"><div class="history-card-top"><div><h3>${y.year.year}</h3><p>${U.esc(y.course?.name||'Sin curso asignado')}</p></div>${currentBadge(y.year)}</div><div class="history-metrics"><div class="history-metric"><small>Materias</small><strong>${y.subjects.length}</strong></div><div class="history-metric"><small>Promedio anual</small><strong>${grade(y.overall)}</strong></div><div class="history-metric"><small>Curso</small><strong style="font-size:12px">${U.esc(y.course?.name||'—')}</strong></div></div></button>`).join('')}</div>
    <div id="studentHistoryDetail" class="history-detail"></div>`;
  const show=i=>renderStudentYear(years[Number(i)]);
  c.onclick=e=>{const b=e.target.closest('[data-student-history-year]');if(b)show(b.dataset.studentHistoryYear)};
  show(0);
}
function renderStudentYear(y){
  const box=$('#studentHistoryDetail');if(!box||!y)return;
  box.innerHTML=`<div class="panel"><div class="history-year-head" style="padding:16px 18px;margin:0;border-bottom:1px solid var(--line)"><div><h2>${y.year.year} · ${U.esc(y.course?.name||'Sin curso')}</h2><p>${y.subjects.length} materias registradas</p></div><span class="badge blue">Promedio general: ${grade(y.overall)}</span></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Materia</th><th>Profesor</th><th>1° semestre</th><th>2° semestre</th><th>Anual</th></tr></thead><tbody>${y.subjects.map(s=>`<tr><td><strong>${U.esc(s.name)}</strong></td><td>${U.esc(s.teacherName||'—')}</td><td class="grade">${grade(s.summary.semesters[1])}</td><td class="grade">${grade(s.summary.semesters[2])}</td><td class="grade">${grade(s.summary.annual)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">No hay materias registradas para este año.</td></tr>'}</tbody></table></div></div>`;
}

async function renderTeacherHistory(){
  const d=await U.api('/api/history/teacher');
  U.setPage('Historial docente','Cursos y materias de años anteriores');
  renderTeacherHistoryContent(d.years,false);
}
function renderTeacherHistoryContent(years,isPreview){
  const c=$('#content');if(!c)return;
  if(!years.length){c.innerHTML='<div class="welcome"><div><h1>Historial docente</h1><p>Aquí aparecerán tus clases de cada año escolar.</p></div></div><div class="card empty">Todavía no hay clases guardadas en el historial.</div>';return}
  c.innerHTML=`<div class="welcome"><div><h1>Historial docente</h1><p>Consulta los cursos y materias que has impartido por año.</p></div></div><div class="history-grid">${years.map((y,i)=>{const students=y.assignments.reduce((n,a)=>n+Number(a.studentCount||0),0),evs=y.assignments.reduce((n,a)=>n+Number(a.evaluationCount||0),0);return `<button class="history-card" data-teacher-history-year="${i}"><div class="history-card-top"><div><h3>${y.year.year}</h3><p>${y.assignments.length} clases registradas</p></div>${currentBadge(y.year)}</div><div class="history-metrics"><div class="history-metric"><small>Clases</small><strong>${y.assignments.length}</strong></div><div class="history-metric"><small>Estudiantes</small><strong>${students}</strong></div><div class="history-metric"><small>Evaluaciones</small><strong>${evs}</strong></div></div></button>`}).join('')}</div><div id="teacherHistoryDetail" class="history-detail"></div>`;
  const show=i=>renderTeacherYear(years[Number(i)]);c.onclick=e=>{const b=e.target.closest('[data-teacher-history-year]');if(b)show(b.dataset.teacherHistoryYear)};show(0);
}
function renderTeacherYear(y){
  const box=$('#teacherHistoryDetail');if(!box||!y)return;
  box.innerHTML=`<div class="panel"><div class="history-year-head" style="padding:16px 18px;margin:0;border-bottom:1px solid var(--line)"><div><h2>Año ${y.year.year}</h2><p>Registro docente conservado en UnDos.</p></div>${currentBadge(y.year)}</div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Curso</th><th>Materia</th><th>Estudiantes</th><th>Evaluaciones</th><th>Realizadas</th></tr></thead><tbody>${y.assignments.map(a=>`<tr><td><strong>${U.esc(a.courseName)}</strong></td><td>${U.esc(a.subjectName)}</td><td>${a.studentCount}</td><td>${a.evaluationCount}</td><td>${a.completedEvaluationCount}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">No hay clases registradas.</td></tr>'}</tbody></table></div></div>`;
}

async function renderAdminHistory(){
  const d=await U.api('/api/history/admin');
  U.setPage('Historial académico','Resumen histórico de UnDos');
  const c=$('#content');
  c.innerHTML=`<div class="welcome"><div><h1>Historial académico</h1><p>Resumen de la información conservada en la base de datos por año escolar.</p></div></div>${d.years.length?`<div class="history-grid">${d.years.map(y=>`<div class="history-card"><div class="history-card-top"><div><h3>${y.year}</h3><p>${y.active?'Año escolar actualmente activo':'Información histórica conservada'}</p></div>${y.active?'<span class="badge ok">Activo</span>':'<span class="badge">Histórico</span>'}</div><div class="history-metrics"><div class="history-metric"><small>Estudiantes</small><strong>${y.studentCount}</strong></div><div class="history-metric"><small>Profesores</small><strong>${y.teacherCount}</strong></div><div class="history-metric"><small>Cursos</small><strong>${y.courseCount}</strong></div></div></div>`).join('')}</div><div class="panel"><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Año</th><th>Estudiantes</th><th>Profesores</th><th>Cursos</th><th>Clases</th><th>Evaluaciones</th><th>Notas guardadas</th></tr></thead><tbody>${d.years.map(y=>`<tr><td><strong>${y.year}</strong>${y.active?' <span class="badge ok">Activo</span>':''}</td><td>${y.studentCount}</td><td>${y.teacherCount}</td><td>${y.courseCount}</td><td>${y.assignmentCount}</td><td>${y.evaluationCount}</td><td>${y.gradeCount}</td></tr>`).join('')}</tbody></table></div></div>`:'<div class="card empty">Todavía no hay años académicos guardados.</div>'}<div class="history-note" style="margin-top:16px">Los años anteriores permanecen guardados aunque cambies el año activo. Esta sección es de consulta y no modifica notas, cursos ni cuentas.</div>`;
}

function previewActions(sample){return `<span class="badge warn">${sample?'Vista de ejemplo · sin cuenta':'Vista previa · solo lectura'}</span><button id="historyExitPreview" class="btn ghost">Volver a administración</button>`}
function bindPreviewExit(){const b=$('#historyExitPreview');if(b)b.onclick=()=>{S.adminPreview=null;U.renderShell();U.navigate('admin-home')}}
function sampleStudentHistory(){
  const current=S.admin?.activeYear?.year||new Date().getFullYear();
  const summary=(a,b)=>({semesters:{1:{status:'final',average:a},2:{status:'final',average:b}},annual:{status:'final',average:Math.round(((a+b)/2)*10)/10}});
  return [{year:{year:current,active:true},course:{name:'3° Medio B'},subjects:[{name:'Matemáticas',teacherName:'Carlos Soto',summary:summary(5.8,6.1)},{name:'Lengua y Literatura',teacherName:'Daniela Pérez',summary:summary(6.0,6.1)},{name:'Historia',teacherName:'Andrés Díaz',summary:summary(5.6,5.9)},{name:'Inglés',teacherName:'Paula Muñoz',summary:summary(6.2,6.3)}],overall:{status:'final',average:6.0}},{year:{year:current-1,active:false},course:{name:'2° Medio A'},subjects:[{name:'Matemáticas',teacherName:'Carlos Soto',summary:summary(5.5,5.8)},{name:'Lengua y Literatura',teacherName:'Daniela Pérez',summary:summary(5.9,6.0)},{name:'Historia',teacherName:'Andrés Díaz',summary:summary(5.4,5.7)},{name:'Inglés',teacherName:'Paula Muñoz',summary:summary(6.0,6.1)}],overall:{status:'final',average:5.8}}];
}
function sampleTeacherHistory(){
  const current=S.admin?.activeYear?.year||new Date().getFullYear();
  return [{year:{year:current,active:true},assignments:[{courseName:'3° Medio B',subjectName:'Matemáticas',studentCount:32,evaluationCount:4,completedEvaluationCount:3},{courseName:'3° Medio B',subjectName:'Física',studentCount:32,evaluationCount:3,completedEvaluationCount:2},{courseName:'2° Medio A',subjectName:'Matemáticas',studentCount:29,evaluationCount:4,completedEvaluationCount:4}]},{year:{year:current-1,active:false},assignments:[{courseName:'2° Medio A',subjectName:'Matemáticas',studentCount:30,evaluationCount:8,completedEvaluationCount:8},{courseName:'1° Medio B',subjectName:'Matemáticas',studentCount:31,evaluationCount:8,completedEvaluationCount:8}]}];
}
async function renderPreviewHistory(){
  const p=S.adminPreview;if(!p)return;
  document.querySelectorAll('#nav .nav-btn').forEach(b=>b.classList.toggle('active',!!b.matches('[data-preview-history]')));
  try{
    if(p.role==='student'){
      const years=p.sample?sampleStudentHistory():(await U.api(`/api/history/admin/student/${p.user.id}`)).years;
      U.setPage('Historial académico','Vista del estudiante',previewActions(p.sample));renderStudentHistoryContent(years,true);bindPreviewExit();
    }else{
      const years=p.sample?sampleTeacherHistory():(await U.api(`/api/history/admin/teacher/${p.user.id}`)).years;
      U.setPage('Historial docente','Vista del profesor',previewActions(p.sample));renderTeacherHistoryContent(years,true);bindPreviewExit();
    }
  }catch(e){U.toast(e.message)}
}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-preview-history]');
  if(!b||!S.adminPreview)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();renderPreviewHistory();
},true);
})();
