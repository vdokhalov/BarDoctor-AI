import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes("function bdSalarySummaryTotalsV164(")) {
  console.log("Payroll/finance alignment v164 is already applied.");
  process.exit(0);
}

function replaceExact(search, replacement, expected = 1) {
  const count = source.split(search).length - 1;
  if (count !== expected) {
    throw new Error(`Expected ${expected} occurrence(s), found ${count}: ${search.slice(0, 140)}`);
  }
  source = source.split(search).join(replacement);
}

const summaryStart = source.indexOf("function bdPayrollSummaryCardV164(");
const summaryEnd = source.indexOf("function bdPayrollRowValueV164", summaryStart);
if (summaryStart < 0 || summaryEnd <= summaryStart) {
  throw new Error("Unable to locate the payroll summary component.");
}

const summary = String.raw`function bdSalarySummaryTotalsV164(e,t){return e?{gross:Number(e.payroll)||0,deductions:Number(e.payrollDeductions)||0,paid:Number(e.payrollPaid)||0,balance:Number(e.payrollBalance)||0}:t}
function bdPayrollSummaryCardV164({totals:e,month:t,onRules:n,unallocated:o=0}){const r=Math.abs(Number(e.balance)||0)<.005,a=[{key:"gross",label:"Начислено",value:Mn(e.gross),detail:"смены и премии",tone:"violet"},{key:"deductions",label:"Удержано",value:Number(e.deductions)?Mn(e.deductions):"—",detail:"штрафы и прочее",tone:Number(e.deductions)?"red":"muted"},{key:"paid",label:"Выплачено",value:Number(e.paid)?Mn(e.paid):"—",detail:"авансы и выплаты",tone:Number(e.paid)?"green":"muted"},{key:"balance",label:Number(e.balance)<0?"Переплата":"К выплате",value:r?"Закрыто":Mn(e.balance),detail:r?"долг погашен":"текущий долг",tone:Number(e.balance)<0?"red":r?"green":"primary",primary:!0}];return i.jsxs("section",{className:"bd-payroll-summary-v164","aria-label":"Итог зарплат за "+bdMonthDisplay(t),children:[i.jsxs("div",{className:"bd-payroll-summary-head-v164",children:[i.jsxs("div",{children:[i.jsx("span",{children:"Итог месяца"}),i.jsx("strong",{children:bdMonthDisplay(t)})]}),i.jsxs("details",{className:"bd-payroll-help-v164",children:[i.jsxs("summary",{children:["Как рассчитывается",i.jsx(Br,{size:14,"aria-hidden":!0})]}),i.jsxs("div",{children:[i.jsx("p",{children:"Начисления по сменам берутся из правил оплаты сотрудников. Премии прибавляются; заказы, штрафы и посуда уменьшают сумму к выдаче; выплаты уменьшают остаток долга."}),i.jsx("button",{type:"button",onClick:n,children:"Открыть правила оплаты"})]})]})]}),i.jsx("div",{className:"bd-payroll-summary-grid-v164",children:a.map(s=>i.jsxs("article",{className:"bd-payroll-summary-metric-v164 "+s.tone+(s.primary?" primary":""),children:[i.jsx("span",{children:s.label}),i.jsx("strong",{children:s.value}),i.jsx("small",{children:s.detail})]},s.key))}),o>.005&&i.jsxs("button",{type:"button",className:"bd-payroll-unallocated-v164",onClick:n,children:[i.jsx(Fn,{size:17,"aria-hidden":!0}),i.jsxs("span",{children:[i.jsxs("strong",{children:["Не распределено по сотрудникам: ",Mn(o)]}),i.jsx("small",{children:"ФОТ учтён в Финансах. Проверьте состав смен и правила оплаты."})]}),i.jsx(Br,{size:16,"aria-hidden":!0})]})]})}
`;

source = source.slice(0, summaryStart) + summary + source.slice(summaryEnd);

replaceExact(
  '{revenue:a,gapReasons:s}=Ur(),{entries:l,upsertEntry:u}=bdUsePayrollLedger(t)',
  '{revenue:a,expenses:bdSalaryExpenses,gapReasons:s}=Ur(),{settings:bdSalarySettings,snapshots:bdSalarySnapshots}=bdUseAccountingStore(t),{entries:l,upsertEntry:u}=bdUsePayrollLedger(t)',
);

replaceExact(
  'b=S.useMemo(()=>bdPayrollMonthModel(t,m,n,r,a,s,l),[t,m,n,r,a,s,l]),N=S.useMemo(()=>{const T={gross:0,deductions:0,paid:0,balance:0};for(const A of b)T.gross+=A.summary.gross,T.deductions+=A.summary.deductions,T.paid+=A.summary.paid,T.balance+=A.summary.balance;return T},[b]),',
  'b=S.useMemo(()=>bdPayrollMonthModel(t,m,n,r,a,s,l),[t,m,n,r,a,s,l]),bdSalaryEmployeeTotals=S.useMemo(()=>{const T={gross:0,deductions:0,paid:0,balance:0};for(const A of b)T.gross+=A.summary.gross,T.deductions+=A.summary.deductions,T.paid+=A.summary.paid,T.balance+=A.summary.balance;return T},[b]),bdSalaryReport=S.useMemo(()=>t?bdBuildMonthlyReport(t,m,a,bdSalaryExpenses,bdSalarySnapshots,bdSalarySettings,s):null,[t,m,a,bdSalaryExpenses,bdSalarySnapshots,bdSalarySettings,s]),N=S.useMemo(()=>bdSalarySummaryTotalsV164(bdSalaryReport,bdSalaryEmployeeTotals),[bdSalaryReport,bdSalaryEmployeeTotals]),bdSalaryUnallocated=Math.max(0,N.gross-bdSalaryEmployeeTotals.gross),',
);

replaceExact(
  'i.jsx(bdPayrollSummaryCardV164,{totals:N,month:m,onRules:()=>e("/payroll")})',
  'i.jsx(bdPayrollSummaryCardV164,{totals:N,month:m,unallocated:bdSalaryUnallocated,onRules:()=>e("/payroll")})',
);

await writeFile(bundlePath, source);
console.log("Payroll/finance alignment v164 applied.");
