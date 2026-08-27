const jwt=require('jsonwebtoken');
const {pool}=require('./db');
const SECRET=process.env.JWT_SECRET||'dev-only-change-me';
function apiError(res,status,error,details=null){return res.status(status).json({error,details})}
function readCookie(req,name){const raw=req.headers.cookie||'',found=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`));return found?decodeURIComponent(found.slice(name.length+1)):null}
function setSession(res,user){const token=jwt.sign({id:user.id,role:user.role},SECRET,{expiresIn:'12h'}),secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`undos_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax${secure}`)}
function clearSession(res){const secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`undos_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`)}
async function auth(req,res,next){try{const token=readCookie(req,'undos_session');if(!token)return apiError(res,401,'Debes iniciar sesión');const p=jwt.verify(token,SECRET),{rows}=await pool.query('SELECT id,rut,full_name,role,active FROM users WHERE id=$1',[p.id]),u=rows[0];if(!u||!u.active)return apiError(res,401,'Sesión inválida');req.user=u;next()}catch{return apiError(res,401,'Sesión expirada o inválida')}}
const requireRole=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():apiError(res,403,'No tienes permiso para realizar esta acción');
module.exports={apiError,setSession,clearSession,auth,requireRole};
