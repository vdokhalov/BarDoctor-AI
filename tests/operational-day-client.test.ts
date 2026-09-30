import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {setImmediate} from 'node:timers/promises';

const fragment=readFileSync(new URL('../scripts/fragments/operational-day-phase1a.fragment.txt',import.meta.url),'utf8');
function client(sync:{isReady:boolean;financeReady:boolean}, response:object) {
  let cursor=0,scope='venue-1',effects:(()=>void|(()=>void))[]=[];
  const states:unknown[]=[];
  const cleanups:(()=>void)[]=[],requests:{headers:unknown;signal:AbortSignal}[]=[];
  const finance={revenue:[{id:'row',date:'2026-02-11',revenue:71,receipts:1,revenueSource:'sales_events_v1'}]};
  const hooks={useContext:()=>finance,useState:(initial:unknown)=>{const at=cursor++;if(!(at in states))states[at]=initial;return[states[at],(value:unknown)=>{states[at]=typeof value==='function'?value(states[at]):value;}];},useEffect:(effect:()=>void|(()=>void))=>effects.push(effect)};
  const window={addEventListener:()=>{},removeEventListener:()=>{}};
  const fetch=async(_url:string,options:{headers:unknown;signal:AbortSignal})=>{requests.push(options);return{ok:true,json:async()=>response};};
  const api=new Function('S','x7','Ai','Pt','Wm','window','fetch','AbortController','ca','Ot',fragment+';return {Ur,bdOperationalRows,bdOperationalRevenueCopy};')(hooks,{},()=>sync,()=>scope,'bd_finance_revenue',window,fetch,AbortController,()=>({'X-Venue-Id':scope}),()=>null);
  const render=()=>{cursor=0;effects=[];return api.Ur();};
  const flush=()=>{for(const effect of effects){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}};
  return{api,requests,finance,render,flush,abort:()=>cleanups.forEach(fn=>fn()),setScope:(next:string)=>{scope=next;}};
}
const sources=[['BARDOC_POS','Продажи BarDoctor'],['MANUAL_SUMMARY','Дневной отчёт'],['IMPORT','Импорт продаж'],['INTEGRATION','Интеграция'],['LEGACY_UNKNOWN','Исторические данные · источник не определён']];
for(const [source,label] of sources)test(source+' / FINAL uses API metadata after finance hydration even when global sync readiness is false',async()=>{
  const row={id:'row',date:'2026-02-11',revenue:71,receipts:1},day={businessDate:row.date,revenue:{amount:71,receipts:1,source,status:'FINAL',readOnly:source!=='MANUAL_SUMMARY'}};
  const result={ok:true,revenues:[row],days:[day]},c=client({isReady:false,financeReady:true},result);
  const before=JSON.stringify(result);
  c.render();c.flush();await setImmediate();
  assert.equal(c.requests.length,1,'Operational Day must load when authoritative finance is ready');
  const projected=c.render().revenue[0];assert.equal(projected._bdOperationalDay.revenue.source,source);
  assert.equal(c.api.bdOperationalRevenueCopy(projected._bdOperationalDay),label+' · Итог');
  assert.equal(projected.revenue,71);assert.equal(JSON.stringify(result),before,'read projection must not mutate facts');
  c.setScope('venue-2');assert.equal(c.render().revenue[0]._bdOperationalDay,undefined,'old venue metadata must not leak');c.abort();
});
test('Operational Day waits while neither finance nor global store readiness is available',()=>{
 const c=client({isReady:false,financeReady:false},{ok:true,revenues:[],days:[]});c.render();c.flush();assert.equal(c.requests.length,0);c.abort();
});
test('legacy is not guessed while source is unavailable; source labels retain PROVISIONAL and unknown status',()=>{
 const c=client({isReady:true,financeReady:false},{ok:false});
 for(const [source,label] of sources){assert.equal(c.api.bdOperationalRevenueCopy({revenue:{source,status:'PROVISIONAL'}}),label+' · Предварительно');assert.equal(c.api.bdOperationalRevenueCopy({revenue:{source,status:'UNKNOWN'}}),label+' · Статус требует проверки');}
 assert.equal(c.api.bdOperationalRows(c.finance.revenue,[])[0]._bdOperationalDay,undefined);
});
