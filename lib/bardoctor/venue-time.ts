/** UTC instants remain canonical; venue-local dates are assigned only to new operations. */
export function canonicalVenueTimezone(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^(UTC|[A-Za-z_]+\/[A-Za-z0-9_+\-/]+)$/.test(value.trim())) return undefined;
  try { return new Intl.DateTimeFormat("en", { timeZone: value.trim() }).resolvedOptions().timeZone; }
  catch { return undefined; }
}
export function venueTimeFromJson(json: string | null): { timezone: string; timezoneConfigured: boolean } {
  let timezone: string | undefined;
  try { timezone = canonicalVenueTimezone(JSON.parse(json || "{}").timezone); } catch { /* Legacy profile: retain UTC until explicitly configured. */ }
  return { timezone: timezone || "UTC", timezoneConfigured: Boolean(timezone) };
}
function parts(instant: string, timezone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: canonicalVenueTimezone(timezone) || "UTC",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant)).map(p => [p.type, p.value]));
}
export function venueDate(instant: string, timezone = "UTC"): string {
  const p = parts(instant, timezone); return `${p.year}-${p.month}-${p.day}`;
}
export function venueClock(instant: string, timezone = "UTC"): string {
  const p = parts(instant, timezone); return `${p.hour}:${p.minute}`;
}
