import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { inventoryCountLineDifference, type InventoryCountLine } from "../lib/bardoctor/inventory-counts";

// Execute the monetary expression actually used by the inventory row renderer.
// The build's v246 patch installs this fragment into the shipped client.
const fragment = readFileSync(new URL("../scripts/fragments/inventory-workflow-v245.fragment.txt", import.meta.url), "utf8");
const bundle = readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const numberHelper = bundle.match(/function bdWarehouseNumber\([^\n]+/)?.[0];
const helpers = fragment.slice(0, fragment.indexOf("function bdInventoryCountSheet("));
const declaration = fragment.match(/const l=o\.item,u=[^\n]+?;(?=return i\.jsxs\("article")/)?.[0];
assert.ok(numberHelper && declaration, "Actual numeric helper and inventory row must be found");
const displayedCost = runInNewContext(`${numberHelper}\n${helpers}\n((o,doc) => {${declaration} return d;})`) as
  (row: { item: Record<string, unknown> }, document?: { financialValuationVersion: number }) => number | null;

const snapshot: InventoryCountLine = {
  id: "qa-line", productKey: "qa-beans", productName: "TEST beans", unit: "kg",
  entryUnit: "уп.", entryFactor: 1, sectionName: "TEST", categoryName: "TEST", subcategoryName: "TEST",
  expected: 2, actual: 1.5, averageUnitCost: 100, currency: "MDL", valuationKnown: true,
  costBasisMethod: "latest_confirmed_receipt", costBasisStatus: "KNOWN_VALUE",
};

function project(line: Record<string, unknown>, version?: number) {
  const before = structuredClone(line);
  const result = displayedCost({ item: line }, version === undefined ? undefined : { financialValuationVersion: version });
  assert.deepEqual(line, before, "Display must not modify the historical snapshot");
  return result;
}

test("Phase 7 raw stored shortage retains the historical monetary value after JSON reload", () => {
  const line = JSON.parse(JSON.stringify(snapshot));
  assert.equal(project(line), -50);
  assert.equal(project(line), inventoryCountLineDifference(snapshot).differenceValue);
});

test("Phase 7 canonical snapshot overrides stale derived monetary fields", () => {
  for (const differenceValue of [null, 999, 0]) {
    assert.equal(project({ ...snapshot, differenceValue }), -50);
  }
  assert.equal(project({ ...snapshot, valuationKnown: false, differenceValue: -50 }), null);
  assert.equal(project({ ...snapshot, actual: null, differenceValue: -50 }), null);
});

test("Phase 7 surplus, explicit zero and fractional cost use the same rounding as the server", () => {
  for (const line of [
    { ...snapshot, actual: 3 },
    { ...snapshot, actual: 0, averageUnitCost: 0, costBasisStatus: "KNOWN_ZERO" as const },
    { ...snapshot, expected: 1.00000049, actual: 0, averageUnitCost: 10.015 },
    { ...snapshot, expected: 2, actual: 2.00000051, averageUnitCost: 10000 },
  ]) assert.equal(project(line), inventoryCountLineDifference(line).differenceValue);
  assert.equal(project({ ...snapshot, actual: 3 }), 100);
  assert.equal(project({ ...snapshot, actual: 0, averageUnitCost: 0 }), 0);
});

test("Phase 7 absent, unknown and invalid snapshot amounts never become a known zero", () => {
  for (const change of [
    { valuationKnown: false }, { averageUnitCost: null }, { averageUnitCost: "" },
    { averageUnitCost: "bad" }, { averageUnitCost: Number.NaN }, { averageUnitCost: -1 },
    { actual: null }, { actual: undefined }, { actual: "" }, { expected: undefined },
  ]) assert.equal(project({ ...snapshot, ...change }), null);
});

test("Phase 7 package display and mutable current price cannot rewrite a snapshot valuation", () => {
  assert.equal(project({ ...snapshot, entryFactor: 1000, packageSize: "1000 г", latestPurchasePrice: 900, currentUnitCost: 900 }), -50);
});

test("Phase 7 legacy rows without a valuation contract preserve explicit values without inventing cost", () => {
  const legacy: Record<string, unknown> = { ...snapshot };
  delete legacy.valuationKnown;
  assert.equal(project({ ...legacy, differenceValue: -50 }), -50);
  assert.equal(project({ ...legacy, differenceValue: 0 }), 0);
  assert.equal(project({ ...legacy, differenceValue: null }), null);
  assert.equal(project(legacy), null);
});

test("Phase 7 completed v1 monetary row preserves the exact posted cents after reload", () => {
  const posted = { ...snapshot, actual: 1, expected: 2, averageUnitCost: 1.005,
    actualValue: 1, expectedValue: 2.01, differenceValue: -1.01 };
  assert.equal(project(JSON.parse(JSON.stringify(posted)), 1), -1.01);
  assert.equal(project(posted, 1), inventoryCountLineDifference(posted, 1).differenceValue);
  assert.equal(project({ ...posted, differenceValue: null }, 1), null);
  assert.equal(project({ ...posted, valuationKnown: false }, 1), null);
  assert.equal(project({ ...posted, differenceValue: 999 }), -1);
});
