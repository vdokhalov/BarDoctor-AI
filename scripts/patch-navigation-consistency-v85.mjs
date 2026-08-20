import fs from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let source = fs.readFileSync(bundlePath, "utf8");
let replacements = 0;

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Navigation patch target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Navigation patch target is not unique: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
  replacements += 1;
}

replaceOnce(
  "remove Warehouse from primary navigation",
  '    {key:"warehouse",name:"Склад",href:"/warehouse",icon:PA},\n',
  '',
);

replaceOnce(
  "treat Warehouse as a Finance child",
  'm.key==="finance"?e.startsWith("/finance")&&!e.startsWith("/finance/shift/")||["/salaries","/reports"].some(g=>e===g||e.startsWith(g+"/")):\n      m.key==="warehouse"?e==="/warehouse"||e.startsWith("/warehouse/"):',
  'm.key==="finance"?e.startsWith("/finance")&&!e.startsWith("/finance/shift/")||["/salaries","/reports","/warehouse"].some(g=>e===g||e.startsWith(g+"/")):',
);

replaceOnce(
  "six-column primary navigation",
  'gridTemplateColumns:"repeat(7,minmax(0,1fr))"',
  'gridTemplateColumns:"repeat(6,minmax(0,1fr))"',
);

replaceOnce(
  "context-aware accounting header",
  'function bdAccountingHeader({title:e,back:t="/more",right:n}){const[,r]=bt();return i.jsxs("div",{className:"sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center gap-3",children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>r(t),className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 text-[20px]",children:"←"}),i.jsx("h1",{className:"text-[20px] font-black text-foreground tracking-tight flex-1",children:e}),n]})}',
  'function bdAccountingHeader({title:e,back:t="/more",right:n}){return i.jsxs("div",{className:"sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center gap-3",children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>window.bdNavigateBack(t),className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 text-[20px]",children:"←"}),i.jsx("h1",{className:"text-[20px] font-black text-foreground tracking-tight flex-1",children:e}),n]})}',
);

replaceOnce(
  "Shifts is a top-level section",
  'i.jsx("button",{type:"button",onClick:()=>navigate("/home"),"aria-label":"Назад",className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95",children:i.jsx(js,{size:16,className:"text-foreground"})}),',
  '',
);

replaceOnce(
  "Finance is a top-level section",
  'i.jsx("button",{type:"button",onClick:()=>e("/home"),"aria-label":"Назад",className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95",children:i.jsx(js,{size:16,className:"text-foreground"})}),',
  '',
);

replaceOnce(
  "Warehouse logical parent",
  'bdAccountingHeader,{title:"Склад",right:',
  'bdAccountingHeader,{title:"Склад",back:"/finance",right:',
);
replaceOnce(
  "Reports logical parent",
  'bdAccountingHeader,{title:"Месячный отчёт",right:',
  'bdAccountingHeader,{title:"Месячный отчёт",back:"/finance",right:',
);
replaceOnce(
  "Salaries logical parent",
  'bdAccountingHeader,{title:"Зарплаты",right:',
  'bdAccountingHeader,{title:"Зарплаты",back:"/finance",right:',
);

replaceOnce(
  "safe generic back hook",
  'function GCe(){const[e,t]=bt(),n=S.useCallback(a=>{t(a)},[t]),r=S.useCallback(()=>{window.history.back()},[]);return{location:e,navigate:n,goBack:r}}',
  'function GCe(){const[e,t]=bt(),n=S.useCallback(a=>{t(a)},[t]),r=S.useCallback(()=>{window.bdNavigateBack(window.bdLogicalParentRoute())},[]);return{location:e,navigate:n,goBack:r}}',
);

replaceOnce(
  "accessible shared header Back",
  't&&i.jsx("button",{onClick:a||s,className:"w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted/80 transition-colors",children:i.jsx(Nn,{className:"w-[22px] h-[22px] text-foreground"})})',
  't&&i.jsx("button",{type:"button","aria-label":"Назад",onClick:a||s,className:"w-11 h-11 -ml-2.5 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted/80 transition-colors",children:i.jsx(Nn,{className:"w-[22px] h-[22px] text-foreground"})})',
);

replaceOnce(
  "Profile Back",
  'i.jsx(WCe,{title:"Профиль"})',
  'i.jsx(WCe,{title:"Профиль",showBack:!0,onBack:()=>window.bdNavigateBack("/more")})',
);

replaceOnce(
  "Payroll rules Back",
  'children:[i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Правила оплаты"}),i.jsx("button",{type:"button",onClick:()=>{j(null),g(!0)},"aria-label":"Добавить правило оплаты"',
  'children:[i.jsxs("div",{className:"flex items-center gap-2",children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>window.bdNavigateBack("/salaries"),className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95",children:i.jsx(Nn,{size:18})}),i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Правила оплаты"})]}),i.jsx("button",{type:"button",onClick:()=>{j(null),g(!0)},"aria-label":"Добавить правило оплаты"',
);

replaceOnce(
  "AI diagnosis Back",
  'children:[i.jsxs("div",{className:"flex items-center gap-2.5",children:[i.jsx("div",{className:"w-7 h-7 rounded-full flex items-center justify-center",style:{background:"linear-gradient(135deg, #5B5CEB, #4A4BC9)"},children:i.jsx(yo,{size:13,className:"text-white"})}),i.jsx("h1",{className:"text-[17px] font-black text-foreground tracking-tight",children:"AI Доктор"})]}),v==="ready"',
  'children:[i.jsxs("div",{className:"flex items-center gap-2.5",children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>window.bdNavigateBack("/home"),className:"w-11 h-11 -ml-2 rounded-full bg-card border border-border flex items-center justify-center active:scale-95",children:i.jsx(Nn,{size:18})}),i.jsx("div",{className:"w-7 h-7 rounded-full flex items-center justify-center",style:{background:"linear-gradient(135deg, #5B5CEB, #4A4BC9)"},children:i.jsx(yo,{size:13,className:"text-white"})}),i.jsx("h1",{className:"text-[17px] font-black text-foreground tracking-tight",children:"AI Доктор"})]}),v==="ready"',
);

fs.writeFileSync(bundlePath, source);
console.log(`Applied ${replacements} navigation bundle replacements.`);
