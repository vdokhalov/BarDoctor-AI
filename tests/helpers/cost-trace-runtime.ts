import assert from "node:assert/strict";
import { evidenceRuntime } from "./evidence-runtime";
import { applyPurchaseToInventory } from "../../lib/bardoctor/inventory";
import type { SalesEvent } from "../../lib/bardoctor/sales-events";
import type { SaleCostResolution } from "../../lib/bardoctor/evidence-contracts";
import { resolvedEvidence } from "./revenue-trace-runtime";

type Row = Record<string, unknown>;
export function costFact(body: SaleCostResolution) {
  assert.ok(body.outcome === "resolved" || body.outcome === "partial", JSON.stringify(body)); return body.fact;
}
export async function costTraceRuntime() {
  const r = await evidenceRuntime({ now: "2026-10-01T12:00:00Z" });
  const a = r.get("bd_assortment_v1") as Row;
  (a.menuItems as Row[]).push({ id: "cocktail", name: "Captured cocktail", venueId: r.venueId, active: true, type: "composite", consumptionMode: "RECIPE", salePrice: 50, currency: "MDL" });
  (a.recipes as Row[]).push({ id: "cocktail-recipe", menuItemId: "cocktail", ownerId: "cocktail", venueId: r.venueId, version: 1, current: true, status: "confirmed", reviewStatus: "approved", ingredients: [
    { id: "piece", nomenclatureItemId: "nom-beer", purchaseProductKey: "beer-stock", name: "Beer", quantity: 1, unit: "pcs", normalizedQuantity: 1, normalizedUnit: "pcs", venueId: r.venueId },
    { id: "liquid", nomenclatureItemId: "nom-whisky", purchaseProductKey: "whisky-stock", name: "Whisky", quantity: 50, unit: "ml", normalizedQuantity: 0.05, normalizedUnit: "l", venueId: r.venueId },
    { id: "beans", nomenclatureItemId: "nom-coffee", purchaseProductKey: "coffee-stock", name: "Beans", quantity: 8, unit: "g", normalizedQuantity: 0.008, normalizedUnit: "kg", venueId: r.venueId },
  ] });
  r.put("bd_assortment_v1", a);
  const purchase = (id: string, productKey: string, quantity: number, unit: string, totalCost: number | undefined, now = "2026-10-01T09:00:00Z") => {
    const movements = r.get("bd_stock_movements") as unknown[] ?? [];
    const applied = applyPurchaseToInventory({ assortment: r.get("bd_assortment_v1"), stockMovements: movements, accountingCurrency: "MDL", now,
      document: { id, venueId: r.venueId, date: "2026-10-01", currency: "MDL", items: [{ id: "purchase-line:" + id, name: productKey, purchaseProductKey: productKey,
        quantity, unit, quantityMode: "base", lineTotal: totalCost, unitPrice: totalCost === undefined ? undefined : totalCost / quantity, costStatus: totalCost === undefined ? "UNKNOWN" : totalCost === 0 ? "KNOWN_ZERO" : "KNOWN", category: "products" }] } });
    assert.equal(applied.movements.length, 1, JSON.stringify(applied.summary));
    r.put("bd_assortment_v1", applied.assortment); r.put("bd_stock_movements", [...applied.movements, ...movements]); return applied.movements[0];
  };
  const receipts = () => { purchase("receipt-beer", "beer-stock", 10, "pcs", 20); purchase("receipt-whisky", "whisky-stock", 2, "l", 100); purchase("receipt-coffee", "coffee-stock", 1, "kg", 200); };
  const post = async (id: string, input: { item?: string; quantity?: number; lines?: { id: string; menuItemId: string; quantity: number }[]; source?: string } = {}) => {
    const source = input.source ?? "POS_API", lines = input.lines ?? [{ id: "line:" + id, menuItemId: input.item ?? "cocktail", quantity: input.quantity ?? 1 }];
    const menu = (r.get("bd_assortment_v1") as Row).menuItems as Row[];
    const amount = lines.reduce((n, l) => n + Number(menu.find(i => i.id === l.menuItemId)!.salePrice) * l.quantity, 0);
    const command = { id, source, shiftId: "evidence-shift", lines, ...(source === "POS_API" ? { payments: [{ id: "payment:" + id, method: "CASH", amount }] } : {}) };
    const preview = await r.command("sales", { action: "preview", command }) as { previewHash: string };
    return (await r.command("sales", { action: "post", command, previewHash: preview.previewHash }) as { event: SalesEvent }).event;
  };
  const cost = async (saleId: string, lineId?: string, user = r.owner, query = "", venueId = r.venueId) => {
    const before = r.snapshot(), request = r.request(user, "/api/evidence/facts/sale-cost?saleId=" + encodeURIComponent(saleId) + (lineId ? "&lineId=" + encodeURIComponent(lineId) : "") + query);
    request.headers.set("X-Venue-Id", String(venueId)); const response = await r.api.cost.GET(request);
    assert.deepEqual(r.snapshot(), before, "Cost reads preserve all canonical bytes, timestamps, audit and storage");
    return { response, body: await response.json() as SaleCostResolution };
  };
  const prove = async (event: SalesEvent) => {
    const fact = costFact((await cost(event.id)).body); assert.equal(fact.evidenceStatus, "COMPLETE"); assert.equal(fact.capturedTotalCost, event.batch.totalTheoreticalCost);
    const refs = [], visited = new Set<string>();
    let offset: number | null = 0;
    do {
      const e = resolvedEvidence((await r.resolve(fact.traceTarget!.reference, r.owner, "&limit=2&offset=" + offset)).body);
      refs.push(...e.relations.filter(r => r.reference.kind === "CAPTURED_COST").map(r => r.reference)); offset = e.page.nextOffset;
    } while (offset !== null);
    let capturedTotal = 0, valuation = 0; const ids = new Set<string>();
    for (const ref of refs) {
      const line = resolvedEvidence((await r.resolve(ref)).body);
      assert.equal(line.projection.type, "CAPTURED_COST"); if (line.projection.type !== "CAPTURED_COST") throw new Error("Wrong line projection");
      capturedTotal += line.projection.capturedTotalCost!;
      const recipeRef = line.relations.find(r => r.reference.kind === "CAPTURED_RECIPE")!.reference;
      offset = 0;
      do {
        const recipe = resolvedEvidence((await r.resolve(recipeRef, r.owner, "&limit=2&offset=" + offset)).body);
        for (const relation of recipe.relations) {
          const ingredient = resolvedEvidence((await r.resolve(relation.reference)).body);
          if (ingredient.projection.type !== "CAPTURED_INGREDIENT") continue;
          const i = ingredient.projection; assert.ok(!visited.has(i.saleLineId + ":" + i.ingredientId)); visited.add(i.saleLineId + ":" + i.ingredientId);
          assert.ok(Math.abs(line.projection.quantity! * i.baseQuantityPerPortion! - i.baseQuantityTotal!) < 0.000001);
          for (const related of ingredient.relations) {
            const e = resolvedEvidence((await r.resolve(related.reference)).body);
            if (e.projection.type !== "WAREHOUSE_MOVEMENT" || e.projection.movementType !== "sale_consumption") continue;
            assert.ok(!ids.has(e.reference.id)); ids.add(e.reference.id);
            assert.equal(e.projection.quantity, -i.baseQuantityTotal!); assert.equal(e.projection.unit, i.baseUnit);
            assert.ok(Math.abs(e.projection.costAmount! + i.totalCost!) < 0.000001); assert.equal(e.projection.saleId, event.id); assert.equal(e.projection.saleLineId, i.saleLineId);
            valuation -= e.projection.costAmount!;
          }
        }
        offset = recipe.page.nextOffset;
      } while (offset !== null);
    }
    assert.equal(Math.round(capturedTotal * 100) / 100, fact.capturedTotalCost);
    assert.equal(Math.round(valuation * 100) / 100, fact.capturedTotalCost);
    return { fact, ids, valuation, capturedTotal };
  };
  return { ...r, purchase, receipts, post, cost, prove };
}
