/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, devices } = require("playwright-core");

const baseUrl = process.env.BD_QA_BASE_URL || "http://127.0.0.1:4175";
const browserPath = process.env.BD_QA_BROWSER || chromium.executablePath();
const outputDir = path.resolve(process.cwd(), "qa-artifacts/mobile-navigation-v269");
fs.mkdirSync(outputDir, { recursive: true });

const profiles = [
  { name: "iphone-13", descriptor: devices["iPhone 13"], userAgentPattern: /iPhone/ },
  { name: "pixel-7", descriptor: devices["Pixel 7"], userAgentPattern: /Android/ },
];

const permissions = [
  "inventory.view", "inventory.manage", "finance.view", "finance.manage",
  "expenses.create", "team.view", "team.manage", "equipment.view",
  "equipment.manage", "integrations.manage", "settings.manage", "access.manage",
  "data.import", "finance.export", "reviews.view",
];

const venues = [
  { id: 901, workspaceId: "mobile-qa", name: "Mobile QA A", role: "owner", isPrimary: true, status: "active", permissions },
  { id: 902, workspaceId: "mobile-qa", name: "Mobile QA B", role: "owner", isPrimary: false, status: "active", permissions },
];

function profileFor(venueId) {
  return {
    id: "primary",
    name: venueId === 902 ? "Mobile QA B" : "Mobile QA A",
    businessType: "Бар",
    city: "Бендеры",
    currency: venueId === 902 ? "MDL" : "RUB",
    areas: ["Бар", "Кухня"],
  };
}

function assortmentFor(venueId) {
  const suffix = venueId === 902 ? "b" : "a";
  const rows = venueId === 902
    ? [{ key: `stock:coffee-${suffix}|pcs`, productKey: `stock:coffee-${suffix}|pcs`, name: "Кофе Mobile B", current: 8, unit: "pcs", sectionId: "bar", taxonomyCategoryId: "drinks", subcategoryId: "coffee", storageLocationId: "bar-store", packageSize: "1 шт.", kind: "stock", active: true, classificationStatus: "confirmed", averageUnitCost: 20, inventoryValue: 160, currency: "MDL" }]
    : [
        { key: `stock:beer-${suffix}|pcs`, productKey: `stock:beer-${suffix}|pcs`, name: "Пиво Mobile A", current: 20, unit: "pcs", sectionId: "bar", taxonomyCategoryId: "drinks", subcategoryId: "beer", storageLocationId: "bar-fridge", packageSize: "1 шт.", kind: "stock", active: true, classificationStatus: "confirmed", averageUnitCost: 50, inventoryValue: 1000, currency: "RUB" },
        { key: `stock:cola-${suffix}|pcs`, productKey: `stock:cola-${suffix}|pcs`, name: "Coca-Cola Mobile A", current: 12, unit: "pcs", sectionId: "bar", taxonomyCategoryId: "drinks", subcategoryId: "soft", storageLocationId: "bar-fridge", packageSize: "1 шт.", kind: "stock", active: true, classificationStatus: "confirmed", averageUnitCost: 30, inventoryValue: 360, currency: "RUB" },
        { key: `stock:chicken-${suffix}|g`, productKey: `stock:chicken-${suffix}|g`, name: "Куриное филе Mobile A", current: 3000, unit: "g", displayUnit: "kg", sectionId: "kitchen", taxonomyCategoryId: "food", subcategoryId: "meat", storageLocationId: "kitchen-fridge", packageSize: "1 кг", kind: "stock", active: true, classificationStatus: "confirmed", averageUnitCost: 0.4, inventoryValue: 1200, currency: "RUB" },
      ];
  return {
    version: "mobile-qa-v269",
    nomenclatureStructure: {
      sections: [{ id: "bar", name: "Бар", order: 10 }, { id: "kitchen", name: "Кухня", order: 20 }],
      categories: [{ id: "drinks", name: "Напитки", parentId: "bar", order: 10 }, { id: "food", name: "Продукты", parentId: "kitchen", order: 10 }],
      subcategories: [{ id: "beer", name: "Пиво", parentId: "drinks", order: 10 }, { id: "soft", name: "Безалкогольные", parentId: "drinks", order: 20 }, { id: "coffee", name: "Кофе", parentId: "drinks", order: 30 }, { id: "meat", name: "Мясо", parentId: "food", order: 10 }],
      locations: [{ id: "bar-fridge", name: "Холодильник бара", parentId: "bar", order: 10 }, { id: "bar-store", name: "Склад бара", parentId: "bar", order: 20 }, { id: "kitchen-fridge", name: "Холодильник кухни", parentId: "kitchen", order: 10 }],
    },
    nomenclature: rows,
    stockBalances: rows,
    classificationStatus: { status: "ready", updatedAt: "2026-08-24T08:00:00.000Z" },
    updatedAt: "2026-08-24T08:00:00.000Z",
  };
}

