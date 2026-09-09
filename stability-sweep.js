(()=>{
const U=window.U;if(!U)return;
const Native=window.__undosNativeMutationObserver||window.MutationObserver;

const style=document.createElement('style');
style.id='undosStabilitySweep';
style.textContent=`
/* Correcciones puntuales detectadas en la revisión de producción. */
body:has(#appView[hidden]) .ux-bottom-nav{display:none!important}
img{max-width:100%}
.side-brand img,.mobile-logo img,.brand-top img{object-fit:contain!important;object-position:center!important}
.top-actions,.toolbar,.group,.form-actions{min-width:0}
.table-wrap{max-width:100%;overscroll-behavior-inline:contain}
@media(max-width:820px){
  body:has(#appView:not([hidden])) .toast{z-index:120!important;bottom:calc(78px + env(safe-area-inset-bottom))!important}
  .sidebar.mobile-nav-open{max-height:100dvh!important}
  .sidebar.mobile-nav-open nav{max-height:calc(100dvh - 124px)!important}
  .top-actions .btn{max-width:min(82vw,340px)}
  .table-wrap{scrollbar-width:thin}
}
@media(max-width:430px){
  .top-actions .btn{max-width:88vw}
  .modal-head h2{max-width:calc(100% - 44px)}
}
`;
document.head.appendChild(style);

const parts=(date=new Date())=>{
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=t=>p.find(x=>x.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/* Una planificación nueva debe abrir en la fecha escolar de Chile, no en UTC. */
const baseOpenModal=U.openModal;
if(typeof baseOpenModal==='function')U.openModal=(title,html)=>{
  const out=baseOpenModal(title,html);
  if(title==='Nueva planificación'){
    const input=document.querySelector('#planForm input[name="date"]');
    if(input)input.value=parts();
  }
  return out;
};

/* La barra inferior vive fuera de #appView; se elimina al cerrar o expirar la sesión. */
const app=document.querySelector('#appView');
const syncSessionUi=()=>{
  if(app?.hidden){
    document.querySelector('#uxBottomNav')?.remove();
    document.querySelector('.sidebar')?.classList.remove('mobile-nav-open');
    const toggle=document.querySelector('#mobileNavToggle');
    if(toggle){toggle.setAttribute('aria-expanded','false');toggle.textContent='☰';toggle.setAttribute('aria-label','Abrir menú')}
  }
};
if(app&&Native)new Native(syncSessionUi).observe(app,{attributes:true,attributeFilter:['hidden']});
syncSessionUi();

/* Una capa visual anterior podía volver a mover “Años” al final del menú. */
const adminOrder=['admin-home','admin-dashboard','admin-search','admin-users','admin-courses','admin-subjects','admin-years','admin-communications','admin-statistics','admin-promotion','admin-exports','admin-audit','admin-history'];
const adminGroups={
  'admin-home':'Principal','admin-dashboard':'Principal','admin-search':'Principal',
  'admin-users':'Gestión académica','admin-courses':'Gestión académica','admin-subjects':'Gestión académica','admin-years':'Gestión académica',
  'admin-communications':'Comunidad','admin-statistics':'Seguimiento','admin-promotion':'Seguimiento','admin-exports':'Reportes','admin-audit':'Sistema','admin-history':'Sistema'
};
function normalizeAdminNav(){
  if(U.state?.user?.role!=='admin'||U.state?.adminPreview)return;
  const nav=document.querySelector('#nav');if(!nav)return;
  nav.querySelectorAll('.ux-nav-group').forEach(x=>x.remove());
  let anchor=nav.querySelector('.nav-title');
  for(const page of adminOrder){const b=nav.querySelector(`[data-page="${page}"]`);if(!b)continue;if(anchor)anchor.after(b);anchor=b}
  let last='';
  for(const page of adminOrder){
    const b=nav.querySelector(`[data-page="${page}"]`);if(!b)continue;
    const group=adminGroups[page];
    if(group&&group!==last){const h=document.createElement('div');h.className='ux-nav-group';h.textContent=group;b.before(h);last=group}
  }
}
const scheduleNav=()=>{setTimeout(normalizeAdminNav,0);setTimeout(normalizeAdminNav,120)};
const baseShell=U.renderShell;
if(typeof baseShell==='function')U.renderShell=(...args)=>{const out=baseShell(...args);scheduleNav();return out};
const baseNavigate=U.navigate;
if(typeof baseNavigate==='function')U.navigate=async(...args)=>{const out=await baseNavigate(...args);scheduleNav();return out};
scheduleNav();

const toast=document.querySelector('#toast');
if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true')}

/* Evita dejar un modal o la navegación móvil abiertos si la sesión cambia. */
const baseReset=U.resetToLogin;
if(typeof baseReset==='function')U.resetToLogin=(...args)=>{
  try{U.closeModal?.()}catch{}
  const out=baseReset(...args);
  syncSessionUi();
  return out;
};
})();
