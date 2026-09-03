(()=>{const U=window.U,$=U.$,S=U.state;
const pendingFor=(subject,sem)=>subject.evaluations.filter(e=>e.semester===sem&&(e.status==='pending'||e.grade==null)).length;
const semAverage=(subject,sem)=>U.gradeText(subject.summary.semesters[sem]);
const semesterLabel=sem=>`${sem}° semestre`;

function renderSubjectDetail(id){
  const d=S.student,sem=S.studentSemester||2,subject=d?.subjects.find(s=>s.id===id),box=$('#studentSubjectDetail');
  if(!subject||!box)return;
  const evs=subject.evaluations.filter(e=>e.semester===sem);
  box.innerHTML=`<div class="student-detail"><div class="student-detail-head"><div><h3>${U.esc(subject.name)}</h3><p>${U.esc(subject.teacherName||'Profesor por asignar')} · ${semesterLabel(sem)}</p></div><span class="badge blue">Promedio: ${semAverage(subject,sem)}</span></div><div class="table-wrap" style="border:0;border-radius:0"><table><thead><tr><th>Evaluación</th><th>Fecha</th><th>Ponderación</th><th>Estado</th><th>Nota</th></tr></thead><tbody>${evs.map(e=>`<tr><td><strong>${U.esc(e.name)}</strong></td><td>${U.fmtDate(e.date)}</td><td>${e.weight}%</td><td><span class="badge ${e.status==='completed'?'ok':'warn'}">${U.statusLabel[e.status]}</span></td><td class="grade">${e.grade==null?'—':Number(e.grade).toFixed(1)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Todavía no hay evaluaciones en este semestre.</td></tr>'}</tbody></table></div></div>`;
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function renderDashboard(d,sem=2){
  S.student=d;S.studentSemester=sem;
  const user=S.user||{},first=String(user.fullName||'Estudiante').trim().split(/\s+/)[0];
  U.setPage('Panel del estudiante',`Año escolar ${d.activeYear.year}`,`<select id="studentSemester" class="semester" aria-label="Semestre"><option value="1" ${sem===1?'selected':''}>1° semestre</option><option value="2" ${sem===2?'selected':''}>2° semestre</option></select>`);
  if(!d.course){$('#content').innerHTML=`<div class="student-head"><div><h1>Hola, ${U.esc(first)} 👋</h1><p>Aquí podrás revisar tus materias, evaluaciones y notas.</p></div></div><div class="card empty">Todavía no tienes un curso asignado para el año académico activo.</div>`;const sel=$('#studentSemester');if(sel)sel.onchange=()=>renderDashboard(d,Number(sel.value));return}
  const pending=d.subjects.reduce((n,s)=>n+pendingFor(s,sem),0);
  $('#content').innerHTML=`
    <div class="student-head">
      <div><h1>Hola, ${U.esc(first)} 👋</h1><p>Aquí puedes revisar tus materias, evaluaciones y notas.</p></div>
    </div>
    <div class="student-stats">
      <div class="student-stat"><span>Curso</span><strong>${U.esc(d.course.name)}</strong></div>
      <div class="student-stat"><span>Materias</span><strong>${d.subjects.length}</strong></div>
      <div class="student-stat"><span>Evaluaciones pendientes</span><strong class="${pending?'pending-number':''}">${pending}</strong></div>
      <div class="student-stat"><span>Promedio general anual</span><strong>${U.gradeText(d.overall)}</strong></div>
    </div>
    <div class="student-section-head"><div><h2>Mis materias</h2><p>Selecciona una materia para ver sus evaluaciones de ${semesterLabel(sem).toLowerCase()}.</p></div></div>
    <div class="student-subject-grid">
      ${d.subjects.map(s=>{const p=pendingFor(s,sem);return `<button class="student-subject-card" type="button" data-subject="${s.id}"><h3>${U.esc(s.name)}</h3><span class="teacher">Prof. ${U.esc(s.teacherName||'Por asignar')}</span><div class="student-subject-bottom"><div class="avg"><small>Promedio</small><strong>${semAverage(s,sem)}</strong></div>${p?`<span class="badge warn">${p} pendiente${p===1?'':'s'}</span>`:'<span class="badge ok">Al día</span>'}</div></button>`}).join('')||'<div class="card empty">Todavía no hay materias asociadas a tu curso.</div>'}
    </div>
    <div id="studentSubjectDetail"></div>`;
  const sel=$('#studentSemester');if(sel)sel.onchange=()=>renderDashboard(d,Number(sel.value));
  $('#content').onclick=e=>{const card=e.target.closest('[data-subject]');if(card)renderSubjectDetail(Number(card.dataset.subject))};
}

U.renderStudentHome=async()=>{const d=await U.api('/api/student/dashboard');renderDashboard(d,2)};
})();
