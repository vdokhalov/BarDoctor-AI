import {readFileSync} from "node:fs";
import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {salesEventFixture,saleCommand} from './helpers/sales-event-fixture';
import {seedOpenWorkday} from './helpers/pos-workday-fixture';
import {planSalesShift} from '../lib/bardoctor/sales-events';
async function setup(snapshot?:any){
 const r=await lifecycleRuntime({sales:'./app/api/sales-events/route',pos:'./app/api/pos-orders/route',journal:'./lib/bardoctor/stock-journal',database:'./db',exportData:'./app/api/data-integrity/export/route',writeoffs:'./app/api/write-offs/route',history:'./app/api/inventory/movements/route',evidence:'./app/api/evidence/resolve/route'});
 const owner=await r.register('stock-sales@isolated.test'),scope={accountId:owner.userId,venueId:owner.activeVenueId};
 if(snapshot){r.sqlite.exec('PRAGMA foreign_keys=OFF');r.sqlite.prepare('UPDATE venues SET id=? WHERE id=?').run(snapshot.venue.id,scope.venueId);r.sqlite.prepare('UPDATE venue_memberships SET venue_id=? WHERE venue_id=?').run(snapshot.venue.id,scope.venueId);r.sqlite.prepare('UPDATE sessions SET active_venue_id=? WHERE active_venue_id=?').run(snapshot.venue.id,scope.venueId);r.sqlite.exec('PRAGMA foreign_keys=ON');scope.venueId=snapshot.venue.id;}
 const db=(r.api.database as any).getD1() as D1Database,journal=r.api.journal as any;
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const get=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json??'null'));
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:snapshot?'PMR_RUB':'MDL'}),owner.userId);
 if(snapshot)for(const [key,value] of Object.entries(snapshot.stores))put(key,value);
 put('bd_assortment_v1',snapshot?.stores.bd_assortment_v1??salesEventFixture().assortment);put('bd_finance_revenue',planSalesShift({...salesEventFixture(),venueId:scope.venueId,currency:snapshot?'PMR_RUB':'MDL',now:new Date().toISOString()},'open_shift','journal-shift','Journal test'));seedOpenWorkday(r.sqlite,owner.userId,scope.venueId);
 put('bd_stock_movements',snapshot?.stores.bd_stock_movements??[]);while((await journal.copyLegacyJournal(db,scope)).state!=='verified'){}await journal.activateJournal(db,scope);
 const send=(body:object)=>{const req=r.request(owner,'/api/sales-events','POST',{venueId:scope.venueId,...body});req.headers.set('Origin','https://isolated.test');return r.api.sales.POST(req);};
 return {r,owner,scope,db,journal,put,get,send};
}
test('normalized sale exceeds old capacity, uses targeted reads, atomically rolls back, retries and reverses once',async t=>{
 const {r,owner,scope,db,journal,get,send}=await setup();t.after(r.close);
 await db.batch(await journal.appendJournalStatements(db,scope,0,Array.from({length:500},(_,i)=>({id:'history-'+i,venueId:scope.venueId,type:'sale_consumption',productKey:'beer-stock',amount:-1,recipeSnapshot:{id:'historical',evidence:'x'.repeat(9000)}}))));
 const reads:string[]=[];r.onRead(sql=>{reads.push(sql);});
 const command={...saleCommand('whisky',2),shiftId:'journal-shift'};
 const preview=await send({action:'preview',command});assert.equal(preview.status,200,await preview.clone().text());const quote=await preview.json() as {previewHash:string};
 const before=get('bd_assortment_v1'),marker=get('bd_stock_movements'),finance=get('bd_finance_revenue');
 r.failDatabase();await assert.rejects(send({action:'post',command,previewHash:quote.previewHash}),/injected/);
 assert.deepEqual(get('bd_assortment_v1'),before);assert.deepEqual(get('bd_stock_movements'),marker);assert.deepEqual(get('bd_finance_revenue'),finance);assert.equal(get('bd_sales_events_v1'),null);
 const posted=await send({action:'post',command,previewHash:quote.previewHash});assert.equal(posted.status,201,await posted.clone().text());const result=await posted.json() as {event:{id:string}};
 assert.equal(get('bd_assortment_v1').stockBalances[1].current,1.9);
 assert.equal((await send({action:'post',command,previewHash:quote.previewHash})).status,200);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()!.n,501);
 assert.ok(reads.filter(sql=>sql.includes('stock_journal_movements')).every(sql=>sql.includes("kind='receipt'")||sql.startsWith('INSERT')||sql.startsWith('UPDATE')),'sale must never load full journal');
 r.onRead(null);
 const reversed=await send({action:'reverse',eventId:result.event.id});assert.equal(reversed.status,201,await reversed.clone().text());
 assert.equal(get('bd_assortment_v1').stockBalances[1].current,2);assert.equal((await send({action:'reverse',eventId:result.event.id})).status,200);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()!.n,502);
 const exported=await r.api.exportData.GET(r.request(owner,'/api/data-integrity/export'));assert.equal(exported.status,200,await exported.clone().text());
 const payload=await exported.json() as any;assert.equal(payload.snapshot.stores.bd_stock_movements.length,502);
 assert.equal(payload.snapshot.relatedStores.bd_sales_events_v1.length,1);
 assert.equal(payload.snapshot.stores.bd_stock_movements.filter((row:any)=>row.id.startsWith('history-')).length,500);
 assert.equal(payload.snapshot.stores.bd_stock_movements.find((row:any)=>row.id==='history-0').recipeSnapshot.evidence.length,9000);
});

