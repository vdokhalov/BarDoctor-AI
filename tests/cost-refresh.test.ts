import test from 'node:test';
import assert from 'node:assert/strict';
import {createCostRefresh} from '../lib/bardoctor/client/cost-refresh';
const flush=()=>new Promise<void>(r=>setImmediate(r));
const deferred=<T>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return {promise,resolve};};
test('saved results publish before background work; all pages discover new signals; navigation coalesces',async()=>{
 const gate=deferred<{nextCursor:string}>();let reads=0;const pages:(string|undefined)[]=[];
 const io={current:()=> 'session',read:async()=>({items:[++reads===1?'saved':'new'],nextCursor:null}),evaluate:async(_v:number,c?:string)=>{pages.push(c);return c?{nextCursor:null}:gate.promise;}};
 const worker=createCostRefresh(io);const job=worker.start(1);await flush();
 assert.deepEqual(worker.get(1)?.data?.items,['saved']);assert.equal(worker.get(1)?.busy,true);
 assert.equal(worker.start(1),job);gate.resolve({nextCursor:'tracked'});await job;
 assert.deepEqual(pages,[undefined,'tracked']);assert.deepEqual(worker.get(1)?.data?.items,['new']);assert.ok(worker.get(1)?.completedAt);
 await worker.start(1);assert.equal(pages.length,2);
 const restart=createCostRefresh(io);await restart.start(1);assert.equal(pages.length,4,'new app session automatically reevaluates');
});
test('error preserves saved evidence, navigation does not retry storm, explicit retry succeeds',async()=>{
 let fail=true,calls=0;const worker=createCostRefresh({current:()=> 's',read:async()=>({items:['saved']}),evaluate:async()=>{calls++;if(fail)throw Error('deadline');return {};}});
 await worker.start(1);assert.deepEqual(worker.get(1)?.data?.items,['saved']);assert.equal(worker.get(1)?.error,'deadline');assert.equal(worker.get(1)?.completedAt,undefined);
 await worker.start(1);assert.equal(calls,1);fail=false;await worker.start(1,true);assert.equal(calls,2);assert.equal(worker.get(1)?.error,undefined);assert.ok(worker.get(1)?.completedAt);
});
test('logout aborts old work and ignores late responses; venue results remain separate',async()=>{
 let session='a';const gate=deferred<{items:string[]}>();let signal:AbortSignal|undefined;
 const worker=createCostRefresh({current:()=>session,read:async(v,s)=>{signal=s;return session==='a'?gate.promise:{items:[String(v)]};},evaluate:async()=>({})});
 const old=worker.start(1);session='b';worker.reset();assert.equal(signal?.aborted,true);
 await worker.start(2);gate.resolve({items:['private-a']});await old;
 assert.equal(worker.get(1),undefined);assert.deepEqual(worker.get(2)?.data?.items,['2']);await worker.start(1);assert.deepEqual(worker.get(1)?.data?.items,['1']);
});
test('unavailable sources and repeated cursor cannot certify completion',async()=>{
 for(const page of [{coverage:'UNAVAILABLE'},{nextCursor:'same'}]){
  const worker=createCostRefresh({current:()=> 's',read:async()=>({items:['saved']}),evaluate:async()=>page});await worker.start(1);
  assert.ok(worker.get(1)?.error);assert.equal(worker.get(1)?.completedAt,undefined);assert.deepEqual(worker.get(1)?.data?.items,['saved']);
 }
});
