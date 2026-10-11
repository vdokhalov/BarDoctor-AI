import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { salesEventFixture } from './helpers/sales-event-fixture';

test('live cash and sales require the same open workday; replay and legacy facts remain intact',async t=>{
 const r=await lifecycleRuntime({sales:'./app/api/sales-events/route',orders:'./app/api/pos-orders/route'},{now:'2026-10-11T01:00:00Z'});t.after(r.close);
 const owner=await r.register('workday-gate@isolated.test'),venue=owner.activeVenueId;
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"Europe/Chisinau"}',owner.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const get=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json||'[]'));
 const post=(body:object,api='sales',user=owner)=>r.api[api].POST(new Request(r.request(user,'/api/'+api,'POST',{venueId:venue,...body}),{headers:{...Object.fromEntries(r.request(user,'/').headers),'x-venue-id':String(venue),'content-type':'application/json'}}));
 put('bd_assortment_v1',salesEventFixture().assortment);
 const open={action:'open_shift',shiftId:'cash',name:'Cash'},day={id:'day',venueId:venue,date:'2026-10-10',workdayStatus:'OPEN',staffing:[{employeeId:'a'}]};
 assert.equal((await post(open)).status,409);assert.deepEqual(get('bd_finance_revenue'),[]);
 put('bd_operational_reports_v1',[{...day,venueId:venue+1}]);assert.equal((await post(open)).status,409);
 put('bd_operational_reports_v1',[{...day,date:'2026-10-11',workdayStatus:'CLOSED'}]);assert.equal((await post(open)).status,409);
 put('bd_operational_reports_v1',[{...day,staffing:[]}]);assert.equal((await post(open)).status,409);
 put('bd_operational_reports_v1',[day]);assert.equal((await post(open)).status,201);assert.equal(get('bd_finance_revenue')[0].date,'2026-10-10','overnight cash uses persisted workday date');
 const sale={id:'sale',source:'POS_API',shiftId:'cash',lines:[{id:'line',menuItemId:'beer',quantity:1}],payments:[{id:'payment',method:'CASH',amount:20}]};
 const preview=await (await post({action:'preview',command:sale})).json() as {previewHash:string};assert.ok(preview.previewHash);
 assert.equal((await post({action:'post',command:sale,previewHash:preview.previewHash})).status,201);
 const order={action:'create',operationId:'order-create',orderId:'order',shiftId:'cash',expectedRevision:0,tableNumber:'1',lines:[{id:'l',menuItemId:'beer',quantity:1}]};
 assert.equal((await post(order,'orders')).status,201);
 assert.equal((await post({action:'precheck',operationId:'precheck',orderId:'order',expectedRevision:1},'orders')).status,201);
 const payment={action:'preview_payment',operationId:'preview-pay',orderId:'order',expectedRevision:2,payment:{id:'opay',method:'CASH',amount:20}};const payPreview=await(await post(payment,'orders')).json() as {previewHash:string};assert.ok(payPreview.previewHash);
 const auditBefore=r.sqlite.prepare('SELECT count(*) n FROM audit_log').get()!.n;
 const before={events:get('bd_sales_events_v1'),moves:get('bd_stock_movements'),orders:get('bd_pos_orders_v1'),revenues:get('bd_finance_revenue')};
 for(const days of [[],[{...day,workdayStatus:'CLOSED'}],[{...day,date:'2026-10-11'}],[{...day,venueId:venue+1}]]){
  put('bd_operational_reports_v1',days);
  assert.equal((await post({...open})).status,200,'existing open-shift replay');assert.equal((await post({action:'post',command:sale,previewHash:preview.previewHash})).status,200,'paid replay');assert.equal((await post(order,'orders')).status,200,'order replay');
  assert.equal((await post({action:'preview',command:{...sale,id:'blocked'}})).status,409);
  assert.equal((await post({...order,operationId:'blocked',orderId:'blocked'},'orders')).status,409);
  assert.equal((await post(payment,'orders')).status,409);assert.equal((await post({...payment,action:'pay',operationId:'pay',previewHash:payPreview.previewHash},'orders')).status,409);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM audit_log').get()!.n,auditBefore);
  assert.deepEqual({events:get('bd_sales_events_v1'),moves:get('bd_stock_movements'),orders:get('bd_pos_orders_v1'),revenues:get('bd_finance_revenue')},before);
 }
 put('bd_operational_reports_v1',[day]);assert.equal((await post({action:'preview',command:{...sale,id:'restored'}})).status,200);
 const staff=await r.register('workday-staff-gate@isolated.test'),workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,staff.userId);r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'cashier','active')").run(venue,staff.userId);
 assert.equal((await post({action:'open_shift',shiftId:'staff',name:'No'},'sales',staff)).status,403);
 assert.equal((await post({action:'preview',command:{...sale,id:'staff'}},'sales',staff)).status,200);
 assert.equal((await post({...open,venueId:venue+1})).status,409);
});

test('concurrent workday close prevents both cash opening and saved-order creation atomically',async t=>{
 const {openingRuntime}=await import('./helpers/opening-runtime');const {planSalesShift}=await import('../lib/bardoctor/sales-events');
 for(const endpoint of ['sales-events','pos-orders']){
  const r=openingRuntime(new URL('../app/api/'+endpoint+'/route.ts',import.meta.url));t.after(r.close);const c=salesEventFixture();c.revenues=planSalesShift(c,'open_shift','cash','Cash');
  r.put('bd_assortment_v1',c.assortment);r.put('bd_finance_revenue',endpoint==='pos-orders'?c.revenues:[]);
  const day={venueId:1,date:String(c.revenues[0].date),workdayStatus:'OPEN',staffing:[{employeeId:'a'}]};r.put('bd_operational_reports_v1',[day]);r.beforeBatch(()=>r.put('bd_operational_reports_v1',[{...day,workdayStatus:'CLOSED'}]));
  const body=endpoint==='sales-events'?{action:'open_shift',shiftId:'new',name:'New'}:{action:'create',operationId:'create',orderId:'order',shiftId:'cash',expectedRevision:0,tableNumber:'1',lines:[{id:'line',menuItemId:'beer',quantity:1}]};
  const response=await r.api.POST(new Request('https://isolated.test/api',{method:'POST',body:JSON.stringify({venueId:1,...body})}));assert.equal(response.status,409);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM audit_log').get()!.n,0);assert.equal(r.get('bd_pos_orders_v1'),null);if(endpoint==='sales-events')assert.deepEqual(r.get('bd_finance_revenue'),[]);
 }
});
