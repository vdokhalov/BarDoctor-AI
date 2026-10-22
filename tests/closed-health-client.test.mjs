import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
test('legacy/live cached scores cannot replace the saved closed-workday assessment',()=>{const a=source.indexOf('function bdBusinessHealthSafeSnapshotV342('),b=source.indexOf('function bdBusinessHealthCommitEnvelopeV284(',a);assert.ok(a>0&&b>a);const c=vm.createContext({bdClosedHealthEmptyContexts:new Set(),bdBusinessHealthAccountContextV284:()=>"a",bdBusinessHealthSnapshotFromEnvelopeV334:e=>e.data.businessHealthSnapshot});vm.runInContext(source.slice(a,b),c);assert.equal(c.bdBusinessHealthSafeSnapshotV342({data:{businessHealthSnapshot:{score:99}}}),null);assert.equal(c.bdBusinessHealthSafeSnapshotV342({data:{businessHealthSnapshot:{score:60,closedWorkdayCapture:true}}}).score,60);});
test('no snapshot is neutral; HTTP failures remain errors; saved snapshot recovers',async()=>{
 const start=source.indexOf('async function bdRefreshLiveBusinessHealthV335('),end=source.indexOf('function bdUseLiveBusinessHealthV335(',start);
 assert.ok(source.includes('bdHealthLoading=!g&&(bdLiveHealthStatus==="idle"||bdLiveHealthStatus==="loading")'));
 let response={response:{ok:true,status:200},data:{success:false,code:'HEALTH_NO_SNAPSHOT'}};
 const context=vm.createContext({window:{},Ot:()=> 'session',bdBusinessHealthAccountContextV284:()=> 'a',bdLiveBusinessHealthPromiseV335:null,bdLiveBusinessHealthContextV335:'',bdClosedHealthEmptyContexts:new Set(),bdBusinessHealthSharedStoreV284:{entries:new Map(),current:{snapshot:null},listeners:[]},bdRestrictedAnalysisContextsPhase3a5:new Set(),bdFetchBusinessHealthV377:async()=>response,bdBusinessHealthSafeSnapshotV342:e=>e.data?.businessHealthSnapshot,bdBusinessHealthCommitEnvelopeV284:e=>{context.saved=e},bdRestrictAnalysisContextPhase3a5:()=>{}});
 vm.runInContext(source.slice(start,end),context);
 await context.bdRefreshLiveBusinessHealthV335();assert.ok(context.bdClosedHealthEmptyContexts.has('a'));
 const cardStart=source.indexOf('function bdHomeHealthIndexV200('),cardEnd=source.indexOf('\nconst bdHomeReviewsCacheV409',cardStart);
 context.i={jsx:(tag,props)=>({tag,...props}),jsxs:(tag,props)=>({tag,...props})};vm.runInContext(source.slice(cardStart,cardEnd),context);
 let card=JSON.stringify(context.bdHomeHealthIndexV200({snapshot:null}));assert.match(card,/Оценка пока недоступна/);assert.doesNotMatch(card,/Обновить анализ|Не удалось/);
 response={response:{ok:false,status:500},data:{success:false,code:'HEALTH_NO_SNAPSHOT'}};
 await assert.rejects(context.bdRefreshLiveBusinessHealthV335());assert.equal(context.bdClosedHealthEmptyContexts.has('a'),false);
 card=JSON.stringify(context.bdHomeHealthIndexV200({snapshot:null}));assert.match(card,/Не удалось получить/);assert.match(card,/Обновить анализ/);
 response={response:{ok:true,status:200},data:{success:true,data:{businessHealthSnapshot:{score:60,closedWorkdayCapture:true}}}};
 await context.bdRefreshLiveBusinessHealthV335();assert.equal(context.saved.data.businessHealthSnapshot.score,60);
});
