(()=>{
const U=window.U,$=U.$,S=U.state;
const legacyUsers=U.renderAdminUsers;
const semNow=()=>new Date().getMonth()+1>=7?2:1;
const pendingFor=(subject,sem)=>subject.evaluations.filter(e=>e.semester===sem&&(e.status==='pending'||e.grade==null)).length;
const semAverage=(subject,sem)=>U.gradeText(subject.summary.semesters[sem]);
async function loadAdmin(){S.admin=await U.api('/api/admin/overview');return S.admin}

function adminTop(title,subtitle,actions=''){
  U.setPage(title,subtitle,actions);
}

U.renderAdminHome=async()=>{
  const d=await loadAdmin();
  const students=d.users.filter(x=>x.role==='student'&&x.active),teachers=d.users.filter(x=>x.role==='teacher'&&x.active);
  adminTop('Administración de UnDos','Liceo Tecnológico Montemaria','<button id="adminCreateUser" class="btn primary">+ Crear usuario</button>');
  $('#content').innerHTML=`
    <div class="welcome"><div><h1>Panel administrativo</h1><p>Gestiona usuarios, cursos, materias, años escolares y accesos.</p></div></div>
    <div class="grid cols-4" style="margin-bottom:20px">
      <div class="card stat"><span>Estudiantes activos</span><strong>${students.length}</strong></div>
      <div class="card stat"><span>Profesores activos</span><strong>${teachers.length}</strong></div>
      <div class="card stat"><span>Cursos</span><strong>${d.courses.length}</strong></div>
      <div class="card stat"><span>Año escolar</span><strong>${d.activeYear.year}</strong></div>
    </div>
    <div class="admin-home-grid">
      <div class="panel">
        <div class="toolbar" style="padding:14px"><input id="adminUserSearch" class="search" placeholder="Buscar usuario por nombre o RUT"><button id="goUsers" class="btn secondary">Administrar usuarios</button></div>
        <div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Usuario</th><th>RUT</th><th>Rol</th><th>Curso</th><th>Estado</th><th></th></tr></thead><tbody>
          ${d.users.map(u=>`<tr data-admin-user-row data-search="${U.esc((u.fullName+' '+U.fmtRut(u.rut)).toLowerCase())}"><td><strong>${U.esc(u.fullName)}</strong></td><td>${U.esc(U.fmtRut(u.rut))}</td><td>${U.roleLabel[u.role]}</td><td>${U.esc(u.courseName||'—')}</td><td><span class="badge ${u.active?'ok':'danger'}">${u.active?'Activo':'Inactivo'}</span></td><td>${u.active&&u.role!=='admin'?`<button class="btn small ghost" data-preview-direct="${u.role}:${u.id}">Ver panel</button>`:''}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="card admin-quick-card">
        <h2>Acciones rápidas</h2>
        <div class="quick-row"><div><strong>Crear estudiante</strong><small>Asignar RUT, curso y contraseña</small></div><button class="btn small secondary" data-admin-go="users">Crear</button></div>
        <div class="quick-row"><div><strong>Crear profesor</strong><small>Crear cuenta y luego asignar materias</small></div><button class="btn small secondary" data-admin-go="users">Crear</button></div>
        <div class="quick-row"><div><strong>Cursos</strong><small>Gestionar cursos y asignaciones docentes</small></div><button class="btn small secondary" data-admin-go="courses">Abrir</button></div>
        <div class="quick-row"><div><strong>Materias</strong><small>Crear y revisar asignaturas</small></div><button class="btn small secondary" data-admin-go="subjects">Abrir</button></div>
        <div class="quick-row"><div><strong>Vista de estudiante</strong><small>Cuenta real o vista de ejemplo sin cuenta</small></div><button class="btn small secondary" data-open-preview="student">Ver</button></div>
        <div class="quick-row"><div><strong>Vista de profesor</strong><small>Cuenta real o vista de ejemplo sin cuenta</small></div><button class="btn small secondary" data-open-preview="teacher">Ver</button></div>
      </div>
    </div>`;
  $('#adminCreateUser').onclick=()=>U.navigate('admin-users');
  $('#goUsers').onclick=()=>U.navigate('admin-users');
  $('#adminUserSearch').oninput=e=>{const q=String(e.target.value||'').trim().toLowerCase();document.querySelectorAll('[data-admin-user-row]').forEach(r=>r.hidden=q&&!String(r.dataset.search||'').includes(q))};
  $('#content').onclick=e=>{
    const go=e.target.closest('[data-admin-go]'),preview=e.target.closest('[data-open-preview]'),direct=e.target.closest('[data-preview-direct]');
    if(go)U.navigate('admin-'+go.dataset.adminGo);
    if(preview)openPreviewPicker(preview.dataset.openPreview);
    if(direct){const [role,id]=direct.dataset.previewDirect.split(':');enterRealPreview(role,Number(id))}
  };
};

U.renderAdminUsers=async()=>{
  await legacyUsers();
  const actions=$('#topActions');
  if(actions)actions.insertAdjacentHTML('afterbegin','<button id="sampleStudentTop" class="btn ghost">Vista estudiante</button><button id="sampleTeacherTop" class="btn ghost">Vista profesor</button>');
  $('#sampleStudentTop').onclick=()=>openPreviewPicker('student');
  $('#sampleTeacherTop').onclick=()=>openPreviewPicker('teacher');
  const rows=[...document.querySelectorAll('#content tbody tr')];
  rows.forEach((tr,i)=>{
    const u=S.admin?.users?.[i];if(!u||!u.active||u.role==='admin')return;
    const td=tr.lastElementChild;if(!td)return;
    const b=document.createElement('button');b.className='btn small ghost';b.style.marginLeft='6px';b.textContent='Ver panel';b.onclick=e=>{e.stopPropagation();enterRealPreview(u.role,u.id)};td.appendChild(b);
  });
};

U.renderAdminCourses=async()=>{
  const d=await loadAdmin(),teachers=d.users.filter(u=>u.role==='teacher'&&u.active);
  adminTop('Cursos',`Año escolar ${d.activeYear.year}`,'<button id="newCourseV2" class="btn primary">+ Crear curso</button>');
  $('#content').innerHTML=`
    <div class="welcome"><div><h1>Cursos</h1><p>Organiza los cursos del año escolar y las clases asignadas.</p></div></div>
    <div class="grid cols-3" style="margin-bottom:22px">${d.courses.map(c=>`<div class="card"><div class="course-card"><div><strong>${U.esc(c.name)}</strong><p>${d.users.filter(u=>u.role==='student'&&u.active&&u.courseId===c.id).length} estudiantes</p></div><span class="badge ok">Activo</span></div></div>`).join('')||'<div class="card empty">No hay cursos.</div>'}</div>
    <div class="panel"><div class="toolbar" style="padding:14px"><div><strong>Asignaciones docentes</strong><div class="muted">Profesor + materia + curso</div></div><button id="assignClassV2" class="btn primary">+ Asignar clase</button></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Curso</th><th>Materia</th><th>Profesor</th><th>Estado</th></tr></thead><tbody>${d.assignments.map(a=>`<tr><td>${U.esc(a.courseName)}</td><td>${U.esc(a.subjectName)}</td><td>${U.esc(a.teacherName)}</td><td><span class="badge ok">Activa</span></td></tr>`).join('')||'<tr><td colspan="4" class="empty">Aún no hay clases asignadas.</td></tr>'}</tbody></table></div></div>`;
  $('#newCourseV2').onclick=()=>createCourse(d);
  $('#assignClassV2').onclick=()=>createAssignment(d,teachers,'courses');
};

U.renderAdminSubjects=async()=>{
  const d=await loadAdmin(),teachers=d.users.filter(u=>u.role==='teacher'&&u.active);
  adminTop('Materias',`Año escolar ${d.activeYear.year}`,'<button id="newSubjectV2" class="btn primary">+ Crear materia</button>');
  $('#content').innerHTML=`
    <div class="welcome"><div><h1>Materias</h1><p>Administra las asignaturas disponibles y revisa dónde se imparten.</p></div></div>
    <div class="grid cols-3" style="margin-bottom:22px">${d.subjects.map(s=>`<div class="card"><div class="course-card"><div><strong>${U.esc(s.name)}</strong><p>${d.assignments.filter(a=>a.subjectId===s.id&&a.active).length} clases asignadas</p></div><span class="badge ${s.active?'ok':'danger'}">${s.active?'Activa':'Inactiva'}</span></div></div>`).join('')||'<div class="card empty">No hay materias.</div>'}</div>
    <div class="panel"><div class="toolbar" style="padding:14px"><div><strong>Profesores y materias</strong><div class="muted">Revisa las asignaciones del año activo</div></div><button id="assignSubjectV2" class="btn primary">+ Asignar clase</button></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Materia</th><th>Profesor</th><th>Curso</th></tr></thead><tbody>${d.assignments.map(a=>`<tr><td>${U.esc(a.subjectName)}</td><td>${U.esc(a.teacherName)}</td><td>${U.esc(a.courseName)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">Sin asignaciones.</td></tr>'}</tbody></table></div></div>`;
  $('#newSubjectV2').onclick=()=>createSubject();
  $('#assignSubjectV2').onclick=()=>createAssignment(d,teachers,'subjects');
};

U.renderAdminYears=async()=>{
  const d=await loadAdmin();
  adminTop('Años escolares','Historial académico','<button id="newYearV2" class="btn primary">+ Nuevo año</button>');
  $('#content').innerHTML=`
    <div class="welcome"><div><h1>Años escolares</h1><p>Conserva los años anteriores y define cuál es el año académico activo.</p></div></div>
    <div class="panel"><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Año</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${d.years.map(y=>`<tr><td><strong>${y.year}</strong></td><td>${y.active?'<span class="badge ok">Año activo</span>':'<span class="badge">Histórico</span>'}</td><td>${y.active?'—':`<button class="btn small secondary" data-activate-year-v2="${y.id}">Activar</button>`}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card" style="margin-top:16px"><strong>Importante</strong><p class="muted" style="margin-bottom:0">Activar un año no elimina la información de años anteriores. Los datos históricos se mantienen en la base de datos.</p></div>`;
  $('#newYearV2').onclick=createYear;
  $('#content').onclick=async e=>{const b=e.target.closest('[data-activate-year-v2]');if(!b)return;if(!confirm('¿Activar este año escolar?'))return;try{await U.api(`/api/admin/years/${b.dataset.activateYearV2}/activate`,{method:'POST'});U.toast('Año escolar activado');U.renderAdminYears()}catch(err){U.toast(err.message)}};
};

U.renderAdminAcademic=U.renderAdminCourses;

function createCourse(){
  U.openModal('Crear curso','<form id="courseV2Form" class="stack"><div class="field"><label>Nombre del curso</label><input name="name" placeholder="Ej: 3° Medio B" required></div><div class="field"><label>Orden</label><input name="levelOrder" type="number" value="20"></div><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Crear curso</button></div></form>');
  const f=$('#courseV2Form');f.onsubmit=async e=>{e.preventDefault();const x=new FormData(f);try{await U.api('/api/admin/courses',{method:'POST',body:{name:x.get('name'),levelOrder:Number(x.get('levelOrder'))}});U.closeModal();U.toast('Curso creado');U.renderAdminCourses()}catch(err){U.toast(err.message)}};$('[data-close]').onclick=U.closeModal;
}
function createSubject(){
  U.openModal('Crear materia','<form id="subjectV2Form" class="stack"><div class="field"><label>Nombre de la materia</label><input name="name" placeholder="Ej: Matemáticas" required></div><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Crear materia</button></div></form>');
  const f=$('#subjectV2Form');f.onsubmit=async e=>{e.preventDefault();try{await U.api('/api/admin/subjects',{method:'POST',body:{name:new FormData(f).get('name')}});U.closeModal();U.toast('Materia creada');U.renderAdminSubjects()}catch(err){U.toast(err.message)}};$('[data-close]').onclick=U.closeModal;
}
function createYear(){
  U.openModal('Nuevo año escolar',`<form id="yearV2Form" class="stack"><div class="field"><label>Año</label><input name="year" type="number" min="2020" max="2100" value="${new Date().getFullYear()+1}" required></div><p class="muted">El nuevo año se crea sin eliminar el historial anterior.</p><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Crear año</button></div></form>`);
  const f=$('#yearV2Form');f.onsubmit=async e=>{e.preventDefault();try{await U.api('/api/admin/years',{method:'POST',body:{year:Number(new FormData(f).get('year'))}});U.closeModal();U.toast('Año creado');U.renderAdminYears()}catch(err){U.toast(err.message)}};$('[data-close]').onclick=U.closeModal;
}
function createAssignment(d,teachers,returnPage){
  if(!teachers.length){U.toast('Primero debes crear un profesor');return}
  if(!d.subjects.length||!d.courses.length){U.toast('Necesitas al menos un curso y una materia');return}
  U.openModal('Asignar clase',`<form id="assignmentV2Form" class="stack"><div class="field"><label>Profesor</label><select name="teacherId">${teachers.map(t=>`<option value="${t.id}">${U.esc(t.fullName)}</option>`).join('')}</select></div><div class="form-grid"><div class="field"><label>Materia</label><select name="subjectId">${d.subjects.map(s=>`<option value="${s.id}">${U.esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Curso</label><select name="courseId">${d.courses.map(c=>`<option value="${c.id}">${U.esc(c.name)}</option>`).join('')}</select></div></div><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Asignar</button></div></form>`);
  const f=$('#assignmentV2Form');f.onsubmit=async e=>{e.preventDefault();const x=new FormData(f);try{await U.api('/api/admin/assignments',{method:'POST',body:{teacherId:Number(x.get('teacherId')),subjectId:Number(x.get('subjectId')),courseId:Number(x.get('courseId'))}});U.closeModal();U.toast('Clase asignada');returnPage==='subjects'?U.renderAdminSubjects():U.renderAdminCourses()}catch(err){U.toast(err.message)}};$('[data-close]').onclick=U.closeModal;
}

function openPreviewPicker(role){
  const users=(S.admin?.users||[]).filter(u=>u.role===role&&u.active),label=role==='student'?'estudiante':'profesor';
  U.openModal(`Vista de ${label}`,`<form id="previewV2Form" class="stack"><div class="field"><label>Qué quieres ver</label><select name="choice"><option value="sample">Vista de ejemplo · sin cuenta</option>${users.map(u=>`<option value="real:${u.id}">${U.esc(u.fullName)} · ${U.esc(U.fmtRut(u.rut))}${u.courseName?` · ${U.esc(u.courseName)}`:''}</option>`).join('')}</select></div><p class="muted">La vista es de solo lectura y tu sesión seguirá siendo de administrador.</p><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Abrir panel</button></div></form>`);
  const f=$('#previewV2Form');f.onsubmit=e=>{e.preventDefault();const v=String(new FormData(f).get('choice'));U.closeModal();if(v==='sample')enterSamplePreview(role);else enterRealPreview(role,Number(v.split(':')[1]))};$('[data-close]').onclick=U.closeModal;
}
function previewNav(role,user,isSample=false){
  const nav=$('#nav'),mini=$('#userMini');
  const title=role==='student'?'Estudiante':'Profesor';
  nav.innerHTML=`<div class="nav-title">${title}</div><button class="nav-btn active" data-preview-home><span class="nav-icon">⌂</span><span>Inicio</span></button><button class="nav-btn" data-preview-home><span class="nav-icon">${role==='student'?'▦':'▤'}</span><span>${role==='student'?'Mis materias':'Mis cursos'}</span></button><button class="nav-btn" data-preview-history><span class="nav-icon">◷</span><span>Historial</span></button>`;
  mini.innerHTML=`<div class="avatar">${U.esc(U.initials(user.fullName))}</div><div class="user-copy"><strong>${U.esc(user.fullName)}</strong><span>${title} · ${isSample?'Ejemplo':'Vista previa'}</span></div>`;
  nav.onclick=e=>{if(e.target.closest('[data-preview-home]')){const p=S.adminPreview;if(!p)return;if(p.sample)enterSamplePreview(p.role);else enterRealPreview(p.role,p.user.id)}if(e.target.closest('[data-preview-history]'))U.toast('El historial se trabajará en la siguiente etapa')};
}
function previewActions(isSample=false,extra=''){return `${extra}<span class="badge warn">${isSample?'Vista de ejemplo · sin cuenta':'Vista previa · solo lectura'}</span><button id="exitPreviewV2" class="btn ghost">Volver a administración</button>`}
function bindExit(){const b=$('#exitPreviewV2');if(b)b.onclick=()=>{S.adminPreview=null;U.renderShell();U.navigate('admin-home')}}

async function enterRealPreview(role,id){
  try{const d=await U.api(`/api/admin/preview/${role}/${id}`);S.adminPreview={role,user:d.previewUser,sample:false};previewNav(role,d.previewUser,false);role==='student'?renderStudentPreviewData(d,semNow(),false):renderTeacherPreviewData(d,false)}catch(err){U.toast(err.message)}
}
function enterSamplePreview(role){
  const d=role==='student'?sampleStudent():sampleTeacher();S.adminPreview={role,user:d.previewUser,sample:true};previewNav(role,d.previewUser,true);role==='student'?renderStudentPreviewData(d,2,true):renderTeacherPreviewData(d,true);
}

function finalSummary(evs){
  const sems={};for(const sem of [1,2]){const list=evs.filter(e=>e.semester===sem),done=list.length&&list.every(e=>e.status==='completed'&&e.grade!=null),weight=list.reduce((n,e)=>n+Number(e.weight||0),0);sems[sem]=done&&weight>0?{status:'final',average:Math.round((list.reduce((n,e)=>n+Number(e.grade)*Number(e.weight),0)/weight)*10)/10}:{status:'in_progress',average:null}}
  return {semesters:sems,annual:sems[1].status==='final'&&sems[2].status==='final'?{status:'final',average:Math.round(((sems[1].average+sems[2].average)/2)*10)/10}:{status:'in_progress',average:null}};
}
function sampleStudent(){
  const year=S.admin?.activeYear?.year||new Date().getFullYear(),make=(id,name,teacher,evs)=>({id,name,teacherName:teacher,evaluations:evs,summary:finalSummary(evs)});
  return {previewUser:{id:0,rut:'12345678-5',fullName:'Martín Silva',role:'student'},activeYear:{year},course:{id:0,name:'3° Medio B'},subjects:[
    make(1,'Matemáticas','Carlos Soto',[{id:11,name:'Prueba 1',date:'2026-08-10',semester:2,weight:30,status:'completed',grade:5.9},{id:12,name:'Trabajo',date:'2026-08-24',semester:2,weight:30,status:'completed',grade:6.4},{id:13,name:'Prueba 2',date:'2026-09-15',semester:2,weight:40,status:'pending',grade:null}]),
    make(2,'Lengua y Literatura','Daniela Pérez',[{id:21,name:'Ensayo',date:'2026-08-12',semester:2,weight:40,status:'completed',grade:6.2},{id:22,name:'Prueba',date:'2026-08-27',semester:2,weight:60,status:'completed',grade:6.0}]),
    make(3,'Historia','Andrés Díaz',[{id:31,name:'Control',date:'2026-08-11',semester:2,weight:35,status:'completed',grade:5.7},{id:32,name:'Proyecto',date:'2026-09-20',semester:2,weight:65,status:'pending',grade:null}]),
    make(4,'Inglés','Paula Muñoz',[{id:41,name:'Speaking',date:'2026-08-14',semester:2,weight:50,status:'completed',grade:6.4},{id:42,name:'Test',date:'2026-08-29',semester:2,weight:50,status:'completed',grade:6.2}]),
    make(5,'Física','Carlos Soto',[{id:51,name:'Laboratorio',date:'2026-08-18',semester:2,weight:40,status:'completed',grade:5.8},{id:52,name:'Prueba',date:'2026-09-18',semester:2,weight:60,status:'pending',grade:null}]),
    make(6,'Educación Física','Felipe Rojas',[{id:61,name:'Unidad deportiva',date:'2026-08-22',semester:2,weight:100,status:'completed',grade:6.5}])
  ],overall:{status:'in_progress',average:null}};
}
function sampleTeacher(){
  const year=S.admin?.activeYear?.year||new Date().getFullYear();return {previewUser:{id:0,rut:'15234567-8',fullName:'Carlos Soto',role:'teacher'},activeYear:{year},assignments:[{id:'sample-math',subjectName:'Matemáticas',courseName:'3° Medio B',studentCount:32,evaluationCount:4},{id:'sample-physics',subjectName:'Física',courseName:'3° Medio B',studentCount:32,evaluationCount:3},{id:'sample-math2',subjectName:'Matemáticas',courseName:'2° Medio A',studentCount:29,evaluationCount:4}]};
}
function sampleTeacherClass(assignmentId){
  const base=sampleTeacher(),a=base.assignments.find(x=>x.id===assignmentId)||base.assignments[0],students=['Ana Pérez','Diego Soto','Martín Silva','Camila Fuentes','Joaquín Rojas'].map((n,i)=>({id:i+1,rut:`2000000${i+1}-${i}`,fullName:n}));
  const evaluations=[{id:101,name:'Prueba 1',date:'2026-08-05',semester:2,weight:25,status:'completed'},{id:102,name:'Trabajo',date:'2026-08-19',semester:2,weight:20,status:'completed'},{id:103,name:'Prueba 2',date:'2026-09-02',semester:2,weight:30,status:'completed'},{id:104,name:'Proyecto',date:'2026-09-25',semester:2,weight:25,status:'pending'}];
  const vals=[[6.2,5.8,6.0],[4.8,5.4,5.1],[5.9,6.4,5.7],[6.7,6.5,6.3],[5.0,5.6,4.9]],grades=[];students.forEach((s,i)=>evaluations.slice(0,3).forEach((e,j)=>grades.push({evaluationId:e.id,studentId:s.id,grade:vals[i][j]})));
  return {previewUser:base.previewUser,assignment:{id:a.id,subjectName:a.subjectName,courseName:a.courseName,year:base.activeYear.year},students,evaluations,grades,completedWeight:{1:0,2:75}};
}

function renderStudentPreviewData(d,sem,isSample){
  const first=String(d.previewUser.fullName).split(/\s+/)[0],pending=d.subjects.reduce((n,s)=>n+pendingFor(s,sem),0);
  adminTop('Panel del estudiante',`Año escolar ${d.activeYear.year}`,previewActions(isSample,`<select id="previewSemV2" class="semester"><option value="1" ${sem===1?'selected':''}>1° semestre</option><option value="2" ${sem===2?'selected':''}>2° semestre</option></select>`));
  $('#content').innerHTML=`<div class="student-head"><div><h1>Hola, ${U.esc(first)} 👋</h1><p>Aquí puedes revisar tus materias, evaluaciones y notas.</p></div></div><div class="student-stats"><div class="student-stat"><span>Curso</span><strong>${U.esc(d.course?.name||'Sin curso')}</strong></div><div class="student-stat"><span>Materias</span><strong>${d.subjects.length}</strong></div><div class="student-stat"><span>Evaluaciones pendientes</span><strong class="${pending?'pending-number':''}">${pending}</strong></div><div class="student-stat"><span>Promedio general anual</span><strong>${U.gradeText(d.overall)}</strong></div></div><div class="student-section-head"><div><h2>Mis materias</h2><p>Selecciona una materia para ver sus evaluaciones.</p></div></div><div class="student-subject-grid">${d.subjects.map(s=>{const p=pendingFor(s,sem);return `<button class="student-subject-card" data-prev-sub="${s.id}"><h3>${U.esc(s.name)}</h3><span class="teacher">Prof. ${U.esc(s.teacherName||'Por asignar')}</span><div class="student-subject-bottom"><div class="avg"><small>Promedio</small><strong>${semAverage(s,sem)}</strong></div>${p?`<span class="badge warn">${p} pendiente${p===1?'':'s'}</span>`:'<span class="badge ok">Al día</span>'}</div></button>`}).join('')||'<div class="card empty">No hay materias.</div>'}</div><div id="previewStudentDetailV2"></div>`;
  bindExit();$('#previewSemV2').onchange=e=>renderStudentPreviewData(d,Number(e.target.value),isSample);$('#content').onclick=e=>{const b=e.target.closest('[data-prev-sub]');if(!b)return;const s=d.subjects.find(x=>x.id===Number(b.dataset.prevSub)),box=$('#previewStudentDetailV2');if(!s||!box)return;const evs=s.evaluations.filter(x=>x.semester===sem);box.innerHTML=`<div class="student-detail"><div class="student-detail-head"><div><h3>${U.esc(s.name)}</h3><p>${U.esc(s.teacherName||'Profesor por asignar')} · ${sem}° semestre</p></div><span class="badge blue">Promedio: ${semAverage(s,sem)}</span></div><div class="table-wrap" style="border:0"><table><thead><tr><th>Evaluación</th><th>Fecha</th><th>Ponderación</th><th>Estado</th><th>Nota</th></tr></thead><tbody>${evs.map(ev=>`<tr><td><strong>${U.esc(ev.name)}</strong></td><td>${U.fmtDate(ev.date)}</td><td>${ev.weight}%</td><td><span class="badge ${ev.status==='completed'?'ok':'warn'}">${U.statusLabel[ev.status]}</span></td><td class="grade">${ev.grade==null?'—':Number(ev.grade).toFixed(1)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Sin evaluaciones.</td></tr>'}</tbody></table></div></div>`};
}
function renderTeacherPreviewData(d,isSample){
  const first=String(d.previewUser.fullName).split(/\s+/)[0],students=d.assignments.reduce((n,a)=>n+Number(a.studentCount||0),0),evals=d.assignments.reduce((n,a)=>n+Number(a.evaluationCount||0),0);
  adminTop('Panel del profesor',`Año escolar ${d.activeYear.year}`,previewActions(isSample));
  $('#content').innerHTML=`<div class="welcome"><div><h1>Hola, ${U.esc(first)} 👋</h1><p>Administra tus cursos, evaluaciones y notas.</p></div></div><div class="grid cols-4" style="margin-bottom:24px"><div class="card stat"><span>Clases asignadas</span><strong>${d.assignments.length}</strong></div><div class="card stat"><span>Estudiantes</span><strong>${students}</strong></div><div class="card stat"><span>Evaluaciones</span><strong>${evals}</strong></div><div class="card stat"><span>Año escolar</span><strong>${d.activeYear.year}</strong></div></div><div style="margin:26px 0 13px"><h3 style="margin:0;font-size:17px">Mis cursos</h3><p class="muted">Selecciona una materia para abrir su libro de notas.</p></div><div class="grid cols-3">${d.assignments.map(a=>`<button class="card course-card" data-prev-class="${a.id}" style="text-align:left;border:1px solid var(--line)"><div><span class="eyebrow">${U.esc(a.courseName)}</span><h2 style="margin-top:7px">${U.esc(a.subjectName)}</h2><p>${a.studentCount} estudiantes · ${a.evaluationCount} evaluaciones</p></div><span class="badge blue">Abrir</span></button>`).join('')||'<div class="card empty">No hay clases asignadas.</div>'}</div>`;
  bindExit();$('#content').onclick=e=>{const b=e.target.closest('[data-prev-class]');if(!b)return;if(isSample)renderTeacherClassPreview(sampleTeacherClass(b.dataset.prevClass),2,true);else loadRealTeacherClass(d.previewUser.id,Number(b.dataset.prevClass),2)};
}
async function loadRealTeacherClass(teacherId,assignmentId,sem){try{const d=await U.api(`/api/admin/preview/teacher/${teacherId}/assignments/${assignmentId}`);renderTeacherClassPreview(d,sem,false)}catch(err){U.toast(err.message)}}
function renderTeacherClassPreview(d,sem,isSample){
  const gm=new Map(d.grades.map(g=>[`${g.evaluationId}-${g.studentId}`,g.grade])),evs=d.evaluations.filter(e=>e.semester===sem),created=evs.reduce((n,e)=>n+Number(e.weight||0),0),studentAvg=id=>{if(!evs.length||evs.some(e=>e.status!=='completed'))return null;let n=0,w=0;for(const e of evs){const g=gm.get(`${e.id}-${id}`);if(g==null)return null;n+=Number(g)*Number(e.weight);w+=Number(e.weight)}return w?n/w:null};
  adminTop(`${d.assignment.courseName} · ${d.assignment.subjectName}`,`${d.students.length} estudiantes · ${sem}° semestre`,previewActions(isSample,`<button id="backTeacherPreviewV2" class="btn ghost">Cambiar materia</button><select id="teacherPrevSemV2" class="semester"><option value="1" ${sem===1?'selected':''}>1° semestre</option><option value="2" ${sem===2?'selected':''}>2° semestre</option></select>`));
  $('#content').innerHTML=`<div class="welcome"><div><h1>Libro de notas</h1><p>Vista de solo lectura del libro del profesor.</p></div></div><div class="grid cols-4" style="margin-bottom:24px"><div class="card stat"><span>Estudiantes</span><strong>${d.students.length}</strong></div><div class="card stat"><span>Evaluaciones</span><strong>${evs.length}</strong></div><div class="card stat"><span>Ponderación creada</span><strong>${created}%</strong></div><div class="card stat"><span>Estado</span><strong class="orange" style="font-size:22px">${evs.length&&evs.every(e=>e.status==='completed')?'Completo':'En proceso'}</strong></div></div><div class="panel"><div class="toolbar" style="padding:14px"><input id="teacherPrevSearchV2" class="search" placeholder="Buscar estudiante por nombre o RUT"><span class="badge warn">Solo lectura</span></div><div class="table-wrap" style="border:0"><table><thead><tr><th>Estudiante</th>${evs.map(e=>`<th>${U.esc(e.name)}<span class="weight">${e.weight}%</span></th>`).join('')}<th>Promedio</th></tr></thead><tbody>${d.students.map(s=>{const a=studentAvg(s.id);return `<tr data-prev-student-row data-search="${U.esc((s.fullName+' '+U.fmtRut(s.rut)).toLowerCase())}"><td><strong>${U.esc(s.fullName)}</strong><span class="weight">${U.esc(U.fmtRut(s.rut))}</span></td>${evs.map(e=>`<td class="grade">${gm.get(`${e.id}-${s.id}`)==null?'<span class="pending">Pendiente</span>':Number(gm.get(`${e.id}-${s.id}`)).toFixed(1)}</td>`).join('')}<td class="grade">${a==null?'<span class="pending">En proceso</span>':a.toFixed(1)}</td></tr>`}).join('')}</tbody></table></div></div>`;
  bindExit();$('#teacherPrevSearchV2').oninput=e=>{const q=String(e.target.value||'').toLowerCase();document.querySelectorAll('[data-prev-student-row]').forEach(r=>r.hidden=q&&!r.dataset.search.includes(q))};$('#teacherPrevSemV2').onchange=e=>{const n=Number(e.target.value);isSample?renderTeacherClassPreview(sampleTeacherClass(d.assignment.id),n,true):loadRealTeacherClass(d.previewUser?.id||S.adminPreview.user.id,d.assignment.id,n)};$('#backTeacherPreviewV2').onclick=()=>{isSample?enterSamplePreview('teacher'):enterRealPreview('teacher',S.adminPreview.user.id)};
}
})();
