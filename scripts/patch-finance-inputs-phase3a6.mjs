import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, 'public/assets/index-BQGspy0I.js');
const start = '/* finance-inputs-phase3a6:start */', end = '/* finance-inputs-phase3a6:end */';
let source = fs.readFileSync(file, 'utf8');
const rewrites = [
  ['bdShiftMoney=ye=>bdAccountingMoneyV243(ye,bdShiftCurrency)', 'bdShiftMoney=ye=>ye==null?"Неизвестно":bdAccountingMoneyV243(ye,bdShiftCurrency)'],
  ['children:"ФОТ смены · автоматически"', 'children:ce.payrollBasis==="RECORDED"?"ФОТ смены · сохранённый":ce.payrollBasis==="MISSING"?"ФОТ смены · нужны данные":"ФОТ смены · оценка по текущим правилам"'],
  ['Выберите сотрудников, которые фактически работали. ФОТ смены рассчитывается по их правилам оплаты.', 'Выберите сотрудников, которые фактически работали. Сохранённый ФОТ сохраняется при неизменных данных смены; для изменённых данных показана оценка по текущим правилам.'],
  ['function N(M,D,z){const L=j.current;if(!L)return M;const q=v.current,B=b.current;return M.map(U=>{if(U.date.slice(0,7)!==D||!U.staffing||U.staffing.length===0)return U;const H=TC(L,M,z,U.date),I=m7(U.date,U.staffing,U.shiftDepartmentSales,U.shiftVenueSales,q,B,H);return{...U,payrollBreakdown:I}})}', 'function N(M,D,z){return M}'],
  ['if(D.size>0){let z=d.current;for(const L of D)z=N(z,L,f.current);_h(z),d.current=z,r(z),Js()}', 'if(D.size>0){/* Recorded payroll is never recomputed by hydration. */}'],
  ['const bdShiftClosingVersion="guided-v17",bdShiftCurrency=', 'if(bdInitialDay?.report)e={...e,...bdInitialDay.report,date:bdInitialDay.businessDate};const bdShiftClosingVersion="guided-v17",bdShiftCurrency='],
  ['le=ye.length>0?m7(f,ye,je,Ce,n,r,he):void 0;return{staffing:ye,shiftDepartmentSales:je,shiftVenueSales:Ce,payrollBreakdown:le}', 'le=bdFinanceInputsPhase3a6.payrollForOperationalEdit({previous:e,businessDate:f,staffing:ye,shiftDepartmentSales:je,shiftVenueSales:Ce,estimate:ye.length>0?m7(f,ye,je,Ce,n,r,he):void 0});return{staffing:ye,shiftDepartmentSales:je,shiftVenueSales:Ce,payrollBreakdown:le.payrollBreakdown,payrollBasis:le.basis}'],
  ['payrollTotal=ce.payrollBreakdown?.total??0', 'payrollTotal=bdFinanceInputsPhase3a6.finiteBusinessNumber(ce.payrollBreakdown?.total??ce.payrollBreakdown?.totalPayroll)'],
  ['resultBeforeCost=revenueValid?Z-payrollTotal-existingWriteoffs-newWriteoffs-recurringAllocation:null', 'resultBeforeCost=revenueValid&&payrollTotal!=null?Z-payrollTotal-existingWriteoffs-newWriteoffs-recurringAllocation:null'],
  ['const r=Math.abs(Number(e.balance)||0)<.005,a=[{key:"gross",label:"Начислено",value:Mn(e.gross)', 'const r=e.balance!=null&&Math.abs(Number(e.balance)||0)<.005,a=[{key:"gross",label:"Начислено",value:e.gross==null?"Неизвестно":Mn(e.gross)'],
  ['value:r?"Закрыто":Mn(e.balance),detail:r?"долг погашен":"текущий долг"', 'value:e.balance==null?"Неизвестно":r?"Закрыто":Mn(e.balance),detail:e.balance==null?"ФОТ требует данных":r?"долг погашен":"текущий долг"'],
  ['Начисления по сменам берутся из правил оплаты сотрудников. Премии прибавляются;', 'Для сохранённых отчётов используется записанный ФОТ. Расчёт по текущим правилам — оценка для смен без записанного ФОТ. Премии прибавляются;'],
  ['l=t&&e.revenue>0?Math.round(e.payroll/e.revenue*1e3)/10:null', 'l=t&&e.revenue>0&&e.payroll!=null?Math.round(e.payroll/e.revenue*1e3)/10:null'],
];
const restore = value => {
  const from = value.indexOf(start);
  if (from < 0) return value;
  const to = value.indexOf(end, from);
  if (to < from || value.indexOf(start, from + start.length) >= 0) throw new Error('Phase3a6 unique restoration boundary required');
  let result = value.slice(0, from) + value.slice(to + end.length).replace(/^\n/, '');
  for (const [before, after] of rewrites) {
    if (!result.includes(after) && !result.includes(before)) throw new Error('Phase3a6 copy restoration anchor missing');
    result = result.replace(after, before);
  }
  return result;
};
source = restore(source);
if (process.argv.includes('--restore')) { fs.writeFileSync(file, source); process.exit(0); }
for (const [before, after] of rewrites) {
  if (!source.includes(before)) throw new Error('Phase3a6 copy anchor missing: ' + before.slice(0, 60));
  source = source.replace(before, after);
}
// Compile the exact server read helpers for the existing client, rather than
// maintaining a second financial calculation. No storage writes in this block.
const modules = new Map();
function include(name) {
  if (modules.has(name)) return;
  const value = fs.readFileSync(path.join(root, 'lib/bardoctor', name + '.ts'), 'utf8');
  modules.set(name, ts.transpileModule(value, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
  for (const match of value.matchAll(/from "\.\/([^"\n]+)"/g)) include(match[1]);
}
include('finance-inputs');
const domain = `const bdFinanceInputsPhase3a6=(()=>{const modules={${[...modules].map(([key, value]) => `${JSON.stringify(key)}:(module,exports,require)=>{${value}}`).join(',')}},cache={};function require(key){key=key.startsWith('./')?key.slice(2):key;if(!cache[key]){const module={exports:{}};cache[key]=module;modules[key](module,module.exports,require)}return cache[key].exports}return {...require('finance-inputs'),...require('business-day-rows')};})();`;
const client = `
bdOperationalRows=function(rows,days){return bdFinanceInputsPhase3a6.revenueRowsWithReports(rows,days)};
function bdFinanceReadPhase3a6(profile,startDate,endDate,revenues,expenses,settings){return bdFinanceInputsPhase3a6.readFinanceInputs({venueId:bdMonthlyVenueIdPhase7(profile,settings),legacyVenueKeys:[String(profile?.id||profile?.name||"primary")],currency:bdMonthlyAccountingCurrencyV320(profile,settings),asOf:new Date().toISOString(),startDate,endDate,revenues,operationalDayProjection:revenues.map(row=>row._bdOperationalDay).filter(Boolean),reports:bdProcArray("bd_operational_reports_v1"),events:bdProcArray("bd_sales_events_v1"),documents:bdProcArray("bd_sales_documents"),expenses,payrollEntries:bdProcArray("bd_payroll_entries")})}
const bdFinanceSummaryBeforePhase3a6=wn;
wn=function(revenues,expenses,startDate,endDate,currency=bdMonthlyAccountingCurrencyV320(null,null)){const valid=expenses.filter(bdFinanceInputsPhase3a6.activeBusinessRow),result=bdFinanceSummaryBeforePhase3a6(revenues,valid,startDate,endDate,currency),scopeRows=revenues.filter(row=>BS(row.date,startDate,endDate)),dates=scopeRows.map(row=>row.date).sort(),inputs=bdFinanceReadPhase3a6({currency,venueId:scopeRows.find(row=>Number.isSafeInteger(Number(row.venueId)))?.venueId},LS(startDate),LS(endDate),scopeRows,valid,{accountingCurrency:currency});return{...result,revenue:inputs.revenue,payroll:inputs.payroll,expenses:inputs.expenses,operatingDiff:inputs.preliminaryResult,inputContract:inputs,daysWithData:inputs.daily.length}};
const bdMonthlyReportBeforePhase3a6=bdBuildMonthlyReport;
bdBuildMonthlyReport=function(profile,monthKey,revenues,expenses,snapshots,settings,gapReasons=[]){const meta=bdMonthMeta(monthKey),inputs=bdFinanceReadPhase3a6(profile,meta.start,meta.end,revenues,expenses,settings),joined=bdFinanceInputsPhase3a6.revenueRowsWithReports(revenues,inputs.days),report=bdMonthlyReportBeforePhase3a6(profile,monthKey,joined,expenses.filter(bdFinanceInputsPhase3a6.activeBusinessRow),snapshots,settings,gapReasons);if(report.isClosed)return report;const delta=inputs.payroll==null?null:inputs.payroll-(Number(report.payroll)||0),adjust=value=>value==null||delta==null?null:value-delta,known=inputs.missing.length===0,base=inputs.payrollBase,bonus=inputs.payrollBonuses,net=inputs.payroll==null?null:inputs.payrollDeductions==null?null:inputs.payroll-inputs.payrollDeductions;return{...report,revenue:inputs.revenue,payroll:inputs.payroll,payrollBase:base,payrollBonuses:bonus,payrollNet:net,payrollDeductions:inputs.payrollDeductions,payrollPaid:inputs.payrollPaid,payrollBalance:net==null||inputs.payrollPaid==null?null:net-inputs.payrollPaid,payrollSource:inputs.payrollBasis==="RECORDED"?"Сохранённый ФОТ отчётов":inputs.payrollBasis==="LEGACY_EXPENSE"?"Исторические расходы ФОТ":inputs.payroll==null?"ФОТ неизвестен":"Сохранённый ФОТ · исторические данные",inputContract:inputs,resultBeforeCost:known?adjust(report.resultBeforeCost):null,cashResult:known?adjust(report.cashResult):null,operatingResult:known?adjust(report.operatingResult):null,financeInputsKnown:known,shiftEstimates:report.shiftEstimates.map(row=>{const day=inputs.payrollByDay.find(day=>day.businessDate===row.date),payroll=day?.amount??null;return{...row,payroll,payrollBasis:day?.basis||"MISSING",resultBeforeCost:payroll==null?null:row.resultBeforeCost+(Number(row.payroll)||0)-payroll,estimatedResult:payroll==null||row.estimatedResult==null?null:row.estimatedResult+(Number(row.payroll)||0)-payroll}})}};
const bdPayrollMonthAuditsBeforePhase3a6=bdPayrollMonthAudits;
bdPayrollMonthAudits=function(profile,month,employees,rules,revenues,gaps){const dates=revenues.filter(row=>row.date?.slice(0,7)===month).map(row=>row.date).sort(),inputs=bdFinanceReadPhase3a6(profile,dates[0]||month+"-01",dates.at(-1)||month+"-01",revenues,[],{}),joined=bdFinanceInputsPhase3a6.revenueRowsWithReports(revenues,inputs.days);return bdPayrollMonthAuditsBeforePhase3a6(profile,month,employees,rules,joined,gaps).map(entry=>{const saved=entry.shift.payrollBreakdown,amount=bdFinanceInputsPhase3a6.finiteBusinessNumber(saved?.total??saved?.totalPayroll);if(amount==null)return{...entry,audit:{...entry.audit,basis:"CURRENT_RULE_ESTIMATE"}};return{...entry,audit:{...entry.audit,...saved,employees:Array.isArray(saved.employees)?saved.employees:saved.perEmployee&&typeof saved.perEmployee==="object"?Object.entries(saved.perEmployee).filter(([,value])=>bdFinanceInputsPhase3a6.finiteBusinessNumber(value)!=null).map(([id,value])=>{const employee=employees.find(row=>String(row.id)===id);return{employeeId:employee?.id??id,employeeName:employee?.name||"Удалённый сотрудник",department:employee?.department||"Без отдела",total:bdFinanceInputsPhase3a6.finiteBusinessNumber(value),flags:[],occurrences:[{ruleName:"Сохранённое начисление",formula:"Сумма зафиксирована в отчёте смены"}]}}):[],totalPayroll:amount,total:amount,basis:"RECORDED"}}})};
const bdMoneyBeforePhase3a6=bdMoney2;
bdMoney2=function(value){return value==null?"Неизвестно":bdMoneyBeforePhase3a6(value)};
const bdSalaryTotalsBeforePhase3a6=bdSalarySummaryTotalsV164;
bdSalarySummaryTotalsV164=function(report,fallback){return report?{gross:report.payroll,deductions:report.payrollDeductions,paid:report.payrollPaid,balance:report.payrollBalance}:bdSalaryTotalsBeforePhase3a6(report,fallback)};
const bdPayrollTotalsBeforePhase3a6=bdPayrollEntryTotals;
bdPayrollEntryTotals=function(rows){const currency=bdMonthlyAccountingCurrencyV320(null,null);return bdPayrollTotalsBeforePhase3a6(rows.filter(bdFinanceInputsPhase3a6.activeBusinessRow).map(row=>({...row,amount:bdFinanceInputsPhase3a6.financeAmount(row,"amount",currency)??0})))};
`;
const anchor = 'function bdShiftDateLabelV156(';
if (source.split(anchor).length !== 2) throw new Error('Phase3a6 client insertion anchor must be unique');
source = source.replace(anchor, `${start}\n${domain}\n${client}\n${end}\n${anchor}`);
fs.writeFileSync(file, source);
console.info('Phase3a6 shared business-day/Finance recorded input contract applied.');
