import type {SalesEvent} from '../lib/bardoctor/sales-events';
import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {salesEventFixture,saleCommand} from './helpers/sales-event-fixture';
import {planSalesEvent,planSalesShift} from '../lib/bardoctor/sales-events';
import {seedOpenWorkday} from './helpers/pos-workday-fixture';
async function setup(initial:(SalesEvent & {unknown?:unknown})[]=[]){
 const r=await lifecycleRuntime({events:'./lib/bardoctor/sales-event-storage',stock:'./lib/bardoctor/stock-journal',database:'./db',sales:'./app/api/sales-events/route',pos:'./app/api/pos-orders/route',exportData:'./app/api/data-integrity/export/route',days:'./app/api/operational-days/route',evidence:'./app/api/evidence/resolve/route'});
 const owner=await r.register('events@isolated.test'),scope={accountId:owner.userId,venueId:owner.activeVenueId},db=(r.api.database as unknown as typeof import('../db')).getD1(),events=r.api.events as unknown as typeof import('../lib/bardoctor/sales-event-storage'),stock=r.api.stock as unknown as typeof import('../lib/bardoctor/stock-journal');
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(scope.accountId,key,JSON.stringify(value));
 const raw=(key='bd_sales_events_v1')=>String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(scope.accountId,key)?.data_json??'[]');
 put('bd_assortment_v1',salesEventFixture().assortment);put('bd_sales_events_v1',initial);put('bd_stock_movements',[]);
 put('bd_finance_revenue',planSalesShift({...salesEventFixture(),now:new Date().toISOString()},'open_shift','shift','Test'));
 const revenue=JSON.parse(raw('bd_finance_revenue'));for(const event of initial){let row=revenue.find((r:{id:string})=>r.id===event.revenueRowId);if(!row){row={id:event.revenueRowId,venueId:scope.venueId,currency:event.currency,revenueSource:'sales_events_v1',revenue:0,receipts:0,date:event.businessDate};revenue.push(row);}if(event.status==='POSTED'){row.revenue+=event.revenue;row.receipts++;}}put('bd_finance_revenue',revenue);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL'}),scope.accountId);seedOpenWorkday(r.sqlite,scope.accountId,scope.venueId);
 await stock.copyLegacyJournal(db,scope);await stock.activateJournal(db,scope);
 const send=(body:object)=>{const req=r.request(owner,'/api/sales-events','POST',{venueId:scope.venueId,...body});req.headers.set('Origin','https://isolated.test');return r.api.sales.POST(req);};
 const activate=async()=>{while((await events.copyLegacySalesEvents(db,scope)).state!=='verified'){}await events.activateSalesEvents(db,scope);};
 return {r,owner,scope,db,events,put,raw,send,activate};
}
async function example(){return (await planSalesEvent(salesEventFixture(),saleCommand('whisky',1))).event;}
test('migration preserves unknown event evidence, resumes, rejects source change and isolates venue',async t=>{
 const original=await example(),initial=[{...original,unknown:{keep:'yes'}},{...original,id:'reversed',externalId:'reversed',status:'REVERSED' as const,reversedAt:'2026-09-10T00:00:00Z'}];
 const {r,scope,db,events,raw,put}=await setup(initial);t.after(r.close);
 await events.copyLegacySalesEvents(db,scope,1);r.failDatabase();await assert.rejects(events.copyLegacySalesEvents(db,scope,1),/injected/);
 assert.equal((await events.salesEventState(db,scope))!.copied_count,1);
 await events.copyLegacySalesEvents(db,scope,1);put('bd_sales_events_v1',[]);await assert.rejects(events.activateSalesEvents(db,scope));put('bd_sales_events_v1',initial);
 await events.activateSalesEvents(db,scope);assert.deepEqual(await events.readSalesEvents(db,scope.accountId,raw()),JSON.parse(JSON.stringify(initial)));
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM sales_event_reversals').get()!.n,1);
 await assert.rejects(events.salesEventPage(db,{...scope,venueId:999},0));
 assert.throws(()=>put('bd_sales_events_v1',[]),/LEGACY_WRITE_FORBIDDEN/);
 r.sqlite.prepare("UPDATE sales_event_chunks SET payload='{}' WHERE event_id=? AND ordinal=0").run(original.id);await assert.rejects(events.readSalesEvents(db,scope.accountId,raw()),/NEEDS_REVIEW/);
});
test('growth over 4MB keeps sale reads targeted, concurrent sales/reversal atomic, retry and export complete',async t=>{
 const {r,scope,owner,db,events,raw,put,send,activate}=await setup();t.after(r.close);await activate();
 const sample=await example();
 // Real normalized writes, every payload >128KB; no oversized aggregate TEXT.
 for(let i=0;i<34;i++)await db.batch(await events.salesEventStatements(db,scope,i,[],[{...sample,id:'history-'+i,externalId:'history-'+i,unknown:'x'.repeat(128000)} as SalesEvent & {unknown:string}]));
 assert.ok(Buffer.byteLength(JSON.stringify(await events.readSalesEvents(db,scope.accountId,raw())))>4_000_000);
 const reads:string[]=[];r.onRead(sql=>{reads.push(sql);});
 const commands=['concurrent-a','concurrent-b'].map(id=>({...saleCommand('whisky',1),id,shiftId:'shift'}));
 const quotes=await Promise.all(commands.map(async command=>{const response=await send({action:'preview',command});assert.equal(response.status,200,await response.clone().text());return await response.json() as {previewHash:string;events:SalesEvent[]};}));
 const before=raw();r.failDatabase();await assert.rejects(send({action:'post',command:commands[0],previewHash:quotes[0].previewHash}),/injected/);assert.equal(raw(),before);
 const posted=await Promise.all(commands.map((command,i)=>send({action:'post',command,previewHash:quotes[i].previewHash})));
 const ids:string[]=[];for(const response of posted){assert.equal(response.status,201,await response.clone().text());ids.push((await response.json() as {event:SalesEvent}).event.id);}
 assert.equal((await send({action:'post',command:commands[0],previewHash:quotes[0].previewHash})).status,200);
 assert.ok(reads.filter(sql=>sql.includes('FROM sales_event_records')).every(sql=>sql.includes('external_id=?')||sql.includes('event_id=?')),'normal sale must not scan event history');r.onRead(null);
 assert.equal(JSON.parse(raw('bd_finance_revenue'))[0].revenue,80);assert.equal(JSON.parse(raw('bd_finance_revenue'))[0].receipts,2);
 // Duplicate concurrent reversal adds exactly one cancellation and one stock reversal.
 const reversed=await Promise.all([send({action:'reverse',eventId:ids[0]}),send({action:'reverse',eventId:ids[0]})]);assert.deepEqual(reversed.map(r=>r.status).sort(),[200,201]);
 assert.equal(JSON.parse(raw('bd_finance_revenue'))[0].revenue,40);assert.equal(JSON.parse(raw('bd_finance_revenue'))[0].receipts,1);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM sales_event_reversals').get()!.n,1);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()!.n,3);
 const report=await r.api.sales.GET(r.request(owner,'/api/sales-events?reportShiftId=shift'));assert.equal(report.status,200,await report.clone().text());assert.equal((await report.json() as {report:{totals:{paidRevenue:number}}}).report.totals.paidRevenue,40);
 const exported=await r.api.exportData.GET(r.request(owner,'/api/data-integrity/export'));assert.equal(exported.status,200,await exported.clone().text());assert.equal((await exported.json() as {snapshot:{relatedStores:{bd_sales_events_v1:SalesEvent[]}}}).snapshot.relatedStores.bd_sales_events_v1.length,36);
 const history=await events.readSalesEvents(db,scope.accountId,raw());assert.equal((history[0] as SalesEvent & {unknown:string}).unknown.length,128000);
 const other=await r.register('foreign-event@isolated.test');assert.equal((await events.readSalesEvents(db,other.userId,'[]')).length,0);await assert.rejects(events.readSalesEvents(db,other.userId,raw()));
});
test('normalized POS payment retries once; cashier refresh reads bounded event pages/payment identities',async t=>{
 const {r,scope,owner,db,events,raw,activate}=await setup();t.after(r.close);await activate();
 const sample=await example();for(let i=0;i<105;i++)await db.batch(await events.salesEventStatements(db,scope,i,[],[{...sample,id:'old-'+i,externalId:'old-'+i}]));
 const send=(body:object)=>{const req=r.request(owner,'/api/pos-orders','POST',{venueId:scope.venueId,...body});req.headers.set('Origin','https://isolated.test');return r.api.pos.POST(req);};
 const created=await send({action:'create',operationId:'create',orderId:'event-pos',expectedRevision:0,shiftId:'shift',tableNumber:'7',lines:[{id:'beer-line',menuItemId:'beer',quantity:3}]});assert.equal(created.status,201,await created.clone().text());const {order}=await created.json() as {order:{id:string;revision:number}};
 const base={orderId:order.id,expectedRevision:order.revision,payment:{id:'payment',method:'CASH',amount:60}};
 const preview=await send({...base,action:'preview_payment',operationId:'preview'});assert.equal(preview.status,200,await preview.clone().text());const quote=await preview.json() as {previewHash:string};
 const command={...base,action:'pay',operationId:'pay',previewHash:quote.previewHash};
 const before=raw();r.failDatabase();await assert.rejects(send(command),/injected/);assert.equal(raw(),before);
 const paid=await send(command);assert.equal(paid.status,201,await paid.clone().text());const event=(await paid.json() as {event:SalesEvent}).event;assert.equal((await send(command)).status,200);
 assert.equal(JSON.parse(raw('bd_finance_revenue'))[0].revenue,60);
 const reads:string[]=[];r.onRead(sql=>{reads.push(sql);});
 const response=await r.api.sales.GET(r.request(owner,'/api/sales-events'));assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json() as {previewHash:string;events:SalesEvent[]}).events.length,100);
 assert.ok(reads.some(sql=>sql.includes('ORDER BY position DESC LIMIT 100')));assert.equal(reads.filter(sql=>sql.includes('FROM sales_event_chunks')).length,100);
 reads.length=0;const orders=await r.api.pos.GET(r.request(owner,'/api/pos-orders'));assert.equal(orders.status,200,await orders.clone().text());assert.equal(reads.filter(sql=>sql.includes('FROM sales_event_chunks')).length,0);r.onRead(null);
 const ref={contractVersion:1,kind:'SALE_EVENT',id:event.id,venueId:scope.venueId,workspaceId:1};const evidence=await r.api.evidence.GET(r.request(owner,'/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(ref))));assert.equal(evidence.status,200,await evidence.clone().text());assert.ok(['resolved','partial'].includes((await evidence.json() as {outcome:string}).outcome));
});
test('revenue mismatch fails migration and post-cutover writes; staging restart and venue deletion preserve other owner data',async t=>{
 const original=JSON.parse(JSON.stringify(await example()));const {r,scope,owner,db,events,raw,put,send}=await setup([original]);t.after(r.close);
 await events.copyLegacySalesEvents(db,scope);const revenues=JSON.parse(raw('bd_finance_revenue'));put('bd_finance_revenue',[]);await assert.rejects(events.activateSalesEvents(db,scope),/REVENUE_NEEDS_REVIEW/);put('bd_finance_revenue',revenues);
 put('bd_sales_events_v1',[{...original,unknown:'changed'}]);await assert.rejects(events.copyLegacySalesEvents(db,scope),/SOURCE_CHANGED/);await events.restartLegacySalesEvents(db,scope);await events.copyLegacySalesEvents(db,scope);await events.activateSalesEvents(db,scope);
 await assert.rejects(events.restartLegacySalesEvents(db,scope));
 const command={...saleCommand('whisky',1),id:'new-after-cutover',shiftId:'shift'};
 const preview=await send({action:'preview',command});assert.equal(preview.status,200,await preview.clone().text());const quote=await preview.json() as {previewHash:string};
 const posted=await send({action:'post',command,previewHash:quote.previewHash});assert.equal(posted.status,201,await posted.clone().text());
 const marker=raw(),stock=raw('bd_stock_movements');put('bd_finance_revenue',revenues);const rejected=await send({action:'preview',command:{...command,id:'after-corruption'}});assert.equal(rejected.status,409);assert.equal((await rejected.json() as {code:string}).code,'SALES_EVENT_REVENUE_NEEDS_REVIEW');assert.equal(raw(),marker);assert.equal(raw('bd_stock_movements'),stock);
 const other=await r.register('retained-event-owner@isolated.test');
 await events.copyLegacySalesEvents(db,{accountId:other.userId,venueId:other.activeVenueId});await events.activateSalesEvents(db,{accountId:other.userId,venueId:other.activeVenueId});
 const deleted=await r.api.venue.DELETE(r.request(owner,`/api/venues/${scope.venueId}`,'DELETE',{confirmation:`Заведение №${scope.venueId}`}),{params:Promise.resolve({id:String(scope.venueId)})});assert.equal(deleted.status,200,await deleted.clone().text());
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM sales_event_records WHERE account_id=?').get(scope.accountId)!.n,0);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM sales_event_chunks WHERE account_id=?').get(scope.accountId)!.n,0);assert.ok(r.sqlite.prepare('SELECT id FROM accounts WHERE id=?').get(scope.accountId));assert.ok(await events.salesEventState(db,{accountId:other.userId,venueId:other.activeVenueId}));
});
test('bounded page hydration preserves100 events with measured chunk queries',async t=>{
 const sample=await example();const initial=Array.from({length:100},(_,i)=>({...sample,id:'read-'+i,externalId:'read-'+i,unknown:i===0?{text:'я'.repeat(33000)}:{index:i}}));
 const {r,scope,db,events,raw,activate}=await setup(initial);t.after(r.close);await activate();
 let chunkReads=0;const sqls:string[]=[];r.onRead(sql=>{if(sql.includes('FROM sales_event_chunks')){chunkReads++;sqls.push(sql)}});
 const actual=await events.readSalesEvents(db,scope.accountId,raw());
 assert.deepEqual(actual,JSON.parse(JSON.stringify(initial)));console.log(JSON.stringify({fixture:'100 events including multi-chunk Unicode',chunkReads,events:actual.length}));
 assert.equal(chunkReads,3);
});
for(const issue of ['missing','ordinal','hash','version','revision'] as const)test('batched hydration rejects '+issue,async t=>{
 const original=await example(),{r,scope,db,events,raw,activate}=await setup([original]);t.after(r.close);await activate();
 if(issue==='missing')r.sqlite.prepare('DELETE FROM sales_event_chunks WHERE account_id=? AND event_id=?').run(scope.accountId,original.id);
 if(issue==='ordinal')r.sqlite.prepare('UPDATE sales_event_chunks SET ordinal=9 WHERE account_id=? AND event_id=?').run(scope.accountId,original.id);
 if(issue==='hash')r.sqlite.prepare("UPDATE sales_event_chunks SET payload='{}' WHERE account_id=? AND event_id=?").run(scope.accountId,original.id);
 if(issue==='version')r.sqlite.prepare('UPDATE sales_event_records SET version=1 WHERE account_id=? AND event_id=?').run(scope.accountId,original.id);
 if(issue==='revision'){let changed=false;r.onRead(sql=>{if(!changed&&sql.includes('FROM sales_event_chunks')){changed=true;r.sqlite.prepare('UPDATE sales_event_journals SET revision=revision+1 WHERE account_id=?').run(scope.accountId)}})}
 await assert.rejects(events.readSalesEvents(db,scope.accountId,raw()));
});
