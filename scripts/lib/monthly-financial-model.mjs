import { stripTypeScriptTypes } from "node:module";

const START = "/* phase7-monthly-financial-model:start */";
const END = "/* phase7-monthly-financial-model:end */";
const UI_START = "/* bd-monthly-report-v165:start */";
const UI_END = "/* bd-monthly-report-v165:end */";
const CLOSURE = 'const bdReleaseCandidateVersion="rc-v163",bdBuildMonthlyReportBeforeClosure=bdBuildMonthlyReport;';
const count = (source, value) => source.split(value).length - 1;

function requiredOne(source, needle, label) {
  if (count(source, needle) !== 1) throw new Error(`Phase 7: unique ${label} required`);
  return source.indexOf(needle);
}

function replaceState(source, before, after, label) {
  const installed = count(source, after);
  if (installed > 1) throw new Error(`Phase 7: duplicate installed ${label}`);
  if (installed === 1) {
    if (count(source.replace(after, ""), before)) throw new Error(`Phase 7: ambiguous ${label}`);
    return source;
  }
  requiredOne(source, before, label);
  return source.replace(before, after);
}

const captureFields = [
  ...["revenue", "receipts", "purchases", "purchasePayments", "legacyPurchaseExpenses", "periodExpenses",
    "otherExpenses", "writeoffs", "payroll", "payrollSource", "taxes", "taxMode", "utilities", "utilityMode",
    "openingInventory", "closingInventory", "costOfGoods", "cashResult", "resultBeforeCost",
    "plannedShifts", "accountedShifts", "expectedShifts", "coveragePercent"].map(key => [key, "null"]),
  ["expenseBreakdown", "null"], ["sections", "[]"],
  ["costBasis", '"legacy_closed_snapshot"'],
  ["inventoryAdjustmentNet", "null"], ["inventoryLoss", "null"], ["grossProfit", "null"],
  ["inventoryRevaluation", "null"], ["financialReconciliationKnown", "null"],
  ["financialReconciliationReasons", "null"], ["rawCostOfGoods", "null"],
  ["inventoryMismatch", "null"], ["shiftEstimates", "[]"],
  ["openingSnapshot", "null"], ["closingSnapshot", "null"],
  ["accountingCurrency", "null"], ["excludedForeignCurrencyEntries", "[]"],
  ["excludedForeignCurrencyTotals", "[]"], ["unconvertedForeignCurrencyCount", "null"],
  ["currencyBoundaryStatus", '"legacy_closed_snapshot"'],
  ["payrollBase", "null"], ["payrollBonuses", "null"], ["payrollDeductions", "null"],
  ["payrollNet", "null"], ["payrollPaid", "null"], ["payrollBalance", "null"],
  ["dataShiftCount", "null"], ["recurringPerShift", "null"], ["taxPerShift", "null"],
  ["utilityPerShift", "null"], ["allocatedTaxes", "null"], ["allocatedUtilities", "null"],
  ["allocatedRecurring", "null"], ["unallocatedRecurring", "null"],
];

export function monthlyHelperBlock(domainSource) {
  const normalized = domainSource.replace(/\r\n/g, "\n");
  if (/^\s*import\b/m.test(normalized)) throw new Error("Phase 7: browser financial model must be import-free");
  let domain = stripTypeScriptTypes(normalized).replace(/\bexport\s+/g, "")
    .replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
  if (!domain.includes("function monthlySnapshotRows(") || !domain.includes("function reconcileMonthlyReport(")) {
    throw new Error("Phase 7: expected financial model exports missing");
  }
  const fields = captureFields.map(([key, fallback]) => `${key}:copy(${JSON.stringify(key)},${fallback})`).join(",")
    + ',operatingResult:copy("finalProfit",copy("operatingResult",null))';
  return `${START}
const bdMonthlyFinancialModelPhase7=(()=>{${domain}\nreturn{monthlySnapshotRows,reconcileMonthlyReport};})();
function bdMonthlyClosedFieldsPhase7(value){const source=value&&typeof value==="object"&&!Array.isArray(value)?value:{},copy=(key,fallback)=>Object.prototype.hasOwnProperty.call(source,key)&&source[key]!==void 0?JSON.parse(JSON.stringify(source[key])):fallback;return{${fields}}}
const bdMonthClosingSnapshotBeforePhase7=bdMonthClosingSnapshot;
bdMonthClosingSnapshot=function(report){return{...bdMonthClosingSnapshotBeforePhase7(report),...bdMonthlyClosedFieldsPhase7(report)}};
const bdBuildMonthlyReportBeforePhase7=bdBuildMonthlyReport;
function bdMonthlyVenueIdPhase7(profile,settings){let active;try{active=bdProcVenueContextV168()?.activeVenueId}catch{}return[active,profile?.venueId,profile?.id,settings?.venueId,settings?.id].map(Number).find(value=>Number.isSafeInteger(value)&&value>0)??NaN}
bdBuildMonthlyReport=function(profile,monthKey,revenues,expenses,snapshots,settings,gapReasons=[]){const venueId=bdMonthlyVenueIdPhase7(profile,settings),normalized=bdMonthlyFinancialModelPhase7.monthlySnapshotRows(snapshots,venueId),report=bdBuildMonthlyReportBeforePhase7(profile,monthKey,revenues,expenses,normalized,settings,gapReasons);return bdMonthlyFinancialModelPhase7.reconcileMonthlyReport({report,venueId,monthKey,snapshots:normalized,revenues,events:bdProcArray("bd_sales_events_v1"),movements:bdProcArray("bd_stock_movements"),documents:bdProcArray("bd_sales_documents"),batches:bdProcArray("bd_sales_batches")})};
${END}\n`;
}

