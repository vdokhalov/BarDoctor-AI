import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function loadFinanceArtifacts() {
  const [bundle, css, bootstrap, venueSwitcher, appHtml, response] = await Promise.all([
    readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8"),
    readFile(new URL("public/finance-dashboard-v160.css", root), "utf8"),
    readFile(new URL("public/bardoctor-preview.js", root), "utf8"),
    readFile(new URL("public/venue-switcher.js", root), "utf8"),
    readFile(new URL("public/app.html", root), "utf8"),
    readFile(new URL("app/bar-doctor-response.ts", root), "utf8"),
  ]);
  const helpersStart = bundle.indexOf("function bdFinancePluralV160(");
  const routeEnd = bundle.indexOf("function Ge(", helpersStart);
  const pageStart = bundle.indexOf("function BAe(){", helpersStart);
  assert.ok(helpersStart >= 0 && pageStart > helpersStart && routeEnd > pageStart);
  return {
    bundle,
    css,
    bootstrap,
    venueSwitcher,
    appHtml,
    response,
    finance: bundle.slice(helpersStart, routeEnd),
    page: bundle.slice(pageStart, routeEnd),
  };
}

test("Finance dashboard exposes the three existing financial levels as one result flow", async () => {
  const { finance, page } = await loadFinanceArtifacts();

  assert.match(page, /"data-bd-finance-dashboard":"v160"/);
  assert.match(page, /"data-bd-finance-density":"v161"/);
  assert.match(finance, /Финансовый результат месяца/);
  assert.match(finance, /Денежный результат после оплат/);
  assert.match(finance, /Операционный результат до себестоимости/);
  assert.match(finance, /Финальный финансовый результат/);
  assert.match(finance, /Денежный итог/);
  assert.match(finance, /До себестоимости/);
  assert.match(finance, /Чистая прибыль/);
  assert.match(finance, /чистая прибыль/);
  assert.match(finance, /ещё не рассчитана/);
  assert.match(finance, /Нужны конечные остатки/);
  assert.match(finance, /Продолжить закрытие/);
  assert.match(page, /bdMonthClosingLauncher/);
  assert.match(finance, /cashResult\?\?/);
  assert.match(finance, /operatingResult\?\?null/);
});

