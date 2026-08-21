import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("Assortment v170 is one four-tab management module", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const fragment = sliceBetween(
    bundle,
    "/* bd-assortment-command-v170:start */",
    "/* bd-assortment-command-v170:end */",
  );

  assert.match(bundle, /path:"\/catalog",component:\(\)=>i\.jsx\(pt,\{component:bdAssortmentCommandPageV170\}\)/);
  for (const label of ["Обзор", "Меню", "Техкарты", "К закупке"]) {
    assert.match(fragment, new RegExp(label));
  }
  assert.match(fragment, /Готовность данных/);
  assert.match(fragment, /Что мешает расчётам/);
  assert.match(fragment, /Экономика меню/);
  assert.match(fragment, /Изменения себестоимости/);
  assert.match(fragment, /Обновить меню/);
  assert.doesNotMatch(fragment, /183|32%|142 техкарты|24 позиции/);
  assert.doesNotMatch(fragment, /📷|🖼|🍹|🍔|⚠️/);
});

test("Menu and recipe views expose compact economics and honest incomplete states", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const fragment = sliceBetween(bundle, "/* bd-assortment-command-v170:start */", "/* bd-assortment-command-v170:end */");

  for (const label of ["Рассчитано", "Требуют настройки", "Нет техкарты", "Требуют проверки", "Готовы"]) {
    assert.match(fragment, new RegExp(label));
  }
  assert.match(fragment, /Себестоимость:/);
  assert.match(fragment, /Цена не определена/);
  assert.match(fragment, /Недостаточно данных/);
  assert.match(fragment, /Валовая прибыль \/ ед\./);
  assert.match(fragment, /История себестоимости/);
  assert.match(fragment, /История цены продажи/);
  assert.match(fragment, /plannedSales/);
});

test("Menu hierarchy is restored without rewriting catalog identity or venue data", async () => {
  const [bundle, fixture, browserQa] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(new URL("../public/assortment-qa-v170.js", import.meta.url), "utf8"),
    readFile(new URL("../scripts/assortment-browser-qa-v170.cjs", import.meta.url), "utf8"),
  ]);
  const fragment = sliceBetween(bundle, "/* bd-assortment-command-v170:start */", "/* bd-assortment-command-v170:end */");
  const hierarchy = sliceBetween(fragment, "const bdAssortmentDisclosureKeyV171", "function bdAssortmentRecipesV170");

  assert.match(hierarchy, /bdAssortmentHierarchyV171/);
  assert.match(hierarchy, /bdCatState\(xr\(bdCatalogStoreKey\)\)/);
  assert.match(hierarchy, /parentId\|\|e\?\.parentSubgroupId\|\|e\?\.parentSectionId/);
  assert.match(hierarchy, /data-assortment-section-id/);
  assert.match(hierarchy, /data-assortment-subsection-id/);
  assert.match(hierarchy, /data-menu-item-id/);
  assert.match(hierarchy, /aria-expanded/);
  assert.match(hierarchy, /Pt\(bdAssortmentDisclosureKeyV171\)/);
  assert.match(hierarchy, /"⌄":"›"/);
  assert.doesNotMatch(hierarchy, /crypto\.randomUUID/);
  assert.doesNotMatch(hierarchy, /Kse\(|qr\(/);

  assert.match(fixture, /id: "bar-cocktails"/);
  assert.match(fixture, /parentId: "bar-cocktails"/);
  assert.match(fixture, /subgroupId: "bar-signature"/);
  assert.match(browserQa, /Menu hierarchy regression/);
  assert.match(browserQa, /data-assortment-section-id='bar'/);
  assert.match(browserQa, /data-assortment-subsection-id='bar-spirits'/);
  assert.match(browserQa, /page\.goBack\(\)/);
  assert.match(browserQa, /expanded section must survive Back/);
  assert.match(browserQa, /scroll position must survive Back/);
});

test("Repeated menu import always opens diff and preserves absent production items", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const fragment = sliceBetween(bundle, "/* bd-assortment-command-v170:start */", "/* bd-assortment-command-v170:end */");

  assert.match(fragment, /Проверьте изменения/);
  assert.match(fragment, /Новые/);
  assert.match(fragment, /Изменение цены/);
  assert.match(fragment, /Изменение раздела/);
  assert.match(fragment, /Нет в новом меню/);
  assert.match(fragment, /Отсутствующие позиции не будут удалены/);
  assert.match(fragment, /Черновиков техкарт/);
  assert.match(fragment, /Применить проверенные изменения/);
  assert.match(fragment, /bdAssortmentAppendPriceHistoryV170/);
  assert.match(bundle, /priceHistory:bdCatArray\(t\.priceHistory\)/);
});

