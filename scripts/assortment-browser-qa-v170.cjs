/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");

const baseUrl = process.env.BD_QA_BASE_URL || "http://127.0.0.1:4173";
const browserPath = process.env.BD_QA_BROWSER || "/tmp/chromium";
const outputDir = path.resolve(process.cwd(), "qa-artifacts/assortment-v171");
fs.mkdirSync(outputDir, { recursive: true });

const results = [];
const failures = [];

function output(name) {
  return path.join(outputDir, name);
}

function query(state, extras = {}) {
  const params = new URLSearchParams({ qaAssortment: state, ...extras });
  return `/catalog?${params.toString()}`;
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
  const page = await context.newPage();
  const issues = [];
  page.on("pageerror", (error) => issues.push({ type: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push({ type: "console", message: message.text() });
  });
  page.on("response", (response) => {
    const expectedOffline = state === "error"
      && response.status() === 503
      && response.url().includes("/api/assortment/overview");
    if (response.status() >= 400 && !expectedOffline) {
      issues.push({ type: "response", status: response.status(), url: response.url() });
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    if (!/ERR_ABORTED/.test(failure)) issues.push({ type: "request", message: failure, url: request.url() });
  });
  const response = await page.goto(`${baseUrl}${query(state, extras)}`, { waitUntil: "networkidle", timeout: 60_000 });
  assert.equal(response?.status(), 200, `${name}: initial route must return 200`);
  await page.waitForSelector(".bd-assortment-command-v170", { state: "visible", timeout: 20_000 });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.waitForTimeout(150);
  return { context, page, issues, name, viewport };
}

async function viewportAudit(page, label) {
  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const header = document.querySelector(".bd-assortment-header-v170")?.getBoundingClientRect() || null;
    const title = document.querySelector(".bd-assortment-titlebar-v170 h1");
    const headerAncestors = [];
    let headerParent = document.querySelector(".bd-assortment-header-v170")?.parentElement;
    while (headerParent && headerAncestors.length < 5) {
      const parentStyle = getComputedStyle(headerParent);
      const parentRect = headerParent.getBoundingClientRect();
      headerAncestors.push({
        tag: headerParent.tagName,
        className: String(headerParent.className).slice(0, 120),
        overflowX: parentStyle.overflowX,
        overflowY: parentStyle.overflowY,
        height: parentRect.height,
        top: parentRect.top,
      });
      headerParent = headerParent.parentElement;
    }
    const bottomNode = document.querySelector("nav.fixed")
      || document.querySelector("[data-bd-bottom-nav]")
      || null;
    const bottom = bottomNode?.getBoundingClientRect() || null;
    const bottomItems = bottomNode
      ? [...bottomNode.querySelectorAll("[data-bd-primary-navigation] > a,[data-bd-primary-navigation] > button")]
      : [];
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
      headerAncestors,
      title: title ? {
        top: title.getBoundingClientRect().top,
        bottom: title.getBoundingClientRect().bottom,
        width: title.getBoundingClientRect().width,
        height: title.getBoundingClientRect().height,
        writingMode: getComputedStyle(title).writingMode,
        whiteSpace: getComputedStyle(title).whiteSpace,
      } : null,
      bottom: bottom ? { top: bottom.top, bottom: bottom.bottom, height: bottom.height } : null,
      bottomNavigation: bottomNode ? {
        className: String(bottomNode.className),
        marker: bottomNode.getAttribute("data-bd-primary-navigation"),
        items: bottomItems.map((node) => {
          const rect = node.getBoundingClientRect();
          const labels = [...node.querySelectorAll("span")].filter((candidate) =>
            candidate.children.length === 0 && candidate.textContent?.trim()
          );
          const labelRect = labels.at(-1)?.getBoundingClientRect() || null;
          return {
            text: node.textContent.trim(),
            left: rect.left,
            right: rect.right,
            width: rect.width,
            labelLeft: labelRect?.left ?? null,
            labelRight: labelRect?.right ?? null,
          };
        }),
      } : null,
      undersizedCriticalTargets: visible
        .filter((node) => node.matches(".bd-assortment-tabs-v170 button,.bd-assortment-back-v170,[data-bd-venue-trigger],.bd-assortment-section-toggle-v171,.bd-assortment-subgroup-toggle-v171,.bd-assortment-menu-row-v170,.bd-assortment-recipe-card-v170,.bd-assortment-filter-row-v170 button"))
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return { label: node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 60), width: rect.width, height: rect.height };
        })
        .filter((item) => item.width < 40 || item.height < 40),
    };
  });
  assert.ok(audit.scrollWidth <= audit.clientWidth + 1, `${label}: horizontal overflow (${audit.scrollWidth}/${audit.clientWidth})`);
  assert.ok(audit.header && audit.header.top >= -1, `${label}: stable header is missing or displaced ${JSON.stringify({ header: audit.header, ancestors: audit.headerAncestors })}`);
  assert.ok(
    audit.title
      && audit.title.writingMode === "horizontal-tb"
      && audit.title.height < 40
      && audit.title.width >= 80
      && audit.title.top >= (audit.header?.top ?? 0)
      && audit.title.bottom <= (audit.header?.bottom ?? 0),
    `${label}: title collapsed, rotated, or left the stable header`,
  );
  assert.deepEqual(audit.undersizedCriticalTargets, [], `${label}: critical touch targets are smaller than 40px`);
  if (audit.clientWidth <= 370 && audit.bottomNavigation?.items.length) {
    assert.ok(
      audit.bottomNavigation.items.every((item) => item.width >= 40),
      `${label}: bottom navigation touch target collapsed`,
    );
    for (let index = 1; index < audit.bottomNavigation.items.length; index += 1) {
      const previous = audit.bottomNavigation.items[index - 1];
      const current = audit.bottomNavigation.items[index];
      assert.ok(
        previous.labelRight == null || current.labelLeft == null || previous.labelRight <= current.labelLeft,
        `${label}: bottom navigation labels overlap (${previous.text}/${current.text})`,
      );
    }
  }
  return audit;
}

