export function notificationRetryAt(attempt: number, now: number): string {
  const delay = Math.min(6 * 60 * 60_000, 15 * 60_000 * 2 ** Math.min(5, Math.max(0, attempt - 1)));
  return new Date(now + delay).toISOString();
}
