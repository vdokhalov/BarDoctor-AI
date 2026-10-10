import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRecoveryParity} from '../scripts/lib/reference-slice-recovery-compare.mjs';
const item={id:'entry:finance',kind:'entry',from:'/finance'};
const state=()=>({before:{url:'/finance',venue:'1',contract:{path:'/finance',url:'/finance'},entries:[{label:'Зарплаты',tag:'BUTTON'}],frames:[]},actions:{'entry:finance':{url:'/salaries?month=2026-10',contract:{path:'/salaries',url:'/salaries?month=2026-10'}}},baselineDefects:[]});
const evaluate=candidate=>compareRecoveryParity({items:[item]},{v485:{'/finance':state()},candidate:{'/finance':candidate}},'chromium',1280)[0];
test('existing route does not excuse a missing visible Finance capability',()=>{const value=state();value.before.entries=[];assert.equal(evaluate(value).verdict,'FAIL');});
test('owner-approved More Doctor entry cannot excuse removal of an existing More control',()=>{
 const item={id:'entry:more',kind:'entry',from:'/more'};
 const a=state();a.before.url='/more';a.before.contract={path:'/more',url:'/more'};a.actions={};
 const b=structuredClone(a);b.before.entries.unshift({label:'AI Doctor',tag:'BUTTON',nav:false,disabled:false,href:null},{label:'Состояние бизнеса',tag:'BUTTON',nav:false,disabled:false,href:null});
 const compare=()=>compareRecoveryParity({items:[item]},{v485:{'/more':a},candidate:{'/more':b}},'chromium',390)[0].verdict;
 assert.equal(compare(),'PASS');b.before.entries.pop();assert.equal(compare(),'FAIL');
});
test('More exception does not hide disabled or renamed Doctor controls',()=>{
 const item={id:'route:/more',path:'/more'},a=state();a.before.url='/more';a.before.contract={path:'/more',url:'/more'};a.actions={};
 const b=structuredClone(a),entry={label:'AI Doctor',tag:'BUTTON',nav:false,disabled:false,href:null};b.before.entries.unshift(entry);
 const compare=()=>compareRecoveryParity({items:[item]},{v485:{'/more':a},candidate:{'/more':b}},'webkit',820)[0].verdict;
 assert.equal(compare(),'PASS');entry.disabled=true;assert.equal(compare(),'FAIL');entry.disabled=false;entry.label='AI Doctor broken';assert.equal(compare(),'FAIL');
});
test('clicking the wrong destination blocks otherwise visible navigation',()=>{const value=state();value.actions[item.id].url='/home';assert.equal(evaluate(value).verdict,'FAIL');});
test('changed embedded module content blocks route-only parity',()=>{const value=state();value.before.frames=[{title:'Finance',text:'Missing payroll'}];assert.equal(evaluate(value).verdict,'FAIL');});
test('recovered cashier presentation requires the same measured read-only rejection and route contract',()=>{
 const item={id:'route:/cashier',path:'/cashier'},a=state();a.before.url='/cashier';a.before.contract={path:'/cashier',url:'/cashier',parent:'/sales-import'};a.actions={};
 a.cashierRejection={status:409,code:'SALES_EVENT_STORE_NEEDS_REVIEW',visible:true,ledgerUnchanged:true};
 const b=structuredClone(a);b.before.entries=[];b.before.frames=[{title:'Касса',text:'New POS presentation'}];b.cashierReturn={visible:true,href:'/sales-import',destination:'/sales-import'};
 const compare=()=>compareRecoveryParity({items:[item]},{v485:{'/cashier':a},candidate:{'/cashier':b}},'webkit',390)[0].verdict;
 assert.equal(compare(),'PASS');
 for(const change of [{status:401},{code:'UNKNOWN'},{visible:false},{ledgerUnchanged:false}]){b.cashierRejection={...a.cashierRejection,...change};assert.equal(compare(),'FAIL');}
 delete b.cashierRejection;assert.equal(compare(),'FAIL');b.cashierRejection={...a.cashierRejection};
 for(const change of [{visible:false},{href:'/home'},{destination:'/home'}]){const saved=b.cashierReturn;b.cashierReturn={...saved,...change};assert.equal(compare(),'FAIL');b.cashierReturn=saved;}
 b.before.contract.parent='/home';assert.equal(compare(),'FAIL');
});
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
 const {installApiReadTracker}=await import('../scripts/qa/api-read-tracker.mjs');
 const source=readFileSync('scripts/reference-slice-recovery-parity.mjs','utf8');
 assert.match(source,/await context\.addInitScript\(installApiReadTracker\)/);
 const code='('+installApiReadTracker.toString()+')()';
 let resolve;const response=Response.json({success:true,data:[]}),pending=new Promise(done=>resolve=done);
 const context=createContext({URL,location:{href:'http://isolated.test/home'},fetch:()=>pending});
 runInContext(code,context);const wrapper=context.fetch,request=wrapper('/api/store/bd_finance_expenses');assert.equal(context.__qaPendingApi,1);
 runInContext(code,context);assert.equal(context.fetch,wrapper);assert.equal(context.__qaPendingApi,1);
 resolve(response);assert.equal(await request,response);assert.equal(context.__qaPendingApi,0);assert.deepEqual(await response.json(),{success:true,data:[]});
});

test('v503 cost relocation requires actual browser evidence and does not claim Home parity',()=>{
 const item={id:'home:Cost correction',from:'/home',home:true},a=state();a.before.url='/home';a.before.contract={path:'/home',url:'/home'};a.actions={};
 const b=structuredClone(a),check=()=>compareRecoveryParity({items:[item]},{v485:{'/home':a},candidate:{'/home':b}},'webkit',390)[0];
 assert.equal(check().verdict,'FAIL');
 b.approvedCostPlacement={approval:'v503',homeAbsent:true,healthVisible:true,healthOutsideClosedDisclosure:true};
 assert.equal(check().verdict,'PASS');assert.equal(check().home,'REMOVED (owner-approved v503)');assert.equal(check().discoverability,'PASS (Health)');
 for(const key of ['homeAbsent','healthVisible','healthOutsideClosedDisclosure']){b.approvedCostPlacement[key]=false;assert.equal(check().verdict,'FAIL');b.approvedCostPlacement[key]=true;}
});

test('approved team cashier description changes no controls, route or other copy',()=>{
 const item={id:'route:/team-access',path:'/team-access'},a=state();a.before.url='/team-access';a.before.contract={path:'/team-access',url:'/team-access'};a.actions={};
 a.before.frames=[{title:'Access',text:'Manager unchanged Кассир Просмотр смен и проведение продаж в кассе без отмены проведённых операций.'}];
 const b=structuredClone(a);b.before.frames[0].text='Manager unchanged Сотрудник кассы Работа только в кассе: заказы и свои чеки. Управление сменой и отмены доступны старшим.';
 const compare=()=>compareRecoveryParity({items:[item]},{v485:{'/team-access':a},candidate:{'/team-access':b}},'webkit',390)[0].verdict;
 assert.equal(compare(),'PASS');b.before.entries=[];assert.equal(compare(),'FAIL');b.before.entries=a.before.entries;
 b.before.frames[0].text=b.before.frames[0].text.replace('Manager unchanged','Manager removed');assert.equal(compare(),'FAIL');
});
