import fs from 'node:fs';import path from 'node:path';
import test from 'node:test';import assert from 'node:assert/strict';
import {costFixture} from './helpers/management-cost-fixture';
import {costEvaluationInputRevision} from '../lib/bardoctor/management-cost-observation';
const page=async(r:Awaited<ReturnType<typeof costFixture>>,cursor?:string,batchSize=3)=>{
 const response=await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{batchSize,...(cursor?{cursor}:{})}));
 return {status:response.status,...await response.json() as any};
};
async function run(r:Awaited<ReturnType<typeof costFixture>>,batchSize=3){let cursor:string|undefined;const pages:any[]=[];do{const p=await page(r,cursor,batchSize);assert.equal(p.status,200,JSON.stringify(p));assert.equal(p.coverage,'AVAILABLE',JSON.stringify(p));pages.push(p);cursor=p.nextCursor;assert.ok(pages.length<200);}while(cursor);return pages;}
function seedCards(r:Awaited<ReturnType<typeof costFixture>>,n=4){const a=r.correct();a.menuItems=Array.from({length:n},(_,i)=>({...a.menuItems[0],id:'m'+i}));a.recipes=a.menuItems.map((m:any,i:number)=>({...a.recipes[0],id:'r'+i,menuItemId:m.id,ownerId:m.id,...(i%2?{}:{ingredients:[]})}));r.seed('bd_assortment_v1',a);return a;}
const sums=(pages:any[])=>pages.reduce((s,p)=>({evaluated:s.evaluated+(p.evaluation?.evaluated||0),reused:s.reused+(p.evaluation?.reused||0)}),{evaluated:0,reused:0});
test('three-item snapshot matches legacy observations and verification; unchanged healthy and tracked cards reuse',async()=>{
 const old=await costFixture(),fresh=await costFixture();try{seedCards(old);seedCards(fresh);const oldPages=await run(old,1),pages=await run(fresh);assert.equal(sums(pages).evaluated,4);assert.equal(sums(pages).reused,2);
 const episodes=(r:typeof fresh)=>r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_episode_v1__:%' ORDER BY store_key").all().map(x=>JSON.parse(String(x.data_json)));
 assert.deepEqual(episodes(fresh),episodes(old));assert.equal(oldPages.length,6);assert.equal(pages.length,3);
 const before=fresh.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all();assert.deepEqual(sums(await run(fresh)),{evaluated:0,reused:6});assert.deepEqual(fresh.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all(),before);
 const a=fresh.read('bd_assortment_v1');a.recipes.forEach((x:any)=>x.ingredients=a.recipes[1].ingredients);fresh.seed('bd_assortment_v1',a);await run(fresh);assert.ok(episodes(fresh).every(e=>e.condition==='VERIFIED_RESOLVED'));
 }finally{old.close();fresh.close();}
});
for(const dependency of ['assortment','purchase','stock','profile','date','state'] as const)test('receipt invalidation: '+dependency,async()=>{
 const r=await costFixture();try{seedCards(r,2);await run(r);assert.equal(sums(await run(r)).evaluated,0);
 if(dependency==='assortment'){const a=r.read('bd_assortment_v1');a.canonicalProductAliases=[{from:'legacy',to:'product:water'}];r.seed('bd_assortment_v1',a);}
 if(dependency==='purchase'){const a=r.read('bd_purchase_documents');a[0].items[0].lineTotal=10;r.seed('bd_purchase_documents',a);}
 if(dependency==='stock')r.seed('bd_stock_movements',[{id:'receipt',type:'receipt',date:'2026-10-04',productKey:'product:water',amount:1,unit:'pcs',costAmount:10,costStatus:'KNOWN_VALUE',currency:'RUB',venueId:r.venueId}]);
 if(dependency==='profile')r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"RUB","name":"Changed profile"}',r.accountId);
 if(dependency==='date')r.setNow('2026-10-05T12:00:00Z');
 if(dependency==='state'){const row=r.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_state_v1__:%' LIMIT 1").get()!;const state=JSON.parse(String(row.data_json));state.stateVersion++;r.seed(String(row.store_key),state);}
 const p=await page(r);assert.ok(p.evaluation.evaluated>0,JSON.stringify(p));
 }finally{r.close()}
});
test('new/deleted cards, resume cursor and owner verification bypass stale receipt',async()=>{
 const r=await costFixture();try{let a=seedCards(r,4);const first=await page(r);assert.equal(first.evaluation.evaluated,3);assert.ok(first.nextCursor);await page(r,first.nextCursor);await run(r);
 a.menuItems.push({...a.menuItems[0],id:'m-new'});r.seed('bd_assortment_v1',a);await run(r);let listed=await(await r.api.costs.GET(r.request('/api/management/cost-signals?state=all'))).json() as any;assert.ok(listed.items.some((e:any)=>e.menuItemId==='m-new'));
 a.menuItems=a.menuItems.filter((m:any)=>m.id!=='m0');r.seed('bd_assortment_v1',a);await run(r);listed=await(await r.api.costs.GET(r.request('/api/management/cost-signals?state=all'))).json() as any;assert.equal(listed.items.find((e:any)=>e.menuItemId==='m0').condition,'NOT_APPLICABLE');
 const e=listed.items.find((e:any)=>e.menuItemId==='m-new');const result=await r.verify(e.signalId);assert.equal(result.status,200);assert.equal((await result.json() as any).episode.condition,'ACTIVE');
 }finally{r.close()}
});
for(const conflict of ['source','profile','access','state'] as const)test('atomic page race: '+conflict,async()=>{
 const r=await costFixture();try{seedCards(r,3);r.beforeNextDomainWrite(()=>{
  if(conflict==='source'){const a=r.read('bd_assortment_v1');a.recipes=[];r.seed('bd_assortment_v1',a);}
  if(conflict==='profile')r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"RUB","name":"Changed profile"}',r.accountId);
  if(conflict==='access')r.sqlite.prepare("UPDATE venue_memberships SET status='removed' WHERE venue_id=?").run(r.venueId);
  if(conflict==='state')r.seed('__bd_p4a_cost_state_v1__:'+r.venueId+':bTA',{version:1,scope:{venueId:999},menuItemId:'m0',generation:1});
 });const p=await page(r);
 if(conflict==='access'||conflict==='state'){assert.ok(p.status>=400);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_receipt_v1__:%'").get()!.n,0);}else{assert.equal(p.status,200);assert.equal(p.evaluation.evaluated,3);}
 }finally{r.close()}
});
for(const kind of ['missing','invalid','oversized','database'] as const)test('page failure never caches or partially commits: '+kind,async()=>{
 const r=await costFixture();try{seedCards(r,3);if(kind==='missing')r.sqlite.prepare("DELETE FROM domain_data WHERE store_key='bd_purchase_documents'").run();if(kind==='invalid')r.seed('bd_purchase_documents',{});if(kind==='oversized')r.seed('bd_purchase_documents',[{id:'x',name:'x'.repeat(2_000_001)}]);if(kind==='database')r.failDatabase();const p=await page(r);assert.ok(p.status>=400||p.coverage==='UNAVAILABLE');assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_receipt_v1__:%' OR store_key LIKE '__bd_p4a_cost_episode_v1__:%'").get()!.n,0);
 }finally{r.close()}
});
test('input identity includes scope, date, raw content, journal revision ',async()=>{
 const input={scope:{venueId:1,workspaceId:2,dataAccountId:3},profileJson:'{"currency":"RUB"}',now:'2026-10-04T00:00:00Z',snapshots:[{key:'bd_stock_movements',dataJson:'{"format":"stock_journal_v1","revision":1}',updatedAt:'same'}]};const original=await costEvaluationInputRevision(input);
 for(const changed of [{...input,scope:{...input.scope,venueId:2}},{...input,now:'2026-10-05T00:00:00Z'},{...input,snapshots:[{...input.snapshots[0],dataJson:input.snapshots[0].dataJson.replace(':1',':2')}]}])assert.notEqual(await costEvaluationInputRevision(changed),original);
 assert.equal(await costEvaluationInputRevision({...input,now:'2026-10-04T23:59:59Z'}),original);
});

