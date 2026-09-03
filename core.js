window.U={};const U=window.U;
U.$=s=>document.querySelector(s);
U.state={user:null,admin:null,teacher:null,currentAssignment:null,page:null,adminPreview:null,sessionExpired:false};
U.roleLabel={student:'Estudiante',teacher:'Profesor',admin:'Administrador'};
U.statusLabel={pending:'Pendiente',completed:'Realizada'};

const stabilityStyle=document.createElement('style');
stabilityStyle.textContent=`
button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid rgba(7,55,90,.18);outline-offset:2px}
.btn:disabled,button:disabled{opacity:.62;cursor:not-allowed}
.table-wrap,.panel{overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch}
.modal{max-height:min(90vh,760px);overflow:auto}
.modal-body{min-width:0}
.content,.main,.topbar,.top-actions{min-width:0}
.nav-btn span:last-child{overflow:hidden;text-overflow:ellipsis}
@media(max-width:920px){.sidebar{position:sticky;top:0;z-index:30}.sidebar nav{scrollbar-width:thin}.side-brand{display:none}.sidebar-foot{display:none}.topbar{top:66px;z-index:25}}
@media(max-width:650px){.topbar{top:61px;flex-direction:column;gap:8px;align-items:stretch}.top-actions{width:100%;max-width:none;justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px}.top-actions>*{flex:0 0 auto}.content{padding-top:20px}.toast{left:14px;right:14px;bottom:14px;text-align:center}.modal{width:calc(100% - 20px);max-height:92vh}.field input,.field select,.stack input,.stack select,.search,.semester{font-size:16px}}
`;
document.head.appendChild(stabilityStyle);

U.api=async(url,options={})=>{
  const controller=options.signal?null:new AbortController();
  const timeout=controller?setTimeout(()=>controller.abort(),20000):null;
  const o={method:'GET',headers:{},credentials:'same-origin',cache:'no-store',...options};
  if(controller)o.signal=controller.signal;
  if(o.body&&typeof o.body!=='string'){
    o.headers['Content-Type']='application/json';
    o.body=JSON.stringify(o.body);
  }
  let r;
  try{r=await fetch(url,o)}catch(e){
    if(e?.name==='AbortError')throw new Error('El servidor tardó demasiado en responder. Inténtalo nuevamente.');
    throw new Error('No se pudo conectar con el servidor. Inténtalo nuevamente.');
  }finally{if(timeout)clearTimeout(timeout)}
  const t=r.headers.get('content-type')||'';
  let d;
  try{d=t.includes('application/json')?await r.json():await r.text()}catch{d=''}
  if(!r.ok){
    const err=new Error(d?.error||d||'Ocurrió un error');err.status=r.status;
    if(r.status===401&&U.state.user&&!String(url).startsWith('/api/auth/'))U.handleSessionExpired();
    throw err;
  }
  return d;
};

U.esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
U.fmtRut=r=>{const [b,d]=String(r||'').split('-');return b&&d?`${Number(b).toLocaleString('es-CL')}-${d}`:r};
U.fmtDate=v=>v?new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(v)):'Sin fecha';
U.gradeText=s=>s?.status==='final'?Number(s.average).toFixed(1):'En proceso';
U.initials=name=>String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();

U.toast=m=>{const e=U.$('#toast');if(!e)return;e.textContent=String(m||'');e.hidden=false;clearTimeout(U.toast.t);U.toast.t=setTimeout(()=>e.hidden=true,3000)};
U.setPage=(title,eyebrow='Liceo Tecnológico Montemaria',actions='')=>{const a=U.$('#pageTitle'),b=U.$('#pageEyebrow'),c=U.$('#topActions');if(a)a.textContent=title;if(b)b.textContent=eyebrow;if(c)c.innerHTML=actions};
U.openModal=(title,html)=>{const a=U.$('#modalTitle'),b=U.$('#modalBody'),m=U.$('#modal');if(!a||!b||!m)return;a.textContent=title;b.innerHTML=`<div class="modal-body">${html}</div>`;if(!m.open)m.showModal()};
U.closeModal=()=>{const m=U.$('#modal');if(m?.open)m.close()};
const modalClose=U.$('#modalClose');if(modalClose)modalClose.onclick=U.closeModal;
const modal=U.$('#modal');if(modal)modal.addEventListener('click',e=>{if(e.target===modal)U.closeModal()});

