import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL(
  "../public/assets/index-BQGspy0I.js",
  import.meta.url,
);

let source = await readFile(bundlePath, "utf8");

const versionMarker = 'const bdEmployeeSelectorsVersion="team-v11";';

if (source.includes(versionMarker)) {
  console.log("Employee selectors v11 are already applied.");
  process.exit(0);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) {
    throw new Error(`Marker not found: ${search.slice(0, 200)}`);
  }
  source =
    source.slice(0, index) +
    replacement +
    source.slice(index + search.length);
}

replaceOnce(
  "function Sue({onClose:e,onAdd:t,defaultTab:n}){const[r,a]=S.useState(\"\")",
  `${versionMarker}function Sue({onClose:e,onAdd:t,defaultTab:n}){const{employees:bdEmployees}=_i(),bdActiveEmployees=S.useMemo(()=>bdEmployees.filter(bdEmployee=>bdEmployee.status===\"active\"),[bdEmployees]),[r,a]=S.useState(\"\")`,
);

replaceOnce(
  'i.jsx(ze,{label:"Ответственный",placeholder:"Имя сотрудника",value:f,onChange:g=>m(g.target.value)})',
  'i.jsxs("div",{className:"w-full flex flex-col",children:[i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:"Ответственный"}),i.jsxs("select",{value:f,onChange:g=>m(g.target.value),className:"h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all",children:[i.jsx("option",{value:"",children:"Без ответственного"}),...bdActiveEmployees.map(g=>i.jsxs("option",{value:g.name,children:[g.name," · ",jo(g)]},g.id))]}),bdActiveEmployees.length===0&&i.jsx("p",{className:"text-[11.5px] text-muted-foreground mt-1.5",children:"Сначала добавьте сотрудников в разделе «Сотрудники»."})]})',
);

replaceOnce(
  'function eCe(){const[,e]=$f("/equipment/:id/history/new"),[,t]=bt(),{equipment:n,updateEquipment:r}=Fr(),{addHistoryEntry:a}=Ns(),{toast:s}=sn(),l=e?.id??""',
  'function eCe(){const[,e]=$f("/equipment/:id/history/new"),[,t]=bt(),{equipment:n,updateEquipment:r}=Fr(),{addHistoryEntry:a}=Ns(),{toast:s}=sn(),{employees:bdEmployees}=_i(),bdActiveEmployees=S.useMemo(()=>bdEmployees.filter(bdEmployee=>bdEmployee.status==="active"),[bdEmployees]),l=e?.id??""',
);

replaceOnce(
  'i.jsxs("div",{className:"flex gap-3",children:[i.jsx(ze,{label:"Кто ремонтировал",placeholder:"Имя сотрудника",className:"flex-1",value:T,onChange:K=>A(K.target.value)}),i.jsx(ze,{label:"Сервисная компания",placeholder:"Необязательно",className:"flex-1",value:k,onChange:K=>O(K.target.value)})]})',
  'i.jsxs("div",{className:"grid grid-cols-1 gap-3",children:[i.jsxs("div",{className:"w-full flex flex-col",children:[i.jsx("label",{className:"text-[14px] font-semibold text-foreground mb-1.5",children:"Сотрудник заведения"}),i.jsxs("select",{value:T,onChange:K=>A(K.target.value),className:"h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all",children:[i.jsx("option",{value:"",children:"Не выбран"}),...bdActiveEmployees.map(K=>i.jsxs("option",{value:K.name,children:[K.name," · ",jo(K)]},K.id))]})]}),i.jsx(ze,{label:"Сервисная компания",placeholder:"Если ремонт выполняла внешняя компания",value:k,onChange:K=>O(K.target.value)})]})',
);

replaceOnce(
  'function MCe({type:e,onSaved:t,onBack:n}){const{addCase:r}=za(),{toast:a}=sn(),s=ka[e]',
  'function MCe({type:e,onSaved:t,onBack:n}){const{addCase:r}=za(),{toast:a}=sn(),{employees:bdEmployees}=_i(),bdActiveEmployees=S.useMemo(()=>bdEmployees.filter(bdEmployee=>bdEmployee.status==="active"),[bdEmployees]),s=ka[e]',
);

replaceOnce(
  'i.jsxs("div",{children:[i.jsx(xd,{children:"Ответственный"}),i.jsx(KI,{placeholder:"Имя сотрудника или роль",value:h,onChange:g})]})',
  'i.jsxs("div",{children:[i.jsx(xd,{children:"Ответственный"}),i.jsxs("select",{value:h,onChange:A=>g(A.target.value),className:"w-full h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all",children:[i.jsx("option",{value:"",children:"Пока не назначен"}),...bdActiveEmployees.map(A=>i.jsxs("option",{value:A.name,children:[A.name," · ",jo(A)]},A.id))]}),bdActiveEmployees.length===0&&i.jsx("p",{className:"text-[11.5px] text-muted-foreground mt-1.5",children:"Нет активных сотрудников для назначения."})]})',
);

replaceOnce(
  'function LCe({c:e,onClose:t,onSave:n}){const[r,a]=S.useState(e.title)',
  'function LCe({c:e,onClose:t,onSave:n}){const{employees:bdEmployees}=_i(),bdActiveEmployees=S.useMemo(()=>bdEmployees.filter(bdEmployee=>bdEmployee.status==="active"),[bdEmployees]),[r,a]=S.useState(e.title)',
);

replaceOnce(
  'i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Ответственный"}),i.jsx("input",{type:"text",value:f,onChange:j=>m(j.target.value),placeholder:"Имя или должность",className:"bd-field-input"})]})',
  'i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Ответственный"}),i.jsxs("select",{value:f,onChange:j=>m(j.target.value),className:"bd-field-input",children:[i.jsx("option",{value:"",children:"Пока не назначен"}),f&&!bdActiveEmployees.some(j=>j.name===f)&&i.jsx("option",{value:f,children:f}),...bdActiveEmployees.map(j=>i.jsxs("option",{value:j.name,children:[j.name," · ",jo(j)]},j.id))]})]})',
);

replaceOnce(
  'function VCe({ev:e,onClose:t,onSave:n}){const[r,a]=S.useState(e.title)',
  'function VCe({ev:e,onClose:t,onSave:n}){const{employees:bdEmployees}=_i(),bdActiveEmployees=S.useMemo(()=>bdEmployees.filter(bdEmployee=>bdEmployee.status==="active"),[bdEmployees]),[r,a]=S.useState(e.title)',
);

replaceOnce(
  'i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Ответственный"}),i.jsx("input",{type:"text",value:u,onChange:y=>d(y.target.value),placeholder:"Имя или должность",className:"bd-field-input"})]})',
  'i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Ответственный"}),i.jsxs("select",{value:u,onChange:y=>d(y.target.value),className:"bd-field-input",children:[i.jsx("option",{value:"",children:"Пока не назначен"}),u&&!bdActiveEmployees.some(y=>y.name===u)&&i.jsx("option",{value:u,children:u}),...bdActiveEmployees.map(y=>i.jsxs("option",{value:y.name,children:[y.name," · ",jo(y)]},y.id))]})]})',
);

replaceOnce(
  'extraLabel:"Участники",extraPlaceholder:"Имена сотрудников или гостей"',
  'extraLabel:"Другой участник",extraPlaceholder:"Гость или другая сторона"',
);

await writeFile(bundlePath, source);
console.log("Employee references now use the venue team catalog.");
