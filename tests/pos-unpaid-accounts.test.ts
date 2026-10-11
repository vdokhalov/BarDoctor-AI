import test from 'node:test';
import assert from 'node:assert/strict';
import { openingRuntime } from './helpers/opening-runtime';
import { hasPermission, type AccessRole } from '../lib/bardoctor/access-control';
import { POS_ORDER_STORE_KEY, type PosOrder, posOrderAccountViews } from '../lib/bardoctor/pos-orders';
import { SALES_EVENT_STORE_KEY, planSalesShift } from '../lib/bardoctor/sales-events';
import { salesEventFixture } from './helpers/sales-event-fixture';

async function payload(response:Response){return await response.json() as {order:PosOrder;code?:string;duplicate?:boolean};}
function fixture() {
  let role:AccessRole='owner';
  const r=openingRuntime(new URL('../app/api/pos-orders/route.ts',import.meta.url),{hasPermission,authenticateRequest:async()=>({id:7,venueId:1,actorAccountId:role==='cashier'?44:7,role,firstName:'QA',restaurantJson:'{"currency":"MDL"}',permissions:['sales.view','sales.create','sales.post']})});
  const c=salesEventFixture();c.revenues=planSalesShift(c,'open_shift','source','Night');
  r.put('bd_assortment_v1',c.assortment);r.put('bd_finance_revenue',c.revenues);r.put('bd_operational_reports_v1',[{venueId:1,date:c.revenues[0].date,workdayStatus:'OPEN',staffing:[{employeeId:'a'}]}]);
  const send=(body:object)=>r.api.POST(new Request('http://isolated.test/api/pos-orders',{method:'POST',body:JSON.stringify({venueId:1,...body})}));
  const create=async()=>{const response=await send({action:'create',operationId:'create',orderId:'order',shiftId:'source',expectedRevision:0,tableNumber:'12',lines:[{id:'line',menuItemId:'beer',quantity:2}]});assert.equal(response.status,201,await response.clone().text());return (await payload(response)).order as PosOrder;};
  const cancel=(order:PosOrder,extra:object={})=>({action:'cancel_order',operationId:'cancel',orderId:order.id,expectedRevision:order.revision,reason:'Synthetic abandoned table',...extra});
  const snapshot=()=>r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all();
  return {...r,c,send,create,cancel,snapshot,role:(v:AccessRole)=>{role=v;}};
}

test('unpaid grouping uses source shift and open workday, including overnight; never calendar age or ambiguous link',async()=>{
 const r=fixture();try{const order=await r.create(),c=r.c;c.now='2026-09-10T03:00:00Z';
 const old={...c.revenues[0],id:'old',date:'2026-09-08',closingStatus:'closed',payroll:999,cogs:999};c.revenues.push(old);
 const rows=[order,{...order,id:'historical',shiftId:'old'},{...order,id:'missing',shiftId:'missing'},{...order,id:'foreign',venueId:2}];
 const days=[{venueId:1,date:c.revenues[0].date,workdayStatus:'OPEN'}];
 let views=posOrderAccountViews(c,rows,days,true);assert.deepEqual(views.map(x=>'accountContext'in x?x.accountContext.group:null),['CURRENT','PAST','REVIEW']);
 assert.deepEqual(views[1].lines,order.lines);assert.doesNotMatch(JSON.stringify(views),/payroll|cogs/);
 const missingDay=posOrderAccountViews(c,[order],[],true)[0];assert.equal('accountContext'in missingDay&&missingDay.accountContext.group,'REVIEW');
 const duplicatedDay=posOrderAccountViews(c,[order],[...days,{...days[0],workdayStatus:'CLOSED'}],true)[0];assert.equal('accountContext'in duplicatedDay&&duplicatedDay.accountContext.group,'REVIEW');
 c.revenues.push({...old,id:'second-open',closingStatus:'open'});views=posOrderAccountViews(c,rows,days,true);assert.equal('accountContext'in views[0]&&views[0].accountContext.group,'REVIEW');c.revenues.pop();
 c.revenues.push({...old,id:'source'});views=posOrderAccountViews(c,rows,days,true);assert.equal('accountContext'in views[0]&&views[0].accountContext.group,'REVIEW');c.revenues.pop();
 views=posOrderAccountViews(c,rows,[{...days[0],workdayStatus:'CLOSED'}],true);assert.equal('accountContext'in views[0]&&views[0].accountContext.group,'PAST');
 c.actor={accountId:44,name:'Staff',role:'cashier'};views=posOrderAccountViews(c,[...rows,{...order,id:'paid-other',status:'PAID'}],days,false);assert.equal(views.length,3);assert.ok(views.every(x=>'accountContext'in x&&!x.accountContext.canCancel));
 }finally{r.close();}
});

