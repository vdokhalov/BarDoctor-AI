/** QA3389 only. Operator steps are bounded; pausing never expires implicitly. */
import {copyLegacyJournal,activateJournal,journalState,journalPage,restartLegacyJournal} from './stock-journal';
import {copyLegacySalesEvents,activateSalesEvents,salesEventState,salesEventPage,restartLegacySalesEvents} from './sales-event-storage';
import {stableSalesValue} from './sales-events';
import type {JournalScope} from './stock-journal';
export type BackupStore={put(key:string,value:string):Promise<unknown>;get(key:string):Promise<{text():Promise<string>}|null>};
type Scope=JournalScope&{actorId:number};
type Store={store_key:string;data_json:string;updated_at:string|null};
type Source={venue:{id:number;workspace_id:number;data_account_id:number;status:string};profile:string|null;stores:Store[]};
type Backup={format:'bardoctor-journal-backup-v1';capturedAt:string;scope:JournalScope;source:Source;required:Record<string,string|null>};
type Run={venue_id:number;account_id:number;run_id:string;phase:string;paused:number;backup_key:string;backup_hash:string;created_at:string;revision:number;updated_at:string};
const required=['bd_stock_movements','bd_sales_events_v1','bd_finance_revenue','bd_assortment_v1','bd_pos_orders_v1','bd_sales_batches','bd_sales_documents'];
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
function fail(code:string):never{throw Error('JOURNAL_MIGRATION_'+code);}
function guard(db:D1Database,predicate:string,values:unknown[]){return db.prepare(`INSERT INTO journal_migration_log(run_id,sequence,phase,actor_id,detail,created_at) SELECT '__guard__',NULL,'guard',0,'','' WHERE NOT (${predicate})`).bind(...values);}
async function authorize(db:D1Database,scope:Scope){
 if(scope.venueId!==3389||!Number.isSafeInteger(scope.accountId)||!Number.isSafeInteger(scope.actorId))fail('SCOPE_FORBIDDEN');
 const row=await db.prepare(`SELECT 1 FROM venues v JOIN venue_memberships m ON m.venue_id=v.id JOIN workspace_memberships w ON w.workspace_id=v.workspace_id AND w.account_id=m.account_id JOIN workspaces ws ON ws.id=v.workspace_id WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND m.account_id=? AND m.role='owner' AND m.status='active' AND w.status='active' AND ws.status='active'`).bind(scope.venueId,scope.accountId,scope.actorId).first();if(!row)fail('OWNER_REQUIRED');
}
function ownerGuard(db:D1Database,scope:Scope){return guard(db,`EXISTS(SELECT 1 FROM venues v JOIN venue_memberships m ON m.venue_id=v.id JOIN workspace_memberships w ON w.workspace_id=v.workspace_id AND w.account_id=m.account_id JOIN workspaces ws ON ws.id=v.workspace_id WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND m.account_id=? AND m.role='owner' AND m.status='active' AND w.status='active' AND ws.status='active')`,[scope.venueId,scope.accountId,scope.actorId]);}
export async function migrationStatus(db:D1Database,scope:Scope){await authorize(db,scope);const run=await db.prepare('SELECT * FROM journal_migration_runs WHERE venue_id=? AND account_id=?').bind(scope.venueId,scope.accountId).first<Run>();return {run,stock:await journalState(db,scope),events:await salesEventState(db,scope),log:run?(await db.prepare('SELECT * FROM journal_migration_log WHERE run_id=? ORDER BY sequence').bind(run.run_id).all()).results:[]};}
async function source(db:D1Database,scope:Scope):Promise<Source>{
 const result=await db.batch([db.prepare('SELECT id,workspace_id,data_account_id,status FROM venues WHERE id=? AND data_account_id=?').bind(scope.venueId,scope.accountId),db.prepare('SELECT restaurant_json FROM accounts WHERE id=?').bind(scope.accountId),db.prepare('SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=? ORDER BY store_key').bind(scope.accountId)]);
 const venue=result[0].results[0] as Source['venue'],profile=(result[1].results[0] as {restaurant_json:string|null})?.restaurant_json;if(!venue||profile===undefined)fail('SCOPE_FORBIDDEN');return {venue,profile,stores:result[2].results as Store[]};
}
function sourceGuards(db:D1Database,scope:Scope,s:Source){
 return [ownerGuard(db,scope),guard(db,'EXISTS(SELECT 1 FROM accounts WHERE id=? AND restaurant_json IS ?)',[scope.accountId,s.profile]),guard(db,'EXISTS(SELECT 1 FROM venues WHERE id=? AND workspace_id=? AND data_account_id=? AND status=?)',[s.venue.id,s.venue.workspace_id,s.venue.data_account_id,s.venue.status]),guard(db,'(SELECT count(*) FROM domain_data WHERE account_id=?)=?',[scope.accountId,s.stores.length]),...s.stores.map(row=>guard(db,'EXISTS(SELECT 1 FROM domain_data WHERE account_id=? AND store_key=? AND data_json=? AND updated_at IS ?)',[scope.accountId,row.store_key,row.data_json,row.updated_at]))];
}
async function backupRead(bucket:BackupStore,run:Run,scope:Scope){
 const object=await bucket.get(run.backup_key);if(!object)fail('BACKUP_MISSING');const raw=await object.text();if(await hash(raw)!==run.backup_hash)fail('BACKUP_CORRUPT');const backup=JSON.parse(raw) as Backup;
 if(backup.format!=='bardoctor-journal-backup-v1'||backup.scope.venueId!==scope.venueId||backup.scope.accountId!==scope.accountId||required.some(key=>!Object.hasOwn(backup.required,key)||backup.required[key]!==backup.source.stores.find(row=>row.store_key===key)?.data_json&&!(backup.required[key]===null&&!backup.source.stores.some(row=>row.store_key===key))))fail('BACKUP_INCOMPLETE');return backup;
}
export async function prepareJournalMigration(db:D1Database,bucket:BackupStore,scope:Scope){
 await authorize(db,scope);if((await migrationStatus(db,scope)).run)fail('RUN_EXISTS');
 const s=await source(db,scope);if(!Array.isArray(JSON.parse(s.stores.find(r=>r.store_key==='bd_stock_movements')?.data_json??'null'))||!Array.isArray(JSON.parse(s.stores.find(r=>r.store_key==='bd_sales_events_v1')?.data_json??'[]')))fail('LEGACY_REQUIRED');
 const now=new Date().toISOString(),runId=crypto.randomUUID(),key=`journal-migrations/3389/${runId}/backup.json`;
 const backup:Backup={format:'bardoctor-journal-backup-v1',capturedAt:now,scope:{accountId:scope.accountId,venueId:scope.venueId},source:s,required:Object.fromEntries(required.map(key=>[key,s.stores.find(row=>row.store_key===key)?.data_json??null]))};
 const raw=JSON.stringify(backup),digest=await hash(raw);await bucket.put(key,raw);const check=await bucket.get(key);if(!check||await hash(await check.text())!==digest)fail('BACKUP_NOT_DURABLE');
 await db.batch([...sourceGuards(db,scope,s),db.prepare("INSERT INTO journal_migration_runs(venue_id,account_id,run_id,phase,backup_key,backup_hash,created_at,updated_at) VALUES (?,?,?,'BACKED_UP',?,?,?,?)").bind(scope.venueId,scope.accountId,runId,key,digest,now,now),db.prepare("INSERT INTO journal_migration_log VALUES (?,0,'BACKED_UP',?,?,?)").bind(runId,scope.actorId,JSON.stringify({backupHash:digest,storeCount:s.stores.length}),now)]);
 return migrationStatus(db,scope);
}
async function advance(db:D1Database,scope:Scope,run:Run,phase:string,paused:number,detail:object,extra:D1PreparedStatement[]=[]){
 const now=new Date().toISOString();await db.batch([ownerGuard(db,scope),guard(db,'EXISTS(SELECT 1 FROM journal_migration_runs WHERE run_id=? AND revision=? AND phase=? AND paused=?)',[run.run_id,run.revision,run.phase,run.paused]),...extra,db.prepare('UPDATE journal_migration_runs SET phase=?,paused=?,revision=revision+1,updated_at=? WHERE run_id=?').bind(phase,paused,now,run.run_id),db.prepare('INSERT INTO journal_migration_log VALUES (?,?,?,?,?,?)').bind(run.run_id,run.revision+1,phase,scope.actorId,JSON.stringify(detail),now)]);
}
async function verify(db:D1Database,scope:Scope,backup:Backup){
 const current=await source(db,scope),stock=await journalState(db,scope),events=await salesEventState(db,scope);
 if(!stock||!events||stock.revision!==0||events.revision!==0||!['verified','active'].includes(stock.state)||!['verified','active'].includes(events.state))fail('JOURNALS_NOT_VERIFIED');
 const values:unknown[]=[];let cursor:number|null=null;do{const page=await journalPage(db,scope,cursor,100,0);values.push(...page.items);cursor=page.next;}while(cursor!==null);
 const sales:unknown[]=[];let after=-1;do{const page=await salesEventPage(db,scope,0,after);sales.push(...page.items);if(page.next===null)break;after=page.next;}while(true);
 if(stableSalesValue(values)!==stableSalesValue(JSON.parse(backup.required.bd_stock_movements!))||stableSalesValue(sales)!==stableSalesValue(JSON.parse(backup.required.bd_sales_events_v1??'[]')))fail('VALUE_MISMATCH');
 const restored:Source=structuredClone(current);
 for(const [key,state] of [['bd_stock_movements',stock],['bd_sales_events_v1',events]] as const){if(state.state!=='active')continue;const original=backup.source.stores.find(row=>row.store_key===key);restored.stores=restored.stores.filter(row=>row.store_key!==key);if(original)restored.stores.push(original);}
 restored.stores.sort((a,b)=>a.store_key<b.store_key?-1:a.store_key>b.store_key?1:0);
 if(stableSalesValue(restored)!==stableSalesValue(backup.source))fail('SOURCE_CHANGED');
 // Verify the canonical incremental totals before opening writes.
 const totals=(await db.prepare('SELECT revenue_row_id,currency,cents,receipts FROM sales_event_totals WHERE account_id=? ORDER BY revenue_row_id').bind(scope.accountId).all<{revenue_row_id:string;currency:string;cents:number;receipts:number}>()).results;
 const projected=new Map<string,{currency:string;cents:number;receipts:number}>();for(const e of sales as any[]){const p=projected.get(e.revenueRowId)??{currency:e.currency,cents:0,receipts:0};if(p.currency!==e.currency)fail('REVENUE_MISMATCH');if(e.status==='POSTED'){p.cents+=Math.round(e.revenue*100);p.receipts++;}projected.set(e.revenueRowId,p);}
 if(totals.length!==projected.size||totals.some(t=>stableSalesValue({currency:t.currency,cents:t.cents,receipts:t.receipts})!==stableSalesValue(projected.get(t.revenue_row_id))))fail('REVENUE_MISMATCH');
 const revenues=JSON.parse(backup.required.bd_finance_revenue??'[]');if(!Array.isArray(revenues))fail('REVENUE_MISMATCH');
 for(const [id,t] of projected){const rows=revenues.filter((r:any)=>r.id===id&&r.venueId===scope.venueId);if(rows.length!==1||rows[0].revenueSource!=='sales_events_v1'||rows[0].currency!==t.currency||Math.round(rows[0].revenue*100)!==t.cents||rows[0].receipts!==t.receipts)fail('REVENUE_MISMATCH');}
 for(const row of revenues)if(row.venueId===scope.venueId&&row.revenueSource==='sales_events_v1'&&!projected.has(row.id)&&(row.revenue!==0||row.receipts!==0))fail('REVENUE_MISMATCH');
 return current;
}
export async function stepJournalMigration(db:D1Database,bucket:BackupStore,scope:Scope,runId:string){
 await authorize(db,scope);const run=(await migrationStatus(db,scope)).run;if(!run||run.run_id!==runId)fail('RUN_CHANGED');if(run.phase==='COMPLETE'||run.phase==='ABORTED')return migrationStatus(db,scope);
 const backup=await backupRead(bucket,run,scope);
 if(!run.paused&&Date.now()-Date.parse(backup.capturedAt)>15*60_000)fail('BACKUP_STALE');
 if(run.phase==='BACKED_UP'){
  if(stableSalesValue(await source(db,scope))!==stableSalesValue(backup.source))fail('SOURCE_CHANGED');
  const stock=await copyLegacyJournal(db,scope,25);const events=await copyLegacySalesEvents(db,scope,5);
  await advance(db,scope,run,stock.state==='verified'&&events.state==='verified'?'STAGED':'BACKED_UP',0,{stock,events:events.copied_count});
 }else if(run.phase==='STAGED'){
  const current=await verify(db,scope,backup);await advance(db,scope,run,'PAUSED',1,{reason:'verified backup; short cutover pause'},sourceGuards(db,scope,current));
 }else if(run.phase==='PAUSED'){
  await verify(db,scope,backup);await advance(db,scope,run,'VERIFIED',1,{verified:true});
 }else if(run.phase==='VERIFIED'){
  await verify(db,scope,backup);await activateJournal(db,scope,[ownerGuard(db,scope),guard(db,'EXISTS(SELECT 1 FROM journal_migration_runs WHERE run_id=? AND phase=? AND paused=1 AND revision=?)',[run.run_id,run.phase,run.revision])]);await advance(db,scope,run,'STOCK_ACTIVE',1,{stockActive:true,atomicPair:false});
 }else if(run.phase==='STOCK_ACTIVE'){
  await verify(db,scope,backup);await activateSalesEvents(db,scope,[ownerGuard(db,scope),guard(db,'EXISTS(SELECT 1 FROM journal_migration_runs WHERE run_id=? AND phase=? AND paused=1 AND revision=?)',[run.run_id,run.phase,run.revision])]);await advance(db,scope,run,'BOTH_ACTIVE',1,{eventsActive:true,atomicPair:false});
 }else if(run.phase==='BOTH_ACTIVE'){
  const current=await verify(db,scope,backup);await advance(db,scope,run,'COMPLETE',0,{verified:true,rollback:'roll-forward only after new writes'},[...sourceGuards(db,scope,current),guard(db,"EXISTS(SELECT 1 FROM stock_journals WHERE account_id=? AND state='active' AND revision=0) AND EXISTS(SELECT 1 FROM sales_event_journals WHERE account_id=? AND state='active' AND revision=0)",[scope.accountId,scope.accountId])]);
 }else fail('PHASE_INVALID');
 return migrationStatus(db,scope);
}
export async function abortJournalMigration(db:D1Database,scope:Scope,runId:string){
 await authorize(db,scope);const {run,stock,events}=await migrationStatus(db,scope);if(!run||run.run_id!==runId)fail('RUN_CHANGED');if(run.phase==='ABORTED')return migrationStatus(db,scope);
 if(stock?.state==='active'||events?.state==='active')fail('ROLL_FORWARD_REQUIRED');
 await advance(db,scope,run,'ABORTED',0,{reason:'no journal active; legacy remains authoritative'},[guard(db,"NOT EXISTS(SELECT 1 FROM stock_journals WHERE account_id=? AND state='active') AND NOT EXISTS(SELECT 1 FROM sales_event_journals WHERE account_id=? AND state='active')",[scope.accountId,scope.accountId])]);return migrationStatus(db,scope);
}

