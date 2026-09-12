import assert from "node:assert/strict";
import test from "node:test";
import { financialSnapshot, monthlySnapshotRows } from "../lib/bardoctor/financial-reconciliation";

type Row = Record<string, unknown>;

function frozenLine(overrides: Row = {}): Row {
  return {
    id: "line-kg", productKey: "qa-kg", productName: "TEST kg", unit: "kg",
    entryUnit: "кг", entryFactor: 1, sectionId: "bar", sectionName: "Бар",
    expected: 2, actual: 1, averageUnitCost: 10, currency: "MDL",
    valuationKnown: true, costBasisStatus: "KNOWN_VALUE",
    costBasisMethod: "latest_confirmed_receipt", costSourceDocumentId: "saved-receipt",
    ...overrides,
  };
}

function oldPhysical(overrides: Row = {}): Row {
  return {
    id: "snapshot", internalId: "snapshot", venueId: 901, date: "2026-09-01",
    source: "manual", status: "completed", scope: { type: "all", label: "Весь активный склад" },
    accountingCurrency: "MDL", items: [frozenLine()], total: 10,
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function resolve(input: Row) {
  const before = structuredClone(input);
  const result = financialSnapshot(deepFreeze(input));
  assert.deepEqual(input, before, "financialSnapshot must not modify frozen source history");
  return result;
}

function known(input: Row, total: number, sections: Record<string, number>) {
  const result = resolve(input);
  assert.equal(result.known, true, result.reason);
  assert.equal(result.total, total);
  assert.deepEqual(result.sections, sections);
}

function unknown(input: Row) {
  const result = resolve(input);
  assert.equal(result.known, false, "Incomplete/inconsistent evidence cannot become known money");
  assert.equal(result.total, null, "Unknown money must not turn into numeric zero");
  assert.ok(result.reason, "Rejected financial evidence must retain an explicit reason");
}

test("old completed physical boundary snapshots recover 600/324 from captured kg/l/pcs", () => {
  for (const example of [{ actual: 20, cost: 10, total: 600 }, { actual: 9, cost: 12, total: 324 }]) {
    const items = ["kg", "l", "pcs"].map(unit => frozenLine({
      id: `line-${unit}`, productKey: `qa-${unit}`, unit, expected: example.actual,
      actual: example.actual, averageUnitCost: example.cost,
    }));
    known(oldPhysical({ items, total: example.total }), example.total, { Бар: example.total });
  }
});

test("new financialValuationVersion 1 uses exact posted monetary fields without rewriting producer rounding", () => {
  // Receipt 2 units / 2.01 MDL -> captured unit cost 1.005.
  // applyInventoryCount's Math.round(x * 100) / 100 saves actualValue 1.00.
  known(oldPhysical({
    financialValuationVersion: 1,
    items: [frozenLine({ averageUnitCost: 1.005, actualValue: 1, expectedValue: 2.01, differenceValue: -1.01 })],
    total: 1, expectedTotal: 2.01, sections: { Бар: 1 },
  }), 1, { Бар: 1 });
});

test("old physical 1.005 rounding matches producer, not the different UI difference helper", () => {
  known(oldPhysical({ items: [frozenLine({ averageUnitCost: 1.005 })], total: 1 }), 1, { Бар: 1 });
  unknown(oldPhysical({ items: [frozenLine({ averageUnitCost: 1.005 })], total: 1.01 }));
});

test("new exact values and old derived values produce identical section totals without double counting", () => {
  const items = [
    frozenLine({ averageUnitCost: 0.335, actualValue: 0.34, expectedValue: 0.67, differenceValue: -0.33 }),
    frozenLine({ id: "second", productKey: "second", averageUnitCost: 0.335, actualValue: 0.34, expectedValue: 0.67, differenceValue: -0.33 }),
  ];
  const sections = { Бар: 0.68 };
  known(oldPhysical({ items, total: 0.68 }), 0.68, sections);
  known(oldPhysical({ financialValuationVersion: 1, items, total: 0.68, sections }), 0.68, sections);
});

test("v1 monetary fields are required and cannot fall back to plausible averaged prices", () => {
  for (const bad of [undefined, null, "", "bad", false, [], {}, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    unknown(oldPhysical({
      financialValuationVersion: 1,
      items: [frozenLine({ actualValue: bad, expectedValue: 20, differenceValue: -10 })],
      sections: { Бар: 10 },
    }));
  }
});

test("unversioned derived monetary fields do not override captured quantity and price", () => {
  known(oldPhysical({ items: [frozenLine({ actualValue: 999, expectedValue: 999, differenceValue: 999 })] }), 10, { Бар: 10 });
});

test("positive stock with explicit UNKNOWN is rejected even when stored partial total is zero", () => {
  for (const version of [undefined, 1]) {
    unknown(oldPhysical({
      ...(version === 1 ? { financialValuationVersion: 1 } : {}),
      items: [frozenLine({ expected: 1, actual: 1, valuationKnown: false, costBasisStatus: "UNKNOWN", averageUnitCost: null, actualValue: 0 })],
      total: 0, sections: { Бар: 0 },
      summary: { countedLines: 1, uncountedLines: 0, unvaluedDifferenceLines: 0, netDifferenceValue: 0 },
    }));
  }
});

test("known-zero purchase cost is distinct from unknown positive-stock cost", () => {
  unknown(oldPhysical({ items: [frozenLine({ costBasisStatus: "UNKNOWN" })] }));
  unknown(oldPhysical({ items: [frozenLine({ costBasisStatus: "KNOWN_ZERO" })] }));
  known(oldPhysical({
    items: [frozenLine({ actual: 12, averageUnitCost: 0, costBasisStatus: "KNOWN_ZERO" })], total: 0,
  }), 0, { Бар: 0 });
});

test("zero physical quantity contributes known zero even without price or line currency", () => {
  const items = [frozenLine({ actual: 0, valuationKnown: false, costBasisStatus: "UNKNOWN", averageUnitCost: null, currency: undefined })];
  known(oldPhysical({ items, total: 0 }), 0, { Бар: 0 });
  known(oldPhysical({ financialValuationVersion: 1, items: [{ ...items[0], actualValue: 0 }], total: 0, sections: { Бар: 0 } }), 0, { Бар: 0 });
});

test("a versioned positive monetary value cannot be attached to zero physical quantity", () => {
  unknown(oldPhysical({
    financialValuationVersion: 1,
    items: [frozenLine({ actual: 0, actualValue: 5 })], total: 5, sections: { Бар: 5 },
  }));
});

test("one-cent total discrepancy and same-total section redistribution are both rejected", () => {
  unknown(oldPhysical({ total: 10.01 }));
  unknown(oldPhysical({ total: 9.99 }));
  const items = [frozenLine(), frozenLine({ id: "kitchen", productKey: "kitchen", sectionName: "Кухня" })];
  unknown(oldPhysical({ items, total: 20, sections: { Бар: 10.01, Кухня: 9.99 } }));
  unknown(oldPhysical({ sections: { Бар: 10, Extra: 0 } }));
});

test("legacy section-only snapshots preserve totals without requiring lifecycle or item fields", () => {
  const primary = monthlySnapshotRows([{ venueId: "primary", date: "2026-06-01", sections: { Бар: 17 } }], 901);
  assert.equal(primary.length, 1);
  assert.equal(primary[0].total, 17);
  known({ date: "2026-06-01", sections: { Бар: 10000, Кухня: 5000, Кальяны: 2000 } }, 17000,
    { Бар: 10000, Кухня: 5000, Кальяны: 2000 });
  known({ date: "2026-06-30", sections: { Бар: 0 }, total: 0 }, 0, { Бар: 0 });
});

test("legacy confirmed monetary records with unflagged historical items retain sections compatibility", () => {
  known({
    id: "legacy-confirmed", status: "confirmed", date: "2026-06-01", currency: "MDL",
    items: [{ actual: 1, averageUnitCost: 10, section: "Бар" }], sections: { Бар: 10 }, total: 10,
  }, 10, { Бар: 10 });
});

test("partial/noncompleted physical snapshots cannot impersonate a complete venue boundary", () => {
  for (const status of ["draft", "counting", "review", "cancelled"]) unknown(oldPhysical({ status, sections: { Бар: 10 } }));
  for (const type of ["section", "category", "subcategory", "warehouse"]) unknown(oldPhysical({ scope: { type, id: "bar" }, sections: { Бар: 10 } }));
  unknown(oldPhysical({ status: undefined }));
  unknown(oldPhysical({ scope: undefined }));
});

test("malformed quantities, prices, totals and sections never gain numeric-zero meaning", () => {
  for (const bad of [null, "", "bad", false, [], [10], {}, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    unknown(oldPhysical({ items: [frozenLine({ actual: bad })] }));
    unknown(oldPhysical({ items: [frozenLine({ averageUnitCost: bad })] }));
    unknown({ sections: { Бар: bad } });
    unknown(oldPhysical({ total: bad }));
    unknown({ sections: { Бар: 10 }, total: bad });
  }
  for (const badSections of [[], [10], "10", { Бар: [] }, { Бар: null }]) unknown(oldPhysical({ sections: badSections }));
});

test("positive stock requires a captured consistent currency, including PMR_RUB", () => {
  unknown(oldPhysical({ items: [frozenLine({ currency: "EUR" })] }));
  unknown(oldPhysical({ accountingCurrency: undefined, items: [frozenLine({ currency: undefined })] }));
  known(oldPhysical({ accountingCurrency: "PMR_RUB", items: [frozenLine({ currency: "PMR_RUB" })] }), 10, { Бар: 10 });
});

test("display unit/package changes and current prices cannot rewrite historical amounts", () => {
  for (const unit of ["kg", "l", "g", "ml", "pcs"]) {
    known(oldPhysical({ items: [frozenLine({
      unit, entryFactor: 1000, packageAmount: 999, packageSize: "NEW PACKAGE",
      latestPurchasePrice: 99999, currentUnitCost: 99999,
    })] }), 10, { Бар: 10 });
  }
});

test("monthlySnapshotRows filters venue/lifecycle/scope and preserves complete source bytes", () => {
  const input = deepFreeze([
    oldPhysical({ id: "valid" }),
    oldPhysical({ id: "foreign", venueId: 902 }),
    oldPhysical({ id: "draft", status: "draft" }),
    oldPhysical({ id: "partial", scope: { type: "section", id: "bar" } }),
    { id: "legacy", date: "2026-09-01", sections: { Бар: 5 } },
  ]);
  const before = structuredClone(input);
  const projected = monthlySnapshotRows(input, 901);
  assert.deepEqual(projected.map(item => item.id), ["valid", "legacy"]);
  assert.deepEqual(input, before);
  assert.equal(projected[0].phase7SnapshotKnown, true);
  assert.equal(projected[0].total, 10);
  assert.deepEqual(projected[0].sections, { Бар: 10 });
  assert.equal(projected[0].currency, "MDL");
  assert.equal(projected[1].phase7SnapshotKnown, true);
  assert.equal(projected[1].total, 5);
  assert.deepEqual(monthlySnapshotRows(input, 901), projected, "Pure replay must be stable");
});

test("monthly physical denomination follows captured accounting currency while legacy FX fields survive", () => {
  const physical = oldPhysical({ currency: "EUR" });
  const legacy = { id: "legacy-fx", date: "2026-09-01", currency: "EUR", accountingCurrency: "MDL",
    total: 10, sections: { Бар: 10 }, exchangeRateToAccounting: 19.5, accountingTotal: 195 };
  const input = deepFreeze([physical, legacy]);
  const before = structuredClone(input);
  const projected = monthlySnapshotRows(input, 901);
  assert.equal(projected[0].currency, "MDL", "Do not relabel a captured MDL total as transaction EUR");
  assert.equal(projected[0].total, 10);
  assert.equal(projected[1].currency, "EUR", "Legacy historical FX remains the downstream currency partition's responsibility");
  assert.equal(projected[1].exchangeRateToAccounting, 19.5);
  assert.equal(projected[1].accountingTotal, 195);
  assert.equal(projected[1].total, 10);
  assert.deepEqual(input, before);
});

test("monthly rows preserve unknown as null plus reason rather than accepting the partial zero", () => {
  const input = oldPhysical({
    items: [frozenLine({ valuationKnown: false, averageUnitCost: null, costBasisStatus: "UNKNOWN" })],
    total: 0,
  });
  const projected = monthlySnapshotRows(deepFreeze([input]), 901);
  assert.equal(projected.length, 1);
  assert.equal(projected[0].phase7SnapshotKnown, false);
  assert.equal(projected[0].total, null);
  assert.ok(projected[0].phase7SnapshotReason);
});