test('actual 438 movements: local 202 PMR order persists and export retains every original value',{skip:!process.env.BD_STOCK_EXPORT},async t=>{
 const snapshot=JSON.parse(readFileSync(process.env.BD_STOCK_EXPORT!,'utf8')).snapshot;
 const {r,owner,scope,get,send}=await setup(snapshot);t.after(r.close);
 const command={id:'isolated-202-proof',source:'POS_API',shiftId:'journal-shift',payments:[{id:'isolated-cash',method:'CASH',amount:202}],lines:[
 {id:'flatwhite',menuItemId:'menu:draft:06666344-ccde-45a2-b772-552f3e0fb8f4:0',quantity:2},
 {id:'avocado',menuItemId:'menu:draft:4489f57b-8822-4af2-967b-f5d7677d37a4:0',quantity:2}]};
 const preview=await send({action:'preview',command});assert.equal(preview.status,200,await preview.clone().text());const quote=await preview.json() as any;
 const result=await send({action:'post',command,previewHash:quote.previewHash});assert.equal(result.status,201,await result.clone().text());
 assert.equal(get('bd_sales_events_v1')[0].revenue,202);assert.equal(get('bd_finance_revenue')[0].revenue,202);
 const exported=await r.api.exportData.GET(r.request(owner,'/api/data-integrity/export'));assert.equal(exported.status,200,await exported.clone().text());const output=await exported.json() as any;
 const movements=output.snapshot.stores.bd_stock_movements;const originalIds=new Set(snapshot.stores.bd_stock_movements.map((row:any)=>row.id));
 assert.deepEqual(movements.filter((row:any)=>originalIds.has(row.id)),snapshot.stores.bd_stock_movements);
 assert.ok(movements.length>438);assert.equal(output.snapshot.venue.id,scope.venueId);
 const marker=get('bd_stock_movements');assert.equal((await send({action:'post',command,previewHash:quote.previewHash})).status,200);assert.deepEqual(get('bd_stock_movements'),marker);
});