function inventoryDocument() {
  const lines = [
    { id: "line-beer", productKey: "stock:beer-a|pcs", productName: "Пиво Mobile A", unit: "pcs", entryUnit: "шт.", entryFactor: 1, packageSize: "1 шт.", sectionId: "bar", sectionName: "Бар", categoryId: "drinks", categoryName: "Напитки", subcategoryId: "beer", subcategoryName: "Пиво", storageLocationId: "bar-fridge", storageLocationName: "Холодильник бара", expected: 20, actual: 19, difference: -1, averageUnitCost: 50, differenceValue: -50, currency: "RUB", valuationKnown: true },
    { id: "line-cola", productKey: "stock:cola-a|pcs", productName: "Coca-Cola Mobile A", unit: "pcs", entryUnit: "шт.", entryFactor: 1, packageSize: "1 шт.", sectionId: "bar", sectionName: "Бар", categoryId: "drinks", categoryName: "Напитки", subcategoryId: "soft", subcategoryName: "Безалкогольные", storageLocationId: "bar-fridge", storageLocationName: "Холодильник бара", expected: 12, actual: null, averageUnitCost: 30, currency: "RUB", valuationKnown: true },
    { id: "line-chicken", productKey: "stock:chicken-a|g", productName: "Куриное филе Mobile A", unit: "g", entryUnit: "кг", entryFactor: 1000, packageSize: "1 кг", sectionId: "kitchen", sectionName: "Кухня", categoryId: "food", categoryName: "Продукты", subcategoryId: "meat", subcategoryName: "Мясо", storageLocationId: "kitchen-fridge", storageLocationName: "Холодильник кухни", expected: 3000, actual: 3000, difference: 0, averageUnitCost: 0.4, differenceValue: 0, currency: "RUB", valuationKnown: true },
  ];
  return {
    id: "inv-mobile-17", internalId: "INV-00017", venueId: 901, number: 17,
    date: "2026-08-24", source: "manual", sourceLabel: "Вручную", status: "counting",
    scope: { type: "all", label: "Весь активный склад", itemCount: 3 },
    accountingCurrency: "RUB", items: lines,
    creator: { accountId: 1, name: "Mobile QA", role: "owner" },
    startedAt: "2026-08-24T08:00:00.000Z", createdAt: "2026-08-24T08:00:00.000Z", updatedAt: "2026-08-24T08:10:00.000Z",
    summary: { totalLines: 3, countedLines: 2, uncountedLines: 1, matchedLines: 1, shortageLines: 1, surplusLines: 0, changedLines: 1, shortageValue: -50, surplusValue: 0, calculatedDifferenceValue: -50, netDifferenceValue: -50, unvaluedDifferenceLines: 0 },
  };
}

function storeData(venueId) {
  return {
    bd_assortment_v1: assortmentFor(venueId),
    bd_inventory_snapshots: venueId === 901 ? [inventoryDocument()] : [],
    bd_stock_movements: [],
    bd_finance_settings: { inventoryFrequency: "monthly", customFrequencyDays: 30, inventorySections: ["Бар", "Кухня"], taxModel: { mode: "fixed", amount: 0 }, utilityModel: { mode: "fixed", amount: 0 }, updatedAt: "2026-08-24T08:00:00.000Z" },
  };
}

function jsonResponse(value, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(value) };
}

