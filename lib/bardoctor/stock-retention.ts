/** Retention of the existing canonical movement store, never a second ledger. */
export const MAX_STOCK_MOVEMENTS = 20_000;
// Leave room below the native D1 single-value limit; row count alone cannot
// bound nested conversion/recipe snapshots or UTF-8 names.
export const MAX_STOCK_MOVEMENT_BYTES = 1_900_000;
type Row = Record<string, unknown>;
const object = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(object) : [];
const key = (row: Row) => String(row.productKey ?? row.key ?? "");
const stamp = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? value : "";
export class StockEvidenceCapacityError extends Error {
  readonly code = "STOCK_EVIDENCE_CAPACITY_REACHED";
  constructor() { super("Required stock evidence cannot fit the bounded canonical movement store"); this.name = "StockEvidenceCapacityError"; }
}

/** Pin current facts before filling the optional recent-history window. If all
 * capacity is required, refuse the new command; never silently lose its basis.
 * Bounded output, no writes and no fabricated anchors. */
export function retainStockMovements<T>(values: T[], assortment?: unknown): T[] {
  const encoder = new TextEncoder();
  const sizes = values.map(value => encoder.encode(JSON.stringify(value)).byteLength + 1);
  if (values.length <= MAX_STOCK_MOVEMENTS && sizes.reduce((sum, size) => sum + size, 2) <= MAX_STOCK_MOVEMENT_BYTES) return values;
  // Legacy/unclassified stores cannot prove that any particular row is safe to
  // discard. Existing callers must provide their actual canonical assortment.
  const root = object(assortment), balances = rows(root.stockBalances);
  if (!balances.length) throw new StockEvidenceCapacityError();
  const aliases = new Map(rows(root.inventoryProductAliases).map(row => [String(row.from ?? ""), String(row.to ?? "")]));
  const catalog = new Map(rows(root.nomenclature).map(row => [String(row.id ?? ""), key(row)]));
  const resolved = new Map<string, string>();
  const canonicalKey = (value: string) => {
    if (resolved.has(value)) return resolved.get(value)!;
    let target = value; const visited = new Set<string>();
    while (aliases.has(target) && !visited.has(target) && visited.size < 20) { visited.add(target); target = aliases.get(target)!; }
    target = catalog.get(target) || target; resolved.set(value, target); return target;
  };
  const trackedVenues = new Set([...balances, ...rows(root.nomenclature)].map(balance => String(balance.venueId ?? "")));
  const origins = new Map<string, { boundary: string; anchors: Set<string> }>();
  for (const balance of balances) {
    if (!key(balance)) continue;
    const identity = String(balance.venueId ?? "") + ":" + canonicalKey(key(balance));
    const scopes = [balance, ...Object.values(object(balance.warehouseBalances)).map(object)];
    const boundaries = scopes.map(scope => stamp(scope.quantityAnchorAt));
    const boundary = boundaries.every(Boolean) ? boundaries.sort()[0] : "";
    const anchors = new Set(scopes.flatMap(scope => [scope.lastInventoryDocumentId, scope.openingDocumentId]).filter(value => typeof value === "string") as string[]);
    const previous = origins.get(identity);
    origins.set(identity, { boundary: previous ? previous.boundary && boundary ? [previous.boundary, boundary].sort()[0] : "" : boundary,
      anchors: new Set([...(previous?.anchors ?? []), ...anchors]) });
  }
  // Untagged account-local legacy movements still refer to their canonical
  // aliases. Conservatively share their oldest known anchor across venues.
  for (const [identity, origin] of [...origins]) {
    const product = identity.slice(identity.indexOf(":") + 1), legacy = origins.get(":" + product);
    if (!legacy) origins.set(":" + product, origin);
    else if (!origin.boundary || !legacy.boundary || origin.boundary < legacy.boundary) origins.set(":" + product, { boundary: origin.boundary && legacy.boundary ? origin.boundary : "", anchors: new Set([...origin.anchors, ...legacy.anchors]) });
  }
  const protectedRows = new Set<number>(), byId = new Map<string, number[]>();
  for (const [index, value] of values.entries()) {
    const movement = object(value), id = typeof movement.id === "string" ? movement.id : "";
    if (id) { const indexes = byId.get(id) ?? []; indexes.push(index); byId.set(id, indexes); }
    const origin = origins.get(String(movement.venueId ?? "") + ":" + canonicalKey(key(movement))) ?? origins.get(":" + canonicalKey(key(movement)));
    const active = movement.status !== "cancelled" && !movement.reversedAt;
    // Unknown rows/scope/timestamps are never classified as safely obsolete.
    if (!id || !key(movement) || movement.venueId != null && !trackedVenues.has(String(movement.venueId)) || movement.workspaceId != null || movement.dataAccountId != null
      || origin && (active && (movement.type === "receipt" || movement.type === "opening_balance"
        || !origin.boundary || !stamp(movement.createdAt) || String(movement.createdAt) >= origin.boundary)
        || origin.anchors.has(String(movement.sourceDocumentId)))) protectedRows.add(index);
  }
  for (const index of [...protectedRows]) {
    const original = object(values[index]).originalMovementId;
    if (typeof original === "string") for (const parent of byId.get(original) ?? []) protectedRows.add(parent);
  }
  let bytes = 2;
  for (const index of protectedRows) bytes += sizes[index];
  if (protectedRows.size > MAX_STOCK_MOVEMENTS || bytes > MAX_STOCK_MOVEMENT_BYTES) throw new StockEvidenceCapacityError();
  for (let index = 0; index < values.length && protectedRows.size < MAX_STOCK_MOVEMENTS; index++) {
    if (protectedRows.has(index) || bytes + sizes[index] > MAX_STOCK_MOVEMENT_BYTES) continue;
    protectedRows.add(index); bytes += sizes[index];
  }
  return values.filter((_, index) => protectedRows.has(index));
}

export function stockCapacityResponse(error: unknown): Response | null {
  if (!(error instanceof StockEvidenceCapacityError)) return null;
  return Response.json({ ok: false, code: error.code, retryable: false,
    error: "Недостаточно места для сохранения обязательной истории склада. Операция не выполнена; существующие данные сохранены." }, { status: 409 });
}
