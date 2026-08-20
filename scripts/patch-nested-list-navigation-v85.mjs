import fs from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let source = fs.readFileSync(bundlePath, "utf8");
let replacements = 0;

function replaceAfter(label, anchor, before, after, range = 22000) {
  const start = source.indexOf(anchor);
  if (start < 0) throw new Error(`Nested-list anchor not found: ${label}`);
  const first = source.indexOf(before, start);
  if (first < 0 || first > start + range) throw new Error(`Nested-list target not found: ${label}`);
  const second = source.indexOf(before, first + before.length);
  if (second >= 0 && second <= start + range) throw new Error(`Nested-list target not unique: ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
  replacements += 1;
}

replaceAfter(
  "equipment list context from URL",
  "function kue()",
  '[a,s]=S.useState(""),[l,u]=S.useState("all"),[d,f]=S.useState(!1),[m,h]=S.useState(!1),g=',
  '[a,s]=S.useState(()=>window.bdReadNavigationQuery("q","")),[l,u]=S.useState(()=>window.bdReadNavigationQuery("category","all")),[d,f]=S.useState(!1),[m,h]=S.useState(()=>window.bdReadNavigationQuery("archived","")==="1"),bdEquipmentNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({q:a||null,category:l==="all"?null:l,archived:m?"1":null})},[a,l,m]),g=',
);
replaceAfter(
  "equipment list Back",
  "function kue()",
  'children:[i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Оборудование"}),i.jsxs("div",{className:"flex items-center gap-2 flex-shrink-0"',
  'children:[i.jsxs("div",{className:"flex items-center gap-2 min-w-0",children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>window.bdNavigateBack("/more"),className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 flex-shrink-0",children:i.jsx(Nn,{size:18})}),i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Оборудование"})]}),i.jsxs("div",{className:"flex items-center gap-2 flex-shrink-0"',
);

replaceAfter(
  "tasks tab context",
  "function Aue()",
  '[bdEditingId,bdSetEditingId]=S.useState(null),{toast:l}=sn()',
  '[bdEditingId,bdSetEditingId]=S.useState(null),bdTasksNavigationContext=S.useEffect(()=>{window.bdSyncNavigationQuery({tab:e,new:a?"1":null})},[e,a]),{toast:l}=sn()',
);
replaceAfter(
  "tasks list Back",
  "function Aue()",
  'children:i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Поручения"})',
  'children:i.jsxs("div",{className:"flex items-center gap-2",children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>window.bdNavigateBack("/employees"),className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95",children:i.jsx(Nn,{size:18})}),i.jsx("h1",{className:"text-[22px] font-bold text-foreground tracking-tight",children:"Поручения"})]})',
);

replaceAfter(
  "events list Back",
  "function hue()",
  'children:[i.jsxs("div",{children:[i.jsx("h1",{className:"text-[24px] font-black text-foreground tracking-tight",children:"Журнал происшествий"})',
  'children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>window.bdNavigateBack("/home"),className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 flex-shrink-0",children:i.jsx(Nn,{size:18})}),i.jsxs("div",{className:"flex-1 min-w-0",children:[i.jsx("h1",{className:"text-[24px] font-black text-foreground tracking-tight",children:"Журнал происшествий"})',
);

replaceAfter(
  "cases list Back",
  "function _Ce()",
  'children:[i.jsxs("div",{children:[i.jsx("h1",{className:"text-[24px] font-black text-foreground tracking-tight",children:"Дела"})',
  'children:[i.jsx("button",{type:"button","aria-label":"Назад",onClick:()=>window.bdNavigateBack("/home"),className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 flex-shrink-0",children:i.jsx(Nn,{size:18})}),i.jsxs("div",{className:"flex-1 min-w-0",children:[i.jsx("h1",{className:"text-[24px] font-black text-foreground tracking-tight",children:"Дела"})',
);

fs.writeFileSync(bundlePath, source);
console.log(`Applied ${replacements} nested-list navigation replacements.`);
