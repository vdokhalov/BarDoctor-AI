import { isStockEvidenceKind, bindStockEvidenceReference, readReceiptAcquisition } from "./stock-evidence";
import { getD1 } from "../../db";
import { hasPermission, type AuthenticatedAccount } from "./access-control";
import { readStoreSnapshots } from "./store-cas";
import { convertStockQuantity } from "./stock-units";
import { COST_BASIS_METHOD } from "./cost-basis";
import {
  businessFactIdentity, evidenceContentRevision, parseEvidenceReference,
  type CapturedCostStatus, type CapturedSaleCost, type EvidenceDiagnostic, type EvidenceProjection,
  type EvidenceReference, type EvidenceRelation, type EvidenceResolution, type EvidenceScope,
  type SaleCostResolution,
} from "./evidence-contracts";

type Row = Record<string, unknown>;
type Context = EvidenceScope & { account: AuthenticatedAccount };
const obj = (v: unknown): Row | null => v && typeof v === "object" && !Array.isArray(v) ? v as Row : null;
const list = (v: unknown): Row[] => Array.isArray(v) ? v.filter((r): r is Row => obj(r) !== null) : [];
const num = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const txt = (v: unknown): string | null => typeof v === "string" && v.length <= 320 ? v : null;
const instant = (v: unknown): string | null => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) ? v : null;
const scoped = (r: Row, c: Context, strict = false) => (r.venueId === c.venueId || !strict && r.venueId == null) && (r.workspaceId == null || r.workspaceId === c.workspaceId) && (r.dataAccountId == null || r.dataAccountId === c.account.id);
const unique = (rs: Row[], id: unknown, c: Context, strict = false): Row | null => {
  const found = rs.filter(r => r.id === id && scoped(r, c, strict)); return found.length === 1 ? found[0] : null;
};
const close = (a: unknown, b: unknown) => num(a) !== null && num(b) !== null && Math.abs(Number(a) - Number(b)) < 0.000001;
const money = (n: number) => Math.round(n * 100) / 100;
export const COST_EVIDENCE_KINDS = ["CAPTURED_COST", "CAPTURED_RECIPE", "CAPTURED_INGREDIENT", "WAREHOUSE_MOVEMENT", "NOMENCLATURE"] as const;
export function isCostEvidenceKind(kind: string): boolean { return COST_EVIDENCE_KINDS.some(k => k === kind); }

/** No recalculation against today's recipe, receipt or stock valuation. */
function lineStatus(line: Row): CapturedCostStatus {
  const snapshot = obj(line.recipeSnapshot);
  if (!snapshot) return "UNKNOWN";
  if (snapshot.consumptionMode === "NONE") return "NONE";
  const ingredients = list(snapshot.ingredients);
  const known = ingredients.filter(i => num(i.totalCost) !== null && i.costStatus !== "UNKNOWN");
  if (num(line.theoreticalCost) !== null && known.length === ingredients.length && ingredients.length > 0) return "KNOWN";
  return known.length ? "PARTIAL" : "UNKNOWN";
}
function costProjection(event: Row, lines: Row[], selected: Row | null): CapturedSaleCost & { type: "CAPTURED_COST" } {
  const batch = obj(event.batch)!;
  const statuses = lines.map(lineStatus);
  const status = selected ? lineStatus(selected) : statuses.every(s => s === "NONE") ? "NONE"
    : statuses.every(s => s === "KNOWN" || s === "NONE") ? "KNOWN"
    : statuses.every(s => s === "UNKNOWN") ? "UNKNOWN" : "PARTIAL";
  const total = num(selected ? selected.theoreticalCost : batch.totalTheoreticalCost);
  const quantity = selected ? num(selected.quantity) : null;
  const methods = lines.flatMap(l => list(obj(l.recipeSnapshot)?.ingredients).map(i => i.costBasisMethod));
  return { type: "CAPTURED_COST", saleId: String(event.id), saleLineId: selected ? String(selected.id) : null,
    menuItemId: selected ? txt(selected.menuItemId) : null, quantity,
    capturedTotalCost: total, capturedUnitCost: selected && total !== null && quantity !== null && quantity > 0 ? total / quantity : null,
    unitCostBasis: selected && total !== null && quantity !== null && quantity > 0 ? "CAPTURED_TOTAL_PER_SALE_QUANTITY" : null,
    currency: txt(event.currency), businessDate: txt(event.businessDate), lifecycle: event.status as "POSTED" | "REVERSED",
    costStatus: status, canonicalBatchCostStatus: ["FULL", "PARTIAL", "UNVALUED"].includes(String(batch.costStatus)) ? batch.costStatus as "FULL" | "PARTIAL" | "UNVALUED" : null,
    costMethod: status === "NONE" ? "NOT_APPLICABLE" : methods.length > 0 && methods.every(m => m === COST_BASIS_METHOD) ? COST_BASIS_METHOD : null };
}

