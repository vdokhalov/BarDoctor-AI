import test from 'node:test';
import assert from 'node:assert/strict';
import * as a from '../lib/bardoctor/sales-accounting';
import { openingRuntime } from './helpers/opening-runtime';
import { normaliseDailyMetrics } from '../lib/bardoctor/business-intelligence';
const setting:a.SalesAccounting={version:1,venueId:1,changes:[{id:'manual-start',mode:'MANUAL',effectiveDate:'2026-10-01',createdAt:'2026-09-30T12:00:00Z',actorId:7}]};
const base={setting,venueId:1,currency:'MDL',date:'2026-10-10',now:'2026-10-20T10:00:00Z',timezone:'UTC',role:'owner',actorId:7,operationId:'qa-totals-001',expectedRevision:0,cash:100,card:200,revenues:[],closedMonths:new Set<string>()};
const route=new URL('../app/api/sales-accounting/route.ts',import.meta.url);
const req=(body:object)=>new Request('http://local/api/sales-accounting',{method:'POST',body:JSON.stringify(body)});
test('return to POS preserves historical manual dates across local year boundary',()=>{
 const result=a.planSalesMode({...base,mode:'POS',operationId:'qa-return-pos',now:'2026-12-31T22:30:00Z',timezone:'Europe/Chisinau',reports:[],orders:[]});
 assert.equal(result.change.effectiveDate,'2027-01-02');
 assert.equal(a.salesModeForDate(result.setting,'2027-01-01'),'MANUAL');
 assert.equal(a.salesModeForDate(result.setting,'2027-01-02'),'POS');
 assert.equal(a.planManualTotals({...base,setting:result.setting}).row.revenue,300);
 assert.throws(()=>a.planSalesMode({...base,setting:result.setting,mode:'MANUAL',operationId:'qa-return-pos',reports:[],orders:[]}),/другого режима/);
});
test('invalid numeric inputs fail closed; explicit zeros and omitted optional values remain distinct',()=>{
 for(const field of ['cash','card','cogs']) for(const value of [-1,NaN,Infinity,0.001,10000000001,'12',{},true])
  assert.throws(()=>a.planManualTotals({...base,[field]:value}),a.SalesAccountingError,`${field} ${String(value)}`);
 for(const value of [-1,1.5,Infinity,NaN,Number.MAX_SAFE_INTEGER+1,'2',true])
  assert.throws(()=>a.planManualTotals({...base,receipts:value}),a.SalesAccountingError);
 for(const date of ['2026-02-30','2026-10-21','bad']) assert.throws(()=>a.planManualTotals({...base,date}),a.SalesAccountingError);
 const zero=a.planManualTotals({...base,cash:0,card:0,cogs:0,receipts:0}).row;
 assert.equal(zero.revenue,0);assert.equal(zero.declaredCost,0);assert.equal(zero.receipts,0);
 assert.equal(a.planManualTotals({...base,cogs:'',receipts:''}).row.receipts,null);
});
test('staff cannot mutate any action or read owner totals/import financial details',async()=>{
 const f=openingRuntime(route);try{
 f.put(a.SALES_ACCOUNTING_KEY,setting);f.put('bd_finance_revenue',a.planManualTotals(base).revenues);
 f.put(a.SALES_IMPORT_REVIEW_KEY,[{id:'private-import',venueId:1,status:'AWAITING_RECONCILIATION',document:{totalRevenue:123,currency:'MDL'}}]);
 for(const role of ['manager','waiter','bartender']){
  const api=f.loadRoute(route,{authenticateRequest:async()=>({id:7,venueId:1,actorAccountId:7,role,restaurantJson:'{"currency":"MDL"}'})});
  for(const action of ['set_mode','save_totals','resolve_import'])assert.equal((await api.POST(req({action,venueId:1}))).status,403);
  const response=await api.GET(new Request('http://local/api/sales-accounting'));assert.equal(response.status,200);
  const body=await response.json() as {canManage:boolean;totals:unknown[];pendingImports:unknown[];occupiedDates:unknown[]};assert.equal(body.canManage,false);assert.deepEqual(body.totals,[]);assert.deepEqual(body.pendingImports,[]);assert.deepEqual(body.occupiedDates,[]);
 }
 f.setSignedIn(false);assert.equal((await f.api.GET(new Request('http://local/api/sales-accounting'))).status,401);
 assert.equal((await f.api.POST(req({action:'save_totals',venueId:1}))).status,401);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM audit_log').get()?.n,0);
 }finally{f.close();}
});
test('concurrent new totals cannot overwrite an intervening winner or create another audit',async()=>{
 const f=openingRuntime(route);try{
 f.put(a.SALES_ACCOUNTING_KEY,setting);f.put('bd_stock_movements',[{id:'stock-sentinel'}]);
 const winner=a.planManualTotals({...base,operationId:'qa-other-device',cash:400}).revenues;
 f.beforeBatch(()=>f.put('bd_finance_revenue',winner));
 const response=await f.api.POST(req({...base,action:'save_totals',closedMonths:undefined}));
 assert.equal(response.status,409);assert.deepEqual(f.get('bd_finance_revenue'),winner);
 assert.deepEqual(f.get('bd_stock_movements'),[{id:'stock-sentinel'}]);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM audit_log').get()?.n,0);
 }finally{f.close();}
});
test('manual unknown checks do not invent average check or guest count in Health daily projection',()=>{
 for(const receipts of [null,0,3]){
 const manual=a.planManualTotals({...base,receipts}).row;
 const [row]=normaliseDailyMetrics([manual]);
 assert.equal(row.checks,receipts);assert.equal(row.averageCheck,receipts===3?100:null);assert.equal(row.guests,null);
 const [pos]=normaliseDailyMetrics([{...manual,revenueSource:'sales_events_v1'}]);
 assert.deepEqual(row,pos);
 }
});
