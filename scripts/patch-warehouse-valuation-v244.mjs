import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssPath = new URL("../public/warehouse.css", import.meta.url);
const markerPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../public/bardoctor-preview.js", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

let source = await readFile(bundlePath, "utf8");

function replaceOnce(search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, got ${count}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  'function bdWarehouseInventoryValueSummary(e,t){const n=bdWarehouseCurrency(t);let r=0,a=0;for(const s of Array.isArray(e)?e:[]){const l=Math.max(0,bdWarehouseNumber(s?.inventoryValue));if(l<=0)continue;const u=bdWarehouseCurrency(s?.currency);if(!n||!u||u!==n||s?.costNeedsReview===!0){a+=1;continue}r+=l}return{baseCurrency:n,total:r,unresolved:a,complete:!!n&&a===0}}',
  String.raw`function bdWarehouseInventoryValueLine(e,t){const n=bdWarehouseCurrency(t),r=bdWarehouseNumber(e?.current,Number.NaN),a=String(e?.unit||"unknown").trim().toLowerCase(),s=bdWarehouseCurrency(e?.accountingCurrency||e?.normalizedCostCurrency||e?.currency),l=bdWarehouseNumber(e?.accountingInventoryValue??e?.normalizedInventoryValue,Number.NaN),u=bdWarehouseCurrency(e?.accountingCurrency||e?.normalizedCostCurrency),d=bdWarehouseNumber(e?.inventoryValue,Number.NaN),f=Math.max(0,bdWarehouseNumber(e?.averageUnitCost)),m=Number.isFinite(l)&&l>=0&&u===n?l:Number.isFinite(d)&&d>0?d:r>0&&f>0?r*f:0,h=String(e?.costReviewReason||e?.valuationReason||"");if(e?.archived===!0||e?.deleted===!0||e?.active===!1)return{status:"excluded",value:0};if(!Number.isFinite(r))return{status:"unvalued",value:0,reason:"invalid_quantity"};if(Math.abs(r)<1e-7)return{status:"zero",value:0};if(r<0)return{status:"unvalued",value:0,reason:"negative_stock"};if(!["ml","g","pcs"].includes(a))return{status:"unvalued",value:0,reason:"broken_base_unit"};if(!n)return{status:"unvalued",value:0,reason:"missing_cost_currency"};if(e?.costNeedsReview===!0)return{status:"unvalued",value:0,reason:h==="missing_fx"?"missing_fx":h==="currency_mismatch"?"currency_mismatch":h||"cost_basis_requires_review"};if(!(m>0)){const g=String(e?.source||e?.metadataSource||"").toLocaleLowerCase("ru");return{status:"unvalued",value:0,reason:/opening|initial|начальн|входящ/.test(g)?"opening_balance_without_cost":/import|excel|csv|1c|1с|legacy/.test(g)?"historical_import_without_cost":"missing_cost_basis"}}if(!(Number.isFinite(l)&&l>=0&&u===n)&&!s)return{status:"unvalued",value:0,reason:"missing_cost_currency"};if(!(Number.isFinite(l)&&l>=0&&u===n)&&s!==n)return{status:"unvalued",value:0,reason:"currency_mismatch"};return{status:"valued",value:Math.round(m*100)/100,reason:""}}
function bdWarehouseInventoryValueSummary(e,t){const n=bdWarehouseCurrency(t),r=[],a={};let s=0,l=0,u=0,d=0;for(const f of Array.isArray(e)?e:[]){const m=bdWarehouseInventoryValueLine(f,n);if(m.status==="excluded")continue;if(m.status==="zero"){d+=1;continue}u+=1;if(m.status==="valued"){s+=m.value,l+=1}else{r.push({...m,productKey:String(f?.productKey||f?.key||f?.id||""),name:String(f?.name||f?.productName||"Позиция без названия")}),a[m.reason]=(a[m.reason]||0)+1}}const f=r.length,m=!n?"currency_missing":f===0?"full":l>0?"partial":"unvalued";return{baseCurrency:n,total:Math.round(s*100)/100,unresolved:f,unvaluedCount:f,valuedCount:l,denominator:u,zeroStockExcluded:d,breakdown:a,lines:r,status:m,complete:m==="full"}}`,
  "valuation functions",
);

replaceOnce(
  '[O,M]=S.useState(!1),[P,C]=S.useState(null),bdWarehouseNavigationContext=',
  '[O,M]=S.useState(!1),[P,C]=S.useState(null),[bdWarehouseValuationOnly,bdSetWarehouseValuationOnly]=S.useState(()=>window.bdReadNavigationQuery("valuation","")==="issues"),bdWarehouseNavigationContext=',
  "warehouse valuation filter state",
);

replaceOnce(
  'window.bdSyncNavigationQuery({tab:f==="stock"?null:f,q:v||null})',
  'window.bdSyncNavigationQuery({tab:f==="stock"?null:f,q:v||null,valuation:bdWarehouseValuationOnly?"issues":null})',
  "warehouse valuation navigation state",
);

