(()=>{
const U=window.U;if(!U)return;const $=U.$,S=U.state;
const pad=n=>String(n).padStart(2,'0');
const schoolMonth=()=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',year:'numeric',month:'2-digit'}).formatToParts(new Date()),get=t=>parts.find(p=>p.type===t)?.value;return `${get('year')}-${pad(Number(get('month')))}`};

function ensureCalendarNav(){
  const nav=$('#nav');if(!nav||!S.user||S.adminPreview)return;
  if(S.user.role==='student'&&!nav.querySelector('[data-page="student-calendar"]')){
    const b=document.createElement('button');b.type='button';b.className='nav-btn';b.dataset.page='student-calendar';b.innerHTML='<span class="nav-icon">▣</span><span>Calendario</span>';
    const attendance=nav.querySelector('[data-page="student-attendance"]'),communications=nav.querySelector('[data-page="communications"]'),history=nav.querySelector('[data-page="student-history"]');
    if(attendance)attendance.after(b);else nav.insertBefore(b,communications||history||null);
  }
  if(S.user.role==='teacher'&&!nav.querySelector('[data-page="teacher-calendar"]')){
    const b=document.createElement('button');b.type='button';b.className='nav-btn';b.dataset.page='teacher-calendar';b.innerHTML='<span class="nav-icon">▣</span><span>Calendario</span>';
    const home=nav.querySelector('[data-page="teacher-home"]'),planning=nav.querySelector('[data-page="teacher-planning"]'),communications=nav.querySelector('[data-page="communications"]'),history=nav.querySelector('[data-page="teacher-history"]');
    if(home)home.after(b);else nav.insertBefore(b,planning||communications||history||null);
  }
}

function setLoading(page,label){
  S.page=page;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const c=$('#content');if(c)c.innerHTML=`<div class="card empty" aria-live="polite">Cargando ${label}…</div>`;
}
function renderError(page,title,error){
  const c=$('#content');if(!c)return;c.innerHTML=`<div class="card"><h2>${U.esc(title)}</h2><p class="form-error">${U.esc(error?.message||'No se pudo abrir el calendario.')}</p><button type="button" class="btn ghost" id="calendarRouteRetry">Reintentar</button></div>`;
  const r=$('#calendarRouteRetry');if(r)r.onclick=()=>U.navigate(page);
}

const previousNavigate=U.navigate;
U.navigate=async page=>{
  if(page==='student-calendar'){
    setLoading(page,'calendario');
    try{
      if(typeof U.renderStudentCalendar!=='function')throw new Error('El calendario del estudiante no terminó de cargar. Recarga la página e inténtalo nuevamente.');
      return await U.renderStudentCalendar(S.studentCalendarMonth||schoolMonth());
    }catch(e){renderError(page,'No se pudo cargar el calendario',e);return;}
  }
  if(page==='teacher-calendar'){
    setLoading(page,'calendario docente');
    try{
      if(typeof U.renderTeacherCalendar!=='function')throw new Error('El calendario docente no terminó de cargar. Recarga la página e inténtalo nuevamente.');
      return await U.renderTeacherCalendar(S.teacherCalendarMonth||schoolMonth());
    }catch(e){renderError(page,'No se pudo cargar el calendario docente',e);return;}
  }
  return previousNavigate(page);
};

const previousShell=U.renderShell;
U.renderShell=()=>{previousShell();setTimeout(ensureCalendarNav,0)};
const nav=$('#nav');if(nav)new MutationObserver(()=>setTimeout(ensureCalendarNav,0)).observe(nav,{childList:true});
document.addEventListener('click',()=>setTimeout(ensureCalendarNav,0),true);
setTimeout(ensureCalendarNav,0);
})();