for(const closingStatus of ['open','closed'])test(`historical ${closingStatus} cash cancellation preserves accounting and closed report; reason/audit/replay`,async()=>{
 const r=fixture();try{let order=await r.create();const pre=await r.send({action:'precheck',operationId:'precheck',orderId:order.id,expectedRevision:order.revision});assert.equal(pre.status,201);order=(await payload(pre)).order;
 r.put('bd_operational_reports_v1',[{venueId:1,date:r.c.revenues[0].date,workdayStatus:'CLOSED',report:{revenue:123,stock:456}}]);r.put('bd_finance_revenue',[{...r.c.revenues[0],closingStatus,closingReport:{revenue:123}}]);
 const keys=['bd_operational_reports_v1','bd_finance_revenue','bd_assortment_v1','bd_stock_movements',SALES_EVENT_STORE_KEY],before=keys.map(r.get);
 let response=await r.send(r.cancel(order,{reason:' '}));assert.equal(response.status,409);assert.equal((await payload(response)).code,'POS_ORDER_REASON_REQUIRED');
 response=await r.send(r.cancel(order));assert.equal(response.status,201,await response.clone().text());const cancelled=(await payload(response)).order;assert.equal(cancelled.status,'CANCELLED');assert.equal(cancelled.shiftId,'source');assert.equal(cancelled.precheck,null);assert.deepEqual(cancelled.lines,order.lines);assert.deepEqual(cancelled.totals,order.totals);assert.deepEqual(keys.map(r.get),before);
 const audit=r.sqlite.prepare("SELECT * FROM audit_log WHERE action='cancel_order'").all();assert.equal(audit.length,1);assert.equal(audit[0].reason,'Synthetic abandoned table');assert.deepEqual(JSON.parse(String(audit[0].before_json)).precheck,order.precheck);
 r.put('bd_month_closings',[{monthKey:'2026-09',status:'closed'}]);response=await r.send(r.cancel(order));assert.equal(response.status,200);assert.equal((await payload(response)).duplicate,true);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='cancel_order'").get()!.n,1);
 response=await r.send(r.cancel(order,{reason:'different'}));assert.equal(response.status,409);
 }finally{r.close();}
});

