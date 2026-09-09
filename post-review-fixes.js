(()=>{
const U=window.U;if(!U)return;const S=U.state;
const style=document.createElement('style');style.id='undosPostReviewFixes';style.textContent=`
:root{--surface-soft:#F7F9FB;--ux-blue-soft:#EEF4F8;--ux-orange-soft:#FFF2EC;--ux-green-soft:#EAF7F1;--ux-red-soft:#FEF3F2;--shadow-soft:0 12px 34px rgba(16,38,59,.08);--shadow-hover:0 18px 44px rgba(16,38,59,.11)}
html[data-theme="dark"]{--surface-soft:#111821;--ux-blue-soft:#172737;--ux-orange-soft:#2a1b17;--ux-green-soft:#163126;--ux-red-soft:#351d20;--shadow-soft:0 12px 34px rgba(0,0,0,.22);--shadow-hover:0 18px 44px rgba(0,0,0,.30)}
`;
document.head.appendChild(style);

const schoolYear=()=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',year:'numeric'}).format(new Date()));
const baseOpen=U.openModal;
if(typeof baseOpen==='function')U.openModal=(title,html)=>{const out=baseOpen(title,html);if(title==='Nuevo año escolar'){const input=document.querySelector('#yearV2Form input[name="year"]');if(input)input.value=String(schoolYear()+1)}setTimeout(cleanAssignmentSubjectOptions,0);return out};

function cleanAssignmentSubjectOptions(){const select=document.querySelector('#assignmentV2Form select[name="subjectId"]');if(!select)return;const subjects=S.admin?.subjects||[];[...select.options].forEach(o=>{const s=subjects.find(x=>Number(x.id)===Number(o.value));if(s&&s.active===false)o.remove()});if(select.options.length&&!select.value)select.selectedIndex=0}

document.addEventListener('click',()=>setTimeout(cleanAssignmentSubjectOptions,0),true);

let previewRequest=0;
async function fixTeacherPreviewCount(){
  if(S.adminPreview?.sample||S.adminPreview?.role!=='teacher')return;
  const id=Number(S.adminPreview.user?.id);if(!id)return;const token=++previewRequest;
  try{const d=await U.api(`/api/admin/preview/teacher/${id}`);if(token!==previewRequest||S.adminPreview?.user?.id!==id)return;const stats=[...document.querySelectorAll('#content .stat')];const card=stats.find(x=>/Estudiantes/i.test(x.querySelector('span')?.textContent||''));const strong=card?.querySelector('strong');if(strong&&d.studentTotal!=null)strong.textContent=String(d.studentTotal)}catch{}
}
const baseNav=U.navigate;
if(typeof baseNav==='function')U.navigate=async page=>{const out=await baseNav(page);setTimeout(fixTeacherPreviewCount,0);return out};
const content=document.querySelector('#content');if(content)new MutationObserver(()=>setTimeout(fixTeacherPreviewCount,0)).observe(content,{childList:true,subtree:false});
setTimeout(fixTeacherPreviewCount,50);
})();
