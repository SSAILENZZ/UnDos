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

const toast=document.querySelector('#toast');
if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true')}

/* Evita dejar el scroll del documento bloqueado si la sesión cambia con un modal abierto. */
const baseReset=U.resetToLogin;
if(typeof baseReset==='function')U.resetToLogin=(...args)=>{
  try{U.closeModal?.()}catch{}
  const out=baseReset(...args);
  syncSessionUi();
  return out;
};
})();
