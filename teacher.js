(()=>{
const U=window.U,$=U.$,S=U.state;
const currentSemester=()=>new Date().getMonth()+1>=7?2:1;
const sumWeight=(evs,completedOnly=false)=>evs.filter(e=>!completedOnly||e.status==='completed').reduce((n,e)=>n+Number(e.weight||0),0);
const studentAverage=(studentId,evs,gm)=>{
  if(!evs.length||evs.some(e=>e.status!=='completed')) return null;
  let weighted=0,total=0;
  for(const e of evs){
    const g=gm.get(`${e.id}-${studentId}`);
    if(g===undefined||g===null||g==='') return null;
    weighted+=Number(g)*Number(e.weight);
    total+=Number(e.weight);
  }
  return total?weighted/total:null;
};

U.renderTeacherHome=async()=>{
  const d=await U.api('/api/teacher/assignments');
  S.teacher=d;
  const studentTotal=d.assignments.reduce((n,a)=>n+Number(a.studentCount||0),0);
  const evalTotal=d.assignments.reduce((n,a)=>n+Number(a.evaluationCount||0),0);
  const courseTotal=new Set(d.assignments.map(a=>a.courseName)).size;
  const subjectTotal=new Set(d.assignments.map(a=>a.subjectName)).size;
  U.setPage('Panel del profesor',`Año escolar ${d.activeYear.year}`,'<button id="addTeacherClass" class="btn primary">+ Agregar curso / materia</button>');
  $('#content').innerHTML=`
    <section class="teacher-hero">
      <div class="teacher-hero-copy">
        <span class="teacher-kicker">Tu espacio docente</span>
        <h1>Hola, ${U.esc((S.user?.fullName||'Profesor').split(' ')[0])} 👋</h1>
        <p>Organiza tus cursos, materias, evaluaciones y notas desde un solo lugar.</p>
      </div>
      <button id="teacherHeroAdd" type="button" class="teacher-add-card">
        <span class="teacher-add-icon">+</span>
        <span><strong>Agregar curso y materia</strong><small>Elige entre los cursos y asignaturas disponibles</small></span>
        <span class="teacher-add-arrow">→</span>
      </button>
    </section>

    <div class="teacher-stat-grid">
      <div class="teacher-stat-card"><span class="teacher-stat-icon">▤</span><div><small>Clases asignadas</small><strong>${d.assignments.length}</strong></div></div>
      <div class="teacher-stat-card"><span class="teacher-stat-icon">◎</span><div><small>Cursos</small><strong>${courseTotal}</strong></div></div>
      <div class="teacher-stat-card"><span class="teacher-stat-icon orange">▦</span><div><small>Materias</small><strong>${subjectTotal}</strong></div></div>
      <div class="teacher-stat-card"><span class="teacher-stat-icon green">✓</span><div><small>Evaluaciones</small><strong>${evalTotal}</strong></div></div>
    </div>

    <div class="teacher-section-head">
      <div><span class="eyebrow">Organización</span><h2>Mis cursos y materias</h2><p>Selecciona una clase para abrir el libro de notas.</p></div>
      <span class="teacher-student-count">${studentTotal} estudiantes vinculados</span>
    </div>

    <div class="teacher-course-grid">
      ${d.assignments.map((a,i)=>`<button type="button" class="teacher-course-card" data-open-class="${a.id}">
        <span class="teacher-course-accent accent-${i%3}"></span>
        <div class="teacher-course-top"><span class="teacher-course-pill">${U.esc(a.courseName)}</span><span class="teacher-course-open">Abrir →</span></div>
        <h3>${U.esc(a.subjectName)}</h3>
        <div class="teacher-course-meta"><span><b>${a.studentCount}</b> estudiantes</span><span><b>${a.evaluationCount}</b> evaluaciones</span></div>
      </button>`).join('')||`<div class="teacher-empty-state"><div class="teacher-empty-icon">▤</div><h3>Aún no tienes cursos agregados</h3><p>Agrega una combinación de curso y materia para comenzar a trabajar con tu libro de notas.</p><button id="teacherEmptyAdd" type="button" class="btn primary">+ Agregar mi primera clase</button></div>`}
    </div>`;

  const openManager=()=>openAddClass();
  $('#addTeacherClass').onclick=openManager;
  $('#teacherHeroAdd').onclick=openManager;
  const empty=$('#teacherEmptyAdd');if(empty)empty.onclick=openManager;
  $('#content').onclick=e=>{const b=e.target.closest('[data-open-class]');if(b)U.navigate(`teacher-class-${b.dataset.openClass}`)};
};

async function openAddClass(){
  U.openModal('Agregar curso y materia','<div id="teacherCatalogLoading" class="teacher-catalog-loading"><div class="teacher-loader"></div><strong>Cargando opciones…</strong><span>Buscando cursos y materias disponibles.</span></div>');
  try{
    const d=await U.api('/api/teacher/catalog');
    const body=$('#modalBody');if(!body)return;
    if(!d.courses.length||!d.subjects.length){
      body.innerHTML='<div class="modal-body"><div class="teacher-catalog-empty"><strong>No hay opciones disponibles</strong><p>El administrador debe crear al menos un curso y una materia activos para el año actual.</p><button type="button" class="btn ghost" data-close>Cerrar</button></div></div>';
      const c=$('[data-close]');if(c)c.onclick=U.closeModal;return;
    }
    const assigned=new Set(d.assigned.map(x=>`${x.courseId}-${x.subjectId}`));
    body.innerHTML=`<div class="modal-body"><form id="teacherAddClassForm" class="stack teacher-add-form">
      <div class="teacher-manager-intro"><span class="teacher-manager-icon">▤</span><div><strong>Organiza tus clases</strong><p>Selecciona un curso y la materia que impartes. Solo se muestran opciones activas del año ${d.activeYear.year}.</p></div></div>
      <div class="form-grid">
        <div class="field"><label>Curso</label><select name="courseId" id="teacherCourseSelect" required>${d.courses.map(c=>`<option value="${c.id}">${U.esc(c.name)} · ${c.studentCount} estudiantes</option>`).join('')}</select></div>
        <div class="field"><label>Materia</label><select name="subjectId" id="teacherSubjectSelect" required>${d.subjects.map(s=>`<option value="${s.id}">${U.esc(s.name)}</option>`).join('')}</select></div>
      </div>
      <div id="teacherSelectionPreview" class="teacher-selection-preview"></div>
      <div class="teacher-manager-note"><span>i</span><p>Esto agrega la combinación a <b>tus clases</b>. La creación de cursos o materias nuevas para todo el liceo sigue estando a cargo de administración.</p></div>
      <div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button id="teacherAddSubmit" class="btn primary">Agregar a mis clases</button></div>
    </form></div>`;
    const f=$('#teacherAddClassForm'),cs=$('#teacherCourseSelect'),ss=$('#teacherSubjectSelect'),preview=$('#teacherSelectionPreview'),submit=$('#teacherAddSubmit');
    const refresh=()=>{
      const c=d.courses.find(x=>x.id===Number(cs.value)),s=d.subjects.find(x=>x.id===Number(ss.value)),exists=assigned.has(`${c?.id}-${s?.id}`);
      preview.innerHTML=`<div><small>Se agregará</small><strong>${U.esc(c?.name||'Curso')} · ${U.esc(s?.name||'Materia')}</strong></div><span class="badge ${exists?'warn':'blue'}">${exists?'Ya está en tus clases':'Disponible'}</span>`;
      submit.textContent=exists?'Abrir clase existente':'Agregar a mis clases';
    };
    cs.onchange=refresh;ss.onchange=refresh;refresh();
    f.onsubmit=async e=>{
      e.preventDefault();const courseId=Number(cs.value),subjectId=Number(ss.value),wasAssigned=assigned.has(`${courseId}-${subjectId}`),old=submit.textContent;
      submit.disabled=true;submit.textContent=wasAssigned?'Abriendo…':'Agregando…';
      try{
        await U.api('/api/teacher/assignments',{method:'POST',body:{courseId,subjectId}});
        U.closeModal();U.toast(wasAssigned?'La clase ya estaba agregada':'Curso y materia agregados');await U.renderTeacherHome();
      }catch(err){U.toast(err.message);submit.disabled=false;submit.textContent=old}
    };
    const close=$('[data-close]');if(close)close.onclick=U.closeModal;
  }catch(err){
    const body=$('#modalBody');if(body)body.innerHTML=`<div class="modal-body"><div class="teacher-catalog-empty"><strong>No se pudieron cargar las opciones</strong><p>${U.esc(err.message)}</p><button type="button" class="btn ghost" data-close>Cerrar</button></div></div>`;
    const c=$('[data-close]');if(c)c.onclick=U.closeModal;
  }
}

U.renderTeacherClass=async id=>{
  const d=await U.api(`/api/teacher/assignments/${id}`);
  S.currentAssignment=d;
  const sem=Number(S.teacherSemester||currentSemester());
  S.teacherSemester=sem;
  const gm=new Map(d.grades.map(g=>[`${g.evaluationId}-${g.studentId}`,g.grade]));
  const evs=d.evaluations.filter(e=>e.semester===sem);
  const createdWeight=sumWeight(evs);
  const completedWeight=sumWeight(evs,true);
  const semesterDone=evs.length>0&&createdWeight>=99.999&&evs.every(e=>e.status==='completed');
  U.setPage(`${d.assignment.courseName} · ${d.assignment.subjectName}`,`${d.students.length} estudiantes · ${sem}° semestre`,
    '<button id="backClasses" class="btn ghost">Cambiar materia</button><button id="newEval" class="btn primary">+ Nueva evaluación</button>');
  $('#content').innerHTML=`
    <div class="welcome">
      <div><h1>Libro de notas</h1><p>Edita evaluaciones y registra notas directamente desde el curso.</p></div>
      <select id="teacherSemester" class="semester" aria-label="Semestre"><option value="1" ${sem===1?'selected':''}>1° semestre</option><option value="2" ${sem===2?'selected':''}>2° semestre</option></select>
    </div>
    <div class="grid cols-4" style="margin-bottom:24px">
      <div class="card stat"><span>Estudiantes</span><strong>${d.students.length}</strong></div>
      <div class="card stat"><span>Evaluaciones</span><strong>${evs.length}</strong></div>
      <div class="card stat"><span>Ponderación creada</span><strong>${createdWeight.toFixed(createdWeight%1?1:0)}%</strong></div>
      <div class="card stat"><span>Estado del semestre</span><strong class="${semesterDone?'':'orange'}" style="font-size:22px">${semesterDone?'Completo':'En proceso'}</strong></div>
    </div>
    <div class="panel">
      <div class="toolbar" style="padding:14px">
        <input id="studentSearch" class="search" placeholder="Buscar estudiante por nombre o RUT">
        <div class="group"><button id="editEvaluations" class="btn secondary">Editar evaluaciones</button><button id="saveAllGrades" class="btn primary">Guardar cambios</button></div>
      </div>
      <div id="gradeTable">${gradeTable(d,sem,gm)}</div>
    </div>
    <p class="muted" style="margin-top:12px">Ponderación realizada: ${completedWeight.toFixed(completedWeight%1?1:0)}% · Las ponderaciones creadas no pueden superar 100%.</p>`;

  $('#backClasses').onclick=()=>U.navigate('teacher-home');
  $('#newEval').onclick=newEval;
  $('#teacherSemester').onchange=e=>{S.teacherSemester=Number(e.target.value);U.renderTeacherClass(id)};
  $('#studentSearch').oninput=filterStudents;
  $('#editEvaluations').onclick=openEvaluationList;
  $('#saveAllGrades').onclick=saveAllGrades;
  $('#gradeTable').onclick=e=>{const b=e.target.closest('[data-edit-eval]');if(b)editEval(Number(b.dataset.editEval))};
  $('#gradeTable').oninput=e=>{if(e.target.matches('.grade-input'))refreshAverages(evs)};
};

function gradeTable(d,sem,gm){
  const evs=d.evaluations.filter(e=>e.semester===sem);
  if(!evs.length)return '<div class="empty">No hay evaluaciones en este semestre. Crea la primera con “Nueva evaluación”.</div>';
  return `<div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Estudiante</th>${evs.map(e=>`<th><button class="eval-head" data-edit-eval="${e.id}" title="Editar evaluación" style="border:0;background:transparent;padding:0;text-align:left;color:inherit;font-weight:inherit"><span>${U.esc(e.name)}</span><span class="weight">${e.weight}% · ${U.statusLabel[e.status]}</span></button></th>`).join('')}<th>Promedio</th></tr></thead><tbody>${d.students.map(s=>{const avg=studentAverage(s.id,evs,gm);return `<tr data-student-row data-search="${U.esc((s.fullName+' '+U.fmtRut(s.rut)).toLowerCase())}"><td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:30px;height:30px;font-size:11px">${U.esc(U.initials(s.fullName))}</div><div><strong>${U.esc(s.fullName)}</strong><span class="weight">${U.esc(U.fmtRut(s.rut))}</span></div></div></td>${evs.map(e=>`<td><input class="grade-input" data-eval="${e.id}" data-student="${s.id}" type="number" min="2" max="7" step="0.1" value="${gm.get(`${e.id}-${s.id}`)??''}" placeholder="—"></td>`).join('')}<td class="grade row-average" data-average-student="${s.id}">${avg==null?'<span class="pending">En proceso</span>':avg.toFixed(1)}</td></tr>`}).join('')}</tbody></table></div>`;
}

function filterStudents(e){
  const q=String(e.target.value||'').trim().toLowerCase();
  document.querySelectorAll('[data-student-row]').forEach(r=>r.hidden=q&&!String(r.dataset.search||'').includes(q));
}

function refreshAverages(evs){
  const gm=new Map();
  document.querySelectorAll('.grade-input').forEach(i=>gm.set(`${i.dataset.eval}-${i.dataset.student}`,i.value===''?null:Number(i.value)));
  document.querySelectorAll('[data-average-student]').forEach(td=>{
    const avg=studentAverage(Number(td.dataset.averageStudent),evs,gm);
    td.innerHTML=avg==null?'<span class="pending">En proceso</span>':avg.toFixed(1);
  });
}

function openEvaluationList(){
  const d=S.currentAssignment,sem=Number(S.teacherSemester||currentSemester()),evs=d.evaluations.filter(e=>e.semester===sem);
  if(!evs.length){U.toast('No hay evaluaciones para editar');return;}
  U.openModal('Editar evaluaciones',`<div class="stack">${evs.map(e=>`<button type="button" class="btn secondary" data-pick-eval="${e.id}" style="display:flex;justify-content:space-between;align-items:center"><span>${U.esc(e.name)}</span><span>${e.weight}% · ${U.statusLabel[e.status]}</span></button>`).join('')}</div>`);
  $('#modalBody').onclick=e=>{const b=e.target.closest('[data-pick-eval]');if(b){U.closeModal();setTimeout(()=>editEval(Number(b.dataset.pickEval)),0)}};
}

function evalForm(e=null){return `<form id="evalForm" class="stack"><div class="field"><label>Nombre</label><input name="name" value="${U.esc(e?.name||'')}" placeholder="Ej: Prueba Unidad 1" required></div><div class="form-grid"><div class="field"><label>Semestre</label><select name="semester"><option value="1" ${e?.semester===1?'selected':''}>1° semestre</option><option value="2" ${e?.semester===2?'selected':''}>2° semestre</option></select></div><div class="field"><label>Ponderación (%)</label><input name="weight" type="number" min="1" max="100" step="0.01" value="${e?.weight??''}" required></div></div><div class="form-grid"><div class="field"><label>Fecha</label><input name="date" type="date" value="${e?.date?String(e.date).slice(0,10):''}"></div><div class="field"><label>Estado</label><select name="status"><option value="pending" ${!e||e.status==='pending'?'selected':''}>Pendiente</option><option value="completed" ${e?.status==='completed'?'selected':''}>Realizada</option></select></div></div><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Guardar</button></div></form>`}

function newEval(){
  U.openModal('Nueva evaluación',evalForm({semester:Number(S.teacherSemester||currentSemester()),status:'pending'}));
  const f=$('#evalForm');
  f.onsubmit=async e=>{e.preventDefault();const x=new FormData(f);try{await U.api(`/api/teacher/assignments/${S.currentAssignment.assignment.id}/evaluations`,{method:'POST',body:{name:x.get('name'),semester:Number(x.get('semester')),weight:Number(x.get('weight')),date:x.get('date')||null,status:x.get('status')}});U.closeModal();U.toast('Evaluación creada');await U.renderTeacherClass(S.currentAssignment.assignment.id)}catch(err){U.toast(err.message)}};
  $('[data-close]').onclick=U.closeModal;
}

function editEval(id){
  const ev=S.currentAssignment.evaluations.find(x=>x.id===id);if(!ev)return;
  U.openModal('Editar evaluación',evalForm(ev));
  const f=$('#evalForm');
  f.onsubmit=async e=>{e.preventDefault();const x=new FormData(f);try{await U.api(`/api/teacher/evaluations/${id}`,{method:'PATCH',body:{name:x.get('name'),semester:Number(x.get('semester')),weight:Number(x.get('weight')),date:x.get('date')||null,status:x.get('status')}});U.closeModal();U.toast('Evaluación actualizada');await U.renderTeacherClass(S.currentAssignment.assignment.id)}catch(err){U.toast(err.message)}};
  $('[data-close]').onclick=U.closeModal;
}

async function saveAllGrades(){
  const d=S.currentAssignment,sem=Number(S.teacherSemester||currentSemester()),evs=d.evaluations.filter(e=>e.semester===sem),btn=$('#saveAllGrades');
  if(!evs.length){U.toast('No hay evaluaciones para guardar');return;}
  const old=btn.textContent;btn.disabled=true;btn.textContent='Guardando…';
  try{
    for(const ev of evs){
      const grades=[...document.querySelectorAll(`input[data-eval="${ev.id}"]`)].map(i=>({studentId:Number(i.dataset.student),grade:i.value===''?null:Number(i.value)}));
      await U.api(`/api/teacher/evaluations/${ev.id}/grades`,{method:'POST',body:{grades}});
    }
    U.toast('Cambios guardados');
    await U.renderTeacherClass(d.assignment.id);
  }catch(err){U.toast(err.message)}finally{if(btn?.isConnected){btn.disabled=false;btn.textContent=old}}
}
})();