async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: output(name), fullPage, animations: "disabled" });
}

async function closeSheet(page) {
  await page.locator(".bd-assortment-sheet-v170 button[aria-label='Закрыть']").last().click();
  await page.waitForSelector(".bd-assortment-sheet-v170", { state: "detached" });
}

async function referenceMobileFlow(browser) {
  const run = await openPage(browser, { viewport: { width: 512, height: 1024 }, name: "reference-mobile" });
  const { page } = run;
  assert.match(await page.locator("body").innerText(), /Готовность данных[\s\S]*Что мешает расчётам/);
  const overviewAudit = await viewportAudit(page, "reference overview");
  await shot(page, "reference-overview-512x1024.png");
  await page.keyboard.press("Tab");
  const keyboardFocus = await page.evaluate(() => {
    const active = document.activeElement;
    const style = active ? getComputedStyle(active) : null;
    return {
      label: active?.getAttribute("aria-label") || active?.textContent?.trim() || "",
      outlineStyle: style?.outlineStyle || "",
      outlineWidth: style?.outlineWidth || "",
    };
  });
  assert.match(keyboardFocus.label, /Назад/);
  assert.notEqual(keyboardFocus.outlineStyle, "none", "keyboard focus must stay visible");

  const periodSelect = page.getByLabel("Период анализа");
  const initialPeriod = await periodSelect.inputValue();
  const alternatePeriod = await periodSelect.locator("option").nth(1).getAttribute("value");
  assert.ok(alternatePeriod, "period selector must expose a previous period");
  await periodSelect.selectOption(alternatePeriod);
  await page.waitForURL((url) => url.searchParams.get("period") === alternatePeriod);
  assert.equal(await periodSelect.inputValue(), alternatePeriod);
  await periodSelect.selectOption(initialPeriod);
  await page.waitForFunction(() => !new URLSearchParams(location.search).has("period"));

  await page.getByRole("button", { name: "Меню", exact: true }).click();
  await page.waitForSelector(".bd-assortment-menu-v170");
  // Menu hierarchy regression: section -> subsection -> items -> item -> Back.
  const barSection = page.locator("[data-assortment-section-id='bar'] > .bd-assortment-section-toggle-v171");
  const cocktailsSubsection = page.locator("[data-assortment-subsection-id='bar-cocktails'] > .bd-assortment-subgroup-toggle-v171");
  const signatureSubsection = page.locator("[data-assortment-subsection-id='bar-signature'] > .bd-assortment-subgroup-toggle-v171");
  const spiritsSubsection = page.locator("[data-assortment-subsection-id='bar-spirits'] > .bd-assortment-subgroup-toggle-v171");
  assert.equal(await barSection.getAttribute("aria-expanded"), "false", "top-level sections must be collapsed by default");
  assert.equal(await page.locator(".bd-assortment-menu-row-v170").count(), 0, "collapsed hierarchy must not flatten menu items");
  await barSection.click();
  assert.equal(await barSection.getAttribute("aria-expanded"), "true");
  assert.equal(await cocktailsSubsection.count(), 1);
  assert.equal(await spiritsSubsection.count(), 1);
  await cocktailsSubsection.click();
  assert.equal(await cocktailsSubsection.getAttribute("aria-expanded"), "true");
  assert.equal(await signatureSubsection.count(), 1, "third hierarchy level must remain expandable");
  assert.equal(await page.locator("[data-menu-item-id='item-mojito']").count(), 1);
  assert.equal(await page.locator("[data-menu-item-id='item-aperol']").count(), 0);
  await signatureSubsection.click();
  assert.equal(await signatureSubsection.getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator("[data-menu-item-id='item-aperol']").count(), 1);
  assert.match(await page.locator(".bd-assortment-menu-v170").innerText(), /Aperol Spritz[\s\S]*Себестоимость/);
  await page.getByLabel("Поиск по меню…").fill("Mojito");
  await page.waitForURL(/q=Mojito/);
  assert.equal(await page.locator(".bd-assortment-menu-row-v170").count(), 1);
  await page.getByRole("button", { name: "Требуют настройки", exact: true }).click();
  await page.waitForURL(/filter=attention/);
  assert.equal(await page.locator(".bd-assortment-menu-row-v170").count(), 1);
  await page.getByLabel("Поиск по меню…").fill("");
  await page.getByRole("button", { name: "Все", exact: true }).first().click();
  await barSection.click();
  const kitchenSection = page.locator("[data-assortment-section-id='kitchen'] > .bd-assortment-section-toggle-v171");
  await kitchenSection.click();
  await page.locator("[data-assortment-subsection-id='kitchen-main'] > .bd-assortment-subgroup-toggle-v171").click();
  assert.equal(await page.locator(".bd-assortment-menu-row-v170").count(), 2);
  await kitchenSection.click();
  await barSection.click();
  await spiritsSubsection.click();
  await viewportAudit(page, "reference menu");
  await shot(page, "reference-menu-512x1024.png");

  await spiritsSubsection.scrollIntoViewIfNeeded();
  const returnScrollY = await page.evaluate(() => window.scrollY);
  const returnQuery = new URL(page.url()).searchParams.toString();
  await page.locator("[data-menu-item-id='item-whiskey']").click();
  await page.waitForSelector(".bd-assortment-sheet-v170.detail");
  assert.match(await page.locator(".bd-assortment-sheet-v170.detail").innerText(), /История себестоимости[\s\S]*История цены продажи/);
  await shot(page, "reference-item-detail-512x1024.png");
  await closeSheet(page);
  assert.match(page.url(), /tab=menu/);
  assert.doesNotMatch(page.url(), /itemId=/);
  assert.equal(await barSection.getAttribute("aria-expanded"), "true", "expanded section must survive close");
  assert.equal(await spiritsSubsection.getAttribute("aria-expanded"), "true", "expanded subsection must survive close");

  await page.locator("[data-menu-item-id='item-whiskey']").click();
  await page.waitForSelector(".bd-assortment-sheet-v170.detail");
  await page.goBack();
  await page.waitForSelector(".bd-assortment-sheet-v170", { state: "detached" });
  assert.match(page.url(), /tab=menu/);
  assert.doesNotMatch(page.url(), /itemId=/);
  assert.equal(await barSection.getAttribute("aria-expanded"), "true", "expanded section must survive Back");
  assert.equal(await spiritsSubsection.getAttribute("aria-expanded"), "true", "expanded subsection must survive Back");
  assert.equal(new URL(page.url()).searchParams.toString(), returnQuery, "search and filter context must survive Back");
  assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - returnScrollY) <= 2, "scroll position must survive Back");
  assert.equal(await page.locator("[data-menu-item-id='item-whiskey']").count(), 1, "the same item list must remain visible after Back");

  await page.getByRole("button", { name: "Техкарты", exact: true }).click();
  await page.waitForSelector(".bd-assortment-recipes-v170");
  assert.equal(await page.locator(".bd-assortment-recipe-card-v170").count(), 5);
  assert.match(await page.locator(".bd-assortment-recipes-v170").innerText(), /Цена не определена/);
  await page.getByRole("button", { name: "Нет техкарты", exact: true }).click();
  await page.waitForURL(/filter=missing/);
  assert.equal(await page.locator(".bd-assortment-recipe-card-v170").count(), 1);
  assert.match(await page.locator(".bd-assortment-recipe-card-v170").innerText(), /Mojito/);
  await page.getByRole("button", { name: "Все", exact: true }).click();
  await viewportAudit(page, "reference recipes");
  await shot(page, "reference-recipes-512x1024.png");

  await page.getByRole("button", { name: "К закупке", exact: true }).click();
  await page.waitForSelector(".bd-assortment-needs-v170");
  assert.equal(await page.locator(".bd-assortment-need-card-v170").count(), 1);
  assert.match(await page.locator(".bd-assortment-needs-v170").innerText(), /Остаток[\s\S]*Потребность[\s\S]*Дефицит[\s\S]*Купить/);
  await viewportAudit(page, "reference needs");
  await shot(page, "reference-needs-512x1024.png");

  await page.getByRole("button", { name: "Обзор", exact: true }).click();
  await page.getByRole("button", { name: /Обновить меню/ }).click();
  await page.waitForSelector(".bd-assortment-source-grid-v170");
  assert.match(await page.locator(".bd-assortment-sheet-v170").innerText(), /Камера[\s\S]*Галерея[\s\S]*PDF, Excel или CSV[\s\S]*Публичная ссылка/);
  await shot(page, "reference-update-menu-sheet.png");
  await closeSheet(page);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await shot(page, "reference-overview-bottom.png");
  const stickyAudit = await viewportAudit(page, "reference overview scrolled");
  assert.ok(stickyAudit.header.top >= -1 && stickyAudit.header.top <= 1, "mobile: header must remain pinned while scrolling");

  results.push({ name: run.name, viewport: run.viewport, overviewAudit, stickyAudit, keyboardFocus, issues: run.issues });
  await run.context.close();
}