test("Finance dashboard is compact, actionable, and keeps detailed records behind summaries", async () => {
  const { bundle, finance, page, css } = await loadFinanceArtifacts();

  for (const label of [
    "Выручка",
    "Расходы",
    "ФОТ",
    "Средний чек",
    "Готовность данных",
    "Что сделать",
    "Из чего сложился результат",
    "Текущая неделя",
  ]) {
    assert.match(finance, new RegExp(label));
  }
  for (const action of [
    "Мастер закрытия месяца",
    "Внести остатки",
    "Коммунальные услуги",
    "Зарплаты",
    "Месячный отчёт",
  ]) {
    assert.match(finance, new RegExp(action));
  }
  assert.match(finance, /будущие не учитываются/);
  assert.match(page, /detailMode&&i\.jsx\(bdFinanceDetailV160/);
  assert.match(page, /setSheet\("revenue"\)/);
  assert.match(page, /setSheet\("expense"\)/);
  assert.doesNotMatch(page, /OAe\(/);
  assert.doesNotMatch(page, /Показатели команды за месяц/);
  assert.match(css, /\.bd-finance-result-flow\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(css, /\.bd-finance-kpis-v160\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/s);
  assert.match(css, /\.bd-finance-readiness-v160\s*\{[^}]*grid-template-columns:\s*minmax\(0, 0\.95fr\) minmax\(0, 1\.25fr\) minmax\(0, 1fr\)/s);
  assert.match(css, /\.bd-finance-actions-v160 > div\s*\{[^}]*grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/s);
  assert.match(css, /\.bd-finance-record-v160\.expense \.bd-finance-record-main\s*\{[^}]*min-height:\s*58px/s);
  assert.match(finance, /bd-finance-record-copy/);
  assert.match(finance, /\.filter\(Boolean\)\.join\(" · "\)/);
  assert.match(bundle, /function bdExpenseArea\(e\).*repairs:"Ремонт"/);
  assert.match(finance, /bdProcPluralV168\(bdLinkedDocument\.items\?\.length\|\|0,"позиция","позиции","позиций"\)/);
});

test("Finance Quick Add, venue switcher, sync status, and scroll control share a stable header", async () => {
  const { bundle, finance, page, css, venueSwitcher, appHtml, response, bootstrap } =
    await loadFinanceArtifacts();

  assert.match(page, /"data-bd-venue-host":"finance-v160"/);
  assert.match(page, /"data-bd-sync-host":"finance-v161"/);
  assert.match(finance, /Быстрые финансовые действия/);
  assert.match(finance, /Закрыть смену \/ внести выручку/);
  assert.match(finance, /Добавить покупку/);
  assert.match(page, /navigate\("\/suppliers\?create=1&returnTo=finance"\)/);
  assert.match(page, /children:"Оплатить поставщику"/);
  assert.match(page, /navigate\("\/suppliers\?tab=purchases&payment=1&returnTo=finance"\)/);
  assert.doesNotMatch(bootstrap, /data-bd-purchase-payment-entry[^\n]*v186/);
  assert.match(bootstrap, /function removeLegacyFinancePurchasePaymentEntryV195\(\)/);
  assert.doesNotMatch(page, /aria-label":"Добавить операцию"/);
  assert.match(page, /bd-finance-quick-add-details/);
  assert.match(page, /i\.jsxs\("summary",\{role:"button"/);
  assert.match(venueSwitcher, /document\.querySelector\("\[data-bd-venue-host\]"\)/);
  assert.match(venueSwitcher, /existing\.parentElement !== inlineHost/);
  assert.match(css, /\.bd-finance-header-v160\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /\.bd-venue-trigger\.bd-venue-trigger-inline/);
  assert.match(css, /\/\* Quick Add belongs to the stable Finance header in v161\. \*\/[\s\S]*\.bd-finance-header-actions \.bd-finance-quick-add-fab\s*\{[^}]*position:\s*static/s);
  assert.match(css, /\.bd-finance-quick-add-details\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(css, /body\[data-bd-route="\/finance"\] \.bd-scroll-top/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(bundle, /\.createPortal\(/);
  assert.match(bundle, /new MutationObserver\(/);
  for (const html of [appHtml, response]) {
    assert.match(html, /finance-dashboard-v160\.css\?v=20260812-finance-v161/);
    assert.match(html, /venue-switcher\.js\?v=20260813-venue-v174/);
  }
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260820-nomenclature-v211/);
});

test("Finance purchase deletion applies server state in Finance scope and hides reversed payments from active records", async () => {
  const { bundle, page } = await loadFinanceArtifacts();
  const start = page.indexOf("function applyViewedPurchaseServerResultV195(");
  const end = page.indexOf("function openRevenueAdd()", start);
  assert.ok(start >= 0 && end > start);
  const deletion = page.slice(start, end);

  assert.match(bundle, /bdFinancePurchaseDeleteFixV195="v195"/);
  assert.match(deletion, /Kse\("bd_purchase_documents",P\.documents\)/);
  assert.match(deletion, /Kse\("bd_finance_expenses",P\.expenses\)/);
  assert.match(deletion, /Kse\("bd_stock_movements",P\.stockMovements\)/);
  assert.match(deletion, /applyViewedPurchaseServerResultV195\(cancelResult\)/);
  assert.match(deletion, /applyViewedPurchaseServerResultV195\(lastPaymentResult\)/);
  assert.match(deletion, /applyViewedPurchaseServerResultV195\(result\)/);
  assert.doesNotMatch(deletion, /bdProcApplyServerResultV186\(/);
  assert.match(page, /monthExpenses=S\.useMemo\(\(\)=>expenses\.filter\(e=>e\.date\.slice\(0,7\)===monthKey&&e\?\.status!=="voided"&&!e\?\.reversedAt\)/);
});

test("Finance presentation keeps the established calculation contract and excludes future shifts", async () => {
  const { bundle } = await loadFinanceArtifacts();
  const start = bundle.indexOf("function bdBuildMonthlyReport(");
  const end = bundle.indexOf("function bdNextInventoryDate(", start);
  assert.ok(start >= 0 && end > start);
  const report = bundle.slice(start, end);

  assert.match(report, /operatingResult:bdInventoryMismatch\?null:F/);
  assert.match(report, /resultBeforeCost:tt/);
  assert.match(report, /purchasePayments:bdPurchasePayments/);
  assert.match(report, /cashResult:tt-bdPurchaseCashOutflow/);
  assert.match(report, /costOfGoods:bdInventoryMismatch\?null:V/);
  assert.match(report, /pe=Z\.filter\(oe=>oe<re\)/);
  assert.match(report, /expectedShifts:pe\.length/);
  assert.match(report, /coveragePercent:ne/);
});
