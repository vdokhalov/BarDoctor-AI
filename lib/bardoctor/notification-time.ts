function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date()); return true; }
  catch { return false; }
}

function zonedParts(timestamp: number, timeZone: string): Record<string, number> {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(timestamp)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

/** Convert venue-local calendar time to UTC while preserving timezone and DST. */
export function zonedDateTimeToUtc(dateKey: string, clock: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock) || !validTimezone(timeZone)) throw new Error("INVALID_NOTIFICATION_TIME");
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = clock.split(":").map(Number);
  const desiredAsUtc = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0);
  let guess = desiredAsUtc;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = zonedParts(guess, timeZone);
    const represented = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!, parts.second!);
    const correction = desiredAsUtc - represented;
    guess += correction;
    if (correction === 0) break;
  }
  return new Date(guess).toISOString();
}
