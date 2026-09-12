import assert from "node:assert/strict";
import test from "node:test";
import {
  createInventoryCountDocument,
  inventoryCountConflicts,
  inventoryCountScopes,
  updateInventoryCountDocument,
} from "../lib/bardoctor/inventory-counts";

function fixture(unit = "kg", current = 2) {
  const balance = {
    productKey: "phase7-stock", name: "Stock name", unit, current,
    venueId: 1, currency: "MDL", warehouseId: "test-stockroom",
    packageSize: `1 ${unit}`, packageAmount: 1,
    updatedAt: "2026-09-10T10:00:00.000Z",
  };
  return {
    nomenclature: [{ ...balance, name: "TEST inventory item", section: "TEST section" }],
    stockBalances: [balance],
  };
}

function create(assortment: unknown) {
  return createInventoryCountDocument({
    assortment, stockMovements: [], venueId: 1, sequenceNumber: 1,
    scope: { type: "all", label: "TEST warehouse" },
    creator: { accountId: 7, name: "TEST owner", role: "owner" },
    accountingCurrency: "MDL", now: "2026-09-10T10:01:00.000Z",
  });
}

test("Phase 7 inventory snapshot preserves authoritative balance quantity, unit and timestamp", () => {
  const assortment = fixture();
  Object.assign(assortment.nomenclature[0], {
    current: 2_000, unit: "g", packageAmount: 1_000, packageSize: "1000 г",
    currency: "RUB", warehouseId: "outdated-stockroom", updatedAt: "2020-01-01",
  });
  const original = structuredClone(assortment);
  const line = create(assortment).items[0];
  assert.equal(line.expected, 2);
  assert.equal(line.unit, "kg");
  assert.equal(line.entryFactor, 1);
  assert.equal(line.packageSize, "1 kg");
  assert.equal(line.warehouseId, "test-stockroom");
  assert.equal(line.snapshotBalanceUpdatedAt, "2026-09-10T10:00:00.000Z");
  assert.equal(line.productName, "TEST inventory item");
  assert.equal(line.sectionName, "TEST section");
  assert.deepEqual(assortment, original);
});

for (const [unit, before, after] of [
  ["kg", 2, 1.92], ["g", 2000, 1920], ["l", 2, 1.9],
  ["ml", 2000, 1900], ["pcs", 12, 10],
] as const) {
  test(`Phase 7 stale nomenclature cannot hide an intervening ${unit} stock movement`, () => {
    const assortment = fixture(unit, before);
    const document = updateInventoryCountDocument({
      document: create(assortment), status: "review",
      items: [{ productKey: "phase7-stock", actual: before }],
    });
    assortment.stockBalances[0].current = after;
    const original = structuredClone({ assortment, document });
    const conflicts = inventoryCountConflicts({ document, assortment, stockMovements: [] });
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].expected, before);
    assert.equal(conflicts[0].current, after);
    assert.match(conflicts[0].reason, /остаток изменился/);
    assert.deepEqual({ assortment, document }, original);
  });
}

test("Phase 7 compatible nomenclature packaging and lifecycle metadata remain effective", () => {
  const assortment = fixture("l", 3);
  Object.assign(assortment.nomenclature[0], {
    packageSize: "0,5 л", packageAmount: 0.5,
  });
  const line = create(assortment).items[0];
  assert.equal(line.expected, 3);
  assert.equal(line.entryFactor, 0.5);
  assert.equal(line.entryUnit, "бут.");
  assert.equal(line.packageSize, "0,5 л");
  for (const lifecycle of [{ archived: true }, { active: false }, { kind: "service" }]) {
    const changed = structuredClone(assortment);
    Object.assign(changed.nomenclature[0], lifecycle);
    assert.equal(create(changed).items.length, 0);
  }
});

test("Phase 7 an authoritative zero never falls back to the nomenclature quantity", () => {
  const assortment = fixture("pcs", 12);
  assortment.stockBalances[0].current = 0;
  assert.equal(create(assortment).items[0].expected, 0);
});

test("Phase 7 an unchanged number cannot hide a change of measurement basis or warehouse", () => {
  for (const change of [{ unit: "pcs" }, { warehouseId: "another-stockroom" }]) {
    const assortment = fixture();
    const document = create(assortment);
    Object.assign(assortment.stockBalances[0], change);
    assert.equal(inventoryCountConflicts({ document, assortment }).length, 1);
  }
});

test("Phase 7 legacy balances without a positive venue ID remain in the authenticated store scope", () => {
  for (const venueId of [0, -1, undefined]) {
    const assortment = fixture();
    Object.assign(assortment.nomenclature[0], { venueId, current: 99 });
    Object.assign(assortment.stockBalances[0], { venueId });
    const document = create(assortment);
    assert.equal(document.items.length, 1);
    assert.equal(document.items[0].expected, 2);
    assert.equal(inventoryCountScopes(assortment, 1)[0].itemCount, 1);
    assert.deepEqual(inventoryCountConflicts({ document, assortment }), []);
    assortment.stockBalances[0].current = 1.92;
    assert.equal(inventoryCountConflicts({ document, assortment })[0].current, 1.92);
  }
});

for (const reverse of [false, true]) {
  test(`Phase 7 same-key foreign metadata and balances cannot enter a TEST count (${reverse})`, () => {
    const assortment = fixture();
    assortment.nomenclature.push({ ...assortment.nomenclature[0], venueId: 2, current: 99, name: "Foreign" });
    assortment.stockBalances.push({ ...assortment.stockBalances[0], venueId: 2, current: 99 });
    if (reverse) {
      assortment.nomenclature.reverse();
      assortment.stockBalances.reverse();
    }
    const document = create(assortment);
    assert.equal(document.items.length, 1);
    assert.equal(document.items[0].expected, 2);
    assert.equal(document.items[0].productName, "TEST inventory item");
    assert.equal(inventoryCountScopes(assortment, 1)[0].itemCount, 1);
    assert.deepEqual(inventoryCountConflicts({ document, assortment }), []);
  });
}
