type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function rows(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function identity(value: JsonRecord): string {
  // Match the runtime posting key precedence. Treating a legacy `key` as
  // primary while posting uses `productKey` would hide last-wins collisions.
  for (const candidate of [value.productKey, value.key, value.nomenclatureItemId, value.id]) {
    const normalized = String(candidate ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function quantity(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function effectiveWarehouseQuantity(value: unknown): number {
  const row = record(value);
  for (const candidate of [row.current, row.quantity, row.onHand]) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    return quantity(candidate);
  }
  return 0;
}

export type DirectBalanceMutation = {
  productKey: string;
  before: number;
  after: number;
  code?: "DUPLICATE_BALANCE_IDENTITY" | "MALFORMED_BALANCE_IDENTITY";
};

export function directBalanceMutations(beforeValue: unknown, afterValue: unknown): DirectBalanceMutation[] {
  const beforeRows = rows(record(beforeValue).stockBalances);
  const afterRows = rows(record(afterValue).stockBalances);
  const issues: DirectBalanceMutation[] = [];

  const venueScope = (row: JsonRecord) => {
    const parsed = Number(row.venueId);
    return Number.isFinite(parsed) && parsed > 0 ? `venue:${parsed}` : "venue:*";
  };
  const sameLegacyRows = (left: JsonRecord[], right: JsonRecord[]) =>
    JSON.stringify(left) === JSON.stringify(right);

  const malformedBeforeRows = beforeRows.filter((row) => !identity(row));
  const malformedAfterRows = afterRows.filter((row) => !identity(row));
  if (!sameLegacyRows(malformedBeforeRows, malformedAfterRows)) {
    issues.push({
      productKey: "<missing>",
      before: malformedBeforeRows.length,
      after: malformedAfterRows.length,
      code: "MALFORMED_BALANCE_IDENTITY",
    });
  }

  const duplicateIdentities = (values: JsonRecord[]) => {
    const grouped = new Map<string, Map<string, number>>();
    for (const row of values) {
      const productKey = identity(row);
      if (!productKey) continue;
      const scopes = grouped.get(productKey) ?? new Map<string, number>();
      const scope = venueScope(row);
      scopes.set(scope, (scopes.get(scope) ?? 0) + 1);
      grouped.set(productKey, scopes);
    }
    return new Set([...grouped].flatMap(([productKey, scopes]) => {
      const count = [...scopes.values()].reduce((sum, value) => sum + value, 0);
      const overlaps = [...scopes.values()].some((value) => value > 1)
        || (scopes.has("venue:*") && count > 1);
      return overlaps ? [productKey] : [];
    }));
  };
  const beforeDuplicates = duplicateIdentities(beforeRows);
  const afterDuplicates = duplicateIdentities(afterRows);
  const duplicateKeys = new Set([...beforeDuplicates, ...afterDuplicates]);
  for (const productKey of [...duplicateKeys].sort()) {
    const beforeGroup = beforeRows.filter((row) => identity(row) === productKey);
    const afterGroup = afterRows.filter((row) => identity(row) === productKey);
    // Runtime balance selection is order-sensitive for ambiguous identities.
    // Only tolerate a pre-existing legacy conflict when its rows remain exactly
    // unchanged and in the same order; otherwise a reorder could switch which
    // physical row is consumed without changing the quantity multiset.
    if (!sameLegacyRows(beforeGroup, afterGroup)) {
      issues.push({
        productKey,
        before: beforeGroup.length,
        after: afterGroup.length,
        code: "DUPLICATE_BALANCE_IDENTITY",
      });
    }
  }

  const indexed = (values: JsonRecord[]) => new Map(values.flatMap((row) => {
    const productKey = identity(row);
    if (!productKey || duplicateKeys.has(productKey)) return [];
    return [[`${venueScope(row)}\u0000${productKey}`, row] as const];
  }));
  const before = indexed(beforeRows);
  const after = indexed(afterRows);
  for (const scopedKey of new Set([...before.keys(), ...after.keys()])) {
    const previousRow = before.get(scopedKey);
    const nextRow = after.get(scopedKey);
    const previous = quantity(previousRow?.current);
    const next = quantity(nextRow?.current);
    const productKey = identity(previousRow ?? nextRow ?? {});
    if (previous !== next) issues.push({ productKey, before: previous, after: next });
    const previousWarehouses = record(previousRow?.warehouseBalances);
    const nextWarehouses = record(nextRow?.warehouseBalances);
    for (const warehouseId of new Set([...Object.keys(previousWarehouses), ...Object.keys(nextWarehouses)])) {
      const previousWarehouseQuantity = effectiveWarehouseQuantity(previousWarehouses[warehouseId]);
      const nextWarehouseQuantity = effectiveWarehouseQuantity(nextWarehouses[warehouseId]);
      if (previousWarehouseQuantity === nextWarehouseQuantity) continue;
      issues.push({
        productKey: `${productKey}@warehouse:${warehouseId}`,
        before: previousWarehouseQuantity,
        after: nextWarehouseQuantity,
      });
    }
  }
  return issues;
}