async function createRun(browser, profile, label, options = {}) {
  const state = { activeVenueId: options.venueId || 901, stores: { 901: storeData(901), 902: storeData(902) } };
  const context = await browser.newContext({
    ...profile.descriptor,
    locale: "ru-RU",
    timezoneId: "Europe/Chisinau",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await context.addInitScript(({ permissions: allowed, venues: venueList, snapshots, assortments }) => {
    const email = "mobile-qa@bardoctor.local";
    localStorage.setItem("bd_session", email);
    localStorage.setItem("bd_session_token", "mobile-qa-token");
    localStorage.setItem("bd_session_userid", "mobile-qa-user");
    localStorage.setItem("bd_active_venue_id", "901");
    localStorage.setItem("bd_active_venue_is_primary", "1");
    localStorage.setItem("bd_active_role", "owner");
    localStorage.setItem("bd_active_permissions", JSON.stringify(allowed));
    localStorage.setItem("bd_venue_context__" + email, JSON.stringify({ activeVenueId: 901, activeWorkspaceId: "mobile-qa", canCreateVenues: true, venues: venueList }));
    for (const venueId of [901, 902]) {
      const scope = `__${email}__venue_${venueId}`;
      const restaurant = { id: "primary", name: venueId === 902 ? "Mobile QA B" : "Mobile QA A", businessType: "Бар", city: "Бендеры", currency: venueId === 902 ? "MDL" : "RUB", areas: ["Бар", "Кухня"] };
      localStorage.setItem("bd_restaurant_cache" + scope, JSON.stringify(restaurant));
      localStorage.setItem("bd_assortment_v1_cache" + scope, JSON.stringify(assortments[String(venueId)]));
      localStorage.setItem("bd_inventory_snapshots_cache" + scope, JSON.stringify(snapshots[String(venueId)]));
      localStorage.setItem("bd_stock_movements_cache" + scope, "[]");
    }
    localStorage.setItem("bd_restaurant_profile__" + email, JSON.stringify({ id: "primary", name: "Mobile QA A", businessType: "Бар", city: "Бендеры", currency: "RUB", areas: ["Бар", "Кухня"] }));
  }, {
    permissions,
    venues,
    snapshots: { 901: [inventoryDocument()], 902: [] },
    assortments: { 901: assortmentFor(901), 902: assortmentFor(902) },
  });

  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const activeProfile = profileFor(state.activeVenueId);
    if (url.pathname === "/api/auth/bootstrap") {
      return route.fulfill(jsonResponse({ ok: true, email: "mobile-qa@bardoctor.local", userId: "mobile-qa-user", token: "mobile-qa-token", firstName: "Mobile", lastName: "QA", role: "owner", permissions, activeVenueId: state.activeVenueId, activeWorkspaceId: "mobile-qa", activeVenueIsPrimary: state.activeVenueId === 901, canCreateVenues: true, venues }));
    }
    if (url.pathname === "/api/restaurants/me") return route.fulfill(jsonResponse({ ok: true, restaurant: activeProfile }));
    if (url.pathname === "/api/users/me") return route.fulfill(jsonResponse({ ok: true, user: { firstName: "Mobile", lastName: "QA", email: "mobile-qa@bardoctor.local", role: "owner", permissions } }));
    if (url.pathname === "/api/migrate") return route.fulfill(jsonResponse({ ok: true, imported: [], skipped: [] }));
    if (url.pathname === "/api/access/active-venue" && method === "POST") {
      const body = request.postDataJSON();
      state.activeVenueId = Number(body.venueId) || 901;
      return route.fulfill(jsonResponse({ ok: true, activeVenueId: state.activeVenueId, activeWorkspaceId: "mobile-qa", activeVenueIsPrimary: state.activeVenueId === 901, role: "owner", permissions }));
    }
    if (url.pathname === "/api/store" && method === "GET") {
      const entries = Object.fromEntries(Object.entries(state.stores[state.activeVenueId]).map(([key, data]) => [key, { data, updatedAt: "2026-08-24T08:00:00.000Z" }]));
      return route.fulfill(jsonResponse({ ok: true, entries }));
    }
    if (url.pathname.startsWith("/api/store/")) {
      const key = decodeURIComponent(url.pathname.slice("/api/store/".length));
      if (method === "PUT") {
        const body = request.postDataJSON();
        state.stores[state.activeVenueId][key] = body.data;
      }
      return route.fulfill(jsonResponse({ ok: true, data: state.stores[state.activeVenueId][key] ?? null }));
    }
    if (url.pathname === "/api/inventory/products") return route.fulfill(jsonResponse({ ok: true, assortment: state.stores[state.activeVenueId].bd_assortment_v1, duplicateRepair: { changed: false } }));
    if (url.pathname === "/api/inventory/counts") {
      const document = state.stores[state.activeVenueId].bd_inventory_snapshots.find((item) => item.id === url.searchParams.get("id"));
      if (url.searchParams.get("format") === "print") {
        const returnUrl = `/warehouse?venue=${state.activeVenueId}&tab=counts&inventory=${encodeURIComponent(document?.id || "")}`;
        return route.fulfill({ status: document ? 200 : 404, contentType: "text/html; charset=utf-8", body: `<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Инвентаризация № 17</title></head><body><header style="position:sticky;top:0"><a href="${returnUrl}">← Назад</a><button onclick="window.print()">Печать / PDF</button></header><main><h1>Инвентаризационная ведомость № 17</h1><p>${activeProfile.name}</p></main></body></html>` });
      }
      if (url.searchParams.get("id")) return route.fulfill(jsonResponse(document ? { ok: true, venueId: state.activeVenueId, inventory: document } : { ok: false, error: "Инвентаризация не найдена" }, document ? 200 : 404));
      return route.fulfill(jsonResponse({ ok: true, venueId: state.activeVenueId, accountingCurrency: activeProfile.currency, scopes: [{ type: "all", label: "Весь активный склад", itemCount: state.activeVenueId === 901 ? 3 : 1 }], inventories: state.stores[state.activeVenueId].bd_inventory_snapshots }));
    }
    return route.continue();
  });

  const page = await context.newPage();
  const issues = [];
  page.on("pageerror", (error) => issues.push({ type: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error" && !/401 \(Unauthorized\)|Failed to load resource/.test(message.text())) issues.push({ type: "console", url: page.url(), location: message.location(), message: message.text() });
  });
  return { context, page, state, profile, label, issues };
}

async function goto(page, pathName) {
  const response = await page.goto(`${baseUrl}${pathName}`, { waitUntil: "networkidle", timeout: 60_000 });
  assert.equal(response?.status(), 200, `${pathName}: expected HTTP 200`);
  await page.waitForTimeout(150);
  assert.notEqual(new URL(page.url()).pathname, "/login", `${pathName}: unexpected login redirect`);
}

async function mobileAudit(page, profileName, label, options = {}) {
  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const visible = [...document.querySelectorAll("button,a,input,select,textarea")].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const critical = visible.filter((node) => node.matches("bd-app-header button,bd-app-header a,[data-bd-primary-navigation] a,[data-bd-primary-navigation] button,[data-bd-bottom-nav] a,[data-bd-bottom-nav] button,.bd-inventory-head-v245 button,.bd-inventory-actions-v245 button,.bd-warehouse-tabs button"));
    const bottomCandidates = [...document.querySelectorAll("[data-bd-bottom-nav],nav.fixed")];
    if (bottomCandidates.length === 0) bottomCandidates.push(...document.querySelectorAll("[data-bd-primary-navigation]"));
    const bottom = bottomCandidates.filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    });
    return {
      width: innerWidth,
      height: innerHeight,
      screenWidth: screen.width,
      maxTouchPoints: navigator.maxTouchPoints,
      coarsePointer: matchMedia("(pointer: coarse)").matches,
      userAgent: navigator.userAgent,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      bodyOverflow: getComputedStyle(document.body).overflow,
      headers: [...document.querySelectorAll("bd-app-header")].filter((node) => getComputedStyle(node).display !== "none").length,
      bottomLayers: bottom.length,
      bottomDetails: bottom.map((node) => ({ tag: node.tagName, className: String(node.className), marker: node.getAttribute("data-bd-bottom-nav") || node.getAttribute("data-bd-primary-navigation") || "" })),
      undersizedCritical: critical.map((node) => {
        const rect = node.getBoundingClientRect();
        return { label: node.getAttribute("aria-label") || node.textContent.trim().slice(0, 50), width: rect.width, height: rect.height };
      }).filter((item) => item.width < 36 || item.height < 36),
      viewportMeta: document.querySelector('meta[name="viewport"]')?.content || "",
    };
  });
  assert.ok(audit.maxTouchPoints > 0, `${profileName}/${label}: touch emulation is inactive`);
  assert.ok(audit.coarsePointer, `${profileName}/${label}: pointer is not coarse`);
  assert.ok(audit.scrollWidth <= audit.clientWidth + 1, `${profileName}/${label}: horizontal overflow ${audit.scrollWidth}/${audit.clientWidth}`);
  assert.match(audit.viewportMeta, /width=device-width/, `${profileName}/${label}: viewport meta missing`);
  assert.deepEqual(audit.undersizedCritical, [], `${profileName}/${label}: critical touch target below 36px`);
  assert.ok(audit.headers <= 1, `${profileName}/${label}: duplicate canonical headers`);
  assert.ok(audit.bottomLayers <= 1, `${profileName}/${label}: duplicate bottom navigation ${JSON.stringify(audit.bottomDetails)}`);
  if (options.fullscreen) assert.equal(audit.bottomLayers, 0, `${profileName}/${label}: bottom navigation visible inside fullscreen ${JSON.stringify(audit.bottomDetails)}`);
  return audit;
}

