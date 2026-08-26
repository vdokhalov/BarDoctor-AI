/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, devices } = require("playwright-core");
const { chromiumArgs, resolveBrowserExecutable } = require("./browser-runtime.cjs");

const baseUrl = process.env.BD_QA_BASE_URL || "http://127.0.0.1:4175";
let browserPath = process.env.BD_QA_BROWSER || chromium.executablePath();
const outputDir = path.resolve(process.cwd(), "qa-artifacts/mobile-navigation-v269");
fs.mkdirSync(outputDir, { recursive: true });

const profiles = [
  { name: "iphone-13", descriptor: devices["iPhone 13"], userAgentPattern: /iPhone/ },
  { name: "pixel-7", descriptor: devices["Pixel 7"], userAgentPattern: /Android/ },
];
const desktopProfile = { name: "desktop-chrome", descriptor: devices["Desktop Chrome"] };

const permissions = [
  "inventory.view", "inventory.manage", "finance.view", "finance.manage",
  "expenses.create", "team.view", "team.manage", "equipment.view",
  "equipment.manage", "integrations.manage", "settings.manage", "access.manage",
  "data.import", "finance.export", "reviews.view", "shifts.manage",
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
        { key: `stock:jack-${suffix}|ml`, productKey: `stock:jack-${suffix}|ml`, name: "Jack Daniel's", aliases: ["Джек Дэниэлс", "Jack Daniels"], current: 5700, unit: "ml", displayUnit: "l", sectionId: "bar", taxonomyCategoryId: "drinks", subcategoryId: "spirits", storageLocationId: "bar-fridge", packageSize: "0.7 л", packageOptions: ["0.7 л"], kind: "stock", active: true, classificationStatus: "confirmed", averageUnitCost: 0.18, inventoryValue: 1026, currency: "RUB" },
        { key: `stock:lemon-${suffix}|g`, productKey: `stock:lemon-${suffix}|g`, name: "Лимон", aliases: ["Lemon"], current: 3250, unit: "g", displayUnit: "kg", sectionId: "kitchen", taxonomyCategoryId: "food", subcategoryId: "fruit", storageLocationId: "kitchen-fridge", packageSize: "1 кг", kind: "stock", active: true, classificationStatus: "confirmed", averageUnitCost: 0.045, inventoryValue: 146.25, currency: "RUB" },
      ];
  return {
    version: "mobile-qa-v269",
    nomenclatureStructure: {
      sections: [{ id: "bar", name: "Бар", order: 10 }, { id: "kitchen", name: "Кухня", order: 20 }],
      categories: [{ id: "drinks", name: "Напитки", parentId: "bar", order: 10 }, { id: "food", name: "Продукты", parentId: "kitchen", order: 10 }],
      subcategories: [{ id: "beer", name: "Пиво", parentId: "drinks", order: 10 }, { id: "soft", name: "Безалкогольные", parentId: "drinks", order: 20 }, { id: "coffee", name: "Кофе", parentId: "drinks", order: 30 }, { id: "spirits", name: "Крепкий алкоголь", parentId: "drinks", order: 40 }, { id: "meat", name: "Мясо", parentId: "food", order: 10 }, { id: "fruit", name: "Фрукты", parentId: "food", order: 20 }],
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

function inventoryFixtures() {
  const base = inventoryDocument();
  return [
    base,
    { ...structuredClone(base), id: "inv-mobile-18", internalId: "INV-00018", number: 18, status: "draft", items: [], summary: { totalLines: 0, countedLines: 0, uncountedLines: 0, changedLines: 0 } },
    { ...structuredClone(base), id: "inv-mobile-19", internalId: "INV-00019", number: 19, status: "review" },
    { ...structuredClone(base), id: "inv-mobile-20", internalId: "INV-00020", number: 20, status: "completed", completedAt: "2026-08-24T09:00:00.000Z", adjustmentMovementIds: ["movement-20"] },
    { ...structuredClone(base), id: "inv-mobile-legacy", internalId: "legacy-empty", number: undefined, status: "counting", items: [], summary: { totalLines: 0, countedLines: 0, uncountedLines: 0, changedLines: 0 }, date: "2025-01-02" },
  ];
}

function businessHealthEnvelope(venueId) {
  const generatedAt = "2026-08-25T18:41:00.000Z";
  const period = { id: "comparable_shift", label: "Последняя закрытая смена", startDate: "2026-08-24", endDate: "2026-08-24" };
  const factorScores = [
    { id: "finance", label: "Финансы", score: 41, availability: "measured", weight: 40, confidence: "medium" },
    { id: "demand", label: "Спрос", score: 63, availability: "measured", weight: 20, confidence: "medium" },
    { id: "operations", label: "Операции", score: 80, availability: "measured", weight: 25, confidence: "high" },
  ];
  const primaryFactor = { id: "finance", label: "Финансы", score: 41, evidence: "Финансовый результат ниже обычного" };
  const snapshot = {
    snapshotId: `business-health-snapshot:${venueId}:mobile-qa`, venueId: String(venueId), score: 58,
    status: "attention", statusLabel: "Требует внимания", confidence: 77, confidenceLevel: "medium",
    primaryFactor, factorScores, generatedAt, period, periods: { demand: period, closedFinance: period },
    calculationVersion: "business-health-engine-v3", dataQualityPercent: 68,
    explanation: "Финансовый результат требует внимания", source: "server_business_intelligence",
  };
  return {
    data: {
      businessHealthSnapshot: snapshot,
      intelligence: {
        version: "ai-doctor-intelligence-v3", venueId: String(venueId), generatedAt, periods: { demand: period, closedFinance: period },
        dataQuality: { percent: 68 },
        businessHealth: {
          score: 58, label: "attention", confidencePercent: 77, confidence: "medium",
          components: factorScores.map((factor) => ({ ...factor, evidence: factor.id === "finance" ? [primaryFactor.evidence] : [] })),
          explanation: snapshot.explanation,
        },
      },
    },
    generatedAt,
    cachedAt: Date.parse(generatedAt),
  };
}

function storeData(venueId) {
  return {
    bd_assortment_v1: assortmentFor(venueId),
    bd_inventory_snapshots: venueId === 901 ? inventoryFixtures() : [],
    bd_stock_movements: [],
    bd_inventory_writeoffs: [],
    bd_finance_revenue: [],
    bd_employees: venueId === 901 ? [{ id: "employee-mobile-qa", name: "Тест Бармен", position: "bartender", department: "Бар", status: "active" }] : [],
    bd_payroll_rules: [],
    bd_ai_diagnosis_v9: businessHealthEnvelope(venueId),
    bd_finance_settings: { inventoryFrequency: "monthly", customFrequencyDays: 30, inventorySections: ["Бар", "Кухня"], taxModel: { mode: "fixed", amount: 0 }, utilityModel: { mode: "fixed", amount: 0 }, updatedAt: "2026-08-24T08:00:00.000Z" },
  };
}

function jsonResponse(value, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(value) };
}

async function createRun(browser, profile, label, options = {}) {
  const state = {
    activeVenueId: options.venueId || 901,
    stores: { 901: storeData(901), 902: storeData(902) },
    shiftCloses: new Map(),
    shiftCloseRequests: [],
    shiftCloseFulfilled: false,
    storeWrites: [],
  };
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
    snapshots: { 901: inventoryFixtures(), 902: [] },
    assortments: { 901: assortmentFor(901), 902: assortmentFor(902) },
  });

  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const activeProfile = profileFor(state.activeVenueId);
    if (url.pathname === "/api/auth/bootstrap") {
      return route.fulfill(jsonResponse({
        ok: true,
        email: "mobile-qa@bardoctor.local",
        userId: "mobile-qa-user",
        token: "mobile-qa-token",
        firstName: "Mobile",
        lastName: "QA",
        role: "owner",
        permissions,
        activeVenueId: state.activeVenueId,
        activeWorkspaceId: "mobile-qa",
        activeVenueIsPrimary: state.activeVenueId === 901,
        canCreateVenues: true,
        venues,
        bootstrap: {
          state: "ready",
          reason: "active_venue_ready",
          membershipsLoaded: true,
          venuesLoaded: true,
          activeVenueRestored: false,
          accessibleVenueCount: venues.length,
          confirmedOwnedVenueCount: 1,
          inaccessibleOwnedVenueCount: 0,
        },
      }));
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
        state.storeWrites.push({ key, size: Array.isArray(body.data) ? body.data.length : null, at: Date.now() });
        state.stores[state.activeVenueId][key] = body.data;
      }
      return route.fulfill(jsonResponse({ ok: true, data: state.stores[state.activeVenueId][key] ?? null }));
    }
    if (url.pathname === "/api/inventory/products") return route.fulfill(jsonResponse({ ok: true, assortment: state.stores[state.activeVenueId].bd_assortment_v1, duplicateRepair: { changed: false } }));
    if (url.pathname === "/api/shifts/close" && method === "POST") {
      const body = request.postDataJSON();
      state.shiftCloseRequests.push(body);
      const previous = state.shiftCloses.get(body.shiftCloseId);
      if (previous) return route.fulfill(jsonResponse({ ...previous, idempotent: true, stockChanged: false }));
      if (body.venueId != null && Number(body.venueId) !== state.activeVenueId) return route.fulfill(jsonResponse({ ok: false, code: "SHIFT_VENUE_MISMATCH", error: "Смена относится к другому заведению" }, 403));
      const stores = state.stores[state.activeVenueId];
      const assortment = stores.bd_assortment_v1;
      const reasons = new Map([["spoilage", "Порча"], ["breakage", "Бой / разбили"], ["staff_meal", "Питание персонала"], ["other", "Другое"]]);
      const groups = new Map();
      for (const line of body.writeOffItems || []) {
        const key = `${line.reasonCode}\u0000${line.location || "Основной склад"}`;
        groups.set(key, [...(groups.get(key) || []), line]);
      }
      const documents = [];
      let groupIndex = 0;
      for (const [key, lines] of groups) {
        groupIndex += 1;
        const [reasonCode, location] = key.split("\u0000");
        const items = lines.map((line, lineIndex) => {
          const balance = assortment.stockBalances.find((item) => item.productKey === line.productKey);
          assert.ok(balance, `shift-close QA: missing canonical product ${line.productKey}`);
          const baseQuantity = balance.unit === "g" && line.unit === "kg" ? Number(line.quantity) * 1000
            : balance.unit === "ml" && line.unit === "l" ? Number(line.quantity) * 1000
              : Number(line.quantity);
          const totalCost = Number(balance.averageUnitCost) > 0 ? baseQuantity * Number(balance.averageUnitCost) : null;
          balance.current -= baseQuantity;
          const item = {
            id: `${body.shiftCloseId}:${groupIndex}:${lineIndex + 1}`,
            nomenclatureItemId: line.nomenclatureItemId,
            productKey: line.productKey,
            productName: balance.name,
            quantity: Number(line.quantity),
            unit: line.unit,
            baseQuantity,
            baseUnit: balance.unit,
            unitCost: Number(balance.averageUnitCost) || null,
            totalCost,
            currency: balance.currency,
          };
          stores.bd_stock_movements.unshift({
            id: `shift-movement:${item.id}`,
            venueId: state.activeVenueId,
            type: "writeoff",
            date: body.revenueRecord.date,
            productKey: item.productKey,
            productName: item.productName,
            amount: -baseQuantity,
            unit: item.baseUnit,
            costAmount: totalCost === null ? undefined : -totalCost,
            currency: item.currency,
            sourceDocumentId: `shift-writeoff:${body.shiftCloseId}:${groupIndex}`,
            sourceLineId: item.id,
            createdAt: "2026-08-24T15:00:00.000Z",
          });
          return item;
        });
        const totalCost = items.some((item) => item.totalCost === null) ? null : items.reduce((sum, item) => sum + item.totalCost, 0);
        documents.push({
          id: `shift-writeoff:${body.shiftCloseId}:${groupIndex}`,
          internalId: `WO-QA-${groupIndex}`,
          venueId: state.activeVenueId,
          number: stores.bd_inventory_writeoffs.length + groupIndex,
          date: body.revenueRecord.date,
          location,
          reasonCode,
          reasonLabel: reasons.get(reasonCode) || reasonCode,
          status: "posted",
          source: "shift_close",
          shiftId: body.shiftId || body.revenueRecord.id || `shift:${body.shiftCloseId}`,
          shiftCloseId: body.shiftCloseId,
          items,
          itemCount: items.length,
          totalCost,
          currency: items.find((item) => item.currency)?.currency || "RUB",
          movementIds: items.map((item) => `shift-movement:${item.id}`),
          createdAt: "2026-08-24T15:00:00.000Z",
          postedAt: "2026-08-24T15:00:00.000Z",
        });
      }
      stores.bd_inventory_writeoffs = [...documents, ...stores.bd_inventory_writeoffs];
      const revenueRecord = {
        ...body.revenueRecord,
        id: body.shiftId || body.revenueRecord.id || `shift:${body.shiftCloseId}`,
        venueId: state.activeVenueId,
        shiftCloseId: body.shiftCloseId,
        closingStatus: "closed",
        closedVia: "canonical-writeoff-v272",
        writeOffDocumentIds: documents.map((document) => document.id),
        writeOffItemCount: (body.writeOffItems || []).length,
        writeOffTotalCost: documents.some((document) => document.totalCost === null) ? null : documents.reduce((sum, document) => sum + document.totalCost, 0),
      };
      stores.bd_finance_revenue = [revenueRecord, ...stores.bd_finance_revenue.filter((row) => row.shiftCloseId !== body.shiftCloseId)];
      const response = { ok: true, idempotent: false, shiftId: revenueRecord.id, revenueRecord, writeOffDocuments: documents, writeOffs: stores.bd_inventory_writeoffs, assortment, stockMovements: stores.bd_stock_movements, expenses: stores.bd_finance_expenses || [], stockChanged: documents.length > 0 };
      state.shiftCloses.set(body.shiftCloseId, response);
      await route.fulfill(jsonResponse(response, 201));
      state.shiftCloseFulfilled = true;
      return;
    }
    if (url.pathname === "/api/write-offs") {
      const stores = state.stores[state.activeVenueId];
      const assortment = stores.bd_assortment_v1;
      const catalog = assortment.stockBalances.map((item) => ({
        nomenclatureItemId: item.productKey, productKey: item.productKey, name: item.name,
        aliases: item.name.startsWith("Coca") ? ["Кола", "Cola"] : [],
        category: item.taxonomyCategoryId, section: item.sectionId,
        current: item.current, unit: item.unit, displayUnit: item.displayUnit || "auto",
        packageOptions: item.packageOptions || (item.packageSize ? [item.packageSize] : []),
        averageUnitCost: item.averageUnitCost || null,
        costStatus: item.averageUnitCost > 0 ? "valued" : "unvalued",
        currency: item.currency,
      }));
      const reasons = [
        { code: "spoilage", label: "Порча" }, { code: "breakage", label: "Бой / разбили" },
        { code: "staff_meal", label: "Питание персонала" }, { code: "other", label: "Другое" },
      ];
      if (method === "GET") return route.fulfill(jsonResponse({ ok: true, venueId: state.activeVenueId, reasons, writeOffs: stores.bd_inventory_writeoffs, catalog }));
      const body = request.postDataJSON();
      if (body.action === "delete_draft") {
        stores.bd_inventory_writeoffs = stores.bd_inventory_writeoffs.filter((item) => item.id !== body.id || item.status !== "draft");
        return route.fulfill(jsonResponse({ ok: true, deleted: true, writeOffs: stores.bd_inventory_writeoffs, stockChanged: false }));
      }
      if (body.action === "cancel") {
        const document = stores.bd_inventory_writeoffs.find((item) => item.id === body.id);
        if (!document) return route.fulfill(jsonResponse({ ok: false, error: "Списание не найдено" }, 404));
        if (document.status !== "cancelled") {
          for (const line of document.items) {
            const balance = assortment.stockBalances.find((item) => item.productKey === line.productKey);
            balance.current += line.baseQuantity;
            stores.bd_stock_movements.unshift({ id: `reverse-${line.id}`, type: "return", date: "2026-08-24", productKey: line.productKey, productName: line.productName, amount: line.baseQuantity, unit: line.baseUnit, costAmount: line.totalCost, currency: line.currency, sourceDocumentId: document.id, sourceLineId: `reversal:${line.id}`, createdAt: "2026-08-24T12:00:00.000Z" });
          }
          document.status = "cancelled";
          document.cancelledAt = "2026-08-24T12:00:00.000Z";
        }
        return route.fulfill(jsonResponse({ ok: true, writeOff: document, writeOffs: stores.bd_inventory_writeoffs, assortment, stockMovements: stores.bd_stock_movements, stockChanged: true }));
      }
      const input = body.document;
      const existing = stores.bd_inventory_writeoffs.find((item) => item.id === input.id);
      if (existing?.status === "posted") return route.fulfill(jsonResponse({ ok: true, idempotent: true, writeOff: existing, writeOffs: stores.bd_inventory_writeoffs, assortment, stockMovements: stores.bd_stock_movements, stockChanged: false }));
      const preparedItems = input.items.map((line) => {
        const balance = assortment.stockBalances.find((item) => item.productKey === line.productKey);
        const baseQuantity = balance.unit === "g" && line.unit === "kg" ? line.quantity * 1000 : balance.unit === "ml" && line.unit === "l" ? line.quantity * 1000 : line.quantity;
        return { ...line, productName: balance.name, baseQuantity, baseUnit: balance.unit, unitCost: balance.averageUnitCost, totalCost: balance.averageUnitCost ? baseQuantity * balance.averageUnitCost : null, currency: balance.currency, costStatus: balance.averageUnitCost ? "valued" : "unvalued", stockBefore: balance.current, stockAfter: balance.current - baseQuantity };
      });
      const document = {
        ...input, venueId: state.activeVenueId, number: existing?.number || stores.bd_inventory_writeoffs.length + 1,
        reasonLabel: reasons.find((item) => item.code === input.reasonCode)?.label || input.reasonCode,
        items: preparedItems, itemCount: preparedItems.length,
        totalCost: preparedItems.some((item) => item.totalCost === null) ? null : preparedItems.reduce((sum, item) => sum + item.totalCost, 0),
        costStatus: preparedItems.some((item) => item.totalCost === null) ? "partial" : "full",
        unvaluedItemCount: preparedItems.filter((item) => item.totalCost === null).length,
        currency: preparedItems.find((item) => item.currency)?.currency,
        status: body.action === "save_draft" ? "draft" : "posted",
        movementIds: body.action === "save_draft" ? [] : preparedItems.map((item) => `movement-${item.id}`),
        createdBy: { accountId: 1, name: "Mobile QA", role: "owner" },
        createdAt: existing?.createdAt || "2026-08-24T10:00:00.000Z", updatedAt: "2026-08-24T10:00:00.000Z",
        postedAt: body.action === "post" ? "2026-08-24T10:00:00.000Z" : undefined,
      };
      stores.bd_inventory_writeoffs = [document, ...stores.bd_inventory_writeoffs.filter((item) => item.id !== document.id)];
      if (body.action === "post") {
        for (const line of preparedItems) {
          const balance = assortment.stockBalances.find((item) => item.productKey === line.productKey);
          balance.current = line.stockAfter;
          balance.inventoryValue = Math.max(0, Number(balance.inventoryValue || 0) - Number(line.totalCost || 0));
          stores.bd_stock_movements.unshift({ id: `movement-${line.id}`, type: "writeoff", date: input.date, productKey: line.productKey, productName: line.productName, amount: -line.baseQuantity, unit: line.baseUnit, costAmount: line.totalCost === null ? undefined : -line.totalCost, currency: line.currency, sourceDocumentId: document.id, sourceLineId: line.id, createdAt: "2026-08-24T10:00:00.000Z" });
        }
      }
      return route.fulfill(jsonResponse({ ok: true, writeOff: document, writeOffs: stores.bd_inventory_writeoffs, assortment, stockMovements: stores.bd_stock_movements, stockChanged: body.action === "post" }, body.action === "post" ? 201 : 200));
    }
    if (url.pathname === "/api/inventory/counts") {
      if (method === "POST") {
        const body = request.postDataJSON();
        if (body.action === "delete") {
          const snapshots = state.stores[state.activeVenueId].bd_inventory_snapshots;
          const index = snapshots.findIndex((item) => item.id === body.id);
          if (index < 0) return route.fulfill(jsonResponse({ ok: true, deleted: false, idempotent: true, venueId: state.activeVenueId, snapshots, stockChanged: false }));
          const current = snapshots[index];
          if (!["draft", "counting", "review"].includes(String(current.status || "")) || (current.adjustmentMovementIds || []).length) {
            return route.fulfill(jsonResponse({ ok: false, code: "INVENTORY_DELETE_PROTECTED", error: "Инвентаризация уже завершена или повлияла на склад" }, 409));
          }
          snapshots.splice(index, 1);
          return route.fulfill(jsonResponse({ ok: true, deleted: true, deletedInventoryId: body.id, venueId: state.activeVenueId, snapshots, stockChanged: false }));
        }
      }
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
  page.on("dialog", async (dialog) => {
    issues.push({ type: "native-dialog", message: dialog.message() });
    await dialog.dismiss();
  });
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

async function inventoryDeleteFlow(browser, profile) {
  const run = await createRun(browser, profile, "inventory-delete");
  const { page, state } = run;
  await goto(page, "/warehouse?venue=901&tab=counts");
  if (process.env.BD_QA_DEBUG) process.stderr.write(`[mobile-qa] inventory-delete DOM ${JSON.stringify({ cards: await page.locator(".bd-inventory-history-card-v270").count(), summaries: await page.locator(".bd-inventory-history-menu-v270 summary").count(), body: (await page.locator("body").innerText()).slice(0, 1400), issues: run.issues })}\n`);
  const draftCard = page.locator(".bd-inventory-history-card-v270").filter({ hasText: "Инвентаризация № 18" });
  await draftCard.locator("summary").click();
  const menuBox = await draftCard.locator("summary").boundingBox();
  assert.ok(menuBox.width >= 44 && menuBox.height >= 44, `${profile.name}: inventory action target is smaller than 44px`);
  await draftCard.getByRole("button", { name: "Удалить инвентаризацию" }).click();
  const dialog = page.locator(".bd-inventory-delete-dialog-v270");
  await dialog.waitFor();
  assert.match(await dialog.textContent(), /Остатки склада не изменятся/);
  assert.equal(await page.evaluate(() => document.body.classList.contains("bd-inventory-delete-open-v270")), true);
  const dialogBox = await dialog.boundingBox();
  assert.ok(dialogBox.x >= 0 && dialogBox.y >= 0 && dialogBox.x + dialogBox.width <= (profile.descriptor.viewport?.width || 1280) + 1, `${profile.name}: delete dialog is clipped`);
  await dialog.getByRole("button", { name: "Отмена" }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.body.classList.contains("bd-inventory-delete-open-v270")), false);

  await draftCard.locator("summary").click();
  await draftCard.getByRole("button", { name: "Удалить инвентаризацию" }).click();
  await dialog.getByRole("button", { name: "Удалить", exact: true }).click();
  await draftCard.waitFor({ state: "detached" });
  assert.equal(state.stores[901].bd_stock_movements.length, 0, `${profile.name}: draft delete changed movements`);
  assert.equal(new URL(page.url()).searchParams.get("tab"), "counts");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByText("Инвентаризация № 18", { exact: true }).count(), 0, `${profile.name}: deleted inventory returned after refresh`);

  const completedCard = page.locator(".bd-inventory-history-card-v270").filter({ hasText: "Инвентаризация № 20" });
  assert.equal(await completedCard.locator("summary").count(), 0, `${profile.name}: completed inventory exposes destructive delete`);
  assert.equal(await page.getByText("Инвентаризация № —", { exact: true }).count(), 0, `${profile.name}: legacy dash label remains visible`);
  const legacyCard = page.locator(".bd-inventory-history-card-v270").filter({ hasText: "Инвентаризация от" });
  await legacyCard.locator("summary").click();
  await legacyCard.getByRole("button", { name: "Удалить инвентаризацию" }).click();
  await dialog.getByRole("button", { name: "Удалить", exact: true }).click();
  await legacyCard.waitFor({ state: "detached" });

  await page.getByRole("button", { name: /Инвентаризация № 19/ }).click();
  await page.waitForSelector(".bd-inventory-layer-v246");
  await page.getByRole("button", { name: "Удалить инвентаризацию", exact: true }).click();
  await dialog.getByRole("button", { name: "Удалить", exact: true }).click();
  await page.waitForSelector(".bd-inventory-layer-v246", { state: "detached" });
  assert.equal(new URL(page.url()).searchParams.get("inventory"), null, `${profile.name}: fullscreen delete left a stale deep link`);
  assert.equal(new URL(page.url()).searchParams.get("tab"), "counts");
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden", `${profile.name}: fullscreen delete leaked scroll lock`);

  await goto(page, "/warehouse?venue=901&tab=counts&inventory=inv-mobile-19");
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".bd-inventory-layer-v246").count(), 0, `${profile.name}: deleted deep link reopened inventory`);
  assert.equal(new URL(page.url()).searchParams.get("inventory"), null, `${profile.name}: deleted deep link did not fall back to list`);
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

