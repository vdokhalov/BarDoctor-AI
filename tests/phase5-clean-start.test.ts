import test from "node:test";
import assert from "node:assert/strict";
import { salesBatchKpis } from "../lib/bardoctor/sales-consumption";
import { resolveCostBasis } from "../lib/bardoctor/cost-basis";

function batch(id: string, totalTheoreticalCost: number | null, venueId = 1) {
  return { id, venueId, status: "POSTED", totalTheoreticalCost,
    lines: [{ quantity: 1, processingStatus: "POSTED", theoreticalCost: totalTheoreticalCost }] };
}

test("Phase 5: empty venue has unknown operational cost, not a fabricated zero", () => {
  assert.equal(salesBatchKpis([], 1).theoreticalCost, null);
  const cost = resolveCostBasis({ venueId: 1, nomenclatureItem: { productKey: "coffee", unit: "kg" },
    asOf: "2026-09-09", receipts: [] });
  assert.equal(cost.status, "UNKNOWN");
  assert.equal(cost.value, null);
});

test("Phase 5: unknown and partially known sales totals remain unknown after reload", () => {
  for (const values of [[batch("unknown", null)], [batch("known", 12), batch("unknown", null)]]) {
    const reloaded = JSON.parse(JSON.stringify(values));
    const before = structuredClone(reloaded);
    assert.equal(salesBatchKpis(reloaded, 1).theoreticalCost, null);
    assert.deepEqual(reloaded, before, "KPI read must not rewrite historical snapshots");
  }
});

test("Phase 5: explicit zero, known costs and venue isolation remain distinct", () => {
  assert.equal(salesBatchKpis([batch("free", 0)], 1).theoreticalCost, 0);
  assert.equal(salesBatchKpis([batch("a", 12), batch("b", 3.5)], 1).theoreticalCost, 15.5);
  assert.equal(salesBatchKpis([batch("a", 12), batch("foreign", null, 2)], 1).theoreticalCost, 12);
  assert.equal(salesBatchKpis([{ ...batch("cancelled", null), status: "CANCELLED" }, batch("a", 12)], 1).theoreticalCost, 12);
});