async function closeRun(run) {
  assert.deepEqual(run.issues, [], `${run.profile.name}/${run.label}: browser errors`);
  await run.context.close();
}

async function inventoryFlow(browser, profile) {
  const run = await createRun(browser, profile, "inventory-fullscreen");
  const { page } = run;
  await goto(page, "/warehouse?venue=901&tab=counts");
  await page.getByRole("button", { name: /Инвентаризация № 17/ }).click();
  await page.waitForSelector(".bd-inventory-layer-v246");
  assert.equal(new URL(page.url()).searchParams.get("inventory"), "inv-mobile-17");
  await mobileAudit(page, profile.name, "inventory-open", { fullscreen: true });
  const layer = await page.evaluate(() => {
    const header = document.querySelector(".bd-inventory-head-v245").getBoundingClientRect();
    const print = document.querySelector(".bd-inventory-head-v245 button[aria-label='Печатная ведомость']").getBoundingClientRect();
    const close = document.querySelector(".bd-inventory-head-v245 button[aria-label='Закрыть']").getBoundingClientRect();
    const owner = document.querySelector(".bd-inventory-body-v245");
    const ownerStyle = getComputedStyle(owner);
    const appHeader = document.querySelector("bd-app-header");
    return { header: { top: header.top, bottom: header.bottom }, print: { top: print.top, bottom: print.bottom, right: print.right }, close: { top: close.top, bottom: close.bottom, right: close.right }, ownerOverflow: ownerStyle.overflowY, appHeaderVisible: appHeader ? getComputedStyle(appHeader).display !== "none" : false, bodyOverflow: getComputedStyle(document.body).overflow };
  });
  assert.equal(layer.appHeaderVisible, false, `${profile.name}: Warehouse header leaked into inventory`);
  assert.equal(layer.bodyOverflow, "hidden", `${profile.name}: body must be scroll-locked in inventory`);
  assert.ok(layer.print.top >= layer.header.top && layer.print.bottom <= layer.header.bottom + 1, `${profile.name}: Print left inventory header`);
  assert.ok(layer.close.right <= profile.descriptor.viewport.width + 1, `${profile.name}: Close clipped by viewport`);
  const body = page.locator(".bd-inventory-body-v245");
  await body.evaluate((node) => { node.scrollTop = Math.max(1, node.scrollHeight - node.clientHeight); });
  assert.ok(await body.evaluate((node) => node.scrollTop > 0), `${profile.name}: fullscreen inventory does not own scrolling`);

  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.waitForSelector(".bd-inventory-layer-v246", { state: "detached" });
  assert.equal(new URL(page.url()).searchParams.get("inventory"), null);
  assert.equal(new URL(page.url()).searchParams.get("tab"), "counts");
  await page.waitForFunction(() => getComputedStyle(document.body).overflow !== "hidden");
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden", `${profile.name}: body scroll lock leaked after Close`);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("bd-inventory-overlay-open-v246") || document.body.classList.contains("bd-inventory-overlay-open-v246")), false, `${profile.name}: inventory scroll-lock class leaked after Close`);

  await page.getByRole("button", { name: /Инвентаризация № 17/ }).click();
  await page.waitForSelector(".bd-inventory-layer-v246");
  await page.goBack();
  await page.waitForSelector(".bd-inventory-layer-v246", { state: "detached" });
  assert.equal(new URL(page.url()).searchParams.get("tab"), "counts");

  await goto(page, "/warehouse?venue=901&tab=counts&inventory=inv-mobile-17");
  await page.waitForSelector(".bd-inventory-layer-v246");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".bd-inventory-layer-v246");
  assert.equal(new URL(page.url()).searchParams.get("inventory"), "inv-mobile-17");
  assert.notEqual(new URL(page.url()).searchParams.get("inventory"), "new");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Печатная ведомость", exact: true }).click();
  const printPage = await popupPromise;
  await printPage.waitForLoadState("domcontentloaded");
  assert.match(await printPage.locator("body").textContent(), /Инвентаризационная ведомость № 17/);
  await printPage.getByRole("link", { name: /Назад/ }).click();
  await printPage.waitForLoadState("networkidle");
  assert.equal(new URL(printPage.url()).searchParams.get("venue"), "901");
  assert.equal(new URL(printPage.url()).searchParams.get("inventory"), "inv-mobile-17");
  await printPage.close();

  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.locator("[data-bd-venue-trigger]").click();
  await page.waitForSelector("[data-bd-venue-sheet]");
  await page.locator(".bd-venue-row").filter({ hasText: "Mobile QA B" }).click();
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => localStorage.getItem("bd_active_venue_id")), "902");
  assert.equal(new URL(page.url()).searchParams.get("inventory"), null, `${profile.name}: inventory leaked across venue switch`);
  assert.equal(await page.locator(".bd-inventory-layer-v246").count(), 0);
  assert.doesNotMatch(await page.locator("body").textContent(), /Инвентаризация № 17/);
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true };
}