async function hierarchyCountIntegrity(browser) {
  const run = await openPage(browser, {
    viewport: { width: 512, height: 1024 },
    name: "hierarchy-count-integrity",
    extras: { venue: "501", tab: "menu" },
  });
  const { page } = run;
  const before = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) =>
      candidate.startsWith("bd_assortment_v1_cache") && candidate.includes("venue_501")
    );
    if (!key) throw new Error("Assortment fixture key is missing");
    const catalog = JSON.parse(localStorage.getItem(key));
    return {
      key,
      groups: catalog.groups.map((row) => row.id),
      subgroups: catalog.subgroups.map((row) => row.id),
      menuItems: catalog.menuItems.map((row) => row.id),
    };
  });

  for (let index = 0; index < 30; index += 1) {
    const collapsed = page.locator(
      ".bd-assortment-section-toggle-v171[aria-expanded='false'],.bd-assortment-subgroup-toggle-v171[aria-expanded='false']",
    );
    if (await collapsed.count() === 0) break;
    await collapsed.first().click();
  }

  const rendered = await page.evaluate(() => ({
    groups: [...document.querySelectorAll("[data-assortment-section-id]")].map((node) => node.getAttribute("data-assortment-section-id")),
    subgroups: [...document.querySelectorAll("[data-assortment-subsection-id]")].map((node) => node.getAttribute("data-assortment-subsection-id")),
    menuItems: [...document.querySelectorAll("[data-menu-item-id]")].map((node) => node.getAttribute("data-menu-item-id")),
  }));
  const after = await page.evaluate((key) => {
    const catalog = JSON.parse(localStorage.getItem(key));
    return {
      groups: catalog.groups.map((row) => row.id),
      subgroups: catalog.subgroups.map((row) => row.id),
      menuItems: catalog.menuItems.map((row) => row.id),
    };
  }, before.key);

  assert.deepEqual(after.groups, before.groups, "section IDs and order must not change while browsing");
  assert.deepEqual(after.subgroups, before.subgroups, "subsection IDs and order must not change while browsing");
  assert.deepEqual(after.menuItems, before.menuItems, "menu item IDs and order must not change while browsing");
  assert.deepEqual(rendered.groups, before.groups, "top-level section count and order must match catalog data");
  assert.deepEqual(rendered.subgroups, before.subgroups, "subsection count and order must match catalog data");
  assert.deepEqual(rendered.menuItems.sort(), [...before.menuItems].sort(), "rendered menu item count and identity must match catalog data");
  await viewportAudit(page, "hierarchy count integrity");
  results.push({ name: run.name, viewport: run.viewport, before, rendered, issues: run.issues });
  await run.context.close();
}