async function shiftCanonicalWriteoffFlow(browser, profile) {
  const run = await createRun(browser, profile, "shift-canonical-writeoffs");
  const { page, state } = run;
  await goto(page, "/shifts?venue=901&closeShift=1");
  try {
    await page.getByLabel("Дата смены", { exact: true }).waitFor({ timeout: 8_000 });
  } catch {
    const visibleControls = await page.locator("button,a").evaluateAll((nodes) => nodes.filter((node) => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    }).map((node) => (node.getAttribute("aria-label") || node.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 60));
    throw new Error(`${profile.name}: shift close wizard did not open at ${page.url()}; visible controls=${JSON.stringify(visibleControls)}`);
  }
  await page.getByLabel("Дата смены", { exact: true }).fill("2026-08-24");
  await page.getByLabel(`Выручка, ${profileFor(state.activeVenueId).currency}`, { exact: true }).fill("10000");
  await page.getByLabel("Количество чеков", { exact: true }).fill("50");
  await page.getByLabel("Количество гостей", { exact: true }).fill("60");
  await page.getByRole("button", { name: "Далее", exact: true }).click();
  await page.getByText(/Шаг 2 из 5 · Команда/).waitFor();
  await page.getByRole("button", { name: /Тест Бармен/ }).click();
  await page.getByRole("button", { name: "Далее", exact: true }).click();
  await page.waitForSelector('[data-bd-shift-writeoffs="canonical-v272"]');
  assert.doesNotMatch(await page.locator('[data-bd-shift-writeoffs="canonical-v272"]').textContent(), /Что списано и почему|Сумма/);

  await page.getByRole("button", { name: "+ Добавить позицию", exact: true }).click();
  await page.waitForSelector(".bd-writeoff-picker-v271");
  if (profile.descriptor.isMobile) {
    const pickerBox = await page.locator(".bd-writeoff-picker-v271").boundingBox();
    const viewport = page.viewportSize();
    assert.ok(pickerBox.x >= 0 && pickerBox.y >= 0 && pickerBox.x + pickerBox.width <= viewport.width + 1 && pickerBox.y + pickerBox.height <= viewport.height + 1, `${profile.name}: shift nomenclature picker is clipped`);
  }
  await page.locator(".bd-writeoff-picker-row-v271").filter({ hasText: "Jack Daniel's" }).click();
  const jackQuantity = page.getByLabel("Количество Jack Daniel's", { exact: true });
  await jackQuantity.focus();
  await page.keyboard.type("0.7");
  assert.equal(await jackQuantity.getAttribute("inputmode"), "decimal", `${profile.name}: quantity input does not request a numeric keyboard`);
  await jackQuantity.scrollIntoViewIfNeeded();
  assert.ok(await jackQuantity.isVisible(), `${profile.name}: focused quantity field is not visible`);
  await page.getByLabel("Причина Jack Daniel's", { exact: true }).selectOption("breakage");

  await page.getByRole("button", { name: "+ Добавить позицию", exact: true }).click();
  await page.locator(".bd-writeoff-picker-row-v271").filter({ hasText: "Лимон" }).click();
  await page.getByLabel("Количество Лимон", { exact: true }).fill("0.4");
  await page.getByLabel("Причина Лимон", { exact: true }).selectOption("spoilage");
  assert.match(await page.locator(".bd-shift-writeoff-total-v272").textContent(), /2 поз\.|144/);
  if (profile.descriptor.isMobile) await mobileAudit(page, profile.name, "shift-writeoffs-step-3");

  await page.getByRole("button", { name: "Далее", exact: true }).click();
  await page.getByText(/Шаг 4 из 5 · Происшествия/).waitFor();
  const stepBack = page.locator('[data-bd-shift-closing="guided-v17"]').getByRole("button", { name: "Назад", exact: true });
  const stepBackHit = await stepBack.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { insideViewport: box.top >= 0 && box.bottom <= innerHeight, ownsHit: hit === node || node.contains(hit), hit: hit?.outerHTML?.slice(0, 240) || "" };
  });
  assert.ok(stepBackHit.insideViewport && stepBackHit.ownsHit, `${profile.name}: wizard Back is not touchable ${JSON.stringify(stepBackHit)}`);
  await stepBack.click();
  try {
    await page.waitForSelector('[data-bd-shift-writeoffs="canonical-v272"]', { timeout: 8_000 });
  } catch {
    const wizardText = await page.locator("body").textContent();
    throw new Error(`${profile.name}: Step 4 -> Back did not restore canonical Step 3; url=${page.url()}; page=${wizardText.replace(/\s+/g, " ").slice(0, 1200)}`);
  }
  assert.equal(await page.getByLabel("Количество Jack Daniel's", { exact: true }).inputValue(), "0.7", `${profile.name}: Step 4 -> Back lost Jack quantity`);
  assert.equal(await page.getByLabel("Количество Лимон", { exact: true }).inputValue(), "0.4", `${profile.name}: Step 4 -> Back lost lemon quantity`);
  assert.equal(await page.getByLabel("Причина Jack Daniel's", { exact: true }).inputValue(), "breakage", `${profile.name}: Step 4 -> Back lost reason`);

  await page.getByRole("button", { name: "Далее", exact: true }).click();
  await page.getByText(/Шаг 4 из 5 · Происшествия/).waitFor();
  await page.getByRole("button", { name: "Далее", exact: true }).click();
  await page.getByText(/Шаг 5 из 5 · Проверка/).waitFor();
  await page.getByRole("button", { name: "Закрыть смену", exact: true }).click();
  try {
    await page.locator('[data-bd-shift-closing="guided-v17"]').waitFor({ state: "detached", timeout: 8_000 });
  } catch {
    const errorText = await page.locator(".bd-shift-writeoff-error-v272").textContent().catch(() => "");
    const wizardState = await page.locator('[data-bd-shift-closing="guided-v17"]').evaluate((node) => ({ text: node.textContent.replace(/\s+/g, " ").slice(-900), buttons: [...node.querySelectorAll("button")].map((button) => button.textContent.trim()).filter(Boolean), connected: node.isConnected, display: getComputedStyle(node).display, visibility: getComputedStyle(node).visibility, rect: node.getBoundingClientRect().toJSON(), url: location.href }));
    const revenueCaches = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((key) => key.includes("bd_finance_revenue")).map((key) => [key, localStorage.getItem(key)])));
    throw new Error(`${profile.name}: shift close did not finish; error=${errorText}; wizard=${JSON.stringify(wizardState)}; revenueCaches=${JSON.stringify(revenueCaches)}; fulfilled=${state.shiftCloseFulfilled}; responses=${JSON.stringify([...state.shiftCloses.keys()])}; canonicalStore=${state.stores[901].bd_inventory_writeoffs.length}; issues=${JSON.stringify(run.issues)}; requests=${JSON.stringify(state.shiftCloseRequests)}`);
  }

  assert.equal(state.shiftCloseRequests.length, 1, `${profile.name}: shift close submitted more than once`);
  const payload = state.shiftCloseRequests[0];
  assert.equal(payload.writeOffItems.length, 2);
  assert.equal(Object.hasOwn(payload.writeOffItems[0], "amount"), false, `${profile.name}: manual amount leaked into canonical payload`);
  assert.equal(state.stores[901].bd_inventory_writeoffs.length, 2, `${profile.name}: shift write-offs were not persisted in canonical Warehouse store; responseDocs=${state.shiftCloses.get(payload.shiftCloseId)?.writeOffDocuments?.length}; responseStore=${state.shiftCloses.get(payload.shiftCloseId)?.writeOffs?.length}; writes=${JSON.stringify(state.storeWrites)}`);
  assert.equal(state.stores[901].bd_stock_movements.filter((movement) => movement.type === "writeoff").length, 2);
  assert.equal(state.stores[901].bd_assortment_v1.stockBalances.find((item) => item.name === "Jack Daniel's").current, 5000);
  assert.equal(state.stores[901].bd_assortment_v1.stockBalances.find((item) => item.name === "Лимон").current, 2850);

  const retry = await page.evaluate(async (body) => {
    const response = await fetch("/api/shifts/close", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": body.shiftCloseId }, body: JSON.stringify(body) });
    return { status: response.status, json: await response.json() };
  }, payload);
  assert.equal(retry.status, 200);
  assert.equal(retry.json.idempotent, true);
  assert.equal(state.stores[901].bd_assortment_v1.stockBalances.find((item) => item.name === "Jack Daniel's").current, 5000, `${profile.name}: retry decremented stock twice`);

  const venueMismatch = await page.evaluate(async (body) => {
    const response = await fetch("/api/shifts/close", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": "venue-mismatch" }, body: JSON.stringify({ ...body, shiftCloseId: "venue-mismatch", venueId: 902 }) });
    return { status: response.status, json: await response.json() };
  }, payload);
  assert.equal(venueMismatch.status, 403);
  assert.equal(venueMismatch.json.code, "SHIFT_VENUE_MISMATCH");

  await goto(page, "/warehouse?venue=901&tab=writeoffs");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".bd-writeoff-document-list-v271 article").count(), 2, `${profile.name}: shift documents disappeared after Warehouse refresh`);
  assert.match(await page.locator(".bd-writeoff-document-list-v271").textContent(), /Смена/);
  await page.locator(".bd-writeoff-document-list-v271 article > button").first().click();
  await page.waitForSelector("[data-bd-writeoff-detail]");
  assert.match(await page.locator("[data-bd-writeoff-detail]").textContent(), /Связано со сменой/);
  await page.getByRole("button", { name: "Вернуться к списаниям", exact: true }).click();
  await page.locator(".bd-warehouse-tabs button").filter({ hasText: "Движения" }).click();
  assert.ok(await page.getByRole("button", { name: "Документ", exact: true }).count() >= 2, `${profile.name}: shift movements are not linked to canonical documents`);
  await page.locator(".bd-warehouse-tabs button").filter({ hasText: "Остатки" }).click();
  await page.getByLabel("Группировка остатков", { exact: true }).selectOption("list");
  assert.match(await page.locator("body").textContent(), /Jack Daniel's|Лимон/);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(state.stores[901].bd_inventory_writeoffs.length, 2, `${profile.name}: refresh lost canonical shift documents`);

  await goto(page, "/finance?venue=901");
  const financeWriteoffEntry = page.locator(".bd-finance-actions-v160 button").filter({ hasText: "Создать списание" });
  assert.equal(await financeWriteoffEntry.count(), 1, `${profile.name}: Finance canonical write-off quick action is missing`);
  await financeWriteoffEntry.click();
  await page.waitForURL(/\/warehouse\?.*tab=writeoffs/);
  try {
    await page.waitForSelector('[data-bd-writeoff-flow="canonical-v271"]', { timeout: 8_000 });
  } catch {
    throw new Error(`${profile.name}: Finance canonical entry did not open the write-off form; url=${page.url()}; body=${(await page.locator("body").textContent()).replace(/\s+/g, " ").slice(-1200)}`);
  }
  assert.match(page.url(), /writeoff=new/);
  assert.doesNotMatch(await page.locator('[data-bd-writeoff-flow="canonical-v271"]').textContent(), /Что списано и почему|Сумма/);

  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true, documents: 2, movements: 2 };
}

