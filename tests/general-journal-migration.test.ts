import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync} from 'node:fs';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';import {salesEventFixture,saleCommand} from './helpers/sales-event-fixture';import {planSalesEvent,planSalesShift} from '../lib/bardoctor/sales-events';import {seedOpenWorkday} from './helpers/pos-workday-fixture';
async function setup(){
 const objects=new Map<string,string>(),bucket={async put(k:string,v:string){objects.set(k,v);},async get(k:string){return objects.has(k)?{text:async()=>objects.get(k)!}:null;}};
 const r=await lifecycleRuntime({runner:'./lib/bardoctor/journal-migration-runner',route:'./app/api/migration/journals/route',database:'./db',storage:'./lib/bardoctor/stock-storage',events:'./lib/bardoctor/sales-event-storage',sale:'./app/api/sales-events/route',purchase:'./app/api/purchases/confirm/route'},{now:'2026-10-02T12:00:00Z',bindings:{BUCKET:bucket}});
 const owner=await r.register('general-migration@isolated.test'),scope={accountId:owner.userId,venueId:owner.activeVenueId,actorId:owner.userId};assert.notEqual(scope.venueId,3389);const api=r.api as any,db=api.database.getD1();
 const put=(k:string,v:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(scope.accountId,k,JSON.stringify(v));
 const raw=(k:string)=>String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(scope.accountId,k)?.data_json??'null');
 const fixture=salesEventFixture(),plan=await planSalesEvent(fixture,saleCommand('whisky',1));r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'UTC'}),scope.accountId);
 put('bd_assortment_v1',plan.assortment);put('bd_sales_events_v1',[plan.event]);put('bd_finance_revenue',plan.revenues);put('bd_sales_reconciliations_v1',[{id:'retained-link',venueId:1,original:{keep:true}}]);
 put('bd_stock_movements',Array.from({length:430},(_,i)=>({id:'old-'+i,venueId:scope.venueId,type:'sale_consumption',productKey:'old-product',amount:-1,recipeSnapshot:{unknown:'x'.repeat(4400)}})).concat(plan.event.originalMovements as any));
 const step=async()=>{const st=await api.runner.migrationStatus(db,scope);return api.runner.stepJournalMigration(db,bucket,scope,st.run.run_id);};
 return {r,owner,scope,api,db,objects,bucket,put,raw,step};
}
test('general owner migration preserves full over-capacity legacy history and resumes into receipt/consumption without repost',async t=>{
 const s=await setup();t.after(s.r.close);const {r,scope,api,db}=s;
 const original=s.raw('bd_stock_movements');assert(Buffer.byteLength(original)>1900000);assert(Buffer.byteLength(original)<2000000);
 const snapshots=r.sqlite.prepare('SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=? ORDER BY store_key').all(scope.accountId);
 const request=r.request(s.owner,'/api/migration/journals','POST',{venueId:scope.venueId,confirmation:'JOURNAL_CUTOVER:'+scope.venueId,action:'prepare'});request.headers.set('Origin','https://isolated.test');const response=await api.route.POST(request);assert.equal(response.status,200,await response.clone().text());const prepared=await response.json();assert.equal((await api.runner.prepareJournalMigration(db,s.bucket,scope)).run.run_id,prepared.run.run_id);assert.equal(s.objects.size,1);
 let steps=0;while((await api.runner.migrationStatus(db,scope)).run.phase!=='COMPLETE'){assert(++steps<35);await s.step();}
 const completed=await api.runner.migrationStatus(db,scope);assert.equal((await s.step()).run.revision,completed.run.revision);assert.equal(completed.run.paused,0);
 assert.deepEqual(await api.storage.readStockHistory(db,scope.accountId,s.raw('bd_stock_movements')),JSON.parse(original));
 assert.equal(r.sqlite.prepare('SELECT legacy_json FROM stock_journals WHERE account_id=?').get(scope.accountId)!.legacy_json,original);
 for(const row of snapshots)if(!['bd_stock_movements','bd_sales_events_v1'].includes(String(row.store_key)))assert.equal(s.raw(String(row.store_key)),row.data_json);
 assert.equal(s.objects.size,1);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM audit_log').get()!.n,0);
 // Actual lifecycle commands after cutover: no new venue and no invented receipt.
 s.put('bd_suppliers',[{id:'supplier',venueId:scope.venueId,name:'Supplier'}]);
 const document={id:'receipt-after',venueId:scope.venueId,documentType:'invoice',supplierId:'supplier',supplierName:'Supplier',date:'2026-10-02',currency:'MDL',source:'manual',total:100,items:[{id:'receipt-line',name:'Whisky',nomenclatureId:'nom-whisky',purchaseProductKey:'whisky-stock',quantity:1,unit:'l',unitPrice:100,lineTotal:100,quantityMode:'measure',category:'products',mappingSource:'manual'}]};
 const receipt=await api.purchase.POST(r.request(s.owner,'/api/purchases/confirm','POST',{venueId:scope.venueId,document}));assert.equal(receipt.status,201,await receipt.clone().text());
 const context={...salesEventFixture(),revenues:JSON.parse(s.raw('bd_finance_revenue')),now:'2026-10-02T12:00:00Z'};s.put('bd_finance_revenue',planSalesShift(context,'open_shift','new-shift','Test'));seedOpenWorkday(r.sqlite,scope.accountId,scope.venueId,'2026-10-02');
 const command={...saleCommand('whisky',1),id:'sale-after',shiftId:'new-shift'};
 const send=(action:string,previewHash?:string)=>{const req=r.request(s.owner,'/api/sales-events','POST',{venueId:scope.venueId,action,command,previewHash});req.headers.set('Origin','https://isolated.test');return api.sale.POST(req);};
 const preview=await send('preview');assert.equal(preview.status,200,await preview.clone().text());const hash=(await preview.json()).previewHash;
 assert.equal((await send('post',hash)).status,201);const beforeRetry=s.raw('bd_finance_revenue');assert.equal((await send('post',hash)).status,200);assert.equal(s.raw('bd_finance_revenue'),beforeRetry);
 const history=await api.storage.readStockHistory(db,scope.accountId,s.raw('bd_stock_movements'));assert.equal(history.length,JSON.parse(original).length+2);for(const row of JSON.parse(original))assert.deepEqual(history.find((x:any)=>x.id===row.id),row);
});
test('foreign nested ownership, duplicate IDs and source capacity fail before backup or run creation',async t=>{
 const s=await setup();t.after(s.r.close);for(const rows of [[{id:'x',recipeSnapshot:{dataAccountId:999}}],[{id:'x'},{id:'x'}],[{id:'huge',padding:'x'.repeat(2000000)}]]){
  s.put('bd_stock_movements',rows);await assert.rejects(s.api.runner.prepareJournalMigration(s.db,s.bucket,s.scope),/SOURCE_SCOPE|SOURCE_ID|SOURCE_CAPACITY/);assert.equal(s.objects.size,0);assert.equal((await s.api.runner.migrationStatus(s.db,s.scope)).run,null);
 }
 await assert.rejects(s.api.runner.migrationStatus(s.db,{...s.scope,accountId:999}),/OWNER_REQUIRED/);
});
test('schema upgrade preserves prior run, audit, pause guards and foreign keys',()=>{
 const db=new DatabaseSync(':memory:');try{
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')&&f<'0039').sort())db.exec(readFileSync('drizzle/'+file,'utf8'));
 db.exec("INSERT INTO accounts(id,chatgpt_email,app_email) VALUES(148,'schema@isolated.test','schema@isolated.test');INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Test',148);INSERT INTO venues(id,workspace_id,data_account_id,created_by_account_id) VALUES(3389,1,148,148);INSERT INTO journal_migration_runs VALUES(3389,148,'existing','COMPLETE',0,'retained-backup','hash','then',6,'then');INSERT INTO journal_migration_log VALUES('existing',0,'BACKED_UP',148,'retained','then');");
 const before=db.prepare('SELECT * FROM journal_migration_runs').all(),log=db.prepare('SELECT * FROM journal_migration_log').all(),triggers=db.prepare("SELECT name FROM sqlite_schema WHERE type='trigger' AND (name LIKE 'journal_pause_%' OR name LIKE 'qa_pos_pause_%') ORDER BY name").all();
 db.exec('BEGIN');db.exec(readFileSync('drizzle/0039_general_journal_migration.sql','utf8'));db.exec('COMMIT');assert.deepEqual(db.prepare('SELECT * FROM journal_migration_runs').all(),before);assert.deepEqual(db.prepare('SELECT * FROM journal_migration_log').all(),log);assert.deepEqual(db.prepare("SELECT name FROM sqlite_schema WHERE type='trigger' AND (name LIKE 'journal_pause_%' OR name LIKE 'qa_pos_pause_%') ORDER BY name").all(),triggers);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.exec("UPDATE journal_migration_runs SET phase='VERIFIED',paused=1 WHERE run_id='existing'");assert.throws(()=>db.exec("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(148,'blocked','[]')"),/PAUSED/);
 }finally{db.close();}
});
