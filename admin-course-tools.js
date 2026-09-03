(()=>{
const U=window.U,$=U.$,S=U.state;
const base=U.renderAdminCourses;
if(typeof base!=='function')return;
const style=document.createElement('style');style.textContent=`
.course-admin-actions{display:flex;gap:7px;align-items:center;margin-top:16px;padding-top:13px;border-top:1px solid var(--line)}
.course-admin-actions .btn{flex:1}.course-admin-card{position:relative;overflow:hidden}.course-admin-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(var(--orange),#ff8a54)}
.course-admin-card .course-card{padding-left:5px}.course-delete-hint{font-size:11px;color:var(--muted);line-height:1.45;margin:0}
`;document.head.appendChild(style);

U.renderAdminCourses=async()=>{
  await base();
  const d=S.admin;if(!d)return;
  const grid=$('#content .grid.cols-3');if(!grid)return;
  [...grid.children].forEach((card,i)=>{
    const c=d.courses[i];if(!c||!card.classList.contains('card'))return;
    card.classList.add('course-admin-card');
    card.insertAdjacentHTML('beforeend',`<div class="course-admin-actions"><button type="button" class="btn small secondary" data-edit-course="${c.id}">Editar</button><button type="button" class="btn small danger" data-delete-course="${c.id}">Borrar</button></div>`);
  });
  $('#content').addEventListener('click',async e=>{
    const edit=e.target.closest('[data-edit-course]'),del=e.target.closest('[data-delete-course]');
    if(edit){e.preventDefault();e.stopPropagation();const c=d.courses.find(x=>x.id===Number(edit.dataset.editCourse));if(c)openEdit(c);return}
    if(del){e.preventDefault();e.stopPropagation();const c=d.courses.find(x=>x.id===Number(del.dataset.deleteCourse));if(!c)return;if(!confirm(`¿Borrar el curso “${c.name}”?\n\nSi tiene estudiantes, clases o historial, se archivará en vez de eliminarse definitivamente.`))return;del.disabled=true;try{const out=await U.api(`/api/admin/courses/${c.id}`,{method:'DELETE'});U.toast(out.message||'Curso eliminado');await U.renderAdminCourses()}catch(err){U.toast(err.message);del.disabled=false}}
  });
};
function openEdit(c){
  U.openModal('Editar curso',`<form id="editCourseForm" class="stack"><div class="field"><label>Nombre del curso</label><input name="name" value="${U.esc(c.name)}" required></div><div class="field"><label>Orden en la lista</label><input name="levelOrder" type="number" value="${Number(c.level_order??c.levelOrder??0)}"></div><p class="course-delete-hint">Cambiar el nombre no afecta las notas, asistencia ni el historial ya guardado.</p><div class="form-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn primary">Guardar cambios</button></div></form>`);
  const f=$('#editCourseForm');f.onsubmit=async e=>{e.preventDefault();const x=new FormData(f),btn=f.querySelector('.btn.primary');if(btn){btn.disabled=true;btn.textContent='Guardando…'}try{await U.api(`/api/admin/courses/${c.id}`,{method:'PATCH',body:{name:x.get('name'),levelOrder:Number(x.get('levelOrder'))}});U.closeModal();U.toast('Curso actualizado');await U.renderAdminCourses()}catch(err){U.toast(err.message);if(btn){btn.disabled=false;btn.textContent='Guardar cambios'}}};const close=$('[data-close]');if(close)close.onclick=U.closeModal;
}
})();
