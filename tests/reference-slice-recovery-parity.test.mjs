import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRecoveryParity} from '../scripts/lib/reference-slice-recovery-compare.mjs';
const item={id:'entry:finance',kind:'entry',from:'/finance'};
const state=()=>({before:{url:'/finance',venue:'1',contract:{path:'/finance',url:'/finance'},entries:[{label:'Зарплаты',tag:'BUTTON'}],frames:[]},actions:{'entry:finance':{url:'/salaries?month=2026-10',contract:{path:'/salaries',url:'/salaries?month=2026-10'}}},baselineDefects:[]});
const evaluate=candidate=>compareRecoveryParity({items:[item]},{v485:{'/finance':state()},candidate:{'/finance':candidate}},'chromium',1280)[0];
test('existing route does not excuse a missing visible Finance capability',()=>{const value=state();value.before.entries=[];assert.equal(evaluate(value).verdict,'FAIL');});
test('clicking the wrong destination blocks otherwise visible navigation',()=>{const value=state();value.actions[item.id].url='/home';assert.equal(evaluate(value).verdict,'FAIL');});
test('changed embedded module content blocks route-only parity',()=>{const value=state();value.before.frames=[{title:'Finance',text:'Missing payroll'}];assert.equal(evaluate(value).verdict,'FAIL');});
test('unchanged route, entry and actual destination pass together',()=>assert.equal(evaluate(state()).verdict,'PASS'));
test('approved Doctor presentation does not excuse a removed legacy diagnosis entry',()=>{
 const legacy={id:'doctor-legacy:run',kind:'entry',from:'/analysis'};
 const original={...state(),before:{...state().before,url:'/analysis',surface:'doctor',contract:{path:'/analysis',url:'/analysis'}},actions:{[legacy.id]:{activation:'PASS'}}};
 const candidate={...original,actions:{[legacy.id]:{absent:true}}};
 assert.equal(compareRecoveryParity({items:[legacy]},{v485:{'/analysis':original},candidate:{'/analysis':candidate}},'webkit',390)[0].verdict,'FAIL');
});
test('query serialization order is harmless but a different parent route blocks parity',()=>{
 const a=state(),b=state();a.before.contract.parent='/finance?venue=1&month=2026-10';b.before.contract.parent='/finance?month=2026-10&venue=1';
 assert.equal(compareRecoveryParity({items:[item]},{v485:{'/finance':a},candidate:{'/finance':b}},'webkit',820)[0].verdict,'PASS');
 b.before.contract.parent='/home';assert.equal(compareRecoveryParity({items:[item]},{v485:{'/finance':a},candidate:{'/finance':b}},'webkit',820)[0].verdict,'FAIL');
});
test('answer-first refresh preserves the question and does not navigate',()=>{
 const refresh={id:'context:/analysis:Обновить ответ',kind:'entry',from:'/analysis'},make=url=>({before:{...state().before,url:'/analysis',surface:'doctor',contract:{path:'/analysis',url:'/analysis'}},actions:{[refresh.id]:{url,contract:{path:'/analysis',url,parent:'/home'},actionOrigin:{url,question:'attention'}}},baselineDefects:[]});
 const a=make('/analysis?venue=1'),b=make('/analysis?doctorQuestion=attention&venueId=1&venue=1&returnTo=health');
 const check=()=>compareRecoveryParity({items:[refresh]},{v485:{'/analysis':a},candidate:{'/analysis':b}},'chromium',390)[0].verdict;
 assert.equal(check(),'PASS');b.actions[refresh.id].url='/home';assert.equal(check(),'FAIL');
 b.actions[refresh.id].url=b.actions[refresh.id].actionOrigin.url;b.actions[refresh.id].actionOrigin.question='next';assert.equal(check(),'FAIL');
});
test('QA fetch tracking survives repeated WebKit bootstrap without losing an in-flight request',async()=>{
 const {readFileSync}=await import('node:fs'),{createContext,runInContext}=await import('node:vm');
 const source=readFileSync('scripts/reference-slice-recovery-parity.mjs','utf8');
 const code=[...source.matchAll(/addInitScript\(\{content:`([^`]+)`\}\)/g)].map(m=>m[1]).find(code=>code.includes('__qaFetchTrackingInstalled'));assert.ok(code);
 let resolve;const response=Response.json({success:true,data:[]}),pending=new Promise(done=>resolve=done);
 const context=createContext({URL,location:{href:'http://isolated.test/home'},fetch:()=>pending});
 runInContext(code,context);const wrapper=context.fetch,request=wrapper('/api/store/bd_finance_expenses');assert.equal(context.__qaPendingApi,1);
 runInContext(code,context);assert.equal(context.fetch,wrapper);assert.equal(context.__qaPendingApi,1);
 resolve(response);assert.equal(await request,response);assert.equal(context.__qaPendingApi,0);assert.deepEqual(await response.json(),{success:true,data:[]});
});