export function patchMonthlyFragment(input) {
  // The owned generated fragment has one canonical newline format. Comparing
  // multiline patches against a CRLF checkout must not insert their rows twice.
  let source = input.replace(/\r\n/g, "\n");
  const historical = 'report.costBasis === "historical_sales_snapshots"';
  const replacements = [
    ['children: "До себестоимости: закупки запасов не вычитаются целиком; их проданная часть определяется после остатков."',
      `children: ${historical} ? "До себестоимости: закупки запасов не вычитаются целиком; стоимость проданного берётся из сохранённых продаж." : "До себестоимости: закупки запасов не вычитаются целиком; их проданная часть определяется после остатков."`, "chain cost basis"],
    ['children: "Чистая прибыль: результат после себестоимости проданного, ФОТ, списаний, остальных расходов, налогов и коммунальных услуг."',
      `children: ${historical} ? "Чистая прибыль: выручка минус сохранённая себестоимость продаж, ФОТ, списания, прочие расходы, налоги и коммунальные услуги; недостачи уменьшают результат, излишки увеличивают." : "Чистая прибыль: результат после себестоимости проданного, ФОТ, списаний, остальных расходов, налогов и коммунальных услуг."`, "chain inventory result"],
    ['{ key: "cogs", label: "Себестоимость проданного", amount: Number(report.costOfGoods || 0), tone: "cost" },',
      '{ key: "cogs", label: "Себестоимость проданного", amount: report.costOfGoods == null ? null : Number(report.costOfGoods), tone: "cost" },', "unknown COGS display"],
    ['    { key: "profit", label: "Чистая прибыль", amount: report.operatingResult, tone: Number(report.operatingResult || 0) >= 0 ? "profit" : "loss" },',
      `    ...(${historical} ? [{ key: "inventory", label: Number(report.inventoryLoss) < 0 ? "Излишки инвентаризации (− расход)" : "Потери инвентаризации", amount: report.inventoryLoss, tone: Number(report.inventoryLoss) < 0 ? "profit" : "other" }] : []),\n    { key: "profit", label: "Чистая прибыль", amount: report.operatingResult, tone: Number(report.operatingResult || 0) >= 0 ? "profit" : "loss" },`, "signed inventory chart"],
    ['children: "Прочие расходы здесь включают только списания и операционные расходы. Закупки запасов не вычитаются повторно после себестоимости."',
      `children: ${historical} ? "Прочие расходы включают списания и операционные расходы; инвентаризация показана отдельно. Положительная сумма потерь уменьшает прибыль, отрицательная сумма излишков увеличивает её. Закупки запасов не вычитаются повторно после себестоимости." : "Прочие расходы здесь включают только списания и операционные расходы. Закупки запасов не вычитаются повторно после себестоимости."`, "profit chart explanation"],
    ['children: "Начальные остатки + закупки − конечные остатки − списания"',
      `children: ${historical} ? "Себестоимость сохранённых продаж с учётом возвратов. Остатки и переоценка показаны отдельно." : "Начальные остатки + закупки − конечные остатки − списания"`, "COGS formula"],
    ['label: "+ Закупки", value: bdMoney2(report.purchases)',
      `label: ${historical} ? "Приходы по документам" : "+ Закупки", value: bdMoney2(report.purchases)`, "receipt detail label"],
    ['label: "− Остатки на конец · " +',
      `label: (${historical} ? "Остатки на конец · " : "− Остатки на конец · ") +`, "closing detail label"],
    ['label: "− Списания", value: bdMoney2(report.writeoffs)',
      `label: ${historical} ? "Списания" : "− Списания", value: bdMoney2(report.writeoffs)`, "writeoff detail label"],
    ['label: "= Себестоимость проданного", value:',
      `label: ${historical} ? "Себестоимость по сохранённым продажам" : "= Себестоимость проданного", value:`, "historical COGS detail"],
    ['        report.sections.map((section) => i.jsxs("article",',
      `        ${historical} && i.jsx(bdReportLine, { label: "Инвентаризация: потери (+), излишки (−)", value: report.inventoryLoss == null ? "Пока недоступна" : bdMoney2(report.inventoryLoss) }),\n        ${historical} && i.jsx(bdReportLine, { label: "Переоценка остатков (не расход)", value: report.inventoryRevaluation == null ? "Пока недоступна" : bdMoney2(report.inventoryRevaluation) }),\n        report.sections.map((section) => i.jsxs("article",`, "inventory reconciliation details"],
    ['children: "Начало " + bdMoney2(section.opening) + " + закупки " + bdMoney2(section.purchases) + " − конец " + bdMoney2(section.closing) + " − списания " + bdMoney2(section.writeoffs) + (section.cost !== null ? " = " + bdMoney2(section.cost) : "")',
      `children: ${historical} ? "Начало " + bdMoney2(section.opening) + " · приходы " + bdMoney2(section.purchases) + " · конец " + bdMoney2(section.closing) + " · списания " + bdMoney2(section.writeoffs) : "Начало " + bdMoney2(section.opening) + " + закупки " + bdMoney2(section.purchases) + " − конец " + bdMoney2(section.closing) + " − списания " + bdMoney2(section.writeoffs) + (section.cost !== null ? " = " + bdMoney2(section.cost) : "")`, "section valuation detail"],
    ['caption: report.costOfGoods !== null ? "Себестоимость распределена пропорционально выручке" : "Показан результат без себестоимости"',
      `caption: report.costOfGoods !== null ? (${historical} ? "Себестоимость по сохранённым продажам каждой смены" : "Себестоимость распределена пропорционально выручке") : "Показан результат без себестоимости"`, "shift cost basis"],
    ['children: "Результат смены — управленческая оценка на основе существующего распределения месячной себестоимости и постоянных расходов."',
      `children: ${historical} ? "Результат смены учитывает сохранённую себестоимость её продаж, расходы и инвентаризацию за день. Постоянные расходы распределяются по существующим правилам." : "Результат смены — управленческая оценка на основе существующего распределения месячной себестоимости и постоянных расходов."`, "shift result explanation"],
  ];
  for (const [before, after, label] of replacements) source = replaceState(source, before, after, label);
  return source;
}

