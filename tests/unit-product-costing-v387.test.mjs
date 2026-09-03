import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "acorn";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");

function costingApi() {
  const stateStart = bundle.indexOf("function bdCatState");
  const stateEnd = bundle.indexOf("function bdCatTypeLabel", stateStart);
  const costStart = bundle.indexOf("function bdTechCostUnitV376");
  const costEnd = bundle.indexOf("function bdAssortmentFallbackAnalyticsV170", costStart);
  assert.ok(stateStart >= 0 && stateEnd > stateStart && costStart >= 0 && costEnd > costStart);
  const context = {
    bdCatArray: (value) => Array.isArray(value) ? value : [],
    bdCatDefaultGroups: () => [{ id: "bar", name: "Бар", legacyDepartment: "bar", sortOrder: 0 }],
    bdCatNumber: (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback,
    bdCatDepartment: () => "bar",
    bdCatSubsection: () => "Напитки",
    bdCatNormName: (value) => String(value ?? "").toLowerCase(),
    bdCatStableTaxId: (_prefix, group, name) => `${group}:${name}`,
    bdAssortmentNumberV170: (value, fallback = 0) => {
      const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(parsed) ? parsed : fallback;
    },
  };
  vm.createContext(context);
  vm.runInContext(`${bundle.slice(stateStart, stateEnd)};${bundle.slice(costStart, costEnd)};this.api={state:bdCatState,canonical:bdTechCostCanonicalV376,maps:bdTechCostMapsV376,row:bdTechCostRowV376}`, context);
  return context.api;
}

test("v387 bundle is valid and carries the exact legacy-key fix", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-unit-product-costing-v387/);
  assert.match(bundle, /bd-unit-product-costing-v391/);
  assert.match(bundle, /bd-unit-product-costing-v392/);
  assert.match(bundle, /bd-unit-product-costing-v393/);
  assert.match(bundle, /bdTechCostAggregatePointV392/);
  assert.match(bundle, /bdTechCostLineAmountV393/);
  assert.match(bundle, /bdTechCostLineAmountV393\(v\)/);
  assert.match(bundle, /водаминеральная\|минеральнаявода\|вода/);
  assert.match(bundle, /bdMenuSaleSizeTextV298\(m\.saleSize/);
  assert.match(bundle, /Promise\.all\(\[Yse\(bdCatalogStoreKey,c\),Yse\(bdPurchaseStoreKey,c\)/);
  assert.match(bundle, /window\.addEventListener\("bd:store-updated",P\)/);
  assert.doesNotMatch(bundle, /if\(!n\|\|!s\.activeVenueId\)return;const w=\+\+fe\.current/);
});

test("exact server export selects Vprok invoice 379 instead of Sheriff invoice 372", () => {
  const api = costingApi();
  const state = api.state({
    inventoryProductAliases: [{ from: "stock:боржоми 0 5 л|ml", to: "stock:боржоми|ml" }],
    nomenclature: [{
      productKey: "stock:боржоми|ml",
      name: "Вода Боржоми",
      unit: "ml",
      packageSize: "Несколько фасовок",
      packageOptions: ["0,5 л", "л"],
      externalProductKeys: ["вода минеральная боржоми|0 5 л", "вода боржоми|л", "боржоми 0 5 л|0 5 л", "stock:боржоми 0 5 л|ml"],
      current: 8500,
    }],
    stockBalances: [{
      key: "stock:боржоми|ml",
      name: "Вода Боржоми",
      unit: "ml",
      packageSize: "Несколько фасовок",
      packageOptions: ["0,5 л", "л"],
      current: 8500,
    }],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [
    {
      id: "sheriff-372",
      documentNumber: "372",
      status: "confirmed",
      date: "2026-08-01",
      supplierName: "Шериф",
      currency: "PMR_RUB",
      items: [{
        id: "legacy-generic-borjomi",
        name: "Вода Боржоми",
        purchaseProductKey: "вода боржоми|л",
        quantity: 2.5,
        unit: "л",
        unitPrice: 104,
        lineTotal: 260,
      }],
    },
    {
      id: "vprok-379",
      documentNumber: "379",
      status: "confirmed",
      date: "2026-08-07",
      supplierName: "Впрок",
      currency: "PMR_RUB",
      items: [{
        id: "exact-half-borjomi",
        name: "Боржоми 0.5 л",
        quantity: 12,
        unit: "шт.",
        unitPrice: 24.65,
        lineTotal: 295.8,
      }],
    },
  ], canonical);

  const row = api.row({
    id: "borjomi-recipe-line",
    name: "Боржоми",
    matchedName: "Вода Боржоми",
    purchaseProductKey: "stock:боржоми|pcs",
    nomenclatureItemId: "stock:боржоми|ml",
    linkStatus: "missing",
    resolutionStatus: "linked_packaging_review",
    quantity: 1,
    unit: "шт.",
    packageSize: "1 шт.",
  }, maps, canonical, {
    name: "Боржоми",
    type: "ready",
    portionSize: "0,5 л",
  }, "0,5 л");

  assert.equal(row.complete, true, JSON.stringify(row));
  assert.equal(row.cost, 24.65);
  assert.match(row.productKey, /^unmapped:package:боржоми:ml:500$/);
  assert.equal(row.purchaseDate, "2026-08-07");
  assert.equal(row.supplierName, "Впрок");
  assert.equal(row.purchaseDocumentNumber, "379");
  assert.equal(row.purchasePackageSize, "Боржоми 0.5 л");
  assert.notEqual(row.purchaseDocumentNumber, "372");
});

test("legacy portionSize alone supplies the 0.5 L package hint", () => {
  const api = costingApi();
  const state = api.state({ nomenclature: [{ productKey: "borjomi-half", name: "Боржоми 0.5 л", unit: "pcs", packageSize: "0,5 л" }] });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    id: "vprok-379",
    documentNumber: "379",
    status: "confirmed",
    date: "2026-08-07",
    supplierName: "Впрок",
    currency: "PMR_RUB",
    items: [{ name: "Боржоми 0.5 л", purchaseProductKey: "borjomi-half", quantity: 12, unit: "шт.", packageSize: "0,5 л", lineTotal: 295.8 }],
  }], canonical);
  const row = api.row({ name: "Вода Боржоми", purchaseProductKey: "missing-legacy-key", quantity: 1, unit: "шт." }, maps, canonical, { portionSize: "0,5 л" });
  assert.equal(row.cost, 24.65);
  assert.equal(row.purchaseDocumentNumber, "379");
});

