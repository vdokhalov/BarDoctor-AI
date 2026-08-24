export const CONFIRMED_ARCHIVE_VENUE_IDS = [
  2, 3, 1080, 3162, 3281, 3282, 3283, 3284, 3285, 3286, 3287,
] as const;

export const PROTECTED_ACTIVE_VENUE_IDS = [1, 2088, 3280] as const;

export const CONFIRMED_ARCHIVE_PHRASE =
  "ARCHIVE 11 CONFIRMED VENUES; KEEP 1,2088,3280 ACTIVE" as const;

export function isExactConfirmedArchiveSet(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length !== CONFIRMED_ARCHIVE_VENUE_IDS.length) return false;
  const normalized = value.map(Number);
  if (normalized.some((id) => !Number.isInteger(id))) return false;
  const unique = [...new Set(normalized)].sort((left, right) => left - right);
  return unique.length === CONFIRMED_ARCHIVE_VENUE_IDS.length
    && unique.every((id, index) => id === CONFIRMED_ARCHIVE_VENUE_IDS[index]);
}
