import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
const from=source.indexOf('function bdCurrentFinancePeriod('),to=source.indexOf('/* bd-monthly-report-v165:end */',from);
const text=x=>Array.isArray(x)?x.map(text).join(' '):x&&typeof x==='object'?Object.values(x).map(text).join(' '):typeof x==='string'||typeof x==='number'?String(x):'';
test('Home consumes only authoritative current-month hook and renders zero, missing FOT and subtotal distinctly',()=>{
 let report=null;const context=vm.createContext({bdMonthlyVenueIdPhase7:()=>1,bdUseMonthlyReportV513:(v,m)=>{assert.equal(v,1);assert.equal(m,'current');return{report,error:null}},bdMoney2:String,bdMonthDisplay:String,i:{jsx:(tag,props)=>typeof tag==='function'?tag(props):props,jsxs:(tag,props)=>typeof tag==='function'?tag(props):props}});assert.ok(from>0&&to>from);vm.runInContext(source.slice(source.indexOf('function bdCurrentResultPresentation('),source.indexOf('function bdMonthlyHeroV165('))+source.slice(from,to),context);
 const render=()=>text(context.bdHomeCurrentFinanceV556({profile:{},settings:{},onNavigate:()=>{},revision:'stable'}));assert.match(render(),/Проверяем/);
 report={currentFinance:true,asOfDate:'2026-10-20',meta:{key:'2026-10'},resultBeforeCost:0,revenue:90,payroll:90,missingInformation:[],resultExplanation:'Без себестоимости'};assert.match(render(),/Результат до себестоимости.* 0/);assert.doesNotMatch(render(),/Нет расчёта|Предварительн/);
 assert.equal(context.bdHomeCurrentFinanceV556({profile:{},settings:{},onNavigate:()=>{},revision:'stable'}).children[1].style.color,'inherit');
 report={...report,resultBeforeCost:null,payroll:null,knownPayrollSubtotal:90,missing:['PAYROLL'],missingPayrollDates:['2026-10-19'],missingInformation:['Не полностью известен начисленный ФОТ']};assert.match(render(),/Общая сумма пока неизвестна/);assert.match(render(),/2026-10-19/);assert.match(render(),/Не хватает данных о зарплате/);
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
test('open month shows canonical after-cost result on Home and report chart, including zero; missing facts and errors stay explicit',()=>{
 let report={currentFinance:true,isClosed:false,finalProfit:null,operatingResult:null,asOfDate:'2026-10-21',meta:{key:'2026-10'},revenue:31087.4,payroll:9135,costOfGoods:7826.69,resultBeforeCost:21471.65,resultAfterCost:13632.96,inventoryAdjustmentNet:-12,missingInformation:[],financeAssessmentInformation:[],resultExplanation:'Без себестоимости товара; это не чистая прибыль.'},error=null;
 const context=vm.createContext({bdMonthlyVenueIdPhase7:()=>3389,bdUseMonthlyReportV513:()=>({report,error}),bdMoney2:String,bdMonthDisplay:String,bdMonthlySectionHeaderV165:p=>p,i:{jsx:(tag,p)=>typeof tag==='function'?tag(p):p,jsxs:(tag,p)=>typeof tag==='function'?tag(p):p}});
 const part=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
 vm.runInContext(part('function bdCurrentResultPresentation(','function bdMonthlyHeroV165(')+part('function bdMonthlyProfitStructureV165(','function bdMonthlyCostV165(')+source.slice(from,to),context);
 const home=()=>text(context.bdHomeCurrentFinanceV556({profile:{},settings:{}})),chart=()=>text(context.bdMonthlyProfitStructureV165({report}));
 assert.match(home(),/Прибыль за месяц.*13632.96/);assert.doesNotMatch(home(),/Без себестоимости|Результат до себестоимости/);assert.match(home(),/месяц ещё не закрыт/);
 assert.match(chart(),/7826.69/);assert.match(chart(),/Прибыль за месяц.*13632.96/);assert.doesNotMatch(chart(),/Диаграмма появится|Чистая прибыль/);assert.equal(report.operatingResult,null);assert.equal(report.isClosed,false);
 report={...report,resultAfterCost:0,costOfGoods:0};assert.match(home(),/Прибыль за месяц.* 0/);assert.doesNotMatch(chart(),/Диаграмма появится/);
 report={...report,resultAfterCost:null,costOfGoods:null,financeAssessmentInformation:['Не подтверждена стоимость продажи']};assert.match(home(),/Результат до себестоимости.*21471.65/);assert.match(chart(),/Не подтверждена стоимость продажи/);
 report={...report,costOfGoods:7826.69,resultBeforeCost:null,payroll:null,missingInformation:['Не полностью известен начисленный ФОТ']};assert.match(home(),/Недостаточно данных/);assert.match(chart(),/Себестоимость рассчитана.*ФОТ/);
 error='Проверка недоступна';assert.match(home(),/Проверка недоступна/);assert.doesNotMatch(home(),/21471|13632/);error=null;report=null;assert.match(home(),/Проверяем финансовые данные/);
 report={currentFinance:false,isClosed:true,operatingResult:100,meta:{key:'2026-09'},revenue:150,payroll:20};assert.match(home(),/Чистая прибыль месяца.*100/);
});
test('saved open-shift estimate is labelled on all current displays; missing and zero stay distinct',()=>{
 const context=vm.createContext({bdMoney2:String,bdMonthlySectionHeaderV165:p=>p,i:{jsx:(tag,p)=>typeof tag==='function'?tag(p):p,jsxs:(tag,p)=>typeof tag==='function'?tag(p):p}});
 const part=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
 vm.runInContext(part('function bdCurrentResultPresentation(','function bdMonthlyHeroV165(')+part('function bdMonthlyProfitStructureV165(','function bdMonthlyCostV165(')+source.slice(from,to)+part('function bdCurrentExpenseRows(','/* finance-current-result-v573:end */'),context);
 let r={currentFinance:true,costOfGoods:20,resultAfterCost:null,resultBeforeCost:null,provisionalResultBeforeCost:70,provisionalResultAfterCost:40,provisionalPayroll:20,knownPayrollSubtotal:10,estimatedPayrollSubtotal:10,payrollBonuses:0,provisionalExplanation:'Предварительно: расчёт открытой смены',revenue:100};
 for(const render of [()=>text(context.bdFinanceCurrentResultV573({report:r})),()=>text(context.bdMonthlyProfitStructureV165({report:r}))]){assert.match(render(),/Прибыль за месяц.*40/);assert.doesNotMatch(render(),/Чистая прибыль/);}
 r={...r,provisionalResultAfterCost:-40};assert.equal(context.bdCurrentResultPresentation(r).label,"Убыток за месяц");
 r={...r,provisionalResultAfterCost:0};assert.equal(context.bdCurrentResultPresentation(r).value,0);
 r={...r,provisionalResultBeforeCost:null,provisionalResultAfterCost:null};assert.equal(context.bdCurrentResultPresentation(r).value,null);assert.equal(context.bdCurrentResultPresentation(r).estimated,false);
});
