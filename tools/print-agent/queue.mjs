import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
const text=(v,n=120)=>typeof v==='string'&&v.length>0&&v.length<=n&&!/[\x00-\x1f\x7f]/.test(v);
export function ticket(value,venueId){
 const t=value;
 if(!t||t.venueId!==venueId||![t.id,t.orderId,t.sectionId,t.sectionName,t.tableNumber,t.createdAt].every(v=>text(v))||!Number.isFinite(Date.parse(t.createdAt))||!Number.isSafeInteger(t.routeRevision)||t.routeRevision<0||t.printerId!==null&&!text(t.printerId)||!['PREPARATION','CANCELLATION','TEST'].includes(t.kind)||!Array.isArray(t.lines)||!t.lines.length||t.lines.length>100||t.lines.some(l=>!text(l.name,300)||!Number.isSafeInteger(l.quantity)||l.quantity<1||l.quantity>999))throw Error('Invalid ticket');
 if(t.kind==='CANCELLATION'&&(!text(t.originalTicketId)||!text(t.reason,500)))throw Error('Invalid cancellation');
 if(t.kind!=='CANCELLATION'&&(t.originalTicketId!=null||t.reason!=null))throw Error('Unexpected cancellation fields');
 return {id:t.id,venueId,orderId:t.orderId,tableNumber:t.tableNumber,sectionId:t.sectionId,sectionName:t.sectionName,printerId:t.printerId,routeRevision:t.routeRevision,kind:t.kind,originalTicketId:t.originalTicketId??null,reason:t.reason??null,createdAt:t.createdAt,lines:t.lines.map(l=>({name:l.name,quantity:l.quantity}))};
}
export class Queue {
 constructor(path,venueId){
  if(!Number.isSafeInteger(venueId)||venueId<=0)throw Error('Invalid venue');this.venueId=venueId;this.owner=new DatabaseSync(path+'.owner.sqlite');try{this.owner.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE')}catch(e){this.owner.close();throw Error('Agent already running')}this.db=new DatabaseSync(path);
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1),venue INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS jobs(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,payload TEXT NOT NULL,hash TEXT NOT NULL,printer TEXT,status TEXT NOT NULL,copy_of TEXT,detail TEXT,endpoint TEXT);
   CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,job TEXT,action TEXT NOT NULL,at TEXT NOT NULL,detail TEXT);`);
  this.db.prepare('INSERT OR IGNORE INTO settings VALUES(1,?)').run(venueId);
  if(this.db.prepare('SELECT venue FROM settings').get().venue!==venueId){this.close();throw Error('Queue belongs to another venue')}
 }
 close(){this.db.close();this.owner.close()}
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r}catch(e){this.db.exec('ROLLBACK');throw e}}
 audit(id,action,detail=''){this.db.prepare('INSERT INTO audit(job,action,at,detail) VALUES(?,?,?,?)').run(id,action,new Date().toISOString(),detail)}
 list(){return this.db.prepare('SELECT jobs.* FROM jobs ORDER BY COALESCE((SELECT seq FROM jobs parent WHERE parent.id=jobs.copy_of),jobs.seq),jobs.seq').all()}
 get(id){const j=this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id);if(!j)throw Error('Unknown job');return j}
 import(batch){return this.transaction(()=>{
  if(batch?.version!==1||batch.venueId!==this.venueId||!Array.isArray(batch.tickets)||batch.tickets.length>1000)throw Error('Invalid import');
  for(const raw of batch.tickets){const t=ticket(raw,this.venueId),payload=JSON.stringify(t),hash=createHash('sha256').update(payload).digest('hex');
   const prior=this.db.prepare('SELECT hash FROM jobs WHERE id=?').get(t.id);if(prior){if(prior.hash!==hash)throw Error('Ticket ID payload conflict');continue}
   if(t.originalTicketId){const original=JSON.parse(this.get(t.originalTicketId).payload);if(original.kind!=='PREPARATION'||['printerId','routeRevision','sectionId','orderId'].some(k=>original[k]!==t[k]))throw Error('Cancellation route mismatch')}
   this.db.prepare('INSERT INTO jobs(id,payload,hash,printer,status) VALUES(?,?,?,?,?)').run(t.id,payload,hash,t.printerId,t.printerId?'pending':'unconfigured');this.audit(t.id,'import');
  }
 })}
 recover(){return this.transaction(()=>{for(const j of this.list().filter(j=>j.status==='sending')){this.db.prepare("UPDATE jobs SET status='outcome_unknown',detail='Process stopped during send; inspect device before any copy' WHERE id=?").run(j.id);this.audit(j.id,'recovered_unknown')}})}
 async runOne(config,transport){
  const rows=this.list();const j=rows.find((j,i)=>j.status==='pending'&&!rows.slice(0,i).some(prior=>prior.printer===j.printer&&!['accepted_by_transport','operator_confirmed','operator_resolved'].includes(prior.status)));
  if(!j)return false;
  let endpoint;
  // Freeze the local endpoint on first attempt. Reconfiguration cannot silently reroute a retry/copy/cancellation.
  let frozen=j.endpoint;
  const payload=JSON.parse(j.payload);
  const source=j.copy_of||payload.originalTicketId;
  if(source){const parent=this.get(source);if(!['accepted_by_transport','operator_confirmed','operator_resolved'].includes(parent.status))return false;frozen=parent.endpoint||frozen}
  try{if(!frozen){endpoint=config(j.printer);if(!endpoint)throw Error('Printer mapping missing');frozen=JSON.stringify(endpoint)}}catch(e){this.finish(j.id,'failed_before_send',e.message);return true}
  this.transaction(()=>{this.db.prepare("UPDATE jobs SET status='sending',endpoint=? WHERE id=? AND status='pending'").run(frozen,j.id);this.audit(j.id,'sending')});
  try{const result=await transport(JSON.parse(frozen),payload,Boolean(j.copy_of));this.finish(j.id,'accepted_by_transport',String(result??'Accepted by transport; paper output unverified'))}
  catch(e){this.finish(j.id,e.beforeSend===true?'failed_before_send':'outcome_unknown',String(e.message).slice(0,500))}
  return true;
 }
 finish(id,status,detail){this.transaction(()=>{this.db.prepare('UPDATE jobs SET status=?,detail=? WHERE id=?').run(status,detail,id);this.audit(id,status,detail)})}
 retry(id){const j=this.get(id);if(j.status!=='failed_before_send')throw Error('Only a proven pre-send failure can retry');this.finish(id,'pending','Explicit retry')}
 confirm(id,note){if(!text(note,500))throw Error('Observation required');const j=this.get(id);if(!['accepted_by_transport','outcome_unknown'].includes(j.status))throw Error('Job not sent');this.finish(id,'operator_confirmed',note)}
 copy(id,note){if(!text(note,500))throw Error('Reason required');return this.transaction(()=>{const j=this.get(id);if(j.copy_of||!['accepted_by_transport','outcome_unknown','operator_confirmed'].includes(j.status))throw Error('Copy requires an original sent job; further copies need operator review');const copyId='copy:'+randomUUID();this.db.prepare('INSERT INTO jobs(id,payload,hash,printer,status,copy_of,endpoint) VALUES(?,?,?,?,?,?,?)').run(copyId,j.payload,j.hash,j.printer,'pending',id,j.endpoint);this.db.prepare("UPDATE jobs SET status='operator_resolved',detail=? WHERE id=?").run('Copy explicitly requested; original paper outcome not asserted: '+note,id);this.audit(id,'copy_requested',copyId+': '+note);return copyId})}
}
