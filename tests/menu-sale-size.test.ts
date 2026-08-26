import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMenuSaleSize,
  normalizeManualMenuSaleSize,
  parseLegacyMenuSaleSize,
  resolveMenuItemSaleSize,
  resolveReadyProductConsumption,
  validateMenuItemSaleSize,
} from "../lib/bardoctor/menu-sale-size";

test("manual sale size accepts comma and dot but stores a numeric canonical value", () => {
  assert.deepEqual(normalizeManualMenuSaleSize("1,25", "l"), {
    version: 1,
    quantity: 1.25,
    unit: "l",
    baseQuantity: 1_250,
    baseUnit: "ml",
    source: "manual",
    status: "confirmed",
  });
  assert.deepEqual(normalizeManualMenuSaleSize("1.25", "l"), normalizeManualMenuSaleSize("1,25", "l"));
  assert.equal(normalizeManualMenuSaleSize("cola", "l"), null);
  assert.equal(normalizeManualMenuSaleSize(-1, "l"), null);
  assert.equal(normalizeManualMenuSaleSize(350, "kg")?.baseUnit, "g");
});

test("legacy values are parsed only when quantity and unit are unambiguous", () => {
  for (const [legacy, quantity, unit] of [
    ["1,25 л", 1.25, "l"],
    ["1.25л.", 1.25, "l"],
    ["1.25 L", 1.25, "l"],
    ["1250 мл", 1_250, "ml"],
    ["500ml", 500, "ml"],
    ["330 г", 330, "g"],
    ["1 шт.", 1, "pcs"],
  ] as const) {
    const parsed = parseLegacyMenuSaleSize(legacy);
    assert.equal(parsed?.status, "confirmed", legacy);
    if (parsed?.status !== "confirmed") continue;
    assert.equal(parsed.quantity, quantity, legacy);
    assert.equal(parsed.unit, unit, legacy);
  }
  assert.deepEqual(parseLegacyMenuSaleSize("большая"), {
    version: 1,
    source: "legacy",
    status: "needs_review",
    legacyValue: "большая",
  });
  assert.equal(validateMenuItemSaleSize({ type: "composite", portionSize: "большая" }).code, "SALE_SIZE_NEEDS_REVIEW");
});

test("service has no fake physical size requirement", () => {
  assert.equal(resolveMenuItemSaleSize({ type: "service", portionSize: "1 шт." }), null);
  assert.deepEqual(validateMenuItemSaleSize({ type: "service" }), { ok: true });
});

test("ready product derives display size and stock consumption from canonical packaging", () => {
  const assortment = {
    nomenclature: [{
      id: "cola-125",
      productKey: "cola-125",
      name: "Coca-Cola 1,25 л",
      unit: "pcs",
      packageSize: "1,25 л",
    }],
    stockBalances: [{
      id: "cola-125",
      productKey: "cola-125",
      name: "Coca-Cola 1,25 л",
      unit: "pcs",
      packageSize: "1,25 л",
      current: 12,
    }],
  };
  const item = {
    id: "menu-cola",
    name: "Кола 1,25 л",
    type: "ready",
    readyProduct: {
      nomenclatureItemId: "cola-125",
      productKey: "cola-125",
      packageLabel: "1,25 л",
      packagesPerSale: 1,
    },
  };
  const size = resolveMenuItemSaleSize(item, assortment);
  assert.equal(size?.status, "confirmed");
  assert.equal(formatMenuSaleSize(size), "1,25 л");
  assert.deepEqual(resolveReadyProductConsumption(item, assortment), {
    nomenclatureItemId: "cola-125",
    productKey: "cola-125",
    productName: "Coca-Cola 1,25 л",
    quantityPerSale: 1,
    baseUnit: "pcs",
    packageLabel: "1,25 л",
  });
  assert.equal(validateMenuItemSaleSize(item, assortment).ok, true);
});

test("measured ready product consumes the selected package in canonical base units", () => {
  const assortment = {
    stockBalances: [{
      id: "draft-cola",
      productKey: "draft-cola",
      name: "Кола на розлив",
      unit: "ml",
      packageOptions: ["0,5 л", "1 л"],
    }],
  };
  const item = {
    type: "ready",
    readyProduct: { productKey: "draft-cola", packageLabel: "0,5 л", packagesPerSale: 1 },
  };
  assert.equal(resolveReadyProductConsumption(item, assortment)?.quantityPerSale, 500);
  assert.equal(resolveReadyProductConsumption(item, assortment)?.baseUnit, "ml");
});

test("ready product without packaging uses controlled sale size only when its dimension matches stock", () => {
  const assortment = {
    stockBalances: [{
      id: "draft-cola",
      productKey: "draft-cola",
      name: "Кола без фасовки",
      unit: "ml",
    }],
  };
  const item = {
    type: "ready",
    readyProduct: { productKey: "draft-cola", packagesPerSale: 1 },
    saleSize: normalizeManualMenuSaleSize("1,25", "l"),
  };
  assert.deepEqual(resolveReadyProductConsumption(item, assortment), {
    nomenclatureItemId: "draft-cola",
    productKey: "draft-cola",
    productName: "Кола без фасовки",
    quantityPerSale: 1_250,
    baseUnit: "ml",
    packageLabel: undefined,
  });
  assert.equal(validateMenuItemSaleSize(item, assortment).ok, true);
  assert.equal(validateMenuItemSaleSize({ ...item, saleSize: normalizeManualMenuSaleSize(350, "g") }, assortment).code, "READY_PRODUCT_MAPPING_INVALID");
});
