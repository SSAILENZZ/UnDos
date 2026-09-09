const express=require('express');
const {pool}=require('./db');
const {apiError,auth}=require('./auth');
const {ensureNotificationSchema,syncUpcomingEvaluations}=require('./notifications-data');
const r=express.Router();
r.use(auth);

function mapRow(x){return {id:x.id,type:x.type,priority:x.priority,title:x.title,body:x.body,linkPage:x.link_page||null,entityType:x.entity_type||null,entityId:x.entity_id||null,read:!!x.read_at,readAt:x.read_at||null,createdAt:x.created_at}}

r.get('/',async(req,res)=>{
  try{
    await ensureNotificationSchema();
    if(req.user.role==='student')await syncUpcomingEvaluations(req.user.id).catch(e=>console.error('notification reminder sync:',e.message));
    const limit=Math.max(1,Math.min(100,Number(req.query.limit)||50));
    const [items,count]=await Promise.all([
      pool.query(`SELECT id,type,priority,title,body,link_page,entity_type,entity_id,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY read_at NULLS FIRST,created_at DESC LIMIT $2`,[req.user.id,limit]),
      pool.query('SELECT COUNT(*)::int unread FROM notifications WHERE user_id=$1 AND read_at IS NULL',[req.user.id])
    ]);
    res.json({unread:Number(count.rows[0]?.unread||0),notifications:items.rows.map(mapRow)});
  }catch(e){console.error(e);apiError(res,500,'No se pudieron cargar las notificaciones')}
});

r.post('/read-all',async(req,res)=>{try{await ensureNotificationSchema();await pool.query('UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE user_id=$1',[req.user.id]);res.json({ok:true,unread:0})}catch(e){console.error(e);apiError(res,500,'No se pudieron marcar las notificaciones')}});
r.post('/:id/read',async(req,res)=>{try{await ensureNotificationSchema();const id=Number(req.params.id);if(!Number.isInteger(id))return apiError(res,400,'Notificación inválida');const q=await pool.query('UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2 RETURNING id',[id,req.user.id]);if(!q.rows[0])return apiError(res,404,'Notificación no encontrada');const c=await pool.query('SELECT COUNT(*)::int unread FROM notifications WHERE user_id=$1 AND read_at IS NULL',[req.user.id]);res.json({ok:true,unread:Number(c.rows[0]?.unread||0)})}catch(e){console.error(e);apiError(res,500,'No se pudo actualizar la notificación')}});

module.exports=r;