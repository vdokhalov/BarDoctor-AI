import test from "node:test";
import assert from "node:assert/strict";

import { closeShiftWithCanonicalWriteOffs } from "../lib/bardoctor/shift-close-write-offs";

const actor = { accountId: 7, name: "Тестировщик", role: "manager" };
const now = "2026-08-24T12:00:00.000Z";

function current() {
  return {
    revenues: [{ id: "legacy-shift", date: "2026-08-20", writeoffs: [{ section: "Бар", amount: 500, description: "Legacy" }] }],
    writeOffs: [{ id: "legacy-writeoff", venueId: 1, date: "2026-08-19", amount: 300, description: "Старая запись" }],
    assortment: {
      stockBalances: [
        { productKey: "whiskey", venueId: 1, name: "Jack Daniel's", section: "Бар", unit: "ml", current: 5_700, averageUnitCost: 0.18, inventoryValue: 1_026, currency: "RUB", packageOptions: ["0,7 л"] },
        { productKey: "lemon", venueId: 1, name: "Лимон", section: "Кухня", unit: "g", current: 3_250, averageUnitCost: 0.045, inventoryValue: 146.25, currency: "RUB" },
        { productKey: "venue-b", venueId: 2, name: "Чужой товар", unit: "pcs", current: 10, averageUnitCost: 50, inventoryValue: 500, currency: "RUB" },
      ],
    },
    stockMovements: [],
    expenses: [],
  };
}

function request(items: unknown[]) {
  return {
    shiftCloseId: "close-2026-08-24",
    shiftId: "shift-24",
    venueId: 1,
    revenueRecord: { date: "2026-08-24", revenue: 20_000, receipts: 40, manualWriteOffAmount: 999_999 },
    writeOffItems: items,
  };
}

test("shift close creates canonical warehouse-visible documents, movements and shift links", () => {
  const result = closeShiftWithCanonicalWriteOffs({
    current: current(),
    request: request([
      { productKey: "whiskey", quantity: 0.7, unit: "л", reasonCode: "breakage", location: "Бар" },
      { productKey: "lemon", quantity: 0.4, unit: "кг", reasonCode: "spoilage", location: "Кухня" },
    ]),
    venueId: 1,
    actor,
    allowNegativeStock: true,
    now,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.idempotent, false);
  assert.equal(result.writeOffDocuments.length, 2);
  assert.equal(result.writeOffDocuments.every((document) => document.source === "shift_close"), true);
  assert.equal(result.writeOffDocuments.every((document) => document.shiftId === "shift-24"), true);
  assert.equal(result.writeOffDocuments.every((document) => document.status === "posted"), true);
  assert.equal(result.writeOffs.filter((document) => document.shiftId === "shift-24").length, 2);
  assert.equal(result.stockMovements.filter((movement) => (movement as { type?: string }).type === "writeoff").length, 2);
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.find((item) => item.productKey === "whiskey")?.current, 5_000);
  assert.equal(balances.find((item) => item.productKey === "lemon")?.current, 2_850);
  assert.equal(result.revenueRecord.writeOffTotalCost, 144);
  assert.deepEqual(result.revenueRecord.writeOffDocumentIds, result.writeOffDocuments.map((document) => document.id));
});

test("client-provided manual amount is never the canonical write-off cost", () => {
  const result = closeShiftWithCanonicalWriteOffs({
    current: current(),
    request: request([{ productKey: "whiskey", quantity: 0.7, unit: "л", reasonCode: "breakage", amount: 999_999 }]),
    venueId: 1,
    actor,
    allowNegativeStock: true,
    now,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.writeOffDocuments[0].totalCost, 126);
  assert.equal(result.revenueRecord.writeOffTotalCost, 126);
});

test("retry and wizard back-forward reuse the same close session without duplicate stock effects", () => {
  const first = closeShiftWithCanonicalWriteOffs({
    current: current(),
    request: request([{ productKey: "whiskey", quantity: 0.7, unit: "л", reasonCode: "breakage" }]),
    venueId: 1,
    actor,
    allowNegativeStock: true,
    now,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const retry = closeShiftWithCanonicalWriteOffs({
    current: {
      revenues: first.revenues,
      writeOffs: first.writeOffs,
      assortment: first.assortment,
      stockMovements: first.stockMovements,
      expenses: first.expenses,
    },
    request: request([{ productKey: "whiskey", quantity: 0.7, unit: "л", reasonCode: "breakage" }]),
    venueId: 1,
    actor,
    allowNegativeStock: true,
    now: "2026-08-24T12:01:00.000Z",
  });
  assert.equal(retry.ok, true);
  if (!retry.ok) return;
  assert.equal(retry.idempotent, true);
  assert.equal(retry.stockMovements.length, 1);
  assert.equal((retry.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 5_000);
});

test("failed close leaves the source stores and stock untouched", () => {
  const source = current();
  const before = structuredClone(source);
  const result = closeShiftWithCanonicalWriteOffs({
    current: source,
    request: request([
      { productKey: "whiskey", quantity: 0.7, unit: "л", reasonCode: "breakage" },
      { productKey: "missing", quantity: 1, unit: "шт", reasonCode: "spoilage" },
    ]),
    venueId: 1,
    actor,
    allowNegativeStock: true,
    now,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(source, before);
});

test("venue isolation rejects cross-venue shift and cross-venue nomenclature", () => {
  const wrongShift = closeShiftWithCanonicalWriteOffs({
    current: current(), request: { ...request([]), venueId: 2 }, venueId: 1, actor, allowNegativeStock: true, now,
  });
  assert.deepEqual(wrongShift, { ok: false, code: "SHIFT_VENUE_MISMATCH", error: "Смена относится к другому заведению" });
  const wrongItem = closeShiftWithCanonicalWriteOffs({
    current: current(), request: request([{ productKey: "venue-b", quantity: 1, unit: "шт", reasonCode: "loss_shortage" }]), venueId: 1, actor, allowNegativeStock: true, now,
  });
  assert.equal(wrongItem.ok, false);
  if (wrongItem.ok) return;
  assert.equal(wrongItem.code, "WRITE_OFF_PRODUCT_NOT_FOUND");
});

test("legacy shift and legacy write-off records remain unchanged and readable", () => {
  const result = closeShiftWithCanonicalWriteOffs({ current: current(), request: request([]), venueId: 1, actor, allowNegativeStock: true, now });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual((result.revenues[1] as Record<string, unknown>).writeoffs, [{ section: "Бар", amount: 500, description: "Legacy" }]);
  assert.equal((result.writeOffs.find((document) => document.id === "legacy-writeoff") as unknown as Record<string, unknown>).description, "Старая запись");
});