test('calculator release invalidates retained receipts',async()=>{
 const old=await costFixture();const fresh=await costFixture({}, {plugins:[{name:'new-calculator-release',setup(build){build.onLoad({filter:/management-cost-observation\.ts$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace('current-recipe-cost-phase4a-v1','current-recipe-cost-phase4a-v2'),loader:'ts',resolveDir:path.dirname(args.path)}));}}]});
 try{seedCards(old,2);seedCards(fresh,2);await run(old);for(const row of old.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_%'").all())fresh.seed(String(row.store_key),JSON.parse(String(row.data_json)));assert.equal((await page(fresh)).evaluation.evaluated,2);}finally{old.close();fresh.close();}
});
test('journal migration, revision and future receipt date invalidate without weakening scope',async()=>{
 const r=await costFixture({}, {routes:{journal:'./lib/bardoctor/stock-journal',database:'./db'}});try{
 const a=seedCards(r,2);const receipts=[{id:'today',type:'receipt',productKey:'product:water',date:'2026-10-01',amount:1,unit:'pcs',costAmount:5,costStatus:'KNOWN_VALUE',currency:'RUB',venueId:r.venueId},{id:'future',type:'receipt',productKey:'product:water',date:'2026-10-05',amount:1,unit:'pcs',costAmount:9,costStatus:'KNOWN_VALUE',currency:'RUB',venueId:r.venueId}];r.seed('bd_stock_movements',receipts);await run(r);
 const db=(r.api.database as any).getD1(),journal=r.api.journal as any,scope={accountId:r.accountId,venueId:r.venueId};await journal.copyLegacyJournal(db,scope);await journal.activateJournal(db,scope);
 let queries=0;r.onRead(sql=>{if(sql.includes('FROM stock_journal_movements'))queries++;});assert.equal((await page(r)).evaluation.evaluated,2);assert.equal(queries,1,'one journal receipt projection shared by page');
 queries=0;assert.equal((await page(r)).evaluation.evaluated,0);assert.equal(queries,0,'unchanged receipt uses guarded revision without journal expansion');
 const current=async()=>await(await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{menuItemId:'m1'}))).json() as any;assert.equal((await current()).observation.value,5);
 r.setNow('2026-10-05T12:00:00Z');assert.equal((await page(r)).evaluation.evaluated,2);assert.equal((await current()).observation.value,9);
 const marker=r.read('bd_stock_movements');await db.batch(await journal.appendJournalStatements(db,scope,marker.revision,[{...receipts[0],id:'later',date:'2026-10-05',costAmount:11}]));assert.equal((await page(r)).evaluation.evaluated,2);
 r.sqlite.prepare("UPDATE stock_journals SET state='copying' WHERE account_id=?").run(r.accountId);assert.equal((await page(r)).status,409,'cached source marker cannot bypass live journal state');r.sqlite.prepare("UPDATE stock_journals SET state='active' WHERE account_id=?").run(r.accountId);
 const other=await r.register('other-batch@isolated.test');const foreign=await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{batchSize:3},other,r.venueId));assert.ok(foreign.status>=400);
 const receiptRow=r.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_receipt_v1__:%' LIMIT 1").get()!;const receipt=JSON.parse(String(receiptRow.data_json));receipt.scope.venueId=999;r.seed(String(receiptRow.store_key),receipt);assert.ok((await page(r)).evaluation.evaluated>0);
 const forged=await r.api.store.PUT(r.request('/api/store/'+receiptRow.store_key,'PUT',{data:receipt}),{params:Promise.resolve({key:String(receiptRow.store_key)})} as never);assert.ok(forged.status>=400);
 }finally{r.close()}
});
test('all source shape errors and currency unknown bypass receipts, preserving existing active signals',async()=>{
 const r=await costFixture();try{seedCards(r,2);await run(r);const before=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_episode_v1__:%'").all();
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"INVALID"}',r.accountId);const p=await page(r);assert.equal(p.coverage,'UNAVAILABLE');assert.deepEqual(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_episode_v1__:%'").all(),before);
 }finally{r.close()}
});

