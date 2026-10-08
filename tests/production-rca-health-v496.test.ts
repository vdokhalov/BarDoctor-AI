import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {buildHealthOperationsInputs,MAX_HEALTH_SOURCE_BYTES} from '../lib/bardoctor/health-operations-inputs';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {managementActionsFixture} from './helpers/management-actions-fixture';
import {representativeHealthStockFixture,mixedHealthStockFixture} from './helpers/production-rca-health-fixture';

const production='4921f368105e44321a020f406b9f58cb619172c9';
test('stock partition preserves every v495 proof, duplicate winner, scope and unknown across 80 datasets',async()=>{
 const baseline=await lifecycleRuntime({operations:'./lib/bardoctor/health-operations-inputs'},{plugins:[{name:'exact-v495-operations',setup(build){build.onLoad({filter:/\/health-operations-inputs\.ts$/},()=>({contents:execFileSync('git',['show',production+':lib/bardoctor/health-operations-inputs.ts']).toString(),loader:'ts'}));}}]});
 try{
  const old=baseline.api.operations as unknown as {buildHealthOperationsInputs:typeof buildHealthOperationsInputs};
  for(let sample=0;sample<80;sample++){
   const input=mixedHealthStockFixture(sample),before=JSON.stringify(input);
   const actual=buildHealthOperationsInputs(input);
   assert.deepEqual(actual,old.buildHealthOperationsInputs(input),`sample ${sample}`);
   if(sample%4===0)assert.equal(actual.stockFacts?.find(row=>row.productKey==='known-zero')?.quantity,0);
   assert.equal(JSON.stringify(input),before,'read inputs remain unchanged');
  }
 }finally{baseline.close();}
});

test('actual authenticated Health handles representative stock plus financial history within a 5s local CPU gate',async()=>{
 const r=await managementActionsFixture();try{
  const workspaceId=Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(r.venueId)?.workspace_id);
  const before=()=>r.sqlite.prepare('SELECT account_id,store_key,data_json,updated_at FROM domain_data ORDER BY account_id,store_key').all();
  const fixture=representativeHealthStockFixture(1000,8000,{venueId:r.venueId,workspaceId,dataAccountId:r.account});
  for(const bytes of Object.values(fixture.bytes))assert.ok(bytes<MAX_HEALTH_SOURCE_BYTES);
  for(const [key,value]of Object.entries(fixture.stores))r.seed(key,value);
  const days=Array.from({length:1000},(_,i)=>({id:'qa-day-'+i,venueId:r.venueId,date:new Date(Date.UTC(2026,9,3)-(999-i)*86400000).toISOString().slice(0,10),revenue:100,currency:'MDL',receipts:5,guests:5,closingStatus:'closed',closedVia:'guided-v17',payrollBreakdown:{total:0}}));
  r.seed('bd_finance_revenue',days);r.seed('bd_operational_reports_v1',days);
  const original=before(),started=process.cpuUsage(),time=performance.now();
  const value=await r.readHealth() as unknown as {data:{businessHealthSnapshot:{score:number|null;operationsInputs:{stockFacts:unknown[];counters:{stockAnomalies:{value:number;availability:string}}}}}};
  const used=process.cpuUsage(started),cpuMs=(used.user+used.system)/1000;
  assert.ok(cpuMs<5000,`representative Health CPU ${cpuMs}ms exceeds local gate`);
  assert.notEqual(value.data.businessHealthSnapshot.score,null);
  assert.equal(value.data.businessHealthSnapshot.operationsInputs.stockFacts.length,1000);
  assert.deepEqual({value:value.data.businessHealthSnapshot.operationsInputs.counters.stockAnomalies.value,availability:value.data.businessHealthSnapshot.operationsInputs.counters.stockAnomalies.availability},{value:0,availability:'AVAILABLE'});
  assert.deepEqual(before(),original,'Health reads never modify domain data');
  console.log(JSON.stringify({environment:'isolated SQLite / actual handlers',production:false,products:1000,movements:8000,financialDays:1000,cpuMs,wallMs:performance.now()-time}));
 }finally{r.close();}
});

test('authenticated Health D1 failure returns bounded infrastructure JSON with request identity and no writes',async()=>{
 const r=await lifecycleRuntime({health:'./app/api/business-health/route'});try{
  const user=await r.register('health-failure@isolated.test');
  const original=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY id').all();
  r.failDatabaseRead();
  const response=await r.api.health.GET(r.request(user,'/api/business-health'));
  assert.equal(response.status,500);assert.match(response.headers.get('Cache-Control')??'',/no-store/);
  const value=await response.json() as {code:string;ok:boolean;requestId:string};assert.equal(value.code,'INFRASTRUCTURE_ERROR');assert.equal(value.ok,false);
  assert.ok(typeof value.requestId==='string'&&value.requestId.length>0);
  assert.equal(JSON.stringify(value).includes('injected database'),false);
  assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY id').all(),original);
 }finally{r.close();}
});
