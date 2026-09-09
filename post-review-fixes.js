(()=>{
const U=window.U;if(!U)return;const S=U.state;
const style=document.createElement('style');style.id='undosPostReviewFixes';style.textContent=`
:root{--surface-soft:#F7F9FB;--ux-blue-soft:#EEF4F8;--ux-orange-soft:#FFF2EC;--ux-green-soft:#EAF7F1;--ux-red-soft:#FEF3F2;--shadow-soft:0 12px 34px rgba(16,38,59,.08);--shadow-hover:0 18px 44px rgba(16,38,59,.11)}
html[data-theme="dark"]{--surface-soft:#111821;--ux-blue-soft:#172737;--ux-orange-soft:#2a1b17;--ux-green-soft:#163126;--ux-red-soft:#351d20;--shadow-soft:0 12px 34px rgba(0,0,0,.22);--shadow-hover:0 18px 44px rgba(0,0,0,.30)}
`;
document.head.appendChild(style);

const schoolYear=()=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',year:'numeric'}).format(new Date()));
const baseOpen=U.openModal;
if(typeof baseOpen==='function')U.openModal=(title,html)=>{const out=baseOpen(title,html);if(title==='Nuevo año escolar'){const input=document.querySelector('#yearV2Form input[name="year"]');if(input)input.value=String(schoolYear()+1)}setTimeout(()=>{cleanAssignmentOptions();fixAdminCourseCards()},0);return out};

function cleanAssignmentOptions(){const form=document.querySelector('#assignmentV2Form');if(!form)return;const subjects=S.admin?.subjects||[],courses=S.admin?.courses||[];const subjectSelect=form.querySelector('select[name="subjectId"]'),courseSelect=form.querySelector('select[name="courseId"]');if(subjectSelect)[...subjectSelect.options].forEach(o=>{const s=subjects.find(x=>Number(x.id)===Number(o.value));if(s&&s.active===false)o.remove()});if(courseSelect)[...courseSelect.options].forEach(o=>{const c=courses.find(x=>Number(x.id)===Number(o.value));if(c&&c.active===false)o.remove()});if(subjectSelect&&subjectSelect.options.length&&!subjectSelect.value)subjectSelect.selectedIndex=0;if(courseSelect&&courseSelect.options.length&&!courseSelect.value)courseSelect.selectedIndex=0}

function fixAdminCourseCards(){if(S.page!=='admin-courses')return;const d=S.admin;if(!d?.courses)return;const grid=document.querySelector('#content .grid.cols-3');if(!grid)return;[...grid.children].forEach((card,i)=>{const c=d.courses[i];if(!c||!card.classList.contains('card'))return;const badge=card.querySelector('.badge');if(badge){badge.textContent=c.active===false?'Archivado':'Activo';badge.classList.toggle('ok',c.active!==false);badge.classList.toggle('danger',c.active===false)}const del=card.querySelector('[data-delete-course]');if(c.active===false&&del){del.dataset.reactivateCourse=del.dataset.deleteCourse;delete del.dataset.deleteCourse;del.classList.remove('danger');del.classList.add('secondary');del.textContent='Reactivar'}})}

async function reactivateCourse(id,button){const c=S.admin?.courses?.find(x=>Number(x.id)===Number(id));if(!c)return;if(!confirm(`¿Reactivar el curso “${c.name}” para el año actual?`))return;button.disabled=true;try{await U.api('/api/admin/courses',{method:'POST',body:{name:c.name,levelOrder:Number(c.level_order??c.levelOrder??0)}});U.toast('Curso reactivado');await U.renderAdminCourses()}catch(err){U.toast(err.message);button.disabled=false}}

document.addEventListener('click',e=>{const b=e.target.closest('[data-reactivate-course]');if(b){e.preventDefault();e.stopPropagation();reactivateCourse(b.dataset.reactivateCourse,b)}setTimeout(()=>{cleanAssignmentOptions();fixAdminCourseCards()},0)},true);

let previewRequest=0;
async function fixTeacherPreviewCount(){if(S.adminPreview?.sample||S.adminPreview?.role!=='teacher')return;const id=Number(S.adminPreview.user?.id);if(!id)return;const token=++previewRequest;try{const d=await U.api(`/api/admin/preview/teacher/${id}`);if(token!==previewRequest||S.adminPreview?.user?.id!==id)return;const stats=[...document.querySelectorAll('#content .stat')];const card=stats.find(x=>/Estudiantes/i.test(x.querySelector('span')?.textContent||''));const strong=card?.querySelector('strong');if(strong&&d.studentTotal!=null)strong.textContent=String(d.studentTotal)}catch{}}
const baseNav=U.navigate;
if(typeof baseNav==='function')U.navigate=async page=>{const out=await baseNav(page);setTimeout(()=>{fixTeacherPreviewCount();cleanAssignmentOptions();fixAdminCourseCards()},0);return out};
const content=document.querySelector('#content');if(content)new MutationObserver(()=>setTimeout(()=>{fixTeacherPreviewCount();cleanAssignmentOptions();fixAdminCourseCards()},0)).observe(content,{childList:true,subtree:false});
setTimeout(()=>{fixTeacherPreviewCount();cleanAssignmentOptions();fixAdminCourseCards()},50);
})();