test('normalized writeoff and cancellation are atomic and paged history enforces revision and venue',async t=>{
 const {r,owner,scope,get}=await setup();t.after(r.close);
 const send=async(body:object)=>{const req=r.request(owner,'/api/write-offs','POST',{venueId:scope.venueId,...body});req.headers.set('Origin','https://isolated.test');return r.api.writeoffs.POST(req);};
 const document={id:'isolated-writeoff',date:new Date().toISOString().slice(0,10),location:'Bar',reasonCode:'spoilage',items:[{productKey:'whisky-stock',quantity:0.1,unit:'l'}]};
 const before=get('bd_assortment_v1');r.failDatabase();await assert.rejects(send({action:'post',document}),/injected/);assert.deepEqual(get('bd_assortment_v1'),before);
 const posted=await send({action:'post',document});assert.equal(posted.status,201,await posted.clone().text());assert.equal(get('bd_assortment_v1').stockBalances[1].current,1.9);
 assert.equal((await send({action:'post',document})).status,200);
 const history=await r.api.history.GET(r.request(owner,'/api/inventory/movements?limit=1'));assert.equal(history.status,200);const first=await history.json() as any;assert.equal(first.items.length,1);
 const cancelled=await send({action:'cancel',id:document.id});assert.equal(cancelled.status,200,await cancelled.clone().text());assert.equal(get('bd_assortment_v1').stockBalances[1].current,2);
 assert.equal((await send({action:'cancel',id:document.id})).status,200);
 const stale=await r.api.history.GET(r.request(owner,'/api/inventory/movements?revision='+first.revision));assert.equal(stale.status,409);
 const other=await r.register('foreign-history@isolated.test');const foreign=r.request(other,'/api/inventory/movements');foreign.headers.set('X-Venue-Id',String(scope.venueId));assert.notEqual((await r.api.history.GET(foreign)).status,200);
});
test('two concurrent normalized HTTP sales retry CAS without losing balance, revenue or journal rows',async t=>{
 const {r,get,send}=await setup();t.after(r.close);
 const commands=['parallel-a','parallel-b'].map(id=>({...saleCommand('whisky',1),id,shiftId:'journal-shift'}));
 const quotes=await Promise.all(commands.map(async command=>{const response=await send({action:'preview',command});assert.equal(response.status,200);return await response.json() as any;}));
 const responses=await Promise.all(commands.map((command,i)=>send({action:'post',command,previewHash:quotes[i].previewHash})));
 for(const response of responses)assert.equal(response.status,201,await response.clone().text());
 assert.equal(get('bd_assortment_v1').stockBalances[1].current,1.9);assert.equal(get('bd_finance_revenue')[0].revenue,80);
 assert.equal(get('bd_sales_events_v1').length,2);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()!.n,2);
});
test('normalized POS payment persists order, stock journal and revenue once',async t=>{
 const {r,owner,scope,get}=await setup();t.after(r.close);
 const send=async(body:object)=>{const request=r.request(owner,'/api/pos-orders','POST',{venueId:scope.venueId,...body});request.headers.set('Origin','https://isolated.test');return r.api.pos.POST(request);};
 const created=await send({action:'create',operationId:'create',orderId:'journal-pos',expectedRevision:0,shiftId:'journal-shift',tableNumber:'7',lines:[{id:'beer-line',menuItemId:'beer',quantity:3}]});
 assert.equal(created.status,201,await created.clone().text());const {order}=await created.json() as any;
 const payment={id:'payment',method:'CASH',amount:60},base={orderId:order.id,expectedRevision:order.revision,payment};
 const preview=await send({...base,action:'preview_payment',operationId:'preview'});assert.equal(preview.status,200,await preview.clone().text());const quote=await preview.json() as any;
 const command={...base,action:'pay',operationId:'pay',previewHash:quote.previewHash};
 r.failDatabase();await assert.rejects(send(command),/injected/);assert.equal(get('bd_assortment_v1').stockBalances[0].current,20);
 const paid=await send(command);assert.equal(paid.status,201,await paid.clone().text());assert.equal(get('bd_assortment_v1').stockBalances[0].current,17);
 assert.equal(get('bd_finance_revenue')[0].revenue,60);assert.equal((await send(command)).status,200);
 const event=get('bd_sales_events_v1')[0];
 for(const [kind,id] of [['CAPTURED_COST',event.id],['WAREHOUSE_MOVEMENT',event.originalMovements[0].id]]){
   const ref={contractVersion:1,kind,id,venueId:scope.venueId,workspaceId:1};
   const response=await r.api.evidence.GET(r.request(owner,'/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(ref))));
   assert.equal(response.status,200);const resolved=await response.json() as any;
   assert.ok(['resolved','partial'].includes(resolved.outcome),JSON.stringify(resolved));assert.ok(resolved.evidence);
 }

 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()!.n,1);
});
