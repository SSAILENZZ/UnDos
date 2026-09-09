const express=require('express');
const {apiError,auth,requireRole}=require('./auth');
const {buildStudentProfile}=require('./student-profile-data');
const r=express.Router();
r.use(auth,requireRole('student'));

r.get('/profile',async(req,res)=>{
  try{
    const d=await buildStudentProfile(req.user.id);
    if(!d)return apiError(res,404,'No se encontró tu perfil de estudiante');
    res.json(d);
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar tu perfil')}
});

module.exports=r;
