/* eslint-disable @typescript-eslint/no-require-imports */
// Loopback-only acceptance harness: every API call is intercepted and all writes stay in memory.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { chromium } = require("playwright-core");
const { chromiumArgs, resolveBrowserExecutable } = require("./browser-runtime.cjs");

const projectRoot = path.resolve(__dirname, "..");
const qaPort = Number(process.env.BD_QA_PORT || 4178);
const configuredBaseUrl = process.env.BD_QA_BASE_URL || "";
const outputDir = process.env.BD_QA_OUTPUT
  || path.join(os.tmpdir(), "bardoctor-menu-consumption-v418-qa");
const activeVenueId = 801;
const passiveVenueId = 802;
const longKozelProductName = "Пиво Kozel Dark бутылка 0.5 — длинное контрольное название для проверки адаптивной строки SKU-KOZEL-DARK-0500-VERY-LONG-REFERENCE";
const permissions = [
  "inventory.view",
  "inventory.manage",
  "expenses.create",
  "finance.view",
  "finance.manage",
  "data.import",
  "integrations.manage",
  "settings.manage",
];
const session = {
  email: "menu-consumption-v418-qa@bardoctor.local",
  token: "menu-consumption-v418-qa-token",
  userId: "menu-consumption-v418-qa-user",
};
const venues = [
  {
    id: activeVenueId,
    workspaceId: "menu-consumption-v418-primary",
    name: "QA Бар",
    role: "owner",
    permissions,
    status: "active",
    isPrimary: true,
    currency: "RUB",
  },
  {
    id: passiveVenueId,
    workspaceId: "menu-consumption-v418-passive",
    name: "QA Второе заведение",
    role: "owner",
    permissions,
    status: "active",
    isPrimary: false,
    currency: "RUB",
  },
];

fs.mkdirSync(outputDir, { recursive: true });

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function nomenclatureStructure() {
  return {
    sections: [
      { id: "stock-bar", name: "Бар", order: 10, active: true },
    ],
    categories: [
      { id: "drinks", name: "Напитки", parentId: "stock-bar", order: 10, active: true },
    ],
    subcategories: [
      { id: "beer", name: "Пиво", parentId: "drinks", order: 10, active: true },
      { id: "coffee", name: "Кофе", parentId: "drinks", order: 20, active: true },
    ],
    locations: [],
  };
}

function buildAssortment(venueId) {
  const suffix = String(venueId);
  const product = (id, productKey, name, unit, packageSize, current) => ({
    id: `${id}-${suffix}`,
    nomenclatureItemId: `${id}-${suffix}`,
    productKey: `${productKey}:${suffix}`,
    key: `${productKey}:${suffix}`,
    venueId,
    name,
    unit,
    baseUnit: unit,
    packageSize,
    active: true,
    kind: "stock",
    current,
    quantity: current,
    currency: "RUB",
  });
  const oldReadyProduct = product("nom-old-ready", "stock:old-ready", "Старая складская связь", "pcs", "1 шт.", 10);
  const kozelProduct = product("nom-kozel", "stock:kozel", longKozelProductName, "pcs", "1 шт.", 24);
  const coffeeProduct = product("nom-coffee", "stock:coffee", "Coffee beans", "g", "1 кг", 1000);

  return {
    version: 2,
    venueId,
    horizonDays: 7,
    groups: [
      { id: "bar", name: "Бар", legacyDepartment: "bar", sortOrder: 0 },
    ],
    subgroups: [
      { id: "bar-main", groupId: "bar", name: "Основное", sortOrder: 0 },
    ],
    nomenclatureStructure: nomenclatureStructure(),
    nomenclature: [oldReadyProduct, kozelProduct, coffeeProduct],
    stockBalances: [clone(oldReadyProduct), clone(kozelProduct), clone(coffeeProduct)],
    menuItems: [
      {
        id: `menu-kozel-${suffix}`,
        venueId,
        name: "Kozel Dark 0.5",
        groupId: "bar",
        subgroupId: "bar-main",
        sectionId: "stock-bar",
        taxonomyCategoryId: "drinks",
        subcategoryId: "beer",
        department: "bar",
        category: "Основное",
        type: "ready",
        consumptionMode: "DIRECT_ITEM",
        readyProduct: {
          nomenclatureItemId: oldReadyProduct.id,
          productKey: oldReadyProduct.key,
          packagesPerSale: 1,
        },
        salePrice: 100,
        currency: "RUB",
        active: true,
        plannedSales: 0,
        createdAt: "2026-09-08T08:00:00.000Z",
        updatedAt: "2026-09-08T08:00:00.000Z",
      },
      {
        id: `menu-espresso-${suffix}`,
        venueId,
        name: "Espresso",
        groupId: "bar",
        subgroupId: "bar-main",
        sectionId: "stock-bar",
        taxonomyCategoryId: "drinks",
        subcategoryId: "coffee",
        department: "bar",
        category: "Основное",
        type: "composite",
        consumptionMode: "RECIPE",
        salePrice: 150,
        currency: "RUB",
        active: true,
        plannedSales: 0,
        createdAt: "2026-09-08T08:00:00.000Z",
        updatedAt: "2026-09-08T08:00:00.000Z",
      },
      {
        id: `menu-recipe-review-${suffix}`,
        venueId,
        name: `Legacy recipe review ${suffix}`,
        groupId: "bar",
        subgroupId: "bar-main",
        sectionId: "stock-bar",
        taxonomyCategoryId: "drinks",
        subcategoryId: "coffee",
        department: "bar",
        category: "Основное",
        type: "composite",
        consumptionMode: "RECIPE",
        salePrice: 175,
        currency: "RUB",
        active: true,
        plannedSales: 0,
        createdAt: "2026-09-08T08:00:00.000Z",
        updatedAt: "2026-09-08T08:00:00.000Z",
      },
    ],
    recipes: [
      {
        id: `recipe-espresso-${suffix}`,
        menuItemId: `menu-espresso-${suffix}`,
        ownerId: `menu-espresso-${suffix}`,
        ownerType: "menu_item",
        venueId,
        status: "confirmed",
        reviewStatus: "approved",
        lifecycleStatus: "current",
        current: true,
        currentDraft: false,
        source: "manual",
        version: 1,
        ingredients: [
          {
            id: `ingredient-coffee-${suffix}`,
            venueId,
            name: "Coffee beans",
            quantity: 8,
            unit: "г",
            normalizedQuantity: 8,
            normalizedUnit: "g",
            unitResolutionStatus: "exact_compatible",
            resolutionStatus: "linked_ready",
            linkStatus: "linked",
            purchaseProductKey: coffeeProduct.key,
            nomenclatureItemId: coffeeProduct.id,
            matchedBaseUnit: "g",
          },
        ],
        warnings: [],
        createdAt: "2026-09-08T08:00:00.000Z",
        updatedAt: "2026-09-08T08:00:00.000Z",
      },
      {
        id: `recipe-review-a-${suffix}`,
        name: "Техкарта A — оставить в истории",
        menuItemId: `menu-recipe-review-${suffix}`,
        ownerId: `menu-recipe-review-${suffix}`,
        ownerType: "menu_item",
        venueId,
        status: "confirmed",
        reviewStatus: "approved",
        lifecycleStatus: "current",
        current: true,
        currentDraft: false,
        source: "manual",
        version: 1,
        ingredients: [],
        warnings: [],
        createdAt: "2026-09-08T08:00:00.000Z",
        updatedAt: "2026-09-08T08:00:00.000Z",
      },
      {
        id: `recipe-review-b-${suffix}`,
        name: "Техкарта B — сделать активной",
        menuItemId: `menu-recipe-review-${suffix}`,
        ownerId: `menu-recipe-review-${suffix}`,
        ownerType: "menu_item",
        venueId,
        status: "draft",
        reviewStatus: "requires_review",
        lifecycleStatus: "current",
        current: true,
        currentDraft: true,
        source: "manual",
        version: 2,
        ingredients: [],
        warnings: [],
        createdAt: "2026-09-08T08:30:00.000Z",
        updatedAt: "2026-09-08T08:30:00.000Z",
      },
    ],
    internalItems: [],
    priceHistory: [],
    sources: [],
    supplierProductMappings: [],
    updatedAt: "2026-09-08T08:00:00.000Z",
  };
}

