import { derivedInputBelongs } from './derived-input-scope';

type Row = Record<string, unknown>;
type Scope = { venueId: number; workspaceId: number; dataAccountId: number };

/** The existing payroll editor uses profile.id || profile.name || "primary"
 * as its venue key. Translate only that exact account-local legacy key, without
 * discarding explicit ownership on the entry or any of its nested facts.
 * This is a read adapter: persisted rows and other business stores stay intact.
 */
export function normalizeLegacyPayrollEntries(entries: Row[], profile: Row, scope: Scope): Row[] {
  const legacyKey = String(profile.id || profile.name || 'primary');
  return entries.map(entry => {
    if (entry.venueId == null || String(entry.venueId) !== legacyKey) return entry;
    // Numeric markers are explicit venue ownership, even if the profile happens
    // to carry the same text. Never reinterpret a foreign numeric venue as a name.
    if (Number.isFinite(Number(entry.venueId)) && Number(entry.venueId) !== scope.venueId) return entry;
    const candidate = { ...entry, venueId: scope.venueId };
    return derivedInputBelongs(candidate, scope) ? candidate : entry;
  });
}
