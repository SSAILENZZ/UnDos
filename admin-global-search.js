(()=>{
const U=window.U,$=U.$,S=U.state;
const style=document.createElement('style');style.textContent=`
.global-search-top{display:inline-flex;align-items:center;gap:7px}.global-search-top kbd,.global-search-kbd{font:700 9px/1 system-ui;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--surface-soft);color:var(--muted)}
.gs-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px}.gs-head h1{margin:0 0 5px;font-size:30px;letter-spacing:-.8px}.gs-head p{margin:0;color:var(--muted);max-width:720px}.gs-searchbox{position:relative;background:var(--card);border:1px solid var(--line);border-top:3px solid var(--orange);border-radius:18px;padding:18px;box-shadow:var(--shadow-soft);margin-bottom:13px}.gs-searchbox input{width:100%;height:52px;border:1px solid var(--line);border-radius:13px;background:var(--surface-soft);color:var(--text);padding:0 48px 0 17px;font-size:16px;font-weight:750;outline:0}.gs-searchbox input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(7,55,90,.08)}.gs-search-icon{position:absolute;right:34px;top:35px;color:var(--muted);font-size:20px;pointer-events:none}.gs-help{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:9px;color:var(--muted);font-size:10px}.gs-filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}.gs-filter{border:1px solid var(--line);background:var(--card);color:var(--muted);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:850;cursor:pointer}.gs-filter.active{background:var(--blue-soft);border-color:transparent;color:var(--blue)}
.gs-summary{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:3px 0 10px}.gs-summary strong{font-size:13px}.gs-summary span{color:var(--muted);font-size:10px}.gs-group{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--orange);border-radius:17px;overflow:hidden;box-shadow:var(--shadow-soft);margin-bottom:12px}.gs-group-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:13px 15px;border-bottom:1px solid var(--line)}.gs-group-head h2{margin:0;font-size:14px}.gs-group-head span{color:var(--muted);font-size:9px}.gs-result{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 15px;border-bottom:1px solid var(--line)}.gs-result:last-child{border-bottom:0}.gs-result:hover{background:var(--surface-soft)}.gs-result-icon{width:40px;height:40px;border-radius:12px;background:var(--blue-soft);color:var(--blue);display:grid;place-items:center;font-weight:900;font-size:15px}.gs-result-icon.orange{background:var(--orange-soft);color:var(--orange)}.gs-result-icon.green{background:#eaf7f1;color:var(--green)}.gs-result-copy{min-width:0}.gs-result-copy strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gs-result-copy small{display:block;margin-top:4px;color:var(--muted);font-size:9px;line-height:1.35}.gs-result-actions{display:flex;align-items:center;gap:7px}.gs-empty{padding:38px 18px;text-align:center;background:var(--card);border:1px dashed var(--line);border-radius:16px;color:var(--muted)}.gs-empty strong{display:block;color:var(--text);margin-bottom:5px}.gs-loading{padding:28px;text-align:center;color:var(--muted);font-size:11px}.gs-modal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}.gs-modal-stat{border:1px solid var(--line);background:var(--surface-soft);border-radius:11px;padding:10px}.gs-modal-stat span{display:block;color:var(--muted);font-size:8px}.gs-modal-stat strong{display:block;margin-top:4px;font-size:12px}.gs-list{display:grid;gap:7px;margin-top:12px;max-height:250px;overflow:auto}.gs-list-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding:8px 0;font-size:10px}.gs-list-row:last-child{border:0}.global-search-focus{outline:3px solid rgba(235,82,31,.28)!important;outline-offset:3px;animation:gsPulse 1.2s ease 2}@keyframes gsPulse{50%{outline-color:rgba(7,55,90,.35)}}
html[data-theme="dark"] .gs-searchbox,html[data-theme="dark"] .gs-group,html[data-theme="dark"] .gs-filter,html[data-theme="dark"] .gs-empty{background:var(--card)!important;border-color:var(--line)!important}html[data-theme="dark"] .gs-result-icon.green{background:#163126;color:#71d5a7}
@media(max-width:720px){.gs-head{align-items:flex-start;flex-direction:column}.gs-result{grid-template-columns:40px 1fr}.gs-result-actions{grid-column:2}.gs-help{align-items:flex-start;flex-direction:column}.gs-modal-grid{grid-template-columns:1fr}}
`;document.head.appendChild(style);

let filter='all',lastData=null,seq=0,timer=null;
const groupLabel={users:'Usuarios',courses:'Cursos',subjects:'Materias',classes:'Clases'};
function totalVisible(d){if(!d)return 0;return Object.entries(d.groups||{}).filter(([k])=>filter==='all'||k===filter).reduce((n,[,v])=>n+v.length,0)}
function ensureNav(){
  if(S.user?.role!=='admin'||S.adminPreview)return;
  const nav=$('#nav');if(!nav||nav.querySelector('[data-page="admin-search"]'))return;
  const b=document.createElement('button');b.type='button';b.className='nav-btn';b.dataset.page='admin-search';b.innerHTML='<span class="nav-icon">⌕</span><span>Buscar</span>';
  const home=nav.querySelector('[data-page="admin-home"]');home?.after(b);
}
function ensureTop(){
  if(S.user?.role!=='admin'||S.adminPreview)return;
  const a=$('#topActions');if(!a||a.querySelector('#globalSearchQuick'))return;
  const b=document.createElement('button');b.id='globalSearchQuick';b.type='button';b.className='btn ghost global-search-top';b.innerHTML='<span>⌕ Buscar</span><kbd>Ctrl K</kbd>';b.onclick=()=>openSearch();a.appendChild(b);
}
function openSearch(query=''){
  if(S.user?.role!=='admin'||S.adminPreview)return;
  if(query)S.adminGlobalSearchQuery=query;
  U.navigate('admin-search').then(()=>setTimeout(()=>$('#adminGlobalSearchInput')?.focus(),20));
}
function highlightAfterNavigate(page,text,kind){
  U.closeModal();U.navigate(page).then(()=>setTimeout(()=>{
    const all=[...document.querySelectorAll('#content .card,#content .course-card,#content tbody tr')];
    const el=all.find(x=>String(x.textContent||'').toLowerCase().includes(String(text||'').toLowerCase()));
    if(el){el.classList.add('global-search-focus');el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.classList.remove('global-search-focus'),2800)}
    else U.toast(`Abierto en ${kind}`);
  },80));
}
function openUserInAdmin(user){
  U.closeModal();U.navigate('admin-users').then(()=>setTimeout(()=>{
    const input=document.querySelector('#content input.search');
    if(input){input.value=user.rut||user.fullName;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}
  },80));
}
async function quickUser(user){
  try{
    if(user.role==='student'){
      U.openModal('Perfil del estudiante','<div class="gs-loading">Cargando perfil…</div>');
      const d=await U.api(`/api/admin/preview/student/${user.id}/profile`),cur=d.current,att=cur?.attendance||{};
      $('#modalBody').innerHTML=`<div class="modal-body"><div><strong style="font-size:16px">${U.esc(d.user.fullName)}</strong><div class="muted" style="margin-top:3px">${U.esc(U.fmtRut(d.user.rut))}</div></div><div class="gs-modal-grid"><div class="gs-modal-stat"><span>Curso actual</span><strong>${U.esc(cur?.course?.name||'Sin curso')}</strong></div><div class="gs-modal-stat"><span>Asistencia</span><strong>${att.percentage==null?'—':`${Number(att.percentage).toFixed(1)}%`}</strong></div><div class="gs-modal-stat"><span>Materias</span><strong>${cur?.subjects?.length||0}</strong></div><div class="gs-modal-stat"><span>Años registrados</span><strong>${d.years?.length||0}</strong></div></div><div class="form-actions"><button id="gsUserAdmin" class="btn secondary">Abrir en Usuarios</button><button id="gsUserClose" class="btn ghost">Cerrar</button></div></div>`;
      $('#gsUserAdmin').onclick=()=>openUserInAdmin(user);$('#gsUserClose').onclick=U.closeModal;
    }else{
      U.openModal('Profesor','<div class="gs-loading">Cargando información…</div>');
      const d=await U.api(`/api/admin/preview/teacher/${user.id}`);
      $('#modalBody').innerHTML=`<div class="modal-body"><div><strong style="font-size:16px">${U.esc(d.previewUser.fullName)}</strong><div class="muted" style="margin-top:3px">${U.esc(U.fmtRut(d.previewUser.rut))}</div></div><div class="gs-modal-grid"><div class="gs-modal-stat"><span>Clases asignadas</span><strong>${d.assignments.length}</strong></div><div class="gs-modal-stat"><span>Año escolar</span><strong>${d.activeYear.year}</strong></div></div><div class="gs-list">${d.assignments.slice(0,8).map(a=>`<div class="gs-list-row"><span>${U.esc(a.courseName)} · ${U.esc(a.subjectName)}</span><strong>${a.studentCount} est.</strong></div>`).join('')||'<span class="muted">Sin clases asignadas.</span>'}</div><div class="form-actions"><button id="gsUserAdmin" class="btn secondary">Abrir en Usuarios</button><button id="gsUserClose" class="btn ghost">Cerrar</button></div></div>`;
      $('#gsUserAdmin').onclick=()=>openUserInAdmin(user);$('#gsUserClose').onclick=U.closeModal;
    }
  }catch(e){U.toast(e.message);U.closeModal()}
}
function quickCourse(c){U.openModal('Curso',`<div><strong style="font-size:16px">${U.esc(c.name)}</strong><p class="muted">Año escolar actual</p><div class="gs-modal-grid"><div class="gs-modal-stat"><span>Estudiantes</span><strong>${c.studentCount}</strong></div><div class="gs-modal-stat"><span>Clases asignadas</span><strong>${c.assignmentCount}</strong></div><div class="gs-modal-stat"><span>Estado</span><strong>${c.active?'Activo':'Archivado'}</strong></div></div><div class="form-actions"><button id="gsOpenCourse" class="btn primary">Abrir Cursos</button><button id="gsCloseCourse" class="btn ghost">Cerrar</button></div></div>`);$('#gsOpenCourse').onclick=()=>highlightAfterNavigate('admin-courses',c.name,'Cursos');$('#gsCloseCourse').onclick=U.closeModal}
function quickSubject(s){U.openModal('Materia',`<div><strong style="font-size:16px">${U.esc(s.name)}</strong><p class="muted">Asignatura disponible en UnDos.</p><div class="gs-modal-grid"><div class="gs-modal-stat"><span>Clases activas</span><strong>${s.assignmentCount}</strong></div><div class="gs-modal-stat"><span>Profesores</span><strong>${s.teacherCount}</strong></div><div class="gs-modal-stat"><span>Estado</span><strong>${s.active?'Activa':'Inactiva'}</strong></div></div><div class="form-actions"><button id="gsOpenSubject" class="btn primary">Abrir Materias</button><button id="gsCloseSubject" class="btn ghost">Cerrar</button></div></div>`);$('#gsOpenSubject').onclick=()=>highlightAfterNavigate('admin-subjects',s.name,'Materias');$('#gsCloseSubject').onclick=U.closeModal}
function quickClass(a){U.openModal('Clase',`<div><strong style="font-size:16px">${U.esc(a.courseName)} · ${U.esc(a.subjectName)}</strong><p class="muted">Prof. ${U.esc(a.teacherName)}</p><div class="gs-modal-grid"><div class="gs-modal-stat"><span>Estudiantes</span><strong>${a.studentCount}</strong></div><div class="gs-modal-stat"><span>Evaluaciones</span><strong>${a.evaluationCount}</strong></div></div><div class="form-actions"><button id="gsOpenClass" class="btn primary">Abrir Cursos</button><button id="gsCloseClass" class="btn ghost">Cerrar</button></div></div>`);$('#gsOpenClass').onclick=()=>highlightAfterNavigate('admin-courses',`${a.courseName} ${a.subjectName}`,'Cursos');$('#gsCloseClass').onclick=U.closeModal}
function openResult(kind,id){if(!lastData)return;const x=(lastData.groups[kind]||[]).find(v=>Number(v.id)===Number(id));if(!x)return;if(kind==='users')quickUser(x);else if(kind==='courses')quickCourse(x);else if(kind==='subjects')quickSubject(x);else quickClass(x)}
function resultRow(kind,x){
  if(kind==='users'){const role=x.role==='student'?'Estudiante':'Profesor',meta=[U.fmtRut(x.rut),role,x.courseName].filter(Boolean).join(' · ');return `<div class="gs-result"><div class="gs-result-icon ${x.role==='student'?'green':'orange'}">${x.role==='student'?'E':'P'}</div><div class="gs-result-copy"><strong>${U.esc(x.fullName)}</strong><small>${U.esc(meta)} · ${x.active?'Activo':'Inactivo'}</small></div><div class="gs-result-actions"><button class="btn small secondary" data-gs-open="users:${x.id}">${x.role==='student'?'Ver perfil':'Ver profesor'}</button></div></div>`}
  if(kind==='courses')return `<div class="gs-result"><div class="gs-result-icon">▤</div><div class="gs-result-copy"><strong>${U.esc(x.name)}</strong><small>${x.studentCount} estudiantes · ${x.assignmentCount} clases asignadas · ${x.active?'Activo':'Archivado'}</small></div><div class="gs-result-actions"><button class="btn small secondary" data-gs-open="courses:${x.id}">Abrir</button></div></div>`;
  if(kind==='subjects')return `<div class="gs-result"><div class="gs-result-icon orange">▦</div><div class="gs-result-copy"><strong>${U.esc(x.name)}</strong><small>${x.assignmentCount} clases · ${x.teacherCount} profesores · ${x.active?'Activa':'Inactiva'}</small></div><div class="gs-result-actions"><button class="btn small secondary" data-gs-open="subjects:${x.id}">Abrir</button></div></div>`;
  return `<div class="gs-result"><div class="gs-result-icon green">▥</div><div class="gs-result-copy"><strong>${U.esc(x.courseName)} · ${U.esc(x.subjectName)}</strong><small>Prof. ${U.esc(x.teacherName)} · ${x.studentCount} estudiantes · ${x.evaluationCount} evaluaciones</small></div><div class="gs-result-actions"><button class="btn small secondary" data-gs-open="classes:${x.id}">Abrir</button></div></div>`;
}
function renderResults(d){
  lastData=d;const box=$('#adminGlobalSearchResults');if(!box)return;
  if(!d.query||d.query.length<2){box.innerHTML='<div class="gs-empty"><strong>Busca en todo UnDos</strong>Escribe al menos 2 caracteres. Puedes buscar por nombre, RUT, curso, materia o profesor.</div>';return}
  const keys=['users','courses','subjects','classes'].filter(k=>filter==='all'||filter===k),visible=totalVisible(d);
  if(!visible){box.innerHTML=`<div class="gs-empty"><strong>Sin resultados</strong>No encontramos coincidencias para “${U.esc(d.query)}”.</div>`;return}
  box.innerHTML=`<div class="gs-summary"><strong>${visible} resultado${visible===1?'':'s'}</strong><span>Año escolar ${d.activeYear.year}</span></div>`+keys.filter(k=>d.groups[k]?.length).map(k=>`<section class="gs-group"><div class="gs-group-head"><h2>${groupLabel[k]}</h2><span>${d.groups[k].length}</span></div>${d.groups[k].map(x=>resultRow(k,x)).join('')}</section>`).join('');
}
async function runSearch(q){
  const n=++seq,box=$('#adminGlobalSearchResults');if(q.trim().length<2){renderResults({query:q,activeYear:S.admin?.activeYear||{year:''},groups:{users:[],courses:[],subjects:[],classes:[]}});return}
  if(box)box.innerHTML='<div class="gs-loading">Buscando en UnDos…</div>';
  try{const d=await U.api(`/api/admin/search?q=${encodeURIComponent(q.trim())}`);if(n!==seq)return;S.adminGlobalSearchQuery=q;renderResults(d)}catch(e){if(n!==seq)return;if(box)box.innerHTML=`<div class="gs-empty"><strong>No se pudo buscar</strong>${U.esc(e.message)}</div>`}
}
function scheduleSearch(q){clearTimeout(timer);timer=setTimeout(()=>runSearch(q),180)}
U.renderAdminGlobalSearch=async()=>{
  const d=S.admin||await U.api('/api/admin/overview');S.admin=d;
  U.setPage('Buscar',`Año escolar ${d.activeYear.year}`,'');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page==='admin-search'));
  const initial=String(S.adminGlobalSearchQuery||'');
  $('#content').innerHTML=`<div class="gs-head"><div><span class="eyebrow">Buscador global</span><h1>Encuentra cualquier cosa</h1><p>Busca estudiantes, profesores, RUT, cursos, materias y clases desde un solo lugar.</p></div><span class="global-search-kbd">Ctrl / ⌘ + K</span></div><div class="gs-searchbox"><input id="adminGlobalSearchInput" autocomplete="off" placeholder="Ej: Camila, 12.345.678-5, 3° Medio, Matemática…" value="${U.esc(initial)}"><span class="gs-search-icon">⌕</span><div class="gs-help"><span>Los resultados se limitan al año escolar activo cuando corresponde.</span><span>Busca por nombre, RUT, curso, materia o profesor.</span></div></div><div class="gs-filters"><button class="gs-filter active" data-gs-filter="all">Todo</button><button class="gs-filter" data-gs-filter="users">Usuarios</button><button class="gs-filter" data-gs-filter="courses">Cursos</button><button class="gs-filter" data-gs-filter="subjects">Materias</button><button class="gs-filter" data-gs-filter="classes">Clases</button></div><div id="adminGlobalSearchResults"></div>`;
  const input=$('#adminGlobalSearchInput');input.oninput=e=>scheduleSearch(e.target.value);input.onkeydown=e=>{if(e.key==='Enter'&&lastData){const keys=['users','courses','subjects','classes'];for(const k of keys){if(filter!=='all'&&filter!==k)continue;const x=lastData.groups[k]?.[0];if(x){e.preventDefault();openResult(k,x.id);break}}}};
  $('#content').onclick=e=>{const f=e.target.closest('[data-gs-filter]'),o=e.target.closest('[data-gs-open]');if(f){filter=f.dataset.gsFilter;document.querySelectorAll('.gs-filter').forEach(b=>b.classList.toggle('active',b===f));if(lastData)renderResults(lastData)}if(o){const [k,id]=o.dataset.gsOpen.split(':');openResult(k,Number(id))}};
  if(initial.length>=2)await runSearch(initial);else renderResults({query:'',activeYear:d.activeYear,groups:{users:[],courses:[],subjects:[],classes:[]}});
  setTimeout(()=>input.focus(),30);
};

