import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-recurring-settings":"clear"')) {
  console.log("Finance discoverability patch is already applied.");
  process.exit(0);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) {
    throw new Error("Marker not found: " + search.slice(0, 180));
  }
  source =
    source.slice(0, index) + replacement + source.slice(index + search.length);
}

replaceOnce(
  'function bdWarehousePage(){const[,e]=bt(),{profile:t}=Un()',
  'function bdWarehousePage(){const[,e]=bt(),o=ste(),{profile:t}=Un()',
);
replaceOnce(
  '[h,g]=S.useState({open:!1,initial:null}),[y,j]=S.useState(!1),v=[...u]',
  '[h,g]=S.useState(()=>({open:new URLSearchParams(o).get("add")==="inventory",initial:null})),[y,j]=S.useState(!1),v=[...u]',
);

const editorStart = source.indexOf("function bdRecurringSettingsEditor(");
const editorEnd = source.indexOf("function bdFinanceSettingsPage()", editorStart);
if (editorStart === -1 || editorEnd === -1) {
  throw new Error("Recurring settings editor markers were not found.");
}
const recurringEditor = 'function bdRecurringSettingsEditor({title:e,value:t,onChange:n,id:r}){const a=t.mode==="manual"?"Добавляйте каждый платёж как расход в категории «"+e+"».":t.mode==="fixed"?"Месячная сумма будет равномерно распределена по всем плановым сменам.":"Сумма будет рассчитана как процент от выручки месяца.";return i.jsxs("div",{"data-bd-recurring-settings":"clear",id:r,className:"bg-card rounded-2xl border border-card-border p-4 flex flex-col gap-3",style:{scrollMarginTop:90},children:[i.jsx("p",{className:"text-[15px] font-black",children:e}),e==="Коммунальные услуги"&&i.jsx("p",{className:"text-[12px] text-foreground/70 leading-relaxed",children:"Чтобы указать постоянную месячную сумму, выберите «Фиксированная сумма за месяц» — поле для суммы появится ниже."}),i.jsxs("div",{children:[i.jsx(bdFieldLabel,{children:"Способ внесения"}),i.jsxs("select",{value:t.mode,onChange:s=>n({...t,mode:s.target.value}),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4",children:[i.jsx("option",{value:"fixed",children:"Фиксированная сумма за месяц"}),i.jsx("option",{value:"manual",children:"Вносить каждый платёж отдельно"}),i.jsx("option",{value:"percent",children:"Процент от выручки"})]})]}),t.mode==="fixed"&&i.jsxs("div",{children:[i.jsx(bdFieldLabel,{children:e+" — сумма за месяц (₽)"}),i.jsx("input",{type:"number",inputMode:"decimal",min:"0",value:t.amount??0,onChange:s=>n({...t,amount:Number(s.target.value)||0}),placeholder:"0",className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4 text-[16px] font-bold"})]}),t.mode==="percent"&&i.jsxs("div",{children:[i.jsx(bdFieldLabel,{children:"Процент от выручки"}),i.jsx("input",{type:"number",inputMode:"decimal",min:"0",step:"0.1",value:t.percent??0,onChange:s=>n({...t,percent:Number(s.target.value)||0}),className:"w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl px-4"})]}),i.jsx("p",{className:"text-[12px] text-muted-foreground leading-relaxed",children:a})]})}\n';
source =
  source.slice(0, editorStart) + recurringEditor + source.slice(editorEnd);

replaceOnce(
  'function bdFinanceSettingsPage(){const[,e]=bt(),{profile:t}=Un()',
  'function bdFinanceSettingsPage(){const[,e]=bt(),o=ste(),{profile:t}=Un()',
);
replaceOnce(
  'g(r.taxModel),j(r.utilityModel)},[r.updatedAt]);function v(){',
  'g(r.taxModel),j(r.utilityModel)},[r.updatedAt]);S.useEffect(()=>{new URLSearchParams(o).get("section")==="utilities"&&setTimeout(()=>document.getElementById("bd-utilities-settings")?.scrollIntoView({behavior:"smooth",block:"start"}),120)},[o]);function v(){',
);
replaceOnce(
  'i.jsx(bdRecurringSettingsEditor,{title:"Налоги",value:h,onChange:g}),i.jsx(bdRecurringSettingsEditor,{title:"Коммунальные услуги",value:y,onChange:j})',
  'i.jsx(bdRecurringSettingsEditor,{id:"bd-tax-settings",title:"Налоги",value:h,onChange:g}),i.jsx(bdRecurringSettingsEditor,{id:"bd-utilities-settings",title:"Коммунальные услуги",value:y,onChange:j})',
);
replaceOnce(
  'children:"Разделяйте названия запятыми. Например: Бар, Кухня, Кальяны. Для точного месячного отчёта нужен снимок остатков на границе месяца."})]})]}),i.jsx(bdRecurringSettingsEditor',
  'children:"Разделяйте названия запятыми. Например: Бар, Кухня, Кальяны. Для точного месячного отчёта нужен снимок остатков на границе месяца."})]}),i.jsx("button",{type:"button",onClick:()=>e("/warehouse?add=inventory"),className:"w-full h-11 rounded-2xl bg-primary/10 text-primary text-[14px] font-bold",children:"Внести суммы остатков"})]}),i.jsx(bdRecurringSettingsEditor',
);

replaceOnce(
  'className:"px-6 pt-3 grid grid-cols-2 gap-2",children:[i.jsx("button",{type:"button",onClick:()=>e("/salaries"),className:"h-10 rounded-2xl bg-card border border-border text-[12px] font-bold",children:"Зарплаты"}),i.jsx("button",{type:"button",onClick:()=>e("/warehouse"),className:"h-10 rounded-2xl bg-card border border-border text-[12px] font-bold",children:"Остатки"}),i.jsx("button",{type:"button",onClick:()=>e("/reports"),className:"h-10 rounded-2xl bg-card border border-border text-[12px] font-bold",children:"Отчёт"}),i.jsx("button",{type:"button",onClick:()=>e("/finance/settings"),className:"h-10 rounded-2xl bg-card border border-border text-[12px] font-bold",children:"Настройки"})]',
  'className:"px-6 pt-3 grid grid-cols-2 gap-2",children:[i.jsx("button",{type:"button",onClick:()=>e("/warehouse?add=inventory"),className:"h-14 rounded-2xl bg-card border border-border text-[12px] leading-tight px-2 font-bold",children:"Внести остатки"}),i.jsx("button",{type:"button",onClick:()=>e("/finance/settings?section=utilities"),className:"h-14 rounded-2xl bg-card border border-border text-[12px] leading-tight px-2 font-bold",children:"Коммунальные услуги"}),i.jsx("button",{type:"button",onClick:()=>e("/salaries"),className:"h-14 rounded-2xl bg-card border border-border text-[12px] leading-tight px-2 font-bold",children:"Зарплаты"}),i.jsx("button",{type:"button",onClick:()=>e("/reports"),className:"h-14 rounded-2xl bg-card border border-border text-[12px] leading-tight px-2 font-bold",children:"Месячный отчёт"})]',
);

source = source
  .split("Коммунальные · ")
  .join("Коммунальные услуги · ")
  .split("Налоги и коммуналка по сменам")
  .join("Налоги и коммунальные услуги по сменам")
  .split("Сумма налогов и коммуналки распределяется")
  .join("Сумма налогов и коммунальных услуг распределяется");

await writeFile(bundlePath, source);
console.log("Finance discoverability patch applied.");
