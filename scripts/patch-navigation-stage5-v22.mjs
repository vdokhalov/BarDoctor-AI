import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceExact(label, before, after) {
  if (!source.includes(before)) throw new Error(`Не найден фрагмент: ${label}`);
  source = source.replace(before, after);
}

function replaceRange(label, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Не найден диапазон: ${label}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

replaceRange(
  "нижняя навигация",
  "const Ele=",
  "function nt",
  `const Ele=["/more","/equipment","/suppliers","/reviews","/notifications","/settings","/about","/integrations"];
function Tle(){const[e,t]=bt(),n=ste(),[r,a]=S.useState(!1),s=new URLSearchParams(n),l=s.get("tab")==="shifts",u=[{key:"home",name:"Главная",href:"/home",icon:pQ},{key:"shifts",name:"Смены",href:"/finance?tab=shifts",icon:SQ},{key:"finance",name:"Финансы",href:"/finance",icon:$c},{key:"add",name:"Добавить",icon:Vt,action:!0},{key:"team",name:"Команда",href:"/employees",icon:zr},{key:"more",name:"Ещё",href:"/more",icon:tS}],d=[{name:"Закрыть смену",description:"Внести выручку и состав команды",href:"/finance?closeShift=1",icon:SQ},{name:"Добавить расход",description:"Записать накопительный расход",href:"/finance?addExpense=1",icon:$c},{name:"Сообщить о происшествии",description:"Зафиксировать проблему или жалобу",href:"/add",icon:Ic},{name:"Создать поручение",description:"Назначить задачу сотруднику",href:"/tasks?new=1",icon:zr}];function f(m){a(!1),t(m)}return i.jsxs(i.Fragment,{children:[i.jsx("nav",{className:"fixed bottom-0 w-full max-w-[430px] z-50 px-1",style:{height:"calc(76px + env(safe-area-inset-bottom))",paddingBottom:"env(safe-area-inset-bottom)",background:"rgba(255,255,255,0.97)",backdropFilter:"blur(24px) saturate(180%)",WebkitBackdropFilter:"blur(24px) saturate(180%)",borderTop:"0.5px solid rgba(22,27,46,0.09)",boxShadow:"0 -4px 24px rgba(22,27,46,0.06)"},children:i.jsx("div",{className:"grid grid-cols-6 h-full",children:u.map(m=>{const h=m.key==="home"?e==="/home"||e.startsWith("/analysis"):m.key==="shifts"?e==="/finance"&&l:m.key==="finance"?e.startsWith("/finance")&&!l||["/salaries","/reports","/warehouse"].some(g=>e===g||e.startsWith(g+"/")):m.key==="team"?["/employees","/tasks","/payroll","/decisions"].some(g=>e===g||e.startsWith(g+"/")):m.key==="more"?Ele.some(g=>e===g||e.startsWith(g+"/")):!1,y=m.icon;return m.action?i.jsxs("button",{type:"button",onClick:()=>a(!0),className:"relative flex flex-col items-center justify-center gap-[5px] select-none",children:[i.jsx(W.div,{whileTap:{scale:.82},className:"w-[30px] h-[30px] rounded-[10px] bg-primary/10 flex items-center justify-center",children:i.jsx(y,{strokeWidth:2.4,className:"w-[19px] h-[19px] text-primary"})}),i.jsx("span",{className:"text-[9px] leading-none font-bold text-primary tracking-tight",children:m.name})]},m.key):i.jsxs(Zl,{href:m.href,className:"relative flex flex-col items-center justify-center gap-[5px] select-none min-w-0",children:[h&&i.jsx(W.div,{layoutId:"nav-indicator-v22",className:"absolute top-0 w-8 h-[3px] rounded-b-full bg-primary",transition:{type:"spring",stiffness:420,damping:36}}),i.jsx(W.div,{whileTap:{scale:.78},className:"flex flex-col items-center gap-[5px] min-w-0",children:i.jsxs(i.Fragment,{children:[i.jsx(y,{strokeWidth:h?2.5:1.75,className:X("w-[20px] h-[20px] transition-colors",h?"text-primary":"text-muted-foreground/55")}),i.jsx("span",{className:X("text-[9px] leading-none tracking-tight whitespace-nowrap transition-colors",h?"font-bold text-primary":"font-medium text-muted-foreground/55"),children:m.name})]})})]},m.key)})})}),r&&i.jsxs(i.Fragment,{children:[i.jsx(W.button,{type:"button","aria-label":"Закрыть меню добавления",onClick:()=>a(!1),initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 z-[55] bg-slate-950/35 backdrop-blur-[2px]"}),i.jsxs(W.div,{initial:{opacity:0,y:22,scale:.98},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:18,scale:.98},transition:{duration:.2},className:"fixed z-[60] rounded-[26px] border border-white/70 bg-white/98 p-3 shadow-[0_22px_70px_rgba(15,23,42,.24)]",style:{left:10,right:10,margin:"0 auto",bottom:"calc(82px + env(safe-area-inset-bottom))",width:"min(410px, calc(100vw - 20px))"},children:[i.jsxs("div",{className:"flex items-center justify-between px-2 py-2",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-[17px] font-black text-foreground",children:"Добавить"}),i.jsx("p",{className:"text-[12px] text-muted-foreground mt-0.5",children:"Выберите действие"})]}),i.jsx("button",{type:"button",onClick:()=>a(!1),className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground",children:"×"})]}),i.jsx("div",{className:"grid grid-cols-1 gap-1 mt-1",children:d.map(m=>{const h=m.icon;return i.jsxs("button",{type:"button",onClick:()=>f(m.href),className:"w-full flex items-center gap-3 rounded-[18px] px-3 py-3 text-left hover:bg-muted active:bg-primary/8 transition-colors",children:[i.jsx("span",{className:"w-11 h-11 rounded-[14px] bg-primary/10 text-primary flex items-center justify-center shrink-0",children:i.jsx(h,{size:20})}),i.jsxs("span",{className:"min-w-0 flex-1",children:[i.jsx("span",{className:"block text-[14px] font-bold text-foreground",children:m.name}),i.jsx("span",{className:"block text-[11.5px] text-muted-foreground mt-0.5",children:m.description})]}),i.jsx(Br,{size:16,className:"text-muted-foreground/45 shrink-0"})]},m.href)})})]})]})]})}
`
);

replaceExact(
  "состав раздела Ещё",
  'const QI=[{icon:RA,label:"Финансы",href:"/finance",badge:null},{icon:Dn,label:"Оборудование",href:"/equipment",badge:null},{icon:zr,label:"Сотрудники",href:"/employees",badge:null},{icon:RA,label:"Зарплаты",href:"/salaries",badge:null},{icon:wX,label:"Правила оплаты",href:"/payroll",badge:null},{icon:Mf,label:"Отзывы гостей",href:"/reviews",badge:null},{icon:Pf,label:"Поставщики",href:"/suppliers",badge:null},{icon:PA,label:"Склад",href:"/warehouse",badge:null},{icon:aQ,label:"Отчёты",href:"/reports",badge:null}]',
  'const QI=[{icon:Dn,label:"Оборудование",href:"/equipment",badge:null},{icon:Mf,label:"Отзывы гостей",href:"/reviews",badge:null},{icon:Pf,label:"Поставщики",href:"/suppliers",badge:null}]'
);

replaceExact(
  "переходы быстрого добавления в финансах",
  'S.useEffect(()=>{const Re=new URLSearchParams(t),ot=Re.get("repairEquipmentId");if(Re.get("closeShift")==="1"){N("revenue"),A(void 0),_("revenue");return}ot&&(N("expenses"),L(ot),O(void 0),_("expense"))},[t]);',
  'S.useEffect(()=>{const Re=new URLSearchParams(t),ot=Re.get("repairEquipmentId");if(Re.get("closeShift")==="1"){N("revenue"),A(void 0),_("revenue");return}if(Re.get("addExpense")==="1"){N("expenses"),L(void 0),O(void 0),_("expense");return}if(Re.get("tab")==="shifts"){N("revenue");return}ot&&(N("expenses"),L(ot),O(void 0),_("expense"))},[t]);'
);

replaceExact(
  "План внутри поручений",
  'i.jsx("div",{className:"px-6 mb-4",children:i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Поручения"})})',
  'i.jsxs("div",{className:"px-6 mb-4 flex items-center justify-between gap-3",children:[i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Поручения"}),i.jsxs(Zl,{href:"/decisions",className:"min-h-10 rounded-xl bg-primary/8 px-3 flex items-center gap-1.5 text-[12px] font-bold text-primary",children:["План действий",i.jsx(Br,{size:14})]})]})'
);

replaceRange(
  "AI-анализ внутри главной",
  "function bdHomeFreshAi",
  "function bdHomeDaily",
  `function bdHomeFreshAi({diagnosis:e,health:t,latestDataAt:n,onNavigate:r}){const a=!!e&&t.hasEnoughData&&t.coveragePercent>=60&&Number(e.cachedAt||0)>=n,s=a?(e.data?.topPriority?.title||e.data?.summary):null;return i.jsxs("section",{"data-bd-home-ai":"inside-home-v22",className:"rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 overflow-hidden",children:[i.jsxs("div",{className:"flex items-start gap-3",children:[i.jsx("span",{className:"w-10 h-10 rounded-[14px] bg-indigo-600 text-white flex items-center justify-center text-[12px] font-black shrink-0",children:"AI"}),i.jsxs("span",{style:{flex:1,minWidth:0},children:[i.jsx("span",{className:"block text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-500",children:a?"Актуальная AI-рекомендация":"AI-анализ"}),i.jsx("span",{className:"block text-[13.5px] font-bold text-slate-950 mt-1 leading-snug",style:{overflowWrap:"anywhere"},children:s||"Диагностика заведения, приоритеты и рекомендации на основе ваших данных."})]})]}),i.jsxs("div",{className:"grid grid-cols-2 gap-2 mt-4",children:[i.jsxs("button",{type:"button",onClick:()=>r("/analysis"),className:"min-h-11 rounded-[14px] bg-indigo-600 text-white px-3 text-[12px] font-bold flex items-center justify-center gap-1",children:["Открыть анализ",i.jsx(Br,{size:14})]}),i.jsxs("button",{type:"button",onClick:()=>r("/market"),className:"min-h-11 rounded-[14px] bg-white border border-indigo-100 text-indigo-700 px-3 text-[12px] font-bold flex items-center justify-center gap-1",children:["Рынок рядом",i.jsx(Br,{size:14})]})]})]})}
`
);

fs.writeFileSync(bundlePath, source);
console.log("Stage 5 navigation patch applied");
