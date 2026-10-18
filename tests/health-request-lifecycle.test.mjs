import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {patchHealthRequestLifecycle} from '../scripts/lib/health-request-lifecycle.mjs';
const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
const names=new Set(['bdWarmCriticalHomeV349','bdRefreshLiveBusinessHealthV335','bdUseLiveBusinessHealthV335']);
const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.has(n.id.name));
const code=nodes.map(n=>source.slice(n.start,n.end)).join('\n');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(fetchHealth=async()=>({response:{ok:true,status:200},data:{success:true}})){
 let cleanup,nextTimer=0,fetches=0;const states=[],timers=new Map(),listeners=new Map(),commits=[];
 const window={setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id),addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn)};
 const ctx={window,Ot:()=>({email:'fixture'}),Yse:async()=>[],bdHandleFinanceWarmFailurePhase3a5:e=>{throw e;},bdFetchBusinessHealthV377:()=>{fetches++;return fetchHealth();},bdBusinessHealthAccountContextV284:()=> 'venue1',bdBusinessHealthGetSharedV284:()=>({snapshot:null}),bdBusinessHealthSafeSnapshotV342:()=>({}),bdRestrictAnalysisContextPhase3a5:()=>{},bdRestrictedAnalysisContextsPhase3a5:new Set(),bdBusinessHealthCommitEnvelopeV284:x=>commits.push(x),S:{useState:()=>['idle',x=>states.push(x)],useEffect:fn=>{cleanup=fn();}}};
 vm.createContext(ctx);vm.runInContext('let bdLiveBusinessHealthPromiseV335=null,bdLiveBusinessHealthTimerV335=0,bdLiveBusinessHealthContextV335="";'+code,ctx);
 return {ctx,states,timers,commits,get fetches(){return fetches;},mount:()=>{ctx.bdUseLiveBusinessHealthV335(true);return cleanup;},notify:()=>listeners.get('bd:store-updated')?.forEach(fn=>fn()),runTimers:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
test('notify then cleanup cancels owned timer; a queued callback is harmless after disposal',async()=>{
 const f=fixture(),dispose=f.mount();await tick();f.notify();assert.equal(f.timers.size,1);const queued=[...f.timers.values()][0],count=f.states.length;dispose();assert.equal(f.timers.size,0);queued();await tick();assert.equal(f.fetches,1);assert.equal(f.states.length,count);
});
test('disposing another subscriber does not cancel the surviving subscriber timer',async()=>{
 const f=fixture(),a=f.mount(),b=f.mount();await tick();f.notify();a();assert.equal(f.timers.size,1);f.runTimers();await tick();assert.equal(f.fetches,2);assert.equal(f.states.at(-1),'ready');b();
});
test('early startup rejection is immediately owned and still reaches UI error unchanged',async()=>{
 const error=new Error('health network failed'),f=fixture(()=>Promise.reject(error));const unhandled=[];const onUnhandled=e=>unhandled.push(e);process.on('unhandledRejection',onUnhandled);
 try{f.ctx.bdWarmCriticalHomeV349();await tick();assert.equal(f.ctx.window.__bdStartupBusinessHealthWarmV349 instanceof Promise,true);const warm=await f.ctx.window.__bdStartupBusinessHealthWarmV349;assert.equal(warm.ok,false);assert.equal(warm.error,error);assert.deepEqual(unhandled,[]);await assert.rejects(f.ctx.bdRefreshLiveBusinessHealthV335(),e=>e===error);
 f.mount();await tick();assert.equal(f.states.at(-1),'error');assert.equal(f.commits.length,0);}finally{process.removeListener('unhandledRejection',onUnhandled);}
});
for(const success of [true,false])test('active request keeps '+(success?'ready':'error')+' UI state',async()=>{
 const f=fixture(async()=>({response:{ok:success,status:success?200:503},data:{success,error:'unavailable'}}));f.mount();await tick();assert.equal(f.states.at(-1),success?'ready':'error');assert.equal(f.commits.length,success?1:0);
});
test('in-flight rejection after disposal does not update removed UI',async()=>{
 let reject;const f=fixture(()=>new Promise((_,r)=>{reject=r;})),dispose=f.mount();dispose();const count=f.states.length;reject(Error('late'));await tick();assert.equal(f.states.length,count);
});
test('successful warm request is consumed once and committed',async()=>{
 const f=fixture();f.ctx.bdWarmCriticalHomeV349();await tick();f.mount();await tick();assert.equal(f.fetches,1);assert.equal(f.states.at(-1),'ready');assert.equal(f.commits.length,1);
});
test('lifecycle repair is idempotent and preserves its three function boundaries',()=>{
 const old=execFileSync('git',['show','f929af10:public/assets/index-BQGspy0I.js'],{maxBuffer:32*1024*1024}).toString();
 const repaired=patchHealthRequestLifecycle(old);
 assert.equal(patchHealthRequestLifecycle(repaired),repaired);
 assert.equal(patchHealthRequestLifecycle(source),source);
 const strip=s=>{const ns=parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.has(n.id.name));for(const n of ns.reverse())s=s.slice(0,n.start)+s.slice(n.end);return s;};
 assert.equal(strip(old),strip(repaired));
});
test('each mounted subscriber receives failed refresh instead of cancelling another subscriber timer',async()=>{
 let fail=false;
 const f=fixture(async()=>{if(fail)throw Error('invalid response');return{response:{ok:true,status:200},data:{success:true}}});
 const a=f.mount(),b=f.mount();await tick();fail=true;f.notify();
 assert.equal(f.timers.size,2,'both subscribers own their scheduled update');
 f.runTimers();await tick();assert.equal(f.states.filter(x=>x==='error').length,2);
 assert.equal(f.fetches,2,'subscribers coalesce the actual network request');a();b();
});
