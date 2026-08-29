import { normalizeVenueMenuCurrencyUpdates } from "./venue-currency-policy";

/**
 * Canonicalizes currencies only for new or changed menu items. Unchanged legacy
 * records are left byte-for-byte compatible, so RUB is never relabelled as PMR_RUB.
 */
export function normalizeAssortmentMenuCurrencyUpdates(
  before: unknown,
  after: unknown,
  accountingCurrency: unknown,
) {
  return normalizeVenueMenuCurrencyUpdates({ before, after, accountingCurrency });
}
