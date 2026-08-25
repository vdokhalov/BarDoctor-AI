import fs from "node:fs";

const assetPath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(assetPath, "utf8");
const marker = 'const bdSalesConsumptionVersionV275="sales-batch-ledger-v275";';

if (!source.includes(marker)) {
  const anchor = "function bdWarehouseMovementMeta(e){";
  if (!source.includes(anchor)) throw new Error("Warehouse movement metadata anchor was not found");
  source = source.replace(anchor, marker + anchor);
}

const embeddedSalesPage = 'function bdSalesImportPage(){return i.jsx(bdEmbeddedPage,{source:"/sales-import",title:"Продажи и склад"})}';
const fullscreenSalesPage = 'function bdSalesImportPage(){const[,e]=bt(),t=new URLSearchParams(window.location.search);t.set("embedded","1");const n="/sales-import?"+t.toString()+window.location.hash;return i.jsx("iframe",{src:n,title:"Продажи и склад",onLoad:r=>bdPrepareEmbeddedPage(r,e),style:{position:"fixed",inset:0,zIndex:80,display:"block",width:"100%",height:"100dvh",border:0,background:"#F8F9FC"}})}';
if (source.includes(embeddedSalesPage)) source = source.replace(embeddedSalesPage, fullscreenSalesPage);

source = source.replace(
  'function bdWarehouseMovementMeta(e){return e==="receipt"?{label:"Приход",color:"#059669",sign:"+"}:e==="sale"?{label:"Продажа по техкарте",color:"#DC2626",sign:""}:e==="inventory_adjustment"?{label:"Корректировка по факту",color:"#7C3AED",sign:""}:e==="writeoff"?{label:"Списание",color:"#EA580C",sign:""}:e==="return"?{label:"Обратное движение",color:"#2563EB",sign:"+"}:{label:"Движение",color:"#64748B",sign:""}}',
  'function bdWarehouseMovementMeta(e){return e==="receipt"?{label:"Приход",color:"#059669",sign:"+"}:e==="sale"||e==="sale_consumption"?{label:"Продажа",color:"#DC2626",sign:""}:e==="sale_reversal"?{label:"Сторно продажи",color:"#2563EB",sign:"+"}:e==="inventory_adjustment"?{label:"Корректировка по факту",color:"#7C3AED",sign:""}:e==="writeoff"?{label:"Списание",color:"#EA580C",sign:""}:e==="transfer"||e==="transfer_in"||e==="transfer_out"?{label:"Перемещение",color:"#0891B2",sign:""}:e==="production"?{label:"Производство",color:"#8B5CF6",sign:""}:e==="return"?{label:"Обратное движение",color:"#2563EB",sign:"+"}:{label:"Движение",color:"#64748B",sign:""}}\nfunction bdWarehouseMovementFilterV275(e,t){return t==="all"?!0:t==="purchases"?e.type==="receipt":t==="sales"?["sale","sale_consumption","sale_reversal"].includes(e.type):t==="writeoffs"?e.type==="writeoff":t==="inventory"?e.type==="inventory_adjustment":t==="transfers"?["transfer","transfer_in","transfer_out"].includes(e.type):t==="production"?e.type==="production":!0}'
);

source = source.replace('e==="inventory_adjustment"?{label:"Инвентаризация",color:"#7C3AED",sign:""}', 'e==="inventory_adjustment"?{label:"Корректировка по факту",color:"#7C3AED",sign:""}');

source = source.replace(
  'D=S.useRef(null),z=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner",[bdWarehouseGroupMode,bdSetWarehouseGroupMode]=S.useState("sections");',
  'D=S.useRef(null),z=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner",[bdWarehouseGroupMode,bdSetWarehouseGroupMode]=S.useState("sections"),[bdWarehouseMovementFilterV275Value,bdSetWarehouseMovementFilterV275]=S.useState("all");'
);
source = source.replace(
  'R=[..._].sort((B,U)=>String(U.createdAt||U.date||"").localeCompare(String(B.createdAt||B.date||"")))',
  'R=[..._].filter(B=>bdWarehouseMovementFilterV275(B,bdWarehouseMovementFilterV275Value)).sort((B,U)=>String(U.createdAt||U.date||"").localeCompare(String(B.createdAt||B.date||"")))'
);
source = source.replace(
  'const Se={stock:"Остатки",movements:"Движения",counts:"Инвентаризации",writeoffs:"Списания"};',
  'const Se={stock:"Остатки",movements:"Движения",sales:"Продажи",counts:"Инвентаризации",writeoffs:"Списания"};'
);
source = source.replace(
  'onClick:()=>{m(B),B!=="writeoffs"&&window.bdSyncNavigationQuery({writeoff:null})},children:U',
  'onClick:()=>{B==="sales"?window.bdNavigate("/sales-import"):m(B),B!=="writeoffs"&&window.bdSyncNavigationQuery({writeoff:null})},children:U'
);
source = source.replace('children:"Добавить продажи"', 'children:"Импортировать продажи"');
source = source.replace('children:"Manual, текст, файл или фото"', 'children:"Списать по техкартам"');
source = source.replace('children:B.type==="receipt"?"+":B.type==="sale"?"−":"±"', 'children:B.type==="receipt"||B.type==="sale_reversal"?"+":B.type==="sale"||B.type==="sale_consumption"||B.type==="writeoff"?"−":"±"');

