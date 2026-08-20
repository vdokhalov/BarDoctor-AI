import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const bundlePath = resolve(root, "public/assets/index-BQGspy0I.js");
const bootstrapPath = resolve(root, "public/bardoctor-preview.js");

const oldCacheToken = "20260814-purchase-delete-one-step-v194";
const newCacheToken = "20260814-finance-purchase-delete-v195";
const cacheTargets = [
  "app/bar-doctor-response.ts",
  "public/app.html",
  "public/bardoctor-preview.js",
  "tests/assortment-command-v170.test.mjs",
  "tests/brand-identity.test.mjs",
  "tests/equipment-command-v167.test.mjs",
  "tests/finance-dashboard-v160.test.mjs",
  "tests/health-score-experience.test.mjs",
  "tests/more-hub-v166.test.mjs",
  "tests/payroll-dashboard-v164.test.mjs",
  "tests/procurement-command-v168.test.mjs",
  "tests/rendered-html.test.mjs",
  "tests/settings-experience-v182.test.mjs",
  "tests/shifts-experience.test.mjs",
  "tests/team-management-v163.test.mjs",
];

function required(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  return source.replace(before, after);
}

function replaceBlock(source, startMarker, endMarker, replacement, label) {
  if (source.includes(replacement)) return source;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Missing ${label}`);
  return source.slice(0, start) + replacement + "\n" + source.slice(end);
}

let bundle = await readFile(bundlePath, "utf8");
bundle = required(
  bundle,
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192",bdPurchaseDeleteVisibilityV193="v193",bdPurchaseDeleteOneStepV194="v194";',
  'const bdProcurementSettlementUiV190="v190",bdProcurementDeleteUiV191="v191",bdPurchaseDeleteEntryV192="v192",bdPurchaseDeleteVisibilityV193="v193",bdPurchaseDeleteOneStepV194="v194",bdFinancePurchaseDeleteFixV195="v195";',
  "finance purchase delete marker",
);

bundle = required(
  bundle,
  'monthExpenses=S.useMemo(()=>expenses.filter(e=>e.date.slice(0,7)===monthKey),[expenses,monthKey])',
  'monthExpenses=S.useMemo(()=>expenses.filter(e=>e.date.slice(0,7)===monthKey&&e?.status!=="voided"&&!e?.reversedAt),[expenses,monthKey])',
  "active finance expense list",
);

const financeDeleteStart = bundle.indexOf("async function deleteViewedPurchase()");
const financeDeleteEnd = bundle.indexOf("function openRevenueAdd()", financeDeleteStart);
if (financeDeleteStart === -1 || financeDeleteEnd === -1) {
  throw new Error("Missing finance delete handler");
}
let financeDeleteBlock = bundle.slice(financeDeleteStart, financeDeleteEnd);
financeDeleteBlock = financeDeleteBlock.replaceAll(
  "bdProcApplyServerResultV186(",
  "applyViewedPurchaseServerResultV195(",
);
const financeStateHelper = 'function applyViewedPurchaseServerResultV195(P){Array.isArray(P.documents)&&Kse("bd_purchase_documents",P.documents),Array.isArray(P.expenses)&&Kse("bd_finance_expenses",P.expenses),P.assortment&&Kse("bd_assortment_v1",P.assortment),Array.isArray(P.stockMovements)&&Kse("bd_stock_movements",P.stockMovements)}\n';
if (!financeDeleteBlock.includes("applyViewedPurchaseServerResultV195(")) {
  throw new Error("Finance delete handler was not rewired to its local state helper");
}
bundle = bundle.slice(0, financeDeleteStart)
  + (bundle.includes(financeStateHelper) ? "" : financeStateHelper)
  + financeDeleteBlock
  + bundle.slice(financeDeleteEnd);

const oldQuickMenu = 'i.jsx("button",{type:"button",role:"menuitem",onClick:()=>{document.querySelector(".bd-finance-quick-add-details")?.removeAttribute("open"),openExpenseAdd()},children:"Добавить расход"})]})';
const newQuickMenu = 'i.jsx("button",{type:"button",role:"menuitem",onClick:()=>{document.querySelector(".bd-finance-quick-add-details")?.removeAttribute("open"),openExpenseAdd()},children:"Добавить расход"}),i.jsx("button",{type:"button",role:"menuitem",onClick:()=>{document.querySelector(".bd-finance-quick-add-details")?.removeAttribute("open"),navigate("/suppliers?tab=purchases&payment=1&returnTo=finance")},children:"Оплатить поставщику"})]})';
bundle = required(bundle, oldQuickMenu, newQuickMenu, "supplier payment quick action");
await writeFile(bundlePath, bundle);

let bootstrap = await readFile(bootstrapPath, "utf8");
const legacyCleanup = `  function removeLegacyFinancePurchasePaymentEntryV195() {
    var existing = document.querySelector("[data-bd-purchase-payment-entry]");
    if (existing) existing.remove();
  }
`;
bootstrap = replaceBlock(
  bootstrap,
  "  function injectFinancePurchasePaymentEntry() {",
  "  var bdDirtySurfaces = new WeakMap();",
  legacyCleanup,
  "legacy finance payment banner",
);
bootstrap = required(
  bootstrap,
  "  installFinancePurchasePaymentEntry();",
  "  removeLegacyFinancePurchasePaymentEntryV195();",
  "legacy finance payment banner installer",
);
await writeFile(bootstrapPath, bootstrap);

for (const file of cacheTargets) {
  const path = resolve(root, file);
  const source = await readFile(path, "utf8");
  if (!source.includes(oldCacheToken) && !source.includes(newCacheToken)) {
    throw new Error(`Missing cache token in ${file}`);
  }
  await writeFile(path, source.replaceAll(oldCacheToken, newCacheToken));
}

console.log("Finance purchase deletion and payment entry v195 applied.");