async function nomenclatureFlow(browser, profile) {
  const run = await createRun(browser, profile, "warehouse-nomenclature");
  const { page } = run;
  await goto(page, "/warehouse?venue=901");
  await mobileAudit(page, profile.name, "warehouse");
  await page.getByRole("button", { name: "Номенклатура", exact: true }).click();
  await page.waitForURL(/\/nomenclature/);
  const search = page.getByLabel(/Найти.*номенклатур|Поиск/i).or(page.getByPlaceholder(/Найти|Поиск/i)).first();
  await search.fill("Пиво");
  await page.waitForTimeout(100);
  assert.equal(new URL(page.url()).searchParams.get("q"), "Пиво");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await search.inputValue(), "Пиво");
  await mobileAudit(page, profile.name, "nomenclature-search");
  const back = page.locator("bd-app-header button[aria-label='Вернуться назад']").first();
  await back.click();
  await page.waitForURL(/\/warehouse/);
  assert.equal(new URL(page.url()).searchParams.get("venue"), "901");
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true };
}

async function shiftsFlow(browser, profile) {
  const closeRunState = await createRun(browser, profile, "shifts-close");
  let page = closeRunState.page;
  await goto(page, "/?venue=901");
  await goto(page, "/shifts?venue=901");
  await mobileAudit(page, profile.name, "shifts-list");
  let shift = page.getByRole("button", { name: /Смена не заполнена/ }).first();
  const listUrl = page.url();
  await shift.click();
  let detail = page.locator(".bd-shift-view[role='dialog']");
  await detail.waitFor();
  assert.equal(page.url(), listUrl, `${profile.name}: shift modal changed the list URL`);
  await mobileAudit(page, profile.name, "shift-detail-modal");
  await detail.locator("button.bd-shift-view-close[aria-label='Закрыть']").click();
  await detail.waitFor({ state: "detached" });
  assert.equal(page.url(), listUrl, `${profile.name}: closing shift modal changed list context`);
  await closeRun(closeRunState);

  const refreshRunState = await createRun(browser, profile, "shifts-refresh");
  page = refreshRunState.page;
  await goto(page, "/shifts?venue=901");
  shift = page.getByRole("button", { name: /Смена не заполнена/ }).first();
  await shift.click();
  detail = page.locator(".bd-shift-view[role='dialog']");
  await detail.waitFor();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await detail.count(), 0, `${profile.name}: transient shift modal survived refresh`);
  assert.equal(new URL(page.url()).pathname, "/shifts", `${profile.name}: refresh lost the shift list`);
  await closeRun(refreshRunState);

  const backRunState = await createRun(browser, profile, "shifts-browser-back");
  page = backRunState.page;
  await goto(page, "/?venue=901");
  await goto(page, "/shifts?venue=901");
  shift = page.getByRole("button", { name: /Смена не заполнена/ }).first();
  await shift.click();
  detail = page.locator(".bd-shift-view[role='dialog']");
  await detail.waitFor();
  await page.waitForFunction(() => Boolean(history.state && history.state.bdTransientLayer));
  await page.goBack();
  await detail.waitFor({ state: "detached" });
  assert.equal(new URL(page.url()).pathname, "/shifts", `${profile.name}: browser Back did not return to the shift list`);
  await closeRun(backRunState);
  return { profile: profile.name, scenario: "shifts", passed: true };
}