const heading = 'i.jsxs("div",{className:"bd-warehouse-section-head",children:[i.jsxs("div",{children:[i.jsx("h3",{children:"Движения товара"}),i.jsx("p",{children:"Каждый приход, расход и корректировка с источником"})]})]}),R.length?';
const filters = 'i.jsxs("div",{className:"bd-warehouse-section-head",children:[i.jsxs("div",{children:[i.jsx("h3",{children:"Движения товара"}),i.jsx("p",{children:"Каждый приход, расход и корректировка с источником"})]})]}),i.jsx("div",{className:"bd-warehouse-movement-filters-v275",children:[["all","Все"],["purchases","Закупки"],["sales","Продажи"],["writeoffs","Списания"],["inventory","Инвентаризации"],["transfers","Перемещения"],["production","Производство"]].map(B=>i.jsx("button",{type:"button",className:bdWarehouseMovementFilterV275Value===B[0]?"active":"",onClick:()=>bdSetWarehouseMovementFilterV275(B[0]),children:B[1]},B[0]))}),R.length?';
if (!source.includes('bd-warehouse-movement-filters-v275')) {
  if (!source.includes(heading)) throw new Error("Warehouse movements heading anchor was not found");
  source = source.replace(heading, filters);
}

const writeoffLink = 'B.type==="writeoff"&&B.sourceDocumentId&&i.jsx("button",{type:"button",className:"bd-writeoff-movement-link-v271",onClick:()=>e(bdWarehouseNavigationUrlV247({tab:"writeoffs",writeoff:B.sourceDocumentId})),children:"Документ"})';
const movementLinks = writeoffLink + ',["sale","sale_consumption","sale_reversal"].includes(B.type)&&B.sourceDocumentId&&i.jsx("button",{type:"button",className:"bd-writeoff-movement-link-v271",onClick:()=>e("/sales-import?batch="+encodeURIComponent(B.salesBatchId||B.sourceDocumentId)),children:"Документ продаж"})';
if (!source.includes('children:"Документ продаж"') && !source.includes('children:"SalesBatch"')) {
  if (!source.includes(writeoffLink)) throw new Error("Warehouse movement lineage anchor was not found");
  source = source.replace(writeoffLink, movementLinks);
}

const shiftIntro = 'c===0&&i.jsxs("div",{className:"flex flex-col gap-4",children:[i.jsx("p",{className:"text-[13px] text-muted-foreground leading-relaxed",children:"Внесите фактические показатели завершённой смены. Средний чек рассчитается автоматически."}),';
const shiftSales = 'c===0&&i.jsxs("div",{className:"flex flex-col gap-4",children:[i.jsx("p",{className:"text-[13px] text-muted-foreground leading-relaxed",children:"Внесите фактические показатели завершённой смены. Средний чек рассчитается автоматически."}),e?.id&&i.jsxs("button",{type:"button",onClick:()=>window.bdNavigate("/sales-import?shiftId="+encodeURIComponent(e.id)+"&businessDate="+encodeURIComponent(f)),className:"h-14 rounded-2xl border border-primary/20 bg-primary/5 px-4 text-left",children:[i.jsx("b",{className:"block text-[14px] text-primary",children:"Продажи смены"}),i.jsx("span",{className:"block text-[12px] text-muted-foreground mt-1",children:"Открыть canonical SalesBatch — отдельно от списаний"})]}),';
if (!source.includes('children:"Продажи смены"')) {
  if (!source.includes(shiftIntro)) throw new Error("Shift closing sales anchor was not found");
  source = source.replace(shiftIntro, shiftSales);
}

source = source.replaceAll('children:"SalesBatch"', 'children:"Документ продаж"');
source = source.replaceAll('Открыть canonical SalesBatch — отдельно от списаний', 'Открыть продажи смены — отдельно от списаний');

if (!source.includes(marker)) throw new Error("Sales Consumption v275 marker was not inserted");
fs.writeFileSync(assetPath, source);
console.log("Sales Consumption Engine v275 patched");
