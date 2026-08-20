export const PUBLIC_NOTIFICATION_RUN_INTERVAL_MS = 50 * 60 * 1_000;

export function notificationRunIsDue(
  lastRunValues: Array<string | null>,
  now = new Date(),
  minimumIntervalMs = PUBLIC_NOTIFICATION_RUN_INTERVAL_MS,
): boolean {
  if (lastRunValues.length === 0) return false;
  const cutoff = now.getTime() - minimumIntervalMs;
  return lastRunValues.some((value) => {
    if (!value) return true;
    const timestamp = Date.parse(value);
    return !Number.isFinite(timestamp) || timestamp <= cutoff;
  });
}
