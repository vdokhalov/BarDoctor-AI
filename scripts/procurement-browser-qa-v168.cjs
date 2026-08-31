/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { chromiumArgs, resolveBrowserExecutable } = require("./browser-runtime.cjs");

const baseUrl = process.env.BD_QA_BASE_URL || "http://127.0.0.1:4175";
let browserPath = process.env.BD_QA_BROWSER || "/tmp/chromium";
const outputDir = path.resolve(process.cwd(), "qa-artifacts/procurement-v195");
fs.mkdirSync(outputDir, { recursive: true });

const results = [];
const failures = [];

function output(name) {
  return path.join(outputDir, name);
}

function jsonResponse(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function query(state, extras = {}) {
  const params = new URLSearchParams({ qaProcurement: state, ...extras });
  return `/suppliers?${params.toString()}`;
}

async function openPage(browser, {
  state = "default",
  extras = {},
  viewport = { width: 393, height: 852 },
  name,
}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "ru-RU",
    timezoneId: "Europe/Chisinau",
  });
  await context.route("**/api/business-health**", (route) => route.fulfill(jsonResponse({ ok: true, snapshot: null })));
  const page = await context.newPage();
  const issues = [];
  page.on("pageerror", (error) => issues.push({ type: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error" && !/Failed to load resource/.test(message.text())) issues.push({ type: "console", message: message.text() });
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !/\/api\/store\/bd_finance_(?:revenue|expenses|gap_reasons)/.test(response.url())) {
      issues.push({ type: "response", status: response.status(), url: response.url() });
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    if (!/ERR_ABORTED/.test(failure)) issues.push({ type: "request", message: failure, url: request.url() });
  });
  const response = await page.goto(`${baseUrl}${query(state, extras)}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  assert.equal(response?.status(), 200, `${name}: initial route must return 200`);
  await page.waitForSelector(".bd-proc-command-v168", { state: "visible", timeout: 20_000 });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.waitForTimeout(250);
  return { context, page, issues, name, viewport };
}

async function viewportAudit(page, label) {
  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const header = document.querySelector("bd-app-header")?.getBoundingClientRect()
      || document.querySelector(".bd-proc-header-v168")?.getBoundingClientRect()
      || null;
    const bottom = document.querySelector("nav.fixed")?.getBoundingClientRect()
      || document.querySelector("[data-bd-bottom-nav]")?.getBoundingClientRect()
      || null;
    const visible = [...document.querySelectorAll("button,a,input,select")].filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    });
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      header: header ? { top: header.top, bottom: header.bottom, height: header.height } : null,
      bottom: bottom ? { top: bottom.top, bottom: bottom.bottom, height: bottom.height } : null,
      undersizedCriticalTargets: visible
        .filter((node) => node.matches(".bd-proc-tabs-v168 button,.bd-proc-back-v168,[data-bd-venue-trigger],.bd-proc-purchase-main-v168,.bd-proc-supplier-row-v168,.bd-proc-compare-row-v168"))
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return { label: node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 60), width: rect.width, height: rect.height };
        })
        .filter((item) => item.width < 40 || item.height < 40),
    };
  });
  assert.ok(audit.scrollWidth <= audit.clientWidth + 1, `${label}: document has horizontal overflow (${audit.scrollWidth}/${audit.clientWidth})`);
  assert.ok(audit.header && audit.header.top >= -1, `${label}: stable header is missing or displaced`);
  assert.deepEqual(audit.undersizedCriticalTargets, [], `${label}: critical touch targets are smaller than 40px`);
  return audit;
}

async function shot(page, name) {
  await page.screenshot({ path: output(name), fullPage: false, animations: "disabled" });
}

async function visibleText(locator) {
  return (await locator.innerText()).replace(/\u00a0/g, " ");
}

async function closeSheet(page) {
  const close = page.locator(".bd-proc-sheet-v168 button[aria-label='Закрыть']").last();
  await close.click();
  await page.waitForSelector(".bd-proc-sheet-v168", { state: "detached" });
}

function purchaseRow(page, ...tokens) {
  return tokens.reduce(
    (locator, token) => locator.filter({ hasText: token }),
    page.locator(".bd-proc-purchase-row-v168"),
  ).first();
}

function procurementTab(page, label) {
  return page.locator(".bd-proc-tabs-v168 button").filter({ hasText: label });
}

async function warehousePositionCount(page) {
  const card = page.locator(".bd-warehouse-summary-grid article").filter({ hasText: "Позиций на складе" });
  return Number((await card.locator("strong").innerText()).replace(/\s/g, ""));
}

async function openPurchase(page, ...tokens) {
  const row = purchaseRow(page, ...tokens);
  assert.equal(await row.count(), 1, `Expected one visible purchase row for: ${tokens.join(" · ")}`);
  await row.locator(".bd-proc-purchase-main-v168").click();
  await page.waitForSelector(".bd-proc-sheet-v168", { state: "visible" });
  return page.locator(".bd-proc-sheet-v168").last();
}

async function openWarehouseThroughMore(page) {
  await page.getByRole("link", { name: "Ещё", exact: true }).click();
  await page.waitForURL(/\/more(?:\?|$)/, { timeout: 20_000 });
  const warehouse = page.getByRole("button", { name: "Склад", exact: true });
  await warehouse.waitFor({ state: "visible" });
  await warehouse.click();
  await page.waitForURL(/\/warehouse(?:\?|$)/, { timeout: 20_000 });
  await page.getByRole("heading", { name: "Склад", level: 1 }).waitFor({ state: "visible" });
  const grouping = page.locator("select[aria-label='Группировка остатков']");
  if (await grouping.count()) await grouping.selectOption("list");
}

async function returnFromWarehouseToPurchases(page) {
  await page.getByRole("button", { name: "Вернуться назад", exact: true }).click();
  await page.waitForURL(/\/more(?:\?|$)/, { timeout: 20_000 });
  await page.locator("button,a").filter({ hasText: "Поставщики" }).first().click();
  await page.waitForURL(/\/suppliers(?:\?|$)/, { timeout: 20_000 });
  await page.waitForSelector(".bd-proc-command-v168", { state: "visible" });
  await page.locator(".bd-proc-tabs-v168 button").filter({ hasText: "Закупки" }).click();
  await page.waitForSelector(".bd-proc-purchases-v168", { state: "visible" });
}

async function mobileReferenceFlow(browser) {
  const run = await openPage(browser, { viewport: { width: 465, height: 1128 }, name: "mobile-reference" });
  const { page } = run;
  assert.match(await page.locator("body").innerText(), /Сумма закупок[\s\S]*13\s*183,30/);
  const overviewAudit = await viewportAudit(page, "mobile overview");
  await shot(page, "mobile-overview.png");

  const venueTrigger = page.locator("[data-bd-venue-trigger]");
  await venueTrigger.click();
  await page.waitForSelector("[data-bd-venue-sheet]");
  assert.equal(await page.locator(".bd-venue-row").count(), 2);
  await shot(page, "mobile-venue-switcher.png");
  await page.locator("[data-bd-venue-sheet] [data-close]").click();
  await page.waitForSelector("[data-bd-venue-sheet]", { state: "detached" });

  await page.locator(".bd-proc-tabs-v168 button").filter({ hasText: "Закупки" }).click();
  await page.waitForSelector(".bd-proc-purchases-v168");
  assert.ok((await page.locator(".bd-proc-purchase-row-v168").count()) >= 6);
  await viewportAudit(page, "mobile purchases");
  await shot(page, "mobile-purchases.png");

  await page.getByRole("button", { name: "Требуют проверки", exact: true }).click();
  assert.equal(await page.locator(".bd-proc-purchase-row-v168").count(), 1);
  await page.locator(".bd-proc-purchase-main-v168").first().click();
  await page.waitForSelector(".bd-proc-sheet-v168");
  assert.match(await page.locator(".bd-proc-sheet-v168").innerText(), /Низкая уверенность[\s\S]*Проверьте распознавание/);
  await shot(page, "mobile-purchase-review-detail.png");
  await closeSheet(page);
  assert.match(page.url(), /tab=purchases/);
  assert.match(page.url(), /filter=review/);

  await procurementTab(page, "Поставщики").click();
  await page.waitForSelector(".bd-proc-suppliers-v168");
  assert.equal(await page.locator(".bd-proc-supplier-row-v168").count(), 4);
  await viewportAudit(page, "mobile suppliers");
  await shot(page, "mobile-suppliers.png");
  await page.locator(".bd-proc-supplier-row-v168").first().click();
  await page.waitForSelector(".bd-proc-sheet-v168");
  assert.match(await page.locator(".bd-proc-sheet-v168").innerText(), /Контакты[\s\S]*Отсрочка 7 дней/);
  await shot(page, "mobile-supplier-detail.png");
  await closeSheet(page);

  await procurementTab(page, "Сравнение").click();
  await page.waitForSelector(".bd-proc-compare-v168");
  assert.equal(await page.locator(".bd-proc-compare-row-v168").count(), 1);
  await viewportAudit(page, "mobile comparison");
  await shot(page, "mobile-compare.png");
  await page.locator(".bd-proc-compare-row-v168").click();
  await page.waitForSelector(".bd-proc-sheet-v168");
  assert.match(await page.locator(".bd-proc-sheet-v168").innerText(), /Подтверждённая разница[\s\S]*Создать поручение/);
  await shot(page, "mobile-comparison-detail.png");
  await closeSheet(page);

  await procurementTab(page, "Обзор").click();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const stickyAudit = await viewportAudit(page, "mobile overview scrolled");
  assert.ok(stickyAudit.header.top >= -1 && stickyAudit.header.top <= 1, "mobile: header must stay pinned while scrolling");
  await shot(page, "mobile-overview-bottom.png");

  const addPurchase = page.locator(".bd-proc-quick-grid-v168 button").filter({ hasText: "Добавить покупку" });
  await addPurchase.scrollIntoViewIfNeeded();
  await addPurchase.click();
  await page.waitForSelector(".bd-proc-sheet-v168");
  assert.match(await page.locator(".bd-proc-sheet-v168").innerText(), /Камера[\s\S]*Галерея[\s\S]*Файл[\s\S]*Вручную/);
  await shot(page, "mobile-scan-choice.png");
  await closeSheet(page);

  results.push({ name: run.name, viewport: run.viewport, overviewAudit, stickyAudit, issues: run.issues });
  await run.context.close();
}

async function manualPurchaseCreationFlow(browser) {
  const run = await openPage(browser, {
    state: "e2e",
    extras: { tab: "overview", qaScenario: "default", venue: "401" },
    viewport: { width: 393, height: 852 },
    name: "manual-purchase-create-post-stock-visible-ui",
  });
  const { page } = run;
  await procurementTab(page, "Закупки").click();
  const initialCount = await page.locator(".bd-proc-purchase-row-v168").count();
  await procurementTab(page, "Обзор").click();
  await page.locator(".bd-proc-quick-grid-v168 button").filter({ hasText: "Добавить покупку" }).click();
  await page.locator(".bd-proc-source-grid-v168 button").filter({ hasText: "Вручную" }).click();

  const editor = page.locator(".bd-procurement-sheet");
  await editor.waitFor({ state: "visible" });
  await editor.getByLabel("Поиск поставщика", { exact: true }).fill("ВПРОК");
  await editor.locator(".bd-purchase-supplier-results-v356 button").filter({ hasText: "ВПРОК" }).first().click();
  await editor.locator("label.bd-procurement-field").filter({ hasText: "Название в документе" }).locator("input").fill("Лайм 1 кг");
  await editor.locator("label.bd-procurement-field").filter({ hasText: "Количество" }).locator("input").fill("3");
  await editor.locator("label.bd-procurement-field").filter({ hasText: "Единица количества" }).locator("select").selectOption("кг");
  await editor.locator("input[aria-label='Своя фасовка']").fill("1 кг");
  await editor.locator("label.bd-procurement-field").filter({ hasText: "Цена за единицу" }).locator("input").fill("200");
  await editor.locator("label.bd-procurement-field").filter({ hasText: "Сумма строки" }).locator("input").fill("600");
  assert.equal(await editor.getByLabel("Итог документа", { exact: true }).inputValue(), "600");
  await editor.locator("button.bd-procurement-primary").click();
  await editor.waitFor({ state: "detached" });

  await procurementTab(page, "Закупки").click();
  const rows = page.locator(".bd-proc-purchase-row-v168");
  assert.equal(await rows.count(), initialCount + 1);
  const created = rows.first();
  assert.match(await visibleText(created), /ВПРОК[\s\S]*600,00/);
  await created.locator(".bd-proc-purchase-main-v168").click();
  const detail = page.locator(".bd-proc-sheet-v168").last();
  assert.match(await visibleText(detail), /Лайм 1 кг[\s\S]*Сопоставлено со складским товаром[\s\S]*1 движение прихода/);
  await closeSheet(page);

  await openWarehouseThroughMore(page);
  assert.equal(await warehousePositionCount(page), 4);
  assert.match(await page.locator("body").innerText(), /Требуют распределения\s*4/);
  await page.locator(".bd-warehouse-tabs button").filter({ hasText: "Движения" }).click();
  assert.match(await page.locator("body").innerText(), /Лайм 1 кг[\s\S]*Приход[\s\S]*\+3 кг/);

  await shot(page, "mobile-manual-purchase-posted-to-stock.png");
  results.push({
    name: run.name,
    viewport: run.viewport,
    issues: run.issues,
    supplier: "ВПРОК",
    item: "Лайм 1 кг",
    quantity: 3,
    unitPrice: 200,
    total: 600,
    purchaseDocument: true,
    mapped: true,
    stockReceipt: true,
  });
  await run.context.close();
}

async function stateFlow(browser, state, viewport, name, assertion) {
  const run = await openPage(browser, { state, viewport, name });
  const audit = await viewportAudit(run.page, name);
  if (assertion) await assertion(run.page);
  await shot(run.page, `${name}.png`);
  results.push({ name, viewport, audit, issues: run.issues });
  await run.context.close();
}

async function desktopFlow(browser) {
  const run = await openPage(browser, { viewport: { width: 1440, height: 900 }, name: "desktop" });
  const { page } = run;
  const audits = {};
  for (const [tab, selector, file] of [
    ["Обзор", ".bd-proc-overview-v168", "desktop-overview.png"],
    ["Закупки", ".bd-proc-purchases-v168", "desktop-purchases.png"],
    ["Поставщики", ".bd-proc-suppliers-v168", "desktop-suppliers.png"],
    ["Сравнение", ".bd-proc-compare-v168", "desktop-compare.png"],
  ]) {
    await procurementTab(page, tab).click();
    await page.waitForSelector(selector);
    audits[tab] = await viewportAudit(page, `desktop ${tab}`);
    await shot(page, file);
  }
  await procurementTab(page, "Закупки").click();
  await page.waitForSelector(".bd-proc-purchases-v168");
  const postedDetail = await openPurchase(page, "ВПРОК", "7 авг", "10 291");
  const desktopDelete = postedDetail.getByRole("button", { name: "Удалить накладную", exact: true });
  assert.equal(await desktopDelete.isVisible(), true, "Desktop purchase card must expose invoice deletion");
  await shot(page, "desktop-posted-purchase-delete-action.png");
  await closeSheet(page);
  await openWarehouseThroughMore(page);
  assert.equal(await page.getByRole("heading", { name: "Склад", level: 1 }).isVisible(), true);
  await shot(page, "desktop-warehouse-from-more.png");
  results.push({ name: run.name, viewport: run.viewport, audits, issues: run.issues, warehouseFromMore: true, postedDeleteVisible: true });
  await run.context.close();
}

async function financeDocumentDeleteEntryFlow(browser, viewport, name, screenshot) {
  const run = await openPage(browser, {
    state: "default",
    extras: { venue: "401" },
    viewport,
    name,
  });
  const { page } = run;

  await page.getByRole("link", { name: "Финансы", exact: true }).click();
  await page.waitForURL(/\/finance(?:\?|$)/, { timeout: 20_000 });
  await page.getByRole("button", { name: "Открыть расходы", exact: true }).click();
  const linkedPurchase = page.locator(".bd-finance-record-main").filter({ hasText: "ВПРОК" }).first();
  assert.equal(await linkedPurchase.isVisible(), true, `${name}: linked purchase expense must be visible`);
  await linkedPurchase.click();

  const documentSheet = page.locator(".bd-document-detail-sheet-v193");
  await documentSheet.waitFor({ state: "visible" });
  assert.match(await page.locator("[role='dialog']").last().innerText(), /режим просмотра[\s\S]*накладная[\s\S]*ВПРОК/i);
  const remove = documentSheet.getByRole("button", { name: "Удалить накладную", exact: true });
  assert.equal(await remove.isVisible(), true, `${name}: invoice deletion must be visible in the fixed document footer`);
  await page.waitForTimeout(300);
  const box = await remove.boundingBox();
  await shot(page, screenshot);
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height,
    `${name}: delete action must remain inside the visible viewport; box=${JSON.stringify(box)}`);
  results.push({
    name: run.name,
    viewport: run.viewport,
    issues: run.issues,
    entryPoint: "Финансы → Расходы → ВПРОК → нижняя панель → Удалить накладную",
    deleteActionVisible: true,
  });
  await run.context.close();
}

async function financeQuickActionsFlow(browser, viewport, name, screenshot) {
  const run = await openPage(browser, {
    state: "default",
    extras: { venue: "401" },
    viewport,
    name,
  });
  const { page } = run;
  await page.getByRole("link", { name: "Финансы", exact: true }).click();
  await page.waitForURL(/\/finance(?:\?|$)/, { timeout: 20_000 });
  assert.equal(await page.locator("[data-bd-purchase-payment-entry]").count(), 0,
    `${name}: supplier payment must not occupy a dashboard banner`);

  await page.getByRole("button", { name: "Открыть быстрые финансовые действия", exact: true }).click();
  const payment = page.locator("[role='menuitem']").filter({ hasText: "Оплатить поставщику" });
  assert.equal(await payment.count(), 1, `${name}: supplier payment quick action must exist once`);
  const box = await payment.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height,
    `${name}: supplier payment quick action must fit in the visible viewport`);
  await shot(page, screenshot);
  results.push({
    name: run.name,
    viewport: run.viewport,
    issues: run.issues,
    entryPoint: "Финансы → + → Оплатить поставщику",
    topBannerRemoved: true,
  });
  await run.context.close();
}

async function financePurchaseDeletionFlow(browser) {
  const run = await openPage(browser, {
    state: "e2e",
    extras: { tab: "purchases", qaScenario: "debt", venue: "401" },
    viewport: { width: 393, height: 852 },
    name: "finance-paid-purchase-delete-visible-ui",
  });
  const { page } = run;
  await page.getByRole("link", { name: "Финансы", exact: true }).click();
  await page.waitForURL(/\/finance(?:\?|$)/, { timeout: 20_000 });
  await page.getByRole("button", { name: "Открыть расходы", exact: true }).click();
  const linkedPurchase = page.locator(".bd-finance-record-main").filter({ hasText: "ВПРОК" }).first();
  await linkedPurchase.waitFor({ state: "visible" });
  await linkedPurchase.click();

  const sheet = page.locator(".bd-document-detail-sheet-v193");
  await sheet.waitFor({ state: "visible" });
  let warning = "";
  page.once("dialog", async (dialog) => {
    warning = dialog.message();
    await dialog.accept();
  });
  await sheet.getByRole("button", { name: "Удалить накладную", exact: true }).click();
  await sheet.waitFor({ state: "detached" });

  assert.match(warning, /Будет выполнено автоматически/);
  const lifecycleCalls = await page.evaluate(() => window.__bdProcurementQaLifecycleCalls || []);
  assert.deepEqual(lifecycleCalls, [
    "/api/purchases/cancel",
    "/api/purchases/payment/reverse",
    "/api/purchases/delete",
  ]);
  await page.locator(".bd-finance-record-main").filter({ hasText: "ВПРОК" }).waitFor({ state: "detached" });
  await shot(page, "mobile-finance-paid-purchase-deleted.png");
  results.push({
    name: run.name,
    viewport: run.viewport,
    issues: run.issues,
    lifecycleCalls,
    activeFinanceRecordRemoved: true,
  });
  await run.context.close();
}

async function actualVenueSwitch(browser) {
  const run = await openPage(browser, { viewport: { width: 393, height: 852 }, name: "venue-switch" });
  const { page } = run;
  await page.locator("[data-bd-venue-trigger]").click();
  const target = page.locator(".bd-venue-row").filter({ hasText: "Причал" });
  await target.click();
  await page.waitForURL(/venue=402/, { timeout: 20_000 });
  await page.waitForSelector(".bd-proc-command-v168");
  await procurementTab(page, "Поставщики").click();
  await page.waitForSelector(".bd-proc-suppliers-v168");
  const text = await page.locator(".bd-proc-suppliers-v168").innerText();
  assert.match(text, /Маяк/);
  assert.doesNotMatch(text, /ВПРОК/);
  assert.equal(await page.locator(".bd-proc-supplier-row-v168").count(), 1);
  await viewportAudit(page, "venue switch to B");
  await shot(page, "mobile-venue-switched-b.png");
  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, url: page.url() });
  await run.context.close();
}

async function largeDocumentFlow(browser) {
  const run = await openPage(browser, { state: "large", viewport: { width: 393, height: 852 }, name: "large-document" });
  const { page } = run;
  await procurementTab(page, "Закупки").click();
  const purchase = page.locator(".bd-proc-purchase-row-v168").filter({ hasText: "ВПРОК" }).first();
  await purchase.locator(".bd-proc-purchase-main-v168").click();
  await page.waitForSelector(".bd-proc-line-list-v168");
  assert.equal(await page.locator(".bd-proc-line-list-v168 article").count(), 100);
  await page.locator(".bd-proc-line-list-v168 .bd-proc-load-more-v168").click();
  assert.equal(await page.locator(".bd-proc-line-list-v168 article").count(), 200);
  await page.locator(".bd-proc-line-list-v168 .bd-proc-load-more-v168").click();
  assert.equal(await page.locator(".bd-proc-line-list-v168 article").count(), 240);
  assert.equal(await page.locator(".bd-proc-line-list-v168 .bd-proc-load-more-v168").count(), 0);
  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, renderedLines: 240, progressiveSteps: [100, 200, 240] });
  await run.context.close();
}

async function draftDeletionFlow(browser) {
  const run = await openPage(browser, {
    state: "e2e",
    extras: { tab: "purchases", qaScenario: "default", venue: "401" },
    viewport: { width: 393, height: 852 },
    name: "draft-delete-visible-ui",
  });
  const { page } = run;
  const initialCount = await page.locator(".bd-proc-purchase-row-v168").count();
  const detail = await openPurchase(page, "Рынок", "10 авг", "980");
  const detailText = await detail.innerText();
  assert.match(detailText, /Будет создан после проведения/);
  assert.match(detailText, /Оплата ещё не проводилась/);
  const remove = detail.getByRole("button", { name: "Удалить накладную", exact: true });
  assert.equal(await remove.isVisible(), true, "Draft delete must be visible in the purchase card");

  let warning = "";
  page.once("dialog", async (dialog) => {
    warning = dialog.message();
    await dialog.accept();
  });
  await remove.click();
  await page.waitForSelector(".bd-proc-sheet-v168", { state: "detached" });
  assert.match(warning, /Удалить черновик накладной/);
  assert.match(warning, /Склад и финансы не изменятся/);
  assert.equal(await page.locator(".bd-proc-purchase-row-v168").count(), initialCount - 1);
  assert.equal(await purchaseRow(page, "Рынок", "10 авг", "980").count(), 0);

  await page.getByRole("link", { name: "Финансы", exact: true }).click();
  await page.waitForURL(/\/finance(?:\?|$)/, { timeout: 20_000 });
  await page.getByRole("button", { name: "Открыть расходы", exact: true }).click();
  assert.equal(await page.locator("button").filter({ hasText: "980" }).count(), 0, "Deleted draft must not create an expense");
  await openWarehouseThroughMore(page);
  assert.equal(await warehousePositionCount(page), 3);
  assert.doesNotMatch(await page.locator("body").innerText(), /Салфетки, возможно/);

  await shot(page, "mobile-draft-deleted-warehouse-safe.png");
  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, initialCount, finalCount: initialCount - 1 });
  await run.context.close();
}

async function postedPurchaseDeletionFlow(browser) {
  const run = await openPage(browser, {
    state: "e2e",
    extras: { tab: "purchases", qaScenario: "default", venue: "401" },
    viewport: { width: 393, height: 852 },
    name: "posted-purchase-delete-visible-ui",
  });
  const { page } = run;

  await openWarehouseThroughMore(page);
  const stockBefore = await warehousePositionCount(page);
  assert.equal(stockBefore, 3);
  assert.match(await page.locator("body").innerText(), /Требуют распределения\s*3/);
  await returnFromWarehouseToPurchases(page);

  const detail = await openPurchase(page, "ВПРОК", "7 авг", "10 291");
  assert.match(await detail.innerText(), /3 движения прихода/);
  const remove = detail.getByRole("button", { name: "Удалить накладную", exact: true });
  assert.equal(await remove.isVisible(), true, "Posted purchase delete must be visible");
  let warning = "";
  page.once("dialog", async (dialog) => {
    warning = dialog.message();
    await dialog.accept();
  });
  await remove.click();
  await page.waitForSelector(".bd-proc-sheet-v168", { state: "detached" });
  assert.match(warning, /Будет выполнено автоматически/);
  assert.match(warning, /отмена поступления на склад/);
  assert.match(warning, /удаление накладной/);
  assert.match(warning, /История операций сохранится/);
  assert.equal(await purchaseRow(page, "ВПРОК", "7 авг", "10 291").count(), 0, "Deleted posted purchase must leave the active list");

  await openWarehouseThroughMore(page);
  const stockAfterDelete = await warehousePositionCount(page);
  assert.equal(stockAfterDelete, 1);
  assert.doesNotMatch(await page.locator("body").innerText(), /Вино сухое 0,75 л|Тоник 0,33 л/);
  await page.getByRole("tab", { name: "Движения", exact: true }).click();
  assert.match(await page.locator("body").innerText(), /Приход/);

  await shot(page, "mobile-posted-purchase-deleted-warehouse-reversed.png");
  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, stockBefore, stockAfterDelete, documentRemoved: true });
  await run.context.close();
}

async function partialPaymentFlow(browser) {
  const run = await openPage(browser, {
    state: "e2e",
    extras: { tab: "purchases", qaScenario: "default", venue: "401" },
    viewport: { width: 393, height: 852 },
    name: "partial-and-final-payment-visible-ui",
  });
  const { page } = run;
  let detail = await openPurchase(page, "ВПРОК", "7 авг", "10 291");
  assert.match(await visibleText(detail), /Расчёт с поставщиком[\s\S]*Не оплачено[\s\S]*Оплачено[\s\S]*0,00 ₽[\s\S]*Осталось[\s\S]*10 291,80 ₽/);

  await detail.locator(".bd-proc-pay-now-v190").click();
  let paymentForm = page.locator(".bd-proc-payment-form-v186");
  await paymentForm.waitFor({ state: "visible" });
  const amount = paymentForm.getByLabel("Сумма оплаты", { exact: true });
  assert.equal(await amount.inputValue(), "10291.80");
  await amount.fill("5000");
  await paymentForm.getByLabel("Источник денег", { exact: true }).selectOption("cash");
  assert.match(await visibleText(paymentForm), /Будет частичная оплата · останется 5 291,80 ₽/);
  await page.locator(".bd-proc-sheet-v168").last().getByRole("button", { name: "Подтвердить оплату", exact: true }).click();
  await paymentForm.waitFor({ state: "detached" });

  detail = page.locator(".bd-proc-sheet-v168").last();
  assert.match(await visibleText(detail), /Частично оплачено[\s\S]*Оплачено[\s\S]*5 000,00 ₽[\s\S]*Осталось[\s\S]*5 291,80 ₽/);
  assert.equal(await detail.locator(".bd-proc-payment-list-v186 article").count(), 1);
  assert.match(await detail.locator(".bd-proc-payment-list-v186").innerText(), /Наличные · касса/);

  await detail.locator(".bd-proc-pay-now-v190").click();
  paymentForm = page.locator(".bd-proc-payment-form-v186");
  await paymentForm.waitFor({ state: "visible" });
  assert.equal(await paymentForm.getByLabel("Сумма оплаты", { exact: true }).inputValue(), "5291.80");
  await paymentForm.getByLabel("Источник денег", { exact: true }).selectOption("transfer");
  await page.locator(".bd-proc-sheet-v168").last().getByRole("button", { name: "Подтвердить оплату", exact: true }).click();
  await paymentForm.waitFor({ state: "detached" });

  detail = page.locator(".bd-proc-sheet-v168").last();
  assert.match(await visibleText(detail), /Расчёт с поставщиком[\s\S]*Оплачено[\s\S]*10 291,80 ₽[\s\S]*Осталось[\s\S]*0,00 ₽/);
  assert.equal(await detail.locator(".bd-proc-payment-list-v186 article").count(), 2);
  assert.equal(await detail.locator(".bd-proc-pay-now-v190").count(), 0);

  await shot(page, "mobile-purchase-paid-in-two-payments.png");
  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, payments: 2, finalBalance: 0 });
  await run.context.close();
}

async function fullPaymentFinanceFlow(browser) {
  const run = await openPage(browser, {
    state: "e2e",
    extras: { tab: "purchases", qaScenario: "default", venue: "401" },
    viewport: { width: 393, height: 852 },
    name: "full-payment-one-finance-operation-visible-ui",
  });
  const { page } = run;
  let detail = await openPurchase(page, "Шериф", "1 авг", "491,50");
  await detail.locator(".bd-proc-pay-now-v190").click();
  const paymentForm = page.locator(".bd-proc-payment-form-v186");
  await paymentForm.waitFor({ state: "visible" });
  assert.equal(await paymentForm.getByLabel("Сумма оплаты", { exact: true }).inputValue(), "491.50");
  await paymentForm.getByLabel("Источник денег", { exact: true }).selectOption("transfer");
  await page.locator(".bd-proc-sheet-v168").last().getByRole("button", { name: "Подтвердить оплату", exact: true }).click();
  await paymentForm.waitFor({ state: "detached" });

  detail = page.locator(".bd-proc-sheet-v168").last();
  assert.match(await visibleText(detail), /Оплачено[\s\S]*491,50 ₽[\s\S]*Осталось[\s\S]*0,00 ₽/);
  assert.equal(await detail.locator(".bd-proc-payment-list-v186 article").count(), 1);
  await closeSheet(page);

  await page.getByRole("link", { name: "Финансы", exact: true }).click();
  await page.waitForURL(/\/finance(?:\?|$)/, { timeout: 20_000 });
  await page.getByRole("button", { name: "Открыть расходы", exact: true }).click();
  assert.equal(await page.locator("button").filter({ hasText: "Шериф" }).count(), 1, "A full payment must create exactly one visible linked expense");

  await page.getByRole("link", { name: "Ещё", exact: true }).click();
  await page.waitForURL(/\/more(?:\?|$)/, { timeout: 20_000 });
  await page.locator("button,a").filter({ hasText: "Поставщики" }).first().click();
  await page.waitForURL(/\/suppliers(?:\?|$)/, { timeout: 20_000 });
  await page.waitForSelector(".bd-proc-command-v168", { state: "visible" });
  await procurementTab(page, "Закупки").click();
  assert.equal(await purchaseRow(page, "Шериф", "1 авг", "491,50").count(), 1, "Payment must not create a second purchase");

  await shot(page, "mobile-full-payment-single-purchase.png");
  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, linkedExpenses: 1, purchases: 1 });
  await run.context.close();
}

async function supplierDebtFlow(browser) {
  const run = await openPage(browser, {
    state: "e2e",
    extras: { tab: "overview", qaScenario: "debt", venue: "401" },
    viewport: { width: 393, height: 852 },
    name: "supplier-and-total-debt-visible-ui",
  });
  const { page } = run;
  const overviewDebt = page.locator(".bd-proc-debt-overview-v190");
  assert.match(await visibleText(overviewDebt), /Задолженность поставщикам[\s\S]*15 483,30 ₽[\s\S]*3 накладные к оплате[\s\S]*ВПРОК[\s\S]*14 991,80 ₽[\s\S]*Шериф[\s\S]*491,50 ₽/);

  await procurementTab(page, "Поставщики").click();
  const vprok = page.locator(".bd-proc-supplier-row-v168").filter({ hasText: "ВПРОК" }).first();
  assert.match(await visibleText(vprok), /К оплате 14 991,80 ₽ · 2 накл/);
  await vprok.click();
  const detail = page.locator(".bd-proc-sheet-v168").last();
  assert.match(await visibleText(detail), /Закупки за период[\s\S]*10 291,80 ₽[\s\S]*Оплачено по актуальным накладным[\s\S]*5 000,00 ₽[\s\S]*К оплате поставщику[\s\S]*14 991,80 ₽/);
  const toggle = detail.locator(".bd-proc-supplier-debt-toggle-v190");
  assert.match(await toggle.innerText(), /2 накладные к оплате/);
  await toggle.click();
  const debtList = detail.locator(".bd-proc-debt-list-v190");
  assert.equal(await debtList.locator("button").count(), 2);
  assert.match(await visibleText(debtList), /10 291,80 ₽[\s\S]*5 291,80 ₽[\s\S]*9 700,00 ₽[\s\S]*Итого к оплате[\s\S]*14 991,80 ₽/);

  await shot(page, "mobile-supplier-open-liabilities.png");
  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, totalDebt: 15483.30, supplierDebt: 14991.80, openDocuments: 2 });
  await run.context.close();
}

async function paidPurchaseOneStepDeletionFlow(browser) {
  const run = await openPage(browser, {
    state: "e2e",
    extras: { tab: "purchases", qaScenario: "debt", venue: "401" },
    viewport: { width: 393, height: 852 },
    name: "paid-purchase-one-step-delete-visible-ui",
  });
  const { page } = run;
  const detail = await openPurchase(page, "ВПРОК", "7 авг", "10 291");
  assert.match(await visibleText(detail), /Частично оплачено[\s\S]*5 000,00 ₽/);
  let warning = "";
  page.once("dialog", async (dialog) => {
    warning = dialog.message();
    await dialog.accept();
  });
  await detail.getByRole("button", { name: "Удалить накладную", exact: true }).click();
  await page.waitForTimeout(1_000);
  assert.match(warning, /Будет выполнено автоматически/);
  assert.match(warning, /1 связанного платежа на 5\s000,00\s₽/);
  assert.match(warning, /отмена поступления на склад/);
  assert.match(warning, /История операций сохранится/);
  const lifecycleCalls = await page.evaluate(() => window.__bdProcurementQaLifecycleCalls || []);
  assert.deepEqual(lifecycleCalls, [
    "/api/purchases/cancel",
    "/api/purchases/payment/reverse",
    "/api/purchases/delete",
  ]);
  assert.equal(await purchaseRow(page, "ВПРОК", "7 авг", "10 291").count(), 0);

  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, linkedPaymentAmount: 5000, oneStepDeletion: true, lifecycleCalls });
  await run.context.close();
}

async function withBrowser(run) {
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [...chromiumArgs, "--no-proxy-server", "--disable-dev-shm-usage"],
  });
  try {
    return await run(browser);
  } finally {
    if (browser.isConnected()) await browser.close();
  }
}

(async () => {
  browserPath = await resolveBrowserExecutable(browserPath);
  assert.ok(fs.existsSync(browserPath), `Browser executable not found: ${browserPath}`);
  try {
    await withBrowser((browser) => mobileReferenceFlow(browser));
    await withBrowser((browser) => manualPurchaseCreationFlow(browser));
    await withBrowser((browser) => draftDeletionFlow(browser));
    await withBrowser((browser) => postedPurchaseDeletionFlow(browser));
    await withBrowser((browser) => partialPaymentFlow(browser));
    await withBrowser((browser) => fullPaymentFinanceFlow(browser));
    await withBrowser((browser) => supplierDebtFlow(browser));
    await withBrowser((browser) => paidPurchaseOneStepDeletionFlow(browser));
    await withBrowser((browser) => financePurchaseDeletionFlow(browser));
    await withBrowser((browser) => stateFlow(browser, "empty", { width: 393, height: 852 }, "mobile-empty", async (page) => {
      assert.match(await page.locator("body").innerText(), /Закупок пока нет/);
      assert.equal(await page.locator(".bd-proc-chart-v168").count(), 0);
    }));
    await withBrowser((browser) => stateFlow(browser, "long", { width: 320, height: 852 }, "mobile-long-320", async (page) => {
      assert.match(await page.locator("body").innerText(), /Поставщик профессионального барного оборудования/);
    }));
    await withBrowser((browser) => stateFlow(browser, "single", { width: 393, height: 852 }, "mobile-single", async (page) => {
      assert.match(await page.locator("body").innerText(), /Истории пока недостаточно для графика/);
    }));
    await withBrowser((browser) => stateFlow(browser, "venue-b", { width: 393, height: 852 }, "mobile-venue-b", async (page) => {
      assert.match(await page.locator("body").innerText(), /860,00/);
      assert.doesNotMatch(await page.locator("body").innerText(), /13\s*183,30/);
    }));
    await withBrowser((browser) => actualVenueSwitch(browser));
    await withBrowser((browser) => largeDocumentFlow(browser));
    await withBrowser((browser) => financeDocumentDeleteEntryFlow(
      browser,
      { width: 393, height: 852 },
      "mobile-finance-purchase-delete-entry",
      "mobile-finance-purchase-delete-menu.png",
    ));
    await withBrowser((browser) => financeQuickActionsFlow(
      browser,
      { width: 393, height: 852 },
      "mobile-finance-supplier-payment-quick-action",
      "mobile-finance-supplier-payment-quick-action.png",
    ));
    await withBrowser((browser) => financeQuickActionsFlow(
      browser,
      { width: 1440, height: 900 },
      "desktop-finance-supplier-payment-quick-action",
      "desktop-finance-supplier-payment-quick-action.png",
    ));
    await withBrowser((browser) => financeDocumentDeleteEntryFlow(
      browser,
      { width: 1440, height: 900 },
      "desktop-finance-purchase-delete-entry",
      "desktop-finance-purchase-delete-menu.png",
    ));
    await withBrowser((browser) => desktopFlow(browser));
  } catch (error) {
    failures.push(error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) });
  }

  const unexpectedIssues = results.flatMap((result) => (result.issues || []).map((issue) => ({ run: result.name, ...issue })));
  if (unexpectedIssues.length) failures.push({ message: "Browser console/network issues", issues: unexpectedIssues });
  const summary = {
    version: "procurement-browser-qa-v195",
    generatedAt: new Date().toISOString(),
    baseUrl,
    browser: "Chromium 149 via Playwright",
    browserPath,
    deviceScaleFactor: 1,
    results,
    failures,
    passed: failures.length === 0,
  };
  fs.writeFileSync(output("browser-qa.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.passed) process.exit(1);
})();
