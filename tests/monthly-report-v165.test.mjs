import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssUrl = new URL("../public/monthly-report-v165.css", import.meta.url);

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("monthly report v165 replaces only the presentation component", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const report = sliceBetween(
    bundle,
    "/* bd-monthly-report-v165:start */",
    "/* bd-monthly-report-v165:end */",
  );

  assert.match(bundle, /function bdMonthlyReportLegacyPage\(\)/);
  assert.equal((bundle.match(/function bdMonthlyReportPage\(\)/g) || []).length, 1);
  assert.match(report, /data-bd-monthly-report[^]*v165/);
  assert.match(report, /Чистая прибыль месяца/);
  assert.match(report, /Ключевые показатели/);
  assert.match(report, /Сравнение с прошлым месяцем/);
  assert.match(report, /Финансовая цепочка/);
  assert.match(report, /Структура прибыли/);
  assert.match(report, /Себестоимость и остатки/);
  assert.match(report, /Операционный результат по сменам/);
  assert.match(report, /Показать расчёт/);
  assert.match(report, /Как считаются результаты/);
  assert.match(report, /report\.isClosed && previous\?\.operatingResult != null/);
  assert.doesNotMatch(report, /28%/);
});

test("monthly report separates goods purchases from supplier payments", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const calculation = sliceBetween(
    bundle,
    "function bdBuildMonthlyReport(",
    "function bdNextInventoryDate(",
  );

  assert.match(calculation, /bdCanonicalPurchaseSource=bdProcArray\("bd_purchase_documents"\)/);
  assert.match(calculation, /bdPurchaseCurrency=bdMonthlyCurrencyPartitionV320\(bdCanonicalPurchaseSource,"purchase",bdAccountingCurrency\)/);
  assert.match(calculation, /bdCanonicalPurchases=bdPurchaseCurrency\.included/);
  assert.match(calculation, /v=bdCanonicalPurchases/);
  assert.match(calculation, /bdPurchasePaymentRows=f\.filter\(bdIsPurchasePaymentRow\)/);
  assert.match(calculation, /purchasePayments:bdPurchasePayments/);
  assert.match(calculation, /legacyPurchaseExpenses:/);
  assert.match(calculation, /cashResult:tt-bdPurchaseCashOutflow/);
  assert.doesNotMatch(calculation, /v=\[\.\.\.bdCanonicalPurchases/);
  assert.match(
    bundle,
    /purchasePayments:m\("purchasePayments",m\("purchases",u\.purchasePayments\)\)/,
  );
});

test("monthly report v165 is linked and responsive without horizontal data overflow", async () => {
  const [css, appHtml, response] = await Promise.all([
    readFile(cssUrl, "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  ]);

  assert.match(appHtml, /monthly-report-v165\.css\?v=20260812-monthly-v165/);
  assert.match(response, /monthly-report-v165\.css\?v=20260812-monthly-v165/);
  assert.match(css, /\.bd-monthly-report-v165/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.match(css, /max-width: 1180px/);
});

test("monthly report v165 uses progressive disclosure for accounting detail", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const report = sliceBetween(
    bundle,
    "/* bd-monthly-report-v165:start */",
    "/* bd-monthly-report-v165:end */",
  );

  const render = report.slice(report.indexOf("function bdMonthlyReportPage()"));
  const hero = render.indexOf("i.jsx(bdMonthlyHeroV165");
  const executive = render.indexOf("i.jsx(bdMonthlyExecutiveV165");
  const comparison = render.indexOf("i.jsx(bdMonthlyComparisonV165");
  const chain = render.indexOf("i.jsx(bdMonthlyChainV165");
  const cogs = render.indexOf("i.jsx(bdMonthlyCostV165");
  const shifts = render.indexOf("i.jsx(bdMonthlyShiftAnalysisV165");

  assert.ok(hero < executive);
  assert.ok(executive < comparison);
  assert.ok(comparison < chain);
  assert.ok(chain < cogs);
  assert.ok(cogs < shifts);
  assert.match(report, /i\.jsxs\("details"/);
  assert.match(report, /Закупки запасов не вычитаются повторно/);
  assert.match(report, /После оплат/);
  assert.match(report, /фактические оплаты поставщикам/);
  assert.match(report, /Оплаты поставщикам и остальные денежные расходы/);
  assert.match(report, /Недостаточно закрытой истории для корректного сравнения/);
});
