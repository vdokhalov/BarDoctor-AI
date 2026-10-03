import { derivedInputBelongs } from "./derived-input-scope";
import { salesEventDocuments } from "./sales-events";

type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(row) : [];

/** Existing documents and read-only native batches become one document/line grain.
 * Dedup uses accepted identities, never names or unrelated external IDs.
 * Reversed event projections suppress their former document representation too. */
export function itemSalesInputs(input: { events?: unknown[]; documents?: unknown[]; batches?: unknown[]; venueId: number; workspaceId?: number; dataAccountId?: number }) {
  const native = new Map<string, Row>();
  const scoped = (values: unknown): Row[] => rows(values).filter(value => input.venueId <= 0 || derivedInputBelongs(value, { venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId }));
  for (const event of scoped(input.events)) {
    if (Number(event.venueId) !== input.venueId || typeof event.id !== "string") continue;
    const previous = native.get(event.id);
    if (!previous || event.status === "REVERSED" || previous.status !== "REVERSED") native.set(event.id, event);
  }
  const projections = salesEventDocuments([...native.values()], input.venueId);
  const batchIds = new Set(projections.map(batch => batch.id));
  const documents: Row[] = scoped(input.documents).filter(document => !native.has(String(document.salesEventId ?? "")) && !batchIds.has(String(document.salesBatchId ?? "")));
  const batches: Row[] = scoped(input.batches).filter(batch => !batchIds.has(String(batch.id)));
  for (const projection of projections) {
    if (projection.status !== "POSTED") continue;
    const lines = rows(projection.lines), prices = rows(projection.prices);
    const items = lines.map(line => {
      const price = prices.find(price => price.lineId === (line.externalLineId ?? line.id));
      return { id: line.externalLineId ?? line.id, saleLineId: line.id, menuItemId: line.menuItemId,
        name: price?.name ?? line.rawName, quantity: price?.quantity ?? line.quantity,
        grossSales: price?.total ?? null, currency: projection.currency, salesEventId: projection.salesEventId };
    });
    documents.push({ id: `native:${projection.salesEventId}`, salesEventId: projection.salesEventId,
      salesBatchId: projection.id, status: "confirmed", venueId: input.venueId, date: projection.businessDate,
      currency: projection.currency, total: projection.revenue, totalRevenue: projection.revenue, items, readOnly: true });
    batches.push(projection);
  }
  return { documents, batches, nativeEventIds: [...native.keys()].sort() };
}
