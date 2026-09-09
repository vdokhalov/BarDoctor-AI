import fs from "node:fs";
import "./patch-phase5-receipt-cost.mjs";
const file = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(file, "utf8");
const marker = '"data-bd-opening-phase5"';
if (!source.includes(marker)) {
  const anchor = 'i.jsx(bdAccountingHeader,{title:"Склад",back:"/more",right:i.jsx("button",{type:"button",onClick:()=>e("/finance/settings"),className:"text-[13px] font-bold text-primary",children:"Настройки"})}),';
  if (source.split(anchor).length !== 2) throw new Error("Phase 5: unique warehouse header required");
  source = source.replace(anchor, anchor + 'z&&i.jsx("button",{"data-bd-opening-phase5":!0,type:"button",className:"mx-4 my-2 rounded-xl border px-4 py-3 text-sm font-semibold",onClick:()=>window.location.assign("/inventory-onboarding"),children:"Начальные остатки / импорт"}),');
}
const movement = 'function bdWarehouseMovementMeta(e){return ';
if (!source.includes('label:"Начальный остаток"')) {
  if (source.split(movement).length !== 2) throw new Error("Phase 5: movement presentation anchor required");
  source = source.replace(movement, movement + 'e==="opening_balance"?{label:"Начальный остаток",color:"#059669",sign:"+"}:');
}
// Sales entry is a server-rendered document, absent from the legacy SPA router.
// Keep the embedded navigation bridge, but hand this one route to the browser.
const salesNavigation = 'if(h.pathname==="/sales-entry"){';
if (!source.includes(salesNavigation)) {
  const anchor = '    t(h.pathname+h.search+h.hash)';
  if (source.split(anchor).length !== 2) throw new Error("Phase 5: unique embedded navigation anchor required");
  source = source.replace(anchor, `    ${salesNavigation}
      const venue=new URL(window.location.href).searchParams.get("venue");
      if(venue&&!h.searchParams.has("venue"))h.searchParams.set("venue",venue);
      h.searchParams.delete("embedded");
      window.location.assign(h.pathname+h.search+h.hash);
      return
    }
${anchor}`);
}
fs.writeFileSync(file, source);
console.log("Phase 5 onboarding entry and opening movement label applied");
