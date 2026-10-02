/** Scoped read helpers; never persist or create operational facts. */
export type BusinessRow = Record<string, unknown>;
export const businessRecord = (value: unknown): BusinessRow => value && typeof value === "object" && !Array.isArray(value) ? value as BusinessRow : {};
export function finiteBusinessNumber(value: unknown): number | null {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const parsed = typeof value === "string" ? Number(value.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
export function activeBusinessRow(value: unknown): boolean {
  const row = businessRecord(value);
  return !row.reversedAt && !row.isDraft && !["cancelled", "canceled", "void", "voided", "reversed", "draft"].includes(String(row.status ?? "").toLowerCase());
}
export function uniqueBusinessRows(values: unknown[]): BusinessRow[] {
  const seen = new Set<string>();
  return values.map(businessRecord).filter(row => {
    // Idless legacy records are distinct observations, not invented identities.
    if (row.id == null) return true;
    const key = JSON.stringify([row.workspaceId ?? null, row.dataAccountId ?? null, row.venueId ?? null, row.id]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function scopedBusinessRows(values: unknown[], scope: { venueId?: number; workspaceId?: number; dataAccountId?: number }): BusinessRow[] {
  return uniqueBusinessRows(values).filter(row => Object.entries(scope).every(([key, expected]) => expected == null || row[key] == null || Number(row[key]) === expected));
}
export function eligibleRevenueRows(values: unknown[], venueId?: number, boundary: { workspaceId?: number; dataAccountId?: number } = {}): BusinessRow[] {
  return scopedBusinessRows(values, { venueId, workspaceId: boundary.workspaceId, dataAccountId: boundary.dataAccountId }).filter(activeBusinessRow);
}
export function aggregateBusinessDates(values: unknown[]): BusinessRow[] {
  const groups = new Map<string, BusinessRow[]>();
  for (const row of eligibleRevenueRows(values)) {
    const date = String(row.date ?? row.businessDate ?? row.operatingDate ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const key = JSON.stringify([row.workspaceId ?? null, row.dataAccountId ?? null, row.venueId ?? null, date, row.currency ?? row.accountingCurrency ?? null]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].map(rows => {
    const sum = (keys: string[]) => { const values = rows.map(row => finiteBusinessNumber(keys.map(key => row[key]).find(value => value != null))); return values.some(value => value == null) ? null : Math.round(values.reduce<number>((total, value) => total + value!, 0) * 100) / 100; };
    const states = rows.map(row => businessRecord(row._bdOperationalDay));
    const revenueStates = rows.map((row, index) => row.revenueStatus ?? businessRecord(states[index].revenue).status ?? (row.closingStatus === "open" ? "PROVISIONAL" : "UNKNOWN"));
    const complete = rows.every((row, index) => row.operationalStatus === "COMPLETE" || states[index].status === "COMPLETE");
    return { date: String(rows[0].date ?? rows[0].businessDate ?? rows[0].operatingDate).slice(0, 10),
      venueId: rows[0].venueId, workspaceId: rows[0].workspaceId, dataAccountId: rows[0].dataAccountId, currency: rows[0].currency ?? rows[0].accountingCurrency,
      revenue: sum(["revenue", "amount"]), receipts: sum(["receipts", "checks"]), guests: sum(["guests", "guestCount"]),
      revenueStatus: revenueStates.includes("PROVISIONAL") ? "PROVISIONAL" : revenueStates.every(value => value === "FINAL") ? "FINAL" : "UNKNOWN",
      operationalStatus: complete ? "COMPLETE" : "PARTIAL", grain: "BUSINESS_DAY", sourceIds: rows.map(row => row.id).filter(value => value != null),
    };
  });
}
