import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('className:"bd-finance-header-actions"')) {
  console.log("Finance header Quick Add v161 is already applied.");
  process.exit(0);
}

const oldHeader = String.raw`i.jsxs("header",{className:"bd-finance-header-v160",children:[i.jsxs("div",{children:[i.jsx("h1",{children:"Финансы"}),i.jsxs("p",{children:[profile?.name||"Заведение"," · ",Jl(selected.year,selected.month)]})]}),i.jsx("div",{"data-bd-venue-host":"finance-v160",className:"bd-finance-venue-host"})]})`;
const newHeader = String.raw`i.jsxs("header",{className:"bd-finance-header-v160",children:[i.jsxs("div",{children:[i.jsx("h1",{children:"Финансы"}),i.jsxs("p",{children:[profile?.name||"Заведение"," · ",Jl(selected.year,selected.month)]})]}),i.jsxs("div",{className:"bd-finance-header-actions",children:[i.jsx("div",{"data-bd-venue-host":"finance-v160",className:"bd-finance-venue-host"}),canManageFinance&&i.jsxs("button",{type:"button",className:"bd-finance-quick-add-fab",onClick:()=>setQuickAddOpen(e=>!e),"aria-label":quickAddOpen?"Закрыть быстрые финансовые действия":"Открыть быстрые финансовые действия",title:"Быстрые финансовые действия",children:[i.jsx("span",{children:"Быстрые финансовые действия"}),i.jsx(Vt,{size:20,"aria-hidden":!0})]})]})]})`;

const oldFloating = String.raw`canManageFinance&&i.jsxs(i.Fragment,{children:[quickAddOpen&&i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"bd-finance-quick-add-backdrop",onClick:()=>setQuickAddOpen(!1),"aria-label":"Закрыть быстрое добавление"}),i.jsxs("div",{className:"bd-finance-quick-add-menu",role:"dialog","aria-modal":!0,"aria-label":"Быстрое добавление",children:[i.jsx("strong",{children:"Быстрое добавление"}),i.jsx("button",{type:"button",onClick:openRevenueAdd,children:"Закрыть смену / внести выручку"}),i.jsx("button",{type:"button",onClick:openExpenseAdd,children:"Добавить расход"})]})]}),i.jsxs("button",{type:"button",className:"bd-finance-quick-add-fab",onClick:()=>setQuickAddOpen(e=>!e),"aria-label":quickAddOpen?"Закрыть быстрое добавление":"Открыть быстрое добавление",children:[i.jsx("span",{children:"Быстрое добавление"}),i.jsx(Vt,{size:22,"aria-hidden":!0})]})]})`;
const newFloating = String.raw`canManageFinance&&quickAddOpen&&i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"bd-finance-quick-add-backdrop",onClick:()=>setQuickAddOpen(!1),"aria-label":"Закрыть быстрые финансовые действия"}),i.jsxs("div",{className:"bd-finance-quick-add-menu",role:"dialog","aria-modal":!0,"aria-label":"Быстрые финансовые действия",children:[i.jsx("strong",{children:"Быстрые финансовые действия"}),i.jsx("button",{type:"button",onClick:openRevenueAdd,children:"Закрыть смену / внести выручку"}),i.jsx("button",{type:"button",onClick:openExpenseAdd,children:"Добавить расход"})]})]})`;

if (!source.includes(oldHeader)) {
  throw new Error("Finance header was not found for Quick Add v161.");
}
if (!source.includes(oldFloating)) {
  throw new Error("Floating Finance Quick Add was not found for v161.");
}

source = source.replace(oldHeader, newHeader).replace(oldFloating, newFloating);
await writeFile(bundlePath, source);
console.log("Finance header Quick Add v161 applied.");
