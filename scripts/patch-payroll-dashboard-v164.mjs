import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);

let source = await readFile(bundlePath, "utf8");

if (source.includes('data-bd-payroll-dashboard":"v164')) {
  source = source
    .replace('i.jsx("option",{value:"balance",children:"По сумме к выплате"})', 'i.jsx("option",{value:"balance",children:"К выплате"})')
    .replace('i.jsx("option",{value:"paid",children:"По выплаченной сумме"})', 'i.jsx("option",{value:"paid",children:"По выплатам"})')
    .replace('i.jsx("option",{value:"all",children:"Все сотрудники"})', 'i.jsx("option",{value:"all",children:"Все"})');
  await writeFile(bundlePath, source);
  console.log("Payroll dashboard v164 polish applied.");
  process.exit(0);
}

function replaceExact(search, replacement, expected = 1) {
  const count = source.split(search).length - 1;
  if (count !== expected) {
    throw new Error(`Expected ${expected} occurrence(s), found ${count}: ${search.slice(0, 120)}`);
  }
  source = source.split(search).join(replacement);
}

function replaceRange(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) {
    throw new Error(`Unable to replace range: ${startMarker} … ${endMarker}`);
  }
  source = source.slice(0, start) + replacement + "\n" + source.slice(end);
}

const salariesModule = String.raw`
function bdSalaryContextV164(){return window.bdReadNavigationQuery("return","team")==="finance"?"finance":"team"}
function bdSalaryMonthWindowV164(e,t){if(!Array.isArray(e)||!e.length)return[];const n=Math.max(0,e.indexOf(t)),r=Math.max(0,Math.min(n-1,Math.max(0,e.length-3)));return e.slice(r,r+3)}
function bdSalaryListHrefV164({month:e,context:t="team",query:n="",sort:r="balance",status:a="all"}){const s=new URLSearchParams;s.set("month",e),s.set("return",t),n&&s.set("q",n),r!=="balance"&&s.set("sort",r),a!=="all"&&s.set("status",a);return"/salaries?"+s.toString()}
function bdSalaryEmployeeHrefV164(e,t){const n=bdSalaryListHrefV164(t).replace("/salaries?","");return"/salaries/"+encodeURIComponent(e)+"?"+n}
function bdSalaryHeaderV164({title:e,context:t="team",back:n,detail:r,right:a}){const s=t==="finance"?"Финансы":"Команда";return i.jsxs("header",{className:"bd-payroll-header-v164",children:[i.jsxs("div",{className:"bd-payroll-header-main-v164",children:[i.jsx("button",{type:"button",className:"bd-payroll-back-v164",onClick:()=>window.bdNavigateBack(n),"aria-label":"Назад",children:i.jsx(Nn,{size:19,"aria-hidden":!0})}),i.jsxs("div",{className:"bd-payroll-title-v164",children:[i.jsx("h1",{children:e}),i.jsxs("nav",{"aria-label":"Навигационная цепочка",children:[i.jsx("span",{children:s}),i.jsx(Br,{size:12,"aria-hidden":!0}),i.jsx("strong",{children:"Зарплаты"}),r&&i.jsxs(i.Fragment,{children:[i.jsx(Br,{size:12,"aria-hidden":!0}),i.jsx("span",{children:r})]})]})]})]}),i.jsxs("div",{className:"bd-payroll-header-actions-v164",children:[i.jsx("div",{"data-bd-sync-host":"payroll-v164",className:"bd-payroll-sync-host-v164"}),i.jsx("div",{"data-bd-venue-host":"payroll-v164",className:"bd-payroll-venue-host-v164"}),a]})]})}
function bdPayrollSummaryCardV164({totals:e,month:t,onRules:n}){const r=Math.abs(Number(e.balance)||0)<.005,a=[{key:"gross",label:"Начислено",value:Mn(e.gross),detail:"смены и премии",tone:"violet"},{key:"deductions",label:"Удержано",value:Number(e.deductions)?Mn(e.deductions):"—",detail:"штрафы и прочее",tone:Number(e.deductions)?"red":"muted"},{key:"paid",label:"Выплачено",value:Number(e.paid)?Mn(e.paid):"—",detail:"авансы и выплаты",tone:Number(e.paid)?"green":"muted"},{key:"balance",label:Number(e.balance)<0?"Переплата":"К выплате",value:r?"Закрыто":Mn(e.balance),detail:r?"долг погашен":"текущий долг",tone:Number(e.balance)<0?"red":r?"green":"primary",primary:!0}];return i.jsxs("section",{className:"bd-payroll-summary-v164","aria-label":"Итог зарплат за "+bdMonthDisplay(t),children:[i.jsxs("div",{className:"bd-payroll-summary-head-v164",children:[i.jsxs("div",{children:[i.jsx("span",{children:"Итог месяца"}),i.jsx("strong",{children:bdMonthDisplay(t)})]}),i.jsxs("details",{className:"bd-payroll-help-v164",children:[i.jsxs("summary",{children:["Как рассчитывается",i.jsx(Br,{size:14,"aria-hidden":!0})]}),i.jsxs("div",{children:[i.jsx("p",{children:"Начисления по сменам берутся из правил оплаты сотрудников. Премии прибавляются; заказы, штрафы и посуда уменьшают сумму к выдаче; выплаты уменьшают остаток долга."}),i.jsx("button",{type:"button",onClick:n,children:"Открыть правила оплаты"})]})]})]}),i.jsx("div",{className:"bd-payroll-summary-grid-v164",children:a.map(s=>i.jsxs("article",{className:"bd-payroll-summary-metric-v164 "+s.tone+(s.primary?" primary":""),children:[i.jsx("span",{children:s.label}),i.jsx("strong",{children:s.value}),i.jsx("small",{children:s.detail})]},s.key))})]})}
function bdPayrollRowValueV164(e){return Math.abs(Number(e)||0)<.005?"—":Mn(e)}
function bdPayrollEmployeeRowV164({row:e,onOpen:t}){const n=e.summary,r=Math.abs(Number(n.balance)||0)<.005,a=Number(n.balance)<0?"overpaid":r?"settled":"due";return i.jsxs("button",{type:"button",onClick:t,className:"bd-payroll-employee-row-v164",children:[i.jsxs("span",{className:"bd-payroll-person-v164",children:[i.jsx(dCe,{name:e.employee.name,size:38}),i.jsxs("span",{className:"bd-payroll-person-copy-v164",children:[i.jsx("strong",{children:e.employee.name}),i.jsxs("small",{children:[jo(e.employee),e.employee.department?" · "+e.employee.department:""]}),i.jsxs("span",{className:"bd-payroll-row-signals-v164",children:[Number(n.deductions)>0&&i.jsx("em",{className:"deduction",children:"Удержано "+Mn(n.deductions)}),e.missingRule&&i.jsx("em",{className:"warning",children:"Нет правила оплаты"})]})]})]}),i.jsxs("span",{className:"bd-payroll-row-values-v164",children:[i.jsxs("span",{children:[i.jsx("small",{children:"Начислено"}),i.jsx("b",{children:bdPayrollRowValueV164(n.gross)})]}),i.jsxs("span",{children:[i.jsx("small",{children:"Выплачено"}),i.jsx("b",{children:bdPayrollRowValueV164(n.paid)})]}),i.jsxs("span",{className:"balance "+a,children:[i.jsx("small",{children:Number(n.balance)<0?"Переплата":"К выплате"}),i.jsx("b",{children:r?"Закрыто":Mn(n.balance)})]})]}),i.jsx(Br,{size:17,className:"bd-payroll-row-chevron-v164","aria-hidden":!0})]})}
function bdSalariesPage(){const[,e]=bt(),{profile:t}=Un(),{employees:n}=_i(),{rules:r}=Do(),{revenue:a,gapReasons:s}=Ur(),{entries:l,upsertEntry:u}=bdUsePayrollLedger(t),{toast:d}=sn(),bdSalaryContext=bdSalaryContextV164(),bdSalaryReturnTo=bdSalaryContext==="team"?"/employees?view=overview":"/finance",bdSalaryQuickType=window.bdReadNavigationQuery("new",""),f=S.useMemo(()=>bdRecentMonthKeys(12),[]),[m,h]=S.useState(()=>window.bdReadNavigationQuery("month",bdPayrollInitialMonth)),[g,y]=S.useState(()=>window.bdReadNavigationQuery("q","")),[bdSalarySort,bdSetSalarySort]=S.useState(()=>{const T=window.bdReadNavigationQuery("sort","balance");return["balance","name","paid"].includes(T)?T:"balance"}),[bdSalaryStatus,bdSetSalaryStatus]=S.useState(()=>{const T=window.bdReadNavigationQuery("status","all");return["all","unpaid","paid"].includes(T)?T:"all"}),[j,v]=S.useState(()=>bdPayrollEntryOptions.includes(bdSalaryQuickType)?{type:bdSalaryQuickType}:null),bdSalariesQuickEntryContext=S.useEffect(()=>{bdSalaryQuickType&&window.bdSyncNavigationQuery({new:null})},[]),bdSalariesNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({month:m,q:g||null,sort:bdSalarySort==="balance"?null:bdSalarySort,status:bdSalaryStatus==="all"?null:bdSalaryStatus,return:bdSalaryContext})},[m,g,bdSalarySort,bdSalaryStatus,bdSalaryContext]),b=S.useMemo(()=>bdPayrollMonthModel(t,m,n,r,a,s,l),[t,m,n,r,a,s,l]),N=S.useMemo(()=>{const T={gross:0,deductions:0,paid:0,balance:0};for(const A of b)T.gross+=A.summary.gross,T.deductions+=A.summary.deductions,T.paid+=A.summary.paid,T.balance+=A.summary.balance;return T},[b]),E=S.useMemo(()=>{const T=g.trim().toLowerCase();let A=b.filter(k=>!T||k.employee.name.toLowerCase().includes(T)||jo(k.employee).toLowerCase().includes(T)||String(k.employee.department||"").toLowerCase().includes(T));return bdSalaryStatus==="unpaid"?A=A.filter(k=>Number(k.summary.balance)>.005):bdSalaryStatus==="paid"&&(A=A.filter(k=>Number(k.summary.gross)>0&&Number(k.summary.balance)<=.005)),A=[...A],bdSalarySort==="name"?A.sort((k,O)=>k.employee.name.localeCompare(O.employee.name,"ru")):bdSalarySort==="paid"?A.sort((k,O)=>O.summary.paid-k.summary.paid||k.employee.name.localeCompare(O.employee.name,"ru")):A.sort((k,O)=>O.summary.balance-k.summary.balance||k.employee.name.localeCompare(O.employee.name,"ru")),A},[b,g,bdSalarySort,bdSalaryStatus]),bdSalaryMonths=bdSalaryMonthWindowV164(f,m);function _(T){u(T),v(null),d({variant:"success",title:"Операция сохранена"})}const bdSalaryListContext={month:m,context:bdSalaryContext,query:g,sort:bdSalarySort,status:bdSalaryStatus};return i.jsx(nt,{showBottomNav:!0,className:"pb-32",children:i.jsx($e,{className:"pt-0",children:i.jsxs("div",{"data-bd-payroll-dashboard":"v164",className:"bd-payroll-page-v164",children:[i.jsx(bdSalaryHeaderV164,{title:"Зарплаты",context:bdSalaryContext,back:bdSalaryReturnTo}),i.jsxs("main",{className:"bd-payroll-main-v164",children:[i.jsxs("nav",{className:"bd-payroll-period-v164","aria-label":"Выбор месяца",children:[i.jsx("div",{className:"bd-payroll-month-tabs-v164",children:bdSalaryMonths.map(T=>i.jsx("button",{type:"button",onClick:()=>h(T),className:m===T?"active":"","aria-current":m===T?"date":void 0,children:bdMonthDisplay(T)},T))}),i.jsxs("label",{className:"bd-payroll-month-picker-v164",children:[i.jsx(RA,{size:19,"aria-hidden":!0}),i.jsx("select",{value:m,onChange:T=>h(T.target.value),"aria-label":"Выбрать другой месяц",children:f.map(T=>i.jsx("option",{value:T,children:bdMonthDisplay(T)},T))})]})]}),i.jsx(bdPayrollSummaryCardV164,{totals:N,month:m,onRules:()=>e("/payroll")}),i.jsxs("section",{className:"bd-payroll-actions-v164","aria-label":"Действия с зарплатами",children:[n.length?i.jsxs("button",{type:"button",className:"primary",onClick:()=>v({}),children:[i.jsx(Vt,{size:19,"aria-hidden":!0}),"Добавить операцию"]}):i.jsxs("button",{type:"button",className:"primary",onClick:()=>e("/employees?view=employees"),children:[i.jsx(Vt,{size:19,"aria-hidden":!0}),"Добавить сотрудника"]}),i.jsx("button",{type:"button",className:"secondary",onClick:()=>e("/payroll"),children:"Правила оплаты"})]}),b.length>0&&i.jsxs("section",{className:"bd-payroll-tools-v164",children:[i.jsxs("label",{className:"bd-payroll-search-v164",children:[i.jsx(xi,{size:18,"aria-hidden":!0}),i.jsx("input",{value:g,onChange:T=>y(T.target.value),placeholder:"Поиск сотрудника","aria-label":"Поиск сотрудника"}),g&&i.jsx("button",{type:"button",onClick:()=>y(""),"aria-label":"Очистить поиск",children:i.jsx(vt,{size:15,"aria-hidden":!0})})]}),i.jsxs("div",{className:"bd-payroll-selects-v164",children:[i.jsx("select",{value:bdSalarySort,onChange:T=>bdSetSalarySort(T.target.value),"aria-label":"Сортировка сотрудников",children:[i.jsx("option",{value:"balance",children:"По сумме к выплате"}),i.jsx("option",{value:"name",children:"По имени"}),i.jsx("option",{value:"paid",children:"По выплаченной сумме"})]}),i.jsx("select",{value:bdSalaryStatus,onChange:T=>bdSetSalaryStatus(T.target.value),"aria-label":"Фильтр по статусу выплаты",children:[i.jsx("option",{value:"all",children:"Все сотрудники"}),i.jsx("option",{value:"unpaid",children:"Не выплачено"}),i.jsx("option",{value:"paid",children:"Выплачено"})]})]})]}),i.jsxs("section",{className:"bd-payroll-directory-v164","aria-label":"Зарплаты сотрудников",children:[E.length>0&&i.jsxs("div",{className:"bd-payroll-directory-head-v164","aria-hidden":!0,children:[i.jsx("span",{children:"Сотрудник"}),i.jsxs("span",{children:[i.jsx("span",{children:"Начислено"}),i.jsx("span",{children:"Выплачено"}),i.jsx("span",{children:"К выплате"})]}),i.jsx("span",{})]}),E.length?i.jsx("div",{className:"bd-payroll-directory-body-v164",children:E.map(T=>i.jsx(bdPayrollEmployeeRowV164,{row:T,onOpen:()=>e(bdSalaryEmployeeHrefV164(T.employee.id,bdSalaryListContext))},T.employee.id))}):i.jsxs("div",{className:"bd-payroll-empty-v164",children:[i.jsx("strong",{children:b.length?"Сотрудники не найдены":"Зарплатная ведомость пока пуста"}),i.jsx("p",{children:b.length?"Измените поиск или фильтр.":"Добавьте сотрудников и состав смен — начисления появятся здесь автоматически."}),b.length>0&&i.jsx("button",{type:"button",onClick:()=>{y(""),bdSetSalaryStatus("all")},children:"Сбросить фильтры"})]})]}),i.jsx(qe,{children:j&&i.jsx(bdPayrollEntrySheet,{month:m,employees:n,initial:j&&typeof j==="object"?j:void 0,onClose:()=>v(null),onSave:_},"new-payroll-entry")})]})]})})})}
`;