const shellBase=U.renderShell;U.renderShell=()=>{shellBase();ensureNav();setTimeout(ensureTop,0)};
const navBase=U.navigate;U.navigate=async page=>{if(page!=='admin-search')return navBase(page);S.page=page;const c=$('#content');if(c)c.innerHTML='<div class="card empty">Cargando buscador…</div>';try{return await U.renderAdminGlobalSearch()}catch(e){if(c)c.innerHTML=`<div class="card"><h2>No se pudo abrir el buscador</h2><p class="form-error">${U.esc(e.message)}</p><button id="retryGlobalSearch" class="btn ghost">Reintentar</button></div>`;const r=$('#retryGlobalSearch');if(r)r.onclick=()=>U.navigate('admin-search')}};
const setPageBase=U.setPage;U.setPage=(...args)=>{const out=setPageBase(...args);setTimeout(ensureTop,0);return out};
const top=$('#topActions');if(top)new MutationObserver(()=>setTimeout(ensureTop,0)).observe(top,{childList:true});
const nav=$('#nav');if(nav)new MutationObserver(()=>setTimeout(ensureNav,0)).observe(nav,{childList:true});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'&&S.user?.role==='admin'&&!S.adminPreview){e.preventDefault();openSearch()}});
setTimeout(()=>{ensureNav();ensureTop()},0);
})();
