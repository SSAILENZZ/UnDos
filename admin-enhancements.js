(()=>{
const U=window.U,$=U.$,S=U.state;
const semNow=()=>new Date().getMonth()+1>=7?2:1;
const pendingFor=(subject,sem)=>subject.evaluations.filter(e=>e.semester===sem&&(e.status==='pending'||e.grade==null)).length;
const semAverage=(subject,sem)=>U.gradeText(subject.summary.semesters[sem]);

async function loadAdmin(){S.admin=await U.api('/api/admin/overview');return S.admin}

U.renderAdminHome=async()=>{
  const d=await loadAdmin();
  const students=d.users.filter(x=>x.role==='student'&&x.active),teachers=d.users.filter(x=>x.role==='teacher'&&x.active);
  U.setPage('Administración de UnDos','Liceo Tecnológico Montemaria','<button id="adminCreateUser" class="btn primary">+ Crear usuario</button>');
  $('#content').innerHTML=`
    <div class="welcome">
      <div><h1>Panel administrativo</h1><p>Gestiona usuarios, cursos, materias, años escolares y accesos.</p></div>
    </div>
    <div class="grid cols-4" style="margin-bottom:20px">
      <div class="card stat"><span>Estudiantes activos</span><strong>${students.length}</strong></div>
      <div class="card stat"><span>Profesores activos</span><strong>${teachers.length}</strong></div>
      <div class="card stat"><span>Cursos</span><strong>${d.courses.length}</strong></div>
      <div class="card stat"><span>Año escolar</span><strong>${d.activeYear.year}</strong></div>
    </div>
    <div class="admin-home-grid">
      <div class="panel">
        <div class="toolbar" style="padding:14px">
          <input id="adminUserSearch" class="search" placeholder="Buscar usuario por nombre o RUT">
          <button id="goUsers" class="btn secondary">Administrar usuarios</button>
        </div>
        <div class="table-wrap" style="border:0;border-radius:0">
          <table><thead><tr><th>Usuario</th><th>RUT</th><th>Rol</th><th>Curso</th><th>Estado</th><th></th></tr></thead>
          <tbody>${d.users.map(u=>`<tr data-admin-user-row data-search="${U.esc((u.fullName+' '+U.fmtRut(u.rut)).toLowerCase())}"><td><strong>${U.esc(u.fullName)}</strong></td><td>${U.esc(U.fmtRut(u.rut))}</td><td>${U.roleLabel[u.role]}</td><td>${U.esc(u.courseName||'—')}</td><td><span class="badge ${u.active?'ok':'danger'}">${u.active?'Activo':'Inactivo'}</span></td><td>${u.active&&u.role!=='admin'?`<button class="btn small ghost" data-preview-direct="${u.role}:${u.id}">Ver panel</button>`:''}</td></tr>`).join('')}</tbody></table>
        </div>
      </div>
      <div class="card admin-quick-card">
        <h2>Acciones rápidas</h2>
        <div class="quick-row"><div><strong>Crear estudiante</strong><small>Asignar RUT, curso y contraseña</small></div><button class="btn small secondary" data-admin-go="users">Crear</button></div>
        <div class="quick-row"><div><strong>Crear profesor</strong><small>Crear cuenta y luego asignar materias</small></div><button class="btn small secondary" data-admin-go="users">Crear</button></div>
        <div class="quick-row"><div><strong>Configurar académico</strong><small>Cursos, materias y asignaciones</small></div><button class="btn small secondary" data-admin-go="academic">Abrir</button></div>
        <div class="quick-row"><div><strong>Vista de estudiante</strong><small>Revisar el panel real de un estudiante</small></div><button class="btn small secondary" data-open-preview="student">Ver</button></div>
        <div class="quick-row"><div><strong>Vista de profesor</strong><small>Revisar cursos y libro de notas</small></div><button class="btn small secondary" data-open-preview="teacher">Ver</button></div>
      </div>
    </div>`;
  $('#adminCreateUser').onclick=()=>U.navigate('admin-users');
  $('#goUsers').onclick=()=>U.navigate('admin-users');
  $('#adminUserSearch').oninput=e=>{const q=String(e.target.value||'').trim().toLowerCase();document.querySelectorAll('[data-admin-user-row]').forEach(r=>r.hidden=q&&!String(r.dataset.search||'').includes(q))};
  $('#content').onclick=e=>{
    const go=e.target.closest('[data-admin-go]'),preview=e.target.closest('[data-open-preview]'),direct=e.target.closest('[data-preview-direct]');
    if(go)U.navigate(go.dataset.adminGo==='academic'?'admin-academic':'admin-users');
    if(preview)openPreviewPicker(preview.dataset.openPreview);
    if(direct){const [role,id]=direct.dataset.previewDirect.split(':');enterPreview(role,Number(id))}
  };
};

function openPreviewPicker(role){
  const users=(S.admin?.users||[]).filter(u=>u.role===role&&u.active);
  const label=role==='student'?'estudiante':'profesor';
  if(!users.length){U.toast(`No hay ${label}s activos para mostrar`);return;}
  U.openModal(`Vista de ${label}`,`<form id="previewPicker" class="stack"><div class="field"><label>Selecciona ${role==='student'?'un estudiante':'un profesor'}</label><select name="userId">${users.map(u=>`<option value="${u.id}">${U.esc(u.fullName)} · ${U.esc(U.fmtRut(u.rut))}${u.courseName?` · ${U.esc(u.courseName)}`:''}</option>`).join('')}</select></div><p class="muted">La vista previa es de solo lectura. Tu sesión seguirá siendo de administrador.</p><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Abrir panel</button></div></form>`);
  const f=$('#previewPicker');f.onsubmit=e=>{e.preventDefault();const id=Number(new FormData(f).get('userId'));U.closeModal();enterPreview(role,id)};
  $('[data-close]').onclick=U.closeModal;
}

function previewNav(role,user){
  const nav=$('#nav'),mini=$('#userMini');
  if(role==='student')nav.innerHTML=`<div class="nav-title">Estudiante</div><button class="nav-btn active" data-preview-home><span class="nav-icon">⌂</span><span>Inicio</span></button><button class="nav-btn" data-preview-home><span class="nav-icon">▦</span><span>Mis materias</span></button><button class="nav-btn" data-preview-history><span class="nav-icon">◷</span><span>Historial</span></button>`;
  else nav.innerHTML=`<div class="nav-title">Profesor</div><button class="nav-btn active" data-preview-home><span class="nav-icon">⌂</span><span>Inicio</span></button><button class="nav-btn" data-preview-home><span class="nav-icon">▤</span><span>Mis cursos</span></button><button class="nav-btn" data-preview-history><span class="nav-icon">◷</span><span>Historial</span></button>`;
  mini.innerHTML=`<div class="avatar">${U.esc(U.initials(user.fullName))}</div><div class="user-copy"><strong>${U.esc(user.fullName)}</strong><span>${U.roleLabel[role]} · Vista previa</span></div>`;
  nav.onclick=e=>{if(e.target.closest('[data-preview-home]'))role==='student'?renderStudentPreview(user.id):renderTeacherPreview(user.id);if(e.target.closest('[data-preview-history]'))U.toast('El historial se añadirá en la etapa de historial académico')};
}

async function enterPreview(role,id){
  try{
    const d=await U.api(`/api/admin/preview/${role}/${id}`);
    S.adminPreview={role,user:d.previewUser};
    previewNav(role,d.previewUser);
    if(role==='student')renderStudentPreviewData(d,semNow());else renderTeacherPreviewData(d);
  }catch(e){U.toast(e.message)}
}

function exitPreview(){S.adminPreview=null;U.renderShell();U.navigate('admin-home')}
function previewActions(extra=''){return `${extra}<span class="badge warn">Vista previa · solo lectura</span><button id="exitAdminPreview" class="btn ghost">Volver a administración</button>`}
function bindExit(){const b=$('#exitAdminPreview');if(b)b.onclick=exitPreview}

async function renderStudentPreview(id){try{const d=await U.api(`/api/admin/preview/student/${id}`);S.adminPreview={role:'student',user:d.previewUser};previewNav('student',d.previewUser);renderStudentPreviewData(d,semNow())}catch(e){U.toast(e.message)}}
function renderStudentPreviewData(d,sem){
  const user=d.previewUser,first=String(user.fullName||'Estudiante').trim().split(/\s+/)[0];
  U.setPage('Panel del estudiante',`Año escolar ${d.activeYear.year}`,previewActions(`<select id="previewStudentSemester" class="semester"><option value="1" ${sem===1?'selected':''}>1° semestre</option><option value="2" ${sem===2?'selected':''}>2° semestre</option></select>`));
  if(!d.course){$('#content').innerHTML=`<div class="student-head"><div><h1>Hola, ${U.esc(first)} 👋</h1><p>Aquí puedes revisar tus materias, evaluaciones y notas.</p></div></div><div class="card empty">Este estudiante todavía no tiene un curso asignado.</div>`;bindExit();return}
  const pending=d.subjects.reduce((n,s)=>n+pendingFor(s,sem),0);
  $('#content').innerHTML=`<div class="student-head"><div><h1>Hola, ${U.esc(first)} 👋</h1><p>Aquí puedes revisar tus materias, evaluaciones y notas.</p></div></div><div class="student-stats"><div class="student-stat"><span>Curso</span><strong>${U.esc(d.course.name)}</strong></div><div class="student-stat"><span>Materias</span><strong>${d.subjects.length}</strong></div><div class="student-stat"><span>Evaluaciones pendientes</span><strong class="${pending?'pending-number':''}">${pending}</strong></div><div class="student-stat"><span>Promedio general anual</span><strong>${U.gradeText(d.overall)}</strong></div></div><div class="student-section-head"><div><h2>Mis materias</h2><p>Selecciona una materia para ver sus evaluaciones.</p></div></div><div class="student-subject-grid">${d.subjects.map(s=>{const p=pendingFor(s,sem);return `<button class="student-subject-card" type="button" data-preview-subject="${s.id}"><h3>${U.esc(s.name)}</h3><span class="teacher">Prof. ${U.esc(s.teacherName||'Por asignar')}</span><div class="student-subject-bottom"><div class="avg"><small>Promedio</small><strong>${semAverage(s,sem)}</strong></div>${p?`<span class="badge warn">${p} pendiente${p===1?'':'s'}</span>`:'<span class="badge ok">Al día</span>'}</div></button>`}).join('')||'<div class="card empty">No hay materias asociadas.</div>'}</div><div id="adminStudentSubjectDetail"></div>`;
  bindExit();
  $('#previewStudentSemester').onchange=e=>renderStudentPreviewData(d,Number(e.target.value));
  $('#content').onclick=e=>{const b=e.target.closest('[data-preview-subject]');if(!b)return;const subject=d.subjects.find(s=>s.id===Number(b.dataset.previewSubject)),box=$('#adminStudentSubjectDetail');if(!subject||!box)return;const evs=subject.evaluations.filter(x=>x.semester===sem);box.innerHTML=`<div class="student-detail"><div class="student-detail-head"><div><h3>${U.esc(subject.name)}</h3><p>${U.esc(subject.teacherName||'Profesor por asignar')} · ${sem}° semestre</p></div><span class="badge blue">Promedio: ${semAverage(subject,sem)}</span></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Evaluación</th><th>Fecha</th><th>Ponderación</th><th>Estado</th><th>Nota</th></tr></thead><tbody>${evs.map(ev=>`<tr><td><strong>${U.esc(ev.name)}</strong></td><td>${U.fmtDate(ev.date)}</td><td>${ev.weight}%</td><td><span class="badge ${ev.status==='completed'?'ok':'warn'}">${U.statusLabel[ev.status]}</span></td><td class="grade">${ev.grade==null?'—':Number(ev.grade).toFixed(1)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Sin evaluaciones.</td></tr>'}</tbody></table></div></div>`;box.scrollIntoView({behavior:'smooth',block:'nearest'})};
}

async function renderTeacherPreview(id){try{const d=await U.api(`/api/admin/preview/teacher/${id}`);S.adminPreview={role:'teacher',user:d.previewUser};previewNav('teacher',d.previewUser);renderTeacherPreviewData(d)}catch(e){U.toast(e.message)}}
function renderTeacherPreviewData(d){
  const first=String(d.previewUser.fullName||'Profesor').trim().split(/\s+/)[0],studentTotal=d.assignments.reduce((n,a)=>n+Number(a.studentCount||0),0),evalTotal=d.assignments.reduce((n,a)=>n+Number(a.evaluationCount||0),0);
  U.setPage('Panel del profesor',`Año escolar ${d.activeYear.year}`,previewActions());
  $('#content').innerHTML=`<div class="welcome"><div><h1>Hola, ${U.esc(first)} 👋</h1><p>Administra tus cursos, evaluaciones y notas.</p></div></div><div class="grid cols-4" style="margin-bottom:24px"><div class="card stat"><span>Clases asignadas</span><strong>${d.assignments.length}</strong></div><div class="card stat"><span>Estudiantes</span><strong>${studentTotal}</strong></div><div class="card stat"><span>Evaluaciones</span><strong>${evalTotal}</strong></div><div class="card stat"><span>Año escolar</span><strong>${d.activeYear.year}</strong></div></div><div style="margin:26px 0 13px"><h3 style="margin:0;font-size:17px">Mis cursos</h3><p class="muted" style="margin:3px 0 0">Selecciona una materia para abrir su libro de notas.</p></div><div class="grid cols-3">${d.assignments.map(a=>`<button class="card course-card" data-preview-class="${a.id}" style="text-align:left;border:1px solid var(--line)"><div><span class="eyebrow">${U.esc(a.courseName)}</span><h2 style="margin-top:7px">${U.esc(a.subjectName)}</h2><p>${a.studentCount} estudiantes · ${a.evaluationCount} evaluaciones</p></div><span class="badge blue">Abrir</span></button>`).join('')||'<div class="card empty">Este profesor no tiene clases asignadas.</div>'}</div>`;
  bindExit();
  $('#content').onclick=e=>{const b=e.target.closest('[data-preview-class]');if(b)renderTeacherClassPreview(d.previewUser.id,Number(b.dataset.previewClass),semNow())};
}

async function renderTeacherClassPreview(teacherId,assignmentId,sem){
  try{
    const d=await U.api(`/api/admin/preview/teacher/${teacherId}/assignments/${assignmentId}`),gm=new Map(d.grades.map(g=>[`${g.evaluationId}-${g.studentId}`,g.grade])),evs=d.evaluations.filter(e=>e.semester===sem),created=evs.reduce((n,e)=>n+Number(e.weight||0),0),done=evs.filter(e=>e.status==='completed').reduce((n,e)=>n+Number(e.weight||0),0);
    const studentAvg=id=>{if(!evs.length||evs.some(e=>e.status!=='completed'))return null;let n=0,w=0;for(const e of evs){const g=gm.get(`${e.id}-${id}`);if(g==null)return null;n+=Number(g)*Number(e.weight);w+=Number(e.weight)}return w?n/w:null};
    U.setPage(`${d.assignment.courseName} · ${d.assignment.subjectName}`,`${d.students.length} estudiantes · ${sem}° semestre`,previewActions('<button id="previewBackTeacher" class="btn ghost">Cambiar materia</button>'));
    $('#content').innerHTML=`<div class="welcome"><div><h1>Libro de notas</h1><p>Vista del profesor en modo solo lectura.</p></div><select id="previewTeacherSemester" class="semester"><option value="1" ${sem===1?'selected':''}>1° semestre</option><option value="2" ${sem===2?'selected':''}>2° semestre</option></select></div><div class="grid cols-4" style="margin-bottom:24px"><div class="card stat"><span>Estudiantes</span><strong>${d.students.length}</strong></div><div class="card stat"><span>Evaluaciones</span><strong>${evs.length}</strong></div><div class="card stat"><span>Ponderación creada</span><strong>${created}%</strong></div><div class="card stat"><span>Estado del semestre</span><strong class="orange" style="font-size:22px">${created>=100&&evs.every(e=>e.status==='completed')?'Completo':'En proceso'}</strong></div></div><div class="panel"><div class="toolbar" style="padding:14px"><input id="previewTeacherSearch" class="search" placeholder="Buscar estudiante por nombre o RUT"><span class="badge warn">Edición deshabilitada</span></div>${!evs.length?'<div class="empty">No hay evaluaciones en este semestre.</div>':`<div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Estudiante</th>${evs.map(e=>`<th>${U.esc(e.name)}<span class="weight">${e.weight}% · ${U.statusLabel[e.status]}</span></th>`).join('')}<th>Promedio</th></tr></thead><tbody>${d.students.map(s=>{const avg=studentAvg(s.id);return `<tr data-preview-teacher-row data-search="${U.esc((s.fullName+' '+U.fmtRut(s.rut)).toLowerCase())}"><td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:30px;height:30px;font-size:11px">${U.esc(U.initials(s.fullName))}</div><div><strong>${U.esc(s.fullName)}</strong><span class="weight">${U.esc(U.fmtRut(s.rut))}</span></div></div></td>${evs.map(e=>`<td class="grade">${gm.get(`${e.id}-${s.id}`)==null?'—':Number(gm.get(`${e.id}-${s.id}`)).toFixed(1)}</td>`).join('')}<td class="grade">${avg==null?'<span class="pending">En proceso</span>':avg.toFixed(1)}</td></tr>`}).join('')}</tbody></table></div>`}</div><p class="muted" style="margin-top:12px">Ponderación realizada: ${done}%.</p>`;
    bindExit();
    $('#previewBackTeacher').onclick=()=>renderTeacherPreview(teacherId);
    $('#previewTeacherSemester').onchange=e=>renderTeacherClassPreview(teacherId,assignmentId,Number(e.target.value));
    $('#previewTeacherSearch').oninput=e=>{const q=String(e.target.value||'').trim().toLowerCase();document.querySelectorAll('[data-preview-teacher-row]').forEach(r=>r.hidden=q&&!String(r.dataset.search||'').includes(q))};
  }catch(e){U.toast(e.message)}
}
})();
