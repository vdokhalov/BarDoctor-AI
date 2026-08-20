import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('className:"bd-finance-quick-add-details"')) {
  console.log("Native Finance Quick Add v161 is already applied.");
  process.exit(0);
}

const oldTrigger = String.raw`canManageFinance&&i.jsxs("button",{type:"button",className:"bd-finance-quick-add-fab",onClick:()=>setQuickAddOpen(e=>!e),"aria-label":quickAddOpen?"Закрыть быстрые финансовые действия":"Открыть быстрые финансовые действия",title:"Быстрые финансовые действия",children:[i.jsx("span",{children:"Быстрые финансовые действия"}),i.jsx(Vt,{size:20,"aria-hidden":!0})]})`;
const newTrigger = String.raw`canManageFinance&&i.jsxs("details",{className:"bd-finance-quick-add-details",children:[i.jsxs("summary",{className:"bd-finance-quick-add-fab","aria-label":"Открыть быстрые финансовые действия",title:"Быстрые финансовые действия",children:[i.jsx("span",{children:"Быстрые финансовые действия"}),i.jsx(Vt,{size:20,"aria-hidden":!0})]}),i.jsx("button",{type:"button",className:"bd-finance-quick-add-backdrop",onClick:()=>document.querySelector(".bd-finance-quick-add-details")?.removeAttribute("open"),"aria-label":"Закрыть быстрые финансовые действия"}),i.jsxs("div",{className:"bd-finance-quick-add-menu",role:"menu","aria-label":"Быстрые финансовые действия",children:[i.jsx("strong",{children:"Быстрые финансовые действия"}),i.jsx("button",{type:"button",role:"menuitem",onClick:()=>{document.querySelector(".bd-finance-quick-add-details")?.removeAttribute("open"),openRevenueAdd()},children:"Закрыть смену / внести выручку"}),i.jsx("button",{type:"button",role:"menuitem",onClick:()=>{document.querySelector(".bd-finance-quick-add-details")?.removeAttribute("open"),openExpenseAdd()},children:"Добавить расход"})]})]})`;
const accessibleTrigger = newTrigger.replace(
  'i.jsxs("summary",{className:',
  'i.jsxs("summary",{role:"button",className:',
);
const oldFloating = String.raw`canManageFinance&&quickAddOpen&&i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"bd-finance-quick-add-backdrop",onClick:()=>setQuickAddOpen(!1),"aria-label":"Закрыть быстрые финансовые действия"}),i.jsxs("div",{className:"bd-finance-quick-add-menu",role:"dialog","aria-modal":!0,"aria-label":"Быстрые финансовые действия",children:[i.jsx("strong",{children:"Быстрые финансовые действия"}),i.jsx("button",{type:"button",onClick:openRevenueAdd,children:"Закрыть смену / внести выручку"}),i.jsx("button",{type:"button",onClick:openExpenseAdd,children:"Добавить расход"})]})]})`;

if (!source.includes(oldTrigger)) {
  throw new Error("Finance Quick Add trigger was not found for native v161.");
}
if (!source.includes(oldFloating)) {
  throw new Error("Finance Quick Add floating menu was not found for native v161.");
}

source = source.replace(oldTrigger, accessibleTrigger).replace(oldFloating, "null");
await writeFile(bundlePath, source);
console.log("Native Finance Quick Add v161 applied.");