/** Closed adapter extension to Phase 3A's resolver; every call receives a freshly authorized context. */
export async function resolveCostEvidence(context: Context, reference: EvidenceReference, limit: number, offset: number, asOf: string): Promise<EvidenceResolution> {
  const base = { contractVersion: 1 as const, asOf };
  const fail = (outcome: "unavailable" | "restricted" | "changed", diagnostics: EvidenceDiagnostic[] = []): EvidenceResolution => {
    if (outcome === "unavailable") return { ...base, outcome, code: "EVIDENCE_UNAVAILABLE", diagnostics };
    if (outcome === "restricted") return { ...base, outcome, code: "ACCESS_DENIED", diagnostics };
    return { ...base, outcome, code: "READ_MODEL_CHANGED", diagnostics };
  };
  if (reference.venueId !== context.venueId || reference.workspaceId !== context.workspaceId) return fail("unavailable");
  if (context.account.role === "cashier") return fail("restricted");
  const inventory = hasPermission(context.account, "inventory.view"), sales = hasPermission(context.account, "sales.view");
  const warehouseKind = reference.kind === "WAREHOUSE_MOVEMENT", nomenclatureKind = reference.kind === "NOMENCLATURE";
  if (warehouseKind || nomenclatureKind ? !inventory : !sales) return fail("restricted");
  const keys = [...(sales && !nomenclatureKind ? ["bd_sales_events_v1"] : []), ...(inventory ? ["bd_stock_movements", "bd_assortment_v1"] : [])];
  const snapshots = await readStoreSnapshots(getD1(), context.account.id, keys);
  let events: Row[] = [], movements: Row[] = [], menu: Row[] = [], nomenclature: Row[] = [];
  try {
    const read = (key: string) => JSON.parse(snapshots.find(s => s.key === key)?.dataJson ?? "null") as unknown;
    const array = (v: unknown): Row[] => { if (v === null || v === undefined) return []; if (!Array.isArray(v) || v.some(r => !obj(r))) throw new Error("COST_STORE_NEEDS_REVIEW"); return v as Row[]; };
    events = array(read("bd_sales_events_v1")); movements = array(read("bd_stock_movements"));
    const assortment = read("bd_assortment_v1");
    if (assortment !== null && !obj(assortment)) throw new Error("COST_STORE_NEEDS_REVIEW");
    menu = array(obj(assortment)?.menuItems); nomenclature = array(obj(assortment)?.nomenclature);
  } catch (e) {
    if (e instanceof SyntaxError || e instanceof Error && e.message === "COST_STORE_NEEDS_REVIEW") return fail("unavailable", ["RECORD_NEEDS_REVIEW"]);
    throw e;
  }
  const movementById = (id: unknown): { row: Row; basis: "MOVEMENT_STORE" | "SALE_ORIGINAL_MOVEMENT" } | null => {
    // A present conflicting live record is never hidden by a durable fallback.
    if (movements.some(m => m.id === id)) {
      const row = unique(movements, id, context); return row ? { row, basis: "MOVEMENT_STORE" } : null;
    }
    const originals = events.filter(e => scoped(e, context, true)).flatMap(e => list(e.originalMovements).filter(m =>
      scoped(m, context, true) && m.salesBatchId === e.id && m.sourceDocumentId === e.id));
    const row = unique(originals, id, context, true); return row ? { row, basis: "SALE_ORIGINAL_MOVEMENT" } : null;
  };
  const event = warehouseKind ? null : nomenclatureKind ? null : unique(events, reference.id, context, true);
  const batch = obj(event?.batch);
  const allLines = list(batch?.lines);
  const owned = (line: Row) => line.salesBatchId === event?.id && scoped(line, context) && ["POSTED", "REVERSED"].includes(String(line.processingStatus));
  const selected = reference.partId ? unique(allLines, reference.partId, context) : null;
  const lines = selected ? [selected] : allLines;
  const captured = obj(selected?.recipeSnapshot);
  const ingredient = reference.kind === "CAPTURED_INGREDIENT" ? (() => {
    const matches = list(captured?.ingredients).filter(i => i.ingredientId === reference.ingredientId && scoped(i, context)); return matches.length === 1 ? matches[0] : null;
  })() : null;
  const movement = warehouseKind ? movementById(reference.id) : null;
  const currentNom = nomenclatureKind ? unique(nomenclature, reference.id, context) : null;
  let parent: Row | null = warehouseKind ? movement?.row ?? null : nomenclatureKind ? currentNom : event;
  const diagnostics: EvidenceDiagnostic[] = ["FRESHNESS_POLICY_UNDEFINED"];
  const relations: EvidenceRelation[] = [];
  let partial = false;
  const missing = (code: EvidenceDiagnostic = "RELATED_EVIDENCE_UNAVAILABLE") => { partial = true; diagnostics.push(code); };
  const ref = (kind: EvidenceReference["kind"], id: string, partId?: string, ingredientId?: string): EvidenceReference => ({
    contractVersion: 1, kind, id, venueId: context.venueId, workspaceId: context.workspaceId,
    ...(partId !== undefined ? { partId } : {}), ...(ingredientId !== undefined ? { ingredientId } : {}),
  }) as EvidenceReference;
  const sourceLines = (e: Row) => list(obj(e.batch)?.lines);
  const checkMovementSource = (m: Row): boolean => {
    if (!["sale_consumption", "sale_reversal"].includes(String(m.type))) return true;
    const e = unique(events, m.salesBatchId, context, true);
    if (!e) return !sales; // inventory-only actor can read a live movement, never a hidden sale.
    const b = obj(e.batch), l = unique(sourceLines(e), m.salesBatchLineId, context);
    if (!b || b.id !== e.id || !scoped(b, context, true) || !l || l.salesBatchId !== e.id
      || l.menuItemId !== m.menuItemId || m.sourceDocumentId !== e.id) return false;
    if (m.type === "sale_reversal") {
      const original = movementById(m.originalMovementId)?.row;
      return e.status === "REVERSED" && Array.isArray(l.movementIds) && l.movementIds.includes(m.originalMovementId)
        && original?.type === "sale_consumption" && original.salesBatchId === e.id && original.salesBatchLineId === l.id
        && original.productKey === m.productKey && original.warehouseId === m.warehouseId && m.sourceLineId === `reversal:${l.id}`
        && close(m.amount, convertStockQuantity(Math.abs(Number(original.amount)), original.unit, m.unit))
        && (num(original.costAmount) === null ? num(m.costAmount) === null && m.costStatus === "UNKNOWN" : close(m.costAmount, Math.abs(Number(original.costAmount))) && m.currency === original.currency);
    }
    return Array.isArray(l.movementIds) && l.movementIds.includes(m.id) && m.sourceLineId === l.id;
  };
  const relatedMovements = (line: Row, sourceEvent = event!) => {
    const b = obj(sourceEvent.batch)!;
    const originalIds = Array.isArray(line.movementIds) ? line.movementIds : [];
    const reversals = movements.filter(m => scoped(m, context, true) && m.type === "sale_reversal" && m.salesBatchId === sourceEvent.id
      && m.salesBatchLineId === line.id && originalIds.includes(m.originalMovementId));
    const ids = [...originalIds, ...(Array.isArray(b.reversalMovementIds) ? b.reversalMovementIds : []), ...reversals.map(m => m.id)];
    return [...new Set(ids)].map(id => ({ id, movement: movementById(id) })).filter(x => x.movement?.row.type !== "sale_reversal" || x.movement.row.salesBatchLineId === line.id);
  };
  // Bind only the selected sale's inputs, not unrelated new receipts or other sales.
  const revisionInput = (target: EvidenceReference): unknown => {
    if (target.kind === "NOMENCLATURE") return unique(nomenclature, target.id, context);
    if (target.kind === "WAREHOUSE_MOVEMENT") {
      const m = movementById(target.id);
      return m ? { movement: m.row, recordBasis: m.basis, salesVisible: sales, ...(sales ? { sourceSale: unique(events, m.row.salesBatchId, context, true) } : {}) } : null;
    }
    const e = unique(events, target.id, context, true);
    if (!e) return null;
    const ls = target.partId ? sourceLines(e).filter(l => l.id === target.partId && scoped(l, context)) : sourceLines(e);
    return { event: e, inventoryVisible: inventory, ...(inventory ? {
      movements: ls.flatMap(l => relatedMovements(l, e).map(x => ({ id: x.id, record: x.movement?.row ?? null, recordBasis: x.movement?.basis ?? null }))),
      currentMenu: ls.map(l => unique(menu, l.menuItemId, context)),
      currentNomenclature: ls.flatMap(l => list(obj(l.recipeSnapshot)?.ingredients).map(i => unique(nomenclature, i.nomenclatureItemId, context))),
    } : {}) };
  };
  const revision = await evidenceContentRevision(reference, revisionInput(reference));
  if (reference.expectedRevision && revision !== reference.expectedRevision) return fail("changed", ["NO_HISTORICAL_SNAPSHOT"]);
  if (!parent) return fail("unavailable");
  if (event && (!batch || batch.id !== event.id || !scoped(batch, context, true) || !["POSTED", "REVERSED"].includes(String(event.status))
    || !(batch.status === event.status || event.status === "REVERSED" && batch.status === "POSTED") || !allLines.length || !Array.isArray(batch.lines) || batch.lines.some(l => !obj(l)) || allLines.some(l => !scoped(l, context))
    || new Set(allLines.map(l => l.id)).size !== allLines.length || lines.some(l => !owned(l))
    || reference.partId !== undefined && !selected || lines.some(l => {
      const prices = list(event.prices).filter(p => p.lineId === l.id && scoped(p, context));
      return prices.length !== 1 || prices[0].menuItemId !== l.menuItemId || prices[0].quantity !== l.quantity || !Array.isArray(l.movementIds);
    }))) return fail("unavailable", ["RECORD_NEEDS_REVIEW"]);
  if (reference.kind === "CAPTURED_RECIPE" && !captured || reference.kind === "CAPTURED_INGREDIENT" && !ingredient) return fail("unavailable", ["COST_SNAPSHOT_MISSING"]);
  if (captured && (reference.kind === "CAPTURED_RECIPE" || reference.kind === "CAPTURED_INGREDIENT") && (!Array.isArray(captured.ingredients)
    || captured.ingredients.some(i => !obj(i) || !scoped(i as Row, context))
    || new Set(list(captured.ingredients).map(i => i.ingredientId)).size !== captured.ingredients.length)) return fail("unavailable", ["RECORD_NEEDS_REVIEW"]);
  if (movement && !checkMovementSource(movement.row)) return fail("unavailable", ["RECORD_NEEDS_REVIEW"]);
  const add = (type: EvidenceRelation["type"], target: EvidenceReference) => {
    if (!parseEvidenceReference(target).ok) { missing("RECORD_NEEDS_REVIEW"); return; }
    if ((target.kind === "WAREHOUSE_MOVEMENT" || target.kind === "NOMENCLATURE" || target.kind === "MENU_ITEM") && !inventory
      || ["CAPTURED_COST", "CAPTURED_RECIPE", "CAPTURED_INGREDIENT", "SALE_EVENT"].includes(target.kind) && !sales) { missing("RELATIONS_RESTRICTED"); return; }
    if (!relations.some(r => JSON.stringify(r.reference) === JSON.stringify(target))) relations.push({ type, reference: target });
  };
  const addMovements = (line: Row, onlyIngredient?: Row) => {
    const snapshot = obj(line.recipeSnapshot), ingredients = onlyIngredient ? [onlyIngredient] : list(snapshot?.ingredients);
    if (!inventory) { if (snapshot?.consumptionMode !== "NONE") missing("RELATIONS_RESTRICTED"); return; }
    const originals = (Array.isArray(line.movementIds) ? line.movementIds : []).map(movementById);
    if (snapshot?.consumptionMode === "NONE" && originals.length) missing("COST_READ_MODEL_MISMATCH");
    if (new Set(line.movementIds as unknown[]).size !== originals.length) missing("COST_READ_MODEL_MISMATCH");
    for (const i of ingredients) {
      const identities = [`sale-consumption:${context.venueId}:${event!.id}:${line.id}:${i.ingredientId}`, `sale-consumption:${event!.id}:${line.id}:${i.ingredientId}`];
      const matches = originals.filter(m => m && identities.includes(String(m.row.idempotencyKey)));
      if (matches.length !== 1 || !matches[0]) { missing(); continue; }
      const m = matches[0].row;
      if (!checkMovementSource(m) || m.type !== "sale_consumption" || m.productKey !== i.productKey || m.warehouseId !== i.warehouseId || m.unit !== i.baseUnit
        || !close(m.amount, -Number(i.baseQuantityTotal)) || !close(Number(line.quantity) * Number(i.baseQuantityPerPortion), i.baseQuantityTotal)
        || (i.totalCost === null ? m.costAmount != null || m.costStatus !== "UNKNOWN" : !close(m.costAmount, -Number(i.totalCost)) || m.currency !== i.currency)) { missing("COST_READ_MODEL_MISMATCH"); continue; }
      add("derived_from", ref("WAREHOUSE_MOVEMENT", String(m.id)));
      for (const x of relatedMovements(line)) {
        const reversal = x.movement?.row;
        if (reversal?.type === "sale_reversal" && reversal.originalMovementId === m.id && checkMovementSource(reversal)) add("compensates", ref("WAREHOUSE_MOVEMENT", String(reversal.id)));
      }
    }
    if (!onlyIngredient && originals.length !== list(snapshot?.ingredients).length) missing("COST_READ_MODEL_MISMATCH");
    if (event?.status === "REVERSED" && ingredients.some(i => !relatedMovements(line).some(x => x.movement?.row.type === "sale_reversal"
      && originals.some(m => m?.row.id === x.movement?.row.originalMovementId && m?.row.productKey === i.productKey)))) missing();
  };
  let projection: EvidenceProjection;
  if (reference.kind === "CAPTURED_COST") {
    projection = costProjection(event!, lines, selected);
    if (["UNKNOWN", "PARTIAL"].includes(projection.costStatus)) missing(projection.costStatus === "UNKNOWN" ? "COST_UNKNOWN" : "COST_PARTIAL");
    if (projection.costMethod === null) missing("SOURCE_METADATA_MISSING");
    for (const l of lines) {
      const snap = obj(l.recipeSnapshot);
      if (!snap || !Array.isArray(snap.ingredients) || !scoped(snap, context) || !scoped(obj(snap.menuItem) ?? {}, context)
        || obj(snap.menuItem)?.id !== l.menuItemId) { missing("COST_SNAPSHOT_MISSING"); continue; }
      const ingredients = list(snap.ingredients);
      if (ingredients.length !== snap.ingredients.length || ingredients.some(i => !scoped(i, context)) || new Set(ingredients.map(i => i.ingredientId)).size !== ingredients.length) return fail("unavailable", ["RECORD_NEEDS_REVIEW"]);
      if (lineStatus(l) === "KNOWN" && !close(l.theoreticalCost, money(ingredients.reduce((n, i) => n + Number(i.totalCost), 0)))
        || snap.consumptionMode === "NONE" && (ingredients.length > 0 || l.theoreticalCost !== 0)) missing("COST_READ_MODEL_MISMATCH");
      if (ingredients.some(i => num(i.baseQuantityPerPortion) === null || num(i.baseQuantityTotal) === null || num(i.baseQuantityPerPortion)! <= 0
        || num(i.baseQuantityTotal)! <= 0 || (num(i.totalCost) !== null && (num(i.totalCost)! < 0 || i.currency !== event!.currency
          || !close(i.totalCost, money(Number(i.unitCost) * Number(i.baseQuantityTotal)))))
        || !obj(i.conversion) || !close(obj(i.conversion)!.inputQuantity, i.recipeQuantity) || obj(i.conversion)!.outputUnit !== i.baseUnit)) missing("COST_READ_MODEL_MISMATCH");
      if (inventory && (snap.consumptionMode !== "NONE" && (!unique(menu, l.menuItemId, context)
        || ingredients.some(i => { const n = unique(nomenclature, i.nomenclatureItemId, context); return !n || (n.productKey ?? n.key ?? n.id) !== i.productKey; })))) missing();
      if (!selected) add("derived_from", ref("CAPTURED_COST", String(event!.id), String(l.id)));
      else { add("derived_from", ref("CAPTURED_RECIPE", String(event!.id), String(l.id))); addMovements(l); }
    }
    const valued = allLines.filter(l => num(l.theoreticalCost) !== null);
    const canonicalTotal = valued.length ? money(valued.reduce((n, l) => n + Number(l.theoreticalCost), 0)) : null;
    if (canonicalTotal !== num(batch!.totalTheoreticalCost)) missing("COST_READ_MODEL_MISMATCH");
    if (!selected) for (const l of lines) { const saved = relations.length; addMovements(l); relations.splice(saved); } // assess completeness without expanding aggregate relations
  } else if (reference.kind === "CAPTURED_RECIPE") {
    parent = captured!;
    projection = { type: "CAPTURED_RECIPE", saleId: String(event!.id), saleLineId: String(selected!.id), recipeId: txt(captured!.recipeId), recipeVersion: num(captured!.recipeVersion),
      capturedAt: instant(captured!.capturedAt), consumptionMode: txt(captured!.consumptionMode), menuItemId: txt(obj(captured!.menuItem)?.id), menuItemName: txt(obj(captured!.menuItem)?.name), ingredientCount: list(captured!.ingredients).length };
    if (!Array.isArray(captured!.ingredients) || list(captured!.ingredients).length !== captured!.ingredients.length || !scoped(captured!, context)
      || !scoped(obj(captured!.menuItem) ?? {}, context) || obj(captured!.menuItem)?.id !== selected!.menuItemId) return fail("unavailable", ["RECORD_NEEDS_REVIEW"]);
    for (const i of list(captured!.ingredients)) {
      if (!scoped(i, context)) return fail("unavailable", ["RECORD_NEEDS_REVIEW"]);
      add("derived_from", ref("CAPTURED_INGREDIENT", String(event!.id), String(selected!.id), String(i.ingredientId)));
    }
    if (inventory) { const current = unique(menu, selected!.menuItemId, context); if (current) { add("current_definition", ref("MENU_ITEM", String(current.id))); diagnostics.push("CURRENT_DEFINITION_ONLY"); } else missing(); }
    else missing("RELATIONS_RESTRICTED");
  } else if (reference.kind === "CAPTURED_INGREDIENT") {
    parent = ingredient!;
    if (!scoped(captured!, context) || !scoped(obj(captured!.menuItem) ?? {}, context) || obj(captured!.menuItem)?.id !== selected!.menuItemId) return fail("unavailable", ["RECORD_NEEDS_REVIEW"]);
    const i = ingredient!, conversion = obj(i.conversion);
    projection = { type: "CAPTURED_INGREDIENT", saleId: String(event!.id), saleLineId: String(selected!.id), ingredientId: String(i.ingredientId),
      nomenclatureItemId: txt(i.nomenclatureItemId), productKey: txt(i.productKey), name: txt(i.name), recipeQuantity: num(i.recipeQuantity), recipeUnit: txt(i.recipeUnit),
      baseQuantityPerPortion: num(i.baseQuantityPerPortion), baseQuantityTotal: num(i.baseQuantityTotal), baseUnit: txt(i.baseUnit), warehouseId: txt(i.warehouseId),
      unitCost: num(i.unitCost), totalCost: num(i.totalCost), costStatus: txt(i.costStatus), costBasisMethod: txt(i.costBasisMethod), currency: txt(i.currency),
      costSourceDocumentId: txt(i.costSourceDocumentId), costSourceLineId: txt(i.costSourceLineId), costEffectiveDate: txt(i.costEffectiveDate),
      conversion: conversion ? { inputQuantity: num(conversion.inputQuantity), inputUnit: txt(conversion.inputUnit), factor: num(conversion.factor), outputUnit: txt(conversion.outputUnit), source: txt(conversion.source) } : null };
    if (i.totalCost === null || i.costStatus === "UNKNOWN") missing("COST_UNKNOWN");
    addMovements(selected!, i);
    if (inventory) {
      const current = unique(nomenclature, i.nomenclatureItemId, context);
      if (current && (current.productKey ?? current.key ?? current.id) === i.productKey) { add("current_definition", ref("NOMENCLATURE", String(current.id))); diagnostics.push("CURRENT_DEFINITION_ONLY"); } else missing();
    } else missing("RELATIONS_RESTRICTED");
  } else if (warehouseKind) {
    const m = movement!.row, amount = num(m.amount);
    projection = { type: "WAREHOUSE_MOVEMENT", movementType: txt(m.type), warehouseId: txt(m.warehouseId), productKey: txt(m.productKey), quantity: amount, unit: txt(m.unit),
      direction: amount === null ? null : amount > 0 ? "IN" : amount < 0 ? "OUT" : "ZERO", costAmount: num(m.costAmount), costStatus: txt(m.costStatus), currency: txt(m.currency),
      businessDate: txt(m.businessDate ?? m.date), sourceDocumentId: txt(m.sourceDocumentId), sourceLineId: txt(m.sourceLineId), saleId: txt(m.salesBatchId), saleLineId: txt(m.salesBatchLineId),
      originalMovementId: txt(m.originalMovementId), lifecycle: txt(m.status), recordBasis: movement!.basis };
    if (m.costStatus === "UNKNOWN" || num(m.costAmount) === null) missing("COST_UNKNOWN");
    if (m.type === "receipt") { const acquisition = await readReceiptAcquisition(context, m); if (!acquisition.complete) missing(acquisition.diagnostic); }
    if (m.type === "receipt" && m.sourceDocumentId && m.sourceLineId) add("derived_from", ref("PURCHASE_DOCUMENT", String(m.sourceDocumentId), String(m.sourceLineId)));
    if (m.originalMovementId) { const original = movementById(m.originalMovementId); if (original && original.row.salesBatchId === m.salesBatchId && original.row.salesBatchLineId === m.salesBatchLineId && checkMovementSource(original.row)) add("compensates", ref("WAREHOUSE_MOVEMENT", String(m.originalMovementId))); else missing(); }
    if (["sale_consumption", "sale_reversal"].includes(String(m.type)) && m.salesBatchId && m.salesBatchLineId && sales) add("belongs_to", ref("CAPTURED_COST", String(m.salesBatchId), String(m.salesBatchLineId)));
  } else {
    projection = { type: "NOMENCLATURE", id: String(currentNom!.id), productKey: txt(currentNom!.productKey ?? currentNom!.key), name: txt(currentNom!.name), unit: txt(currentNom!.unit), currentDefinitionOnly: true };
    diagnostics.push("CURRENT_DEFINITION_ONLY");
  }
  const nextOffset = offset + limit < relations.length ? offset + limit : null;
  if (nextOffset !== null || offset > 0) diagnostics.push("RELATIONS_PAGINATED");
  // Bind each bounded target through this same adapter, never treating a ref as a permission token.
  const boundRelations: EvidenceRelation[] = [];
  for (const relation of relations.slice(offset, offset + limit)) {
    if (isStockEvidenceKind(relation.reference.kind)) {
      const target = await bindStockEvidenceReference(context, relation.reference, asOf);
      if (target) boundRelations.push({ ...relation, reference: target }); else missing();
    } else if (relation.reference.kind === "MENU_ITEM") {
      const target = unique(menu, relation.reference.id, context)!;
      boundRelations.push({ ...relation, reference: { ...relation.reference, expectedRevision: await evidenceContentRevision(relation.reference, target) } });
    } else {
      // Revision construction is shared below; avoid recursive graph resolution.
      const targetRef = relation.reference;
      boundRelations.push({ ...relation, reference: { ...targetRef, expectedRevision: await evidenceContentRevision(targetRef, revisionInput(targetRef)) } });
    }
  }
  const bound = { ...reference, expectedRevision: revision };
  const observedAt = instant(event?.acceptedAt) ?? instant(parent.capturedAt) ?? instant(parent.createdAt);
  const updatedAt = instant(event?.reversedAt) ?? instant(parent.updatedAt);
  const timestamp = updatedAt ?? observedAt;
  return { ...base, diagnostics: [...new Set(diagnostics)], outcome: partial ? "partial" : "resolved", code: partial ? "PARTIAL_EVIDENCE" : "RESOLVED", evidence: {
    reference: bound, revision, binding: reference.expectedRevision ? "EXPECTED_REVISION" : "CURRENT_RECORD", projection,
    finality: nomenclatureKind ? "UNKNOWN" : "FINAL", availability: partial ? "PARTIAL" : "AVAILABLE", evidenceStatus: "PARTIAL",
    observedAt, updatedAt, freshness: { basis: timestamp ? "RECORD" : "UNKNOWN", timestamp, assessment: "UNKNOWN" },
    relations: boundRelations, page: { limit, offset, nextOffset }, traceTarget: { type: "EVIDENCE_RESOURCE", reference: bound },
  } };
}

