import test from 'node:test';
import assert from 'node:assert/strict';
import * as a from '../lib/bardoctor/sales-accounting';
import {buildVenueAIContextFromSources} from '../lib/bardoctor/venue-ai-context';
import {buildBusinessIntelligenceFromVenueContext} from '../lib/bardoctor/business-intelligence';
import {openingRuntime} from './helpers/opening-runtime';
import * as consumption from '../lib/bardoctor/sales-consumption';
import * as salesRevenue from '../lib/bardoctor/sales-revenue';
import {normalizeSalesDocument} from '../lib/bardoctor/sales';
const now='2026-10-20T10:00:00Z';
const setting:a.SalesAccounting={version:1,venueId:1,changes:[{id:'manual-start',mode:'MANUAL',effectiveDate:'2026-09-01',createdAt:'2026-08-31T12:00:00Z',actorId:7}]};
const base={setting,venueId:1,currency:'MDL',date:'2026-10-19',now,timezone:'UTC',role:'owner',actorId:7,operationId:'qa-manual-001',expectedRevision:0,cash:100,card:200,revenues:[],closedMonths:new Set<string>()};
function context(mode:'MANUAL'|'POS',cost:number|null,receipts:number|null){
 const dates=['2026-09-21','2026-09-28','2026-10-05','2026-10-12','2026-10-19'];
 const manual=dates.map(date=>a.planManualTotals({...base,date,cogs:cost,receipts}).row);
 const revenues=mode==='MANUAL'?manual:manual.map((r,i)=>({id:'pos-'+i,venueId:1,date:r.date,currency:'MDL',revenue:300,receipts,revenueSource:'sales_events_v1',closingStatus:'closed'}));
 const events=mode==='MANUAL'?[]:revenues.flatMap((r,j)=>Array.from({length:receipts||1},(_,k)=>({r,i:j*100+k}))).map(({r,i})=>({id:'event-'+i,venueId:1,businessDate:r.date,revenueRowId:r.id,revenue:300/(receipts||1),currency:'MDL',source:'POS_API',status:'POSTED',...(cost===0?{batch:{id:'batch-'+i,venueId:1,businessDate:r.date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:0,lines:[{id:'line-'+i,salesBatchId:'batch-'+i,quantity:1,processingStatus:'POSTED',theoreticalCost:0,recipeSnapshot:{recipeId:'none',capturedAt:now,consumptionMode:'NONE',ingredients:[]}}]}}:{})}));
 const values:Record<string,unknown>={bd_finance_revenue:revenues,bd_operational_reports_v1:dates.map(date=>({venueId:1,date,closingStatus:'closed',payrollBreakdown:{total:40}})),bd_finance_expenses:[],bd_payroll_entries:[],bd_sales_events_v1:events,bd_sales_batches:[],bd_sales_documents:[],bd_stock_movements:[]};
 const stores=new Map(Object.entries(values).map(([key,data])=>[key,{data,updatedAt:now}]));
 return buildVenueAIContextFromSources('diagnosis',{accountProfile:{venueId:1,currency:'MDL',timezone:'UTC'},stores,now:new Date(now)});
}
for(const receipts of [null,0,3])for(const cost of [null,0])test(`real context manual unknown/zero and applicable POS parity: COGS=${cost}, receipts=${receipts}`,()=>{
 const contexts=[context('MANUAL',cost,receipts),context('POS',cost,receipts)];
 const intelligence=contexts.map(context=>buildBusinessIntelligenceFromVenueContext({venueId:1,context}));
 const [manual,pos]=intelligence;
 for(const id of (receipts===3?['finance','demand','operations','guests']:['demand','operations','guests'])){
  const m=manual.businessHealth.components.find(x=>x.id===id)!,p=pos.businessHealth.components.find(x=>x.id===id)!;
  assert.deepEqual({score:m.score,weight:m.weight,confidence:m.confidence},{score:p.score,weight:p.weight,confidence:p.confidence},id);
 }
 if(receipts===3)assert.equal(manual.businessHealth.score,pos.businessHealth.score);
 assert.equal(manual.businessHealth.components.find(x=>x.id==='finance')?.score==null,cost==null);
 for(const x of intelligence){
  assert.equal(x.businessHealth.components.find(c=>c.id==='operations')?.score,null);
  assert.equal(x.businessHealth.components.find(c=>c.id==='guests')?.score,null);
  assert.equal(x.selfServiceAnalytics.traffic.status,'unavailable');assert.equal(x.selfServiceAnalytics.averageCheck.status,'unavailable');
 }
 const period=contexts[0].promptData.performanceHistory.period as Record<string,unknown>;
 assert.equal(period.receipts,receipts==null?null:receipts*3);
 assert.equal(period.averageReceipt,receipts===3?100:null);
});
test('measured operations and guest evidence are preserved equally through both accounting contexts',()=>{
 const build=(mode:'MANUAL'|'POS')=>{
 const c=context(mode,0,3);c.promptData.guestFeedback={total:15,averageRating:4.5,negative:2,negativeDenominator:15,commonTopics:[]};
 return buildBusinessIntelligenceFromVenueContext({venueId:1,context:c,canonicalOperations:{unclosedShifts:1,stockAnomalies:0,criticalBlockers:0,recurringEquipmentFailures:0} as never}).businessHealth;
 };
 const m=build('MANUAL'),p=build('POS');
 for(const id of ['finance','demand','operations','guests'])assert.deepEqual(m.components.find(x=>x.id===id),p.components.find(x=>x.id===id),id);
 assert.equal(m.components.find(x=>x.id==='operations')?.score,85);assert.ok(m.components.find(x=>x.id==='guests')!.score!>0);
});
test('same operation ID with changed amounts rejects; new correction requires reason and exact revision',()=>{
 const first=a.planManualTotals(base);
 assert.throws(()=>a.planManualTotals({...base,revenues:first.revenues,cash:101}),/других итогов|другими|использован/);
 for(const reason of ['', ' ', 'x'.repeat(501)])assert.throws(()=>a.planManualTotals({...base,revenues:first.revenues,operationId:'correction-002',expectedRevision:1,reason}),a.SalesAccountingError);
 for(const expectedRevision of [-1,NaN,1.5,99])assert.throws(()=>a.planManualTotals({...base,revenues:first.revenues,operationId:'correction-002',expectedRevision,reason:'Correction'}),a.SalesAccountingError);
});
test('replacement rejects tampered staged document, stale revision, wrong target, nonowner and overlap',()=>{
 const first=a.planManualTotals(base),doc={id:'doc',date:base.date,totalRevenue:320};
 const input={revenues:first.revenues,venueId:1,date:base.date,role:'owner',request:{revenueId:first.row.id,expectedRevision:1,reason:'Verified'},stagedDocument:doc,document:doc};
 for(const change of [{document:{...doc,totalRevenue:321}},{role:'waiter'},{request:{...input.request,expectedRevision:2}},{request:{...input.request,revenueId:'other'}},{request:{...input.request,reason:''}},{revenues:[...first.revenues,{...first.row,id:'overlap'}]}])assert.throws(()=>a.manualImportReplacement({...input,...change}),a.SalesAccountingError);
});
test('second same-day imported document is staged without changing recognized facts',async()=>{
 const f=openingRuntime();try{
 const api=f.loadRoute(new URL('../app/api/sales/confirm/route.ts',import.meta.url),{...a,...consumption,...salesRevenue,normalizeSalesDocument});
 const old={id:'existing',venueId:1,date:base.date,revenue:300,currency:'MDL',revenueSource:'sales_documents',salesDocumentIds:['import-first']};
 f.put('bd_finance_revenue',[old]);f.put('bd_stock_movements',[]);f.put('bd_sales_documents',[]);
 const document={id:'import-second',date:base.date,currency:'MDL',totalRevenue:320,items:[{id:'line',name:'Coffee',quantity:1,confidence:1}]};
 const response=await api.POST(new Request('http://local/api/sales/confirm',{method:'POST',body:JSON.stringify({document})}));
 assert.equal(response.status,409);assert.equal((await response.json() as {staged:boolean}).staged,true);
 assert.deepEqual(f.get('bd_finance_revenue'),[old]);assert.deepEqual(f.get('bd_stock_movements'),[]);assert.deepEqual(f.get('bd_sales_documents'),[]);
 assert.equal((f.get(a.SALES_IMPORT_REVIEW_KEY) as unknown[]).length,1);
 }finally{f.close();}
});
test('mode effective date follows local date across DST and negative/positive UTC offsets',()=>{
 for(const [timezone,instant,expected] of [
 ['Europe/Chisinau','2026-03-28T22:30:00Z','2026-03-30'],
 ['Europe/Chisinau','2026-10-24T21:30:00Z','2026-10-26'],
 ['America/Los_Angeles','2026-10-20T01:00:00Z','2026-10-20'],
 ['Pacific/Kiritimati','2026-10-20T12:00:00Z','2026-10-22']]){
 const p=a.planSalesMode({...base,setting:{...setting,changes:setting.changes.map(x=>({...x,effectiveDate:'2020-01-01',createdAt:'2019-12-31T12:00:00Z'}))},mode:'POS',operationId:'qa-timezone-001',now:instant,timezone,reports:[],orders:[]});
 assert.equal(p.change.effectiveDate,expected,timezone);
 }
});
test('import replacement CAS protects a concurrent manual correction and cannot consume stock',async()=>{
 const f=openingRuntime();try{
 const api=f.loadRoute(new URL('../app/api/sales/confirm/route.ts',import.meta.url),{...a,...consumption,...salesRevenue,normalizeSalesDocument});
 const first=a.planManualTotals({...base,cogs:50});
 f.put(a.SALES_ACCOUNTING_KEY,setting);f.put('bd_finance_revenue',first.revenues);f.put('bd_stock_movements',[]);
 f.put('bd_assortment_v1',{menuItems:[{id:'service',venueId:1,name:'Service',active:true,type:'simple',consumptionMode:'NONE',currency:'MDL',salePrice:320}]});
 const document={id:'race-import',date:base.date,currency:'MDL',sourceType:'file_import',totalRevenue:320,items:[{id:'line',name:'Service',menuItemId:'service',quantity:1,confidence:1}]};
 const post=(replacement?:object)=>api.POST(new Request('http://local/api/sales/confirm',{method:'POST',body:JSON.stringify({document,replacement})}));
 assert.equal((await post()).status,409);
 const revised=a.planManualTotals({...base,revenues:first.revenues,operationId:'concurrent-correction',expectedRevision:1,reason:'Corrected total',cash:150,cogs:60});
 f.beforeBatch(()=>f.put('bd_finance_revenue',revised.revenues));
 const result=await post({revenueId:first.row.id,expectedRevision:1,reason:'Replacement'});
 assert.equal(result.status,409);assert.deepEqual(f.get('bd_finance_revenue'),revised.revenues);
 assert.deepEqual(f.get('bd_stock_movements'),[]);assert.equal(f.get('bd_sales_documents'),null);
 assert.equal((f.get(a.SALES_IMPORT_REVIEW_KEY) as Record<string,unknown>[])[0].status,'AWAITING_RECONCILIATION');
 }finally{f.close();}
});