test("aggregate litre receipts recover exact 1.25 L cola and sprite costs without pricing Sprite 0.5", () => {
  const api = costingApi();
  const state = api.state({
    nomenclature: [
      { productKey: "stock:спрайт|ml", name: "Спрайт", unit: "ml", packageSize: "Несколько фасовок" },
      { productKey: "stock:кола|ml", name: "Кола", unit: "ml", packageSize: "Несколько фасовок" },
    ],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [
    {
      id: "sheriff-372",
      documentNumber: "372",
      status: "confirmed",
      date: "2026-08-01",
      supplierName: "Шериф",
      currency: "PMR_RUB",
      items: [
        { id: "sprite-372", name: "Спрайт", purchaseProductKey: "stock:спрайт|ml", quantity: 1.25, unit: "л", lineTotal: 26.5 },
        { id: "cola-372", name: "Кола", purchaseProductKey: "stock:кола|ml", quantity: 15, unit: "л", lineTotal: 324 },
      ],
    },
    {
      id: "vprok-379",
      documentNumber: "379",
      status: "confirmed",
      date: "2026-08-07",
      supplierName: "Впрок",
      currency: "PMR_RUB",
      items: [{ id: "cola-379", name: "Кола", purchaseProductKey: "stock:кола|ml", quantity: 75, unit: "л", packageSize: "75 л", lineTotal: 1780.2 }],
    },
    {
      id: "sheriff-391",
      documentNumber: "391",
      status: "confirmed",
      date: "2026-08-22",
      supplierName: "Шериф",
      currency: "PMR_RUB",
      items: [{ id: "sprite-391", name: "Спрайт", purchaseProductKey: "stock:спрайт|ml", quantity: 7.5, unit: "л", packageSize: "л", lineTotal: 153 }],
    },
  ], canonical);
  const sprite125 = api.row({
    name: "Спрайт",
    matchedName: "Спрайт",
    purchaseProductKey: "stock:спрайт|ml",
    quantity: 1.25,
    unit: "мл",
    normalizedQuantity: 1250,
    normalizedUnit: "ml",
  }, maps, canonical, { name: "Спрайт 1,25л.", portionSize: "1,25 л" }, "1,25 л");
  const sprite05 = api.row({
    name: "Спрайт",
    matchedName: "Спрайт",
    purchaseProductKey: "stock:спрайт|ml",
    quantity: 1,
    unit: "шт.",
    normalizedQuantity: 500,
    normalizedUnit: "ml",
  }, maps, canonical, { name: "Спрайт 0,5л.", portionSize: "0,5 л" }, "0,5 л");
  const cola125 = api.row({
    name: "Кола",
    matchedName: "Кола",
    purchaseProductKey: "stock:кола|ml",
    quantity: 1.25,
    unit: "мл",
    normalizedQuantity: 1250,
    normalizedUnit: "ml",
  }, maps, canonical, { name: "Кола 1,25л.", portionSize: "1,25 л" }, "1,25 л");

  assert.equal(sprite125.complete, true, JSON.stringify(sprite125));
  assert.equal(sprite125.cost, 25.5);
  assert.equal(sprite125.purchaseDocumentNumber, "391");
  assert.equal(sprite125.packageLabel, "1,25 л");
  assert.equal(cola125.complete, true, JSON.stringify(cola125));
  assert.equal(cola125.cost, 29.67);
  assert.equal(cola125.purchaseDocumentNumber, "379");
  assert.equal(cola125.packageLabel, "1,25 л");
  assert.equal(sprite05.complete, false);
  assert.equal(sprite05.reason, "price");
});