function buildHistoricalSales(venueId) {
  const suffix = String(venueId);
  return [
    {
      id: `confirmed-sale-${suffix}`,
      venueId,
      status: "confirmed",
      confirmedAt: "2026-09-01T20:00:00.000Z",
      lines: [
        {
          id: `confirmed-sale-line-${suffix}`,
          menuItemId: `menu-kozel-${suffix}`,
          quantity: 2,
          salePriceSnapshot: 100,
          inventoryCostSnapshot: 42,
          consumptionSnapshot: {
            mode: "DIRECT_ITEM",
            nomenclatureItemId: `nom-old-ready-${suffix}`,
            productKey: `stock:old-ready:${suffix}`,
            quantityPerSale: 1,
            unit: "pcs",
          },
        },
      ],
    },
  ];
}

function createMutableState() {
  return {
    activeVenueId,
    stores: new Map([
      [activeVenueId, new Map([
        ["bd_assortment_v1", buildAssortment(activeVenueId)],
        ["bd_finance_revenue", []],
        ["bd_finance_expenses", []],
        ["bd_finance_gap_reasons", []],
        ["bd_purchase_documents", []],
        ["bd_sales_documents", buildHistoricalSales(activeVenueId)],
      ])],
      [passiveVenueId, new Map([
        ["bd_assortment_v1", buildAssortment(passiveVenueId)],
        ["bd_finance_revenue", []],
        ["bd_finance_expenses", []],
        ["bd_finance_gap_reasons", []],
        ["bd_purchase_documents", []],
        ["bd_sales_documents", buildHistoricalSales(passiveVenueId)],
      ])],
    ]),
    writes: [],
    reads: [],
    requests: [],
    venueSwitches: [],
    externalRequests: [],
    unexpectedRequests: [],
    unexpectedMutations: [],
  };
}

function catalogFor(state, venueId = activeVenueId) {
  return state.stores.get(venueId).get("bd_assortment_v1");
}

function storeReadCount(state, venueId, storeKey) {
  return state.reads.filter((read) => (
    Number(read.venueId) === Number(venueId) && read.storeKey === storeKey
  )).length;
}

function scopedStoreCacheKey(storeKey, venueId) {
  return `${storeKey}_cache__${session.email}__venue_${venueId}`;
}

function taxonomyPayload() {
  return {
    ok: true,
    taxonomy: nomenclatureStructure(),
    legacyMenuPaths: [
      {
        groupId: "bar",
        subgroupId: "bar-main",
        sectionId: "stock-bar",
        taxonomyCategoryId: "drinks",
        subcategoryId: "beer",
      },
    ],
  };
}

function validateVenueScopedCatalog(catalog, venueId) {
  const rows = [
    ...(catalog.menuItems || []),
    ...(catalog.recipes || []),
    ...(catalog.nomenclature || []),
    ...(catalog.stockBalances || []),
    ...(catalog.recipes || []).flatMap((recipe) => recipe.ingredients || []),
  ];
  const issues = rows
    .filter((row) => Number(row?.venueId) !== Number(venueId))
    .map((row) => `row:${row?.id || row?.name || "unknown"}`);
  const menuIds = new Set((catalog.menuItems || []).map((item) => String(item.id)));
  const productReferences = new Set((catalog.nomenclature || []).flatMap((product) => [
    product.id,
    product.nomenclatureItemId,
    product.key,
    product.productKey,
  ]).filter(Boolean).map(String));
  for (const item of catalog.menuItems || []) {
    if (!["DIRECT_ITEM", "FIXED_QUANTITY"].includes(item.consumptionMode)) continue;
    const reference = item.readyProduct?.nomenclatureItemId || item.readyProduct?.productKey;
    if (!reference || !productReferences.has(String(reference))) issues.push(`menu-link:${item.id}`);
  }
  for (const recipe of catalog.recipes || []) {
    if (!menuIds.has(String(recipe.menuItemId || recipe.ownerId || ""))) {
      issues.push(`recipe-owner:${recipe.id}`);
    }
    for (const ingredient of recipe.ingredients || []) {
      const reference = ingredient.nomenclatureItemId || ingredient.purchaseProductKey;
      if (reference && !productReferences.has(String(reference))) {
        issues.push(`ingredient-link:${ingredient.id}`);
      }
    }
  }
  return issues;
}