for(const evidence of ['salesEventId','paidAt','paidBy','payment','payments','paidAmount','operation','event-order','event-external','month','missing-shift','duplicate-shift','foreign-shift','invalid-date','wrong-currency','paid-status'])test(`cancellation rejects ${evidence} without a write`,async()=>{
 const r=fixture();try{const order=await r.create();const raw:Record<string,unknown>={...order};
 if(evidence==='salesEventId')raw.salesEventId='posted';if(evidence==='paidAt')raw.paidAt='2026-09-09T12:00:00Z';if(evidence==='paidBy')raw.paidBy=order.createdBy;
 if(evidence==='payment')raw.payment={amount:1};if(evidence==='payments')raw.payments=[{amount:1}];if(evidence==='paidAmount')raw.paidAmount=1;if(evidence==='operation')raw.operations=[...order.operations,{...order.operations[0],id:'partial',action:'partial_payment'}];
 if(evidence.startsWith('event-'))r.put(SALES_EVENT_STORE_KEY,[{id:'posted',venueId:1,fingerprint:'valid',batch:{},originalMovements:[],prices:[],status:'POSTED',...(evidence==='event-order'?{orderId:order.id}:{externalId:'pos-order:'+order.id})}]);
 if(evidence==='month')r.put('bd_month_closings',[{monthKey:'2026-09',status:'closed'}]);
 if(evidence==='missing-shift')r.put('bd_finance_revenue',[]);if(evidence==='duplicate-shift')r.put('bd_finance_revenue',[...r.c.revenues,...r.c.revenues]);if(evidence==='foreign-shift')r.put('bd_finance_revenue',r.c.revenues.map(x=>({...x,venueId:2})));
 if(evidence==='invalid-date')r.put('bd_finance_revenue',r.c.revenues.map(x=>({...x,date:'2026-02-31'})));if(evidence==='wrong-currency')r.put('bd_finance_revenue',r.c.revenues.map(x=>({...x,currency:'EUR'})));
 if(evidence==='paid-status')Object.assign(raw,{status:'PAID',salesEventId:'paid',paidAt:order.createdAt,paidBy:order.createdBy});r.put(POS_ORDER_STORE_KEY,[raw]);const before=r.snapshot(),audit=r.sqlite.prepare('SELECT * FROM audit_log').all();
 const response=await r.send(r.cancel(order));assert.equal(response.status,evidence==='month'?423:409,await response.clone().text());assert.deepEqual(r.snapshot(),before);assert.deepEqual(r.sqlite.prepare('SELECT * FROM audit_log').all(),audit);
 }finally{r.close();}
});

test('direct cancellation role/venue guards and stale revision survive CAS retries',async()=>{
 const r=fixture();try{const order=await r.create();for(const role of ['cashier','accountant','viewer'] as AccessRole[]){r.role(role);assert.equal((await r.send(r.cancel(order,{actor:{role:'owner'}}))).status,403);}r.role('owner');assert.equal((await r.send(r.cancel(order,{venueId:2}))).status,409);
 r.beforeBatch(()=>r.put(POS_ORDER_STORE_KEY,[{...order,revision:order.revision+1,comment:'Concurrent edit'}]));const response=await r.send(r.cancel(order));assert.equal(response.status,409);assert.equal((await payload(response)).code,'POS_ORDER_REVISION_CONFLICT');assert.equal((r.get(POS_ORDER_STORE_KEY) as PosOrder[])[0].comment,'Concurrent edit');assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='cancel_order'").get()!.n,0);
 }finally{r.close();}
});

test('linked partial payment arriving at CAS blocks cancellation on retry',async()=>{
 const r=fixture();try{const order=await r.create();r.beforeBatch(()=>r.put(SALES_EVENT_STORE_KEY,[{id:'partial',venueId:1,fingerprint:'valid',batch:{},originalMovements:[],prices:[],status:'POSTED',orderId:order.id}]));const response=await r.send(r.cancel(order));assert.equal(response.status,409);assert.equal((await payload(response)).code,'POS_ORDER_CANCELLATION_HAS_PAYMENT');assert.equal((r.get(POS_ORDER_STORE_KEY) as PosOrder[])[0].status,'OPEN');assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='cancel_order'").get()!.n,0);
 }finally{r.close();}
});

