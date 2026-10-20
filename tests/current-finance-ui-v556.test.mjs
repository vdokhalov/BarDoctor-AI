import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
const from=source.indexOf('function bdCurrentFinanceDetailsV556('),to=source.indexOf('/* bd-monthly-report-v165:end */',from);
const text=x=>Array.isArray(x)?x.map(text).join(' '):x&&typeof x==='object'?Object.values(x).map(text).join(' '):typeof x==='string'||typeof x==='number'?String(x):'';
test('Home consumes only authoritative current-month hook and renders zero, missing FOT and subtotal distinctly',()=>{
 let report=null;const context=vm.createContext({bdMonthlyVenueIdPhase7:()=>1,bdUseMonthlyReportV513:(v,m)=>{assert.equal(v,1);assert.equal(m,'current');return{report,error:null}},bdMoney2:String,bdMonthDisplay:String,i:{jsx:(tag,props)=>typeof tag==='function'?tag(props):props,jsxs:(tag,props)=>typeof tag==='function'?tag(props):props}});assert.ok(from>0&&to>from);vm.runInContext(source.slice(from,to),context);
 const render=()=>text(context.bdHomeCurrentFinanceV556({profile:{},settings:{},onNavigate:()=>{},revision:'stable'}));assert.match(render(),/Проверяем/);
 report={currentFinance:true,asOfDate:'2026-10-20',meta:{key:'2026-10'},resultBeforeCost:0,revenue:90,payroll:90,missingInformation:[],resultExplanation:'Без себестоимости'};assert.match(render(),/Результат до себестоимости.* 0/);assert.doesNotMatch(render(),/Нет расчёта|Предварительн/);
 assert.equal(context.bdHomeCurrentFinanceV556({profile:{},settings:{},onNavigate:()=>{},revision:'stable'}).children[1].style.color,'inherit');
 report={...report,resultBeforeCost:null,payroll:null,knownPayrollSubtotal:90,missingPayrollDates:['2026-10-19'],missingInformation:['Не полностью известен начисленный ФОТ']};assert.match(render(),/Общая сумма пока неизвестна/);assert.match(render(),/2026-10-19/);assert.match(render(),/ФОТ: Неизвестно/);
 assert.ok(source.includes('i.jsx(bdHomeCurrentFinanceV556,'));assert.ok(!source.includes('i.jsx(bdHomeMoneyCard,{report:j,previousReport:v,onNavigate:g})'));
});
test('shared report read requests current view; closure wizard keeps its distinct endpoint',()=>{assert.ok(source.includes('"&view=current&venueId="'));assert.ok(source.includes('bdMonthRequestPhase3a8("/api/month-close?monthKey="'));});
test('shift summary names before-cost amounts and excludes unknown values from counts and averages',()=>{
 const start=source.indexOf('function bdMonthlyShiftAnalysisV165('),end=source.indexOf('function bdMonthlyReadinessV165(',start);
 const context=vm.createContext({bdMonthlySectionHeaderV165:()=>{},bdMoney2:String,sg:String,i:{jsx:(tag,props)=>props,jsxs:(tag,props)=>props}});
 vm.runInContext(source.slice(start,end),context);
 const render=shiftEstimates=>context.bdMonthlyShiftAnalysisV165({report:{costOfGoods:null,shiftEstimates},period:'2026-10',navigate:()=>{}});
 const shift=(date,resultBeforeCost)=>({date,resultBeforeCost,estimatedResult:null,payroll:null,estimatedCost:null});
 const mixed=render([shift('a',210),shift('b',null),shift('c',0),shift('d',-30)]);
 const entries=mixed.children[1].children;
 assert.deepEqual(JSON.parse(JSON.stringify(Array.from(entries.slice(1,5),e=>e.children.map(x=>x.children)))),[['До себестоимости ≥ 0',2],['До себестоимости < 0',1],['Результат неизвестен',1],['Средний до себестоимости (известные смены)','60']]);
 assert.doesNotMatch(text(mixed),/Прибыльных|Убыточных/);
 const unknown=render([shift('a',null)]);
 assert.equal(unknown.children[1].children[4].children[1].children,'Неизвестно');
 assert.equal(unknown.children[2].children[0].children[1].children,'Результат неизвестен');
});
