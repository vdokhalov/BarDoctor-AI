import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFinanceInputs, revenueRowsWithReports, type FinanceReadInput} from '../lib/bardoctor/finance-inputs';
import {operationalDays} from '../lib/bardoctor/operational-day';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {healthInputsFixture} from './helpers/health-inputs-fixture';
import {readCanonicalJson} from '../lib/bardoctor/client/canonical-read';

const production='e8fe4568d694b42000649231a1269b52a390b479';
test('indexed Finance preserves v493 money, first records, duplicate identities, scope and captured payroll',async()=>{
 const baseline=await lifecycleRuntime({finance:'./lib/bardoctor/finance-inputs'},{plugins:[{name:'v493-finance-only',setup(build){build.onLoad({filter:/\/finance-inputs\.ts$/},()=>({contents:execFileSync('git',['show',production+':lib/bardoctor/finance-inputs.ts']).toString(),loader:'ts'}));}}]});
 try{
  const before=baseline.api.finance as unknown as {readFinanceInputs:typeof readFinanceInputs;revenueRowsWithReports:typeof revenueRowsWithReports};
  for(let sample=0;sample<80;sample++){
   const rows=Array.from({length:90},(_,i)=>({id:i%29,venueId:i%7===0?2:1,workspaceId:i%11===0?2:1,dataAccountId:1,date:`2026-09-${String(1+(i+sample)%28).padStart(2,'0')}`,revenue:i%13===0?null:i,currency:i%9===0?'EUR':'MDL',receipts:i%5,guests:i%3,closingStatus:i%2?'closed':'open',closedVia:'guided-v17',status:['POSTED','REVERSED','draft','confirmed'][i%4],payrollBreakdown:{total:i%6===0?null:i%8},accountingAmount:i%4===0?i:undefined,accountingCurrency:'MDL'}));
   const input:FinanceReadInput={venueId:1,workspaceId:1,dataAccountId:1,currency:'MDL',asOf:'2026-10-08',startDate:'2026-09-01',endDate:'2026-10-08',revenues:[...rows,{date:'2026-09-02',revenue:0,payrollBreakdown:{total:0},closedVia:'guided-v17',currency:'MDL'}],reports:rows.slice().reverse(),events:rows,documents:rows,expenses:rows.map(r=>({...r,amount:r.revenue,category:r.id%3?'rent':'payroll'})),payrollEntries:rows.map(r=>({...r,amount:r.revenue,type:r.id%2?'bonus':'payment'}))};
   if(sample%2)input.operationalDayProjection=operationalDays({...input});
   const source=JSON.stringify(input);
   assert.deepEqual(readFinanceInputs(input),before.readFinanceInputs(input),`sample ${sample}`);
   assert.equal(JSON.stringify(input),source,'reader must not mutate facts');
   const days=[...operationalDays(input),...operationalDays({...input,venueId:2})];
   assert.deepEqual(revenueRowsWithReports(rows,days),before.revenueRowsWithReports(rows,days));
  }
 }finally{baseline.close();}
});

test('actual authenticated Health produces current snapshot for large history without business writes',async()=>{
 const r=await healthInputsFixture();try{
  const rows=Array.from({length:5000},(_,i)=>({id:'history-'+i,venueId:r.venueId,date:new Date(Date.UTC(2012,0,1+i)).toISOString().slice(0,10),revenue:100,receipts:5,guests:5,currency:'MDL',closingStatus:'closed',closedVia:'guided-v17',payrollBreakdown:{total:20}}));
  r.seed('bd_finance_revenue',rows);r.seed('bd_operational_reports_v1',rows);
  const before=r.before();const response=await r.read() as {success:boolean;data:{businessHealthSnapshot:{score:number|null;venueId:number;inputRevision:string}}};
  assert.equal(response.success,true);assert.equal(Number(response.data.businessHealthSnapshot.venueId),r.venueId);
  assert.ok(response.data.businessHealthSnapshot.inputRevision.startsWith('sha256:'));
  assert.deepEqual(r.before(),before);
 }finally{r.close();}
});

test('cost command timeout bounds stalled fetch/body and retains method, body, auth and venue',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const original=globalThis.fetch;
 t.after(()=>{globalThis.fetch=original;t.mock.timers.reset();});
 for(const stalledBody of [false,true]){
  let signal:AbortSignal|undefined;
  globalThis.fetch=async (_path,options)=>{
   assert.equal(options?.method,'POST');assert.equal(options?.body,'{}');
   assert.equal(new Headers(options?.headers).get('X-Session-Token'),'isolated-only');
   assert.equal(new Headers(options?.headers).get('X-Venue-Id'),'1');signal=options?.signal??undefined;
   return stalledBody?{json:()=>new Promise(()=>undefined)} as Response:new Promise(()=>undefined);
  };
  const pending=readCanonicalJson('/api/management/cost-signals/evaluate',{'X-Session-Token':'isolated-only','X-Venue-Id':'1'},undefined,{method:'POST',body:'{}'});
  const rejected=assert.rejects(pending,/Сервер не ответил вовремя/);await Promise.resolve();t.mock.timers.tick(15000);await rejected;assert.equal(signal?.aborted,true);
 }
});
