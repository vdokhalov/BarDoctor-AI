import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const cssPath = path.join(root, "public/assets/index-D0AhgpbR.css");
let source = fs.readFileSync(bundlePath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");

const marker = 'bdReleaseCandidateVersion="rc-v52"';
if (source.includes(marker)) {
  console.log("release candidate v52 already applied");
  process.exit(0);
}

function replaceOnce(oldValue, newValue, label) {
  const first = source.indexOf(oldValue);
  if (first < 0) throw new Error(`${label} anchor was not found`);
  if (source.indexOf(oldValue, first + oldValue.length) >= 0) {
    throw new Error(`${label} anchor is not unique`);
  }
  source = source.slice(0, first) + newValue + source.slice(first + oldValue.length);
}

// Local state is part of the venue boundary. Previously it was scoped only by
// email, so switching venues could upload the previous venue's cached data into
// the newly selected venue during cloud bootstrap.
replaceOnce(
  'function Pt(e){const t=Ot();return t?`${e}__${t}`:e}function Zn(e){const t=Pt(e);if(t===e)return null;try{const n=localStorage.getItem(e);return n?(localStorage.setItem(t,n),localStorage.removeItem(e),n):null}catch{return null}}',
  'function bdStorageContext(){const e=Ot(),t=localStorage.getItem("bd_active_venue_id");return e?t?`${e}__venue_${t}`:e:""}function Pt(e){const t=bdStorageContext();return t?`${e}__${t}`:e}function Zn(e){const t=Pt(e);if(t===e)return null;try{const n=Ot(),r=[];n&&r.push(`${e}__${n}`),r.push(e);for(const a of r){if(a===t)continue;const s=localStorage.getItem(a);if(s!==null)return localStorage.setItem(t,s),localStorage.removeItem(a),s}return null}catch{return null}}',
  "venue-scoped local storage",
);

// Preserve the exact financial result of a confirmed month. Settings may be
// edited later, but a closed report must continue to show its signed snapshot.
replaceOnce(
  'function bdMonthClosingSnapshot(e){return{revenue:e.revenue,purchases:e.purchases,otherExpenses:e.otherExpenses,writeoffs:e.writeoffs,payroll:e.payroll,taxes:e.taxes,utilities:e.utilities,openingInventory:e.openingInventory,closingInventory:e.closingInventory,costOfGoods:e.costOfGoods,cashResult:e.cashResult,resultBeforeCost:e.resultBeforeCost,finalProfit:e.operatingResult,accountedShifts:e.accountedShifts,expectedShifts:e.expectedShifts,coveragePercent:e.coveragePercent,sections:e.sections}}',
  'function bdMonthClosingSnapshot(e){return{revenue:e.revenue,receipts:e.receipts,purchases:e.purchases,periodExpenses:e.periodExpenses,expenseBreakdown:e.expenseBreakdown,otherExpenses:e.otherExpenses,writeoffs:e.writeoffs,payroll:e.payroll,payrollSource:e.payrollSource,taxes:e.taxes,taxMode:e.taxMode,utilities:e.utilities,utilityMode:e.utilityMode,openingInventory:e.openingInventory,closingInventory:e.closingInventory,costOfGoods:e.costOfGoods,cashResult:e.cashResult,resultBeforeCost:e.resultBeforeCost,finalProfit:e.operatingResult,plannedShifts:e.plannedShifts,accountedShifts:e.accountedShifts,expectedShifts:e.expectedShifts,coveragePercent:e.coveragePercent,sections:e.sections}}',
  "month-closing snapshot",
);

const reportAnchor = 'cashResult:G,shiftEstimates:_}};\nfunction bdShiftsPage(){';
const reportWrapper = String.raw`cashResult:G,shiftEstimates:_}};
const bdReleaseCandidateVersion="rc-v52",bdBuildMonthlyReportBeforeClosure=bdBuildMonthlyReport;
function bdClosedMonthRecord(e,t){const n=String(e?.id||"primary");return bdArrayStore(bdMonthClosingsKey).filter(r=>r&&r.monthKey===t&&(!r.venueId||String(r.venueId)===n)).sort((r,a)=>String(a.updatedAt||a.closedAt||"").localeCompare(String(r.updatedAt||r.closedAt||""))).find(r=>r.status==="closed")||null}
function bdClosedSnapshotValue(e,t,n){return Object.prototype.hasOwnProperty.call(e,t)?e[t]:n}
bdBuildMonthlyReport=function(e,t,n,r,a,s,l=[]){const u=bdBuildMonthlyReportBeforeClosure(e,t,n,r,a,s,l),d=bdClosedMonthRecord(s,t);if(!d)return{...u,status:"preliminary",isClosed:!1,closure:null};const f=d.snapshot&&typeof d.snapshot==="object"?d.snapshot:{},m=(h,g)=>bdClosedSnapshotValue(f,h,g),p=m("finalProfit",m("operatingResult",u.operatingResult));return{...u,status:"closed",isClosed:!0,closure:d,closedAt:d.closedAt||null,revenue:m("revenue",u.revenue),receipts:m("receipts",u.receipts),purchases:m("purchases",u.purchases),periodExpenses:m("periodExpenses",u.periodExpenses),expenseBreakdown:m("expenseBreakdown",u.expenseBreakdown),otherExpenses:m("otherExpenses",u.otherExpenses),writeoffs:m("writeoffs",u.writeoffs),payroll:m("payroll",u.payroll),payrollSource:m("payrollSource",u.payrollSource),taxes:m("taxes",u.taxes),taxMode:m("taxMode",u.taxMode),utilities:m("utilities",u.utilities),utilityMode:m("utilityMode",u.utilityMode),openingInventory:m("openingInventory",u.openingInventory),closingInventory:m("closingInventory",u.closingInventory),costOfGoods:m("costOfGoods",u.costOfGoods),cashResult:m("cashResult",u.cashResult),resultBeforeCost:m("resultBeforeCost",u.resultBeforeCost),operatingResult:p,plannedShifts:m("plannedShifts",u.plannedShifts),accountedShifts:m("accountedShifts",u.accountedShifts),expectedShifts:m("expectedShifts",u.expectedShifts),coveragePercent:m("coveragePercent",u.coveragePercent),sections:m("sections",u.sections)}};
function bdShiftsPage(){`;
replaceOnce(reportAnchor, reportWrapper, "closed-month report wrapper");

// Correct misleading cash-flow wording. The calculation includes accrued FOT,
// so it is a management result after purchases, not the bank-account balance.
const copyReplacements = [
  ["Текущий денежный результат месяца", "Результат месяца после закупок"],
  ["Движение денег, не финальная прибыль", "Управленческий ориентир, не остаток на счёте"],
  ["Все внесённые расходы", "Закупки и начисленные расходы"],
  ["Текущий денежный результат", "Результат после закупок"],
  ["после всех внесённых расходов", "после закупок и начисленных расходов"],
  ["Полностью вычтены закупки бара, кухни и кальянов, ФОТ, списания, накопительные расходы, налоги и коммунальные услуги.", "Вычтены закупки бара, кухни и кальянов, начисленный ФОТ, списания, остальные расходы, налоги и коммунальные услуги."],
  ["Показывает, сколько денег осталось после всех внесённых расходов за период. Закупки запасов вычитаются полностью в момент внесения. Это показатель движения денег, а не прибыль: часть закупленного товара может оставаться на складе.", "Показывает управленческий результат после закупок и начисленных расходов. Это не банковский денежный поток: даты фактической оплаты ФОТ, налогов и коммунальных услуг могут отличаться."],
  ['{key:"cash",title:"Денежный результат",value:e.cashResult,formula:"Выручка − закупки − ФОТ − списания − остальные расходы − налоги − коммунальные услуги",text:"Показывает движение денег после всех внесённых выплат. Для незакрытого месяца налоги и коммунальные услуги учитываются пропорционально внесённым сменам."}', '{key:"cash",title:"Результат после закупок",value:e.cashResult,formula:"Выручка − закупки − начисленный ФОТ − списания − остальные расходы − налоги − коммунальные услуги",text:"Управленческий ориентир после закупок и начисленных расходов. Это не остаток на банковском счёте: даты фактических выплат могут отличаться."}'],
];
for (const [oldValue, newValue] of copyReplacements) {
  if (!source.includes(oldValue)) throw new Error(`Financial copy anchor was not found: ${oldValue}`);
  source = source.replace(oldValue, newValue);
}

// The profile no longer exposes controls that did not persist or had no action.
replaceOnce(
  'i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2",children:"Роль"}),i.jsx("div",{className:"flex gap-2 flex-wrap",children:Koe.map(_=>i.jsx("button",{type:"button",onClick:()=>N(_),className:X("px-4 py-2 rounded-full text-[13px] font-semibold border transition-all",b===_?"bg-primary text-white border-primary":"bg-card border-border text-foreground"),children:i7[_]},_))})]})',
  'i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2",children:"Роль доступа"}),i.jsxs("div",{className:"rounded-2xl border border-border bg-muted/50 px-4 py-3",children:[i.jsx("p",{className:"text-[14px] font-bold text-foreground",children:i7[b]??b}),i.jsx("p",{className:"text-[11.5px] text-muted-foreground mt-1 leading-relaxed",children:"Роль назначается владельцем заведения в разделе «Контроль данных» и не меняется из личного профиля."})]})]})',
  "read-only access role",
);
replaceOnce(
  'i.jsx("input",{type:"email",value:g,onChange:_=>y(_.target.value),placeholder:"you@example.com",className:"bd-field-input"})',
  'i.jsx("input",{type:"email",value:g,readOnly:!0,"aria-readonly":!0,className:"bd-field-input opacity-70 cursor-not-allowed"})',
  "read-only account email",
);
replaceOnce(
  'i.jsxs("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] overflow-hidden",children:[i.jsx($l,{icon:i.jsx(Tm,{className:"w-5 h-5"}),title:"Пароль",showChevron:!0,onClick:O,className:"px-4 border-b border-border"}),i.jsx($l,{icon:i.jsx($d,{className:"w-5 h-5"}),title:"Двухфакторная защита",showChevron:!0,onClick:O,className:"px-4 border-b border-border"}),i.jsx($l,{icon:i.jsx(hZ,{className:"w-5 h-5"}),title:"Устройства",showChevron:!0,onClick:O,className:"px-4"})]})',
  'i.jsx("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] overflow-hidden",children:i.jsx($l,{icon:i.jsx(Tm,{className:"w-5 h-5"}),title:"Изменить пароль",meta:"Через подтверждение личности",showChevron:!0,onClick:()=>window.location.assign("/forgot-password"),className:"px-4"})})',
  "working password action",
);
replaceOnce(
  'i.jsx("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] overflow-hidden",children:i.jsx($l,{icon:i.jsx(lQ,{className:"w-5 h-5"}),title:"Язык",meta:"Русский",showChevron:!0,onClick:O,className:"px-4"})})',
  'i.jsx("div",{className:"bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] overflow-hidden",children:i.jsx($l,{icon:i.jsx(lQ,{className:"w-5 h-5"}),title:"Язык интерфейса",meta:"Русский",showChevron:!1,className:"px-4"})})',
  "fixed language row",
);

for (const [oldValue, newValue] of [
  ["Заводской сброс", "Очистить это устройство"],
  ["Удалить все данные, аккаунты и сессии", "Удалить локальный кэш и выйти из аккаунта"],
  ["Это действие удалит ", "Это действие удалит с этого устройства "],
  [" приложения: аккаунты, профили заведений, инциденты, решения, кэш ИИ и сессии.", " локальные данные и сессии BarDoctor. Данные заведений в облаке сохранятся."],
  ["Отменить невозможно.", "После повторного входа данные загрузятся заново."],
  ["Удалить всё и сбросить", "Очистить устройство и выйти"],
]) {
  if (!source.includes(oldValue)) throw new Error(`Device reset copy anchor was not found: ${oldValue}`);
  source = source.replaceAll(oldValue, newValue);
}

const aboutPage = String.raw`
function bdAboutPage(){const[,e]=bt();return i.jsx(nt,{showBottomNav:!0,children:i.jsxs($e,{className:"pt-0 pb-32",children:[i.jsxs("header",{className:"sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center gap-3",children:[i.jsx("button",{type:"button",onClick:()=>e("/more"),"aria-label":"Назад",className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95",children:i.jsx(js,{size:16})}),i.jsx("h1",{className:"text-[20px] font-black tracking-tight",children:"О BarDoctor"})]}),i.jsxs("div",{className:"px-6 pt-5 flex flex-col gap-4",children:[i.jsxs("section",{className:"rounded-[26px] p-5 text-white",style:{background:"linear-gradient(145deg,#11162F,#27256A)"},children:[i.jsx("p",{className:"text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300",children:"Release Candidate"}),i.jsx("h2",{className:"text-[28px] font-black mt-2 tracking-tight",children:"Заведение под контролем"}),i.jsx("p",{className:"text-[13px] text-white/70 mt-3 leading-relaxed",children:"BarDoctor объединяет финансы, смены, команду, склад и управленческие решения в одном рабочем пространстве."})]}),i.jsxs("section",{className:"bg-card rounded-2xl border border-card-border p-5",children:[i.jsx("h3",{className:"text-[15px] font-black",children:"Как помогает AI"}),i.jsx("p",{className:"text-[13px] text-muted-foreground mt-2 leading-relaxed",children:"Рекомендации строятся по цепочке: факт → возможная причина → последствия → конкретное действие → проверка результата. AI помогает принять решение, но не заменяет проверку управляющего."})]}),i.jsxs("section",{className:"bg-card rounded-2xl border border-card-border p-5",children:[i.jsx("h3",{className:"text-[15px] font-black",children:"Данные и доступ"}),i.jsx("p",{className:"text-[13px] text-muted-foreground mt-2 leading-relaxed",children:"Данные разделены по заведениям. Доступ сотрудников определяется ролью и разрешениями владельца; закрытый месяц фиксирует подтверждённый финансовый результат."})]}),i.jsxs("section",{className:"bg-card rounded-2xl border border-card-border p-5",children:[i.jsx("h3",{className:"text-[15px] font-black",children:"Документы"}),i.jsxs("div",{className:"mt-3 grid grid-cols-1 gap-2",children:[i.jsx("a",{href:"/terms",className:"h-12 rounded-xl border border-border px-4 flex items-center justify-between text-[13px] font-bold",children:"Условия тестирования →"}),i.jsx("a",{href:"/privacy",className:"h-12 rounded-xl border border-border px-4 flex items-center justify-between text-[13px] font-bold",children:"Конфиденциальность →"})]})]}),i.jsx("p",{className:"text-[11px] text-muted-foreground text-center leading-relaxed px-3",children:"Сборка RC · 8 августа 2026"})]})]})})}
`;
const aboutAnchor = "const n_e={";
if (!source.includes(aboutAnchor)) throw new Error("About page anchor was not found");
source = source.replace(aboutAnchor, aboutPage + aboutAnchor);
replaceOnce(
  'i.jsx(Xe,{path:"/about",component:()=>i.jsx(pt,{component:Ll})})',
  'i.jsx(Xe,{path:"/about",component:()=>i.jsx(pt,{component:bdAboutPage})})',
  "about route",
);

const legalPages = String.raw`
function bdLegalPage({type:e}){const t=e==="privacy",n=t?"Конфиденциальность":"Условия тестирования";return i.jsxs("main",{style:{minHeight:"100dvh",background:"#F5F7FB",color:"#15182C",fontFamily:"Manrope,Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"},children:[i.jsxs("header",{style:{position:"sticky",top:0,zIndex:2,display:"flex",alignItems:"center",gap:12,padding:"16px clamp(18px,5vw,34px)",borderBottom:"1px solid #E1E5EF",background:"rgba(255,255,255,.96)",backdropFilter:"blur(18px)"},children:[i.jsx("a",{href:"/login","aria-label":"Назад",style:{display:"grid",placeItems:"center",width:40,height:40,border:"1px solid #DDE1EC",borderRadius:13,color:"#252940",textDecoration:"none",fontSize:21},children:"←"}),i.jsxs("div",{children:[i.jsx("p",{style:{margin:0,fontSize:10,fontWeight:900,letterSpacing:".12em",color:"#5B5CEB",textTransform:"uppercase"},children:"BarDoctor · RC"}),i.jsx("h1",{style:{margin:"3px 0 0",fontSize:20,fontWeight:900},children:n})]})]}),i.jsx("article",{style:{width:"min(100% - 32px,760px)",margin:"24px auto 60px",padding:"clamp(22px,5vw,42px)",border:"1px solid #E1E5EF",borderRadius:26,background:"#fff",boxShadow:"0 18px 45px rgba(27,35,70,.07)",fontSize:14,lineHeight:1.65},children:t?i.jsxs(i.Fragment,{children:[i.jsx("h2",{style:{marginTop:0,fontSize:26},children:"Как обрабатываются данные"}),i.jsx("p",{children:"Во время тестирования BarDoctor хранит данные аккаунта, профиля заведения и внесённые операционные записи, необходимые для работы приложения."}),i.jsx("h3",{children:"Для чего используются данные"}),i.jsx("p",{children:"Для авторизации, синхронизации между устройствами, финансовых расчётов, отчётов, контроля доступа и формирования AI-рекомендаций внутри выбранного заведения."}),i.jsx("h3",{children:"Изоляция и доступ"}),i.jsx("p",{children:"Записи привязаны к конкретному заведению. Сотрудник получает только разрешённые владельцем разделы. Не передавайте пароль и одноразовые коды приглашений третьим лицам."}),i.jsx("h3",{children:"Локальные данные"}),i.jsx("p",{children:"Браузер хранит сессию и локальный кэш отдельно для каждого аккаунта и заведения. Команда «Очистить это устройство» удаляет только локальный кэш и выполняет выход; облачные данные сохраняются."}),i.jsx("h3",{children:"Тестовый статус"}),i.jsx("p",{children:"Это версия Release Candidate для ограниченного пользовательского тестирования. Окончательная публичная политика и реквизиты оператора должны быть утверждены до открытого запуска."})]}):i.jsxs(i.Fragment,{children:[i.jsx("h2",{style:{marginTop:0,fontSize:26},children:"Правила участия в тестировании"}),i.jsx("p",{children:"BarDoctor предоставляется для проверки рабочих сценариев владельцами и управляющими заведений до публичного запуска."}),i.jsx("h3",{children:"Ответственность пользователя"}),i.jsx("p",{children:"Пользователь отвечает за точность внесённых сумм, права сотрудников и проверку исходных документов. Не передавайте учётные данные и коды приглашений посторонним."}),i.jsx("h3",{children:"Финансы и AI"}),i.jsx("p",{children:"Расчёты и AI-рекомендации являются управленческими инструментами. Перед налоговой, бухгалтерской или юридической отчётностью результаты необходимо сверять с первичными документами и профильными специалистами."}),i.jsx("h3",{children:"Закрытие периода"}),i.jsx("p",{children:"Подтверждая закрытие месяца, пользователь фиксирует проверенный снимок результата. Для исправления данных период нужно сначала открыть повторно."}),i.jsx("h3",{children:"Доступность RC"}),i.jsx("p",{children:"В тестовой версии возможны технические перерывы. Обнаруженные ошибки следует передавать владельцу тестирования вместе с экраном и последовательностью действий."}),i.jsx("h3",{children:"До публичного запуска"}),i.jsx("p",{children:"Окончательные юридические реквизиты, поддержка и публичные условия должны быть утверждены оператором продукта."})]})})]})}
`;
const routerAnchor = "function lEe(){return";
if (!source.includes(routerAnchor)) throw new Error("Router anchor was not found");
source = source.replace(routerAnchor, legalPages + routerAnchor);
replaceOnce(
  'i.jsx(Xe,{path:"/register",component:Dle}),',
  'i.jsx(Xe,{path:"/register",component:Dle}),i.jsx(Xe,{path:"/terms",component:()=>i.jsx(bdLegalPage,{type:"terms"})}),i.jsx(Xe,{path:"/privacy",component:()=>i.jsx(bdLegalPage,{type:"privacy"})}),',
  "legal routes",
);

// Registration: honest validation state, accessible consent, current demo date.
replaceOnce(
  'password:h&&!t.password?"Введите пароль":""',
  'password:h&&t.password.length<6?"Минимум 6 символов":""',
  "registration password validation",
);
replaceOnce(
  'i.jsxs("button",{type:"button",onClick:()=>m(k=>!k),disabled:y,className:"bd-auth-consent",children:',
  'i.jsxs("button",{type:"button",role:"checkbox","aria-checked":f,onClick:()=>m(k=>!k),disabled:y,className:"bd-auth-consent",children:',
  "registration consent semantics",
);
replaceOnce(
  'i.jsx("button",{type:"submit",className:"bd-auth-primary",disabled:y,children:y?',
  'i.jsx("button",{type:"submit",className:"bd-auth-primary",disabled:y||!t.name.trim()||!t.surname.trim()||!t.localPhone.trim()||!t.email.trim()||t.password.length<6||t.password!==t.repeatPassword||!f,children:y?',
  "registration submit readiness",
);
replaceOnce(
  'children:"Сегодня · 14 июля"',
  'children:"Сегодня · "+new Date().toLocaleDateString("ru-RU",{day:"numeric",month:"long"})',
  "current showcase date",
);

// Keep catalogue disclosure state inside the same account/venue namespace too.
source = source.replaceAll("localStorage.getItem(bdCatDisclosureKey)", "localStorage.getItem(Pt(bdCatDisclosureKey))");
source = source.replaceAll("localStorage.setItem(bdCatDisclosureKey,", "localStorage.setItem(Pt(bdCatDisclosureKey),");

const cssMarker = "/* bd-release-candidate-v52 */";
if (!css.includes(cssMarker)) {
  css += `\n${cssMarker}\n@media (min-width:900px){.bd-auth-register .bd-auth-showcase{height:auto;min-height:100dvh;align-self:stretch}.bd-auth-register .bd-auth-showcase-content{position:sticky;top:0;height:100dvh}}\n`;
}

fs.writeFileSync(bundlePath, source);
fs.writeFileSync(cssPath, css);
console.log("applied release candidate v52");
