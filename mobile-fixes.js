(()=>{
const U=window.U;
const mq=window.matchMedia('(max-width: 820px)');
const style=document.createElement('style');
style.textContent=`
/* UnDos · adaptación móvil real */
.side-brand img,.mobile-logo img,.brand-top img{object-fit:contain!important;object-position:center!important;box-sizing:border-box!important;overflow:visible!important}
.side-brand img{width:64px!important;height:56px!important;flex:0 0 64px!important;padding:6px 7px!important;background:#fff!important;border:1px solid rgba(7,55,90,.09)!important;border-radius:11px!important}
.mobile-logo img{padding:5px!important;background:#fff!important;border:1px solid var(--line)!important;border-radius:11px!important}
.mobile-nav-toggle{display:none;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:11px;width:42px;height:42px;align-items:center;justify-content:center;font-size:20px;font-weight:800;line-height:1;margin-left:auto;flex:0 0 auto}
html[data-theme="dark"] .mobile-nav-toggle{background:#17212b;border-color:#30404e;color:#eaf0f6}
@media(max-width:820px){
  html,body{width:100%;max-width:100%;overflow-x:hidden}
  body{min-width:0}
  .app{display:block!important;min-height:100dvh!important;width:100%!important}
  .main{width:100%!important;min-width:0!important}
  .sidebar{position:sticky!important;top:0!important;z-index:80!important;width:100%!important;height:auto!important;min-height:0!important;padding:0!important;border-right:0!important;border-bottom:1px solid var(--line)!important;box-shadow:0 7px 24px rgba(16,38,59,.07)!important;overflow:visible!important}
  .side-brand{display:flex!important;align-items:center!important;gap:10px!important;margin:0!important;padding:8px 12px!important;min-height:64px!important;border-bottom:0!important;width:100%!important;background:var(--card)!important}
  html[data-theme="dark"] .side-brand{background:#111821!important}
  .side-brand img{width:52px!important;height:46px!important;flex-basis:52px!important;padding:5px 6px!important;border-radius:10px!important}
  .side-brand strong{font-size:19px!important;line-height:1.05!important;letter-spacing:-.35px!important}
  .side-brand small{font-size:9px!important;margin-top:3px!important}
  .mobile-nav-toggle{display:inline-flex!important}
  .sidebar nav{display:none!important;width:100%!important;max-height:calc(100dvh - 64px)!important;overflow-y:auto!important;overflow-x:hidden!important;padding:6px 10px 10px!important;gap:7px!important;background:var(--card)!important;border-top:1px solid var(--line)!important;scrollbar-width:thin}
  html[data-theme="dark"] .sidebar nav{background:#111821!important}
  .sidebar.mobile-nav-open nav{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .nav-title{display:none!important}
  .nav-btn{width:100%!important;min-width:0!important;min-height:44px!important;margin:0!important;padding:9px 10px!important;border:1px solid var(--line)!important;border-radius:12px!important;background:var(--surface-soft)!important;white-space:normal!important;line-height:1.15!important;font-size:12px!important;transform:none!important}
  .nav-btn.active{border-color:rgba(235,82,31,.34)!important}
  .nav-btn.active:before{display:none!important}
  .nav-icon{width:26px!important;height:26px!important;flex:0 0 26px!important}
  .sidebar-foot{display:none!important;margin:0!important;padding:10px 12px 12px!important;border-top:1px solid var(--line)!important;background:var(--card)!important}
  html[data-theme="dark"] .sidebar-foot{background:#111821!important}
  .sidebar.mobile-nav-open .sidebar-foot{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important}
  .user-mini{border-top:0!important;padding:0!important;min-width:0!important}
  .sidebar-foot .btn{width:auto!important;white-space:nowrap!important}
  .topbar{position:relative!important;top:auto!important;height:auto!important;min-height:0!important;padding:13px 13px 9px!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:9px!important;background:transparent!important;backdrop-filter:none!important;border-bottom:0!important;z-index:10!important}
  .page-title strong{font-size:16px!important;line-height:1.2!important}
  .page-title small{font-size:10px!important;line-height:1.3!important;margin-top:2px!important}
  .top-actions{width:100%!important;max-width:none!important;display:flex!important;justify-content:flex-start!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;padding:0 0 3px!important;gap:7px!important;scrollbar-width:none!important;overscroll-behavior-inline:contain!important;-webkit-overflow-scrolling:touch}
  .top-actions::-webkit-scrollbar{display:none}
  .top-actions>*{flex:0 0 auto!important}
  .top-actions .btn,.top-actions .theme-toggle{min-height:36px!important;padding:8px 10px!important;font-size:11px!important}
  .content{width:100%!important;max-width:none!important;margin:0!important;padding:10px 12px 78px!important;overflow:visible!important}
  .welcome,.student-head,.calendar-intro,.student-cal-head{width:100%!important;align-items:flex-start!important;flex-direction:column!important;gap:10px!important;margin-bottom:16px!important}
  .welcome h1,.student-head h1,.calendar-intro h1,.student-cal-head h1{font-size:25px!important;line-height:1.05!important;letter-spacing:-.65px!important}
  .welcome p,.student-head p,.calendar-intro p,.student-cal-head p{font-size:12px!important;line-height:1.45!important}
  .grid.cols-4,.grid.cols-3,.grid.cols-2,.form-grid,.student-stats,.student-subject-grid,.student-cal-summary,.calendar-summary,.admin-home-grid{grid-template-columns:1fr!important}
  .grid,.student-stats,.student-subject-grid,.student-cal-summary,.calendar-summary{gap:10px!important}
  .card,.panel,.table-wrap,.student-stat,.student-subject-card,.student-detail,.calendar-main,.calendar-side,.student-cal-main,.student-cal-side{max-width:100%!important;min-width:0!important;border-radius:14px!important}
  .card,.student-stat,.student-subject-card{padding:15px!important}
  .student-subject-card{min-height:0!important}
  .student-subject-bottom{margin-top:18px!important}
  .toolbar,.calendar-toolbar,.student-cal-toolbar{align-items:stretch!important;flex-direction:column!important;gap:8px!important}
  .toolbar .group,.group,.calendar-filters,.student-cal-filters{width:100%!important;display:grid!important;grid-template-columns:1fr!important;gap:7px!important}
  .toolbar .group>.btn,.group>.btn,.calendar-filters select,.student-cal-filters select,.search,.semester{width:100%!important;max-width:none!important}
  .table-wrap,.panel{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
  table{min-width:640px!important}
  th,td{padding:11px 12px!important;font-size:12px!important}
  .modal{width:calc(100% - 16px)!important;max-width:none!important;max-height:92dvh!important;margin:8px!important;border-radius:18px!important}
  .modal-head{padding:15px 16px!important}
  .modal-body{padding:16px!important}
  .form-actions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
  .form-actions .btn{width:100%!important}
  .toast{left:12px!important;right:12px!important;bottom:12px!important;width:auto!important;text-align:center!important}
  .att-summary-grid,.dash-summary,.profile-summary{grid-template-columns:1fr!important}
  .student-cal-layout,.teacher-calendar-shell{grid-template-columns:1fr!important;gap:12px!important}
  .calendar-side,.student-cal-side{margin-top:0!important}
}
@media(max-width:560px){
  .side-brand{min-height:60px!important;padding:7px 10px!important}
  .side-brand img{width:48px!important;height:43px!important;flex-basis:48px!important;padding:5px!important}
  .side-brand strong{font-size:18px!important}
  .mobile-nav-toggle{width:39px!important;height:39px!important;font-size:18px!important}
  .sidebar.mobile-nav-open nav{grid-template-columns:1fr!important}
  .nav-btn{min-height:42px!important;font-size:12px!important}
  .content{padding-left:10px!important;padding-right:10px!important}
  .topbar{padding-left:10px!important;padding-right:10px!important}
  .student-cal-main,.calendar-main{overflow:visible!important}
  .student-cal-week,.calendar-weekdays{display:none!important}
  .student-cal-grid,.calendar-grid{display:block!important;min-width:0!important;width:100%!important;padding:8px!important}
  .student-cal-day,.calendar-day{display:none!important;min-height:0!important;width:100%!important;border:1px solid var(--line)!important;border-radius:12px!important;margin:0 0 8px!important;padding:10px!important;background:var(--card)!important;opacity:1!important}
  .student-cal-day:has(.student-cal-event),.student-cal-day.today,.calendar-day:has(.cal-event),.calendar-day.today{display:block!important}
  .student-cal-date,.calendar-date{margin-bottom:7px!important}
  .student-cal-event,.cal-event{width:100%!important;padding:8px 9px!important;border-radius:9px!important}
  .student-cal-event strong,.cal-event strong{font-size:11px!important;white-space:normal!important}
  .student-cal-event small,.cal-event small{font-size:9px!important;white-space:normal!important}
  .student-cal-toolbar,.calendar-toolbar{padding:11px!important}
  .student-cal-month,.calendar-month{width:100%!important;display:grid!important;grid-template-columns:auto 1fr auto!important;gap:6px!important;align-items:center!important}
  .student-cal-month strong,.calendar-month strong{text-align:center!important;font-size:14px!important}
  .student-cal-month [data-student-cal-today],.calendar-month [data-cal-today]{grid-column:1/-1!important;width:100%!important}
  .student-cal-rule,.calendar-rule{width:100%!important;max-width:none!important}
  .notify-item{grid-template-columns:36px minmax(0,1fr)!important}
  .notify-time{grid-column:2!important}
}
`;
document.head.appendChild(style);

function setupMobileNav(){
  const sidebar=document.querySelector('.sidebar'),brand=document.querySelector('.side-brand'),nav=document.querySelector('#nav');
  if(!sidebar||!brand||!nav)return;
  let btn=document.querySelector('#mobileNavToggle');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';btn.id='mobileNavToggle';btn.className='mobile-nav-toggle';btn.setAttribute('aria-label','Abrir menú');btn.setAttribute('aria-expanded','false');btn.textContent='☰';brand.appendChild(btn);
  }
  const close=()=>{sidebar.classList.remove('mobile-nav-open');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Abrir menú');btn.textContent='☰'};
  const toggle=()=>{const open=sidebar.classList.toggle('mobile-nav-open');btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');btn.textContent=open?'×':'☰'};
  btn.onclick=toggle;
  nav.addEventListener('click',e=>{if(e.target.closest('[data-page]')&&mq.matches)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  mq.addEventListener?.('change',e=>{if(!e.matches)close()});
}

const baseShell=U.renderShell;
U.renderShell=()=>{baseShell();setTimeout(setupMobileNav,0)};
setTimeout(setupMobileNav,0);
})();