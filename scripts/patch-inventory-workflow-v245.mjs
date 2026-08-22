import fs from "node:fs";

const assetPath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentPath = new URL("./fragments/inventory-workflow-v245.fragment.txt", import.meta.url);
let source = fs.readFileSync(assetPath, "utf8");
const fragment = fs.readFileSync(fragmentPath, "utf8").trim();

if (source.includes("bd-inventory-sheet-v245")) {
  console.log("Inventory workflow v245 already patched");
  process.exit(0);
}

const sheetStart = source.indexOf("function bdInventoryCountSheet");
const sheetEnd = source.indexOf("function bdWriteoffSheet", sheetStart);
if (sheetStart < 0 || sheetEnd < 0) throw new Error("Inventory count sheet anchors were not found");
source = source.slice(0, sheetStart) + fragment + "\n" + source.slice(sheetEnd);

const helperStart = source.indexOf("function xe(B){");
const helperEnd = source.indexOf("function we(B){", helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error("Warehouse save helper anchors were not found");
source = source.slice(0, helperStart) + `function xe(B,U={}){Array.isArray(B.snapshots)&&(Kse("bd_inventory_snapshots",B.snapshots),k(B.snapshots)),B.assortment&&(Kse("bd_assortment_v1",B.assortment),E(bdWarehouseCanonicalBalances(B.assortment))),Array.isArray(B.stockMovements)&&(Kse("bd_stock_movements",B.stockMovements),T(B.stockMovements)),U.close!==!1&&g(null);const Q=U.action==="finalize"?"Инвентаризация завершена":U.action==="create"?"Инвентаризация создана":"Черновик сохранён",H=U.action==="finalize"?(B.summary?.changedLines||0)+" корректировок применено к складу.":"Складские остатки не изменены.";l({variant:"success",title:Q,description:H})}\n` + source.slice(helperEnd);

source = source.replace(
  "G=V[0]||null,Y=bdNextInventoryDate(G,u)",
  'G=V.find(B=>["completed","confirmed"].includes(String(B.status||"")))||null,Y=bdNextInventoryDate(G,u)',
);
source = source.replace(
  'fetch("/api/inventory/scan",{method:"POST",body:H})',
  'fetch("/api/inventory/scan",{method:"POST",body:H,headers:ca(Ot())})',
);

const countsStart = source.indexOf('f==="counts"&&');
const countsEnd = source.indexOf('f==="writeoffs"&&', countsStart);
if (countsStart < 0 || countsEnd < 0) throw new Error("Inventory tab anchors were not found");
const counts = `f==="counts"&&i.jsxs("section",{className:"bd-warehouse-section",children:[i.jsxs("div",{className:"bd-warehouse-section-head",children:[i.jsxs("div",{children:[i.jsx("h3",{children:"Инвентаризации"}),i.jsx("p",{children:G?"Последняя завершена: "+sg(G.date):"Фактических пересчётов ещё не было"})]}),i.jsx("button",{type:"button",disabled:!z||!q.length,onClick:()=>g({initial:null,startEditing:!0}),children:"+ Новая"})]}),V.length?i.jsx("div",{className:"bd-warehouse-count-history bd-warehouse-count-history-v245",children:V.map(B=>{const U=Array.isArray(B.items)?B.items.length:0,Q=B.summary||{},H=Q.countedLines??(Array.isArray(B.items)?B.items.filter(P=>P.actual!==null&&P.actual!==void 0).length:0),X=Q.changedLines??(Array.isArray(B.items)?B.items.filter(P=>Math.abs(bdWarehouseNumber(P.difference))>.0001).length:0),Z=bdInventoryCountStatusLabel(B.status),te=["completed","confirmed"].includes(String(B.status||""));return i.jsxs("button",{type:"button",onClick:()=>g({initial:B,startEditing:!te}),children:[i.jsxs("div",{children:[i.jsx("strong",{children:"Инвентаризация № "+String(B.number||"—")}),i.jsxs("span",{children:[sg(B.date)," · ",Z," · ",B.scope?.label||B.sourceLabel||"Вручную"]})]}),i.jsxs("div",{children:[i.jsx("b",{className:te?"":"draft",children:te?U+" поз. · расхождений "+X:"Продолжить"}),i.jsx("small",{children:te?"Открыть результаты":H+" / "+U})]})]},B.id)})}):i.jsxs("div",{className:"bd-warehouse-empty",children:[i.jsx("strong",{children:"Инвентаризаций пока нет"}),i.jsx("p",{children:"Создайте snapshot, считайте товар вслепую и примените расхождения только после проверки."})]}),i.jsx("button",{type:"button",onClick:()=>e("/reports"),className:"bd-warehouse-report-link",children:"Открыть месячный отчёт →"})]}),`;
source = source.slice(0, countsStart) + counts + source.slice(countsEnd);

fs.writeFileSync(assetPath, source);
console.log("Inventory workflow v245 patched");
