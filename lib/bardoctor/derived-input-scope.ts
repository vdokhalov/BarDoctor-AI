/** A derived reader must also check ownership carried by nested facts. Untagged
 * historical fields remain account-local; explicit foreign markers never do. */
export function derivedInputBelongs(value: unknown, scope: { venueId: number; workspaceId?: number; dataAccountId?: number }): boolean {
  if (!value || typeof value !== "object") return true;
  if (Array.isArray(value)) return value.every(child => derivedInputBelongs(child, scope));
  const row = value as Record<string, unknown>;
  if (!Object.entries(scope).every(([key, expected]) => expected == null || row[key] == null || key === "venueId" && row[key] === "primary" || Number(row[key]) === expected)) return false;
  return Object.values(row).every(child => derivedInputBelongs(child, scope));
}
