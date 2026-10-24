import test from 'node:test';
import assert from 'node:assert/strict';
import { marketResultAttempt, retainMarketResult } from '../lib/bardoctor/market-result-attempt';
const now='2026-10-24T22:00:00Z',old={generatedAt:'2026-10-23T12:00:00Z',competitors:[{name:'Old'}],sources:[{url:'https://old.test'}]};
for (const [name,raw,filtered,result,reason] of [
 ['filtered findings without candidates',{actions:[{sourceUrls:['https://foreign.test']}]}, {}, {},'FILTER_EMPTY'],
 ['model empty',{}, {}, {},'MODEL_EMPTY'],
 ['all filtered',{competitors:[{name:'Foreign'}]}, {}, {},'FILTER_EMPTY'],
 ['user exclusions',{competitors:[{name:'Deleted'}]}, {competitors:[{}]}, {},'USER_EXCLUDED'],
 ['mixed',{competitors:[{name:'Foreign'},{name:'Local'}]}, {competitors:[{}]}, {competitors:[{name:'Local'}]},'RESULT'],
 ['sourced findings without candidates',{}, {}, {sources:[{}]},'RESULT'],
] as const) test(name,()=>{
 const attempt=marketResultAttempt(raw,[],filtered,result,now);assert.equal(attempt.reason,reason);
 for(const previous of [null,old]){
  const saved=retainMarketResult(previous,{...result,generatedAt:now},attempt);
  assert.deepEqual(JSON.parse(JSON.stringify(saved)).lastAttempt,attempt);
  assert.equal(saved.generatedAt,reason==='RESULT'?now:previous?.generatedAt);
  if(reason!=='RESULT'&&previous)assert.deepEqual(saved.competitors,old.competitors);
  assert.deepEqual(retainMarketResult(saved,{...result,generatedAt:now},attempt),saved);
 }
});
test('diagnostic counters exclude all raw text and do not share tenant state',()=>{
 const secret='PRIVATE owner@example.test';const attempt=marketResultAttempt({competitors:[{name:secret,sourceUrls:[secret]}]},[{title:secret,url:secret}],{}, {},now);
 assert.deepEqual(attempt.counts,{modelCandidates:1,modelReferences:0,providerSources:1,filteredCandidates:0,candidates:0,sources:0});assert.doesNotMatch(JSON.stringify(attempt),/PRIVATE|owner@/);
 assert.equal(retainMarketResult(null,{},attempt).competitors,undefined);assert.deepEqual(old.competitors,[{name:'Old'}]);
});
