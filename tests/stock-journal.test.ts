import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const exportPath=process.env.BD_STOCK_EXPORT;
async function setup(values:unknown[]){
 const r=await lifecycleRuntime({journal:'./lib/bardoctor/stock-journal',database:'./db'});const owner=await r.register('journal@isolated.test');
 const scope={accountId:owner.userId,venueId:owner.activeVenueId};
 const db=(r.api.database as unknown as typeof import('../db')).getD1() as D1Database,journal=r.api.journal as unknown as typeof import('../lib/bardoctor/stock-journal');
 r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,'bd_stock_movements',?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(scope.accountId,JSON.stringify(values));
 return {r,scope,db,journal};
}
const sample=(id:string)=>({id,venueId:1,productKey:'water',type:'sale_consumption',amount:-1,unknown:{keep:true},recipeSnapshot:{recipeId:'same',ingredients:[{id:'a',quantity:1}]}});
test('resumable migration preserves fields/order, does not activate, tenant isolation, keyset pages',async t=>{
 const values=Array.from({length:60},(_,i)=>sample('m'+i));const {r,scope,db,journal}=await setup(values);t.after(r.close);
 const original=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").get(scope.accountId)!.data_json;
 await journal.copyLegacyJournal(db,scope,20);assert.equal((await journal.journalState(db,scope))!.copied_count,20);
 await assert.rejects(journal.activateJournal(db,scope),/NEEDS_REVIEW/);
 while((await journal.copyLegacyJournal(db,scope,20)).state!=='verified'){}
 assert.equal(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").get(scope.accountId)!.data_json,original);
 await journal.activateJournal(db,scope);const all:unknown[]=[];let after:number|null=null;
 do{const page=await journal.journalPage(db,scope,after,17);all.push(...page.items);after=page.next;}while(after!==null);
 assert.deepEqual(all,values);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_recipe_snapshots').get()!.n,1);
 await assert.rejects(journal.journalPage(db,{...scope,venueId:999}),/NEEDS_REVIEW/);
 const other=await r.register('other@isolated.test');assert.equal(await journal.journalState(db,{accountId:other.userId,venueId:scope.venueId}),null);
});
test('source mutation prevents cutover; failed copy resumes without duplicates',async t=>{
 const {r,scope,db,journal}=await setup([sample('a'),sample('b')]);t.after(r.close);
 await journal.copyLegacyJournal(db,scope,1);r.failDatabase();await assert.rejects(journal.copyLegacyJournal(db,scope,1),/injected/);
 assert.equal((await journal.journalState(db,scope))!.copied_count,1);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()!.n,1);
 await journal.copyLegacyJournal(db,scope,1);
 r.sqlite.prepare("UPDATE domain_data SET data_json='[]' WHERE account_id=? AND store_key='bd_stock_movements'").run(scope.accountId);
 await assert.rejects(journal.activateJournal(db,scope));
});
test('append joins transaction, stale revision cannot commit, duplicate identity rejected without partial writes',async t=>{
 const {r,scope,db,journal}=await setup([sample('old')]);t.after(r.close);await journal.copyLegacyJournal(db,scope);await journal.activateJournal(db,scope);
 const a=await journal.appendJournalStatements(db,scope,0,[sample('new')]),b=await journal.appendJournalStatements(db,scope,0,[sample('concurrent')]);
 const financial=db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,'test-finance','123')").bind(scope.accountId);
 r.failDatabase();await assert.rejects(db.batch([...a,financial]),/injected/);assert.equal((await journal.journalState(db,scope))!.revision,0);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key='test-finance'").get()!.n,0);
 await db.batch([...a,financial]);await assert.rejects(db.batch(b),/NOT NULL/);
 const page=await journal.journalPage(db,scope);assert.deepEqual(page.items.map(x=>x.id),['new','old']);
 const dup=await journal.appendJournalStatements(db,scope,1,[sample('new')]);await assert.rejects(db.batch(dup),/UNIQUE/);assert.equal((await journal.journalState(db,scope))!.revision,1);
});
test('real 438 movement export round-trip without lost evidence', {skip:!exportPath},async t=>{
 assert.ok(existsSync(exportPath!));const input=JSON.parse(readFileSync(exportPath!,'utf8'));const snapshot=input.snapshot||input;assert.equal(snapshot.venue.id,3389);
 const values=snapshot.stores.bd_stock_movements;assert.equal(values.length,438);
 const {r,scope,db,journal}=await setup([]);t.after(r.close);
 // Preserve actual source IDs/venue without touching remote data.
 r.sqlite.exec('PRAGMA foreign_keys=OFF');r.sqlite.prepare('UPDATE venues SET id=3389 WHERE id=?').run(scope.venueId);r.sqlite.prepare('UPDATE venue_memberships SET venue_id=3389 WHERE venue_id=?').run(scope.venueId);r.sqlite.exec('PRAGMA foreign_keys=ON');scope.venueId=3389;
 r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_stock_movements'").run(JSON.stringify(values),scope.accountId);
 while((await journal.copyLegacyJournal(db,scope)).state!=='verified'){}
 const all:unknown[]=[];let cursor:number|null=null;do{const p=await journal.journalPage(db,scope,cursor,100);all.push(...p.items);cursor=p.next;}while(cursor!==null);
 assert.deepEqual(all,values);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_recipe_snapshots').get()!.n,88);
});
test('targeted receipt facts preserve cost ordering, warehouse fallback and unknown cost after growth',async t=>{
 const {resolveCostBasis}=await import('../lib/bardoctor/cost-basis');
 const receipt=(id:string,extra:Record<string,unknown>={})=>({id,venueId:1,productKey:'water',type:'receipt',businessDate:'2026-10-01',createdAt:'2026-10-01T00:00:00Z',amount:10,unit:'l',costAmount:100,currency:'PMR',...extra});
 const receipts=[receipt('old',{businessDate:'2026-09-01'}),receipt('venue'),receipt('warehouse-old',{warehouseId:'bar',businessDate:'2026-09-01'}),receipt('latest-unknown',{warehouseId:' bar ',businessDate:' 2026-10-02 ',costStatus:'UNKNOWN'}),receipt('cancelled',{businessDate:'2026-10-03',status:'cancelled'}),receipt('reversed',{businessDate:'2026-10-03',reversedAt:'2026-10-04'}),receipt('future',{businessDate:'2026-12-01'}),receipt('invalid',{businessDate:'invalid'}),receipt('tie-Z',{createdAt:'2026-10-01T01:00:00Z'}),receipt('tie-a',{createdAt:'2026-10-01T01:00:00Z'})];
 const {r,scope,db,journal}=await setup(receipts);t.after(r.close);await journal.copyLegacyJournal(db,scope);await journal.activateJournal(db,scope);
 const growth=Array.from({length:500},(_,i)=>({...sample('growth-'+i),recipeSnapshot:{recipeId:'large',evidence:'x'.repeat(9000)}}));
 await db.batch(await journal.appendJournalStatements(db,scope,0,growth));
 assert.ok(Buffer.byteLength(JSON.stringify([...growth,...receipts]))>1_900_000);
 const facts=await journal.journalReceiptFacts(db,scope,['water'],'2026-10-16',1);
 assert.ok(facts.length<receipts.length);assert.ok(facts.every(x=>x.type==='receipt'));
 for(const warehouseId of [undefined,'bar','missing']){
  const args={venueId:1,warehouseId,nomenclatureItem:'water',asOf:'2026-10-16',accountingCurrency:'PMR'};
  assert.deepEqual(resolveCostBasis({...args,receipts:facts}),resolveCostBasis({...args,receipts:[...growth,...receipts]}));
 }
 assert.equal(resolveCostBasis({venueId:1,warehouseId:'bar',nomenclatureItem:'water',asOf:'2026-10-16',receipts:facts}).status,'UNKNOWN');
 assert.equal(Object.hasOwn((await journal.journalState(db,scope))!,'legacy_json'),false);
 await assert.rejects(journal.journalReceiptFacts(db,scope,['water'],'2026-10-16',0));
});
test('page rejects a concurrent append and receipt queries never fetch legacy backup',async t=>{
 const {r,scope,db,journal}=await setup([sample('old')]);t.after(r.close);await journal.copyLegacyJournal(db,scope);await journal.activateJournal(db,scope);
 const statements=await journal.appendJournalStatements(db,scope,0,[sample('new')]);
 r.onRead(async sql=>{assert.ok(!sql.includes('legacy_json'));assert.ok(!sql.includes('SELECT j.*'));if(sql.includes('ORDER BY m.position LIMIT')){r.onRead(null);await db.batch(statements);}});
 await assert.rejects(journal.journalPage(db,scope,null,100,0),/persisted domain state changed/);
});
test('changed source can restart staging; active cutover and original backup cannot be reset',async t=>{
 const {r,scope,db,journal}=await setup([sample('old')]);t.after(r.close);await journal.copyLegacyJournal(db,scope);
 const values=[sample('new'),sample('old')];r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_stock_movements'").run(JSON.stringify(values),scope.accountId);
 await assert.rejects(journal.copyLegacyJournal(db,scope),/SOURCE_CHANGED/);await journal.restartLegacyJournal(db,scope);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_recipe_snapshots').get()!.n,0);
 await journal.copyLegacyJournal(db,scope);await journal.activateJournal(db,scope);assert.deepEqual((await journal.journalPage(db,scope)).items,values);
 await assert.rejects(journal.restartLegacyJournal(db,scope),/NEEDS_REVIEW/);
 assert.throws(()=>r.sqlite.prepare("UPDATE domain_data SET data_json='[]' WHERE store_key='bd_stock_movements'").run(),/LEGACY_WRITE_FORBIDDEN/);
 assert.equal(r.sqlite.prepare('SELECT legacy_json FROM stock_journals').get()!.legacy_json,JSON.stringify(values));
});
test('valid JSON corruption of an immutable recipe snapshot is rejected on read',async t=>{
 const {r,scope,db,journal}=await setup([sample('old')]);t.after(r.close);await journal.copyLegacyJournal(db,scope);await journal.activateJournal(db,scope);
 r.sqlite.prepare("UPDATE stock_recipe_snapshots SET snapshot_json='{}'").run();await assert.rejects(journal.journalPage(db,scope),/NEEDS_REVIEW/);
});