for(const winner of ['payment','cancellation'])test(`payment/cancellation CAS race: ${winner} wins exactly once`,async()=>{
 const r=fixture();try{const order=await r.create(),payment={id:'tender',method:'CARD_EXTERNAL',amount:40};
 const preview=await r.send({action:'preview_payment',operationId:'preview',orderId:order.id,expectedRevision:order.revision,payment});assert.equal(preview.status,200);const previewHash=(await preview.json() as {previewHash:string}).previewHash;
 const pay={action:'pay',operationId:'pay',orderId:order.id,expectedRevision:order.revision,payment,previewHash};
 if(winner==='payment'){assert.equal((await r.send(pay)).status,201);assert.equal((await r.send(r.cancel(order))).status,409);assert.equal((r.get(SALES_EVENT_STORE_KEY) as unknown[]).length,1);assert.equal((r.get(POS_ORDER_STORE_KEY) as PosOrder[])[0].status,'PAID');}
 else{assert.equal((await r.send(r.cancel(order))).status,201);assert.equal((await r.send(pay)).status,409);assert.equal(r.get(SALES_EVENT_STORE_KEY),null);assert.equal((r.get(POS_ORDER_STORE_KEY) as PosOrder[])[0].status,'CANCELLED');}
 }finally{r.close();}
});

test('legacy CLOSED day + OPEN cash permits cancellation then normal empty close, never new sale/payment',async()=>{
 const r=fixture();try{const order=await r.create();r.put('bd_operational_reports_v1',[{venueId:1,date:r.c.revenues[0].date,workdayStatus:'CLOSED',immutable:'report'}]);const before=r.get('bd_operational_reports_v1');
 assert.equal((await r.send({action:'create',operationId:'new',orderId:'new',shiftId:'source',tableNumber:'2',expectedRevision:0,lines:[{id:'l',menuItemId:'beer',quantity:1}]})).status,409);
 assert.equal((await r.send({action:'preview_payment',operationId:'preview',orderId:order.id,expectedRevision:order.revision,payment:{id:'p',method:'CASH',amount:40}})).status,409);
 assert.equal((await r.send(r.cancel(order))).status,201);
 const sales=r.loadRoute(new URL('../app/api/sales-events/route.ts',import.meta.url));const response=await sales.POST(new Request('http://isolated.test/api/sales-events',{method:'POST',body:JSON.stringify({venueId:1,action:'close_shift',shiftId:'source'})}));assert.equal(response.status,201,await response.clone().text());assert.equal((r.get('bd_finance_revenue') as {closingStatus:string}[])[0].closingStatus,'closed');assert.deepEqual(r.get('bd_operational_reports_v1'),before);
 }finally{r.close();}
});

for(const winner of ['payment','cancellation'])test(`CAS interleaving rejects in-flight loser after committed ${winner}`,async()=>{
 const r=fixture();try{const order=await r.create(),payment={id:'tender',method:'CARD_EXTERNAL',amount:40};
 const preview=await r.send({action:'preview_payment',operationId:'preview',orderId:order.id,expectedRevision:order.revision,payment});const previewHash=(await preview.json() as {previewHash:string}).previewHash;
 const pay={action:'pay',operationId:'pay',orderId:order.id,expectedRevision:order.revision,payment,previewHash};
 const initial=r.sqlite.prepare('SELECT * FROM domain_data').all(),initialAudit=r.sqlite.prepare('SELECT * FROM audit_log').all();
 const winnerCommand=winner==='payment'?pay:r.cancel(order),loser=winner==='payment'?r.cancel(order):pay;assert.equal((await r.send(winnerCommand)).status,201);const committed=r.sqlite.prepare('SELECT * FROM domain_data').all(),committedAudit=r.sqlite.prepare('SELECT * FROM audit_log').all();
 const restore=(table:string,rows:Record<string,unknown>[])=>{r.sqlite.exec('DELETE FROM '+table);for(const row of rows){const keys=Object.keys(row);r.sqlite.prepare('INSERT INTO '+table+'('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')').run(...Object.values(row) as (string|number|null)[]);}};
 restore('domain_data',initial);restore('audit_log',initialAudit);r.beforeBatch(()=>{restore('domain_data',committed);restore('audit_log',committedAudit);});
 const rejected=await r.send(loser);assert.equal(rejected.status,409);assert.equal((await payload(rejected)).code,'POS_ORDER_REVISION_CONFLICT');assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data').all(),committed);assert.deepEqual(r.sqlite.prepare('SELECT * FROM audit_log').all(),committedAudit);
 assert.equal((await r.send(winnerCommand)).status,200);assert.deepEqual(r.sqlite.prepare('SELECT * FROM audit_log').all(),committedAudit);
 }finally{r.close();}
});

