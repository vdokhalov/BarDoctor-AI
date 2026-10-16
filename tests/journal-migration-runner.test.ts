import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {salesEventFixture,saleCommand} from './helpers/sales-event-fixture';
import {planSalesEvent} from '../lib/bardoctor/sales-events';
async function setup(){
 const objects=new Map<string,string>();const bucket={async put(k:string,v:string){objects.set(k,v);},async get(k:string){const v=objects.get(k);return v===undefined?null:{async text(){return v;}};}};
 const r=await lifecycleRuntime({page:'./app/settings/journal-migration/route',runner:'./lib/bardoctor/journal-migration-runner',route:'./app/api/migration/journals/route',database:'./db',stock:'./lib/bardoctor/stock-journal',events:'./lib/bardoctor/sales-event-storage'},{bindings:{BUCKET:bucket}});
 const owner=await r.register('runner@isolated.test');const old=owner.activeVenueId;r.sqlite.exec('PRAGMA foreign_keys=OFF');for(const table of ['venue_memberships','sessions'])r.sqlite.prepare(`UPDATE ${table} SET ${table==='sessions'?'active_venue_id':'venue_id'}=3389 WHERE ${table==='sessions'?'active_venue_id':'venue_id'}=?`).run(old);r.sqlite.prepare('UPDATE venues SET id=3389 WHERE id=?').run(old);r.sqlite.exec('PRAGMA foreign_keys=ON');owner.activeVenueId=3389;
 const scope={accountId:owner.userId,venueId:3389,actorId:owner.userId};const db=(r.api.database as unknown as typeof import('../db')).getD1(),api=r.api.runner as unknown as typeof import('../lib/bardoctor/journal-migration-runner');
 const fixture=salesEventFixture(),plan=await planSalesEvent(fixture,saleCommand('whisky',1));const event=JSON.parse(JSON.stringify(plan.event).replaceAll('"venueId":1','"venueId":3389'));
 const put=(k:string,v:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(scope.accountId,k,JSON.stringify(v));
 put('bd_stock_movements',[{id:'receipt',venueId:3389,type:'receipt',productKey:'whisky-stock',date:'2026-09-01',amount:10,unit:'l',costAmount:100,currency:'MDL'},...event.originalMovements]);put('bd_sales_events_v1',[event]);put('bd_finance_revenue',plan.revenues.map(row=>({...row,venueId:3389})));put('bd_assortment_v1',plan.assortment);
 const status=()=>api.migrationStatus(db,scope);const prepare=()=>api.prepareJournalMigration(db,bucket,scope);const step=async()=>{const {run}=await status();return api.stepJournalMigration(db,bucket,scope,run!.run_id);};
 const send=(body:object)=>{const req=r.request(owner,'/api/migration/journals','POST',{venueId:3389,confirmation:'QA3389_JOURNAL_CUTOVER',...body});req.headers.set('Origin','https://isolated.test');return r.api.route.POST(req);};
 return {r,owner,scope,db,api,bucket,objects,put,status,prepare,step,send,event};
}
test('runner verifies durable complete backup and resumes after every persisted boundary with pause across mixed formats',async t=>{
 const s=await setup();t.after(s.r.close);const prepared=await s.prepare(),runId=prepared.run!.run_id;
 const backup=JSON.parse(s.objects.get(prepared.run!.backup_key)!);assert.ok(backup.required.bd_sales_events_v1);assert.ok(backup.required.bd_finance_revenue);assert.ok(Object.hasOwn(backup.required,'bd_pos_orders_v1'));
 const phases:string[]=[];
 for(let i=0;i<15;i++){
  const before=await s.status();if(before.run!.phase==='COMPLETE')break;
  // Database failure is atomic at each boundary; a new invocation resumes by persisted state.
  const originalBatch=s.db.batch.bind(s.db);let injected=false;
  s.db.batch=async<T>(statements:D1PreparedStatement[])=>{if(!injected&&statements.some(x=>(x as D1PreparedStatement & {sql:string}).sql.startsWith('UPDATE journal_migration_runs SET phase='))){injected=true;s.r.failDatabase();}return originalBatch<T>(statements);};
  await assert.rejects(s.step(),/injected/);s.db.batch=originalBatch;assert.ok(injected);assert.equal((await s.status()).run!.phase,before.run!.phase);
  const after=await s.step();phases.push(after.run!.phase);
  if(after.run!.paused){assert.throws(()=>s.put('bd_finance_revenue',[]),/PAUSED/);assert.throws(()=>s.put('bd_new_write',[]),/PAUSED/);assert.throws(()=>s.r.sqlite.prepare('DELETE FROM domain_data WHERE account_id=?').run(s.scope.accountId),/PAUSED/);}
 }
 assert.deepEqual(phases,['STAGED','PAUSED','VERIFIED','STOCK_ACTIVE','BOTH_ACTIVE','COMPLETE']);
 const final=await s.status();assert.equal(final.run!.paused,0);assert.equal(final.stock!.state,'active');assert.equal(final.events!.state,'active');assert.equal(final.log.length,7);
 assert.equal((await s.api.stepJournalMigration(s.db,s.bucket,s.scope,runId)).run!.phase,'COMPLETE');
 assert.deepEqual(await (s.r.api.events as unknown as typeof import('../lib/bardoctor/sales-event-storage')).readSalesEvents(s.db,s.scope.accountId,String(s.r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_sales_events_v1'").get(s.scope.accountId)!.data_json)),[s.event]);
 await assert.rejects(s.api.abortJournalMigration(s.db,s.scope,runId),/ROLL_FORWARD_REQUIRED/);
});
test('abort releases only before activation; backup corruption, drift and non-QA scope fail closed',async t=>{
 const s=await setup();t.after(s.r.close);const prepared=await s.prepare();const original=s.objects.get(prepared.run!.backup_key)!;s.objects.set(prepared.run!.backup_key,'{}');await assert.rejects(s.step(),/BACKUP_CORRUPT/);s.objects.set(prepared.run!.backup_key,original);
 await assert.rejects(s.api.stepJournalMigration(s.db,s.bucket,{...s.scope,venueId:1},prepared.run!.run_id),/SCOPE_FORBIDDEN/);
 await s.step();await s.step();assert.equal((await s.status()).run!.paused,1);
 await s.api.abortJournalMigration(s.db,s.scope,prepared.run!.run_id);assert.equal((await s.status()).run!.paused,0);s.put('bd_finance_revenue',[]);
 assert.equal((await s.send({action:'step',venueId:1,runId:prepared.run!.run_id})).status,403);
});
test('crash immediately after either cutover keeps durable pause and resumes without duplicating records',async t=>{
 for(const table of ['stock_journals','sales_event_journals']){
  const s=await setup();try{await s.prepare();await s.step();await s.step();await s.step();if(table==='sales_event_journals')await s.step();
   // Simulate a process death after activation commits, before progress commits.
   const runnerAdvance=s.db.batch.bind(s.db);let crashed=false;
   s.db.batch=async<T>(statements:D1PreparedStatement[])=>{const active=s.r.sqlite.prepare(`SELECT state FROM ${table}`).get()?.state;if(active==='active'&&!crashed){crashed=true;throw Error('process interrupted after activation');}return runnerAdvance<T>(statements);};
   await assert.rejects(s.step(),/interrupted/);s.db.batch=runnerAdvance;assert.equal((await s.status()).run!.paused,1);assert.throws(()=>s.put('bd_stock_movements',[]),/FORBIDDEN|PAUSED/);await assert.rejects(s.api.abortJournalMigration(s.db,s.scope,(await s.status()).run!.run_id),/ROLL_FORWARD_REQUIRED/);
   while((await s.status()).run!.phase!=='COMPLETE')await s.step();assert.equal(s.r.sqlite.prepare('SELECT count(*) n FROM sales_event_records').get()!.n,1);assert.equal(s.r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()!.n,2);
  }finally{s.r.close();}
 }
});
test('stale backup or changed source cannot pause; abort refresh retains previous backup and resumes',async t=>{
 const s=await setup();t.after(s.r.close);const prepared=await s.prepare();s.put('bd_added_after_backup',[]);await assert.rejects(s.step(),/SOURCE_CHANGED/);assert.equal((await s.status()).run!.paused,0);
 await s.api.abortJournalMigration(s.db,s.scope,prepared.run!.run_id);await s.api.refreshJournalBackup(s.db,s.bucket,s.scope,prepared.run!.run_id);assert.equal(s.objects.size,2);
 const run=(await s.status()).run,backup=JSON.parse(s.objects.get(run!.backup_key)!);backup.capturedAt=new Date(Date.now()-16*60000).toISOString();const raw=JSON.stringify(backup),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),v=>v.toString(16).padStart(2,'0')).join('');s.objects.set(run!.backup_key,raw);s.r.sqlite.prepare('UPDATE journal_migration_runs SET backup_hash=?').run(digest);
 await assert.rejects(s.step(),/BACKUP_STALE/);await s.api.abortJournalMigration(s.db,s.scope,run!.run_id);await s.api.refreshJournalBackup(s.db,s.bucket,s.scope,run!.run_id);
 while((await s.status()).run!.phase!=='COMPLETE')await s.step();assert.equal((await s.status()).run!.paused,0);
});
test('owner HTTP controls are scoped and abort racing activation cannot permit a mixed-format unpause',async t=>{
 const s=await setup();t.after(s.r.close);assert.equal((await s.send({action:'prepare'})).status,200);await s.step();await s.step();await s.step();const run=(await s.status()).run;
 const batch=s.db.batch.bind(s.db);let interleaved=false;
 s.db.batch=async<T>(statements:D1PreparedStatement[])=>{if(!interleaved&&statements.some(x=>(x as D1PreparedStatement & {sql:string}).sql.includes("UPDATE stock_journals SET state='active'"))){interleaved=true;await s.api.abortJournalMigration(s.db,s.scope,run!.run_id);}return batch<T>(statements);};
 await assert.rejects(s.step());s.db.batch=batch;assert.equal((await s.status()).run!.phase,'ABORTED');assert.equal((await s.status()).stock!.state,'verified');assert.equal((await s.status()).run!.paused,0);
 const other=await s.r.register('other-runner@isolated.test');const response=await s.r.api.route.GET(s.r.request(other,'/api/migration/journals'));assert.equal(response.status,409);
 s.r.sqlite.prepare("UPDATE venue_memberships SET role='shift_manager' WHERE account_id=? AND venue_id=3389").run(s.scope.actorId);await assert.rejects(s.api.migrationStatus(s.db,s.scope),/OWNER_REQUIRED/);
});
test('stale concurrent refresh cannot delete recreated staging after stock cutover',async t=>{
 const s=await setup();t.after(s.r.close);await s.prepare();await s.step();
 const runId=(await s.status()).run!.run_id;
 await s.api.abortJournalMigration(s.db,s.scope,runId);
 const batch=s.db.batch.bind(s.db);let intercept=true;
 s.db.batch=async<T>(statements:D1PreparedStatement[])=>{
  if(intercept&&statements.some(x=>(x as D1PreparedStatement & {sql:string}).sql.startsWith('DELETE FROM sales_event_reversals'))){
   intercept=false;
   await s.api.refreshJournalBackup(s.db,s.bucket,s.scope,runId);
   while((await s.status()).run!.phase!=='STOCK_ACTIVE')await s.step();
  }
  return batch<T>(statements);
 };
 await assert.rejects(s.api.refreshJournalBackup(s.db,s.bucket,s.scope,runId));
 s.db.batch=batch;
 const state=await s.status();assert.equal(state.run!.phase,'STOCK_ACTIVE');assert.equal(state.run!.paused,1);assert.equal(state.stock!.state,'active');assert.equal(state.events!.state,'verified');
 while((await s.status()).run!.phase!=='COMPLETE')await s.step();
 assert.equal((await s.status()).run!.paused,0);
 assert.equal(s.r.sqlite.prepare('SELECT count(*) n FROM sales_event_records').get()!.n,1);
});
test('failed backup readback never creates a run; corruption after first cutover keeps pause until verified recovery',async t=>{
 const s=await setup();t.after(s.r.close);
 await assert.rejects(s.api.prepareJournalMigration(s.db,{put:async()=>{},get:async()=>null},s.scope),/BACKUP_NOT_DURABLE/);assert.equal((await s.status()).run,null);
 const prepared=await s.prepare();await s.step();await s.step();await s.step();await s.step();const before=await s.status();assert.equal(before.run!.phase,'STOCK_ACTIVE');
 const original=s.objects.get(prepared.run!.backup_key)!;s.objects.delete(prepared.run!.backup_key);await assert.rejects(s.step(),/BACKUP_MISSING/);assert.equal((await s.status()).run!.paused,1);await assert.rejects(s.api.abortJournalMigration(s.db,s.scope,prepared.run!.run_id),/ROLL_FORWARD_REQUIRED/);s.objects.set(prepared.run!.backup_key,original);
 const other=await s.r.register('unpaused-venue@isolated.test');s.r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,'unaffected','[]')").run(other.userId);
 const response=await s.r.api.route.GET(s.r.request(s.owner,'/api/migration/journals'));assert.equal(response.status,200,'operator read-only auth works during pause');
 while((await s.status()).run!.phase!=='COMPLETE')await s.step();assert.equal((await s.status()).run!.paused,0);
});

test('migration page server denies direct links outside live QA3389 owner membership',async t=>{
 const s=await setup();t.after(s.r.close);const page=s.r.api.page;
 assert.equal((await page.GET(new Request('https://isolated.test/settings/journal-migration'))).status,401);
 const cookieRequest=new Request('https://isolated.test/settings/journal-migration',{headers:{cookie:'bd_server_session='+encodeURIComponent(s.owner.token)}});assert.equal((await page.GET(cookieRequest)).status,200);
 const ownerResponse=await page.GET(s.r.request(s.owner,'/settings/journal-migration'));assert.equal(ownerResponse.status,200);assert.match(await ownerResponse.text(),/Создать резервную копию/);assert.equal((await s.status()).run,null);
 const other=await s.r.register('other-page@isolated.test');assert.equal((await page.GET(s.r.request(other,'/settings/journal-migration'))).status,403);
 for(const role of ['shift_manager','cashier','employee']){s.r.sqlite.prepare("UPDATE venue_memberships SET role=? WHERE account_id=? AND venue_id=3389").run(role,s.scope.actorId);const response=await page.GET(s.r.request(s.owner,'/settings/journal-migration'));assert.ok([401,403].includes(response.status));assert.doesNotMatch(await response.text(),/id="controls"/);}
 s.r.sqlite.prepare("UPDATE venue_memberships SET role='owner',status='revoked' WHERE account_id=? AND venue_id=3389").run(s.scope.actorId);assert.notEqual((await page.GET(s.r.request(s.owner,'/settings/journal-migration'))).status,200);
});
