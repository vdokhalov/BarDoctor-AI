import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceRequired(before, after, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`Expected ${expected} occurrence(s), found ${count}: ${before.slice(0, 140)}`);
  }
  source = source.split(before).join(after);
}

replaceRequired(
  'i.jsx(Xe,{path:"/reset",component:iEe}),i.jsx(Xe,{path:"/design-system",component:rEe})',
  'i.jsx(Xe,{path:"/reset",component:()=>i.jsx(cS,{to:Ot()?"/home":"/login"})}),i.jsx(Xe,{path:"/design-system",component:()=>i.jsx(cS,{to:Ot()?"/home":"/login"})})',
);

replaceRequired(
  'i.jsx("button",{type:"button",onClick:()=>e("/home"),className:"w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0",children:i.jsx(vt,',
  'i.jsx("button",{type:"button",onClick:()=>e("/home"),"aria-label":"Закрыть",className:"w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0",children:i.jsx(vt,',
);
replaceRequired(
  'i.jsx("button",{type:"button",onClick:t,className:"w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95",children:i.jsx(vt,',
  'i.jsx("button",{type:"button",onClick:t,"aria-label":"Закрыть",className:"w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95",children:i.jsx(vt,',
);
replaceRequired(
  'i.jsx("button",{type:"button",onClick:()=>e("/home"),className:"w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95",children:i.jsx(vt,',
  'i.jsx("button",{type:"button",onClick:()=>e("/home"),"aria-label":"Закрыть",className:"w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95",children:i.jsx(vt,',
);

const equipmentBackClass = "w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0";
replaceRequired(
  `i.jsx("button",{type:"button",onClick:g,className:"${equipmentBackClass}",children:i.jsx(js,`,
  `i.jsx("button",{type:"button",onClick:g,"aria-label":"Назад к оборудованию",className:"${equipmentBackClass}",children:i.jsx(js,`,
);
replaceRequired(
  `i.jsx("button",{type:"button",onClick:()=>t("/equipment"),className:"${equipmentBackClass}",children:i.jsx(js,`,
  `i.jsx("button",{type:"button",onClick:()=>t("/equipment"),"aria-label":"Назад к оборудованию",className:"${equipmentBackClass}",children:i.jsx(js,`,
);
replaceRequired(
  `i.jsx("button",{type:"button",onClick:()=>d(!0),className:"${equipmentBackClass}",children:i.jsx(rS,`,
  `i.jsx("button",{type:"button",onClick:()=>d(!0),"aria-label":"Редактировать оборудование",className:"${equipmentBackClass}",children:i.jsx(rS,`,
);
replaceRequired(
  `i.jsx("button",{type:"button",onClick:()=>t(\`/equipment/\${l}\`),className:"${equipmentBackClass}",children:i.jsx(js,`,
  `i.jsx("button",{type:"button",onClick:()=>t(\`/equipment/\${l}\`),"aria-label":"Назад к оборудованию",className:"${equipmentBackClass}",children:i.jsx(js,`,
);
replaceRequired(
  `i.jsx("button",{type:"button",onClick:()=>e("/equipment"),className:"${equipmentBackClass}",children:i.jsx(js,`,
  `i.jsx("button",{type:"button",onClick:()=>e("/equipment"),"aria-label":"Назад к оборудованию",className:"${equipmentBackClass}",children:i.jsx(js,`,
);
replaceRequired(
  `i.jsx("button",{type:"button",onClick:()=>e("/home"),className:"${equipmentBackClass}",children:i.jsx(js,`,
  `i.jsx("button",{type:"button",onClick:()=>e("/home"),"aria-label":"Назад на главную",className:"${equipmentBackClass}",children:i.jsx(js,`,
);

replaceRequired(
  'i.jsx("button",{onClick:()=>e("/health"),className:"w-9 h-9 rounded-full bg-card border border-card-border flex items-center justify-center",children:i.jsx(Nn,',
  'i.jsx("button",{type:"button",onClick:()=>e("/health"),"aria-label":"Назад к диагностике",className:"w-9 h-9 rounded-full bg-card border border-card-border flex items-center justify-center",children:i.jsx(Nn,',
);
replaceRequired(
  'i.jsx(W.button,{whileTap:{scale:.9},type:"button",onClick:()=>t("/add"),className:"w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)]",children:i.jsx(Vt,',
  'i.jsx(W.button,{whileTap:{scale:.9},type:"button",onClick:()=>t("/add"),"aria-label":"Записать происшествие",className:"w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)]",children:i.jsx(Vt,',
);
replaceRequired(
  'i.jsx(W.button,{whileTap:{scale:.9},type:"button",onClick:()=>t("/cases/add"),className:"w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)]",children:i.jsx(Vt,',
  'i.jsx(W.button,{whileTap:{scale:.9},type:"button",onClick:()=>t("/cases/add"),"aria-label":"Создать дело",className:"w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)]",children:i.jsx(Vt,',
);

replaceRequired("rc-v67", "rc-v68");

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v68");
