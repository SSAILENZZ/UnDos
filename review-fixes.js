(()=>{
const U=window.U,$=U.$,S=U.state;
const pad=n=>String(n).padStart(2,'0');
const schoolParts=(date=new Date())=>{const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),get=t=>parts.find(p=>p.type===t)?.value;return {year:Number(get('year')),month:Number(get('month')),day:Number(get('day'))}};
const schoolToday=()=>{const p=schoolParts();return `${p.year}-${pad(p.month)}-${pad(p.day)}`};
const schoolMonth=()=>{const p=schoolParts();return `${p.year}-${pad(p.month)}`};

const style=document.createElement('style');style.textContent=`
/* Revisión final: consistencia de navegación, calendario y responsividad */
.nav-btn{min-width:0}.nav-btn span:last-child{min-width:0}.student-cal-toolbar>*,.student-cal-month,.student-cal-filters{min-width:0}.student-cal-filters select{max-width:220px}.dash-subject>*,.dash-course-top>*,.profile-subject>*{min-width:0}
@media(max-width:650px){.student-cal-toolbar{align-items:flex-start}.student-cal-filters{width:100%;display:grid;grid-template-columns:1fr}.student-cal-filters select{width:100%;max-width:none}.student-cal-month{flex-wrap:wrap}.gs-result-actions .btn{width:100%}.notify-toolbar{align-items:flex-start;flex-direction:column}.notify-toolbar .btn{width:100%}}
`;document.head.appendChild(style);

const order={
 student:['student-home','student-dashboard','student-attendance','student-calendar','communications','student-profile','student-history'],
 teacher:['teacher-home','teacher-dashboard','teacher-calendar','teacher-planning','communications','teacher-history'],
 admin:['admin-home','admin-dashboard','admin-search','admin-users','admin-courses','admin-subjects','admin-communications','admin-statistics','admin-promotion','admin-exports','admin-audit','admin-years','admin-history']
};
function normalizeNav(){if(!S.user||S.adminPreview)return;const nav=$('#nav'),wanted=order[S.user.role];if(!nav||!wanted)return;let anchor=nav.querySelector('.nav-title');for(const page of wanted){const el=nav.querySelector(`[data-page="${page}"]`);if(!el)continue;if(anchor?.nextElementSibling!==el)anchor.after(el);anchor=el}}

function polishStudentCalendar(){
  const d=S.studentCalendar;if(!d||!$('#studentCalGrid'))return;
  const today=schoolToday(),future=(d.evaluations||[]).filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||String(a.subjectName||'').localeCompare(String(b.subjectName||''),'es'));
  const stats=[...document.querySelectorAll('.student-cal-stat')];if(stats[1]){const label=stats[1].querySelector('small'),value=stats[1].querySelector('strong');if(label)label.textContent='Próximas en este mes';if(value)value.textContent=String(future.length)}
  const side=$('.student-cal-side');if(side){const head=side.querySelector('.student-cal-side-head');if(head){const h=head.querySelector('h2'),p=head.querySelector('p');if(h)h.textContent='Evaluaciones restantes del mes';if(p)p.textContent='Fechas pendientes dentro del mes que estás revisando.'}side.querySelectorAll('.student-upcoming,.empty').forEach(x=>x.remove());side.insertAdjacentHTML('beforeend',future.length?future.slice(0,10).map(e=>`<div class="student-upcoming"><div class="date">${U.fmtDate(e.date)}</div><strong>${U.esc(e.name)}</strong><small>${U.esc(e.subjectName)} · Prof. ${U.esc(e.teacherName||'—')} · ${Number(e.weight)}%</small></div>`).join(''):'<div class="empty">No quedan evaluaciones en este mes.</div>')}
  const days=[...document.querySelectorAll('.student-cal-day')];days.forEach(x=>x.classList.remove('today'));const [y,m]=String(d.month||'').split('-').map(Number),p=schoolParts();if(y===p.year&&m===p.month&&days.length){const firstDow=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7,idx=firstDow+p.day-1;if(days[idx])days[idx].classList.add('today')}
}

function polishDashboard(){const d=S.dashboard;if(d?.role!=='student')return;const rows=[...document.querySelectorAll('.dash-subject')];rows.forEach((row,i)=>{const subject=d.subjects?.[i],bar=row.querySelector('.dash-mini-progress i');if(!subject||!bar)return;const ap=Math.max(0,Math.min(100,Number(subject.attendancePercentage||0)));bar.style.width=`${ap}%`;bar.title=subject.attendancePercentage==null?'Sin asistencia registrada':`${Number(subject.attendancePercentage).toFixed(1)}% de asistencia`})}

const baseShell=U.renderShell;U.renderShell=()=>{baseShell();setTimeout(normalizeNav,0)};
if(typeof U.renderStudentCalendar==='function'){const base=U.renderStudentCalendar;U.renderStudentCalendar=async(...args)=>{const out=await base(...args);polishStudentCalendar();normalizeNav();return out}}
if(typeof U.renderDashboard==='function'){const base=U.renderDashboard;U.renderDashboard=async(...args)=>{const out=await base(...args);polishDashboard();normalizeNav();return out}}
const nav=$('#nav');if(nav)new MutationObserver(()=>setTimeout(normalizeNav,0)).observe(nav,{childList:true});
document.addEventListener('click',e=>{if(S.user?.role==='student'&&!S.adminPreview&&e.target.closest('[data-student-cal-today]')&&S.studentCalendar?.month!==schoolMonth()){e.preventDefault();e.stopImmediatePropagation();U.renderStudentCalendar(schoolMonth())}},true);
const content=$('#content');if(content)new MutationObserver(()=>setTimeout(()=>{normalizeNav();if(S.page==='student-calendar')polishStudentCalendar();if(S.page==='student-dashboard')polishDashboard()},0)).observe(content,{childList:true,subtree:false});
setTimeout(normalizeNav,0);
})();
