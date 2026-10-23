import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMonthFixture} from './helpers/empty-month-fixture';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const fragment=readFileSync(new URL('../scripts/fragments/monthly-report-v165.fragment.txt',import.meta.url),'utf8');
const component=fragment.slice(fragment.indexOf('function bdMonthlyPendingReasonsV513'),fragment.indexOf('function bdMonthlyReportPage'));
const render=(props:object)=>{const c=vm.createContext({i:{jsx:(tag:unknown,props:unknown)=>({tag,props}),jsxs:(tag:unknown,props:unknown)=>({tag,props})},bdMonthlyReasonCatalogV515:{PAYROLL:['Не все начисления зарплаты подтверждены'],INVENTORY_BOUNDARY_UNKNOWN:['Не подтверждена стоимость запасов']},bdMonthlyReasonLinkV515:()=>'/reports'});vm.runInContext(component,c);return JSON.stringify(c.bdMonthlyPendingReasonsV513(props));};
test('empty period has explicit evidence, closing guards and unknown amounts stay unchanged',async()=>{const r=await emptyMonthFixture();try{
 const before=JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data').all());
 const empty=await(await r.get()).json();assert.equal(empty.report.emptyPeriod,true);assert.equal(empty.report.payroll,null);assert.equal(empty.report.finalProfit,null);assert.equal(empty.eligible,false);
 const view=render({emptyPeriod:true,reasons:['PAYROLL','INVENTORY_BOUNDARY_UNKNOWN']});assert.doesNotMatch(view,/начисления зарплаты/);assert.match(view,/Условия закрытия месяца|Для закрытия месяца нужны остатки/);
 assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data').all()),before);
 r.seed('bd_finance_revenue',[{id:'zero-day',venueId:r.venueId,date:'2026-09-02',revenue:0,currency:'MDL'}]);const zero=await(await r.get()).json();assert.equal(zero.report.emptyPeriod,false);assert.match(render({emptyPeriod:false,reasons:['PAYROLL']}),/Не все начисления/);
 r.seed('bd_finance_revenue',[]);r.seed('bd_finance_expenses',[{id:'unknown',venueId:r.venueId,date:'2026-09-02',category:'rent',amount:null,currency:'MDL'}]);assert.equal((await(await r.get()).json()).report.emptyPeriod,false);
 assert.match(render({emptyPeriod:true,reasons:['RECURRING_INPUT_UNKNOWN','INVENTORY_BOUNDARY_UNKNOWN']}),/RECURRING_INPUT_UNKNOWN/);
 }finally{r.close();}});
