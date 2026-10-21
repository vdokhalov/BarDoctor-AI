/** Tenant policy for the existing bounded-part engine. No live restore/cutover. */
import {createChunkedBackup,CHUNK_CONTRACT,type ChunkPolicy,type BackupContract,type Manifest} from './qa-chunked-backup';
import {BUSINESS_TABLES,QA_BACKUP_CONTRACT,identityTables,emptyOnlyTables,derivedReadTables,UNVERIFIED_OUTSIDE_CONTRACT,backupDigest,backupFail,type QaScope} from './qa-pos-backup';
import {stableSalesValue} from './sales-events';

type Row=Record<string,any>;
const fail:(code:string)=>never=backupFail;
export const BUSINESS_BACKUP_TABLES=[...BUSINESS_TABLES,'journal_migration_runs_v2','journal_migration_log_v2'];
const table='venue_business_backup_runs';
const clock="strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const lease="strftime('%Y-%m-%dT%H:%M:%fZ','now','+120 seconds')";
const quote=(value:string)=>{if(!/^[a-z_][a-z0-9_]*$/.test(value))fail('SCHEMA_NAME');return '"'+value+'"';};
export function businessBackupContract(scope:{accountId:number;venueId:number}):BackupContract {
 if(!Number.isSafeInteger(scope.accountId)||scope.accountId<1||!Number.isSafeInteger(scope.venueId)||scope.venueId<1)fail('SCOPE');
 return {...CHUNK_CONTRACT,version:'venue-business-contract-v1',scope:{accountId:scope.accountId,venueId:scope.venueId},
  businessTables:BUSINESS_BACKUP_TABLES,
  schemaTables:[...BUSINESS_BACKUP_TABLES,...emptyOnlyTables,'accounts','venues','workspaces'].sort(),
  assetPrefixes:['venues','purchases','sales','catalog','employees'].map(p=>p+'/'+scope.accountId+'/')};
}
export function businessBackupPolicy(scope:{accountId:number;venueId:number}):ChunkPolicy {
 const contract=businessBackupContract(scope);
 const check=(s:QaScope)=>{if(s.accountId!==scope.accountId||s.venueId!==scope.venueId||!Number.isSafeInteger(s.actorId)||s.actorId<1)fail('SCOPE_FORBIDDEN');};
 const ownerSql="SELECT v.* FROM venues v JOIN accounts d ON d.id=v.data_account_id JOIN accounts a ON a.id=? AND a.account_kind='user' JOIN venue_memberships m ON m.venue_id=v.id AND m.account_id=a.id AND m.status='active' AND m.role='owner' JOIN workspace_memberships wm ON wm.workspace_id=v.workspace_id AND wm.account_id=a.id AND wm.status='active' JOIN workspaces w ON w.id=v.workspace_id AND w.status='active' WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND d.account_kind IN ('user','venue_data') AND (SELECT count(*) FROM venues WHERE data_account_id=v.data_account_id)=1";
 const ownerGuard=(db:D1Database,s:QaScope)=>{check(s);return db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__business_backup_owner_guard__',NULL WHERE NOT EXISTS("+ownerSql+")").bind(scope.accountId,s.actorId,scope.venueId,scope.accountId);};
 const authorizeQaBackup=async(db:D1Database,s:QaScope)=>{check(s);const value=await db.prepare(ownerSql).bind(s.actorId,scope.venueId,scope.accountId).first<Row>();if(!value)fail('OWNER_OR_ISOLATION');return value;};
 const run=async(db:D1Database,expected?:string)=>{const r=await db.prepare('SELECT * FROM '+table+' WHERE venue_id=? AND account_id=?').bind(scope.venueId,scope.accountId).first<Row>();if(expected&&r?.run_id!==expected)fail('RUN_CHANGED');return r;};
 const revisionGuard=(db:D1Database,r:Row,requireLease:boolean)=>db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__business_backup_run_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM "+table+" WHERE venue_id=? AND account_id=? AND run_id=? AND revision=? AND phase=? AND paused=?"+(requireLease?' AND (paused=0 OR expires_at>'+clock+')':'')+')').bind(scope.accountId,scope.venueId,scope.accountId,r.run_id,r.revision,r.phase,r.paused);
 const runGuard=(db:D1Database,r:Row)=>revisionGuard(db,r,true);
 const legacyStatus=async(db:D1Database,s:QaScope)=>{await authorizeQaBackup(db,s);const r=await run(db);return {scope,run:r,pos:null,expired:Boolean(r?.paused&&Date.parse(r.expires_at)<=Date.now())};};
 const abortQaBackup=async(db:D1Database,s:QaScope,expected?:string)=>{await authorizeQaBackup(db,s);const r=await run(db,expected);if(!r)return legacyStatus(db,s);await db.batch([ownerGuard(db,s),revisionGuard(db,r,false),db.prepare("UPDATE "+table+" SET phase='ABORTED',paused=0,expires_at=NULL,revision=revision+1 WHERE run_id=?").bind(r.run_id)]);return legacyStatus(db,s);};
 const recognized=(name:string)=>identityTables.has(name)||derivedReadTables.has(name)||contract.schemaTables.includes(name)||(UNVERIFIED_OUTSIDE_CONTRACT as readonly string[]).includes(name);
 const contractSchemaHash=async(schema:Record<string,unknown>[])=>{
  const names=schema.filter(e=>e.type==='table').map(e=>String(e.name));for(const name of names)if(!recognized(name))fail('UNCLASSIFIED_TABLE_'+name);
  if(contract.schemaTables.some(name=>!names.includes(name)))fail('CONTRACT_TABLE_MISSING');
  return backupDigest(stableSalesValue({contract,schema:schema.filter(e=>contract.schemaTables.includes(String(e.tbl_name)))}));
 };
 const census=async(db:D1Database,s:QaScope)=>{
  await authorizeQaBackup(db,s);
  const schema=(await db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name").all<Row>()).results;
  const names=schema.filter(e=>e.type==='table').map(e=>String(e.name)),unknownTables=names.filter(name=>!recognized(name)),missingTables=contract.schemaTables.filter(name=>!names.includes(name)),counts:Record<string,number>={};
  for(const name of emptyOnlyTables){
   if(!names.includes(name))continue;
   if(name==='notification_job_events'){counts[name]=Number(await db.prepare('SELECT count(*) n FROM notification_job_events e JOIN notification_jobs j ON j.id=e.job_id WHERE j.venue_id=? OR j.account_id=?').bind(scope.venueId,scope.accountId).first('n'));continue;}
   const cols=(await db.prepare('PRAGMA table_info('+quote(name)+')').all<{name:string}>()).results.map(x=>x.name),fields=cols.filter(c=>['data_account_id','account_id','venue_id'].includes(c));
   if(!fields.length)fail('UNCLASSIFIED_TABLE_'+name);
   counts[name]=Number(await db.prepare('SELECT count(*) n FROM '+quote(name)+' WHERE '+fields.map(c=>quote(c)+'=?').join(' OR ')).bind(...fields.map(c=>c==='venue_id'?scope.venueId:scope.accountId)).first('n'));
  }
  const unsupportedNonempty=emptyOnlyTables.filter(name=>(counts[name]??0)>0);
  // A backup must not overlap either legacy or normalized journal migration.
  const active=await db.prepare("SELECT 1 FROM journal_migration_runs WHERE venue_id=? AND phase NOT IN ('COMPLETE','ABORTED') UNION ALL SELECT 1 FROM journal_migration_runs_v2 WHERE venue_id=? AND phase NOT IN ('COMPLETE','ABORTED') UNION ALL SELECT 1 FROM qa_pos_backup_runs WHERE venue_id=? AND paused=1 LIMIT 1").bind(scope.venueId,scope.venueId,scope.venueId).first();
  await authorizeQaBackup(db,s);
  return {scope,unknownTables,missingTables,counts,unsupportedNonempty,activeMigration:Boolean(active),ready:!unknownTables.length&&!missingTables.length&&!unsupportedNonempty.length&&!active,advisory:true};
 };
 return {scope,contract,root:'venue-business/'+scope.venueId,runTable:table,standalone:true,authorizeQaBackup,census,legacyStatus,abortQaBackup,ownerGuard,runGuard,run,contractSchemaHash,
  async prepareRun(db,s,existing){
   await db.batch([ownerGuard(db,s),...(existing?[revisionGuard(db,existing,false),db.prepare('DELETE FROM '+table+' WHERE run_id=?').bind(existing.run_id)]:[]),db.prepare("INSERT INTO "+table+"(venue_id,account_id,run_id,actor_id,phase,paused,created_at,expires_at) VALUES(?,?,?,?,'CAPTURE',1,?,"+lease+')').bind(scope.venueId,scope.accountId,crypto.randomUUID(),s.actorId,new Date().toISOString())]);
  },
  async persistProgress(db,s,r,json){await db.batch([ownerGuard(db,s),runGuard(db,r),db.prepare('UPDATE '+table+' SET progress_json=?,revision=revision+1,expires_at='+lease+' WHERE run_id=?').bind(json,r.run_id)]);},
  async advance(db,s,r,phase,paused,fields={}){await db.batch([ownerGuard(db,s),runGuard(db,r),db.prepare('UPDATE '+table+' SET phase=?,paused=?,backup_key=COALESCE(?,backup_key),backup_hash=COALESCE(?,backup_hash),receipt_hash=COALESCE(?,receipt_hash),revision=revision+1,expires_at='+ (paused?lease:'NULL')+' WHERE run_id=?').bind(phase,paused,fields.key??null,fields.hash??null,fields.receipt??null,r.run_id)]);}
 };
}
export function businessBackup(scope:{accountId:number;venueId:number}){return createChunkedBackup(businessBackupPolicy(scope));}
export async function validateBusinessBackupManifest(manifest:Manifest){return businessBackup(manifest.scope).validateManifest(manifest);}
