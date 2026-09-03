(()=>{
const KEY='undos-theme';
const root=document.documentElement;
const stored=localStorage.getItem(KEY);root.dataset.theme=stored==='dark'?'dark':'light';
function label(){return root.dataset.theme==='dark'?'☀ Claro':'☾ Oscuro'}
function apply(next){root.dataset.theme=next;localStorage.setItem(KEY,next);document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.textContent=label();b.setAttribute('aria-label',next==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro')});const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=next==='dark'?'#0d131b':'#07375A'}
function toggle(){apply(root.dataset.theme==='dark'?'light':'dark')}
function makeButton(cls=''){const b=document.createElement('button');b.type='button';b.className=`theme-toggle ${cls}`;b.dataset.themeToggle='1';b.textContent=label();b.onclick=toggle;return b}
const top=document.querySelector('.topbar');if(top&&!top.querySelector('[data-theme-toggle]'))top.appendChild(makeButton());
const login=document.querySelector('.login-side');if(login&&!login.querySelector('[data-theme-toggle]'))login.appendChild(makeButton('theme-login-toggle'));
window.addEventListener('storage',e=>{if(e.key===KEY&&['light','dark'].includes(e.newValue))apply(e.newValue)});
})();