replaceRange("function bdPayrollSummaryCard(", "function bdPayrollDetailLine(", salariesModule);

replaceExact(
  'onPayroll:()=>navigate("/salaries")',
  'onPayroll:()=>navigate("/salaries?month="+monthKey+"&return=finance")',
  2,
);

replaceExact(
  'const k=[];d&&k.push({key:"add",label:"Добавить сотрудника",icon:Vt,tone:"violet",action:g}),h&&k.push({key:"shifts",label:"График и смены",icon:RA,tone:"green",action:()=>j("/shifts?month="+u)}),m&&(k.push({key:"payments",label:"Авансы и выплаты",icon:$d,tone:"orange",action:()=>j("/salaries?month="+u+"&new=payment&return=team")}),k.push({key:"deductions",label:"Штрафы и удержания",icon:Fn,tone:"red",action:()=>j("/salaries?month="+u+"&new=fine&return=team")})),!m&&f&&k.push({key:"salaries",label:"Открыть зарплаты",icon:$d,tone:"orange",action:()=>j("/salaries?month="+u+"&return=team")});',
  'const k=[];f&&k.push({key:"salaries",label:"Зарплаты",icon:$d,tone:"orange",action:()=>j("/salaries?month="+u+"&return=team")}),d&&k.push({key:"add",label:"Добавить сотрудника",icon:Vt,tone:"violet",action:g}),h&&k.push({key:"shifts",label:"График и смены",icon:RA,tone:"green",action:()=>j("/shifts?month="+u)}),m&&(k.push({key:"payments",label:"Авансы и выплаты",icon:$d,tone:"orange",action:()=>j("/salaries?month="+u+"&new=payment&return=team")}),k.push({key:"deductions",label:"Штрафы и удержания",icon:Fn,tone:"red",action:()=>j("/salaries?month="+u+"&new=fine&return=team")}));',
);

