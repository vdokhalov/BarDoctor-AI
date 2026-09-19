import { purchaseVenueScopeIssue } from "./purchase-venue-scope";

/** Resolve only the account-local input alias. Never reinterpret an explicit foreign ID. */
export function canonicalMonthClosingVenues(data: unknown, activeVenueId: number) {
  if (!Number.isSafeInteger(activeVenueId) || activeVenueId <= 0) {
    return { ok: false as const };
  }
  if (data == null) return { ok: true as const, data };
  if (!Array.isArray(data)) return { ok: false as const };
  const canonical = [];
  for (const value of data) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false as const };
    const row = value as Record<string, unknown>;
    const id = row.venueId;
    if (id != null && id !== "primary" && id !== activeVenueId && id !== String(activeVenueId)) {
      return { ok: false as const };
    }
    // Snapshot contents are signed history: validate them, never rewrite them.
    const resolved = { ...row, venueId: activeVenueId };
    if (purchaseVenueScopeIssue(activeVenueId, resolved)) return { ok: false as const };
    canonical.push(resolved);
  }
  return { ok: true as const, data: canonical };
}