/** Fresh backup after an aborted/stale preparation; previous R2 objects/log entries remain. */
export async function refreshJournalBackup(db:D1Database,bucket:BackupStore,scope:Scope,runId:string){
 await authorize(db,scope);const {run,stock,events}=await migrationStatus(db,scope);if(!run||run.run_id!==runId)fail('RUN_CHANGED');
 if(run.phase!=='ABORTED'||run.paused||stock?.state==='active'||events?.state==='active')fail('ABORT_BEFORE_REFRESH');
 // No step may activate an ABORTED run. Staging can be reset safely on repeated refresh attempts.
 const refreshGuards=()=>[ownerGuard(db,scope),guard(db,"EXISTS(SELECT 1 FROM journal_migration_runs WHERE run_id=? AND phase='ABORTED' AND paused=0 AND revision=?)",[run.run_id,run.revision])];
 await restartLegacyJournal(db,scope,refreshGuards());await restartLegacySalesEvents(db,scope,refreshGuards());
 const s=await source(db,scope),now=new Date().toISOString();
 const backup:Backup={format:'bardoctor-journal-backup-v1',capturedAt:now,scope:{accountId:scope.accountId,venueId:scope.venueId},source:s,required:Object.fromEntries(required.map(key=>[key,s.stores.find(row=>row.store_key===key)?.data_json??null]))};
 const raw=JSON.stringify(backup),digest=await hash(raw),key=`journal-migrations/3389/${runId}/backup-${run.revision}-${crypto.randomUUID()}.json`;
 await bucket.put(key,raw);const checked=await bucket.get(key);if(!checked||await hash(await checked.text())!==digest)fail('BACKUP_NOT_DURABLE');
 await advance(db,scope,run,'BACKED_UP',0,{backupHash:digest,previousBackup:run.backup_key},[...sourceGuards(db,scope,s),db.prepare('UPDATE journal_migration_runs SET backup_key=?,backup_hash=? WHERE run_id=?').bind(key,digest,runId)]);
 return migrationStatus(db,scope);
}
