import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const employeeDetailComponent = String.raw`
function bdEmployeeAttendanceForMonth(e,t,n){const r=(Array.isArray(n)?n:[]).filter(a=>String(a?.date||"").slice(0,7)===t).flatMap(a=>{const s=(Array.isArray(a?.staffing)?a.staffing:[]).find(l=>String(l?.employeeId||"")===String(e||""));if(!s)return[];const l=s.hours==null||s.hours===""?null:Number(s.hours),u=Number.isFinite(l)&&l>=0?l:null;return[{id:a.id,date:a.date,hours:u}] }).sort((a,s)=>String(s.date||"").localeCompare(String(a.date||""))),a=r.filter(s=>s.hours!==null),s=a.reduce((l,u)=>l+u.hours,0);return{rows:r,shiftCount:r.length,totalHours:s,knownHours:a.length,missingHours:r.length-a.length}}
function bdEmployeeHoursLabel(e){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(Number(e)||0)+" ч"}
function bdEmployeeFact({label:e,value:t,href:n}){const r=n?"a":"div";return i.jsxs(r,{className:"bd-employee-fact",...(n?{href:n}:{}),children:[i.jsx("span",{children:e}),i.jsx("strong",{children:t})]})}
function bdEmployeeMetric({label:e,value:t,tone:n="default"}){return i.jsxs("div",{className:"bd-employee-metric bd-employee-metric--"+n,children:[i.jsx("span",{children:e}),i.jsx("strong",{children:t})]})}
function bdEmployeeMoneyLine({label:e,value:t,tone:n="default"}){return i.jsxs("div",{className:"bd-employee-money-line bd-employee-money-line--"+n,children:[i.jsx("span",{children:e}),i.jsx("strong",{children:Mn(Number(t)||0)})]})}
function bdEmployeeLedgerReadOnly({entry:e}){const t=e.type==="bonus"?"+":"−",n=e.type==="bonus"?"positive":e.type==="payment"?"payment":"negative";return i.jsxs("article",{className:"bd-employee-ledger-row bd-employee-ledger-row--"+n,children:[i.jsxs("div",{children:[i.jsx("strong",{children:bdPayrollEntryLabels[e.type]||e.type}),i.jsx("span",{children:sg(e.date)}),e.note&&i.jsx("p",{children:e.note})]}),i.jsxs("b",{children:[t," ",Mn(Number(e.amount)||0)]})]})}
function bdEmployeeDetailPage(){const[,e]=bt(),[,t]=$f("/employees/:id"),{profile:n}=Un(),{employees:r,updateEmployee:a,deleteEmployee:s}=_i(),{rules:l}=Do(),{revenue:u,gapReasons:d}=Ur(),{entries:f}=bdUsePayrollLedger(n),{toast:m}=sn(),h=S.useMemo(()=>bdRecentMonthKeys(12),[]),[g,y]=S.useState(bdPayrollInitialMonth),[j,v]=S.useState(!1),b=r.find(C=>String(C.id)===String(t?.id)),N=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("team.manage"):localStorage.getItem("bd_active_role")==="owner",E=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("payroll.view"):localStorage.getItem("bd_active_role")==="owner",_=S.useMemo(()=>bdEmployeeAttendanceForMonth(b?.id,g,u),[b?.id,g,u]),T=S.useMemo(()=>E?bdPayrollMonthModel(n,g,r,l,u,d,f):[],[E,n,g,r,l,u,d,f]),A=T.find(C=>String(C.employee.id)===String(b?.id)),k=A?.summary||{base:0,bonus:0,order:0,fine:0,dishware:0,otherDeduction:0,deductions:0,gross:0,netAccrued:0,paid:0,balance:0},O={active:"Активен",on_leave:"В отпуске",dismissed:"Уволен"},M={morning:"Утренняя",day:"Полный день",night:"Ночная",flexible:"Гибкая"};if(!b)return i.jsx(nt,{showBottomNav:!0,children:i.jsxs($e,{className:"bd-employee-not-found",children:[i.jsx("h2",{children:"Сотрудник не найден"}),i.jsx("p",{children:"Возможно, карточка была удалена или относится к другому заведению."}),i.jsx("button",{type:"button",onClick:()=>e("/employees"),children:"К списку сотрудников"})]})});function D(C){a(b.id,C),v(!1),m({variant:"success",title:"Карточка сотрудника обновлена"})}function z(){const C=b.name;s(b.id),v(!1),e("/employees"),m({variant:"success",title:"Сотрудник удалён",description:C})}const L=b.hireDate?new Date(b.hireDate+"T00:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}):"Не указана",q=_.knownHours>0?bdEmployeeHoursLabel(_.totalHours):"Не указаны",B=_.missingHours>0?_.missingHours+" "+(_.missingHours===1?"смена без часов":"смен без часов"):"Часы заполнены",U=Array.isArray(A?.entries)?A.entries:[];return i.jsx(nt,{showBottomNav:!0,className:"bd-employee-detail-shell",children:i.jsxs($e,{className:"bd-employee-detail-page",children:[i.jsx(bdAccountingHeader,{title:"Карточка сотрудника",back:"/employees",right:N?i.jsx("button",{type:"button",onClick:()=>v(!0),className:"bd-employee-edit-button",children:"Изменить"}):null}),i.jsxs("main",{"data-bd-employee-detail":"view-v80",className:"bd-employee-detail-content",children:[i.jsxs("aside",{className:"bd-employee-profile-column",children:[i.jsxs("section",{className:"bd-employee-profile-card",children:[i.jsxs("div",{className:"bd-employee-profile-head",children:[i.jsx(dCe,{name:b.name,size:64}),i.jsxs("div",{className:"bd-employee-profile-title",children:[i.jsx("p",{children:"Сотрудник"}),i.jsx("h2",{children:b.name}),i.jsxs("div",{className:"bd-employee-profile-badges",children:[i.jsx("span",{className:"bd-employee-status bd-employee-status--"+b.status,children:O[b.status]||b.status}),i.jsx("span",{children:M[b.shift]||b.shift})]})]})]}),i.jsxs("div",{className:"bd-employee-facts",children:[i.jsx(bdEmployeeFact,{label:"Должность",value:jo(b)}),i.jsx(bdEmployeeFact,{label:"Отдел",value:b.department||"Не указан"}),i.jsx(bdEmployeeFact,{label:"Дата приёма",value:L}),b.phone&&i.jsx(bdEmployeeFact,{label:"Телефон",value:b.phone,href:"tel:"+b.phone}),b.email&&i.jsx(bdEmployeeFact,{label:"Email",value:b.email,href:"mailto:"+b.email})]})]}),b.notes&&i.jsxs("section",{className:"bd-employee-note-card",children:[i.jsx("span",{children:"Заметка"}),i.jsx("p",{children:b.notes})]}),N&&i.jsx("button",{type:"button",onClick:()=>v(!0),className:"bd-employee-secondary-edit",children:"Редактировать личные данные"})]}),i.jsxs("section",{className:"bd-employee-activity-column",children:[i.jsxs("section",{className:"bd-employee-month-card",children:[i.jsxs("div",{className:"bd-employee-section-heading",children:[i.jsxs("div",{children:[i.jsx("span",{children:"Период"}),i.jsx("h2",{children:bdMonthDisplay(g)})]}),i.jsx("p",{children:"Данные сгруппированы по месяцу"})]}),i.jsx("div",{className:"bd-employee-months",children:h.map(C=>i.jsx("button",{type:"button",onClick:()=>y(C),className:g===C?"active":"",children:bdMonthDisplay(C)},C))})]}),i.jsxs("section",{className:"bd-employee-summary-card",children:[i.jsx("h3",{children:"Работа за месяц"}),i.jsxs("div",{className:"bd-employee-metrics",children:[i.jsx(bdEmployeeMetric,{label:"Отработано смен",value:String(_.shiftCount),tone:"primary"}),i.jsx(bdEmployeeMetric,{label:"Отработано часов",value:q,tone:_.missingHours>0?"warning":"success"}),E&&i.jsx(bdEmployeeMetric,{label:"Начислено",value:Mn(k.netAccrued),tone:"success"}),E&&i.jsx(bdEmployeeMetric,{label:"Выплачено / авансы",value:Mn(k.paid),tone:"payment"})]}),_.shiftCount>0&&i.jsx("p",{className:_.missingHours>0?"bd-employee-hours-note warning":"bd-employee-hours-note",children:B})]}),E?i.jsxs(i.Fragment,{children:[i.jsxs("section",{className:"bd-employee-payroll-card",children:[i.jsxs("div",{className:"bd-employee-section-heading",children:[i.jsxs("div",{children:[i.jsx("span",{children:"Зарплата"}),i.jsx("h2",{children:"Расчёт за "+bdMonthDisplay(g)})]}),i.jsx("p",{children:A?.rule?.name||"Правило оплаты не назначено"})]}),i.jsx(bdEmployeeMoneyLine,{label:"Начислено по сменам",value:k.base}),i.jsx(bdEmployeeMoneyLine,{label:"Премии",value:k.bonus,tone:"positive"}),i.jsx(bdEmployeeMoneyLine,{label:"Заказы, штрафы и удержания",value:k.deductions,tone:"negative"}),i.jsx(bdEmployeeMoneyLine,{label:"Начислено к выплате",value:k.netAccrued}),i.jsx(bdEmployeeMoneyLine,{label:"Выплаты и авансы",value:k.paid,tone:"payment"}),i.jsx("div",{className:"bd-employee-balance "+(k.balance<0?"negative":"positive"),children:i.jsxs("div",{children:[i.jsx("span",{children:k.balance<0?"Переплата / долг сотрудника":"Осталось выдать"}),i.jsx("strong",{children:Mn(k.balance)})]})}),i.jsx("button",{type:"button",onClick:()=>e("/salaries/"+encodeURIComponent(b.id)+"?month="+g),className:"bd-employee-payroll-link",children:"Открыть полный зарплатный расчёт →"})]}),i.jsxs("section",{className:"bd-employee-ledger-card",children:[i.jsxs("div",{className:"bd-employee-section-heading",children:[i.jsxs("div",{children:[i.jsx("span",{children:"История"}),i.jsx("h2",{children:"Премии, удержания и выплаты"})]}),i.jsxs("p",{children:[U.length," операций"]})]}),U.length?i.jsx("div",{className:"bd-employee-ledger-list",children:U.map(C=>i.jsx(bdEmployeeLedgerReadOnly,{entry:C},C.id))}):i.jsx("div",{className:"bd-employee-empty",children:"В этом месяце премий, авансов, выплат и удержаний не было."})]})]}):i.jsxs("section",{className:"bd-employee-payroll-locked",children:[i.jsx("strong",{children:"Финансовая информация скрыта"}),i.jsx("p",{children:"Начисления, авансы и выплаты доступны пользователям с правом «Просмотр зарплат»."})]}),i.jsxs("section",{className:"bd-employee-shifts-card",children:[i.jsxs("div",{className:"bd-employee-section-heading",children:[i.jsxs("div",{children:[i.jsx("span",{children:"Смены"}),i.jsx("h2",{children:"Отработанные смены"})]}),i.jsxs("p",{children:[_.shiftCount," за месяц"]})]}),_.rows.length?i.jsx("div",{className:"bd-employee-shift-list",children:_.rows.map(C=>{const F=A?.shifts?.find(Z=>String(Z.id)===String(C.id));return i.jsxs("button",{type:"button",onClick:()=>C.id&&e("/finance/shift/"+C.id+"/payroll"),children:[i.jsxs("div",{children:[i.jsx("strong",{children:sg(C.date)}),i.jsx("span",{children:C.hours===null?"Часы не указаны":bdEmployeeHoursLabel(C.hours)})]}),E&&i.jsx("b",{children:Mn(Number(F?.total)||0)}),i.jsx("i",{children:"→"})]},C.id||C.date)})}):i.jsx("div",{className:"bd-employee-empty",children:"Сотрудник не указан ни в одной закрытой смене этого месяца."})]})]})]}),i.jsx(qe,{children:j&&i.jsx(yCe,{mode:"edit",initial:b,onClose:()=>v(!1),onSave:D,onDelete:z},"employee-detail-edit")})]})})}
`;

