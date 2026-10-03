import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aggregateReviews } from '../lib/bardoctor/review-aggregate';
import { reviewLayerSummary, homeReviewMetrics, reviewsForGoogleLocation, type CanonicalReview } from '../lib/bardoctor/review-model';
import { itemSalesInputs } from '../lib/bardoctor/item-sales-inputs';
import { buildAssortmentAnalytics } from '../lib/bardoctor/assortment-analytics';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';

type Row = Record<string, unknown>;
type QAReply = {inputManifest:{scope:{dataAccountId:number}}; eligible:boolean; previewRevision:string; reasons:string[]; report:Row; components:Row; evidenceStatus:string; idempotent:boolean; closing:{snapshot:Row;inputManifest:{scope:{dataAccountId:number};sources:unknown[]};reopenHistory:{reason:string}[]} };
const qa = (response: Response) => response as Omit<Response, "json"> & {json():Promise<QAReply>};
const captured = JSON.parse(readFileSync(new URL('./fixtures/financial-reconciliation-phase7.json', import.meta.url), 'utf8'));
const native = () => structuredClone(captured.events.find((event: Row) => event.status === 'POSTED'));
const review = (rating: unknown, overrides: Row = {}) => ({ id: crypto.randomUUID(), date: '2026-09-02', publishedAt: '2026-09-02', rating, aiStatus: 'pending', source: 'manual', topics: [], ...overrides });
for (const [label, ratings, average, rated] of [['5,null', [5, null], 5, 1], ['all null', [null, null], null, 0], ['empty', [], null, 0], ['invalid zero', [0, 5], 5, 1], ['rounding', [4, 5, 5], 4.67, 3]] as const) test(`G12 ${label}: same rated denominator/null/rounding`, () => {
 const population = ratings.map(value => review(value));
 const aggregate = aggregateReviews(population), summary = reviewLayerSummary(population as unknown as CanonicalReview[]);
 assert.equal(aggregate.averageRating, average); assert.equal(aggregate.rated, rated); assert.equal(summary.averageRating, average); assert.equal(summary.analyzed, 0); assert.equal(aggregate.negativeShare, null);
});
test('G12 analyzed denominator, repeated compliments and complaints, pending sentiment excluded', () => {
 const values = [review(5,{aiStatus:'done',sentiment:'positive',topics:['service','service']}),review(null,{aiStatus:'done',sentiment:'positive',topics:['service']}),review(1,{aiStatus:'done',sentiment:'negative',topics:['wait']}),review(2,{aiStatus:'done',sentiment:'negative',topics:['wait']}),review(1,{sentiment:'negative',topics:['service']})];
 const result=aggregateReviews(values);assert.equal(result.analyzed,4);assert.equal(result.pendingAnalysis,1);assert.equal(result.negativeDenominator,4);assert.equal(result.negativeShare,.5);assert.deepEqual(result.recurringComplaints.map(item=>[item.topic,item.negative]),[['wait',2]]);assert.equal(result.compliments[0].positive,2);assert.equal(result.topics.find(item=>item.topic==='service')!.count,2);
 assert.equal(aggregateReviews(values,{start:'2026-10-01',end:'2026-10-31'}).averageRating,null);
});
test('G12 selected Google A/B and legacy unbound stay separate from manual population', () => {
 const selection={googleAccountId:'accounts/a',googleLocationId:'locations/a'};
 // Use canonical Phase3A.5 identity field names, never relabel history.
 const values=[review(1),review(5,{source:'google',sourceMetadata:{googleAccountId:'accounts/a',googleLocationId:'locations/a'}}),review(2,{source:'google',sourceMetadata:{googleAccountId:'accounts/a',googleLocationId:'locations/b'}}),review(3,{source:'google'})] as unknown as CanonicalReview[];
 const selected=reviewsForGoogleLocation(values,selection);assert.equal(selected.length,2);assert.equal(reviewLayerSummary(selected).averageRating,3);assert.equal(homeReviewMetrics(values,new Date('2026-10-03'),selection).averageRating,5);assert.equal(values[3].googleLocationId,undefined);
});
function analytics(events: unknown[], docs: unknown[] = [], batches: unknown[] = []) {
 const event=native();return buildAssortmentAnalytics({venueId:901,now:new Date('2026-09-30T12:00:00Z'),period:'2026-09',assortment:{menuItems:[{id:event.batch.lines[0].menuItemId,name:'Renamed menu',active:true,venueId:901,salePrice:60,currency:'MDL'}],recipes:[]},purchaseDocuments:[],salesEvents:events,salesDocuments:docs,salesBatches:batches,financeRevenue:captured.revenues});
}
test('G13 native, retry, reversal and stable renamed item identity use accepted quantities/revenue/cost',()=>{
 const event=native(),result=analytics([event,event]);const item=result.menuItems[0];assert.ok(item,JSON.stringify(result));assert.equal(item.sales!.quantity,event.prices[0].quantity);assert.equal(item.sales!.revenue,event.revenue);assert.equal(item.sales!.costOfGoods,event.batch.totalTheoreticalCost);assert.equal(analytics([{...event,status:'REVERSED'}]).menuItems[0].sales,null);
 const adapter=itemSalesInputs({venueId:901,events:[event],documents:[{id:'old-projection',salesBatchId:event.batch.id}],batches:[event.batch]});assert.equal(adapter.documents.length,1);assert.equal(adapter.batches.length,1);
});
test('G13 unknown captured cost is null even if a provisional zero exists; foreign nested facts excluded',()=>{
 const event=native();event.batch.lines[0].theoreticalCost=0;event.batch.lines[0].recipeSnapshot.ingredients[0].costStatus='UNKNOWN';assert.equal(analytics([event]).menuItems[0].sales!.costOfGoods,null);
 const foreign=native();foreign.batch.lines[0].venueId=999;assert.equal(itemSalesInputs({venueId:901,events:[foreign]}).documents.length,0);
});
async function closingFixture() {
 const runtime=await lifecycleRuntime({closing:'./app/api/month-close/route',store:'./app/api/store/[key]/route',bulkStore:'./app/api/store/route'},{now:'2026-10-03T12:00:00Z'});
 const user=await runtime.register('month-close@isolated.test');
 const venue=runtime.sqlite.prepare("SELECT * FROM venues WHERE id=?").get(user.activeVenueId)!;const account=Number(venue.data_account_id),venueId=user.activeVenueId;
 const mapVenue=(value: unknown): unknown => Array.isArray(value)?value.map(mapVenue):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,value])=>[key,key==='venueId'?venueId:mapVenue(value)])):value;
 const seed=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(account,key,JSON.stringify(mapVenue(value)),'2026-10-03T12:00:00Z');
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'UTC',workingDays:{1:false,2:false,3:true,4:false,5:false,6:false,7:false},trackingStartDate:'2026-09-02'}),account);
 seed('bd_finance_revenue',captured.revenues);seed('bd_sales_events_v1',captured.events);seed('bd_stock_movements',captured.movements);
 seed('bd_operational_reports_v1',[{id:'qa-report',venueId,date:'2026-09-02',closingStatus:'closed',payrollBreakdown:{total:90}}]);
 seed('bd_finance_expenses',[{id:'expense',venueId,date:'2026-09-02',amount:30,category:'rent',currency:'MDL'}]);seed('bd_payroll_entries',[{id:'bonus',venueId,date:'2026-09-02',amount:10,type:'bonus',currency:'MDL'},{id:'paid',venueId,date:'2026-09-02',amount:999,type:'payment',currency:'MDL'}]);
 seed('bd_inventory_snapshots',[{id:'open',venueId,date:'2026-09-01',currency:'MDL',total:600,sections:{bar:600}},{id:'end',venueId,date:'2026-10-01',currency:'MDL',total:324,sections:{bar:324}}]);
 seed('bd_finance_gap_reasons',['2026-09-09','2026-09-16','2026-09-23','2026-09-30'].map(date=>({id:date,venueId,date,resolved:true})));
 const get=async()=>qa(await runtime.api.closing.GET(runtime.request(user,'/api/month-close?monthKey=2026-09')));
 const post=async(body:unknown)=>qa(await runtime.api.closing.POST(runtime.request(user,'/api/month-close','POST',{monthKey:'2026-09',...body as object})));
 return{...runtime,user,account,venueId,seed,get,post};
}
test('G07 canonical components, content manifest, idempotent close, read proof and frozen history',async()=>{
 const r=await closingFixture();try{const preview=await(await r.get()).json();assert.equal(preview.eligible,true,JSON.stringify(preview));assert.equal(preview.report.payroll,100);assert.equal(preview.report.revenue,1200);assert.equal(preview.report.finalProfit,314);assert.equal(preview.components.capturedCOGS,720);assert.equal(preview.components.inventoryAdjustment,-36);
 const closed=await r.post({previewRevision:preview.previewRevision,snapshot:{finalProfit:999999}});assert.equal(closed.status,200,JSON.stringify(await closed.clone().json()));const result=await closed.json();assert.equal(result.closing.snapshot.finalProfit,314);assert.equal(result.closing.inputManifest.scope.dataAccountId,r.account);assert.equal(result.closing.inputManifest.sources.length,14);
 assert.equal((await(await r.get()).json()).evidenceStatus,'VERIFIED');assert.equal((await(await r.post({previewRevision:preview.previewRevision})).json()).idempotent,true);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='close'").get()!.n,1);
 const before=JSON.stringify(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key='bd_month_closings'").get());r.seed('bd_payroll_entries',[]);assert.equal((await(await r.get()).json()).closing.snapshot.finalProfit,314);assert.equal(JSON.stringify(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key='bd_month_closings'").get()),before);
 }finally{r.close()}
});
test('G07 stale read A / accepted expense B / close A conflicts, atomic CAS race and rollback',async()=>{
 const r=await closingFixture();try{const a=await(await r.get()).json();const acceptedB = await r.api.store.PUT(r.request(r.user,'/api/store/bd_finance_expenses','PUT',{data:[{id:'changed',date:'2026-09-02',amount:40,category:'rent',currency:'MDL'}],reason:'QA accepted B'}),{params:Promise.resolve({key:'bd_finance_expenses'})} as never);assert.equal(acceptedB.status,200);assert.equal((await r.post({previewRevision:a.previewRevision})).status,409);const b=await(await r.get()).json();r.beforeNextDomainWrite(()=>{r.seed('bd_payroll_entries',[])});assert.equal((await r.post({previewRevision:b.previewRevision})).status,409);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='close'").get()!.n,0);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key='bd_month_closings'").get()!.n,0);
 const c=await(await r.get()).json();r.failDatabase();await assert.rejects(r.post({previewRevision:c.previewRevision}),/injected/);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key='bd_month_closings'").get()!.n,0);
 }finally{r.close()}
});
test('G07 legacy partial never rewritten; guessed/foreign scope and nested authorization fail closed',async()=>{
 const r=await closingFixture();try{const old={id:'legacy',monthKey:'2026-09',status:'closed',snapshot:{finalProfit:321}};r.seed('bd_month_closings',[old]);const before=JSON.stringify(r.sqlite.prepare("SELECT * FROM domain_data").all());assert.equal((await(await r.get()).json()).evidenceStatus,'LEGACY_PARTIAL');assert.equal(JSON.stringify(r.sqlite.prepare("SELECT * FROM domain_data").all()),before);assert.equal((await r.post({previewRevision:'guess'})).status,409);assert.equal((await r.post({venueId:999,previewRevision:'guess'})).status,404);r.seed('bd_month_closings',[]);r.seed('bd_finance_expenses',[{id:'nested',date:'2026-09-02',amount:30,category:'rent',currency:'MDL',evidence:{workspaceId:999}}]);assert.equal((await(await r.get()).json()).eligible,false);
 }finally{r.close()}
});
test('G13 legacy/import plus native totals, stable item grain, no Finance double-add and current purchase never recosts past sales',()=>{
 const event=native(), legacy={id:'legacy',venueId:901,date:'2026-09-02',status:'confirmed',totalRevenue:60,items:[{id:'legacy-line',menuItemId:event.batch.lines[0].menuItemId,name:'Old menu name',quantity:1,grossSales:60}]};
 assert.equal(analytics([], [legacy]).economics.revenue,60);assert.equal(analytics([event],[legacy]).economics.revenue,1260);assert.equal(analytics([event],[{...legacy,source:'file_import'}]).menuItems[0].sales!.quantity,21);
 const before=analytics([event]);assert.equal(before.economics.revenue,1200);assert.equal(before.menuItems[0].sales!.costOfGoods,720);assert.equal(before.economics.costOfGoods,720);
});
test('G07 explicit reopen followed by verified reclose; generic close cannot bypass manifest',async()=>{
 const r=await closingFixture();try{
 const put=async(data:unknown)=>r.api.store.PUT(r.request(r.user,'/api/store/bd_month_closings','PUT',{data,reason:'QA explicit reopen'}),{params:Promise.resolve({key:'bd_month_closings'})} as never);
 assert.equal((await put([{id:'guessed',venueId:r.venueId,monthKey:'2026-09',status:'closed',snapshot:{finalProfit:999}}])).status,409);
 const p=await(await r.get()).json(),closed=await(await r.post({previewRevision:p.previewRevision})).json();const reopened={...closed.closing,status:'reopened',reopenedAt:'2026-10-03T12:00:00Z',reopenHistory:[{reason:'QA correction'}]};assert.equal((await put([reopened])).status,200);assert.equal((await put([{...reopened,status:'closed'}])).status,409);
 r.seed('bd_finance_expenses',[{id:'expense',date:'2026-09-02',amount:40,category:'rent',currency:'MDL'}]);const next=await(await r.get()).json();assert.notEqual(next.previewRevision,p.previewRevision);const reclosed=await(await r.post({previewRevision:next.previewRevision})).json();assert.equal(reclosed.closing.snapshot.finalProfit,304);assert.equal(reclosed.closing.reopenHistory[0].reason,'QA correction');assert.equal((await(await r.get()).json()).evidenceStatus,'VERIFIED');
 }finally{r.close()}
});
test('G07 owner/permitted manager/restricted manager/revoked/foreign tenant and atomic membership revocation',async()=>{
 const r=await closingFixture();try{
 const manager=await r.register('manager@phase3a8.isolated.test'),foreign=await r.register('foreign@phase3a8.isolated.test');const workspace=Number(r.sqlite.prepare('SELECT workspace_id n FROM venues WHERE id=?').get(r.venueId)!.n);
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspace,manager.userId);r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'manager')").run(r.venueId,manager.userId);
 const request=(who:typeof manager,method='GET',body?:unknown)=>{const req=r.request(who,'/api/month-close?monthKey=2026-09',method,body);req.headers.set('X-Venue-Id',String(r.venueId));return req};
 const preview=await r.api.closing.GET(request(manager));assert.equal(preview.status,200);const p=await preview.json() as QAReply;assert.equal(p.inputManifest.scope.dataAccountId,r.account);
 r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?').run('{"deny":["payroll.view"]}',r.venueId,manager.userId);assert.equal((await r.api.closing.GET(request(manager))).status,403);assert.equal((await r.api.closing.POST(request(manager,'POST',{monthKey:'2026-09',previewRevision:p.previewRevision}))).status,403);
 r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=NULL WHERE venue_id=? AND account_id=?').run(r.venueId,manager.userId);r.beforeNextDomainWrite(()=>{r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId,manager.userId)});assert.equal((await r.api.closing.POST(request(manager,'POST',{monthKey:'2026-09',previewRevision:p.previewRevision}))).status,409);assert.equal((await r.api.closing.GET(request(manager))).status,401);assert.equal((await r.api.closing.GET(request(foreign))).status,401);
 for(const scope of [{workspaceId:999},{dataAccountId:foreign.userId},{venueId:foreign.activeVenueId}])assert.equal((await r.post({...scope,previewRevision:p.previewRevision})).status,404);
 }finally{r.close()}
});
for (const [label,key,value,reason] of [
 ['unknown recurring','bd_finance_settings',[{id:'primary',taxModel:{mode:'fixed',amount:null}}],'RECURRING_INPUT_UNKNOWN'],
 ['unknown acquisition','bd_purchase_documents',[{id:'purchase',date:'2026-09-02',status:'confirmed',expenseCategory:'products',total:null}],'PURCHASE_AMOUNT_UNKNOWN'],
 ['unknown FOT','bd_operational_reports_v1',[{id:'qa-report',date:'2026-09-02',closingStatus:'closed'}],'PAYROLL'],
 ['unknown currency','bd_finance_expenses',[{id:'x',date:'2026-09-02',category:'rent',amount:30,currency:'USD'}],'EXPENSES_OR_CURRENCY'],
 ['unknown boundary','bd_inventory_snapshots',[],'INVENTORY_BOUNDARY_UNKNOWN'],
 ['unknown captured COGS','bd_sales_events_v1',[],'SALES_REVENUE_HISTORY_MISMATCH'],
] as const) test(`G07 ${label} cannot be finalized`,async()=>{const r=await closingFixture();try{r.seed(key,value);const p=await(await r.get()).json();assert.equal(p.eligible,false);assert.ok(p.reasons.includes(reason),JSON.stringify(p.reasons));assert.equal((await r.post({previewRevision:p.previewRevision})).status,422);}finally{r.close()}});
test('G13 newer receipt changes current recipe estimate, preserves captured historical margin byte for byte',()=>{
 const event=native(),saved=JSON.stringify(event),ingredients=event.batch.lines[0].recipeSnapshot.ingredients;
 const assortment={menuItems:[{id:event.batch.lines[0].menuItemId,name:'Renamed menu',venueId:901,active:true,consumptionMode:'RECIPE',salePrice:60,currency:'MDL'}],recipes:[{id:'current-recipe',menuItemId:event.batch.lines[0].menuItemId,venueId:901,current:true,lifecycleStatus:'current',status:'confirmed',reviewStatus:'approved',ingredients:ingredients.map((item:Row,index:number)=>({id:'i'+index,venueId:901,name:item.name,quantity:1,unit:item.baseUnit,nomenclatureItemId:item.productKey,purchaseProductKey:item.productKey}))}],nomenclature:ingredients.map((item:Row)=>({id:item.productKey,productKey:item.productKey,name:item.name,venueId:901,unit:item.baseUnit,active:true,kind:'stock'})),stockBalances:ingredients.map((item:Row)=>({key:item.productKey,productKey:item.productKey,name:item.name,venueId:901,unit:item.baseUnit,current:100,currency:'MDL'}))};
 const read=(unitCost:number)=>buildAssortmentAnalytics({venueId:901,period:'2026-09',now:new Date('2026-09-30T12:00:00Z'),assortment,purchaseDocuments:[],salesEvents:[event],stockMovements:ingredients.map((item:Row,index:number)=>({id:'receipt'+index,venueId:901,type:'receipt',status:'active',date:'2026-09-03',businessDate:'2026-09-03',productKey:item.productKey,unit:item.baseUnit,amount:100,costAmount:100*unitCost,costStatus:'KNOWN',currency:'MDL',sourceDocumentId:'new-purchase',sourceLineId:'line'+index}))});
 const old=read(12),next=read(20);assert.equal(old.menuItems[0].recipeCost,36);assert.equal(next.menuItems[0].recipeCost,60);assert.equal(next.menuItems[0].sales!.costOfGoods,720);assert.equal(next.menuItems[0].sales!.grossProfit,480);assert.deepEqual(next.menuItems[0].sales,old.menuItems[0].sales);assert.equal(JSON.stringify(event),saved);
});
test('G07 verified manifest cannot escape through raw/bulk store with restricted nested permissions',async()=>{
 const r=await closingFixture();try{const p=await(await r.get()).json();assert.equal((await r.post({previewRevision:p.previewRevision})).status,200);const manager=await r.register('raw-manifest@isolated.test');const workspace=Number(r.sqlite.prepare('SELECT workspace_id n FROM venues WHERE id=?').get(r.venueId)!.n);r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspace,manager.userId);r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,permissions_json) VALUES (?,?,'manager',?)").run(r.venueId,manager.userId,'{"deny":["payroll.view"]}');const request=r.request(manager,'/api/store/bd_month_closings');request.headers.set('X-Venue-Id',String(r.venueId));assert.equal((await r.api.store.GET(request,{params:Promise.resolve({key:'bd_month_closings'})} as never)).status,403);const bulkRequest=r.request(manager,'/api/store');bulkRequest.headers.set('X-Venue-Id',String(r.venueId));const bulk=await r.api.bulkStore.GET(bulkRequest);assert.equal(bulk.status,200);const bulkBody=await bulk.json() as {entries:Record<string,unknown>};assert.equal(bulkBody.entries.bd_month_closings,undefined);
 }finally{r.close()}
});
test('G12 calendar window includes the whole end day, excludes future and does not double-count a boundary day',()=>{
 const values=[review(5,{publishedAt:'2026-09-30T23:59:59Z'}),review(1,{publishedAt:'2026-10-01T00:00:00Z'})];assert.equal(aggregateReviews(values,{start:'2026-09-01',end:'2026-09-30'}).averageRating,5);
 const summary=reviewLayerSummary([review(5,{publishedAt:'2026-09-03T23:59:00Z'}),review(1,{publishedAt:'2026-09-02T23:59:00Z'}),review(1,{publishedAt:'2026-10-04'})] as unknown as CanonicalReview[],new Date('2026-10-03T12:00:00Z'));assert.equal(summary.trend.currentAverage,5);assert.equal(summary.trend.previousAverage,1);assert.equal(summary.trend.currentCount,1);
});
test('G07 permitted manager closes using recorded zero FOT plus bonus, never settlement payment',async()=>{
 const r=await closingFixture();try{r.seed('bd_operational_reports_v1',[{id:'qa-zero',venueId:r.venueId,date:'2026-09-02',closingStatus:'closed',payrollBreakdown:{total:0}}]);const manager=await r.register('zero-fot-manager@isolated.test');const workspace=Number(r.sqlite.prepare('SELECT workspace_id n FROM venues WHERE id=?').get(r.venueId)!.n);r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspace,manager.userId);r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'manager')").run(r.venueId,manager.userId);const request=(method='GET',body?:unknown)=>{const req=r.request(manager,'/api/month-close?monthKey=2026-09',method,body);req.headers.set('X-Venue-Id',String(r.venueId));return req};const preview=await r.api.closing.GET(request());assert.equal(preview.status,200);const p=await preview.json() as QAReply;assert.equal(p.eligible,true,JSON.stringify(p.reasons));assert.equal(p.report.payroll,10);assert.equal(p.report.payrollPaid,999);const closed=await r.api.closing.POST(request('POST',{monthKey:'2026-09',previewRevision:p.previewRevision}));assert.equal(closed.status,200);assert.equal((await closed.json() as QAReply).closing.snapshot.finalProfit,404);
 }finally{r.close()}
});