replaceOnce(
  'F=q.filter(B=>!v||String(B.name||"").toLocaleLowerCase("ru").includes(v.toLocaleLowerCase("ru"))),R=',
  'F=q.filter(B=>(!v||String(B.name||"").toLocaleLowerCase("ru").includes(v.toLocaleLowerCase("ru")))&&(!bdWarehouseValuationOnly||bdWarehouseInventoryValueLine(B,n?.currency).status==="unvalued")),R=',
  "warehouse filtered balances",
);

replaceOnce(
  'bdWarehouseValueSummary=bdWarehouseInventoryValueSummary(q,n?.currency),bdWarehouseValue=bdWarehouseValueSummary.complete?bdWarehouseMoney(bdWarehouseValueSummary.total,bdWarehouseValueSummary.baseCurrency):"Не рассчитана полностью",bdWarehouseValueLabel=bdWarehouseValueSummary.complete?"Стоимость остатка":bdWarehouseValueSummary.baseCurrency?"Стоимость остатка · не рассчитано: "+bdWarehouseValueSummary.unresolved+" поз.":"Стоимость остатка · валюта учёта не задана",',
  'bdWarehouseValueSummary=bdWarehouseInventoryValueSummary(q,n?.currency),bdWarehouseValue=bdWarehouseValueSummary.baseCurrency?bdWarehouseMoney(bdWarehouseValueSummary.total,bdWarehouseValueSummary.baseCurrency):"—",bdWarehouseValueLabel=bdWarehouseValueSummary.status==="full"?"Стоимость остатка":bdWarehouseValueSummary.status==="partial"?"Стоимость рассчитанной части":bdWarehouseValueSummary.status==="unvalued"?"Стоимость пока не рассчитана":"Стоимость остатка · валюта учёта не задана",',
  "warehouse partial KPI",
);

replaceOnce(
  '},U))}),!bdWarehouseValueSummary.baseCurrency&&i.jsxs("button",{type:"button",className:"bd-warehouse-currency-link-v243"',
  '},U))}),bdWarehouseValueSummary.baseCurrency&&bdWarehouseValueSummary.unvaluedCount>0&&i.jsxs("button",{type:"button",className:"bd-warehouse-valuation-link-v244"+(bdWarehouseValuationOnly?" active":""),onClick:()=>bdSetWarehouseValuationOnly(!bdWarehouseValuationOnly),"aria-pressed":bdWarehouseValuationOnly,children:[i.jsxs("span",{children:[i.jsx("strong",{children:bdWarehouseValuationOnly?"Показаны позиции без оценки":"Не рассчитано: "+bdWarehouseValueSummary.unvaluedCount+" из "+bdWarehouseValueSummary.denominator+" поз."}),i.jsx("small",{children:bdWarehouseValuationOnly?"Вернуться ко всем остаткам":"Открыть проблемные позиции"})]}),i.jsx(Br,{size:16,"aria-hidden":!0})]}),!bdWarehouseValueSummary.baseCurrency&&i.jsxs("button",{type:"button",className:"bd-warehouse-currency-link-v243"',
  "warehouse unvalued drilldown",
);

await writeFile(bundlePath, source);

let css = await readFile(cssPath, "utf8");
if (!css.includes("Warehouse valuation v244")) {
  css += String.raw`

/* Warehouse valuation v244 — partial value and focused issue drilldown */
.bd-warehouse-valuation-link-v244 {
  width: 100%;
  min-height: 52px;
  margin-top: -2px;
  padding: 10px 13px;
  border: 1px solid #f1c98a;
  border-radius: 15px;
  background: #fff9ed;
  color: #8a4b08;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
}
.bd-warehouse-valuation-link-v244 span { min-width: 0; display: grid; gap: 2px; }
.bd-warehouse-valuation-link-v244 strong { font-size: 12.5px; line-height: 1.25; font-weight: 900; overflow-wrap: anywhere; }
.bd-warehouse-valuation-link-v244 small { font-size: 10.5px; line-height: 1.3; color: #a36b2c; }
.bd-warehouse-valuation-link-v244.active { border-color: #c7c8ff; background: #f3f3ff; color: #4546aa; }
.bd-warehouse-valuation-link-v244.active small { color: #6c6db5; }
@media (min-width: 768px) {
  .bd-warehouse-valuation-link-v244 { max-width: 430px; }
}
`;
  await writeFile(cssPath, css);
}

for (const path of markerPaths) {
  let value = await readFile(path, "utf8");
  const next = value
    .replace(
      "/warehouse.css?v=20260822-accounting-currency-v243\"",
      "/warehouse.css?v=20260822-accounting-currency-v243-warehouse-valuation-v244\"",
    )
    .replace(
      "collapsed-tree-v239-accounting-currency-v243\"",
      "collapsed-tree-v239-accounting-currency-v243-warehouse-valuation-v244\"",
    );
  if (next !== value) await writeFile(path, next);
}

console.log("Warehouse valuation v244 patch applied.");
