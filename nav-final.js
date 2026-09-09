(()=>{
const U=window.U;if(!U)return;const $=U.$,S=U.state;
const Native=window.__undosNativeMutationObserver||window.MutationObserver;
const order={
  student:['student-home','student-dashboard','student-attendance','student-calendar','communications','student-profile','student-history'],
  teacher:['teacher-home','teacher-dashboard','teacher-calendar','teacher-planning','communications','teacher-history'],
  admin:['admin-home','admin-dashboard','admin-search','admin-users','admin-courses','admin-subjects','admin-years','admin-communications','admin-statistics','admin-promotion','admin-exports','admin-audit','admin-history']
};
const groups={
  student:{'student-home':'Principal','student-dashboard':'Principal','student-attendance':'Académico','student-calendar':'Académico','communications':'Comunidad','student-profile':'Cuenta','student-history':'Cuenta'},
  teacher:{'teacher-home':'Principal','teacher-dashboard':'Principal','teacher-calendar':'Docencia','teacher-planning':'Docencia','communications':'Comunidad','teacher-history':'Cuenta'},
  admin:{'admin-home':'Principal','admin-dashboard':'Principal','admin-search':'Principal','admin-users':'Gestión académica','admin-courses':'Gestión académica','admin-subjects':'Gestión académica','admin-years':'Gestión académica','admin-communications':'Comunidad','admin-statistics':'Seguimiento','admin-promotion':'Seguimiento','admin-exports':'Reportes','admin-audit':'Sistema','admin-history':'Sistema'}
};
let observer=null;
function stabilizeNav(){
  const nav=$('#nav');if(!nav||!S.user||S.adminPreview)return;
  observer?.disconnect();
  try{
    nav.querySelectorAll('.ux-nav-group').forEach(x=>x.remove());
    const wanted=order[S.user.role]||[];
    let anchor=nav.querySelector('.nav-title');
    for(const page of wanted){
      const btn=nav.querySelector(`[data-page="${page}"]`);if(!btn)continue;
      if(anchor){anchor.after(btn);anchor=btn}
    }
    let lastGroup='';
    for(const page of wanted){
      const btn=nav.querySelector(`[data-page="${page}"]`);if(!btn)continue;
      const group=groups[S.user.role]?.[page]||'';
      if(group&&group!==lastGroup){
        const h=document.createElement('div');h.className='ux-nav-group';h.textContent=group;btn.before(h);lastGroup=group;
      }
      btn.setAttribute('aria-current',S.page===page?'page':'false');
    }
  }finally{
    if(observer&&nav.isConnected)observer.observe(nav,{childList:true,subtree:false});
  }
}
function closeMobileMenu(){
  const side=$('.sidebar'),toggle=$('#mobileNavToggle');
  if(!side)return;side.classList.remove('mobile-nav-open');
  if(toggle){toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menú');toggle.textContent='☰'}
}

document.addEventListener('click',e=>{
  if(S.adminPreview)return;
  const btn=e.target.closest('#nav [data-page]');if(!btn)return;
  const page=btn.dataset.page;if(!page||typeof U.navigate!=='function')return;
  e.preventDefault();e.stopImmediatePropagation();
  U.navigate(page);
  if(window.matchMedia('(max-width:820px)').matches)closeMobileMenu();
},true);

const nav=$('#nav');
if(nav&&Native){observer=new Native(()=>setTimeout(stabilizeNav,0));observer.observe(nav,{childList:true,subtree:false})}
const oldShell=U.renderShell;
U.renderShell=()=>{oldShell();setTimeout(stabilizeNav,0)};
const oldNavigate=U.navigate;
U.navigate=async page=>{const out=await oldNavigate(page);setTimeout(stabilizeNav,0);return out};
setTimeout(stabilizeNav,0);
})();

(()=>{
  const loadFinal=()=>{
    if(document.querySelector('script[data-final-consistency]'))return;
    const f=document.createElement('script');
    f.src='/final-consistency.js?v=20260909-27';
    f.dataset.finalConsistency='1';
    document.head.appendChild(f);
  };
  let s=document.querySelector('script[data-workflow-polish]');
  if(!s){
    s=document.createElement('script');
    s.src='/workflow-polish.js?v=20260909-26';
    s.dataset.workflowPolish='1';
    document.head.appendChild(s);
  }
  let tries=0;
  const wait=()=>{
    if(document.getElementById('undosWorkflowPolish')||tries++>100){loadFinal();return}
    setTimeout(wait,20);
  };
  wait();
})();
