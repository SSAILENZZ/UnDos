const {pool}=require('./db');
let ready=null;
function ensureAuditSchema(){
  if(!ready)ready=pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log(
      id BIGSERIAL PRIMARY KEY,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      description TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type,entity_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action,created_at DESC);
  `).catch(e=>{ready=null;throw e});
  return ready;
}
async function recordAudit({actorId=null,actorRole=null,action,entityType,entityId=null,description,metadata={}}){
  try{
    await ensureAuditSchema();
    await pool.query('INSERT INTO audit_log(actor_id,actor_role,action,entity_type,entity_id,description,metadata) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',[
      actorId||null,actorRole||null,String(action||'unknown').slice(0,80),String(entityType||'system').slice(0,80),entityId==null?null:String(entityId).slice(0,120),String(description||'Cambio registrado').slice(0,1000),JSON.stringify(metadata||{})
    ]);
  }catch(e){console.error('Audit log error:',e.message)}
}
module.exports={ensureAuditSchema,recordAudit};
