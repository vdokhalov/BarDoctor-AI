import { businessRecord as record, finiteBusinessNumber as finite, scopedBusinessRows } from "./business-day-rows";
import { convertStockQuantity } from "./stock-units";
import type { BaseInventoryUnit } from "./inventory";
type Row = Record<string, unknown>;
const rows = (value: unknown) => Array.isArray(value) ? value.map(record) : [];
const instant = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
const warehouse = (row: Row) => String(row.warehouseId ?? row.warehouseExternalId ?? "");
const product = (row: Row) => String(row.productKey ?? row.key ?? "");

/** Explains/validates the existing balance; this never replaces that projection
 * with a second authoritative stock calculation or manufactures a new anchor. */
export function stockQuantityEvidence(input: { balance: Row; venueId: number; workspaceId?: number; dataAccountId?: number;
  warehouseId?: string; movements: unknown[]; counts: unknown[]; openings: unknown[] }) {
  const scope = { venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId };
  const balance = input.balance, key = product(balance), unit = String(balance.unit ?? "unknown") as BaseInventoryUnit;
  const quantity = finite(balance.current ?? balance.quantity ?? balance.onHand);
  const exactWarehouse = input.warehouseId ?? warehouse(balance);
  const inWarehouse = (row: Row) => exactWarehouse ? warehouse(row) === exactWarehouse || exactWarehouse === "__venue__" && !warehouse(row) : !warehouse(row) || warehouse(row) === "__venue__";
  const owned = rows(input.movements).filter(row => Object.entries({ venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId }).every(([field, expected]) => expected == null || row[field] == null || Number(row[field]) === expected));
  const selected = owned.filter(row => product(row) === key && inWarehouse(row));
  const seen = new Set<unknown>();
  const duplicateIds = selected.some(row => { if (!row.id || seen.has(row.id)) return true; seen.add(row.id); return false; });
  const countId = balance.lastInventoryDocumentId, openingId = balance.openingDocumentId;
  const countCandidates = scopedBusinessRows(input.counts, scope).filter(row => row.id === countId && row.status === "completed" && inWarehouse(row));
  const openingCandidates = scopedBusinessRows(input.openings, scope).filter(row => row.id === openingId && row.status === "confirmed" && inWarehouse(row));
  const anchor = countCandidates.length === 1 ? countCandidates[0] : !countId && openingCandidates.length === 1 ? openingCandidates[0] : null;
  const isCount = Boolean(anchor && countCandidates.length === 1);
  const anchorLines = anchor ? scopedBusinessRows(rows(anchor.items ?? anchor.rows), scope).filter(row => product(row) === key) : [];
  const line = anchorLines.length === 1 ? anchorLines[0] : null;
  const anchorAmount = line ? finite(isCount ? line.actual : line.quantity) : null;
  const anchorUnit = line ? String(line.stockUnit ?? line.baseUnit ?? line.unit ?? unit) : unit;
  const startingQuantity = anchorAmount != null ? convertStockQuantity(anchorAmount, anchorUnit, unit) : null;
  const boundary = anchor ? instant(isCount ? anchor.completedAt ?? anchor.updatedAt : anchor.createdAt) : null;
  const sameTimeIds = new Set(rows(record(anchor?.anchorBoundary).movements).map(row => row.id));
  const boundaryCaptured = anchor && Array.isArray(record(anchor.anchorBoundary).movements);
  let ambiguous = false;
  const contributors = selected.filter(row => {
    if (row.status === "cancelled" || row.reversedAt || anchor && row.sourceDocumentId === anchor.id) return false;
    if (!boundary) return true;
    const timestamp = instant(row.createdAt);
    if (!timestamp) { ambiguous = true; return true; }
    if (timestamp === boundary) { if (!boundaryCaptured) ambiguous = true; return !sameTimeIds.has(row.id); }
    return timestamp > boundary;
  });
  const amounts = contributors.map(row => convertStockQuantity(row.amount, row.unit, unit));
  const unknown = !anchor || !line || startingQuantity == null || !boundary || duplicateIds || ambiguous || amounts.some(value => value == null);
  const explainedQuantity = unknown ? null : Math.round((startingQuantity! + amounts.reduce<number>((sum, value) => sum + value!, 0)) * 1e6) / 1e6;
  const match = quantity != null && explainedQuantity != null && Math.abs(quantity - explainedQuantity) < 0.000001;
  return { quantity, unit, status: match ? quantity === 0 ? "KNOWN_ZERO" : "KNOWN" : quantity == null ? "UNKNOWN" : "PARTIAL",
    consistency: match ? "MATCH" : explainedQuantity == null ? "UNKNOWN" : "MISMATCH", explainedQuantity,
    anchor: anchor && line ? { kind: isCount ? "INVENTORY_DOCUMENT" : "OPENING_STOCK", id: String(anchor.id), lineId: line.id ?? line.rowId ?? null,
      quantity: startingQuantity, unit, at: boundary } : null,
    contributorCount: contributors.length, contributors,
    evidenceComplete: match, diagnostics: [...(!anchor ? ["NO_QUANTITY_ANCHOR"] : []), ...(ambiguous ? ["LEGACY_ANCHOR_BOUNDARY_UNKNOWN"] : []),
      ...(duplicateIds ? ["RECORD_NEEDS_REVIEW"] : []), ...(!unknown && !match ? ["STOCK_QUANTITY_READ_MODEL_MISMATCH"] : [])] };
}