let bundle = await readFile(bundlePath, "utf8");

bundle = replaceOnce(
  bundle,
  "function vCe(){",
  `${employeeDetailComponent}function vCe(){`,
  "employee detail component",
);

bundle = replaceOnce(
  bundle,
  "function vCe(){const{employees:e,addEmployee:t,updateEmployee:n,deleteEmployee:r}=_i(),",
  "function vCe(){const[,bdEmployeeNavigate]=bt(),{employees:e,addEmployee:t,updateEmployee:n,deleteEmployee:r}=_i(),",
  "employee list navigation hook",
);

bundle = replaceOnce(
  bundle,
  'function j(T){m({mode:"edit",employee:T})}',
  'function j(T){bdEmployeeNavigate("/employees/"+encodeURIComponent(T.id))}',
  "employee list opens view mode",
);

bundle = replaceOnce(
  bundle,
  'i.jsx(Xe,{path:"/employees",component:()=>i.jsx(pt,{component:vCe})}),',
  'i.jsx(Xe,{path:"/employees/:id",component:()=>i.jsx(pt,{component:bdEmployeeDetailPage})}),i.jsx(Xe,{path:"/employees",component:()=>i.jsx(pt,{component:vCe})}),',
  "employee detail route",
);

bundle = replaceOnce(
  bundle,
  'const bdReleaseCandidateVersion="rc-v79"',
  'const bdReleaseCandidateVersion="rc-v80"',
  "release version",
);

await writeFile(bundlePath, bundle);
console.log("Employee profile view v80 applied");
