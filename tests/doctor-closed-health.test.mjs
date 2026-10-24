import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const bundle=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const component=bundle.slice(bundle.indexOf('function bdDoctorClosedHealth('),bundle.indexOf('/* doctor-closed-health:end */'));
function render(snapshot,status='ready'){
 let retried=0;
 const jsx=(type,props)=>({type,...props});
 const sandbox={i:{jsx,jsxs:jsx,Fragment:'fragment'},S:{useState:()=>[0,()=>retried++]},bdBusinessHealthAccountContextV284:()=> 'account|venue',bdUseLiveBusinessHealthV335:()=>status,bdUseBusinessHealthSnapshotV284:()=>({snapshot}),bdHealthUiStatusV332:()=>({label:'Хорошее состояние'}),bdHealthLivePeriodV334:s=>s.livePeriod,bdHealthUpdatedV332:date=>date};
 vm.createContext(sandbox);vm.runInContext(component,sandbox);
 const tree=sandbox.bdDoctorClosedHealth();return {tree,text:JSON.stringify(tree),retry:()=>retried};
}
const saved={snapshotId:'closed-23',closedWorkdayCapture:true,score:76,status:'healthy',dataQualityPercent:83,generatedAt:'2026-10-23',livePeriod:{periodLabel:'1–23 октября'},zones:[{id:'finance',label:'Финансы',score:90,evidence:['Сохранённый результат']}]};
test('Doctor uses the shared closed capture, including its period, quality and date',()=>{const {text}=render(saved);for(const value of ['76 / 100','83','1–23 октября','2026-10-23','Сохранённый результат'])assert.ok(text.includes(value));});
test('insufficient overall coverage remains unavailable while domain score is retained',()=>{const {text}=render({...saved,score:null});assert.ok(text.includes('Недостаточно данных'));assert.ok(!text.includes('76 / 100'));assert.ok(text.includes('90'));});
test('current/open-period snapshots cannot supply Doctor Health',()=>{assert.ok(!render({...saved,closedWorkdayCapture:false}).text.includes('76 / 100'));});
test('missing capture is neutral, without AI refresh',()=>{const {text}=render(null);assert.ok(text.includes('Оценка пока недоступна'));assert.ok(!text.includes('Обновить анализ'));});
test('loading is not a false zero or no-data verdict',()=>{const {text}=render(null,'loading');assert.ok(text.includes('Загрузка…'));assert.ok(!text.includes('0 / 100'));assert.ok(!text.includes('Оценка пока недоступна'));});
test('real error remains an error with read-only retry',()=>{const result=render(null,'error');assert.ok(result.text.includes('Не удалось загрузить оценку'));const button=result.tree.children[1].children[0];button.onClick();assert.equal(result.retry(),1);});
test('confirmed zero is retained',()=>{assert.ok(render({...saved,score:0}).text.includes('0 / 100'));});
test('legacy analysis renderer no longer reads its embedded Health card',()=>{const start=bundle.indexOf('function Fce('),end=bundle.indexOf('function ',start+12),code=bundle.slice(start,end);assert.ok(code.includes('i.jsx(bdDoctorClosedHealth,{})'));assert.ok(!code.includes('children:b.score'));assert.ok(code.includes('bd-ai-data-quality-details'),'current analysis quality remains separate');});
test('late Health response after venue/account switch cannot commit to the new context',async()=>{
 const start=bundle.indexOf('async function bdRefreshLiveBusinessHealthV335('),end=bundle.indexOf('function bdUseLiveBusinessHealthV335(',start);
 let context='ownerA|venueA',resolve,commits=0;
 const pending=new Promise(done=>{resolve=done});
 const sandbox={window:{},Ot:()=> 'session',bdBusinessHealthAccountContextV284:()=>context,bdLiveBusinessHealthPromiseV335:null,bdLiveBusinessHealthContextV335:'',bdClosedHealthEmptyContexts:new Set(),bdBusinessHealthSharedStoreV284:{entries:new Map(),listeners:[]},bdRestrictedAnalysisContextsPhase3a5:new Set(),bdFetchBusinessHealthV377:()=>pending,bdBusinessHealthSafeSnapshotV342:e=>e.data?.businessHealthSnapshot,bdBusinessHealthCommitEnvelopeV284:()=>commits++,bdRestrictAnalysisContextPhase3a5:()=>{}};
 vm.createContext(sandbox);vm.runInContext(bundle.slice(start,end),sandbox);
 const result=sandbox.bdRefreshLiveBusinessHealthV335();context='ownerB|venueB';resolve({response:{ok:true,status:200},data:{success:true,data:{businessHealthSnapshot:saved}}});
 await assert.rejects(result,/context changed/);assert.equal(commits,0);
});