test("Purchase need is fact-based, unit-aware and exposes insufficient-data states", async () => {
  const [fragmentSource, analytics] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(new URL("../lib/bardoctor/assortment-analytics.ts", import.meta.url), "utf8"),
  ]);
  const fragment = sliceBetween(fragmentSource, "/* bd-assortment-command-v170:start */", "/* bd-assortment-command-v170:end */");

  assert.match(fragment, /Расчётная потребность/);
  assert.match(fragment, /Остаток/);
  assert.match(fragment, /Потребность/);
  assert.match(fragment, /Дефицит/);
  assert.match(fragment, /Купить/);
  assert.match(fragment, /Недостаточно данных для точного прогноза/);
  assert.match(fragment, /Поставщики/);
  assert.match(analytics, /toInventoryBaseAmount/);
  assert.match(analytics, /inventoryPackageAmount/);
  assert.match(analytics, /recent\.dates\.size >= 3/);
  assert.match(analytics, /plannedSales/);
  assert.match(analytics, /не определена фасовка закупки/);
});

test("Cost analytics only use confirmed normalized venue data", async () => {
  const analytics = await readFile(new URL("../lib/bardoctor/assortment-analytics.ts", import.meta.url), "utf8");

  assert.match(analytics, /procurementPricePoints/);
  assert.match(analytics, /includePriceLists: false/);
  assert.match(analytics, /text\(value\.status\) === "confirmed"/);
  assert.match(analytics, /weighted_inventory_average/);
  assert.match(analytics, /latest_confirmed_purchase/);
  assert.match(analytics, /averageUnitCost/);
  assert.match(analytics, /ingredient\.reason === "mapping"/);
  assert.match(analytics, /ASSORTMENT_COST_CHANGE_THRESHOLD_PERCENT = 5/);
  assert.match(analytics, /same_elapsed_days/);
  assert.match(analytics, /unconfirmedOcrUsed: false/);
  assert.match(analytics, /externalPricesUsed: false/);
  assert.doesNotMatch(analytics, /Assortment Score|assortmentHealthScore/);
});

test("Overview endpoint is authenticated, permission and venue scoped, and uncached", async () => {
  const route = await readFile(new URL("../app/api/assortment/overview/route.ts", import.meta.url), "utf8");

  assert.match(route, /authenticateRequest/);
  assert.match(route, /hasPermission\(account, "inventory\.view"\)/);
  assert.match(route, /WHERE account_id = \?/);
  assert.match(route, /venueId: account\.venueId/);
  assert.match(route, /private, no-store/);
  for (const key of ["bd_assortment_v1", "bd_purchase_documents", "bd_sales_documents", "bd_finance_revenue"]) {
    assert.match(route, new RegExp(key));
  }
});

test("Assortment context joins existing AI and Home signals without changing Health Score", async () => {
  const [bundle, context] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(new URL("../lib/bardoctor/venue-ai-context.ts", import.meta.url), "utf8"),
  ]);

  assert.match(context, /buildAssortmentAnalytics/);
  assert.match(context, /assortmentAIContext: analytics\.aiContext/);
  assert.match(context, /assortmentSignals: analytics\.signals/);
  assert.match(bundle, /bdAssortmentSignals=bdAssortmentHomeSignalsV170\(\)/);
  assert.match(bundle, /bdAssortmentSignals\.length&&j\.push/);
  assert.match(bundle, /Ассортимент требует настройки/);
  assert.doesNotMatch(bundle, /assortmentHealthFormulaV170|bdAssortmentHealthScoreV170/);
});

test("Assortment v170 is linked, responsive and has isolated QA states", async () => {
  const [css, appHtml, response, fixture, bootstrap] = await Promise.all([
    readFile(new URL("../public/assortment-command-v170.css", import.meta.url), "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/assortment-qa-v170.js", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  ]);

  for (const source of [appHtml, response]) {
    assert.match(source, /assortment-command-v170\.css\?v=20260813-assortment-v171/);
    assert.match(source, /assortment-qa-v170\.js\?v=20260813-assortment-v171/);
    assert.match(source, /bardoctor-preview\.js\?v=20260821-inventory-cache-reconciliation-v235/);
  }
  assert.match(css, /position: sticky/);
  assert.match(css, /overflow-x: clip/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /word-break: normal/);
  assert.match(css, /writing-mode: horizontal-tb/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /@media \(max-width: 370px\)/);
  assert.match(css, /bd-assortment-accordion-v171/);
  assert.match(css, /bd-assortment-expand-v171 \.16s ease-out/);
  assert.match(fixture, /qaAssortment/);
  assert.match(fixture, /state === "empty"/);
  assert.match(fixture, /state === "venue-b"/);
  assert.match(fixture, /state === "long"/);
  assert.match(fixture, /state === "incomplete"/);
  assert.match(fixture, /state === "error"/);
  assert.match(fixture, /state === "readonly"/);
  assert.match(fixture, /bd_assortment_v1_cache/);
  assert.match(bootstrap, /path === "\/catalog" && url\.searchParams\.has\("itemId"\)/);
});
