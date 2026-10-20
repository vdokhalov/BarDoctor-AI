import test from 'node:test';
import assert from 'node:assert/strict';
import {planManualTotals,SALES_ACCOUNTING_KEY,type SalesAccounting} from '../lib/bardoctor/sales-accounting';
import {buildVenueAIContextFromSources} from '../lib/bardoctor/venue-ai-context';
import {buildBusinessIntelligenceFromVenueContext} from '../lib/bardoctor/business-intelligence';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const now='2026-10-20T10:00:00Z',date='2026-10-19';
const setting:SalesAccounting={version:1,venueId:1,changes:[{id:'manual-enabled',mode:'MANUAL',effectiveDate:'2026-10-01',createdAt:'2026-09-30T12:00:00Z',actorId:7}]};
const manual=planManualTotals({setting,venueId:1,actorId:7,role:'owner',currency:'MDL',date,now,timezone:'UTC',operationId:'final-gaps-001',expectedRevision:0,cash:100,card:200,cogs:60,receipts:1,revenues:[],closedMonths:new Set<string>()});
test('positive captured POS cost and declared manual cost agree through full context and all Health components',()=>{
 const revenue={id:'pos',venueId:1,date,currency:'MDL',revenue:300,receipts:1,revenueSource:'sales_events_v1',closingStatus:'closed'};
 const event={id:'sale',venueId:1,businessDate:date,revenueRowId:'pos',revenue:300,currency:'MDL',status:'POSTED',source:'POS_API',batch:{id:'batch',venueId:1,businessDate:date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:60,lines:[{id:'line',salesBatchId:'batch',quantity:1,processingStatus:'POSTED',theoreticalCost:60,currency:'MDL',recipeSnapshot:{recipeId:'recipe',capturedAt:now,consumptionMode:'RECIPE',ingredients:[{productKey:'beans',baseQuantityTotal:2,unitCost:30,totalCost:60,costStatus:'KNOWN_VALUE',currency:'MDL'}]}}]}};
 const build=(isManual:boolean)=>{
 const stores=new Map(Object.entries({bd_finance_revenue:isManual?manual.revenues:[revenue],bd_sales_events_v1:isManual?[]:[event],bd_stock_movements:isManual?[]:[{id:'movement',venueId:1,date,businessDate:date,type:'sale_consumption',salesBatchId:'batch',currency:'MDL'}],bd_sales_documents:[],bd_sales_batches:[],bd_operational_reports_v1:[{venueId:1,date,closingStatus:'closed',payrollBreakdown:{total:40}}],bd_finance_expenses:[{venueId:1,date,amount:20,category:'rent',currency:'MDL'}],bd_payroll_entries:[]}).map(([key,data])=>[key,{data,updatedAt:now}]));
 const context=buildVenueAIContextFromSources('diagnosis',{accountProfile:{venueId:1,currency:'MDL',timezone:'UTC'},stores,now:new Date(now)});
 return {period:context.promptData.performanceHistory.period as any,health:buildBusinessIntelligenceFromVenueContext({venueId:1,context}).businessHealth};
 };
 const m=build(true),p=build(false);
 for(const result of [m,p]){assert.equal(result.period.inputContract.costOfGoods,60);assert.equal(result.period.resultAfterCost,180);assert.deepEqual(result.period.inputContract.costReasons,[]);assert.equal(result.health.components.find(x=>x.id==='finance')?.score,90);}
 assert.deepEqual(m.health.components,p.health.components);assert.equal(m.health.score,p.health.score);
 assert.equal(m.period.inputContract.costBasis,'OWNER_DECLARED');assert.equal(p.period.inputContract.costBasis,'CAPTURED');
});
test('real manual workday API leaves employee sales unknown, honors explicit allocation and uses venue total',async()=>{
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route'},{now});try{
 const owner=await r.register('manual-allocation@isolated.test');const venueId=owner.activeVenueId;assert.equal(venueId,1);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"UTC"}',owner.userId);
 r.sqlite.prepare('UPDATE venue_memberships SET employee_id=? WHERE venue_id=? AND account_id=?').run('waiter',venueId,owner.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 put(SALES_ACCOUNTING_KEY,setting);put('bd_finance_revenue',manual.revenues);put('bd_sales_events_v1',[]);put('bd_stock_movements',[]);
 put('bd_employees',[{id:'waiter',venueId,payrollRuleId:'personal'},{id:'manager',venueId,payrollRuleId:'venue'}]);
 put('bd_payroll_rules',[{id:'personal',blocks:[{type:'shift_rate',amount:50,enabled:true},{type:'personal_sales_percent',percent:5,enabled:true}]},{id:'venue',blocks:[{type:'venue_sales_percent',percent:10,enabled:true}]}]);
 const post=(data:object)=>r.api.workdays.POST(r.request(owner,'/api/workdays','POST',{venueId,date,...data}));
 const opened=await post({action:'open',expectedRevision:0,operationId:'open-manual',staffing:[{employeeId:'waiter'},{employeeId:'manager'}]});assert.equal(opened.status,201,await opened.clone().text());
 const body:any=await opened.json();assert.equal(body.payroll.status,'INCOMPLETE');assert.ok(body.payroll.missing.some((x:any)=>x.employeeId==='waiter'&&x.field==='personalSales'));
 assert.equal(body.workday.shiftVenueSales,300);assert.equal(body.workday.staffing.find((x:any)=>x.employeeId==='waiter').personalSales,undefined);
 const reload:any=await(await r.api.workdays.GET(r.request(owner,'/api/workdays?date='+date))).json();assert.equal(reload.personalSales.waiter,null);assert.equal(reload.personalSales.manager,null);
 const explicit=await post({action:'preview',expectedRevision:1,operationId:'preview-allocation',staffing:[{employeeId:'waiter',personalSales:120},{employeeId:'manager'}]});assert.equal(explicit.status,200,await explicit.clone().text());
 const preview:any=await explicit.json();assert.equal(preview.payroll.status,'COMPLETE');assert.equal(preview.payroll.payrollBreakdown.perEmployee.waiter,56);assert.equal(preview.payroll.payrollBreakdown.perEmployee.manager,30);
 const stored=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_finance_revenue'").get(owner.userId)?.data_json));assert.deepEqual(stored,manual.revenues);
 }finally{r.close();}
});
