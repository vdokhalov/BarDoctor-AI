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

function borjomiFixture() {
  const api = costingApi();
  const state = api.state({
    nomenclature: [{
      productKey: "stock:боржоми|ml",
      name: "Вода Боржоми",
      unit: "ml",
      packageSize: "Несколько фасовок",
      packageOptions: ["0,5 л", "1 л"],
    }],
    stockBalances: [{
      key: "stock:боржоми|ml",
      name: "Вода Боржоми",
      unit: "ml",
      packageSize: "Несколько фасовок",
      packageOptions: ["0,5 л", "1 л"],
    }],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [
    {
      id: "vprok-379",
      documentNumber: "379",
      status: "confirmed",
      date: "2026-08-07",
      supplierName: "Впрок",
      currency: "PMR_RUB",
      items: [{
        id: "borjomi-half",
        name: "Боржоми 0.5 л",
        purchaseProductKey: "stock:боржоми|ml",
        quantity: 12,
        unit: "шт.",
        packageSize: "0.5 л",
        unitPrice: 24.65,
        lineTotal: 295.8,
      }],
    },
    {
      id: "other-1l",
      documentNumber: "later",
      status: "confirmed",
      date: "2026-08-20",
      supplierName: "Другой поставщик",
      currency: "PMR_RUB",
      items: [{
        id: "borjomi-liter",
        name: "Вода Боржоми",
        purchaseProductKey: "stock:боржоми|ml",
        quantity: 10,
        unit: "шт.",
        packageSize: "1 л",
        unitPrice: 52,
        lineTotal: 520,
      }],
    },
  ], canonical);
  return { api, canonical, maps };
}

test("v386 bundle is valid and exposes package-aware purchase trace", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-unit-product-costing-v386/);
  assert.match(bundle, /Основание: последний приход/);
  assert.match(bundle, /g\.length===1\?m:null/);
});

test("Borjomi 0.5 uses invoice 379 price even when a later 1 L receipt costs 52", () => {
  const { api, canonical, maps } = borjomiFixture();
  assert.ok(maps.pricesByKey.get("stock:боржоми|ml")?.length, JSON.stringify([...maps.pricesByKey.entries()]));
  const row = api.row(
    { id: "borjomi", name: "Вода Боржоми", purchaseProductKey: "stock:боржоми|ml", quantity: 1, unit: "шт." },
    maps,
    canonical,
    { name: "Боржоми", saleSize: { quantity: 0.5, unit: "l" } },
  );
  assert.equal(row.complete, true, JSON.stringify({ row, points: maps.pricesByKey.get("stock:боржоми|ml")?.map((entry) => entry.value) }));
  assert.equal(row.cost, 24.65);
  assert.equal(row.purchaseDate, "2026-08-07");
  assert.equal(row.supplierName, "Впрок");
  assert.equal(row.purchaseDocumentNumber, "379");
  assert.equal(row.purchasePackageSize, "0.5 л");
});

test("generic piece recipe with multiple Borjomi packages stays unpriced without a package hint", () => {
  const { api, canonical, maps } = borjomiFixture();
  const row = api.row(
    { id: "borjomi", name: "Вода Боржоми", purchaseProductKey: "stock:боржоми|ml", quantity: 1, unit: "шт." },
    maps,
    canonical,
  );
  assert.equal(row.complete, false);
  assert.equal(row.reason, "price");
});

test("latest receipt wins only inside the selected 0.5 L package", () => {
  const { api, canonical, maps } = borjomiFixture();
  const laterHalf = {
    id: "later-half",
    value: {
      unit: "ml",
      unitPrice: 25 / 500,
      currency: "PMR_RUB",
      date: "2026-08-25",
      order: "2026-08-25|2026-08-25T10:00:00Z|00000002|000000",
      supplierName: "Новый поставщик 0,5",
      documentNumber: "400",
      packageSize: "0,5 л",
      packageKeys: ["ml:500"],
    },
  };
  maps.pricesByKey.get("stock:боржоми|ml").push({ key: "stock:боржоми|ml", value: laterHalf.value });
  const row = api.row(
    { name: "Вода Боржоми", purchaseProductKey: "stock:боржоми|ml", quantity: 1, unit: "шт." },
    maps,
    canonical,
    { saleSize: { quantity: 0.5, unit: "l" } },
  );
  assert.equal(row.cost, 25, JSON.stringify(row));
  assert.equal(row.supplierName, "Новый поставщик 0,5");
  assert.equal(row.purchaseDocumentNumber, "400");
});