async function procurementFlow(browser, profile) {
  const run = await createRun(browser, profile, "suppliers-purchases");
  const { page } = run;
  await goto(page, "/suppliers?qaProcurement=default&venue=401");
  await page.waitForSelector(".bd-proc-command-v168");
  const procurementTabs = page.locator(".bd-proc-tabs-v168 button");
  const procurementLabels = (await procurementTabs.allTextContents()).map((label) => label.trim());
  assert.ok(procurementLabels.some((label) => label.startsWith("Закупки")), `${profile.name}: procurement tabs missing: ${JSON.stringify(procurementLabels)}`);
  await procurementTabs.filter({ hasText: "Закупки" }).click();
  const row = page.locator(".bd-proc-purchase-row-v168").first();
  await row.locator(".bd-proc-purchase-main-v168").click();
  await page.waitForSelector(".bd-proc-sheet-v168");
  assert.ok(new URL(page.url()).searchParams.has("documentId"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".bd-proc-sheet-v168");
  await page.locator(".bd-proc-sheet-v168 button[aria-label='Закрыть']").last().click();
  await page.waitForSelector(".bd-proc-sheet-v168", { state: "detached" });
  assert.equal(new URL(page.url()).searchParams.has("documentId"), false);
  await procurementTabs.filter({ hasText: "Поставщики" }).click();
  await page.locator(".bd-proc-supplier-row-v168").first().click();
  assert.ok(new URL(page.url()).searchParams.has("supplierId"));
  await page.goBack();
  await page.waitForSelector(".bd-proc-sheet-v168", { state: "detached" });
  await mobileAudit(page, profile.name, "procurement");
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true };
}