test('historical discount/precheck cancellation retains immutable totals after live menu price change',async()=>{
 const r=fixture();try{let order=await r.create();const config=r.loadRoute(new URL('../app/api/pos-discounts/route.ts',import.meta.url));
 const saved=await config.POST(new Request('http://isolated.test/api/pos-discounts',{method:'POST',body:JSON.stringify({venueId:1,action:'save',ruleId:'rule',operationId:'rule-create',expectedRevision:0,rule:{name:'Loyalty',kind:'PERCENT',value:10,active:true}})}));assert.equal(saved.status,201,await saved.clone().text());
 const applied=await r.send({action:'apply_discount',operationId:'discount',orderId:order.id,expectedRevision:order.revision,ruleId:'rule',ruleRevision:1,reason:'Synthetic loyalty'});assert.equal(applied.status,201);order=(await payload(applied)).order;
 const pre=await r.send({action:'precheck',operationId:'pre',orderId:order.id,expectedRevision:order.revision});assert.equal(pre.status,201);order=(await payload(pre)).order;
 r.put('bd_finance_revenue',r.c.revenues.map(x=>({...x,closingStatus:'closed'})));r.put('bd_operational_reports_v1',[{venueId:1,date:r.c.revenues[0].date,workdayStatus:'CLOSED'}]);const assortment=structuredClone(r.c.assortment);(assortment.menuItems as {salePrice:number}[])[0].salePrice=30;r.put('bd_assortment_v1',assortment);
 const listed=await r.api.GET(new Request('http://isolated.test/api/pos-orders'));assert.equal(listed.status,200);const view=(await listed.json() as {orders:PosOrder[]}).orders[0];assert.deepEqual(view.totals,order.totals);assert.deepEqual(view.lines,order.lines);
 const cancelled=await r.send(r.cancel(order));assert.equal(cancelled.status,201);const result=(await payload(cancelled)).order;assert.deepEqual(result.discount,order.discount);assert.deepEqual(result.totals,order.totals);assert.deepEqual(r.get('bd_assortment_v1'),assortment);
 }finally{r.close();}
});

test('missing day, competing OPEN day and multiple OPEN cash do not widen legacy recovery',async()=>{
 for(const scenario of ['missing','competing-day','duplicate-day','multiple-cash']){const r=fixture();try{const order=await r.create();const date=r.c.revenues[0].date;
 r.put('bd_operational_reports_v1',scenario==='missing'?[]:scenario==='competing-day'?[{venueId:1,date,workdayStatus:'CLOSED'},{venueId:1,date:'2026-09-10',workdayStatus:'OPEN',staffing:[{}]}]:scenario==='duplicate-day'?[{venueId:1,date,workdayStatus:'CLOSED'},{venueId:1,date,workdayStatus:'CLOSED'}]:[{venueId:1,date,workdayStatus:'CLOSED'}]);
 if(scenario==='multiple-cash')r.put('bd_finance_revenue',[...r.c.revenues,{...r.c.revenues[0],id:'other'}]);const before=r.snapshot();const response=await r.send(r.cancel(order));assert.equal(response.status,409,scenario);assert.deepEqual(r.snapshot(),before);
 const listed=await r.api.GET(new Request('http://isolated.test/api/pos-orders'));assert.equal(listed.status,200);assert.equal((await listed.json() as {orders:{accountContext:{canCancel:boolean}}[]}).orders[0].accountContext.canCancel,false);
 }finally{r.close();}}
});
