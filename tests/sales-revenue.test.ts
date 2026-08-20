import assert from "node:assert/strict";
import test from "node:test";
import { reconcileSalesRevenue } from "../lib/bardoctor/sales-revenue";
import type { SalesDocument } from "../lib/bardoctor/sales";

function sale(overrides: Partial<SalesDocument> = {}): SalesDocument {
  return {
    id: "sale-1",
    date: "2026-08-10",
    sourceSystem: "POS",
    currency: "MDL",
    totalRevenue: 300,
    checks: 10,
    items: [{ id: "line-1", name: "Кола", quantity: 2, confidence: 1 }],
    warnings: [],
    confidence: 1,
    status: "confirmed",
    ...overrides,
  };
}

test("confirmed sales create one daily finance row and aggregate multiple registers", () => {
  const first = sale();
  const second = sale({ id: "sale-2", sourceSystem: "POS 2", totalRevenue: 125.55, checks: 4 });
  const result = reconcileSalesRevenue({
    revenues: [],
    salesDocuments: [first, sale({ id: "other-day", date: "2026-08-09", totalRevenue: 999 })],
    document: second,
    now: "2026-08-11T10:00:00.000Z",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.revenues.length, 1);
  assert.equal(result.revenueRecord.revenue, 425.55);
  assert.equal(result.revenueRecord.receipts, 14);
  assert.deepEqual(result.revenueRecord.salesDocumentIds, ["sale-1", "sale-2"]);
  assert.deepEqual(result.revenueRecord.salesSourceSystems, ["POS", "POS 2"]);
});

test("POS revenue updates the existing daily shift instead of double-counting it", () => {
  const result = reconcileSalesRevenue({
    revenues: [{
      id: "manual-shift",
      date: "2026-08-10",
      revenue: 250,
      receipts: 8,
      guests: 14,
      note: "night",
      staffing: [{ employeeId: "e-1" }],
      createdAt: "2026-08-10T23:00:00.000Z",
    }],
    salesDocuments: [],
    document: sale(),
    now: "2026-08-11T10:00:00.000Z",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.revenues.length, 1);
  assert.equal(result.revenueRecord.id, "manual-shift");
  assert.equal(result.revenueRecord.revenue, 300);
  assert.equal(result.revenueRecord.receipts, 10);
  assert.equal(result.revenueRecord.guests, 14);
  assert.equal(result.revenueRecord.note, "night");
  assert.deepEqual(result.revenueRecord.staffing, [{ employeeId: "e-1" }]);
});

test("sales document identity prevents duplicate revenue inside reconciliation", () => {
  const document = sale();
  const result = reconcileSalesRevenue({
    revenues: [],
    salesDocuments: [document, document],
    document,
    now: "2026-08-11T10:00:00.000Z",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.revenueRecord.revenue, 300);
  assert.equal(result.revenueRecord.receipts, 10);
  assert.deepEqual(result.revenueRecord.salesDocumentIds, ["sale-1"]);
});

test("legacy duplicate shifts block POS posting instead of silently damaging finance", () => {
  const result = reconcileSalesRevenue({
    revenues: [
      { id: "shift-a", date: "2026-08-10", revenue: 100 },
      { id: "shift-b", date: "2026-08-10", revenue: 200 },
    ],
    salesDocuments: [],
    document: sale(),
    now: "2026-08-11T10:00:00.000Z",
  });
  assert.deepEqual(result, {
    ok: false,
    code: "REVENUE_DATE_CONFLICT",
    error: "На эту дату найдено несколько смен. Объедините дубли перед проведением POS-отчёта.",
  });
});