async function assortmentFlow(browser, profile) {
  const run = await createRun(browser, profile, "menu-tech-cards");
  const { page } = run;
  await goto(page, "/catalog?qaAssortment=default");
  await page.waitForSelector(".bd-assortment-command-v170");
  const assortmentTabs = page.locator(".bd-assortment-tabs-v170 button");
  const assortmentLabels = (await assortmentTabs.allTextContents()).map((label) => label.trim());
  assert.ok(assortmentLabels.includes("Меню") && assortmentLabels.includes("Техкарты"), `${profile.name}: assortment tabs missing: ${JSON.stringify(assortmentLabels)}`);
  if (process.env.BD_QA_DEBUG) {
    const rects = await assortmentTabs.evaluateAll((nodes) => nodes.map((node) => ({ text: node.textContent.trim(), rect: node.getBoundingClientRect().toJSON(), header: node.closest("header")?.getBoundingClientRect().toJSON() })));
    process.stderr.write(`[mobile-qa] assortment rects ${JSON.stringify(rects)}\n`);
  }
  await assortmentTabs.filter({ hasText: "Меню" }).click();
  const section = page.locator(".bd-assortment-section-toggle-v171").first();
  await section.click();
  const subgroup = page.locator(".bd-assortment-subgroup-toggle-v171").first();
  await subgroup.click();
  const item = page.locator(".bd-assortment-menu-row-v170").first();
  await item.click();
  await page.waitForSelector(".bd-assortment-sheet-v170.detail");
  assert.ok(new URL(page.url()).searchParams.has("itemId"));
  await page.goBack();
  await page.waitForSelector(".bd-assortment-sheet-v170", { state: "detached" });
  await assortmentTabs.filter({ hasText: "Техкарты" }).click();
  await mobileAudit(page, profile.name, "menu-tech-cards");
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true };
}

async function moduleSmokeFlow(browser, profile) {
  const run = await createRun(browser, profile, "critical-modules");
  const { page } = run;
  const routes = [
    ["/home?venue=901", /Заведение под контролем|Главная|AI/i],
    ["/analysis?venue=901", /AI Доктор|Анализ/i],
    ["/opportunities?venue=901", /возможност/i],
    ["/finance?venue=901", /Финанс/i],
    ["/employees?venue=901", /Команда/i],
    ["/equipment?qaEquipment=default", /Оборудован/i],
    ["/reports?qaReport=closed&month=2026-07", /Отч[её]т|Июль/i],
    ["/data-control?venue=901", /Контроль данных/i],
    ["/integrations?venue=901", /Интеграц/i],
    ["/notifications?venue=901", /Уведомлен/i],
    ["/settings?venue=901", /Настройк/i],
    ["/profile?venue=901", /Профиль|заведени/i],
  ];
  for (const [route, expected] of routes) {
    await goto(page, route);
    assert.match(await page.locator("body").textContent(), expected, `${profile.name}/${route}: expected module content missing`);
    if (process.env.BD_QA_DEBUG) {
      const controls = await page.locator("button,a,input,select").evaluateAll((nodes) => nodes.filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      }).map((node) => ({ tag: node.tagName, text: (node.getAttribute("aria-label") || node.textContent || node.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 70), className: String(node.className).slice(0, 80) })).slice(0, 35));
      process.stderr.write(`[mobile-qa] controls ${route} ${JSON.stringify(controls)}\n`);
    }
    await mobileAudit(page, profile.name, route);
    await page.reload({ waitUntil: "networkidle" });
    assert.notEqual(new URL(page.url()).pathname, "/login", `${profile.name}/${route}: refresh lost session`);
  }
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true, routes: routes.map(([route]) => route) };
}

