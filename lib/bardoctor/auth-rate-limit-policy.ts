export function progressiveBackoffSeconds(
  overLimitBy: number,
  windowSeconds: number,
): number {
  if (overLimitBy <= 0) return 0;
  return Math.min(windowSeconds, 5 * (2 ** Math.min(overLimitBy - 1, 6)));
}