async function configureContext(context, state, baseUrl) {
  const initialCatalog = clone(catalogFor(state));
  const initialSales = clone(state.stores.get(activeVenueId).get("bd_sales_documents"));
  await context.addInitScript(({ currentSession, activeVenue, activePermissions, catalog, sales }) => {
    if (localStorage.getItem("bd_session") === null) {
      localStorage.setItem("bd_session", currentSession.email);
      localStorage.setItem("bd_session_token", currentSession.token);
      localStorage.setItem("bd_session_userid", currentSession.userId);
    }
    if (localStorage.getItem("bd_active_venue_id") === null) {
      localStorage.setItem("bd_active_venue_id", String(activeVenue));
      localStorage.setItem("bd_active_venue_is_primary", "1");
      localStorage.setItem("bd_active_role", "owner");
      localStorage.setItem("bd_active_permissions", JSON.stringify(activePermissions));
    }
    const scope = `__${currentSession.email}__venue_${activeVenue}`;
    const catalogKey = `bd_assortment_v1_cache${scope}`;
    const purchasesKey = `bd_purchase_documents_cache${scope}`;
    const salesKey = `bd_sales_documents_cache${scope}`;
    const seedKey = `bd_phase3_qa_seeded${scope}`;
    if (sessionStorage.getItem(seedKey) !== "1" && localStorage.getItem(catalogKey) === null) {
      localStorage.setItem(catalogKey, JSON.stringify(catalog));
      sessionStorage.setItem(seedKey, "1");
    }
    if (sessionStorage.getItem(seedKey) === "1" && localStorage.getItem(purchasesKey) === null) {
      localStorage.setItem(purchasesKey, "[]");
    }
    if (sessionStorage.getItem(seedKey) === "1" && localStorage.getItem(salesKey) === null) {
      localStorage.setItem(salesKey, JSON.stringify(sales));
    }
  }, {
    currentSession: session,
    activeVenue: activeVenueId,
    activePermissions: permissions,
    catalog: initialCatalog,
    sales: initialSales,
  });

  const baseOrigin = new URL(baseUrl).origin;
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== baseOrigin) {
      state.externalRequests.push(url.href);
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });

  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const headerVenueId = Number(request.headers()["x-venue-id"]) || null;
    const venueId = state.activeVenueId;
    const venue = venues.find((candidate) => Number(candidate.id) === Number(venueId));
    const venueStores = state.stores.get(venueId);
    state.requests.push({ method, pathname: url.pathname, venueId, headerVenueId });

    if (!venue || !venueStores) {
      state.unexpectedRequests.push(`${method} ${url.pathname} @ venue ${venueId}`);
      return route.fulfill(jsonResponse({ ok: false, error: "QA fixture has no active venue" }, 500));
    }

    if (url.pathname === "/api/auth/bootstrap") {
      return route.fulfill(jsonResponse({
        ok: true,
        ...session,
        role: "owner",
        permissions,
        activeVenueId: venue.id,
        activeWorkspaceId: venue.workspaceId,
        activeVenueIsPrimary: venue.isPrimary,
        canCreateVenues: true,
        venues,
        bootstrap: {
          state: "ready",
          reason: "active_venue_ready",
          membershipsLoaded: true,
          venuesLoaded: true,
          activeVenueRestored: false,
          accessibleVenueCount: venues.length,
          confirmedOwnedVenueCount: venues.length,
          inaccessibleOwnedVenueCount: 0,
        },
      }));
    }
    if (url.pathname === "/api/restaurants/me") {
      return route.fulfill(jsonResponse({
        ok: true,
        restaurant: {
          id: venue.workspaceId,
          venueId: venue.id,
          name: venue.name,
          businessType: "Бар",
          city: "Кишинёв",
          country: "Молдова",
          currency: "RUB",
          seats: 40,
          employees: 8,
          areas: ["Бар"],
          workingDays: {},
        },
      }));
    }
    if (url.pathname === "/api/users/me") {
      return route.fulfill(jsonResponse({
        ok: true,
        user: { id: session.userId, email: session.email, name: "Phase 3 QA" },
      }));
    }
    if (url.pathname === "/api/business-health") {
      return route.fulfill(jsonResponse({ ok: true, snapshot: null, state: "insufficient_data" }));
    }
    if (url.pathname === "/api/access/active-venue" && method === "GET") {
      return route.fulfill(jsonResponse({
        ok: true,
        activeVenueId: venue.id,
        activeWorkspaceId: venue.workspaceId,
        activeVenueIsPrimary: venue.isPrimary,
        venueName: venue.name,
        role: venue.role,
        permissions,
      }));
    }
    if (url.pathname === "/api/access/active-venue" && ["POST", "PUT"].includes(method)) {
      const body = request.postDataJSON();
      const nextVenueId = Number(body?.venueId);
      if (!state.stores.has(nextVenueId)) {
        return route.fulfill(jsonResponse({ ok: false, error: "Unknown QA venue" }, 404));
      }
      state.activeVenueId = nextVenueId;
      state.venueSwitches.push({ from: venueId, to: nextVenueId });
      const nextVenue = venues.find((candidate) => Number(candidate.id) === nextVenueId);
      return route.fulfill(jsonResponse({
        ok: true,
        activeVenueId: nextVenueId,
        activeWorkspaceId: nextVenue.workspaceId,
        activeVenueIsPrimary: nextVenue.isPrimary,
        venueName: nextVenue.name,
        role: nextVenue.role,
        permissions,
      }));
    }
    if (url.pathname === "/api/store" && method === "GET") {
      state.reads.push({ venueId, storeKey: "*" });
      const entries = Object.fromEntries([...venueStores.entries()].map(([key, data]) => [
        key,
        { data: clone(data), updatedAt: "2026-09-08T08:00:00.000Z" },
      ]));
      return route.fulfill(jsonResponse({ ok: true, entries }));
    }
    if (url.pathname.startsWith("/api/store/")) {
      const storeKey = decodeURIComponent(url.pathname.slice("/api/store/".length));
      if (!venueStores.has(storeKey)) {
        const unknownStoreRequest = `${method} ${url.pathname}`;
        state.unexpectedRequests.push(unknownStoreRequest);
        if (method !== "GET") state.unexpectedMutations.push(unknownStoreRequest);
        return route.fulfill(jsonResponse({
          ok: false,
          code: "UNEXPECTED_QA_STORE",
          error: `The Phase 3 QA fixture has no store named ${storeKey}`,
        }, 501));
      }
      if (method === "GET") {
        state.reads.push({ venueId, storeKey });
        return route.fulfill(jsonResponse({ ok: true, data: clone(venueStores.get(storeKey)) }));
      }
      if (method === "PUT") {
        const body = request.postDataJSON();
        if (storeKey === "bd_assortment_v1") {
          const foreignRows = validateVenueScopedCatalog(body?.data || {}, venueId);
          const catalogVenueId = Number(body?.data?.venueId);
          // The store API selects its venue from authenticated request context,
          // not from an optional catalog envelope field. Every row is still validated.
          if ((body?.data?.venueId != null && catalogVenueId !== Number(venueId)) || foreignRows.length) {
            console.error("Phase 3 fixture rejected catalog", JSON.stringify({ venueId, catalogVenueId, foreignRows }));
            return route.fulfill(jsonResponse({
              ok: false,
              code: "VENUE_SCOPE_MISMATCH",
              error: "QA mock rejected a cross-venue catalog write",
              issues: foreignRows,
            }, 409));
          }
        }
        const persisted = clone(body?.data);
        if (storeKey === "bd_assortment_v1") persisted.venueId = Number(venueId);
        venueStores.set(storeKey, persisted);
        state.writes.push({ venueId, storeKey, data: clone(persisted) });
        return route.fulfill(jsonResponse({ ok: true, data: clone(persisted) }));
      }
    }
    if (url.pathname === "/api/nomenclature/taxonomy" && method === "GET") {
      return route.fulfill(jsonResponse(taxonomyPayload()));
    }
    if (url.pathname === "/api/assortment/overview" && method === "GET") {
      if (headerVenueId !== Number(venueId)) {
        return route.fulfill(jsonResponse({
          ok: false,
          code: "VENUE_SCOPE_MISMATCH",
          error: "QA mock requires the active venue header for assortment analytics",
        }, 409));
      }
      return route.fulfill(jsonResponse({ ok: true, venueId, analytics: null }));
    }
    if (url.pathname === "/api/inventory/products" && method === "GET") {
      const catalog = catalogFor(state, venueId);
      return route.fulfill(jsonResponse({
        ok: true,
        products: clone(catalog.nomenclature || []),
        assortment: clone(catalog),
      }));
    }
    if (url.pathname === "/api/tech-cards/nomenclature" && method === "GET") {
      const products = catalogFor(state, venueId).nomenclature || [];
      return route.fulfill(jsonResponse({ ok: true, items: clone(products), products: clone(products) }));
    }
    if (url.pathname === "/api/migrate" || url.pathname === "/api/client-runtime-diagnostic") {
      return route.fulfill(jsonResponse({ ok: true }));
    }
    const unknownRequest = `${method} ${url.pathname}`;
    state.unexpectedRequests.push(unknownRequest);
    if (method !== "GET") state.unexpectedMutations.push(unknownRequest);
    return route.fulfill(jsonResponse({
      ok: false,
      code: "UNEXPECTED_QA_API",
      error: `The Phase 3 QA fixture has no mock for ${unknownRequest}`,
    }, 501));
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function startQaServer() {
  if (configuredBaseUrl) {
    const baseUrl = configuredBaseUrl.replace(/\/$/, "");
    assert.ok(
      ["127.0.0.1", "localhost", "terminal.local"].includes(new URL(baseUrl).hostname),
      "Phase 3 browser QA only accepts a loopback/local QA server",
    );
    return { baseUrl, stop: async () => {} };
  }

  const logPath = path.join(outputDir, `server-${process.pid}.log`);
  const logFd = fs.openSync(logPath, "w");
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(qaPort)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: path.join(outputDir, `wrangler-${process.pid}.log`),
    },
    detached: process.platform !== "win32",
    stdio: ["ignore", logFd, logFd],
  });
  const baseUrl = `http://127.0.0.1:${qaPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode != null) break;
    try {
      const response = await fetch(`${baseUrl}/api/healthz`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The Vite/Miniflare process is still starting.
    }
    await delay(500);
  }

  async function stop() {
    if (child.exitCode == null) {
      try {
        if (process.platform === "win32") child.kill("SIGTERM");
        else process.kill(-child.pid, "SIGTERM");
      } catch {
        // The process already exited.
      }
      await Promise.race([once(child, "exit"), delay(5_000)]).catch(() => {});
      if (child.exitCode == null) {
        try {
          if (process.platform === "win32") child.kill("SIGKILL");
          else process.kill(-child.pid, "SIGKILL");
        } catch {
          // The process exited between checks.
        }
      }
    }
    try {
      fs.closeSync(logFd);
    } catch {
      // The log descriptor was already closed.
    }
  }

  if (!ready) {
    await stop();
    const tail = fs.existsSync(logPath)
      ? fs.readFileSync(logPath, "utf8").split(/\r?\n/).slice(-80).join("\n")
      : "No server log was produced.";
    throw new Error(`Phase 3 QA server did not become ready.\n${tail}`);
  }
  return { baseUrl, stop, logPath };
}

async function waitForCatalog(page) {
  await page.locator(".bd-assortment-command-v170").waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(() => {
    const content = document.querySelector(".bd-assortment-content-v170");
    return content !== null && content.getAttribute("data-analytics-state") !== "loading";
  });
}

async function openItem(page, baseUrl, tab, itemId, venueId = activeVenueId) {
  const response = await page.goto(
    `${baseUrl}/catalog?venue=${venueId}&tab=${tab}&itemId=${encodeURIComponent(itemId)}`,
    { waitUntil: "domcontentloaded", timeout: 60_000 },
  );
  assert.equal(response?.status(), 200, `${tab}/${itemId}: catalog route must return 200`);
  await waitForCatalog(page);
  await page.locator(".bd-assortment-sheet-v170.detail").waitFor({ state: "visible", timeout: 20_000 });
}

async function openMenuEditor(page) {
  await page.getByRole("button", { name: "Изменить позицию" }).click();
  const editor = page.locator(".bd-menu-position-editor-v400");
  await editor.waitFor({ state: "visible", timeout: 10_000 });
  await editor.locator(".bd-menu-tax-loading-v350").waitFor({ state: "detached", timeout: 10_000 }).catch(() => {});
  return editor;
}

async function openRecipeEditor(page) {
  const recipeButton = page.getByRole("button", {
    name: /^(Открыть техкарту|Проверить техкарту|Создать техкарту)$/,
  });
  await recipeButton.click();
  const editor = page.locator(".bd-tech-card-editor-v354");
  await editor.waitFor({ state: "visible", timeout: 10_000 });
  return editor;
}

async function chooseMode(page, editor, label) {
  const button = editor.getByRole("button", { name: new RegExp(`^${label}`) });
  const dialog = page.waitForEvent("dialog", { timeout: 5_000 }).then(async (event) => {
    assert.match(event.message(), /Новый режим станет активным для будущих продаж/);
    await event.accept();
  });
  await Promise.all([dialog, button.click()]);
  await page.waitForFunction((modeLabel) => {
    const buttons = [...document.querySelectorAll(".bd-menu-consumption-option-v418")];
    return buttons.some((candidate) => (
      candidate.textContent?.startsWith(modeLabel)
      && candidate.getAttribute("aria-pressed") === "true"
    ));
  }, label);
}

async function assertNoHorizontalOverflow(page, label) {
  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const surfaces = [...document.querySelectorAll(
      ".bd-menu-position-editor-v400,.bd-tech-card-editor-v354,.bd-assortment-sheet-v170",
    )].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        className: String(node.className),
        left: rect.left,
        right: rect.right,
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      };
    });
    return {
      viewportWidth: root.clientWidth,
      rootScrollWidth: root.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      surfaces,
    };
  });
  assert.ok(
    audit.rootScrollWidth <= audit.viewportWidth + 1 && audit.bodyScrollWidth <= audit.viewportWidth + 1,
    `${label}: document has horizontal overflow ${JSON.stringify(audit)}`,
  );
  for (const surface of audit.surfaces) {
    assert.ok(
      surface.left >= -1
        && surface.right <= audit.viewportWidth + 1
        && surface.scrollWidth <= surface.clientWidth + 1,
      `${label}: active surface has horizontal overflow ${JSON.stringify(surface)}`,
    );
  }
  return audit;
}

async function saveMenuEditor(editor) {
  await editor.getByRole("button", { name: "Сохранить позицию" }).click();
  await editor.waitFor({ state: "detached", timeout: 15_000 });
}

async function closeMenuEditor(editor) {
  await editor.locator(".bd-catalog-close").click();
  await editor.waitFor({ state: "detached", timeout: 10_000 });
}

async function closeRecipeEditor(editor) {
  await editor.getByRole("button", { name: "Закрыть техкарту" }).click();
  await editor.waitFor({ state: "detached", timeout: 10_000 });
}

async function reloadCatalog(page) {
  const onDialog = async (dialog) => {
    console.error("Phase 3 reload dialog", JSON.stringify({ type: dialog.type(), message: dialog.message() }));
    await dialog.dismiss();
  };
  const onFailed = (request) => console.error("Phase 3 reload request failed", request.url(), request.failure());
  page.on("dialog", onDialog);
  page.on("requestfailed", onFailed);
  let response;
  try {
    response = await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  } finally {
    page.off("dialog", onDialog);
    page.off("requestfailed", onFailed);
  }
  assert.equal(response?.status(), 200, "catalog reload must return 200");
  await waitForCatalog(page);
}

async function authoritativeCatalogReload(page, state, venueId, expectedItemId, expectedMode) {
  const cacheKey = scopedStoreCacheKey("bd_assortment_v1", venueId);
  const readsBefore = storeReadCount(state, venueId, "bd_assortment_v1");
  const cacheAudit = await page.evaluate(({ key, scopedVenueId }) => {
    const poison = {
      version: 999,
      venueId: scopedVenueId,
      menuItems: [{
        id: "qa-cache-poison",
        venueId: scopedVenueId,
        name: "THIS VALUE MUST NEVER SURVIVE SERVER READBACK",
        consumptionMode: "NONE",
      }],
      recipes: [],
      nomenclature: [],
      stockBalances: [],
    };
    localStorage.setItem(key, JSON.stringify(poison));
    const poisoned = JSON.parse(localStorage.getItem(key) || "null");
    localStorage.removeItem(key);
    return {
      poisonObserved: poisoned?.menuItems?.[0]?.id === "qa-cache-poison",
      cleared: localStorage.getItem(key) === null,
    };
  }, { key: cacheKey, scopedVenueId: venueId });
  assert.deepEqual(
    cacheAudit,
    { poisonObserved: true, cleared: true },
    `venue ${venueId}: the catalog cache must be poisoned and cleared before authoritative reload`,
  );

  await reloadCatalog(page);
  const readsAfter = storeReadCount(state, venueId, "bd_assortment_v1");
  assert.ok(
    readsAfter > readsBefore,
    `venue ${venueId}: reload must perform a fresh GET /api/store/bd_assortment_v1`,
  );
  await page.waitForFunction(({ key, itemId, mode }) => {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      return cached?.menuItems?.some((item) => item.id === itemId && item.consumptionMode === mode)
        && !cached.menuItems.some((item) => item.id === "qa-cache-poison");
    } catch {
      return false;
    }
  }, { key: cacheKey, itemId: expectedItemId, mode: expectedMode });
  return { readsBefore, readsAfter, cacheKey };
}

async function runProfile(browser, baseUrl, profile) {
  const state = createMutableState();
  const passiveBefore = clone(catalogFor(state, passiveVenueId));
  const historicalBefore = new Map([
    [activeVenueId, clone(state.stores.get(activeVenueId).get("bd_sales_documents"))],
    [passiveVenueId, clone(state.stores.get(passiveVenueId).get("bd_sales_documents"))],
  ]);
  const context = await browser.newContext({
    viewport: profile.viewport,
    screen: profile.viewport,
    deviceScaleFactor: profile.mobile ? 3 : 1,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    locale: "ru-RU",
    timezoneId: "Europe/Chisinau",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await configureContext(context, state, baseUrl);
  const page = await context.newPage();
  const runtimeIssues = [];
  page.on("pageerror", (error) => runtimeIssues.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeIssues.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      runtimeIssues.push(`response ${response.status()}: ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    if (!/ERR_ABORTED/.test(failure)) {
      runtimeIssues.push(`request: ${failure} ${request.url()}`);
    }
  });

  const suffix = String(activeVenueId);
  const directMenuId = `menu-kozel-${suffix}`;
  const espressoMenuId = `menu-espresso-${suffix}`;
  const recipeReviewMenuId = `menu-recipe-review-${suffix}`;
  const recipeReviewAId = `recipe-review-a-${suffix}`;
  const recipeReviewBId = `recipe-review-b-${suffix}`;
  const targetProductId = `nom-kozel-${suffix}`;
  const targetProductKey = `stock:kozel:${suffix}`;
  const espressoRecipeId = `recipe-espresso-${suffix}`;
  const audits = [];
  const authoritativeReadbacks = [];

  try {
    await openItem(page, baseUrl, "menu", directMenuId);
    let detail = page.locator(".bd-assortment-sheet-v170.detail");
    assert.equal(
      await detail.getByRole("button", { name: /техкарту/i }).count(),
      0,
      "DIRECT_ITEM must not expose a redundant Tech Card action",
    );
    let editor = await openMenuEditor(page);
    assert.equal(await editor.getByText("Как списывать эту позицию со склада?", { exact: true }).count(), 1);
    for (const label of ["Готовый товар", "Порция товара", "По техкарте", "Без списания"]) {
      assert.equal(await editor.getByRole("button", { name: new RegExp(`^${label}`) }).count(), 1);
    }
    assert.equal(await editor.locator(".bd-menu-nomenclature-picker-v350").count(), 1);
    assert.equal(await editor.locator(".bd-menu-sale-size-v298").count(), 0);
    audits.push(await assertNoHorizontalOverflow(page, `${profile.name}: direct editor`));

    await chooseMode(page, editor, "Порция товара");
    assert.equal(await editor.locator(".bd-menu-nomenclature-picker-v350").count(), 1);
    assert.equal(await editor.locator(".bd-menu-sale-size-v298").count(), 1);
    let nomenclatureSelect = editor.locator(".bd-menu-nomenclature-picker-v350 select");
    await nomenclatureSelect.selectOption(targetProductKey);
    await editor.getByLabel("Количество продажи").fill("2");
    await editor.getByLabel("Единица продажи").selectOption("pcs");
    await editor.getByText(`Связано по ID: ${longKozelProductName}`, { exact: true }).waitFor();
    assert.match(
      await editor.locator(".bd-menu-ready-summary-v298").innerText(),
      /При продаже будет списано 2 pcs «Пиво Kozel Dark бутылка 0\.5/,
    );
    audits.push(await assertNoHorizontalOverflow(page, `${profile.name}: long fixed-quantity summary`));
    await saveMenuEditor(editor);

    let activeCatalog = catalogFor(state);
    let directItem = activeCatalog.menuItems.find((item) => item.id === directMenuId);
    assert.equal(directItem.consumptionMode, "FIXED_QUANTITY");
    assert.equal(directItem.readyProduct.nomenclatureItemId, targetProductId);
    assert.equal(directItem.readyProduct.productKey, targetProductKey);
    assert.equal(directItem.saleSize.quantity, 2);
    assert.equal(directItem.saleSize.unit, "pcs");
    assert.equal(
      activeCatalog.recipes.filter((recipe) => recipe.menuItemId === directMenuId).length,
      0,
      "FIXED_QUANTITY must not synthesize a one-ingredient Tech Card",
    );

    authoritativeReadbacks.push(await authoritativeCatalogReload(
      page,
      state,
      activeVenueId,
      directMenuId,
      "FIXED_QUANTITY",
    ));
    await openItem(page, baseUrl, "menu", directMenuId);
    editor = await openMenuEditor(page);
    assert.equal(
      await editor.getByRole("button", { name: /^Порция товара/ }).getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(await editor.locator(".bd-menu-nomenclature-picker-v350 select").inputValue(), targetProductKey);
    assert.equal(await editor.getByLabel("Количество продажи").inputValue(), "2");
    assert.equal(await editor.getByLabel("Единица продажи").inputValue(), "pcs");

    await chooseMode(page, editor, "Без списания");
    assert.equal(await editor.locator(".bd-menu-nomenclature-picker-v350").count(), 0);
    assert.equal(await editor.locator(".bd-menu-sale-size-v298").count(), 0);
    assert.match(await editor.innerText(), /Продажа будет сохранена без складских движений/);
    await saveMenuEditor(editor);

    activeCatalog = catalogFor(state);
    directItem = activeCatalog.menuItems.find((item) => item.id === directMenuId);
    assert.equal(directItem.consumptionMode, "NONE");
    assert.equal(
      directItem.readyProduct.nomenclatureItemId,
      targetProductId,
      "NONE must preserve the former link as inactive historical configuration",
    );
    assert.equal(activeCatalog.recipes.filter((recipe) => recipe.menuItemId === directMenuId).length, 0);

    authoritativeReadbacks.push(await authoritativeCatalogReload(
      page,
      state,
      activeVenueId,
      directMenuId,
      "NONE",
    ));
    await openItem(page, baseUrl, "menu", directMenuId);
    editor = await openMenuEditor(page);
    assert.equal(
      await editor.getByRole("button", { name: /^Без списания/ }).getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(await editor.locator(".bd-menu-nomenclature-picker-v350").count(), 0);
    assert.equal(await editor.locator(".bd-menu-sale-size-v298").count(), 0);

    await chooseMode(page, editor, "Готовый товар");
    nomenclatureSelect = editor.locator(".bd-menu-nomenclature-picker-v350 select");
    await nomenclatureSelect.selectOption(targetProductKey);
    await editor.getByText(`Связано по ID: ${longKozelProductName}`, { exact: true }).waitFor();
    assert.match(
      await editor.locator(".bd-menu-ready-summary-v298").innerText(),
      /При продаже 1 шт\. будет списана 1 шт\. «Пиво Kozel Dark бутылка 0\.5/,
    );
    audits.push(await assertNoHorizontalOverflow(page, `${profile.name}: long direct-item summary`));
    await saveMenuEditor(editor);

    activeCatalog = catalogFor(state);
    directItem = activeCatalog.menuItems.find((item) => item.id === directMenuId);
    assert.equal(directItem.consumptionMode, "DIRECT_ITEM");
    assert.equal(directItem.readyProduct.nomenclatureItemId, targetProductId);
    assert.equal(directItem.readyProduct.productKey, targetProductKey);
    assert.equal(
      activeCatalog.recipes.filter((recipe) => recipe.menuItemId === directMenuId).length,
      0,
      "DIRECT_ITEM must persist without a duplicate Recipe object",
    );

    authoritativeReadbacks.push(await authoritativeCatalogReload(
      page,
      state,
      activeVenueId,
      directMenuId,
      "DIRECT_ITEM",
    ));
    await openItem(page, baseUrl, "menu", directMenuId);
    detail = page.locator(".bd-assortment-sheet-v170.detail");
    assert.equal(
      await detail.getByRole("button", { name: /техкарту/i }).count(),
      0,
      "persisted DIRECT_ITEM must still have no Tech Card action",
    );
    editor = await openMenuEditor(page);
    assert.equal(
      await editor.getByRole("button", { name: /^Готовый товар/ }).getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(await editor.locator(".bd-menu-nomenclature-picker-v350 select").inputValue(), targetProductKey);
    assert.match(await editor.innerText(), /Связано по ID: Пиво Kozel Dark бутылка 0\.5/);
    await closeMenuEditor(editor);

    await openItem(page, baseUrl, "menu", espressoMenuId);
    let recipeEditor = await openRecipeEditor(page);
    assert.match(await recipeEditor.innerText(), /Меню → Техкарта[\s\S]*Espresso/);
    const quantity = recipeEditor.getByLabel("Количество на порцию").first();
    assert.equal(await quantity.inputValue(), "8");
    await quantity.fill("9");
    audits.push(await assertNoHorizontalOverflow(page, `${profile.name}: recipe editor from Menu`));
    await recipeEditor.getByRole("button", { name: "Сохранить черновик" }).click();
    await recipeEditor.waitFor({ state: "detached", timeout: 15_000 });

    activeCatalog = catalogFor(state);
    let espressoRecipes = activeCatalog.recipes.filter((recipe) => recipe.menuItemId === espressoMenuId);
    assert.equal(espressoRecipes.length, 1, "Menu save must not duplicate the persisted Recipe object");
    assert.equal(espressoRecipes[0].id, espressoRecipeId);
    assert.equal(espressoRecipes[0].ingredients[0].quantity, 9);

    authoritativeReadbacks.push(await authoritativeCatalogReload(
      page,
      state,
      activeVenueId,
      espressoMenuId,
      "RECIPE",
    ));
    await openItem(page, baseUrl, "recipes", espressoMenuId);
    recipeEditor = await openRecipeEditor(page);
    assert.equal(await recipeEditor.getByLabel("Количество на порцию").first().inputValue(), "9");
    assert.equal(catalogFor(state).recipes.filter((recipe) => recipe.menuItemId === espressoMenuId)[0].id, espressoRecipeId);
    assert.equal(
      await recipeEditor.getByText("Связь с номенклатурой", { exact: true }).count(),
      1,
      "a Recipe must expose Nomenclature only at the ingredient line",
    );
    audits.push(await assertNoHorizontalOverflow(page, `${profile.name}: same recipe from Tech Cards`));
    await closeRecipeEditor(recipeEditor);

    await openItem(page, baseUrl, "menu", recipeReviewMenuId);
    editor = await openMenuEditor(page);
    const recipeChoice = editor.locator(".bd-menu-recipe-review-v418 select");
    assert.equal(await recipeChoice.count(), 1, "multiple active recipes must render a controlled chooser");
    assert.equal(await recipeChoice.inputValue(), "");
    assert.equal(
      await editor.getByRole("button", { name: "Сохранить позицию" }).isDisabled(),
      true,
      "an ambiguous Recipe mode must not save until one Recipe is selected",
    );
    await recipeChoice.selectOption(recipeReviewBId);
    assert.equal(await recipeChoice.inputValue(), recipeReviewBId);
    assert.match(
      await editor.locator(".bd-menu-recipe-review-v418").innerText(),
      /единственным источником будущих списаний/,
    );
    await saveMenuEditor(editor);
    recipeEditor = page.locator(".bd-tech-card-editor-v354");
    await recipeEditor.waitFor({ state: "visible", timeout: 15_000 });
    await closeRecipeEditor(recipeEditor);

    activeCatalog = catalogFor(state);
    const reviewRecipes = activeCatalog.recipes.filter((recipe) => recipe.menuItemId === recipeReviewMenuId);
    assert.equal(reviewRecipes.length, 2, "controlled review must preserve both persisted Recipe objects");
    assert.deepEqual(
      reviewRecipes.filter((recipe) => recipe.current !== false).map((recipe) => recipe.id),
      [recipeReviewBId],
      "the selected Recipe must become the only active consumption source",
    );
    assert.equal(reviewRecipes.find((recipe) => recipe.id === recipeReviewAId).current, false);
    assert.equal(
      reviewRecipes.find((recipe) => recipe.id === recipeReviewAId).inactiveReason,
      "consumption_mode_review",
    );
    authoritativeReadbacks.push(await authoritativeCatalogReload(
      page,
      state,
      activeVenueId,
      recipeReviewMenuId,
      "RECIPE",
    ));
    await openItem(page, baseUrl, "menu", recipeReviewMenuId);
    editor = await openMenuEditor(page);
    assert.equal(
      await editor.locator(".bd-menu-recipe-review-v418").count(),
      0,
      "after reload the resolved item must have only one active Recipe",
    );
    await closeMenuEditor(editor);

    await openItem(page, baseUrl, "menu", directMenuId);
    editor = await openMenuEditor(page);
    await chooseMode(page, editor, "По техкарте");
    await saveMenuEditor(editor);
    recipeEditor = page.locator(".bd-tech-card-editor-v354");
    await recipeEditor.waitFor({ state: "visible", timeout: 15_000 });

    activeCatalog = catalogFor(state);
    directItem = activeCatalog.menuItems.find((item) => item.id === directMenuId);
    const switchedRecipes = activeCatalog.recipes.filter((recipe) => recipe.menuItemId === directMenuId);
    assert.equal(directItem.consumptionMode, "RECIPE", "new mode must be active for future sales");
    assert.equal(
      directItem.readyProduct.nomenclatureItemId,
      targetProductId,
      "the previous direct reference must be retained as inactive history",
    );
    assert.equal(switchedRecipes.length, 1, "mode switch must create one persisted Recipe object");
    assert.equal(switchedRecipes[0].ingredients.length, 0, "the former direct link must not become a recipe ingredient");
    assert.equal(
      await recipeEditor.getByText(longKozelProductName, { exact: true }).count(),
      0,
      "the inactive direct link must not be rendered as a second Recipe mapping",
    );
    assert.equal(
      await recipeEditor.getByText("Связь с номенклатурой", { exact: true }).count(),
      0,
      "a new empty Recipe must not contain an implicit Menu-to-Nomenclature link",
    );
    const switchedRecipeId = switchedRecipes[0].id;
    await closeRecipeEditor(recipeEditor);

    authoritativeReadbacks.push(await authoritativeCatalogReload(
      page,
      state,
      activeVenueId,
      directMenuId,
      "RECIPE",
    ));
    await openItem(page, baseUrl, "recipes", directMenuId);
    recipeEditor = await openRecipeEditor(page);
    assert.match(await recipeEditor.innerText(), /Меню → Техкарта[\s\S]*Kozel Dark 0\.5/);
    assert.equal(
      await recipeEditor.locator(".bd-menu-nomenclature-picker-v350").count(),
      0,
      "Tech Cards must not ask for a second Menu-to-Nomenclature link",
    );
    assert.equal(
      catalogFor(state).recipes.filter((recipe) => recipe.menuItemId === directMenuId)[0].id,
      switchedRecipeId,
      "reload through Tech Cards must reopen the same persisted Recipe object",
    );
    audits.push(await assertNoHorizontalOverflow(page, `${profile.name}: switched recipe after reload`));
    await closeRecipeEditor(recipeEditor);
    detail = page.locator(".bd-assortment-sheet-v170.detail");
    if (await detail.count()) {
      await detail.getByRole("button", { name: "Закрыть", exact: true }).click();
      await detail.waitFor({ state: "detached", timeout: 10_000 });
    }

    const activeAfterPhase3 = clone(catalogFor(state, activeVenueId));
    const passiveReadsBefore = storeReadCount(state, passiveVenueId, "bd_assortment_v1");
    await page.locator("[data-bd-venue-trigger]").click();
    const passiveReadResponse = page.waitForResponse((response) => (
      state.activeVenueId === passiveVenueId
      && response.request().method() === "GET"
      && new URL(response.url()).pathname === "/api/store/bd_assortment_v1"
    ), { timeout: 20_000 });
    await page.locator(".bd-venue-row").filter({ hasText: "QA Второе заведение" }).click();
    await page.waitForURL(new RegExp(`[?&]venue=${passiveVenueId}(?:&|$)`), { timeout: 20_000 });
    await passiveReadResponse;
    await waitForCatalog(page);
    assert.equal(state.activeVenueId, passiveVenueId);
    assert.ok(
      storeReadCount(state, passiveVenueId, "bd_assortment_v1") > passiveReadsBefore,
      "venue switch must read the passive venue's server catalog",
    );
    assert.equal(
      await page.evaluate(() => Number(localStorage.getItem("bd_active_venue_id"))),
      passiveVenueId,
    );

    const passiveSuffix = String(passiveVenueId);
    const passiveDirectMenuId = `menu-kozel-${passiveSuffix}`;
    await openItem(page, baseUrl, "menu", passiveDirectMenuId, passiveVenueId);
    editor = await openMenuEditor(page);
    assert.equal(
      await editor.getByRole("button", { name: /^Готовый товар/ }).getAttribute("aria-pressed"),
      "true",
    );
    await chooseMode(page, editor, "Без списания");
    await saveMenuEditor(editor);
    assert.equal(
      catalogFor(state, passiveVenueId).menuItems.find((item) => item.id === passiveDirectMenuId).consumptionMode,
      "NONE",
    );
    assert.deepEqual(
      catalogFor(state, activeVenueId),
      activeAfterPhase3,
      "a passive-venue write must not modify the active venue catalog",
    );

    authoritativeReadbacks.push(await authoritativeCatalogReload(
      page,
      state,
      passiveVenueId,
      passiveDirectMenuId,
      "NONE",
    ));
    await openItem(page, baseUrl, "menu", passiveDirectMenuId, passiveVenueId);
    editor = await openMenuEditor(page);
    assert.equal(
      await editor.getByRole("button", { name: /^Без списания/ }).getAttribute("aria-pressed"),
      "true",
    );
    await closeMenuEditor(editor);

    const activeReadsBeforeReturn = storeReadCount(state, activeVenueId, "bd_assortment_v1");
    await page.locator("[data-bd-venue-trigger]").click();
    const activeReadResponse = page.waitForResponse((response) => (
      state.activeVenueId === activeVenueId
      && response.request().method() === "GET"
      && new URL(response.url()).pathname === "/api/store/bd_assortment_v1"
    ), { timeout: 20_000 });
    await page.locator(".bd-venue-row").filter({ hasText: "QA Бар" }).click();
    await page.waitForURL(new RegExp(`[?&]venue=${activeVenueId}(?:&|$)`), { timeout: 20_000 });
    await activeReadResponse;
    await waitForCatalog(page);
    assert.equal(state.activeVenueId, activeVenueId);
    assert.ok(
      storeReadCount(state, activeVenueId, "bd_assortment_v1") > activeReadsBeforeReturn,
      "switching back must read the original venue's server catalog",
    );
    assert.deepEqual(catalogFor(state, activeVenueId), activeAfterPhase3);

    assert.deepEqual(
      catalogFor(state, passiveVenueId).nomenclature,
      passiveBefore.nomenclature,
      "venue switching must not leak Nomenclature writes across venues",
    );
    assert.deepEqual(catalogFor(state, passiveVenueId).recipes, passiveBefore.recipes);
    assert.deepEqual(
      catalogFor(state, passiveVenueId).menuItems.filter((item) => item.id !== passiveDirectMenuId),
      passiveBefore.menuItems.filter((item) => item.id !== passiveDirectMenuId),
    );
    assert.deepEqual(state.venueSwitches, [
      { from: activeVenueId, to: passiveVenueId },
      { from: passiveVenueId, to: activeVenueId },
    ]);

    for (const [venueId, snapshot] of historicalBefore) {
      assert.deepEqual(
        state.stores.get(venueId).get("bd_sales_documents"),
        snapshot,
        `venue ${venueId}: confirmed historical sale snapshots must remain immutable`,
      );
    }
    assert.equal(
      state.writes.filter((write) => write.storeKey === "bd_sales_documents").length,
      0,
      "menu and recipe editing must never rewrite historical sale documents",
    );

    assert.ok(
      state.writes.filter((write) => write.storeKey === "bd_assortment_v1").length >= 7,
      "the server fixture must observe fixed, none, direct, recipe, review, mode-switch, and venue saves",
    );
    assert.deepEqual(
      [...new Set(state.writes.map((write) => write.storeKey))],
      ["bd_assortment_v1"],
      "Phase 3 menu flows must not mutate unrelated stores",
    );
    assert.ok(
      state.writes.every((write) => validateVenueScopedCatalog(write.data, write.venueId).length === 0),
      "every persisted catalog payload must be scoped to its server-selected venue",
    );
    assert.ok(state.writes.some((write) => write.venueId === activeVenueId));
    assert.ok(state.writes.some((write) => write.venueId === passiveVenueId));
    const overviewVenues = new Set(state.requests
      .filter((request) => request.method === "GET" && request.pathname === "/api/assortment/overview")
      .map((request) => request.headerVenueId));
    assert.ok(overviewVenues.has(activeVenueId));
    assert.ok(overviewVenues.has(passiveVenueId));
    assert.deepEqual(state.externalRequests, [], `unexpected external requests: ${state.externalRequests.join(", ")}`);
    assert.deepEqual(
      state.unexpectedRequests,
      [],
      `unexpected API requests: ${state.unexpectedRequests.join(", ")}`,
    );
    assert.deepEqual(
      state.unexpectedMutations,
      [],
      `unexpected API mutations: ${state.unexpectedMutations.join(", ")}`,
    );
    assert.deepEqual(runtimeIssues, [], `runtime issues:\n${runtimeIssues.join("\n")}`);

    await page.screenshot({
      path: path.join(outputDir, `${profile.name}-final.png`),
      fullPage: false,
      animations: "disabled",
    });
    return {
      name: profile.name,
      viewport: profile.viewport,
      writes: state.writes.length,
      reads: state.reads.length,
      authoritativeReadbacks,
      venueSwitches: state.venueSwitches,
      switchedRecipeId,
      audits,
    };
  } catch (error) {
    console.error("Phase 3 browser failure context", JSON.stringify({
      profile: profile.name, runtimeIssues,
      requests: state.requests.slice(-20), writes: state.writes.length,
      unexpectedRequests: state.unexpectedRequests,
      editorText: await page.locator(".bd-menu-position-editor-v400").innerText({ timeout: 1000 }).catch(() => "No menu editor"),
    }));
    await page.screenshot({
      path: path.join(outputDir, `${profile.name}-failure.png`),
      fullPage: true,
      animations: "disabled",
    }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  const server = await startQaServer();
  let browser;
  try {
    const browserPath = await resolveBrowserExecutable(chromium.executablePath());
    browser = await chromium.launch({
      executablePath: browserPath,
      headless: true,
      args: [...chromiumArgs, "--no-proxy-server", "--disable-dev-shm-usage"],
    });
    const results = [];
    for (const profile of [
      { name: "desktop-1280x720", viewport: { width: 1280, height: 720 }, mobile: false },
      { name: "mobile-390x844", viewport: { width: 390, height: 844 }, mobile: true },
    ]) {
      results.push(await runProfile(browser, server.baseUrl, profile));
    }
    const summary = { ok: true, outputDir, baseUrl: server.baseUrl, results };
    fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(server.logPath)) console.log("Phase 3 server log tail\n" + fs.readFileSync(server.logPath, "utf8").split(/\r?\n/).slice(-40).join("\n"));
    await server.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