async function embeddedModulesFlow(browser, profile) {
  const run = await createRun(browser, profile, "embedded-modules");
  const { page } = run;

  await goto(page, "/data-control?venue=901");
  let frame = page.frameLocator("iframe");
  await frame.locator("[data-tab='journal']").click();
  await page.waitForURL(/tab=journal/);
  await frame.locator("[data-tab='periods']").click();
  await page.waitForURL(/tab=periods/);
  await page.goBack();
  await page.waitForURL(/tab=journal/);

  await mobileAudit(page, profile.name, "embedded-data-control");
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true };
}

async function formCloseFlow(browser, profile) {
  const run = await createRun(browser, profile, "critical-form-close");
  const { page } = run;

  await goto(page, "/employees?venue=901");
  await page.getByRole("button", { name: "Добавить сотрудника", exact: true }).first().click();
  const employeeClose = page.getByRole("button", { name: "Закрыть форму", exact: true });
  await employeeClose.waitFor();
  await employeeClose.click();
  await employeeClose.waitFor({ state: "detached" });

  await goto(page, "/profile?venue=901");
  await page.getByRole("button", { name: "Редактировать данные заведения", exact: true }).click();
  const venueClose = page.getByRole("button", { name: "Закрыть редактирование заведения", exact: true });
  await venueClose.waitFor();
  await venueClose.click();
  await venueClose.waitFor({ state: "detached" });
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden", `${profile.name}: form Close leaked body scroll lock`);
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true };
}

async function runProfile(browser, profile) {
  assert.ok(profile.descriptor.isMobile, `${profile.name}: Playwright descriptor is not mobile`);
  assert.ok(profile.descriptor.hasTouch, `${profile.name}: Playwright descriptor has no touch`);
  assert.match(profile.descriptor.userAgent, profile.userAgentPattern);
  const results = [];
  for (const [name, flow] of [
    ["inventory-fullscreen", inventoryFlow],
    ["warehouse-nomenclature", nomenclatureFlow],
    ["shifts", shiftsFlow],
    ["suppliers-purchases", procurementFlow],
    ["menu-tech-cards", assortmentFlow],
    ["embedded-modules", embeddedModulesFlow],
    ["critical-form-close", formCloseFlow],
    ["critical-modules", moduleSmokeFlow],
  ]) {
    if (process.env.BD_QA_SCENARIO && process.env.BD_QA_SCENARIO !== name) continue;
    process.stderr.write(`[mobile-qa] ${profile.name}/${name}\n`);
    results.push(await flow(browser, profile));
  }
  return results;
}

(async () => {
  assert.ok(fs.existsSync(browserPath), `Playwright browser executable not found: ${browserPath}`);
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-proxy-server"],
  });
  const results = [];
  const failures = [];
  try {
    for (const profile of profiles) {
      if (process.env.BD_QA_PROFILE && process.env.BD_QA_PROFILE !== profile.name) continue;
      results.push(...await runProfile(browser, profile));
    }
  } catch (error) {
    failures.push(error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) });
    process.stderr.write(`[mobile-qa] failure: ${failures[failures.length - 1].message}\n`);
  } finally {
    await browser.close();
  }
  const summary = {
    version: "mobile-navigation-qa-v269",
    generatedAt: new Date().toISOString(),
    baseUrl,
    browserPath,
    profiles: profiles.map((profile) => ({ name: profile.name, viewport: profile.descriptor.viewport, screen: profile.descriptor.screen, deviceScaleFactor: profile.descriptor.deviceScaleFactor, isMobile: profile.descriptor.isMobile, hasTouch: profile.descriptor.hasTouch, userAgent: profile.descriptor.userAgent })),
    results,
    failures,
    passed: failures.length === 0,
  };
  fs.writeFileSync(path.join(outputDir, "mobile-navigation-qa.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.passed) process.exit(1);
})();