async function procurementFlow(browser, profile) {
  const run = await createRun(browser, profile, "suppliers-purchases");
  const { page } = run;
  await goto(page, "/suppliers?qaProcurement=default&venue=401");
  try {
    await page.waitForSelector(".bd-proc-command-v168");
  } catch {
    throw new Error(`${profile.name}: procurement workspace did not open; url=${page.url()}; issues=${JSON.stringify(run.issues)}; body=${(await page.locator("body").textContent()).replace(/\s+/g, " ").slice(-1200)}`);
  }
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

async function businessHealthColdStartFlow(browser, profile) {
  const run = await createRun(browser, profile, "business-health-cold-start");
  const { page } = run;
  const response = await page.goto(`${baseUrl}/home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  assert.equal(response?.status(), 200, `${profile.name}: cold start expected HTTP 200`);
  await page.waitForSelector('[data-bd-health-startup-state="SPLASH_LOADING"]', { timeout: 10_000 });
  const entry = page.locator('[data-bd-health-entry="v284"]');
  await entry.waitFor({ timeout: 10_000 });
  const splash = await entry.evaluate((node) => ({
    snapshotId: node.getAttribute("data-bd-health-snapshot-id"),
    score: node.querySelector(".bd-health-entry-score-copy strong")?.textContent?.trim(),
    status: node.querySelector(".bd-health-entry-status")?.textContent?.trim(),
    factor: node.querySelector(".bd-health-entry-factor strong")?.textContent?.trim(),
    confidence: node.querySelector(".bd-health-entry-confidence strong")?.textContent?.trim(),
  }));
  assert.deepEqual(splash, {
    snapshotId: "business-health-snapshot:901:mobile-qa",
    score: "58", status: "Требует внимания", factor: "Финансы 41/100", confidence: "77%",
  }, `${profile.name}: Splash did not render the canonical snapshot`);
  await entry.getByRole("button", { name: "Пропустить Health Score и открыть Главную" }).click();
  const home = page.locator('[data-bd-home-health-index="business-health-snapshot-v284"]');
  await home.waitFor({ timeout: 10_000 });
  const readHome = () => home.evaluate((node) => ({
    snapshotId: node.getAttribute("data-bd-health-snapshot-id"),
    score: node.querySelector(".bd-home-health-value strong")?.textContent?.trim(),
    status: node.querySelector(".bd-home-health-status")?.textContent?.trim(),
    factor: node.querySelector(".bd-home-health-factor")?.textContent?.trim(),
    confidence: node.querySelector(".bd-home-health-confidence")?.textContent?.trim(),
  }));
  const firstHome = await readHome();
  assert.equal(firstHome.snapshotId, splash.snapshotId, `${profile.name}: Home replaced the Splash snapshot`);
  assert.equal(firstHome.score, splash.score, `${profile.name}: Home score differs from Splash`);
  assert.equal(firstHome.status, splash.status, `${profile.name}: Home status differs from Splash`);
  assert.match(firstHome.factor || "", /^Финансы: 41\/100/, `${profile.name}: Home primary factor differs from Splash`);
  assert.match(firstHome.confidence || "", /Достоверность диагноза 77%/, `${profile.name}: Home confidence differs from Splash`);
  assert.doesNotMatch(await home.textContent(), /Загрузка|Получаем актуальный диагноз/i, `${profile.name}: Home returned to loading after Splash`);
  await page.waitForTimeout(8_000);
  assert.deepEqual(await readHome(), firstHome, `${profile.name}: canonical snapshot changed without invalidation`);
  await mobileAudit(page, profile.name, "business-health-cold-start");
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true, snapshot: firstHome };
}

async function embeddedModulesFlow(browser, profile) {
  const run = await createRun(browser, profile, "embedded-modules");
  const { page } = run;

  await goto(page, "/data-control?venue=901");
  const dataControlFrame = page.frames().find((candidate) => {
    try {
      const url = new URL(candidate.url());
      return url.pathname === "/data-control" && url.searchParams.get("embedded") === "1";
    }
    catch { return false; }
  });
  assert.ok(dataControlFrame, `${profile.name}: data-control iframe is missing`);
  await dataControlFrame.waitForSelector(".trust-tabs");
  const initialLayout = await dataControlFrame.evaluate(() => {
    const header = document.querySelector(".trust-header");
    const tabs = document.querySelector(".trust-tabs");
    const tabsRect = tabs.getBoundingClientRect();
    return {
      embedded: document.documentElement.dataset.bdEmbedded,
      headerDisplay: getComputedStyle(header).display,
      tabsTop: tabsRect.top,
      tabsCssTop: getComputedStyle(tabs).top,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    };
  });
  assert.equal(initialLayout.embedded, "true", `${profile.name}: embedded layout contract was not installed`);
  assert.equal(initialLayout.headerDisplay, "none", `${profile.name}: local data-control header duplicates the app header`);
  assert.equal(initialLayout.tabsCssTop, "0px", `${profile.name}: hidden header still reserves a sticky offset`);
  assert.ok(Math.abs(initialLayout.tabsTop) <= 1, `${profile.name}: secondary navigation is not attached to the iframe top`);
  assert.ok(initialLayout.scrollWidth <= initialLayout.clientWidth + 1, `${profile.name}: data-control iframe has horizontal overflow ${initialLayout.scrollWidth}/${initialLayout.clientWidth}`);

  const safeLabel = `${profile.name}-data-control`.replace(/[^a-z0-9-]+/gi, "-");
  await page.screenshot({ path: path.join(outputDir, `${safeLabel}-initial.png`), fullPage: false });
  const scrollStates = [];
  for (const checkpoint of [0.25, 0.5, 0.75, 1, 0]) {
    const state = await dataControlFrame.evaluate((ratio) => {
      const root = document.scrollingElement;
      root.scrollTop = Math.round((root.scrollHeight - root.clientHeight) * ratio);
      const tabs = document.querySelector(".trust-tabs");
      const rect = tabs.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.max(1, rect.left + rect.width / 2), Math.max(1, rect.top + rect.height / 2));
      return {
        ratio,
        scrollTop: root.scrollTop,
        maxScroll: root.scrollHeight - root.clientHeight,
        tabsTop: rect.top,
        tabsBottom: rect.bottom,
        tabsOwnsHitTarget: Boolean(hit && (hit === tabs || tabs.contains(hit))),
      };
    }, checkpoint);
    scrollStates.push(state);
    if (state.maxScroll > 0) assert.ok(Math.abs(state.tabsTop) <= 1, `${profile.name}: sticky tabs moved at ${checkpoint * 100}% scroll`);
    assert.equal(state.tabsOwnsHitTarget, true, `${profile.name}: content paints above sticky tabs at ${checkpoint * 100}% scroll`);
    if (checkpoint === 0.5) await page.screenshot({ path: path.join(outputDir, `${safeLabel}-middle.png`), fullPage: false });
    if (checkpoint === 1) await page.screenshot({ path: path.join(outputDir, `${safeLabel}-bottom.png`), fullPage: false });
  }
  if (initialLayout.scrollHeight > initialLayout.clientHeight) {
    assert.ok(scrollStates.some((state) => state.scrollTop > 0), `${profile.name}: data-control frame did not scroll`);
    assert.equal(scrollStates.at(-1).scrollTop, 0, `${profile.name}: data-control frame did not return to the top`);
  }

  let frame = page.frameLocator("iframe");
  await frame.locator("[data-tab='journal']").click();
  await page.waitForURL(/tab=journal/);
  await frame.locator("[data-tab='periods']").click();
  await page.waitForURL(/tab=periods/);
  await page.goBack();
  await page.waitForURL(/tab=journal/);

  if (profile.descriptor.isMobile) await mobileAudit(page, profile.name, "embedded-data-control");
  else {
    const desktopOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.ok(desktopOverflow.scrollWidth <= desktopOverflow.clientWidth + 1, `${profile.name}: embedded desktop route has horizontal overflow`);
  }
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
  await page.locator(".bd-profile-venue-head-v280.is-action").click();
  const venueEditor = page.locator('[data-bd-profile-editor="venue-v282"]');
  await venueEditor.waitFor();
  await page.locator("bd-app-header .bd-app-back").click();
  await venueEditor.waitFor({ state: "detached" });
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden", `${profile.name}: form Close leaked body scroll lock`);
  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true };
}

async function writeoffFlow(browser, profile) {
  const run = await createRun(browser, profile, "writeoffs");
  const { page, state } = run;
  await goto(page, "/warehouse?venue=901&tab=writeoffs");
  await page.getByRole("button", { name: "+ Новое", exact: true }).click();
  await page.waitForSelector("[data-bd-writeoff-flow]");

  if (profile.descriptor.isMobile) await mobileAudit(page, profile.name, "writeoff-new", { fullscreen: true });
  const shell = page.locator(".bd-writeoff-fullscreen-v271");
  const close = page.getByRole("button", { name: "Закрыть списание", exact: true });
  const closeBox = await close.boundingBox();
  assert.ok(closeBox.width >= 44 && closeBox.height >= 44, `${profile.name}: write-off Close target is smaller than 44px`);
  const viewport = page.viewportSize();
  const shellBox = await shell.boundingBox();
  assert.ok(shellBox.x >= 0 && shellBox.y >= 0 && shellBox.x + shellBox.width <= viewport.width + 1 && shellBox.y + shellBox.height <= viewport.height + 1, `${profile.name}: write-off fullscreen is clipped`);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden", `${profile.name}: write-off did not own scrolling`);

  await close.click();
  await shell.waitFor({ state: "detached" });
  assert.equal(new URL(page.url()).searchParams.get("writeoff"), null);
  assert.equal(new URL(page.url()).searchParams.get("tab"), "writeoffs");
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden", `${profile.name}: Close leaked body scroll lock`);

  await page.getByRole("button", { name: "+ Новое", exact: true }).click();
  await page.getByLabel("Причина списания").selectOption("spoilage");
  await page.getByRole("button", { name: "+ Добавить позицию", exact: true }).click();
  await page.waitForSelector(".bd-writeoff-picker-v271");
  await page.locator(".bd-writeoff-picker-row-v271").filter({ hasText: "Пиво Mobile A" }).click();
  await page.getByLabel("Количество Пиво Mobile A").fill("2");

  await page.getByRole("button", { name: "+ Добавить позицию", exact: true }).click();
  const search = page.getByLabel("Поиск по номенклатуре");
  await search.fill("Кола");
  assert.equal(await page.locator(".bd-writeoff-picker-row-v271").count(), 1, `${profile.name}: canonical alias search did not narrow the catalog`);
  await page.locator(".bd-writeoff-picker-row-v271").click();
  await page.getByLabel("Количество Coca-Cola Mobile A").fill("1");

  const main = page.locator(".bd-writeoff-flow-v271");
  await main.evaluate((node) => { node.scrollTop = Math.max(1, node.scrollHeight - node.clientHeight); });
  if (await main.evaluate((node) => node.scrollHeight > node.clientHeight)) {
    assert.ok(await main.evaluate((node) => node.scrollTop > 0), `${profile.name}: long write-off form does not own scrolling`);
  }
  await page.getByRole("button", { name: "Провести списание", exact: true }).click();
  await page.waitForSelector("[data-bd-writeoff-detail]");
  const documentId = new URL(page.url()).searchParams.get("writeoff");
  assert.ok(documentId && documentId !== "new", `${profile.name}: posting did not replace new deep link with document detail`);
  assert.equal(state.stores[901].bd_assortment_v1.stockBalances.find((item) => item.name === "Пиво Mobile A").current, 18);
  assert.equal(state.stores[901].bd_assortment_v1.stockBalances.find((item) => item.name === "Coca-Cola Mobile A").current, 11);
  assert.equal(state.stores[901].bd_stock_movements.filter((item) => item.type === "writeoff").length, 2);
  assert.match(await page.locator("[data-bd-writeoff-detail]").textContent(), /2 позиций/);

  await page.getByRole("button", { name: "Закрыть документ списания", exact: true }).click();
  await page.waitForSelector("[data-bd-writeoff-detail]", { state: "detached" });
  assert.equal(new URL(page.url()).searchParams.get("writeoff"), null, `${profile.name}: detail Close did not return to list`);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".bd-writeoff-document-list-v271 article").count(), 1, `${profile.name}: server-authoritative document disappeared after refresh`);

  await page.locator(".bd-writeoff-document-list-v271 article > button").first().click();
  await page.waitForSelector("[data-bd-writeoff-detail]");
  await page.goBack();
  await page.waitForSelector("[data-bd-writeoff-detail]", { state: "detached" });
  assert.equal(new URL(page.url()).searchParams.get("tab"), "writeoffs");

  await goto(page, `/warehouse?venue=901&tab=writeoffs&writeoff=${encodeURIComponent(documentId)}`);
  await page.waitForSelector("[data-bd-writeoff-detail]");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-bd-writeoff-detail]");
  await page.getByRole("button", { name: "Вернуться к списаниям", exact: true }).click();
  await page.waitForSelector("[data-bd-writeoff-detail]", { state: "detached" });
  assert.equal(new URL(page.url()).pathname, "/warehouse", `${profile.name}: deep-link Back escaped Warehouse`);
  assert.equal(new URL(page.url()).searchParams.get("writeoff"), null, `${profile.name}: deep-link Back retained stale document state`);

  await goto(page, "/warehouse?venue=901&tab=writeoffs");
  await page.locator(".bd-warehouse-tabs button").filter({ hasText: "Движения" }).click();
  const movementLink = page.getByRole("button", { name: "Документ", exact: true }).first();
  await movementLink.waitFor();
  await movementLink.click();
  await page.waitForFunction((expectedId) => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "writeoffs" && params.get("writeoff") === expectedId;
  }, documentId);
  await page.waitForSelector("[data-bd-writeoff-detail]");
  assert.equal(new URL(page.url()).searchParams.get("writeoff"), documentId);
  await page.getByRole("button", { name: "Вернуться к списаниям", exact: true }).click();

  await page.locator(".bd-warehouse-tabs button").filter({ hasText: "Списания" }).click();
  await page.getByRole("button", { name: "+ Новое", exact: true }).click();
  await page.getByLabel("Причина списания").selectOption("breakage");
  await close.click();
  const confirm = page.locator(".bd-writeoff-confirm-v271");
  await confirm.waitFor();
  await confirm.getByRole("button", { name: "Отмена", exact: true }).click();
  await confirm.waitFor({ state: "detached" });
  assert.equal(await shell.count(), 1, `${profile.name}: cancelling unsaved guard closed the form`);
  await close.click();
  await confirm.waitFor();
  await confirm.getByRole("button", { name: "Закрыть", exact: true }).click();
  await confirm.waitFor({ state: "detached" });
  try {
    await page.waitForFunction(() => new URLSearchParams(location.search).get("writeoff") === null, undefined, { timeout: 3_000 });
  } catch {
    throw new Error(`${profile.name}: custom Close did not clear write-off state: ${JSON.stringify(await page.evaluate(() => ({ url: location.href, close: window.__bdWriteoffCloseV271 })))}`);
  }
  await shell.waitFor({ state: "detached" });
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden", `${profile.name}: unsaved guard leaked body scroll lock`);

  await page.getByRole("button", { name: "+ Новое", exact: true }).click();
  await page.getByLabel("Причина списания").selectOption("staff_meal");
  state.activeVenueId = 902;
  await page.evaluate(() => {
    localStorage.setItem("bd_active_venue_id", "902");
    window.dispatchEvent(new CustomEvent("bd:venue-changed", { detail: { venueId: 902 } }));
  });
  await page.waitForSelector("[data-bd-writeoff-flow]", { state: "detached" });
  await page.waitForTimeout(250);
  assert.equal(new URL(page.url()).searchParams.get("writeoff"), null, `${profile.name}: draft leaked across venue switch`);
  assert.doesNotMatch(await page.locator("body").textContent(), /Пиво Mobile A|Coca-Cola Mobile A/, `${profile.name}: Venue A nomenclature leaked into Venue B`);
  assert.equal(state.stores[902].bd_inventory_writeoffs.length, 0, `${profile.name}: Venue A document leaked into Venue B`);

  await closeRun(run);
  return { profile: profile.name, scenario: run.label, passed: true, documentId };
}

async function runProfile(browser, profile) {
  assert.ok(profile.descriptor.isMobile, `${profile.name}: Playwright descriptor is not mobile`);
  assert.ok(profile.descriptor.hasTouch, `${profile.name}: Playwright descriptor has no touch`);
  assert.match(profile.descriptor.userAgent, profile.userAgentPattern);
  const results = [];
  for (const [name, flow] of [
    ["writeoffs", writeoffFlow],
    ["shift-canonical-writeoffs", shiftCanonicalWriteoffFlow],
    ["inventory-fullscreen", inventoryFlow],
    ["inventory-delete", inventoryDeleteFlow],
    ["warehouse-nomenclature", nomenclatureFlow],
    ["shifts", shiftsFlow],
    ["suppliers-purchases", procurementFlow],
    ["menu-tech-cards", assortmentFlow],
    ["embedded-modules", embeddedModulesFlow],
    ["critical-form-close", formCloseFlow],
    ["critical-modules", moduleSmokeFlow],
    ["business-health-cold-start", businessHealthColdStartFlow],
  ]) {
    if (process.env.BD_QA_SCENARIO && process.env.BD_QA_SCENARIO !== name) continue;
    process.stderr.write(`[mobile-qa] ${profile.name}/${name}\n`);
    results.push(await flow(browser, profile));
  }
  return results;
}

(async () => {
  browserPath = await resolveBrowserExecutable(browserPath);
  assert.ok(fs.existsSync(browserPath), `Playwright browser executable not found: ${browserPath}`);
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [...chromiumArgs, "--no-sandbox", "--disable-dev-shm-usage", "--no-proxy-server"],
  });
  const results = [];
  const failures = [];
  try {
    for (const profile of profiles) {
      if (process.env.BD_QA_PROFILE && process.env.BD_QA_PROFILE !== profile.name) continue;
      results.push(...await runProfile(browser, profile));
    }
    if (!process.env.BD_QA_PROFILE || process.env.BD_QA_PROFILE === desktopProfile.name) {
      if (!process.env.BD_QA_SCENARIO || process.env.BD_QA_SCENARIO === "embedded-modules") {
        process.stderr.write(`[mobile-qa] ${desktopProfile.name}/embedded-modules\n`);
        results.push(await embeddedModulesFlow(browser, desktopProfile));
      }
      if (!process.env.BD_QA_SCENARIO || process.env.BD_QA_SCENARIO === "writeoffs") {
        process.stderr.write(`[mobile-qa] ${desktopProfile.name}/writeoffs\n`);
        results.push(await writeoffFlow(browser, desktopProfile));
      }
      if (!process.env.BD_QA_SCENARIO || process.env.BD_QA_SCENARIO === "shift-canonical-writeoffs") {
        process.stderr.write(`[mobile-qa] ${desktopProfile.name}/shift-canonical-writeoffs\n`);
        results.push(await shiftCanonicalWriteoffFlow(browser, desktopProfile));
      }
      if (!process.env.BD_QA_SCENARIO || process.env.BD_QA_SCENARIO === "inventory-delete") {
        process.stderr.write(`[mobile-qa] ${desktopProfile.name}/inventory-delete\n`);
        results.push(await inventoryDeleteFlow(browser, desktopProfile));
      }
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
    profiles: [...profiles, desktopProfile].map((profile) => ({ name: profile.name, viewport: profile.descriptor.viewport, screen: profile.descriptor.screen, deviceScaleFactor: profile.descriptor.deviceScaleFactor, isMobile: profile.descriptor.isMobile, hasTouch: profile.descriptor.hasTouch, userAgent: profile.descriptor.userAgent })),
    results,
    failures,
    passed: failures.length === 0,
  };
  fs.writeFileSync(path.join(outputDir, "mobile-navigation-qa.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.passed) process.exit(1);
})();
