import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL(
  "../public/assets/index-BQGspy0I.js",
  import.meta.url,
);

let source = await readFile(bundlePath, "utf8");

const workflowMarker = 'const bdWorkflowVersion="clear-v12";';
const taskMarker = 'const bdTaskPersistenceVersion="cloud-v12";';

if (source.includes(workflowMarker) && source.includes(taskMarker)) {
  console.log("Home workflow v12 is already applied.");
  process.exit(0);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) {
    throw new Error(`Marker not found: ${search.slice(0, 220)}`);
  }
  source =
    source.slice(0, index) +
    replacement +
    source.slice(index + search.length);
}

function replaceBetween(startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Start marker not found: ${startMarker}`);
  }
  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(`End marker not found: ${endMarker}`);
  }
  source = source.slice(0, start) + replacement + source.slice(end);
}

const homeActions = String.raw`${workflowMarker}function Tce(e,t){return t===0?{headline:"Начните журнал заведения.",body:"Запишите реальное происшествие — оно останется в истории и будет учтено AI-доктором."}:e>=5&&e<12?{headline:"Проверьте готовность к открытию.",body:"Если заметили поломку, жалобу или другую проблему, зафиксируйте её и назначьте ответственного."}:e>=12&&e<16?{headline:"Сохраните важные факты смены.",body:"Записи из журнала помогают видеть повторяющиеся проблемы и принимать решения на фактах."}:e>=16&&e<21?{headline:"Проверьте, что требует решения.",body:"Происшествие можно передать сотруднику как поручение с ответственным и сроком."}:{headline:"Подведите итоги дня.",body:"Пока детали свежи, внесите ключевые происшествия — BarDoctor сохранит историю и учтёт её в анализе."}}function kce({hour:e,eventCount:t,onAdd:n}){const{headline:r,body:a}=Tce(e,t);return i.jsx("div",{className:"home-card overflow-hidden relative border-l-[3px] border-l-emerald-500",children:i.jsxs("div",{className:"px-5 py-4 pl-5",children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-2",children:"Сегодняшний приоритет"}),i.jsx("p",{className:"text-[15px] font-bold text-slate-900 leading-snug mb-1.5",children:r}),i.jsx("p",{className:"text-[13px] text-slate-500 leading-relaxed",children:a}),i.jsxs("button",{type:"button",onClick:n,className:"mt-3.5 flex items-center gap-1 text-[13px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors",children:["Записать происшествие ",i.jsx(Br,{size:14,className:"mt-px"})]})]})})}const Oce=[{label:"Происшествие",sublabel:"Сохранить факт в журнале и AI-анализе",icon:Vt,iconBg:"bg-blue-50",iconColor:"text-blue-600",href:"/add"},{label:"Поручение",sublabel:"Назначить сотрудника, срок и контроль",icon:km,iconBg:"bg-emerald-50",iconColor:"text-emerald-600",href:"/tasks?new=1"}];function Mce({onNavigate:e}){const{equipment:t}=Fr(),n=t.length>0?"/equipment":"/equipment/catalog",r=[{label:"Команда",sublabel:"Сотрудники и зарплаты",icon:zr,iconBg:"bg-amber-50",iconColor:"text-amber-600",href:"/employees"},{label:"Оборудование",sublabel:"Каталог, ремонты и ТО",icon:Dn,iconBg:"bg-red-50",iconColor:"text-red-600",href:n}];return i.jsxs("div",{className:"flex flex-col gap-3",children:[i.jsxs("div",{className:"px-1",children:[i.jsx("h2",{className:"text-[14px] font-semibold text-slate-900",children:"Что нужно сделать?"}),i.jsx("p",{className:"text-[12px] text-slate-500 mt-1",children:"Два рабочих сценария без дублирующих «дел» и «задач»."})]}),i.jsx("div",{className:"flex flex-col gap-3",children:Oce.map(a=>i.jsxs(W.button,{type:"button",onClick:()=>e(a.href),whileTap:{scale:.98},className:"home-card p-4 flex items-center gap-3.5 text-left hover:border-slate-300 transition-colors",children:[i.jsx("div",{className:"w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 "+a.iconBg,children:i.jsx(a.icon,{size:19,className:a.iconColor})}),i.jsxs("div",{className:"flex-1 min-w-0",children:[i.jsx("p",{className:"text-[15px] font-bold text-slate-900 leading-tight",children:a.label}),i.jsx("p",{className:"text-[12px] text-slate-500 mt-1 font-medium leading-snug",children:a.sublabel})]}),i.jsx(Br,{size:17,className:"text-slate-300 flex-shrink-0"})]},a.label))}),i.jsx("h3",{className:"text-[12px] font-semibold text-slate-500 px-1 pt-1",children:"Управление заведением"}),i.jsx("div",{className:"grid grid-cols-2 gap-3",children:r.map(a=>i.jsxs(W.button,{type:"button",onClick:()=>e(a.href),whileTap:{scale:.97},className:"home-card p-4 flex flex-col items-start gap-3 text-left hover:border-slate-300 transition-colors",children:[i.jsx("div",{className:"w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 "+a.iconBg,children:i.jsx(a.icon,{size:18,className:a.iconColor})}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[14px] font-bold text-slate-900 leading-tight",children:a.label}),i.jsx("p",{className:"text-[11.5px] text-slate-500 mt-1 font-medium leading-snug",children:a.sublabel})]})]},a.label))})]})}`;

replaceBetween("function Tce(e,t)", "function Pce(", homeActions);

replaceOnce(
  "function Pce({onAdd:e,onViewAll:t}){const{events:n}=Ci()",
  'function Pce({onAdd:e,onViewAll:t,onOpenEvent:bdOpenEvent}){const{events:n}=Ci()',
);

replaceOnce(
  'children:"Последние события"',
  'children:"Журнал происшествий"',
);

replaceOnce(
  "return i.jsxs(W.button,{type:\"button\",onClick:t,initial:{opacity:0,x:-8}",
  'return i.jsxs(W.button,{type:"button",onClick:()=>bdOpenEvent(s.id),initial:{opacity:0,x:-8}',
);

replaceOnce(
  'children:"Событий пока нет"',
  'children:"Журнал пока пуст"',
);

replaceOnce(
  'children:"Начните с записи первого события — это займёт меньше минуты."',
  'children:"Здесь остаётся история происшествий, которую BarDoctor использует в AI-анализе."',
);

replaceOnce(
  '[i.jsx(Vt,{size:15}),"Добавить событие"]',
  '[i.jsx(Vt,{size:15}),"Записать происшествие"]',
);

replaceOnce(
  'u&&i.jsx(W.div,{custom:3,variants:oi,initial:"hidden",animate:"show",children:i.jsx(Cce,{onViewAll:()=>a("/cases"),onNavigateCase:b=>a(`/cases/${b}`)})}),',
  "",
);

replaceOnce(
  'i.jsx(Pce,{onAdd:()=>a("/add"),onViewAll:()=>a("/events")})',
  'i.jsx(Pce,{onAdd:()=>a("/add"),onViewAll:()=>a("/events"),onOpenEvent:b=>a(`/events/${b}`)})',
);

replaceOnce(
  'children:"Анализирует реальные данные вашего ресторана — события, дела, персонал — и выдаёт операционный диагноз."',
  'children:"Анализирует реальные данные заведения — происшествия, поручения, персонал и финансы — и выдаёт операционный диагноз."',
);

replaceOnce(
  'function Goe(){return{bd_employees:Az(),',
  'function Goe(){return{bd_tasks:bdLoadTasks(),bd_employees:Az(),',
);

replaceOnce(
  'let gue=0;const yue=()=>String(++gue),vue=[];',
  `${taskMarker}const bdTasksStoreKey="bd_tasks";function bdLoadTasks(){try{const e=localStorage.getItem(Pt(bdTasksStoreKey))||Zn(bdTasksStoreKey);return e?JSON.parse(e):[]}catch{return[]}}function bdCurrentTasks(){return xr(bdTasksStoreKey)??bdLoadTasks()}function bdSaveTasks(e){return qr(bdTasksStoreKey,e)}const yue=()=>crypto.randomUUID(),vue=bdCurrentTasks();`,
);

replaceOnce(
  'function Sue({onClose:e,onAdd:t,defaultTab:n}){const{employees:bdEmployees}=_i(),bdActiveEmployees=S.useMemo(()=>bdEmployees.filter(bdEmployee=>bdEmployee.status==="active"),[bdEmployees]),[r,a]=S.useState("")',
  'function Sue({onClose:e,onAdd:t,defaultTab:n,defaultTitle:bdDefaultTitle="",defaultResponsible:bdDefaultResponsible=""}){const{employees:bdEmployees}=_i(),bdActiveEmployees=S.useMemo(()=>bdEmployees.filter(bdEmployee=>bdEmployee.status==="active"),[bdEmployees]),[r,a]=S.useState(bdDefaultTitle)',
);

replaceOnce(
  ',[f,m]=S.useState(""),h=()=>{r.trim()&&(t({title:r.trim(),category:"Общее"',
  ',[f,m]=S.useState(bdDefaultResponsible),h=()=>{r.trim()&&(t({title:r.trim(),category:"Поручение"',
);

replaceOnce(
  'children:"Новая задача"',
  'children:"Новое поручение"',
);

replaceOnce(
  'placeholder:"Что нужно сделать?"',
  'placeholder:"Что поручить сотруднику?"',
);

replaceOnce(
  'i.jsx(ke,{fullWidth:!0,onClick:h,disabled:!r.trim(),className:"mt-1",children:"Добавить задачу"})',
  'i.jsx(ke,{fullWidth:!0,onClick:h,disabled:!r.trim(),className:"mt-1",children:"Создать поручение"})',
);

replaceOnce(
  'function Aue(){const[e,t]=S.useState("today"),[n,r]=S.useState(vue),[a,s]=S.useState(!1),{toast:l}=sn()',
  'function Aue(){const bdTaskQuery=new URLSearchParams(window.location.search),[e,t]=S.useState("today"),[n,r]=S.useState(bdCurrentTasks),[a,s]=S.useState(()=>bdTaskQuery.get("new")==="1"),{toast:l}=sn();S.useEffect(()=>{bdSaveTasks(n)},[n]);const bdTaskDefaultTitle=bdTaskQuery.get("title")??"",bdTaskDefaultResponsible=bdTaskQuery.get("responsible")??""',
);

replaceOnce(
  'title:"Задача выполнена"',
  'title:"Поручение выполнено"',
);

replaceOnce(
  'title:"Задача удалена"',
  'title:"Поручение удалено"',
);

replaceOnce(
  'title:"Задача добавлена"',
  'title:"Поручение создано"',
);

replaceOnce(
  'children:"Задачи"',
  'children:"Поручения"',
);

replaceOnce(
  'i.jsx("span",{className:"text-[14px] font-semibold tracking-tight",children:"Добавить задачу"})',
  'i.jsx("span",{className:"text-[14px] font-semibold tracking-tight",children:"Новое поручение"})',
);

replaceOnce(
  'i.jsx(Sue,{onClose:()=>s(!1),onAdd:h,defaultTab:e},"add-sheet")',
  'i.jsx(Sue,{onClose:()=>s(!1),onAdd:h,defaultTab:e,defaultTitle:bdTaskDefaultTitle,defaultResponsible:bdTaskDefaultResponsible},"add-sheet")',
);

replaceOnce(
  'children:"Событие не найдено"',
  'children:"Запись не найдена"',
);

replaceOnce(
  'children:"Вернуться к событиям"',
  'children:"Вернуться в журнал"',
);

replaceOnce(
  'title:"Событие удалено"',
  'title:"Запись удалена"',
);

replaceOnce(
  'i.jsxs("button",{type:"button",onClick:()=>y(!0),className:"w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-primary/30 bg-primary/6 text-primary text-[14px] font-semibold transition-all hover:bg-primary/10 active:scale-[0.98]",children:[i.jsx(Pr,{size:15}),v.aiAssessment?"Переоценить приоритет AI":"Оценить приоритет AI"]})',
  'i.jsxs("button",{type:"button",onClick:()=>t(`/tasks?new=1&title=${encodeURIComponent(`Разобраться: ${v.title}`)}&responsible=${encodeURIComponent(v.responsible||"")}`),className:"w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-white text-[14px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]",children:[i.jsx(km,{size:15}),"Создать поручение по этой записи"]}),i.jsxs("button",{type:"button",onClick:()=>y(!0),className:"w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-primary/30 bg-primary/6 text-primary text-[14px] font-semibold transition-all hover:bg-primary/10 active:scale-[0.98]",children:[i.jsx(Pr,{size:15}),v.aiAssessment?"Переоценить приоритет AI":"Оценить приоритет AI"]})',
);

replaceOnce(
  'd===1?"Нажмите ещё раз для подтверждения":"Удалить событие"',
  'd===1?"Нажмите ещё раз для подтверждения":"Удалить запись"',
);

const eventListStart = source.indexOf("function pue(");
const eventListEnd = source.indexOf("const mue=", eventListStart);
if (eventListStart === -1 || eventListEnd === -1) {
  throw new Error("Event journal section not found.");
}
const eventList = source
  .slice(eventListStart, eventListEnd)
  .replaceAll("Нет событий по фильтру", "Нет записей по фильтру")
  .replaceAll("Событий пока нет", "Журнал пока пуст")
  .replaceAll(
    "Начните фиксировать события ресторана — каждая запись помогает AI понять ваш бизнес.",
    "Фиксируйте реальные происшествия — журнал сохраняет историю и помогает AI находить повторяющиеся проблемы.",
  )
  .replaceAll("Добавить первое событие", "Записать происшествие")
  .replaceAll('children:"События"', 'children:"Журнал происшествий"')
  .replaceAll("Поиск по событиям…", "Поиск по журналу…");
source = source.slice(0, eventListStart) + eventList + source.slice(eventListEnd);

await writeFile(bundlePath, source);
console.log("Home workflow is clear and assignments now persist across sessions.");