export function patchMonthlyBundle(input, domainSource) {
  let source = input;
  const begins = count(source, START), ends = count(source, END);
  if (begins !== ends || begins > 1) throw new Error("Phase 7: ambiguous financial block boundaries");
  if (begins === 1) {
    const start = source.indexOf(START), end = source.indexOf(END, start);
    if (end < start) throw new Error("Phase 7: reversed financial block boundaries");
    source = source.slice(0, start) + source.slice(end + END.length).replace(/^\r?\n/, "");
  }
  const closure = requiredOne(source, CLOSURE, "closed report capture");
  const payroll = requiredOne(source, "const bdBuildMonthlyReportBeforePayroll=bdBuildMonthlyReport;", "payroll capture");
  if (payroll >= closure) throw new Error("Phase 7: payroll must precede closed report capture");
  source = source.slice(0, closure) + monthlyHelperBlock(domainSource) + source.slice(closure);
  source = replaceState(source,
    'function bdClosedMonthRecord(e,t){const n=String(e?.id||"primary");',
    'function bdClosedMonthRecord(e,t){const n=String(bdMonthlyVenueIdPhase7(null,e)||e?.id||"primary");',
    "closed report venue context");
  source = replaceState(source,
    'r.monthKey===t&&(!r.venueId||String(r.venueId)===n)',
    'r.monthKey===t&&(!r.venueId||r.venueId==="primary"||String(r.venueId)===n)',
    "closed legacy primary venue");
  source = replaceState(source,
    'sections:m("sections",u.sections)}};',
    'sections:m("sections",u.sections),...bdMonthlyClosedFieldsPhase7(f)}};',
    "closed report captured metadata");
  // A signed close cannot be replaced by a subsequently changed live FX partition.
  const unsafeLiveReturn = 'if(u.unconvertedForeignCurrencyCount>0)return{...u,closure:d,closedAt:d.closedAt||null,currencyBoundaryStatus:"unconverted_foreign_excluded"};';
  if (count(source, unsafeLiveReturn) > 1) throw new Error("Phase 7: duplicate closure currency gate");
  source = source.replace(unsafeLiveReturn, "");
  const uiStart = requiredOne(source, UI_START, "monthly UI start");
  const uiEnd = requiredOne(source, UI_END, "monthly UI end");
  if (uiEnd <= uiStart) throw new Error("Phase 7: reversed monthly UI boundaries");
  const ui = source.slice(uiStart, uiEnd + UI_END.length);
  source = source.slice(0, uiStart) + patchMonthlyFragment(ui) + source.slice(uiEnd + UI_END.length);
  requiredOne(source, "const bdBuildMonthlyReportBeforePhase7=bdBuildMonthlyReport;", "financial capture");
  requiredOne(source, "const bdMonthClosingSnapshotBeforePhase7=bdMonthClosingSnapshot;", "snapshot capture");
  return source;
}
