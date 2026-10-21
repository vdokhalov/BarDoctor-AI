import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const modules={journal:'./lib/bardoctor/stock-journal',database:'./db',journals:'./lib/bardoctor/fresh-venue-journals',stock:'./lib/bardoctor/stock-storage',events:'./lib/bardoctor/sales-event-storage',purchase:'./app/api/purchases/confirm/route',sale:'./app/api/sales-events/route'};
const profile={name:'Fresh second',businessType:'bar',country:'Moldova',city:'Tiraspol',currency:'MDL',timezone:'UTC'};
function state(r:any,accountId:number){return {stock:r.sqlite.prepare('SELECT * FROM stock_journals WHERE account_id=?').get(accountId),events:r.sqlite.prepare('SELECT * FROM sales_event_journals WHERE account_id=?').get(accountId),stores:r.sqlite.prepare("SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=? AND store_key IN ('bd_stock_movements','bd_sales_events_v1') ORDER BY store_key").all(accountId)}}
async function fresh(t:any){const r=await lifecycleRuntime(modules,{now:'2026-10-02T12:00:00Z'});t.after(r.close);const owner=await r.register('fresh@isolated.test');return {r,owner,api:r.api as any,db:(r.api as any).database.getD1()};}
test('signup and additional venue create both normalized journals before access; initializer retries preserve state and reject foreign scope',async t=>{
 const {r,owner,api,db}=await fresh(t);const first=state(r,owner.userId);assert.equal(first.stock.state,'active');assert.equal(first.events.state,'active');assert.equal(first.stores.length,2);
 const response=await r.api.venues.POST(r.request(owner,'/api/venues','POST',profile));assert.equal(response.status,201,await response.clone().text());const body=await response.json() as any;const venue=r.sqlite.prepare('SELECT * FROM venues WHERE id=?').get(body.activeVenueId)!;const second=state(r,Number(venue.data_account_id));assert.equal(second.stock.state,'active');assert.equal(second.events.state,'active');assert.notEqual(second.stock.account_id,first.stock.account_id);
 for(const x of [first,second]){assert.equal(x.stock.source_count,0);assert.equal(x.events.source_count,0);assert.equal(x.stock.revision,0);assert.equal(x.events.revision,0);for(const row of x.stores)assert.equal(JSON.parse(String(row.data_json)).revision,0)}
 await db.batch(api.journals.freshVenueJournalStatements(db,Number(venue.data_account_id),owner.userId,'later'));assert.deepEqual(state(r,Number(venue.data_account_id)),second);
 await assert.rejects(db.batch(api.journals.freshVenueJournalStatements(db,Number(venue.data_account_id),999,'later')));assert.deepEqual(state(r,owner.userId),first);
 for(const accountId of [owner.userId,Number(venue.data_account_id)]){const s=state(r,accountId);assert.deepEqual(await api.stock.readStockHistory(db,accountId,s.stores.find((x:any)=>x.store_key==='bd_stock_movements').data_json),[]);assert.deepEqual(await api.events.readSalesEvents(db,accountId,s.stores.find((x:any)=>x.store_key==='bd_sales_events_v1').data_json),[])}
});
test('failure inside initialization rolls back venue, both journals and markers; signup can retry',async t=>{
 const r=await lifecycleRuntime(modules);t.after(r.close);const db=(r.api as any).database.getD1(),batch=db.batch.bind(db);let fail=true;
 db.batch=async(statements:any[])=>{if(fail&&statements.some(s=>s.sql.includes('__fresh_journal_guard__'))){fail=false;r.failDatabase()}return batch(statements)};
 const signup=()=>r.api.register.POST(new Request('https://isolated.test/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'retry@isolated.test',password:'Isolated-Test-Password-123!',firstName:'Test'})}));
 assert.equal((await signup()).status,500);for(const table of ['venues','workspaces','stock_journals','sales_event_journals','domain_data','venue_memberships','sessions','accounts'])assert.equal(r.sqlite.prepare(`SELECT count(*) n FROM ${table}`).get()!.n,0,table);
 const response=await signup();assert.equal(response.status,201);const owner=await response.json() as any;const before=r.sqlite.prepare('SELECT * FROM venues').all();fail=true;
 assert.equal((await r.api.venues.POST(r.request(owner,'/api/venues','POST',profile))).status,500);assert.deepEqual(r.sqlite.prepare('SELECT * FROM venues').all(),before);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_journals').get()!.n,1);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM sales_event_journals').get()!.n,1);
 assert.equal((await r.api.venues.POST(r.request(owner,'/api/venues','POST',profile))).status,201);
});
test('first receipt and sale use normalized writers for signup and additional venue, with retry and canonical reads',async t=>{
 const {r,owner,api,db}=await fresh(t);const {salesEventFixture,saleCommand}=await import('./helpers/sales-event-fixture');const {planSalesShift}=await import('../lib/bardoctor/sales-events');const {seedOpenWorkday}=await import('./helpers/pos-workday-fixture');
 const second=await(await r.api.venues.POST(r.request(owner,'/api/venues','POST',profile))).json() as any;
 for(const venueId of [owner.activeVenueId,second.activeVenueId]){
  const accountId=Number(r.sqlite.prepare('SELECT data_account_id FROM venues WHERE id=?').get(venueId)!.data_account_id);
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({...profile,venueId}),accountId);
  const put=(k:string,v:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,k,JSON.stringify(v));
  const raw=(k:string)=>String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(accountId,k)!.data_json);
  const request=(path:string,body:unknown)=>{const req=r.request(owner,path,'POST',body);req.headers.set('X-Venue-Id',String(venueId));req.headers.set('Origin','https://isolated.test');return req};
  const fixture=salesEventFixture();fixture.venueId=venueId;fixture.now='2026-10-02T12:00:00Z';fixture.assortment=JSON.parse(JSON.stringify(fixture.assortment).replaceAll('"venueId":1','"venueId":'+venueId));for(const b of fixture.assortment.stockBalances as any[])b.current=0;
  put('bd_assortment_v1',fixture.assortment);put('bd_suppliers',[{id:'supplier',venueId,name:'Supplier'}]);
  const document={id:'first-receipt',venueId,documentType:'invoice',supplierId:'supplier',supplierName:'Supplier',date:'2026-10-02',currency:'MDL',source:'manual',total:100,items:[{id:'line',name:'Whisky',nomenclatureId:'nom-whisky',purchaseProductKey:'whisky-stock',quantity:1,unit:'l',unitPrice:100,lineTotal:100,quantityMode:'measure',category:'products',mappingSource:'manual'}]};
  const receipt=await api.purchase.POST(request('/api/purchases/confirm',{venueId,document}));assert.equal(receipt.status,201,await receipt.clone().text());const receiptRetry=await api.purchase.POST(request('/api/purchases/confirm',{venueId,document}));assert.ok([200,201,409].includes(receiptRetry.status));assert.equal((await api.stock.readStockHistory(db,accountId,raw('bd_stock_movements'))).length,1);
  put('bd_finance_revenue',planSalesShift(fixture,'open_shift','first-shift','Test'));seedOpenWorkday(r.sqlite,accountId,venueId,'2026-10-02');
  const command={...saleCommand('whisky',1),id:'first-sale',shiftId:'first-shift'};
  const preview=await api.sale.POST(request('/api/sales-events',{venueId,action:'preview',command}));assert.equal(preview.status,200,await preview.clone().text());const previewHash=(await preview.json()).previewHash;
  const posted=await api.sale.POST(request('/api/sales-events',{venueId,action:'post',command,previewHash}));assert.equal(posted.status,201,await posted.clone().text());
  const before=state(r,accountId),revenue=raw('bd_finance_revenue');assert.equal((await api.sale.POST(request('/api/sales-events',{venueId,action:'post',command,previewHash}))).status,200);assert.equal(raw('bd_finance_revenue'),revenue);assert.deepEqual(state(r,accountId),before);
  const movements=await api.stock.readStockHistory(db,accountId,raw('bd_stock_movements')),events=await api.events.readSalesEvents(db,accountId,raw('bd_sales_events_v1'));assert.equal(movements.length,2);assert.equal(events.length,1);assert.equal(events[0].venueId,venueId);assert.equal(events[0].batch.totalTheoreticalCost,5);
  assert.equal(JSON.parse(raw('bd_stock_movements')).format,'bardoctor-stock-journal-v1');assert.equal(JSON.parse(raw('bd_sales_events_v1')).format,'bardoctor-sales-events-v1');
  await db.batch(api.journals.freshVenueJournalStatements(db,accountId,owner.userId,'later'));assert.deepEqual(state(r,accountId),before);
 }
});
test('fresh normalized journals grow beyond 1.9 MB without eviction; bounded appends/pages preserve early IDs and hashes',async t=>{
 const {r,owner,api,db}=await fresh(t),scope={accountId:owner.userId,venueId:owner.activeVenueId};
 const movements=Array.from({length:440},(_,i)=>({id:'growth-'+i,venueId:scope.venueId,type:'receipt',productKey:'synthetic',amount:1,date:'2026-10-02',recipeSnapshot:{version:i,evidence:'x'.repeat(5000)}}));
 assert.ok(Buffer.byteLength(JSON.stringify(movements))>1900000);
 for(let i=0;i<movements.length;i+=20){const st=await api.journal.journalState(db,scope);await db.batch(await api.journal.appendJournalStatements(db,scope,st.revision,movements.slice(i,i+20)))}
 const st=await api.journal.journalState(db,scope),collected:any[]=[];let cursor:number|null=null;
 do{const page:{items:any[];next:number|null}=await api.journal.journalPage(db,scope,cursor,20,st.revision);assert.ok(Buffer.byteLength(JSON.stringify(page))<120000);collected.push(...page.items);cursor=page.next}while(cursor!==null);
 assert.equal(collected.length,440);const byId=new Map(collected.map(x=>[x.id,x]));for(const row of movements)assert.deepEqual(byId.get(row.id),row);
 const {salesEventFixture,saleCommand}=await import('./helpers/sales-event-fixture');const {planSalesEvent}=await import('../lib/bardoctor/sales-events');const fixture=salesEventFixture();fixture.now='2026-10-02T12:00:00Z';const planned=await planSalesEvent(fixture,saleCommand('ticket',1));
 const events=Array.from({length:24},(_,i)=>({...planned.event,id:'growth-event-'+i,externalId:'growth-external-'+i,originalMovements:[],diagnosticEvidence:'y'.repeat(90000)}));assert.ok(Buffer.byteLength(JSON.stringify(events))>1900000);
 for(const event of events){const state=await api.events.salesEventState(db,scope);await db.batch(await api.events.salesEventStatements(db,scope,state.revision,[],[event]))}
 const es=await api.events.salesEventState(db,scope),restored:any[]=[];let after=-1;
 while(true){const page=await api.events.salesEventPage(db,scope,es.revision,after,2);assert.ok(Buffer.byteLength(JSON.stringify(page))<200000);restored.push(...page.items);if(page.next===null)break;after=page.next}
 assert.equal(restored.length,events.length);for(let i=0;i<events.length;i++)assert.ok(JSON.stringify(restored[i])===JSON.stringify(events[i]),'exact JSON event '+i);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()!.n,440);
 const markers=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key IN ('bd_stock_movements','bd_sales_events_v1')").all(scope.accountId);assert.ok(markers.every(x=>Buffer.byteLength(String(x.data_json))<100));
 const last=state(r,scope.accountId);await db.batch(api.journals.freshVenueJournalStatements(db,scope.accountId,owner.userId,'retry'));assert.deepEqual(state(r,scope.accountId),last);
 console.info('FRESH_GROWTH',JSON.stringify({stockRows:440,stockBytes:Buffer.byteLength(JSON.stringify(movements)),events:24,eventBytes:Buffer.byteLength(JSON.stringify(events)),stockPage:20,eventPage:2}));
});
test('existing legacy accounts are not upgraded by authentication; partial pairs fail closed without overwriting markers',async t=>{
 const {r,owner,api,db}=await fresh(t);r.sqlite.prepare('DELETE FROM sales_event_journals WHERE account_id=?').run(owner.userId);const partial=state(r,owner.userId);
 await assert.rejects(db.batch(api.journals.freshVenueJournalStatements(db,owner.userId,owner.userId,'retry')));assert.deepEqual(state(r,owner.userId),partial);
 r.sqlite.prepare('DELETE FROM stock_journals WHERE account_id=?').run(owner.userId);
 r.sqlite.prepare("UPDATE domain_data SET data_json='[]' WHERE account_id=? AND store_key IN ('bd_stock_movements','bd_sales_events_v1')").run(owner.userId);const legacy=state(r,owner.userId);
 const account=await r.api.auth.findAccountByAppEmail(owner.email);assert.ok(account);await r.api.auth.ensureOwnerVenue(account!);assert.deepEqual(state(r,owner.userId),legacy);
 await assert.rejects(db.batch(api.journals.freshVenueJournalStatements(db,owner.userId,owner.userId,'retry')));assert.deepEqual(state(r,owner.userId),legacy);
});
test('concurrent signup/bootstrap cannot initialize a fresh account as legacy',async t=>{
 const r=await lifecycleRuntime(modules);t.after(r.close);let interleaved=false;
 r.beforeNextBatch(async()=>{const account=await r.api.auth.findAccountByAppEmail('concurrent@isolated.test');assert.ok(account);assert.equal(account!.migrationStatus,'initializing_normalized');interleaved=true;await r.api.auth.ensureOwnerVenue(account!)});
 const owner=await r.register('concurrent@isolated.test');assert.equal(interleaved,true);const stored=state(r,owner.userId);assert.equal(stored.stock.state,'active');assert.equal(stored.events.state,'active');assert.equal(r.sqlite.prepare('SELECT count(*) n FROM venues').get()!.n,1);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM workspaces').get()!.n,1);assert.equal((await r.api.auth.findAccountByAppEmail(owner.email))!.migrationStatus,'server_authoritative');
});
