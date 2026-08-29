/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { chromiumArgs, resolveBrowserExecutable } = require("./browser-runtime.cjs");

const baseUrl = process.env.BD_QA_BASE_URL || "http://127.0.0.1:4176";
const outputDir = process.env.BD_QA_OUTPUT || "/tmp/bardoctor-menu-sale-size-v298-qa";
fs.mkdirSync(outputDir, { recursive: true });

function response(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

async function catalogState(page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) => candidate.startsWith("bd_assortment_v1_cache"));
    return key ? JSON.parse(localStorage.getItem(key) || "null") : null;
  });
}

async function openCatalog(browser, viewport, label) {
  const context = await browser.newContext({
    viewport,
    locale: "ru-RU",
    timezoneId: "Europe/Chisinau",
    colorScheme: "light",
    reducedMotion: "reduce",
    isMobile: viewport.width < 700,
    hasTouch: viewport.width < 700,
  });
  const errors = [];
  await context.route("**/api/store/**", (route) => route.fulfill(response({ ok: true })));
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (!/ERR_ABORTED/.test(request.failure()?.errorText || "")) errors.push(`requestfailed: ${request.url()}`);
  });
  const initial = await page.goto(`${baseUrl}/catalog?qaAssortment=default&tab=menu`, { waitUntil: "networkidle", timeout: 60_000 });
  assert.equal(initial?.status(), 200, `${label}: catalog route`);
  await page.locator(".bd-assortment-menu-v170").waitFor({ state: "visible" });
  return { context, page, errors };
}