test('exhausted CAS retries leave no partial episodes, receipts or advanced cursor',async()=>{
 const r=await costFixture();try{seedCards(r,3);let conflicts=0;const race=()=>{const a=r.read('bd_assortment_v1');a.menuItems[0].name='race'+(++conflicts);r.seed('bd_assortment_v1',a);r.beforeNextDomainWrite(race);};r.beforeNextDomainWrite(race);const result=await page(r);assert.equal(result.status,409);assert.equal(conflicts,3);assert.equal(result.nextCursor,undefined);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key LIKE '__bd_p4a_cost_%'").get()!.n,0);}finally{r.close()}
});

test('source change between pages restarts discovery so IDs before cursor cannot be missed',async()=>{
 const r=await costFixture();try{const a=seedCards(r,4);const first=await page(r);a.menuItems.push({...a.menuItems[0],id:'a-new'});r.seed('bd_assortment_v1',a);const resumed=await page(r,first.nextCursor);assert.equal(resumed.evaluation.evaluated,0);assert.equal(JSON.parse(resumed.nextCursor).after,'');const restarted=await page(r,resumed.nextCursor);assert.ok(restarted.items.some((e:any)=>e.menuItemId==='a-new'));assert.equal(restarted.evaluation.evaluated,3);}finally{r.close()}
});

test('large valid sources cap fresh calculation at one, while unchanged receipts still reuse three',async()=>{
 const r=await costFixture();try{const a=seedCards(r,3) as any;a.padding='x'.repeat(260_000);r.seed('bd_assortment_v1',a);const first=await page(r);assert.equal(first.evaluation.evaluated,1);assert.equal(JSON.parse(first.nextCursor).after,'m0');await run(r);const warm=await page(r);assert.equal(warm.evaluation.evaluated,0);assert.equal(warm.evaluation.reused,3);}finally{r.close()}
});

test('large expanded journal also limits new calculations despite a tiny source marker',async()=>{
 const r=await costFixture({}, {routes:{journal:'./lib/bardoctor/stock-journal',database:'./db'}});try{seedCards(r,3);r.seed('bd_stock_movements',Array.from({length:300},(_,i)=>({id:'tie'+i,venueId:r.venueId,type:'receipt',productKey:'product:water',date:'2026-10-01',amount:1,unit:'pcs',costAmount:5,costStatus:'KNOWN_VALUE',currency:'RUB',note:'x'.repeat(1000)})));
 const db=(r.api.database as any).getD1(),journal=r.api.journal as any,scope={accountId:r.accountId,venueId:r.venueId};for(let i=0;i<12;i++)await journal.copyLegacyJournal(db,scope);await journal.activateJournal(db,scope);assert.ok(JSON.stringify(r.read('bd_stock_movements')).length<100);
 const result=await page(r);assert.equal(result.status,200);assert.equal(result.evaluation.evaluated,1);assert.equal(JSON.parse(result.nextCursor).after,'m0');
 }finally{r.close()}
});
