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
  U.setPage('Panel del profesor',`Año escolar ${d.activeYear.year}`);
  $('#content').innerHTML=`
    <div class="welcome">
      <div><h1>Hola, ${U.esc((S.user?.fullName||'Profesor').split(' ')[0])} 👋</h1><p>Administra tus cursos, evaluaciones y notas.</p></div>
    </div>
    <div class="grid cols-4" style="margin-bottom:24px">
      <div class="card stat"><span>Clases asignadas</span><strong>${d.assignments.length}</strong></div>
      <div class="card stat"><span>Estudiantes</span><strong>${studentTotal}</strong></div>
      <div class="card stat"><span>Evaluaciones</span><strong>${evalTotal}</strong></div>
      <div class="card stat"><span>Año escolar</span><strong>${d.activeYear.year}</strong></div>
    </div>
    <div style="margin:26px 0 13px"><h3 style="margin:0;font-size:17px">Mis cursos</h3><p class="muted" style="margin:3px 0 0">Selecciona una materia para abrir su libro de notas.</p></div>
    <div class="grid cols-3">
      ${d.assignments.map(a=>`<button class="card course-card" data-open-class="${a.id}" style="text-align:left;border:1px solid var(--line)">
        <div><span class="eyebrow">${U.esc(a.courseName)}</span><h2 style="margin-top:7px">${U.esc(a.subjectName)}</h2><p>${a.studentCount} estudiantes · ${a.evaluationCount} evaluaciones</p></div>
        <span class="badge blue">Abrir</span>
      </button>`).join('')||'<div class="card empty">Aún no tienes clases asignadas.</div>'}
    </div>`;
  $('#content').onclick=e=>{const b=e.target.closest('[data-open-class]');if(b)U.navigate(`teacher-class-${b.dataset.openClass}`)};
};

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
