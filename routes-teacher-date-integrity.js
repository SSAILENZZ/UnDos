const express=require('express');
const {apiError,auth,requireRole}=require('./auth');
const {chileDate,chileMonth,validDate,validMonth}=require('./date-utils');
const r=express.Router();
r.use(auth,requireRole('teacher'));

r.get('/calendar',(req,res,next)=>{
  const raw=req.query.month==null?'':String(req.query.month);
  if(raw&&!validMonth(raw))return apiError(res,400,'Mes inválido');
  if(!raw)req.query.month=chileMonth();
  next();
});
r.get('/assignments/:id/attendance',(req,res,next)=>{
  const raw=req.query.date==null?'':String(req.query.date);
  if(raw&&!validDate(raw))return apiError(res,400,'Fecha inválida');
  if(!raw)req.query.date=chileDate();
  next();
});
r.post('/assignments/:id/attendance',(req,res,next)=>{
  if(!validDate(req.body?.date))return apiError(res,400,'Fecha inválida');
  next();
});
r.post('/assignments/:id/evaluations',(req,res,next)=>{
  const date=req.body?.date;if(date!=null&&date!==''&&!validDate(date))return apiError(res,400,'La fecha de la evaluación no es válida');
  next();
});
r.patch('/evaluations/:id',(req,res,next)=>{
  if(req.body?.date!==undefined&&req.body.date!==null&&req.body.date!==''&&!validDate(req.body.date))return apiError(res,400,'La fecha de la evaluación no es válida');
  next();
});
r.post('/assignments/:id/contents',(req,res,next)=>{
  if(!validDate(req.body?.date))return apiError(res,400,'Indica una fecha válida');
  next();
});
r.patch('/contents/:id',(req,res,next)=>{
  if(req.body?.date!==undefined&&!validDate(req.body.date))return apiError(res,400,'Fecha de contenido inválida');
  next();
});
module.exports=r;
