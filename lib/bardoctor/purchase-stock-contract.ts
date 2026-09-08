/** Purchase accounting category is not a nomenclature taxonomy or inventory kind.
 * A persisted, explicit stock kind wins over legacy `other`; callers must resolve
 * the reference in the current venue, never trust a client-supplied kind.
 */
export function stockPurchaseCategory(kind: unknown, category: unknown): string {
  const value = typeof category === "string" ? category : "";
  if (kind !== "stock") return value;
  return ["products", "alcohol", "food", "consumables", "hookah", "household"].includes(value)
    ? value : "products";
}
