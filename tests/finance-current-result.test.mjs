import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const s=fs.readFileSync('public/assets/index-BQGspy0I.js','utf8');
const part=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const text=v=>v==null||typeof v==='boolean'?'':typeof v==='object'?(Array.isArray(v)?v.map(text).join(' '):text(v.children)):String(v);
test('Finance current card uses canonical known, zero and unknown open-month result',()=>{
 const c=vm.createContext({bdMoney2:String,i:{jsx:(_,p)=>p,jsxs:(_,p)=>p}});
 vm.runInContext(part('function bdCurrentResultPresentation(','function bdMonthlyHeroV165(')+part('function bdFinanceCurrentResultV573(','/* finance-current-result-v573:end */'),c);
 const base={currentFinance:true,isClosed:false,finalProfit:null,operatingResult:null,asOfDate:'2026-10-21',resultBeforeCost:21471.65,resultAfterCost:13632.96,costOfGoods:7826.69,cashResult:19451.65};
 const render=report=>text(c.bdFinanceCurrentResultV573({report}));
 assert.match(render(base),/Текущий результат после себестоимости 13632.96/);assert.doesNotMatch(render(base),/Чистая прибыль|ещё не рассчитана/);
 assert.match(render({...base,resultAfterCost:0,costOfGoods:0}),/после себестоимости 0/);
 const missing=render({...base,resultAfterCost:null,costOfGoods:null,financeAssessmentInformation:['Не подтверждена себестоимость'],resultExplanation:'Результат без себестоимости'});
 assert.match(missing,/Результат до себестоимости 21471.65/);assert.match(missing,/Не подтверждена себестоимость/);assert.doesNotMatch(missing,/13632.96/);
 assert.match(render({...base,resultAfterCost:null,resultBeforeCost:null,missingInformation:['ФОТ неизвестен']}),/Недостаточно данных.*Неизвестно.*ФОТ неизвестен/);
 assert.ok(s.includes('if(e?.currentFinance)return bdFinanceCurrentResultV573({report:e,onContinue:n});'));
});