replaceExact(
  'm.key==="finance"?e.startsWith("/finance")&&!e.startsWith("/finance/shift/")||["/salaries","/reports","/warehouse"].some(g=>e===g||e.startsWith(g+"/")):\n      m.key==="team"?["/employees","/tasks","/payroll"].some(g=>e===g||e.startsWith(g+"/")):',
  'm.key==="finance"?e.startsWith("/finance")&&!e.startsWith("/finance/shift/")||["/reports","/warehouse"].some(g=>e===g||e.startsWith(g+"/"))||e.startsWith("/salaries")&&window.bdReadNavigationQuery("return","team")==="finance":\n      m.key==="team"?["/employees","/tasks","/payroll"].some(g=>e===g||e.startsWith(g+"/"))||e.startsWith("/salaries")&&window.bdReadNavigationQuery("return","team")!=="finance":',
);

const employeeStart = source.indexOf("function bdSalaryEmployeePage(){");
const employeeEnd = source.indexOf("const bdBuildMonthlyReportBeforePayroll", employeeStart);
if (employeeStart < 0 || employeeEnd <= employeeStart) {
  throw new Error("Unable to locate employee salary detail page.");
}
let employeePage = source.slice(employeeStart, employeeEnd);
employeePage = employeePage
  .replace(
    'const[,e]=bt(),[,t]=$f("/salaries/:id"),{profile:n}=Un()',
    'const[,e]=bt(),[,t]=$f("/salaries/:id"),bdSalaryContext=bdSalaryContextV164(),bdSalaryListQuery=window.bdReadNavigationQuery("q",""),bdSalaryListSort=window.bdReadNavigationQuery("sort","balance"),bdSalaryListStatus=window.bdReadNavigationQuery("status","all"),{profile:n}=Un()',
  )
  .replace(
    'bdSalaryNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({month:g})},[g])',
    'bdSalaryNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({month:g,return:bdSalaryContext,q:bdSalaryListQuery||null,sort:bdSalaryListSort==="balance"?null:bdSalaryListSort,status:bdSalaryListStatus==="all"?null:bdSalaryListStatus})},[g,bdSalaryContext,bdSalaryListQuery,bdSalaryListSort,bdSalaryListStatus])',
  )
  .replace(
    'if(!N)return i.jsx(nt,{children:i.jsxs($e,{className:"min-h-[100dvh] flex flex-col items-center justify-center px-8 text-center",children:[i.jsx("h2",{className:"text-[20px] font-black",children:"Сотрудник не найден"}),i.jsx("button",{type:"button",onClick:()=>e("/salaries"),className:"mt-5 text-primary font-bold",children:"К зарплатам"})]})});',
    'const bdSalaryBackHref=bdSalaryListHrefV164({month:g,context:bdSalaryContext,query:bdSalaryListQuery,sort:bdSalaryListSort,status:bdSalaryListStatus});if(!N)return i.jsx(nt,{showBottomNav:!0,className:"pb-32",children:i.jsx($e,{className:"pt-0",children:i.jsxs("div",{className:"bd-payroll-page-v164",children:[i.jsx(bdSalaryHeaderV164,{title:"Сотрудник не найден",context:bdSalaryContext,back:bdSalaryBackHref,detail:"Карточка"}),i.jsxs("div",{className:"bd-payroll-detail-missing-v164",children:[i.jsx("p",{children:"Сотрудник отсутствует в выбранном заведении или был удалён."}),i.jsx("button",{type:"button",onClick:()=>e(bdSalaryBackHref),children:"К зарплатам"})]})]})})});',
  )
  .replace(
    'i.jsx(bdAccountingHeader,{title:N.employee.name,back:"/salaries?month="+g,right:i.jsx("button",{type:"button",onClick:()=>v({mode:"add"}),className:"text-[13px] font-bold text-primary",children:"+ Операция"})})',
    'i.jsx(bdSalaryHeaderV164,{title:N.employee.name,context:bdSalaryContext,back:bdSalaryBackHref,detail:"Сотрудник",right:i.jsx("button",{type:"button",onClick:()=>v({mode:"add"}),className:"bd-payroll-header-add-v164","aria-label":"Добавить зарплатную операцию",children:i.jsx(Vt,{size:19,"aria-hidden":!0})})})',
  )
  .replace(
    'children:i.jsxs($e,{className:"pt-0",children:[',
    'children:i.jsxs($e,{className:"pt-0 bd-payroll-detail-v164",children:[',
  );

