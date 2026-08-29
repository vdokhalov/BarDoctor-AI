/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { chromiumArgs, resolveBrowserExecutable } = require("./browser-runtime.cjs");

const baseUrl = process.env.BD_QA_BASE_URL || "http://127.0.0.1:4173";
const outputDir = process.env.BD_QA_OUTPUT || "/tmp/bardoctor-supplier-alternatives-v330-qa";
fs.mkdirSync(outputDir, { recursive: true });

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({
    viewport,
    locale: "ru-RU",
    timezoneId: "Europe/Chisinau",
    colorScheme: "light",
    reducedMotion: "reduce",
    isMobile: viewport.width < 700,
    hasTouch: viewport.width < 700,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl + "/supplier-alternatives?embedded=1&fixture=supplier-management-v330", { waitUntil: "domcontentloaded" });
  await page.getByText("По внутренней позиции", { exact: true }).waitFor();

  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    mainBottomPadding: Number.parseFloat(getComputedStyle(document.querySelector("main")).paddingBottom),
    cards: document.querySelectorAll(".position-card").length,
    offers: document.querySelectorAll(".position-card").length
      ? document.querySelector(".kpi:nth-child(2) strong").textContent
      : null,
  }));
  assert.equal(metrics.scrollWidth, metrics.viewportWidth, label + ": horizontal overflow");
  assert.ok(metrics.mainBottomPadding >= 112, label + ": bottom navigation clearance");
  assert.equal(metrics.cards, 9);
  assert.equal(metrics.offers, "16");
  await page.screenshot({ path: path.join(outputDir, label + "-positions-viewport.png"), fullPage: false });
  await page.screenshot({ path: path.join(outputDir, label + "-positions.png"), fullPage: true });

  const olmeca = page.locator(".position-card").filter({ hasText: "OLMECA SILVER" });
  await olmeca.getByRole("button", { name: "Сравнить", exact: true }).click();
  await page.getByText("3 предложения · лучшая цена 299 MDL", { exact: true }).waitFor();
  assert.equal(await page.locator(".offer-row").count(), 3);
  assert.equal(await page.locator(".offer-row").first().locator(".price-cell strong").innerText(), "299 MDL");
  await page.screenshot({ path: path.join(outputDir, label + "-comparison.png"), fullPage: true });

  assert.equal(await page.evaluate(() => typeof window.bdHandleEmbeddedBack), "function");
  assert.equal(await page.evaluate(() => window.bdHandleEmbeddedBack()), true);
  await page.getByText("По внутренней позиции", { exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/supplier-alternatives");
  await olmeca.getByRole("button", { name: "Сравнить", exact: true }).click();
  await page.getByText("3 предложения · лучшая цена 299 MDL", { exact: true }).waitFor();

  await page.locator(".offer-row").first().getByRole("button", { name: "Открыть", exact: true }).click();
  await page.getByText("Internal position", { exact: true }).waitFor();
  assert.equal(await page.locator(".offer-identity h2").innerText(), "OLMECA SILVER");
  assert.equal(await page.locator(".offer-identity h3").innerText(), "Tequila OLMECA Silver 35% 0.7L");
  await page.getByRole("button", { name: "Добавить в проверку", exact: true }).click();
  await page.getByRole("button", { name: "Убрать из проверки", exact: true }).waitFor();
  await page.screenshot({ path: path.join(outputDir, label + "-offer.png"), fullPage: true });

  await page.locator("#back").click();
  await page.locator("#back").click();
  await page.getByRole("button", { name: /Без предложений 45 позиций/ }).click();
  await page.getByText("45 позиций пока без подтверждённых предложений", { exact: true }).waitFor();
  assert.equal(await page.locator(".missing-position").count(), 45);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
  await page.screenshot({ path: path.join(outputDir, label + "-missing.png"), fullPage: true });

  assert.deepEqual(errors, []);
  await context.close();
  return { label, viewport, mainBottomPadding: metrics.mainBottomPadding, positions: metrics.cards, offers: Number(metrics.offers), comparisonOffers: 3, noOfferPositions: 45 };
}

(async () => {
  const executablePath = await resolveBrowserExecutable(chromium.executablePath());
  const browser = await chromium.launch({ executablePath, headless: true, args: chromiumArgs });
  try {
    const results = [];
    for (const item of [
      [{ width: 390, height: 844 }, "mobile-390"],
      [{ width: 430, height: 932 }, "mobile-430"],
      [{ width: 1440, height: 900 }, "desktop-1440"],
    ]) results.push(await runViewport(browser, item[0], item[1]));
    const summary = { version: "supplier-alternatives-browser-qa-v330", passed: true, results };
    fs.writeFileSync(path.join(outputDir, "browser-qa.json"), JSON.stringify(summary, null, 2) + "\n");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
