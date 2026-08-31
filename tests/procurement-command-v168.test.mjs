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

test("Procurement v168 is one four-tab management module", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const procurementFragment = sliceBetween(
    bundle,
    "/* bd-procurement-command-v168:start */",
    "/* bd-procurement-command-v168:end */",
  );

  assert.match(bundle, /path:"\/suppliers",component:\(\)=>i\.jsx\(pt,\{component:bdProcurementCommandPageV168\}\)/);
  for (const label of ["Обзор", "Закупки", "Поставщики", "Сравнение"]) {
    assert.match(procurementFragment, new RegExp(label));
  }
  assert.match(procurementFragment, /Сумма закупок/);
  assert.match(procurementFragment, /Требует внимания/);
  assert.match(procurementFragment, /Возможности экономии/);
  assert.match(procurementFragment, /Динамика закупок/);
  assert.match(procurementFragment, /Добавить покупку/);
  assert.match(procurementFragment, /Чек, файл или вручную/);
  assert.match(procurementFragment, /Добавить поставщика/);
  assert.doesNotMatch(procurementFragment, /Сфотографируйте чек — BarDoctor разберёт/);
  assert.doesNotMatch(procurementFragment, /📷|🖼|⬆/);
});

test("Procurement list uses operational states and item-level review", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const procurementFragment = sliceBetween(bundle, "/* bd-procurement-command-v168:start */", "/* bd-procurement-command-v168:end */");
  const purchaseReview = sliceBetween(bundle, "function bdPurchaseReview(", "async function bdPurchaseStageImage(");
  const financeDelete = sliceBetween(bundle, "function applyViewedPurchaseServerResultV195(", "function openRevenueAdd()");

  for (const state of ["Проведено", "Проверено", "Требует проверки", "Черновик", "Отменено", "Ошибка"]) {
    assert.match(procurementFragment, new RegExp(state));
  }
  assert.match(procurementFragment, /Низкая уверенность выделена непосредственно в строках/);
  assert.match(procurementFragment, /Требуется сопоставление/);
  assert.match(procurementFragment, /Открыть оригинал документа/);
  assert.match(procurementFragment, /Не оплачено/);
  assert.match(procurementFragment, /Частично оплачено/);
  assert.match(procurementFragment, /Расчёт с поставщиком/);
  assert.match(procurementFragment, /Осталось/);
  assert.match(procurementFragment, /children:"Оплатить"/);
  assert.match(procurementFragment, /Оплатить остаток/);
  assert.match(procurementFragment, /Подтвердить оплату/);
  assert.match(procurementFragment, /Источник денег/);
  assert.match(procurementFragment, /Банковский счёт · перевод/);
  assert.match(procurementFragment, /К оплате/);
  assert.match(procurementFragment, /children:"Платежи"/);
  assert.match(procurementFragment, /Удалить накладную/);
  assert.match(procurementFragment, /Будет выполнено автоматически/);
  assert.match(procurementFragment, /История операций сохранится/);
  assert.match(procurementFragment, /Оплата автоматически отменена при удалении накладной/);
  assert.doesNotMatch(procurementFragment, /Сначала отмените связанные платежи в блоке «Платежи»/);
  assert.match(procurementFragment, /bdProcurementDeleteUiV191="v191"/);
  assert.match(procurementFragment, /bdPurchaseDeleteEntryV192="v192"/);
  assert.match(procurementFragment, /bdPurchaseDeleteVisibilityV193="v193"/);
  assert.match(procurementFragment, /bdPurchaseDeleteOneStepV194="v194"/);
  assert.match(bundle, /bdFinancePurchaseDeleteFixV195="v195"/);
  assert.match(procurementFragment, /async function bdProcDeleteV194\(/);
  assert.match(procurementFragment, /fetch\("\/api\/purchases\/cancel"/);
  assert.match(procurementFragment, /fetch\("\/api\/purchases\/payment\/reverse"/);
  assert.match(procurementFragment, /fetch\("\/api\/purchases\/delete"/);
  assert.match(procurementFragment, /bd-proc-action-reason-v191/);
  assert.match(bundle, /function bdDocumentDetailSheet\([^)]*onDelete:bdOnDelete/);
  assert.match(bundle, /bd-document-detail-delete-v193/);
  assert.match(bundle, /children:bdDeleteBusy\?"Удаляю накладную…":"Удалить накладную"/);
  assert.match(bundle, /bd-finance-page-v160 "\+\(documentView\?"bd-finance-document-open-v193":""\)/);
  assert.match(bundle, /async function deleteViewedPurchase\(\)/);
  assert.match(financeDelete, /applyViewedPurchaseServerResultV195\(cancelResult\)/);
  assert.match(financeDelete, /applyViewedPurchaseServerResultV195\(lastPaymentResult\)/);
  assert.match(financeDelete, /applyViewedPurchaseServerResultV195\(result\)/);
  assert.doesNotMatch(financeDelete, /bdProcApplyServerResultV186\(/);
  assert.match(bundle, /for\(const payment of active\)/);
  assert.match(bundle, /Связанные оплаты отменены, склад и расчёты пересчитаны/);
  assert.match(bundle, /document:viewedPurchaseDocument[^}]*onDelete:viewedPurchaseDocument&&canManagePurchases\?deleteViewedPurchase:null/);
  assert.doesNotMatch(purchaseReview, /label:"Оплата"/);
  assert.match(purchaseReview, /оплату добавьте отдельной операцией/);
  assert.match(purchaseReview, /Определить автоматически/);
  assert.match(purchaseReview, /Провести приход/);
  assert.match(bundle, /bdProcPackageGroupsV209/);
  assert.match(purchaseReview, /Фасовка одной единицы/);
  assert.match(bundle, /Штучная и упаковки/);
  assert.match(bundle, /Объём/);
  assert.match(bundle, /Вес/);
  assert.match(bundle, /0,9 л/);
  assert.match(bundle, /1 кг/);
  assert.match(purchaseReview, /Своя фасовка/);
  assert.match(procurementFragment, /bdProcManualDraftV207/);
  assert.match(procurementFragment, /recordPayment/);
  assert.match(procurementFragment, /Задолженность поставщикам/);
  assert.match(procurementFragment, /К оплате поставщику/);
  assert.match(procurementFragment, /Оплачено по актуальным накладным/);
  assert.match(procurementFragment, /Итого к оплате/);
  assert.match(procurementFragment, /function bdProcPurchasePaymentV188/);
  assert.match(procurementFragment, /expenses:m/);
  assert.match(procurementFragment, /P\.balanceDue>\.005/);
  assert.match(procurementFragment, /children:"Провести"/);
  assert.match(procurementFragment, /Связанный приход/);
  assert.match(procurementFragment, /Отменить проведение/);
  assert.match(procurementFragment, /Провести заново/);
  assert.match(procurementFragment, /!T\.length\|\|j/);
  assert.match(procurementFragment, /PDF, Excel или CSV/);
  assert.match(procurementFragment, /image\/\*/);
  assert.match(procurementFragment, /\.pdf,\.csv,\.tsv,\.xls,\.xlsx/);
  assert.match(procurementFragment, /bdProcVisibleDocs/);
  assert.match(procurementFragment, /bdProcVisibleLines/);
  assert.match(procurementFragment, /Показать ещё/);
});

test("Price analytics only use confirmed normalized comparable evidence", async () => {
  const analytics = await readFile(new URL("../lib/bardoctor/procurement-analytics.ts", import.meta.url), "utf8");

  assert.match(analytics, /text\(document\.status\) === "confirmed"/);
  assert.match(analytics, /purchaseLineBaseAmount/);
  assert.match(analytics, /mappingStatus = productKey \? "confirmed"/);
  assert.match(analytics, /includePriceLists: false/);
  assert.match(analytics, /\[point\.productKey, point\.currency, point\.baseUnit\]/);
  assert.match(analytics, /PROCUREMENT_PRICE_CHANGE_THRESHOLD_PERCENT = 5/);
  assert.match(analytics, /purchaseDocuments\.size >= 3 && purchaseMonths\.size >= 2/);
  assert.match(analytics, /comparisonScope: currentConditions\.known/);
  assert.match(analytics, /Неподтверждённый OCR не является фактом закупки/);
  assert.match(analytics, /Прайс-лист является предложением, но не фактической закупочной ценой/);
  assert.doesNotMatch(analytics, /Procurement Score|procurementScore/);
});

test("Overview endpoint is authenticated, permission and venue scoped, and uncached", async () => {
  const route = await readFile(new URL("../app/api/procurement/overview/route.ts", import.meta.url), "utf8");

  assert.match(route, /authenticateRequest/);
  assert.match(route, /hasPermission\(account, "inventory\.view"\)/);
  assert.match(route, /WHERE account_id = \?/);
  assert.match(route, /venueId: account\.venueId/);
  assert.match(route, /private, no-store/);
  assert.match(route, /bd_purchase_documents/);
  assert.match(route, /bd_finance_expenses/);
  assert.match(route, /bd_stock_movements/);
});

test("canonical purchase lifecycle separates documents, payments and reversals", async () => {
  const [confirm, update, payment, reversePayment, cancel, repost, remove, expenses, store] = await Promise.all([
    readFile(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/update/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/payment/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/payment/reverse/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/cancel/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/repost/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/delete/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/expenses/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/store/[key]/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(confirm, /duplicateById/);
  assert.match(confirm, /duplicateBySourceFile/);
  assert.match(confirm, /purchaseIdempotencyKey/);
  assert.match(confirm, /IDEMPOTENCY_KEY_REQUIRED/);
  assert.match(confirm, /const duplicate = documents\.find/);
  assert.match(confirm, /withPurchasePaymentSummary/);
  assert.match(confirm, /applyPurchaseToInventory/);
  assert.match(confirm, /MONTH_LOCKED/);
  assert.match(confirm, /database\.batch/);
  assert.match(confirm, /hasPermission\(account, "expenses\.create"\)/);
  assert.match(confirm, /recordPayment/);
  assert.match(confirm, /hasMeaningfulPurchaseItems/);
  assert.doesNotMatch(confirm, /source: "purchase_document"/);
  assert.match(update, /purchasePaymentSummary/);
  assert.match(update, /withPurchasePaymentSummary/);
  assert.match(update, /revisePurchaseInInventory/);
  assert.match(update, /MONTH_LOCKED/);
  assert.match(update, /previousDocument\.venueId/);
  assert.match(update, /database\.batch/);

  assert.match(payment, /hasPermission\(account, "expenses\.create"\)/);
  assert.match(payment, /IDEMPOTENCY_KEY_REQUIRED/);
  assert.match(payment, /deterministicPaymentId/);
  assert.match(payment, /PAYMENT_EXCEEDS_BALANCE/);
  assert.match(payment, /source: "purchase_payment"/);
  assert.match(payment, /paymentKind: "supplier_payment"/);
  assert.match(payment, /sourceDocumentId: purchaseId/);
  assert.match(payment, /moneySourceName/);
  assert.match(payment, /withPurchasePaymentSummary/);
  assert.match(payment, /Number\(purchase\.venueId\) !== account\.venueId/);
  assert.match(reversePayment, /status: "voided"/);
  assert.match(reversePayment, /reversedAt/);
  assert.match(reversePayment, /withPurchasePaymentSummary/);

  assert.match(cancel, /removePurchaseFromInventory/);
  assert.match(cancel, /status: "cancelled"/);
  assert.match(cancel, /linkedPaymentsRequireReconciliation/);
  assert.match(cancel, /hasPermission\(account, "finance\.manage"\)/);
  assert.match(repost, /applyPurchaseToInventory/);
  assert.match(repost, /status: "confirmed"/);
  assert.match(repost, /FINANCE_PERMISSION_REQUIRED/);
  assert.match(repost, /linkedPayments/);
  assert.match(remove, /PURCHASE_MUST_BE_CANCELLED/);
  assert.match(remove, /PURCHASE_HAS_PAYMENTS/);
  assert.match(remove, /PURCHASE_HAS_STOCK_MOVEMENTS/);
  assert.match(expenses, /PURCHASE_DOCUMENT_REQUIRED/);
  assert.match(expenses, /USE_PURCHASE_PAYMENT_ENDPOINT/);
  assert.match(store, /USE_PURCHASE_LIFECYCLE_API/);
  assert.match(store, /USE_PURCHASE_PAYMENT_API/);
  assert.match(store, /PURCHASE_DOCUMENT_REQUIRED/);
});

test("Procurement context is safe for AI and joins existing Home attention without changing Health Score", async () => {
  const [bundle, context] = await Promise.all([
    readFile(bundleUrl, "utf8"),
    readFile(new URL("../lib/bardoctor/venue-ai-context.ts", import.meta.url), "utf8"),
  ]);

  assert.match(context, /buildProcurementAnalytics/);
  assert.match(context, /procurement: procurement\.aiContext/);
  assert.match(context, /procurementSignals: procurement\.signals/);
  assert.match(bundle, /bdProcSignals=bdProcurementHomeSignalsV168\(\)/);
  assert.match(bundle, /bdProcSignals\.length&&j\.push/);
  assert.match(bundle, /Закупки требуют проверки/);
  assert.doesNotMatch(bundle, /bdProcurementHealthScoreV168|procurementHealthFormulaV168/);
});

test("Procurement v168 is linked, responsive and has explicit QA states", async () => {
  const [css, appHtml, response, fixture, bootstrap] = await Promise.all([
    readFile(new URL("../public/procurement-command-v168.css", import.meta.url), "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/procurement-qa-v168.js", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  ]);

  for (const source of [appHtml, response]) {
    assert.match(source, /procurement-command-v168\.css\?v=20260814-finance-purchase-delete-v195/);
    assert.match(source, /procurement-qa-v168\.js\?v=20260814-finance-purchase-delete-v195/);
    assert.match(source, /bardoctor-preview\.js\?v=20260821-inventory-cache-reconciliation-v235/);
  }
  assert.match(css, /position: sticky/);
  assert.match(css, /overflow-x: clip/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.bd-proc-action-reason-v191/);
  assert.match(css, /\.bd-document-detail-delete-v193/);
  assert.match(css, /\.bd-document-detail-sheet-v193/);
  assert.match(css, /\.bd-finance-document-open-v193 \.bd-finance-header-v160/);
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(fixture, /qaProcurement/);
  assert.match(fixture, /state === "empty"/);
  assert.match(fixture, /state === "venue-b"/);
  assert.match(fixture, /state === "long"/);
  assert.match(fixture, /state === "single"/);
  assert.match(fixture, /state === "large"/);
  assert.match(fixture, /state === "e2e"/);
  assert.match(fixture, /qaScenario/);
  assert.match(fixture, /source: "purchase_payment"/);
  assert.match(fixture, /paymentKind: "supplier_payment"/);
  assert.match(fixture, /\/api\/purchases\/payment/);
  assert.match(fixture, /\/api\/purchases\/cancel/);
  assert.match(fixture, /\/api\/purchases\/delete/);
  assert.match(fixture, /rebuildWarehouse/);
  assert.match(bootstrap, /window\.bdNavigationContract\.resolve/);
  assert.match(bootstrap, /window\.bdNavigationContract\.parent/);
});

test("Procurement browser regression uses only visible user actions for settlement and lifecycle", async () => {
  const [browserQa, runner, packageJson] = await Promise.all([
    readFile(new URL("../scripts/procurement-browser-qa-v168.cjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/run-procurement-browser-qa-v190.sh", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const scenario of [
    "draft-delete-visible-ui",
    "posted-purchase-delete-visible-ui",
    "partial-and-final-payment-visible-ui",
    "full-payment-one-finance-operation-visible-ui",
    "supplier-and-total-debt-visible-ui",
    "paid-purchase-one-step-delete-visible-ui",
    "manual-purchase-create-post-stock-visible-ui",
  ]) {
    assert.match(browserQa, new RegExp(scenario));
  }
  for (const action of [
    "Удалить накладную",
    "Будет выполнено автоматически",
    "История операций сохранится",
    "Подтвердить оплату",
    "Источник денег",
    "Открыть расходы",
    "К оплате поставщику",
    "Склад",
  ]) {
    assert.match(browserQa, new RegExp(action));
  }
  assert.match(browserQa, /page\.once\("dialog"/);
  assert.match(browserQa, /\.bd-proc-pay-now-v190/);
  assert.match(browserQa, /\.bd-proc-payment-list-v186 article/);
  assert.match(browserQa, /page\.getByRole\("link", \{ name: "Ещё"/);
  assert.match(browserQa, /page\.locator\("button,a"\)\.filter\(\{ hasText: "Поставщики" \}\)/);
  assert.doesNotMatch(browserQa, /page\.request|fetch\("\/api\/purchases|localStorage\.setItem/);
  assert.match(runner, /\/api\/healthz/);
  assert.match(runner, /procurement-browser-qa-v168\.cjs/);
  assert.match(packageJson, /"test:procurement-browser": "bash scripts\/sites-env\.sh -- bash scripts\/run-procurement-browser-qa-v190\.sh"/);
});
