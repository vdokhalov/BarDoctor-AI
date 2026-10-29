import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {assertCanonicalBoundaryInvariants} from '../scripts/canonical-boundary-invariants.mjs';
const bundle=readFileSync('public/assets/index-BQGspy0I.js','utf8');
const start=bundle.indexOf('if(r.status===403||r.status===401)bdRestrictAnalysisContextPhase3a5(t);');
const end=bundle.indexOf('bdBusinessHealthCommitEnvelopeV284(a,!0)',start)+'bdBusinessHealthCommitEnvelopeV284(a,!0)'.length;
const current=bundle.slice(start,end);
const beginEmpty=current.indexOf('if(r.ok&&a?.success===false&&a.code==="HEALTH_NO_SNAPSHOT")');
const endEmpty=current.indexOf('if(!r.ok||!a?.success)');
assert.ok(start>=0&&beginEmpty>0&&endEmpty>beginEmpty);
const legacy=(current.slice(0,beginEmpty)+current.slice(endEmpty)).replace('bdClosedHealthEmptyContexts.delete(t);','');
const wrap=flow=>'function WS(){if(bdAnalysisContextRestrictedPhase3a5())return null;}\nbdRestrictAnalysisContextPhase3a5();E(null);\n'+flow;
for(const [name,flow] of [['legacy',legacy],['empty-snapshot',current]]){
 test(name+' exact response flow accepted and denial still stops commit',()=>{
  assert.doesNotThrow(()=>assertCanonicalBoundaryInvariants(wrap(flow)));
  for(const status of [401,403,500,200]){
   const calls=[];const ctx={r:{status,ok:status===200},a:{success:status===200},t:'venue-A',bdRestrictAnalysisContextPhase3a5:t=>calls.push('deny:'+t),bdRestrictedAnalysisContextsPhase3a5:{delete:t=>calls.push('release:'+t)},bdBusinessHealthCommitEnvelopeV284:()=>calls.push('commit'),bdClosedHealthEmptyContexts:new Set()};
   const invoke=()=>vm.runInNewContext('(function(){'+flow+'})()',ctx);
   if(status!==200)assert.throws(invoke,/Business Health unavailable/);else invoke();
   assert.deepEqual(calls,status===200?['release:venue-A','commit']:status===500?[]:['deny:venue-A']);
  }
 });
}
test('baseline full bundle accepted; arbitrary or weakened authorization flows rejected',()=>{
 assert.doesNotThrow(()=>assertCanonicalBoundaryInvariants(bundle));
 for(const [before,after] of [
  ['r.status===403||r.status===401','r.status===403'],
  ['bdRestrictAnalysisContextPhase3a5(t);',''],
  ['if(r.ok&&a?.success===false','if(a?.success===false'],
  ['return a}if(!r.ok','return a}doSomething();if(!r.ok'],
  ['if(!r.ok||!a?.success)','if(!a?.success)'],
  ['bdRestrictedAnalysisContextsPhase3a5.delete(t);',''],
 ]){assert.ok(current.includes(before),before);assert.throws(()=>assertCanonicalBoundaryInvariants(wrap(current.replace(before,after))),/permission invariant missing/,before);}
 for(const guard of ['bdRestrictAnalysisContextPhase3a5();E(null)','function WS(){if(bdAnalysisContextRestrictedPhase3a5())return null;'])assert.throws(()=>assertCanonicalBoundaryInvariants(wrap(current).replace(guard,'')),/permission invariant missing/);
});
test('successful empty snapshot clears only its context and never commits or releases denied state',()=>{
 const calls=[],entries=new Map([['a',{context:'venue-A'}],['b',{context:'venue-B'}]]),empty=new Set();
 const store={entries,current:{snapshot:'old'},listeners:[()=>calls.push('notify')]};
 const ctx={r:{status:200,ok:true},a:{success:false,code:'HEALTH_NO_SNAPSHOT'},t:'venue-A',bdRestrictAnalysisContextPhase3a5:()=>calls.push('deny'),bdRestrictedAnalysisContextsPhase3a5:{delete:()=>calls.push('release')},bdBusinessHealthCommitEnvelopeV284:()=>calls.push('commit'),bdClosedHealthEmptyContexts:empty,bdBusinessHealthSharedStoreV284:store,bdLiveBusinessHealthContextV335:''};
 const result=vm.runInNewContext('(function(){'+current+'})()',ctx);
 assert.equal(result,ctx.a);assert.deepEqual(calls,['notify']);assert.equal(entries.has('a'),false);assert.equal(entries.has('b'),true);assert.equal(store.current.snapshot,null);assert.equal(store.current.diagnosis,null);assert.equal(empty.has('venue-A'),true);assert.equal(ctx.bdLiveBusinessHealthContextV335,'venue-A');
});