async function stateFlow(browser, state, viewport, name, assertion) {
  const run = await openPage(browser, { state, viewport, name, extras: state === "venue-b" ? { venue: "502" } : { venue: "501" } });
  const audit = await viewportAudit(run.page, name);
  if (assertion) await assertion(run.page, audit);
  await shot(run.page, `${name}.png`);
  results.push({ name, viewport, audit, issues: run.issues });
  await run.context.close();
}

async function actualVenueSwitch(browser) {
  const run = await openPage(browser, { viewport: { width: 393, height: 852 }, name: "venue-switch", extras: { venue: "501", tab: "menu" } });
  const { page } = run;
  const primaryBar = page.locator("[data-assortment-section-id='bar'] > .bd-assortment-section-toggle-v171");
  await primaryBar.click();
  assert.equal(await primaryBar.getAttribute("aria-expanded"), "true");
  await page.locator("[data-bd-venue-trigger]").click();
  await page.locator(".bd-venue-row").filter({ hasText: "Причал" }).click();
  await page.waitForURL(/venue=502/, { timeout: 20_000 });
  await page.waitForSelector(".bd-assortment-menu-v170");
  const text = await page.locator(".bd-assortment-menu-v170").innerText();
  assert.doesNotMatch(text, /Aperol Spritz/);
  const secondaryBar = page.locator("[data-assortment-section-id='bar'] > .bd-assortment-section-toggle-v171");
  assert.equal(await secondaryBar.getAttribute("aria-expanded"), "false", "accordion state must be isolated per venue");
  await secondaryBar.click();
  await page.locator("[data-assortment-subsection-id] > .bd-assortment-subgroup-toggle-v171").first().click();
  assert.match(await page.locator(".bd-assortment-menu-v170").innerText(), /Домашний лимонад/);
  assert.equal(await page.locator(".bd-assortment-menu-row-v170").count(), 1);
  await viewportAudit(page, "actual venue switch");
  await shot(page, "mobile-venue-switched-b.png");
  results.push({ name: run.name, viewport: run.viewport, issues: run.issues, url: page.url() });
  await run.context.close();
}

