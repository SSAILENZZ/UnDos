const express=require('express');
const {auth,requireRole}=require('./auth');
const {notifyAnnouncement,notifyEvaluation,notifyGrades}=require('./notifications-data');
const r=express.Router();

function captureJson(res){let payload=null;const base=res.json.bind(res);res.json=data=>{payload=data;return base(data)};return ()=>payload}
function afterSuccess(res,fn){res.once('finish',()=>{if(res.statusCode>=200&&res.statusCode<300)Promise.resolve().then(fn).catch(e=>console.error('notification hook:',e.message))})}

r.post('/communications/admin',auth,requireRole('admin'),(req,res,next)=>{const get=captureJson(res);afterSuccess(res,async()=>{const d=get();if(d?.id)await notifyAnnouncement(d.id)});next()});
r.post('/teacher/assignments/:id/evaluations',auth,requireRole('teacher'),(req,res,next)=>{const get=captureJson(res);afterSuccess(res,async()=>{const d=get();if(d?.id)await notifyEvaluation(d.id,{updated:false})});next()});
r.patch('/teacher/evaluations/:id',auth,requireRole('teacher'),(req,res,next)=>{afterSuccess(res,async()=>{await notifyEvaluation(Number(req.params.id),{updated:true})});next()});
r.post('/teacher/evaluations/:id/grades',auth,requireRole('teacher'),(req,res,next)=>{afterSuccess(res,async()=>{await notifyGrades(Number(req.params.id),req.body?.grades)});next()});

module.exports=r;