export async function readSaleCost(context: Context, reference: EvidenceReference, limit: number, offset: number, asOf: string): Promise<SaleCostResolution> {
  const resolution = await resolveCostEvidence(context, reference, limit, offset, asOf);
  if (!("evidence" in resolution)) return resolution as SaleCostResolution;
  const e = resolution.evidence;
  if (e.projection.type !== "CAPTURED_COST") throw new Error("COST_PROJECTION_INVALID");
  const cost: CapturedSaleCost = { ...e.projection };
  delete (cost as Partial<EvidenceProjection>).type;
  return { contractVersion: 1, asOf, outcome: resolution.outcome, code: resolution.code, diagnostics: resolution.diagnostics,
    binding: e.binding, page: e.page, fact: { contractVersion: 1, factType: "SALE_CAPTURED_COST",
      factId: businessFactIdentity({ ...context, factType: "SALE_CAPTURED_COST", saleId: reference.id, ...(reference.partId ? { saleLineId: reference.partId } : {}) }),
      venueId: context.venueId, workspaceId: context.workspaceId, ...cost, value: cost.capturedTotalCost, unit: "MONEY",
      revision: e.revision, finality: e.finality, availability: e.availability,
      evidenceStatus: resolution.outcome === "resolved" ? "COMPLETE" : "PARTIAL", diagnostics: resolution.diagnostics,
      sourceRef: e.reference, evidenceRefs: e.relations.map(r => r.reference), traceTarget: e.traceTarget,
      ...(e.observedAt ? { observedAt: e.observedAt } : {}), ...(e.updatedAt ? { updatedAt: e.updatedAt } : {}), freshness: e.freshness,
    } };
}
