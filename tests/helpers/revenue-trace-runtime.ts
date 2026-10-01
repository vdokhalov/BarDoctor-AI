import assert from "node:assert/strict";
import { evidenceRuntime } from "./evidence-runtime";
import type { DailyRevenueResolution, EvidenceResolution } from "../../lib/bardoctor/evidence-contracts";
import type { operationalDay } from "../../lib/bardoctor/operational-day";

export function resolvedEvidence(body: EvidenceResolution) {
  assert.ok(body.outcome === "resolved" || body.outcome === "partial", JSON.stringify(body));
  return body.evidence;
}
export function revenueFact(body: DailyRevenueResolution) {
  assert.ok(body.outcome === "resolved" || body.outcome === "partial", JSON.stringify(body));
  return body.fact;
}
export async function revenueTraceRuntime(options: { now?: string } = {}) {
  const r = await evidenceRuntime(options);
  const daily = async (businessDate = r.event.businessDate, user = r.owner, query = "", venueId = r.venueId) => {
    const before = r.snapshot();
    const request = r.request(user, "/api/evidence/facts/daily-revenue?businessDate=" + businessDate + query);
    request.headers.set("X-Venue-Id", String(venueId));
    const response = await r.api.daily.GET(request);
    assert.deepEqual(r.snapshot(), before, "Fact reads preserve canonical bytes, timestamps, audit and object storage");
    return { response, body: await response.json() as DailyRevenueResolution };
  };
  const post = async (id: string, menuItemId = "beer", quantity = 1, shiftId = "evidence-shift") => {
    const command = { id, source: "MANUAL_GRID", shiftId, lines: [{ id: "line:" + id, menuItemId, quantity }] };
    const preview = await r.command("sales", { action: "preview", command }) as { previewHash: string };
    return r.command("sales", { action: "post", command, previewHash: preview.previewHash });
  };
  const days = async () => (await (await r.api.days.GET(r.request(r.owner, "/api/operational-days"))).json()) as { days: ReturnType<typeof operationalDay>[]; revenues: { date: string; revenue: number }[] };
  const prove = async (businessDate = r.event.businessDate) => {
    const before = r.snapshot(), fact = revenueFact((await daily(businessDate)).body);
    assert.equal(fact.evidenceStatus, "COMPLETE");
    assert.equal(fact.sourceType, "BARDOC_POS");
    assert.ok(fact.traceTarget);
    const canonical = await days(), day = canonical.days.find(d => d.businessDate === businessDate)!;
    assert.equal(fact.value, day.revenue.amount);
    assert.equal(fact.finality, day.revenue.status);
    assert.equal(fact.value, Math.round(canonical.revenues.filter(row => row.date === businessDate).reduce((sum, row) => sum + row.revenue, 0) * 100) / 100);
    const financeRefs = [];
    let offset: number | null = 0;
    do {
      const root = resolvedEvidence((await r.resolve(fact.traceTarget.reference, r.owner, "&limit=2&offset=" + offset)).body);
      assert.equal(root.projection.type === "DAILY_REVENUE" && root.projection.revenue, fact.value);
      assert.equal(root.binding, "EXPECTED_REVISION");
      financeRefs.push(...root.relations.map(relation => relation.reference)); offset = root.page.nextOffset;
    } while (offset !== null);
    const ids = new Set<string>(), cashIds = new Set<string>(); let total = 0;
    for (const ref of financeRefs) {
      assert.equal(ref.kind, "FINANCE_REVENUE");
      const finance = resolvedEvidence((await r.resolve(ref)).body);
      let cash = finance.relations.find(relation => relation.reference.kind === "CASH_SHIFT");
      let financeOffset = finance.page.nextOffset;
      while (!cash && financeOffset !== null) {
        const page = resolvedEvidence((await r.resolve(finance.reference, r.owner, "&offset=" + financeOffset)).body);
        cash = page.relations.find(relation => relation.reference.kind === "CASH_SHIFT"); financeOffset = page.page.nextOffset;
      }
      assert.ok(cash, "Finance row resolves a real cash shift");
      assert.ok(!cashIds.has(cash.reference.id)); cashIds.add(cash.reference.id);
      let salesOffset: number | null = 0, shiftTotal = 0;
      do {
        const shift = resolvedEvidence((await r.resolve(cash.reference, r.owner, "&limit=2&offset=" + salesOffset)).body);
        assert.equal(shift.projection.type, "CASH_SHIFT");
        if (shift.projection.type === "CASH_SHIFT") assert.equal(shift.finality, shift.projection.lifecycle === "OPEN" ? "PROVISIONAL" : "FINAL");
        for (const relation of shift.relations) {
          assert.equal(relation.reference.kind, "SALE_EVENT");
          assert.ok(!ids.has(relation.reference.id), "No duplicate or double counted sale evidence"); ids.add(relation.reference.id);
          const sale = resolvedEvidence((await r.resolve(relation.reference)).body);
          assert.equal(sale.projection.type, "SALE_EVENT");
          if (sale.projection.type !== "SALE_EVENT") throw new Error("Wrong projection");
          assert.equal(sale.projection.lifecycle, "POSTED"); assert.equal(sale.projection.businessDate, businessDate);
          assert.equal(sale.reference.venueId, fact.venueId); assert.equal(sale.reference.workspaceId, fact.workspaceId);
          assert.equal(sale.projection.currency, fact.currency); shiftTotal += sale.projection.revenue!;
        }
        salesOffset = shift.page.nextOffset;
      } while (salesOffset !== null);
      assert.equal(finance.projection.type === "FINANCE_REVENUE" && finance.projection.revenue, Math.round(shiftTotal * 100) / 100);
      total += shiftTotal;
    }
    assert.equal(Math.round(total * 100) / 100, fact.value, "Fact = canonical Finance/Operational Day = eligible evidence sales");
    assert.deepEqual(r.snapshot(), before);
    return { fact, ids, cashIds, total };
  };
  return { ...r, daily, post, days, prove };
}