async function desktopFlow(browser) {
  const run = await openPage(browser, { viewport: { width: 1440, height: 900 }, name: "desktop", extras: { venue: "501" } });
  const { page } = run;
  const audits = {};
  for (const [tab, selector, file] of [
    ["Обзор", ".bd-assortment-overview-v170", "desktop-overview.png"],
    ["Меню", ".bd-assortment-menu-v170", "desktop-menu.png"],
    ["Техкарты", ".bd-assortment-recipes-v170", "desktop-recipes.png"],
    ["К закупке", ".bd-assortment-needs-v170", "desktop-needs.png"],
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await page.waitForSelector(selector);
    audits[tab] = await viewportAudit(page, `desktop ${tab}`);
    await shot(page, file);
  }
  results.push({ name: run.name, viewport: run.viewport, audits, issues: run.issues });
  await run.context.close();
}

async function withBrowser(run) {
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--no-proxy-server", "--disable-dev-shm-usage"],
  });
  try {
    return await run(browser);
  } finally {
    if (browser.isConnected()) await browser.close();
  }
}

(async () => {
  assert.ok(fs.existsSync(browserPath), `Browser executable not found: ${browserPath}`);
  try {
    await withBrowser((browser) => referenceMobileFlow(browser));
    await withBrowser((browser) => hierarchyCountIntegrity(browser));
    await withBrowser((browser) => stateFlow(browser, "empty", { width: 393, height: 852 }, "mobile-empty", async (page) => {
      assert.match(await page.locator("body").innerText(), /Первичная настройка[\s\S]*Добавить меню/);
      assert.equal(await page.locator(".bd-assortment-summary-v170").count(), 0);
    }));
    await withBrowser((browser) => stateFlow(browser, "incomplete", { width: 393, height: 852 }, "mobile-incomplete", async (page) => {
      assert.match(await page.locator("body").innerText(), /46%[\s\S]*без актуальной цены/);
    }));
    await withBrowser((browser) => stateFlow(browser, "error", { width: 393, height: 852 }, "mobile-error", async (page) => {
      await page.waitForSelector(".bd-assortment-offline-v170");
      assert.match(await page.locator(".bd-assortment-offline-v170").innerText(), /локальные данные/i);
    }));
    await withBrowser((browser) => stateFlow(browser, "readonly", { width: 393, height: 852 }, "mobile-readonly", async (page) => {
      const update = page.getByRole("button", { name: /Обновить меню/ });
      assert.equal(await update.count(), 1);
      assert.equal(await update.isDisabled(), true);
      await page.getByRole("button", { name: "Меню", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Позиция", exact: true }).count(), 0);
      assert.equal(await page.getByRole("button", { name: "Разделы", exact: true }).count(), 0);
    }));
    await withBrowser((browser) => stateFlow(browser, "long", { width: 320, height: 852 }, "mobile-long-320", async (page, audit) => {
      assert.match(await page.locator("body").innerText(), /Центральная площадка с исключительно длинным названием/);
      assert.ok(audit.title.height < 30 && audit.title.width >= 80, "long mobile title must remain visible on one horizontal line");
    }));
    await withBrowser((browser) => stateFlow(browser, "venue-b", { width: 393, height: 852 }, "mobile-venue-b", async (page) => {
      assert.match(await page.locator("body").innerText(), /Причал[\s\S]*100%/);
      assert.doesNotMatch(await page.locator("body").innerText(), /Aperol Spritz/);
    }));
    await withBrowser((browser) => actualVenueSwitch(browser));
    await withBrowser((browser) => desktopFlow(browser));
  } catch (error) {
    failures.push(error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) });
  }

  const unexpectedIssues = results.flatMap((result) => (result.issues || []).map((issue) => ({ run: result.name, ...issue })));
  if (unexpectedIssues.length) failures.push({ message: "Browser console/network issues", issues: unexpectedIssues });
  const summary = {
    version: "assortment-browser-qa-v171",
    generatedAt: new Date().toISOString(),
    baseUrl,
    browser: "Chromium 149 via Playwright",
    deviceScaleFactor: 1,
    results,
    failures,
    passed: failures.length === 0,
  };
  fs.writeFileSync(output("browser-qa.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.passed) process.exit(1);
})();
