/**
 * Purchase stores are account-scoped legacy documents. Their mutation indexes
 * are not safe for mixed-venue state. Fail closed before consolidation/posting,
 * never drop foreign rows or guess ownership from a matching product key.
 * Untagged legacy rows remain compatible only inside the authenticated store.
 */
export function purchaseVenueScopeIssue(venueId: unknown, ...values: unknown[]) {
  const expected = Number(venueId);
  const validExpected = Number.isSafeInteger(expected) && expected > 0;
  const pending = [...values];
  const seen = new Set<object>();
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const child of value) pending.push(child);
      continue;
    }
    const row = value as Record<string, unknown>;
    // Existing supplier mappings serialize an untagged legacy venue as numeric
    // zero. It is not an explicit venue and must not break account-local data.
    if (row.venueId != null && row.venueId !== 0) {
      const actual = Number(row.venueId);
      if (!validExpected || !Number.isSafeInteger(actual) || actual <= 0 || actual !== expected) {
        return {
          ok: false as const,
          code: "PURCHASE_VENUE_SCOPE_NEEDS_REVIEW" as const,
          reviewState: "NEEDS_REVIEW" as const,
          error: "Приход заблокирован: принадлежность складских данных заведению требует проверки. Данные не изменены.",
        };
      }
    }
    for (const child of Object.values(row)) pending.push(child);
  }
  return null;
}
