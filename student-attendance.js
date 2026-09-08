(()=>{
const U=window.U,$=U.$,S=U.state;
const style=document.createElement('style');
style.textContent=`
.student-att-head{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:20px}.student-att-head h1{margin:0 0 6px;font-size:30px;letter-spacing:-.8px;color:var(--text)}.student-att-head p{margin:0;color:var(--muted)}
.student-att-overview{display:grid;grid-template-columns:1.15fr 2fr;gap:16px;margin-bottom:18px}.student-att-main{display:flex;align-items:center;gap:20px;background:var(--card);border:1px solid var(--line);border-top:3px solid var(--orange);border-radius:18px;padding:22px;box-shadow:var(--shadow-soft)}
.student-att-ring{--p:0;width:112px;height:112px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;background:conic-gradient(var(--green) calc(var(--p)*1%),var(--line) 0);position:relative}.student-att-ring:after{content:"";position:absolute;inset:10px;border-radius:50%;background:var(--card)}.student-att-ring strong,.student-att-ring small{position:relative;z-index:1}.student-att-ring strong{font-size:24px;color:var(--text);line-height:1}.student-att-ring small{font-size:10px;color:var(--muted);margin-top:3px}.student-att-main-copy h2{margin:0 0 5px;font-size:19px}.student-att-main-copy p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}.student-att-course{display:inline-flex;margin-top:12px;padding:6px 9px;border-radius:999px;background:var(--orange-soft);color:var(--orange);font-size:11px;font-weight:800}
.student-att-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.student-att-stat{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--orange);border-radius:16px;padding:18px;box-shadow:var(--shadow-soft)}.student-att-stat span{display:block;color:var(--muted);font-size:11px;font-weight:750}.student-att-stat strong{display:block;margin-top:7px;font-size:26px;color:var(--text)}.student-att-stat.present strong{color:var(--green)}.student-att-stat.absent strong{color:var(--danger)}
.student-att-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.4fr);gap:16px;align-items:start}.student-att-card{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--orange);border-radius:18px;overflow:hidden;box-shadow:var(--shadow-soft)}.student-att-card-head{padding:17px 18px;border-bottom:1px solid var(--line)}.student-att-card-head h2{margin:0;font-size:17px}.student-att-card-head p{margin:4px 0 0;color:var(--muted);font-size:12px}
.student-att-subject{padding:14px 18px;border-bottom:1px solid var(--line)}.student-att-subject:last-child{border-bottom:0}.student-att-subject-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.student-att-subject strong{font-size:13px}.student-att-subject small{display:block;color:var(--muted);font-size:10px;margin-top:3px}.student-att-subject b{color:var(--text);font-size:13px}.student-att-progress{height:7px;background:var(--line);border-radius:999px;overflow:hidden;margin-top:9px}.student-att-progress span{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--green));border-radius:inherit}.student-att-subject-meta{display:flex;justify-content:space-between;gap:10px;margin-top:7px;color:var(--muted);font-size:10px}
.student-att-table{overflow:auto}.student-att-table table{min-width:650px}.student-att-state{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:11px;border-radius:999px;padding:6px 9px}.student-att-state.present{background:#eaf7f1;color:#167152}.student-att-state.absent{background:#fff0ec;color:#b84427}.student-att-empty{padding:34px 20px;text-align:center;color:var(--muted)}
html[data-theme="dark"] .student-att-main,html[data-theme="dark"] .student-att-stat,html[data-theme="dark"] .student-att-card{background:var(--card)!important;border-color:var(--line)!important}.student-att-ring:after{background:var(--card)}html[data-theme="dark"] .student-att-state.present{background:#163126;color:#71d5a7}html[data-theme="dark"] .student-att-state.absent{background:#351d20;color:#ff9b93}
@media(max-width:980px){.student-att-overview,.student-att-grid{grid-template-columns:1fr}}@media(max-width:650px){.student-att-head{align-items:flex-start;flex-direction:column}.student-att-main{align-items:flex-start;flex-direction:column}.student-att-stats{grid-template-columns:1fr}.student-att-ring{width:96px;height:96px}}
`;
document.head.appendChild(style);

function pct(v){return v==null?'—':`${Number(v).toFixed(Number(v)%1?1:0)}%`}
function renderAttendance(d,{preview=false,sample=false}={}){
  const summary=d.summary||{total:0,present:0,absent:0,days:0,percentage:null};
  const actions=preview?`<span class="badge warn">${sample?'Vista de ejemplo · sin cuenta':'Vista previa · solo lectura'}</span><button id="exitPreviewV2" class="btn ghost">Volver a administración</button>`:'';
  U.setPage('Asistencia',`Año escolar ${d.activeYear?.year||''}`,actions);
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',preview?b.hasAttribute('data-preview-attendance'):b.dataset.page==='student-attendance'));
  const course=d.course?.name||'Sin curso asignado';
  $('#content').innerHTML=`
    <div class="student-att-head"><div><span class="eyebrow">Seguimiento personal</span><h1>Mi asistencia</h1><p>Revisa tus registros de presente y ausente durante el año escolar.</p></div></div>
    <div class="student-att-overview">
      <div class="student-att-main"><div class="student-att-ring" style="--p:${summary.percentage??0}"><div style="text-align:center"><strong>${pct(summary.percentage)}</strong><small>asistencia</small></div></div><div class="student-att-main-copy"><h2>${summary.total?'Resumen del año':'Aún no hay registros'}</h2><p>${summary.total?'El porcentaje se calcula usando todos los controles de asistencia registrados por tus profesores.':'Cuando tus profesores comiencen a registrar asistencia, aquí aparecerá tu resumen.'}</p><span class="student-att-course">${U.esc(course)}</span></div></div>
      <div class="student-att-stats"><div class="student-att-stat present"><span>Presentes</span><strong>${summary.present}</strong></div><div class="student-att-stat absent"><span>Ausentes</span><strong>${summary.absent}</strong></div><div class="student-att-stat"><span>Días con registros</span><strong>${summary.days}</strong></div></div>
    </div>
    <div class="student-att-grid">
      <section class="student-att-card"><div class="student-att-card-head"><h2>Asistencia por materia</h2><p>Detalle de tus registros en cada asignatura.</p></div>${d.subjects?.length?d.subjects.map(s=>`<div class="student-att-subject"><div class="student-att-subject-top"><div><strong>${U.esc(s.name)}</strong><small>Prof. ${U.esc(s.teacherName||'Por asignar')}</small></div><b>${pct(s.percentage)}</b></div><div class="student-att-progress"><span style="width:${Math.max(0,Math.min(100,Number(s.percentage||0)))}%"></span></div><div class="student-att-subject-meta"><span>${s.present} presente${s.present===1?'':'s'}</span><span>${s.absent} ausente${s.absent===1?'':'s'}</span></div></div>`).join(''):'<div class="student-att-empty">Todavía no hay asistencia registrada por materia.</div>'}</section>
      <section class="student-att-card"><div class="student-att-card-head"><h2>Registros recientes</h2><p>Últimas clases en las que se registró tu asistencia.</p></div><div class="student-att-table">${d.records?.length?`<table><thead><tr><th>Fecha</th><th>Materia</th><th>Profesor</th><th>Estado</th></tr></thead><tbody>${d.records.slice(0,60).map(r=>`<tr><td>${U.fmtDate(r.date)}</td><td><strong>${U.esc(r.subjectName)}</strong></td><td>${U.esc(r.teacherName||'—')}</td><td><span class="student-att-state ${r.status}">${r.status==='present'?'✓ Presente':'× Ausente'}</span></td></tr>`).join('')}</tbody></table>`:'<div class="student-att-empty">No hay registros de asistencia todavía.</div>'}</div></section>
    </div>`;
}

U.renderStudentAttendance=async()=>{const d=await U.api('/api/student/attendance');renderAttendance(d)};

function ensureStudentAttendanceNav(){
  if(S.user?.role!=='student')return;
  const nav=$('#nav');if(!nav||nav.querySelector('[data-page="student-attendance"]'))return;
  const b=document.createElement('button');b.type='button';b.className='nav-btn';b.dataset.page='student-attendance';b.innerHTML='<span class="nav-icon">✓</span><span>Asistencia</span>';
  const history=nav.querySelector('[data-page="student-history"]');nav.insertBefore(b,history||null);
}
const baseRenderShell=U.renderShell;
U.renderShell=()=>{baseRenderShell();ensureStudentAttendanceNav()};

const baseNavigate=U.navigate;
U.navigate=async page=>{
  if(page!=='student-attendance')return baseNavigate(page);
  S.page=page;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const c=$('#content');if(c)c.innerHTML='<div class="card empty">Cargando asistencia…</div>';
  try{return await U.renderStudentAttendance()}catch(e){if(c)c.innerHTML=`<div class="card"><h2>No se pudo cargar la asistencia</h2><p class="form-error">${U.esc(e.message)}</p><button class="btn ghost" id="retryStudentAttendance">Reintentar</button></div>`;const r=$('#retryStudentAttendance');if(r)r.onclick=()=>U.navigate('student-attendance')}
};

function shiftDay(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function sampleAttendance(){
  const data=[['Matemáticas','Carlos Soto',8,1],['Lengua y Literatura','Daniela Pérez',7,1],['Historia','Andrés Díaz',7,2],['Inglés','Paula Muñoz',8,0],['Física','Carlos Soto',6,1]];
  const subjects=data.map((x,i)=>({id:i+1,name:x[0],teacherName:x[1],present:x[2],absent:x[3],total:x[2]+x[3],percentage:Math.round((x[2]*100/(x[2]+x[3]))*10)/10}));
  const records=[];let k=0;for(const s of subjects){for(let i=0;i<Math.min(5,s.total);i++){records.push({date:shiftDay(-(k++%18)),status:i<s.present?'present':'absent',subjectName:s.name,teacherName:s.teacherName})}}
  records.sort((a,b)=>b.date.localeCompare(a.date));const present=subjects.reduce((n,s)=>n+s.present,0),absent=subjects.reduce((n,s)=>n+s.absent,0),total=present+absent;
  return {activeYear:{year:S.admin?.activeYear?.year||new Date().getFullYear()},course:{id:0,name:'3° Medio B'},summary:{total,present,absent,days:new Set(records.map(r=>r.date)).size,percentage:Math.round((present*100/total)*10)/10},subjects,records};
}
async function renderPreviewAttendance(){
  const p=S.adminPreview;if(S.user?.role!=='admin'||p?.role!=='student')return;
  try{const d=p.sample?sampleAttendance():await U.api(`/api/admin/preview/student/${p.user.id}/attendance`);renderAttendance(d,{preview:true,sample:p.sample})}catch(e){U.toast(e.message)}
}
function ensurePreviewAttendance(){
  const nav=$('#nav');if(!nav||S.user?.role!=='admin'||S.adminPreview?.role!=='student'||nav.querySelector('[data-preview-attendance]'))return;
  const b=document.createElement('button');b.type='button';b.className='nav-btn';b.setAttribute('data-preview-attendance','');b.innerHTML='<span class="nav-icon">✓</span><span>Asistencia</span>';
  const hist=nav.querySelector('[data-preview-history]');nav.insertBefore(b,hist||null);b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();renderPreviewAttendance()},true);
}
const nav=$('#nav');if(nav)new MutationObserver(()=>setTimeout(()=>{ensureStudentAttendanceNav();ensurePreviewAttendance()},0)).observe(nav,{childList:true,subtree:false});
document.addEventListener('click',()=>setTimeout(()=>{ensureStudentAttendanceNav();ensurePreviewAttendance()},0),true);setTimeout(()=>{ensureStudentAttendanceNav();ensurePreviewAttendance()},0);
})();
