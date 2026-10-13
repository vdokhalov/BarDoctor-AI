import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {openingRuntime} from './helpers/opening-runtime';
import {salesEventFixture} from './helpers/sales-event-fixture';
import {seedOpenWorkday,openWorkdayFixture} from './helpers/pos-workday-fixture';
import {venueDate} from '../lib/bardoctor/venue-time';
import * as sales from '../lib/bardoctor/sales-events';

// Execute the actual harness setup slices against real isolated routes, without
// launching browsers or replaying full suites. No product request is stubbed.
const source=(name:string)=>readFileSync('scripts/'+name,'utf8');
function slice(name:string,start:string,end:string){
 const text=source(name),a=text.indexOf(start),b=text.indexOf(end,a);
 assert.ok(a>=0&&b>a,name+' bounded setup anchors');return text.slice(a,b);
}
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function execute(body:string,bindings:Record<string,unknown>){
 const code=transformSync('async function setup(){let demo;'+body+'}\nsetup();',{loader:'ts',target:'esnext'}).code;
 // Return the setup promise, not merely the wrapper's synchronous completion.
 return new AsyncFunction(...Object.keys(bindings),code.replace(/setup\(\);\s*$/,'return await setup();'))(...Object.values(bindings));
}
const slices:Record<string,[string,string,string]>={
 'finance-inputs-phase3a6-browser.ts':['const user = await runtime.register','const context =','return {user,venueId};'],
 'operational-day-browser.ts':['const user = await runtime.register','const context =','return {user,venueId};'],
 'sales-ux2-browser.ts':['const user=await runtime.register','for(const [i,source]','return {user,venueId:venue};'],
 'sales-iphone-browser.ts':['const user=await runtime.register','for(const [i,source]','return {user,venueId:venue};'],
 'sales-navigation-performance.ts':['const user=await runtime.register','for(const [i,source]','return {user,venueId:venue};'],
 'sales-observations-browser.ts':['const user=await runtime.register','const setup=','return {user,venueId:venue};'],
 'pos1-hardening-browser.ts':['const user=await r.register','let failure:','const q=await r.api.sales.POST(r.request(user,"/api/sales-events","POST",{venueId:venue,action:"open_shift",shiftId:"setup",name:"Setup"}));assert.equal(q.status,201,JSON.stringify(await q.json()));return {user,venueId:venue};'],
};
for(const [name,[start,end,finish]] of Object.entries(slices))test(name+' real setup opens staffed cash; omission still fails',async()=>{
 for(const omit of [false,true]){
  const fixedTime=name.startsWith('finance-')?'2026-10-02T12:00:00Z':undefined;
  const runtime=await lifecycleRuntime({sales:'./app/api/sales-events/route',events:'./app/api/sales-events/route',days:'./app/api/operational-days/route',close:'./app/api/shifts/close/route',context:'./lib/bardoctor/venue-ai-context',workdays:'./app/api/workdays/route'},{now:fixedTime});
  try{
   const body=slice(name,start,end)+finish;
   const run=()=>execute(body,{assert,r:runtime,runtime,fixedTime,profile:{name:'mobile'},viewport:{name:'mobile'},salesEventFixture,seedOpenWorkday:omit?()=>{}:seedOpenWorkday,venueDate});
   if(omit){await assert.rejects(run(),name+' must reject missing OPEN workday');continue;}
   const result=await run(),rows=runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(result.user.userId,'bd_finance_revenue');
   assert.ok(JSON.parse(String(rows?.data_json)).length>0,name+' real cash persisted');
  }finally{runtime.close();}
 }
});
test('Acquisition setup has its own staffed workday before its actual open_shift command',async()=>{
 const runtime=await lifecycleRuntime({sales:'./app/api/sales-events/route'},{now:'2026-10-02T12:00:00Z'});
 try{
  const name='acquisition-stock-phase3a7-browser.ts',text=source(name);
  const prefix=slice(name,'const user=await runtime.register','const send=async');
  const send=slice(name,'const send=async','const receive=');
  const seed=text.split('\n').find(line=>line.trim().startsWith('seedOpenWorkday('));assert.ok(seed);
  const open=text.split('\n').find(line=>line.includes("await send('sales',{action:'open_shift'"));assert.ok(open);
  await execute(prefix+send+seed+open,{assert,runtime,viewport:{name:'mobile'},fixedTime:'2026-10-02T12:00:00Z',salesEventFixture,seedOpenWorkday,venueDate});
 }finally{runtime.close();}
});
for(const name of ['pos1-browser-qa.ts','sales-browser-qa-phase5.ts'])test(name+' real UI-opening fixture is explicitly staffed',async()=>{
 const runtime=openingRuntime(new URL('../app/api/sales-events/route.ts',import.meta.url),sales);
 try{
  const body=name==='pos1-browser-qa.ts'?slice(name,'fixture.setCurrency','const server='):slice(name,'runtime.put("bd_assortment_v1"','const errors:');
  await execute(body,{fixture:runtime,runtime,openWorkdayFixture,salesEventFixture});
  const response=await runtime.api.POST(new Request('http://isolated.test/api/sales-events',{method:'POST',headers:{'Content-Type':'application/json','X-Venue-Id':'1'},body:JSON.stringify({venueId:1,action:'open_shift',shiftId:'setup',name:'Setup'})}));
  assert.equal(response.status,201,JSON.stringify(await response.json()));
 }finally{runtime.close();}
});
test('operational-day setup retains Chisinau date at month/year boundaries',async()=>{
 for(const fixedTime of ['2026-09-30T21:02:00Z','2026-12-31T22:02:00Z']){
  const runtime=await lifecycleRuntime({sales:'./app/api/sales-events/route'},{now:fixedTime});
  try{
   const result=await execute(slice('operational-day-browser.ts','const user = await runtime.register','const context =')+'return {user,venueId};',{assert,runtime,fixedTime,profile:{name:'boundary'},salesEventFixture,seedOpenWorkday,venueDate});
   const read=(key:string)=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(result.user.userId,key)?.data_json));
   const expected=venueDate(fixedTime,'Europe/Chisinau');assert.equal(read('bd_finance_revenue')[0].date,expected);assert.equal(read('bd_operational_reports_v1')[0].date,expected);
  }finally{runtime.close();}
 }
});
test('real workday gate still rejects missing team, wrong venue and closed day without writes',async()=>{
 const r=await lifecycleRuntime({sales:'./app/api/sales-events/route'},{now:'2026-10-02T12:00:00Z'});
 try{
  const user=await r.register('negative-workday@isolated.test'),venueId=user.activeVenueId;
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'UTC'}),user.userId);
  for(const [row,code] of [[null,'WORKDAY_REQUIRED'],[{...openWorkdayFixture(venueId,'2026-10-02'),staffing:[]},'WORKDAY_TEAM_REQUIRED'],[openWorkdayFixture(venueId+1,'2026-10-02'),'WORKDAY_REQUIRED'],[{...openWorkdayFixture(venueId,'2026-10-02'),workdayStatus:'CLOSED'},'WORKDAY_CLOSED']] as const){
   r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,'bd_operational_reports_v1',JSON.stringify(row?[row]:[]),'test');
   const before=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all();
   const response=await r.api.sales.POST(r.request(user,'/api/sales-events','POST',{venueId,action:'open_shift',shiftId:'blocked',name:'Blocked'}));
   assert.equal(response.status,409);assert.equal((await response.json() as {code:string}).code,code);
   assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),before);
  }
 }finally{r.close();}
});