async function assertEditorLayout(page, label) {
  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const fields = document.querySelector(".bd-menu-sale-size-fields-v298")?.getBoundingClientRect();
    const quantity = document.querySelector('[aria-label="Количество продажи"]')?.getBoundingClientRect();
    const unit = document.querySelector('[aria-label="Единица продажи"]')?.getBoundingClientRect();
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      fields: fields && { left: fields.left, right: fields.right, width: fields.width },
      quantity: quantity && { width: quantity.width, height: quantity.height },
      unit: unit && { width: unit.width, height: unit.height },
    };
  });
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${label}: horizontal overflow`);
  assert.ok(layout.fields && layout.fields.left >= 0 && layout.fields.right <= layout.clientWidth + 1, `${label}: size fields outside viewport`);
  assert.ok(layout.quantity && layout.quantity.width >= 100 && layout.quantity.height >= 40, `${label}: quantity control collapsed`);
  assert.ok(layout.unit && layout.unit.width >= 100 && layout.unit.height >= 40, `${label}: unit control collapsed`);
  return layout;
}

async function mobileFlow(browser) {
  const { context, page, errors } = await openCatalog(browser, { width: 320, height: 852 }, "mobile");
  const bar = page.locator("[data-assortment-section-id='bar'] > .bd-assortment-section-toggle-v171");
  await bar.click();
  await page.locator("[data-assortment-subsection-id='bar-cocktails'] > .bd-assortment-subgroup-toggle-v171").click();
  await page.locator("[data-menu-item-id='item-mojito']").click();
  await page.getByRole("button", { name: "Изменить позицию", exact: true }).click();
  await page.getByRole("heading", { name: "Редактировать позицию" }).waitFor();
  const quantity = page.getByLabel("Количество продажи");
  const unit = page.getByLabel("Единица продажи");
  assert.equal(await quantity.inputValue(), "1", "legacy '1 порция' should normalize without data loss");
  assert.equal(await unit.inputValue(), "pcs");
  await quantity.fill("text");
  assert.equal(await quantity.inputValue(), "1", "free text must be rejected by the controlled input");
  await quantity.fill("350");
  await unit.selectOption("ml");
  const layout = await assertEditorLayout(page, "mobile editor");
  await page.screenshot({ path: path.join(outputDir, "mobile-edit-320x852.png"), fullPage: true });
  await page.getByRole("button", { name: "Сохранить позицию", exact: true }).click();
  await page.locator(".bd-catalog-sheet").waitFor({ state: "detached" });
  const stateAfterEdit = await catalogState(page);
  const mojito = stateAfterEdit.menuItems.find((item) => item.id === "item-mojito");
  assert.deepEqual(mojito.saleSize, { version: 1, quantity: 350, unit: "ml", baseQuantity: 350, baseUnit: "ml", source: "manual", status: "confirmed" });
  assert.equal("portionSize" in mojito, false);

  await page.getByRole("button", { name: "Добавить позицию", exact: true }).click();
  assert.equal(await page.locator('[data-bd-venue-currency-lock="v326"]').count(), 1);
  assert.equal(await page.locator('[data-bd-venue-currency-lock="v326"] select').count(), 0);
  await page.locator('.bd-catalog-field:has-text("Название") input').fill("Консультация бармена");
  await page.locator('.bd-catalog-field:has-text("Тип позиции") select').selectOption("service");
  assert.equal(await page.getByLabel("Количество продажи").count(), 0, "service must not require a fake physical size");
  assert.equal(await page.getByRole("button", { name: "Сохранить позицию", exact: true }).isEnabled(), true);
  await page.getByRole("button", { name: "Сохранить позицию", exact: true }).click();
  await page.locator(".bd-catalog-sheet").waitFor({ state: "detached" });
  const service = (await catalogState(page)).menuItems.find((item) => item.name === "Консультация бармена");
  assert.equal(service.type, "service");
  assert.equal("saleSize" in service, false);
  assert.deepEqual(errors, []);
  await context.close();
  return { viewport: "320x852", layout, edit: "350 ml", serviceWithoutSize: true };
}

async function desktopFlow(browser) {
  const { context, page, errors } = await openCatalog(browser, { width: 1440, height: 900 }, "desktop");
  await page.getByRole("button", { name: "Добавить позицию", exact: true }).click();
  assert.equal(await page.locator('[data-bd-venue-currency-lock="v326"]').count(), 1);
  assert.equal(await page.locator('[data-bd-venue-currency-lock="v326"] select').count(), 0);
  await page.locator('.bd-catalog-field:has-text("Название") input').fill("Кола 1,25 л");
  await page.locator('.bd-catalog-field:has-text("Тип позиции") select').selectOption("ready");
  const readyProduct = page.locator('.bd-catalog-field:has-text("Связанный готовый товар") select');
  await readyProduct.selectOption("product:cola");
  await page.locator(".bd-menu-ready-summary-v298").waitFor({ state: "visible" });
  assert.match(await page.locator(".bd-menu-ready-summary-v298").innerText(), /1 уп\. · 1,25 л/);
  assert.equal(await page.getByLabel("Количество продажи").count(), 0, "packaging-derived size must not be duplicated manually");
  assert.equal(await page.getByRole("button", { name: "Сохранить позицию", exact: true }).isEnabled(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, "desktop editor horizontal overflow");
  await page.screenshot({ path: path.join(outputDir, "desktop-ready-product-1440x900.png"), fullPage: true });
  await page.getByRole("button", { name: "Сохранить позицию", exact: true }).click();
  await page.locator(".bd-catalog-sheet").waitFor({ state: "detached" });
  const cola = (await catalogState(page)).menuItems.find((item) => item.name === "Кола 1,25 л");
  assert.equal(cola.saleSize.quantity, 1.25);
  assert.equal(cola.saleSize.unit, "l");
  assert.equal(cola.saleSize.baseQuantity, 1250);
  assert.equal(cola.saleSize.baseUnit, "ml");
  assert.equal(cola.saleSize.source, "packaging");
  assert.deepEqual(cola.readyProduct, { nomenclatureItemId: "product:cola", productKey: "product:cola", packageLabel: "1,25 л", packagesPerSale: 1 });

  await page.getByRole("button", { name: "Добавить позицию", exact: true }).click();
  await page.locator('.bd-catalog-field:has-text("Название") input').fill("Лимонад на розлив");
  await page.getByLabel("Количество продажи").fill("1,25");
  await page.getByLabel("Единица продажи").selectOption("l");
  assert.equal(await page.getByLabel("Количество продажи").inputValue(), "1,25");
  await page.getByLabel("Количество продажи").fill("1.25");
  assert.equal(await page.getByLabel("Количество продажи").inputValue(), "1.25");
  await page.getByRole("button", { name: "Сохранить позицию", exact: true }).click();
  await page.locator(".bd-catalog-sheet").waitFor({ state: "detached" });
  const lemonade = (await catalogState(page)).menuItems.find((item) => item.name === "Лимонад на розлив");
  assert.equal(lemonade.saleSize.quantity, 1.25);
  assert.equal(typeof lemonade.saleSize.quantity, "number");
  assert.deepEqual(errors, []);
  await context.close();
  return { viewport: "1440x900", readyProduct: "1 package = 1.25 l", decimalLocales: ["1,25", "1.25"] };
}

(async () => {
  const executablePath = await resolveBrowserExecutable(chromium.executablePath());
  const browser = await chromium.launch({ executablePath, headless: true, args: chromiumArgs });
  try {
    const results = [await mobileFlow(browser), await desktopFlow(browser)];
    const summary = { version: "menu-sale-size-browser-qa-v298", passed: true, results };
    fs.writeFileSync(path.join(outputDir, "browser-qa.json"), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
