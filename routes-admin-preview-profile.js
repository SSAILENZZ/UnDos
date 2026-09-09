const express=require('express');
const {apiError,auth,requireRole}=require('./auth');
const {buildStudentProfile}=require('./student-profile-data');
const r=express.Router();
r.use(auth,requireRole('admin'));

r.get('/student/:id/profile',async(req,res)=>{
  try{
    const d=await buildStudentProfile(req.params.id);
    if(!d||!d.user.active)return apiError(res,404,'Estudiante no encontrado');
    res.json(d);
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar el perfil del estudiante')}
});

module.exports=r;
