(()=>{
  const style=document.createElement('style');
  style.id='undosNavigationLayoutFixes';
  style.textContent=`
    /* UnDos · navegación y layouts estrechos */
    html,body{min-height:100%;overflow-x:hidden}
    .app{height:100dvh!important;min-height:100dvh!important;overflow:hidden!important}
    .sidebar{height:100dvh!important;min-height:100dvh!important;overflow:hidden!important}
    .sidebar nav{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--muted) 35%,transparent) transparent;overscroll-behavior:contain!important;padding-right:3px!important}
    .sidebar nav::-webkit-scrollbar{width:7px}
    .sidebar nav::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--muted) 30%,transparent);border-radius:999px}
    .nav-btn,.ux-nav-group{max-width:100%!important}
    .nav-btn{min-width:0!important}

    /* El contenido principal tiene su propio scroll vertical para que nunca quede atrapado por el viewport. */
    .main{height:100dvh!important;min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--muted) 35%,transparent) transparent;overscroll-behavior-y:auto!important}
    .main::-webkit-scrollbar{width:9px}
    .main::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--muted) 28%,transparent);border-radius:999px}
    .content{min-height:100%!important}

    /* Las acciones de inicio se adaptan al ancho real de la tarjeta, no solo al viewport. */
    .home-summary,.home-command,.home-command>*{min-width:0!important}
    .home-actions{grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr))!important}
    .home-action{min-width:0!important;width:100%!important;max-width:100%!important;overflow:hidden!important}
    .home-action>span:last-child{min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important;word-break:normal!important}
    .home-action-icon{flex:0 0 auto!important}
    .home-quick-primary{min-width:0!important}
    .home-quick-primary .btn{max-width:100%!important;min-width:0!important}

    @media(max-width:820px){
      .app{height:auto!important;min-height:100dvh!important;overflow:visible!important}
      .main{height:auto!important;min-height:0!important;overflow:visible!important}
      .sidebar{height:auto!important;min-height:auto!important;overflow:visible!important}
      .sidebar nav{max-height:none!important;overflow-x:auto!important;overflow-y:hidden!important}
    }
    @media(max-width:700px){
      .sidebar nav{max-height:calc(100dvh - 60px)!important;overflow-y:auto!important;overflow-x:hidden!important}
    }
    @media(max-width:430px){
      .home-actions{grid-template-columns:1fr!important}
      .home-quick-primary{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);

  const fix=()=>{
    const nav=document.querySelector('#nav');
    if(nav){
      nav.style.overflowY=window.matchMedia('(max-width:700px)').matches?'auto':'auto';
      nav.style.overflowX=window.matchMedia('(max-width:820px)').matches?'hidden':'hidden';
      nav.style.minHeight='0';
    }
    const main=document.querySelector('.main');
    if(main&&window.matchMedia('(max-width:820px)').matches){
      main.style.height='auto';
      main.style.overflowY='visible';
    }
  };
  fix();
  window.addEventListener('resize',fix,{passive:true});
})();