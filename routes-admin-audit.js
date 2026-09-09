const express=require('express');
const {pool}=require('./db');
const {apiError,auth,requireRole}=require('./auth');
const {ensureAuditSchema}=require('./audit');
const r=express.Router();
r.use(auth,requireRole('admin'));

r.get('/audit-log',async(req,res)=>{
  try{
    await ensureAuditSchema();
    const q=String(req.query.q||'').trim(),action=String(req.query.action||'').trim(),entityType=String(req.query.entityType||'').trim(),actorId=Number(req.query.actorId||0),limit=Math.max(20,Math.min(500,Number(req.query.limit||250)));
    const where=[],params=[];
    if(q){params.push(`%${q}%`);where.push(`(al.description ILIKE $${params.length} OR COALESCE(u.full_name,'') ILIKE $${params.length} OR COALESCE(al.entity_id,'') ILIKE $${params.length})`)}
    if(action){params.push(action);where.push(`al.action=$${params.length}`)}
    if(entityType){params.push(entityType);where.push(`al.entity_type=$${params.length}`)}
    if(Number.isInteger(actorId)&&actorId>0){params.push(actorId);where.push(`al.actor_id=$${params.length}`)}
    params.push(limit);
    const sql=`SELECT al.id,al.actor_id,COALESCE(u.full_name,'Usuario eliminado') actor_name,al.actor_role,al.action,al.entity_type,al.entity_id,al.description,al.metadata,al.created_at
      FROM audit_log al LEFT JOIN users u ON u.id=al.actor_id ${where.length?'WHERE '+where.join(' AND '):''}
      ORDER BY al.created_at DESC LIMIT $${params.length}`;
    const [logs,actions,entities,actors,summary]=await Promise.all([
      pool.query(sql,params),
      pool.query('SELECT action,COUNT(*)::int total FROM audit_log GROUP BY action ORDER BY total DESC,action'),
      pool.query('SELECT entity_type,COUNT(*)::int total FROM audit_log GROUP BY entity_type ORDER BY total DESC,entity_type'),
      pool.query(`SELECT DISTINCT u.id,u.full_name,u.role FROM audit_log al JOIN users u ON u.id=al.actor_id ORDER BY u.full_name`),
      pool.query(`SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE created_at>=CURRENT_DATE)::int today,COUNT(*) FILTER(WHERE created_at>=NOW()-INTERVAL '7 days')::int last7,COUNT(DISTINCT actor_id)::int actors FROM audit_log`)
    ]);
    const s=summary.rows[0]||{};
    res.json({summary:{total:Number(s.total||0),today:Number(s.today||0),last7:Number(s.last7||0),actors:Number(s.actors||0)},logs:logs.rows.map(x=>({id:Number(x.id),actorId:x.actor_id?Number(x.actor_id):null,actorName:x.actor_name,actorRole:x.actor_role,action:x.action,entityType:x.entity_type,entityId:x.entity_id,description:x.description,metadata:x.metadata||{},createdAt:x.created_at})),actions:actions.rows,entities:entities.rows,actors:actors.rows});
  }catch(e){console.error(e);apiError(res,500,'No se pudo cargar el registro de cambios')}
});
module.exports=r;
