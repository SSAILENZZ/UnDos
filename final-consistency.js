(()=>{
const U=window.U;if(!U)return;const S=U.state;
const style=document.createElement('style');style.id='undosFinalConsistency';style.textContent=`
/* UnDos · sistema visual final y consistencia transversal */
:root{
  --fc-radius-sm:10px;--fc-radius:14px;--fc-radius-lg:18px;
  --fc-shadow:0 7px 24px rgba(16,38,59,.055);
  --fc-shadow-hover:0 14px 38px rgba(16,38,59,.09);
  --fc-focus:0 0 0 3px color-mix(in srgb,var(--blue) 15%,transparent);
  --fc-page:1360px;
}
html[data-theme="dark"]{--fc-shadow:0 8px 26px rgba(0,0,0,.16);--fc-shadow-hover:0 15px 38px rgba(0,0,0,.24)}
html{scroll-behavior:smooth}body{overflow-x:hidden}.main,#content,#content>*{min-width:0}.content{width:100%;max-width:var(--fc-page)!important;padding:25px 28px 96px!important}

/* Jerarquía de página */
.welcome,.student-head,.student-att-head,.student-cal-head,.calendar-intro,.comm-head,.profile-head,.dash-head,.promo-head,.export-head,.audit-head,.gs-head,.plan-head{margin-bottom:18px!important;gap:14px!important}
.welcome h1,.student-head h1,.student-att-head h1,.student-cal-head h1,.calendar-intro h1,.comm-head h1,.profile-head h1,.dash-head h1,.promo-head h1,.export-head h1,.audit-head h1,.gs-head h1,.plan-head h1{font-size:clamp(26px,2.4vw,30px)!important;line-height:1.08!important;letter-spacing:-.72px!important;color:var(--text)!important;overflow-wrap:anywhere}
.welcome p,.student-head p,.student-att-head p,.student-cal-head p,.calendar-intro p,.comm-head p,.profile-head p,.dash-head p,.promo-head p,.export-head p,.audit-head p,.gs-head p,.plan-head p{font-size:12px!important;line-height:1.52!important;color:var(--muted)!important;max-width:780px}
.eyebrow,.teacher-kicker{font-size:10px!important;letter-spacing:.105em!important;font-weight:900!important;line-height:1.2!important}
h1,h2,h3,strong,.btn,.nav-btn{overflow-wrap:anywhere}.muted{line-height:1.45}

/* Superficies: un mismo lenguaje visual */
.card,.panel,.table-wrap,.student-stat,.student-subject-card,.student-detail,.student-att-main,.student-att-stat,.student-att-card,.student-cal-main,.student-cal-side,.calendar-main,.calendar-side,.comm-stat,.comm-card,.comm-side,.profile-id,.profile-account,.profile-panel,.profile-stat,.dash-panel,.dash-stat,.promo-stat,.promo-panel,.promo-map-card,.export-card,.audit-stat,.audit-panel,.gs-searchbox,.gs-group,.plan-stat,.plan-side,.plan-main,.history-card,.history-note{border-radius:var(--fc-radius)!important;border-color:var(--line)!important;box-shadow:var(--fc-shadow)!important}
.student-att-main,.student-att-stat,.student-att-card,.comm-stat,.comm-side,.profile-id,.profile-account,.profile-panel,.profile-stat,.promo-panel,.audit-panel,.gs-searchbox,.gs-group,.plan-stat,.plan-side,.plan-main{border-top-width:1px!important}
.card,.panel,.table-wrap,.student-stat,.student-subject-card,.student-detail,.student-att-main,.student-att-stat,.student-att-card,.comm-card,.comm-side,.profile-id,.profile-account,.profile-panel,.profile-stat,.dash-panel,.dash-stat,.promo-stat,.promo-panel,.promo-map-card,.export-card,.audit-stat,.audit-panel,.gs-searchbox,.gs-group,.plan-stat,.plan-side,.plan-main,.history-card,.history-note{background:var(--card)!important}
.comm-card.important{background:linear-gradient(90deg,var(--orange-soft),var(--card) 20%)!important}.promo-prepare,.plan-note,.profile-note,.export-note,.ux-history-tip,.wf-search-guide,.wf-grade-strip,.wf-plan-progress{box-shadow:none!important}

/* Tarjetas métricas */
.stat,.student-stat,.student-att-stat,.comm-stat,.profile-stat,.dash-stat,.promo-stat,.audit-stat,.plan-stat,.calendar-metric,.student-cal-stat,.ux-manage-stat{min-height:96px!important;padding:15px 16px!important}
.stat span,.student-stat span,.student-att-stat span,.comm-stat span,.profile-stat span,.dash-stat span,.promo-stat span,.audit-stat span,.plan-stat span,.calendar-metric span,.student-cal-stat span,.ux-manage-stat span{font-size:9px!important;line-height:1.35!important;letter-spacing:.015em}
.stat strong,.student-stat strong,.student-att-stat strong,.comm-stat strong,.profile-stat strong,.dash-stat strong,.promo-stat strong,.audit-stat strong,.plan-stat strong,.calendar-metric strong,.student-cal-stat strong,.ux-manage-stat strong{font-size:23px!important;line-height:1.05!important;letter-spacing:-.55px!important}

/* Botones y controles */
.btn{min-height:38px!important;border-radius:var(--fc-radius-sm)!important;padding:9px 13px!important;font-size:12px!important;line-height:1.15!important;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:normal;text-align:center}
.btn.small{min-height:34px!important;padding:7px 10px!important;font-size:10px!important}.btn.primary{box-shadow:0 7px 18px rgba(7,55,90,.13)!important}.btn.secondary{background:color-mix(in srgb,var(--card) 96%,var(--blue))!important;border-color:color-mix(in srgb,var(--blue) 20%,var(--line))!important}.btn.ghost{background:var(--card)!important}.btn.danger{border-color:color-mix(in srgb,var(--danger) 24%,var(--line))!important}
.btn:focus-visible,.nav-btn:focus-visible,.icon-btn:focus-visible,.notify-bell:focus-visible,.ux-filter-chip:focus-visible,.wf-plan-chip:focus-visible,.gs-filter:focus-visible,.history-card:focus-visible,.student-subject-card:focus-visible,.teacher-course-card:focus-visible{outline:none!important;box-shadow:var(--fc-focus)!important}
button:disabled{cursor:not-allowed!important;opacity:.58!important}
input:not([type="checkbox"]):not([type="radio"]):not(.grade-input),select,textarea,.search,.semester{min-height:42px;border-radius:var(--fc-radius-sm)!important;background:var(--surface-soft)!important;border:1px solid var(--line)!important;color:var(--text)!important;padding:10px 12px!important}
textarea{line-height:1.5}input:focus,select:focus,textarea:focus,.search:focus,.semester:focus{outline:none!important;border-color:color-mix(in srgb,var(--blue) 48%,var(--line))!important;box-shadow:var(--fc-focus)!important;background:var(--card)!important}.field label,.stack label{font-size:11px!important;margin-bottom:6px!important;color:var(--text)}

/* Barras, filtros y chips */
.toolbar,.plan-toolbar,.promo-toolbar,.calendar-toolbar,.student-cal-toolbar{gap:8px!important}.toolbar{padding:12px 14px!important}.group{gap:7px!important}.ux-filter-chip,.wf-plan-chip,.gs-filter{min-height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px!important}.badge{min-height:23px;padding:4px 8px!important;font-size:9px!important;line-height:1.1!important}

/* Tablas */
.table-wrap{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--muted) 35%,transparent) transparent}table{background:var(--card)!important}th{height:42px!important;background:color-mix(in srgb,var(--card) 95%,var(--bg))!important;color:var(--muted)!important;font-size:9px!important;font-weight:850!important;letter-spacing:.065em!important}td{font-size:11px!important;line-height:1.4!important}th,td{padding:11px 13px!important}.table-wrap tbody tr,.panel tbody tr{transition:background .12s ease}.table-wrap tbody tr:hover td,.panel tbody tr:hover td{background:color-mix(in srgb,var(--blue) 2.8%,var(--card))!important}.grade-input{min-height:36px!important;border-radius:9px!important;text-align:center;font-weight:800}

/* Modales, feedback y vacíos */
.modal{border-radius:var(--fc-radius-lg)!important;max-height:min(92dvh,820px)!important;overflow:hidden}.modal-shell{max-height:inherit;display:flex;flex-direction:column}.modal-head{flex:0 0 auto;padding:16px 18px!important}.modal-head h2{font-size:16px!important;line-height:1.25}.modal-body,#modalBody{min-width:0}.modal-body{padding:18px!important;overflow:auto}.icon-btn{width:36px;height:36px;display:grid;place-items:center;padding:0!important;border-radius:10px!important}.toast{max-width:min(420px,calc(100vw - 24px));border-radius:12px!important;font-size:11px!important;line-height:1.4!important;box-shadow:0 16px 42px rgba(0,0,0,.18)!important}.empty,.comm-empty,.profile-empty,.student-att-empty,.promo-empty,.audit-empty,.gs-empty,.plan-empty{min-height:112px!important;padding:26px 18px!important;line-height:1.5!important}

/* Sidebar y cabecera */
.app{grid-template-columns:250px minmax(0,1fr)!important}.sidebar{padding:16px 13px!important}.side-brand{padding:6px 8px 16px!important;margin-bottom:3px!important}.side-brand img{display:block!important;width:58px!important;height:50px!important;object-fit:contain!important;object-position:center!important;padding:5px!important;background:#fff!important;border:1px solid color-mix(in srgb,var(--blue) 10%,var(--line))!important;border-radius:11px!important}.side-brand strong{font-size:20px!important;letter-spacing:-.45px!important}.side-brand small{font-size:9px!important;margin-top:3px!important}.ux-nav-group{padding:13px 10px 5px!important;font-size:8px!important;letter-spacing:.115em!important}.nav-btn{min-height:42px!important;padding:7px 9px!important;font-size:11px!important;border-radius:10px!important}.nav-icon{width:29px!important;height:29px!important;flex:0 0 29px!important}.nav-icon svg{width:16px!important;height:16px!important}.topbar{height:70px!important;padding:0 26px!important;background:color-mix(in srgb,var(--bg) 88%,transparent)!important}.page-title strong{font-size:15px!important;line-height:1.2}.page-title small{font-size:9px!important;line-height:1.35}.top-actions{gap:7px!important}

/* Interacciones solo donde existe hover real */
@media(hover:hover) and (pointer:fine){.card,.panel,.student-subject-card,.teacher-course-card,.comm-card,.profile-panel,.export-card,.history-card,.gs-result,.plan-item{transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}.student-subject-card:hover,.teacher-course-card:hover,.export-card:hover,.history-card:hover{transform:translateY(-1px)!important;box-shadow:var(--fc-shadow-hover)!important}.gs-result:hover{transform:translateX(2px)}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}

/* Tablet / móvil: interfaz de app, no escritorio comprimido */
@media(max-width:820px){
  .app{display:block!important}.content{max-width:none!important;padding:9px 11px 104px!important}.sidebar{padding:0!important}.side-brand{padding:7px 10px!important;margin:0!important;min-height:60px!important}.side-brand img{width:49px!important;height:44px!important;flex:0 0 49px!important;padding:4px!important}.side-brand strong{font-size:18px!important}.topbar{height:auto!important;min-height:0!important;padding:10px 11px 7px!important;background:var(--bg)!important;gap:7px!important}.page-title strong{font-size:14px!important}.page-title small{font-size:9px!important}.top-actions{gap:6px!important;padding-bottom:2px!important}.top-actions .btn,.top-actions .theme-toggle{min-height:35px!important;padding:7px 9px!important;font-size:10px!important}.welcome,.student-head,.student-att-head,.student-cal-head,.calendar-intro,.comm-head,.profile-head,.dash-head,.promo-head,.export-head,.audit-head,.gs-head,.plan-head{margin-bottom:14px!important}.welcome h1,.student-head h1,.student-att-head h1,.student-cal-head h1,.calendar-intro h1,.comm-head h1,.profile-head h1,.dash-head h1,.promo-head h1,.export-head h1,.audit-head h1,.gs-head h1,.plan-head h1{font-size:23px!important}.welcome p,.student-head p,.student-att-head p,.student-cal-head p,.calendar-intro p,.comm-head p,.profile-head p,.dash-head p,.promo-head p,.export-head p,.audit-head p,.gs-head p,.plan-head p{font-size:11px!important}.card,.panel,.table-wrap,.student-subject-card,.student-detail,.student-att-main,.student-att-card,.calendar-main,.calendar-side,.student-cal-main,.student-cal-side,.comm-card,.comm-side,.profile-id,.profile-account,.profile-panel,.dash-panel,.promo-panel,.export-card,.audit-panel,.gs-searchbox,.gs-group,.plan-side,.plan-main,.history-card{border-radius:13px!important}.stat,.student-stat,.student-att-stat,.comm-stat,.profile-stat,.dash-stat,.promo-stat,.audit-stat,.plan-stat,.calendar-metric,.student-cal-stat,.ux-manage-stat{min-height:84px!important;padding:12px 13px!important}.stat strong,.student-stat strong,.student-att-stat strong,.comm-stat strong,.profile-stat strong,.dash-stat strong,.promo-stat strong,.audit-stat strong,.plan-stat strong,.calendar-metric strong,.student-cal-stat strong,.ux-manage-stat strong{font-size:20px!important}
  .grid.cols-4,.student-stats,.student-att-stats,.profile-stats,.promo-stats,.audit-stats,.plan-summary,.comm-summary,.dash-summary,.ux-manage-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.grid.cols-3,.grid.cols-2,.student-subject-grid,.admin-home-grid,.profile-hero,.profile-layout,.student-att-overview,.student-att-grid,.comm-layout,.promo-course-map,.export-grid{grid-template-columns:1fr!important}.btn{min-height:42px!important}.btn.small{min-height:38px!important}.toolbar{padding:10px!important}.toolbar .group{gap:6px!important}.ux-bottom-nav{left:7px!important;right:7px!important;bottom:max(7px,env(safe-area-inset-bottom))!important;padding:4px!important;border-radius:16px!important}.ux-bottom-nav button{min-height:48px!important}.ux-bottom-nav button span{font-size:8px!important}.modal{width:calc(100% - 14px)!important;margin:7px!important;max-height:94dvh!important}.modal-head{padding:13px 14px!important}.modal-body{padding:14px!important}.form-actions .btn{width:100%!important}.notify-list{max-height:58dvh!important}
}
@media(max-width:430px){
  .content{padding-left:9px!important;padding-right:9px!important}.grid.cols-4,.student-stats,.student-att-stats,.profile-stats,.promo-stats,.audit-stats,.plan-summary,.comm-summary,.dash-summary,.ux-manage-summary{grid-template-columns:1fr 1fr!important}.stat span,.student-stat span,.student-att-stat span,.comm-stat span,.profile-stat span,.dash-stat span,.promo-stat span,.audit-stat span,.plan-stat span,.ux-manage-stat span{font-size:8px!important}.stat strong,.student-stat strong,.student-att-stat strong,.comm-stat strong,.profile-stat strong,.dash-stat strong,.promo-stat strong,.audit-stat strong,.plan-stat strong,.ux-manage-stat strong{font-size:19px!important}.ux-filter-row,.wf-plan-chips,.ux-att-controls{grid-template-columns:1fr 1fr!important}.profile-id{padding:15px!important}.profile-avatar{width:60px!important;height:60px!important;border-radius:17px!important;font-size:20px!important}.export-actions,.comm-actions,.plan-actions{display:grid!important;grid-template-columns:1fr!important}.export-actions .btn,.comm-actions .btn,.plan-actions .btn{width:100%!important}.toast{left:9px!important;right:9px!important;bottom:calc(78px + env(safe-area-inset-bottom))!important;max-width:none!important}
}
@media(max-width:350px){.grid.cols-4,.student-stats,.student-att-stats,.profile-stats,.promo-stats,.audit-stats,.plan-summary,.comm-summary,.dash-summary,.ux-manage-summary{grid-template-columns:1fr!important}}
`;
document.head.appendChild(style);

function decorate(){
  document.body.dataset.undosPage=S.page||'';
  const toast=document.querySelector('#toast');if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true')}
  document.querySelectorAll('button:not([aria-label])').forEach(b=>{const txt=(b.textContent||'').replace(/\s+/g,' ').trim();if(!txt&&b.title)b.setAttribute('aria-label',b.title)});
  document.querySelectorAll('.table-wrap').forEach(w=>{requestAnimationFrame(()=>{if(w.scrollWidth>w.clientWidth+4){if(!w.hasAttribute('tabindex'))w.tabIndex=0;if(!w.hasAttribute('aria-label'))w.setAttribute('aria-label','Tabla desplazable horizontalmente')}})});
  document.querySelectorAll('img').forEach(img=>{if(!img.hasAttribute('draggable'))img.draggable=false});
}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})};
const content=document.querySelector('#content'),modal=document.querySelector('#modalBody');
if(content)new MutationObserver(schedule).observe(content,{childList:true,subtree:true});
if(modal)new MutationObserver(schedule).observe(modal,{childList:true,subtree:true});
window.addEventListener('resize',schedule,{passive:true});
setTimeout(decorate,0);
})();