U.resetToLogin=(message='')=>{
  U.state.user=null;U.state.admin=null;U.state.teacher=null;U.state.currentAssignment=null;U.state.page=null;U.state.adminPreview=null;
  const app=U.$('#appView'),login=U.$('#loginView'),pass=U.$('#password'),err=U.$('#loginError'),toggle=U.$('#togglePassword');
  if(app)app.hidden=true;if(login)login.hidden=false;
  if(pass){pass.value='';pass.type='password'}
  if(toggle)toggle.textContent='Ver';
  if(err){err.textContent=message;err.hidden=!message}
};
U.handleSessionExpired=()=>{
  if(U.state.sessionExpired)return;
  U.state.sessionExpired=true;
  U.resetToLogin('Tu sesión expiró. Inicia sesión nuevamente.');
  setTimeout(()=>{U.state.sessionExpired=false},1000);
};

U.renderShell=()=>{
  const login=U.$('#loginView'),app=U.$('#appView'),mini=U.$('#userMini'),navEl=U.$('#nav');
  if(!login||!app||!mini||!navEl)throw new Error('La interfaz no pudo cargarse correctamente.');
  const u=U.state.user;
  if(!u||!['admin','teacher','student'].includes(u.role))throw new Error('La cuenta no tiene un rol válido.');
  login.hidden=true;app.hidden=false;
  mini.innerHTML=`<div class="avatar">${U.esc(U.initials(u.fullName))}</div><div class="user-copy"><strong>${U.esc(u.fullName)}</strong><span>${U.roleLabel[u.role]} · ${U.esc(U.fmtRut(u.rut))}</span></div>`;
  let title='UnDos',nav=[];
  if(u.role==='admin'){
    title='Administración';
    nav=[['admin-home','⌂','Resumen'],['admin-users','◎','Usuarios'],['admin-courses','▤','Cursos'],['admin-subjects','▦','Materias'],['admin-years','◷','Años escolares'],['admin-history','◫','Historial']];
  }else if(u.role==='teacher'){
    title='Profesor';
    nav=[['teacher-home','▦','Mis clases'],['teacher-history','◷','Historial']];
  }else{
    title='Estudiante';
    nav=[['student-home','⌂','Inicio'],['student-history','◷','Historial']];
  }
  navEl.innerHTML=`<div class="nav-title">${title}</div>`+nav.map(([id,icon,label])=>`<button type="button" class="nav-btn" data-page="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join('');
  navEl.onclick=e=>{const b=e.target.closest('[data-page]');if(b)U.navigate(b.dataset.page)};
};

U.navigate=async page=>{
  U.state.page=page;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const content=U.$('#content');if(!content)return;
  content.innerHTML='<div class="card empty" aria-live="polite">Cargando…</div>';
  try{
    if(page==='admin-home')return U.renderAdminHome();
    if(page==='admin-users')return U.renderAdminUsers();
    if(page==='admin-courses')return U.renderAdminCourses();
    if(page==='admin-subjects')return U.renderAdminSubjects();
    if(page==='admin-years')return U.renderAdminYears();
    if(page==='admin-academic')return U.renderAdminCourses?U.renderAdminCourses():U.renderAdminAcademic();
    if(page==='teacher-home')return U.renderTeacherHome();
    if(page.startsWith('teacher-class-'))return U.renderTeacherClass(Number(page.split('-').pop()));
    if(page==='student-home')return U.renderStudentHome();
    if(['student-history','teacher-history','admin-history'].includes(page))return;
    throw new Error('La sección solicitada no existe.');
  }catch(e){content.innerHTML=`<div class="card"><h2>No se pudo cargar</h2><p class="form-error">${U.esc(e.message)}</p><button type="button" class="btn ghost" id="retryPage">Reintentar</button></div>`;const retry=U.$('#retryPage');if(retry)retry.onclick=()=>U.navigate(page)}
};

U.showInitialAdmin=()=>{
  U.openModal('Administrador inicial',`<form id="setupAdminForm" class="stack"><div class="field"><label>Código de configuración</label><input name="setupCode" autocomplete="off" required></div><div class="field"><label>Nombre completo</label><input name="fullName" required></div><div class="field"><label>RUT</label><input name="rut" placeholder="12.345.678-5" required></div><div class="field"><label>Contraseña</label><input name="password" type="password" minlength="8" required></div><p class="muted">Esta cuenta tendrá control administrativo del sistema. El código solo sirve para crear el primer administrador.</p><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Crear y entrar</button></div></form>`);
  const f=U.$('#setupAdminForm');if(!f)return;
  f.onsubmit=async e=>{e.preventDefault();const x=new FormData(f);try{const d=await U.api('/api/setup/admin',{method:'POST',body:{setupCode:x.get('setupCode'),fullName:x.get('fullName'),rut:x.get('rut'),password:x.get('password')}});U.closeModal();U.state.user=d.user;U.renderShell();U.navigate('admin-home')}catch(err){U.toast(err.message)}};
  const c=U.$('[data-close]');if(c)c.onclick=U.closeModal;
};

U.checkSetup=async()=>{
  try{
    const s=await U.api('/api/setup/status');if(!s.needsSetup)return;
    const old=U.$('#setupInitial');if(old)old.remove();
    const form=U.$('#loginForm');if(!form)return;
    const box=document.createElement('div');box.id='setupInitial';box.className='card';box.style.marginTop='18px';
    box.innerHTML='<strong>Primera configuración</strong><p class="muted" style="margin:5px 0 10px">Aún no existe un administrador.</p><button id="setupAdminBtn" type="button" class="btn secondary full">Crear administrador inicial</button>';
    form.appendChild(box);const b=U.$('#setupAdminBtn');if(b)b.onclick=U.showInitialAdmin;
  }catch{}
};

const togglePassword=U.$('#togglePassword');
if(togglePassword)togglePassword.onclick=()=>{const p=U.$('#password');if(!p)return;const show=p.type==='password';p.type=show?'text':'password';togglePassword.textContent=show?'Ocultar':'Ver';togglePassword.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña')};

const loginForm=U.$('#loginForm');
if(loginForm)loginForm.onsubmit=async e=>{
  e.preventDefault();
  const err=U.$('#loginError'),btn=U.$('#loginBtn'),rut=U.$('#rut'),pass=U.$('#password');
  if(err)err.hidden=true;
  if(!rut?.value.trim()||!pass?.value){if(err){err.textContent='Ingresa tu RUT y contraseña.';err.hidden=false}return;}
  const original=btn?.textContent||'Ingresar';if(btn){btn.disabled=true;btn.textContent='Ingresando…'}
  try{
    const d=await U.api('/api/auth/login',{method:'POST',body:{rut:rut.value,password:pass.value}});
    U.state.user=d.user;U.state.sessionExpired=false;
    U.renderShell();
    await U.navigate(d.user.role==='admin'?'admin-home':d.user.role==='teacher'?'teacher-home':'student-home');
  }catch(ex){if(err){err.textContent=ex.message;err.hidden=false}}
  finally{if(btn){btn.disabled=false;btn.textContent=original}}
};

const logoutBtn=U.$('#logoutBtn');if(logoutBtn)logoutBtn.onclick=async()=>{try{await U.api('/api/auth/logout',{method:'POST'})}catch{}U.resetToLogin()};

window.addEventListener('offline',()=>U.toast('Sin conexión a internet.'));
window.addEventListener('online',()=>U.toast('Conexión restablecida.'));

(async()=>{
  try{
    const d=await U.api('/api/auth/me');U.state.user=d.user;U.renderShell();await U.navigate(d.user.role==='admin'?'admin-home':d.user.role==='teacher'?'teacher-home':'student-home');
  }catch{
    const login=U.$('#loginView');if(login)login.hidden=false;await U.checkSetup();
  }
})();