if (!employeePage.includes("bdSalaryBackHref") || employeePage.includes('back:"/salaries?month="+g')) {
  throw new Error("Employee salary detail navigation patch did not apply cleanly.");
}
source = source.slice(0, employeeStart) + employeePage + source.slice(employeeEnd);

source = source
  .replace('i.jsx("option",{value:"balance",children:"По сумме к выплате"})', 'i.jsx("option",{value:"balance",children:"К выплате"})')
  .replace('i.jsx("option",{value:"paid",children:"По выплаченной сумме"})', 'i.jsx("option",{value:"paid",children:"По выплатам"})')
  .replace('i.jsx("option",{value:"all",children:"Все сотрудники"})', 'i.jsx("option",{value:"all",children:"Все"})');

await writeFile(bundlePath, source);

let bootstrap = await readFile(bootstrapPath, "utf8");
const oldBundleVersion = "/assets/index-BQGspy0I.js?v=20260812-team-v163";
const newBundleVersion = "/assets/index-BQGspy0I.js?v=20260812-payroll-v164";
if (!bootstrap.includes(oldBundleVersion)) {
  throw new Error("Unable to update the production bundle cache version.");
}
bootstrap = bootstrap.replace(oldBundleVersion, newBundleVersion);
await writeFile(bootstrapPath, bootstrap);

console.log("Payroll dashboard v164 patch applied.");
