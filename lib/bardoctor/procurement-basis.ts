import { businessRecord as record, finiteBusinessNumber as finite, scopedBusinessRows } from "./business-day-rows";
import { resolveCostBasis } from "./cost-basis";
import { resolvePurchaseLineAccountingCost } from "./valuation";
import { resolveInventoryProductKey, type BaseInventoryUnit } from "./inventory";
import { physicalUnit, convertStockQuantity, validatePurchaseConversionSnapshot } from "./stock-units";

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(record) : [];
const round = (value: number, digits = 6) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Existing contextual summary, grouped by canonical identity and comparable
 * stock unit/currency/warehouse. The receipt resolver alone selects lastPrice. */
export function procurementProductSummary(input: { venueId: number; workspaceId?: number; dataAccountId?: number; assortment: unknown;
  documents: unknown[]; movements: unknown[]; currency: string | null; startDate: string; asOf: string }) {
  const scope = { venueId: input.venueId, workspaceId: input.workspaceId, dataAccountId: input.dataAccountId };
  const root = record(input.assortment), catalogue = scopedBusinessRows(rows(root.nomenclature), scope);
  const documents = scopedBusinessRows(input.documents, scope).filter(doc => doc.status === "confirmed" && doc.documentType !== "price_list" && !doc.reversedAt);
  const receipts = scopedBusinessRows(input.movements, scope);
  const products = new Map<string, { name: string; productKey: string | null; nomenclatureId: string | null; warehouseId: string | null;
    unit: BaseInventoryUnit | null; currency: string | null; spend: number | null; quantity: number | null; sourcePurchases: Row[] }>();
  for (const document of documents) {
    if (String(document.date) < input.startDate || String(document.date) > input.asOf.slice(0, 10)) continue;
    for (const item of scopedBusinessRows(rows(document.items), scope)) {
      const requested = item.canonicalProductKey ?? item.purchaseProductKey ?? item.nomenclatureId ?? item.nomenclatureItemId;
      const canonical = requested ? resolveInventoryProductKey(root, requested) : "";
      const matches = catalogue.filter(nom => canonical && [nom.productKey, nom.key, nom.id].includes(canonical));
      const nom = matches.length === 1 ? matches[0] : null;
      const productKey = nom ? String(nom.productKey ?? nom.key ?? nom.id) : null;
      const warehouseId = String(item.warehouseId ?? document.warehouseId ?? document.warehouseExternalId ?? "") || null;
      const unit = nom ? physicalUnit(nom.unit) : null;
      const group = productKey ? JSON.stringify([productKey, unit, input.currency, warehouseId]) : JSON.stringify(["unmapped", document.id, item.id]);
      const current = products.get(group) ?? { name: String(nom?.name ?? item.name ?? "Позиция"), productKey, nomenclatureId: nom ? String(nom.id) : null,
        warehouseId, unit, currency: input.currency, spend: 0, quantity: 0, sourcePurchases: [] };
      const snapshot = validatePurchaseConversionSnapshot(item.purchaseConversion);
      const sourceUnit = String(snapshot?.input.unit ?? item.unit ?? "");
      const sourceQuantity = snapshot?.input.quantity ?? finite(item.quantity);
      const sourceUnitPrice = snapshot?.input.price ?? finite(item.unitPrice);
      const converted = snapshot ? { amount: snapshot.canonicalQuantity, unit: snapshot.canonicalUnit } : { amount: sourceQuantity, unit: physicalUnit(sourceUnit) ?? "unknown" };
      // Legacy packaging is only comparable when the existing conversion has
      // an explicit compatible result; never add boxes/bottles as a raw count.
      const amount = unit && converted.unit !== "unknown" && sourceQuantity != null && sourceQuantity > 0
        ? convertStockQuantity(converted.amount, converted.unit, unit) : null;
      const money = resolvePurchaseLineAccountingCost({ document, line: item, accountingCurrency: input.currency });
      current.spend = current.spend == null || !money.known ? null : round(current.spend + money.amount, 2);
      current.quantity = current.quantity == null || amount == null ? null : round(current.quantity + amount);
      current.sourcePurchases.push({ documentId: document.id, lineId: item.id, effectiveDate: document.date, sourceQuantity, sourceUnit, sourceUnitPrice,
        sourceCurrency: document.originalCurrency ?? document.currency, canonicalQuantity: amount, canonicalUnit: unit,
        conversionStatus: snapshot ? "CAPTURED" : amount == null ? "UNKNOWN" : "LEGACY", accountingLineTotal: money.known ? money.amount : null });
      products.set(group, current);
    }
  }
  return [...products.values()].map(product => {
    product.sourcePurchases.sort((a, b) => String(a.effectiveDate).localeCompare(String(b.effectiveDate)) || String(a.documentId).localeCompare(String(b.documentId)) || String(a.lineId).localeCompare(String(b.lineId)));
    const basis = product.productKey && product.unit ? resolveCostBasis({ venueId: input.venueId, warehouseId: product.warehouseId,
      nomenclatureItem: product.productKey, baseUnit: product.unit, asOf: input.asOf, receipts, accountingCurrency: input.currency }) : null;
    const sourceDocument = basis?.sourceDocumentId ? documents.find(doc => doc.id === basis.sourceDocumentId) : null;
    const sourceLine = sourceDocument ? scopedBusinessRows(rows(sourceDocument.items), scope).find(line => line.id === basis?.sourceLineId) : null;
    const selectedSnapshot = validatePurchaseConversionSnapshot(sourceLine?.purchaseConversion);
    return { ...product, sourcePurchases: product.sourcePurchases.slice(0, 20), sourcePurchasesComplete: product.sourcePurchases.length <= 20,
      quantityStatus: product.quantity == null ? "UNKNOWN" : "KNOWN", spendStatus: product.spend == null ? "UNKNOWN" : "KNOWN",
      lastPrice: basis?.value ?? null, lastPriceUnit: product.unit, lastPriceCurrency: input.currency,
      lastPriceBasis: basis, lastPriceMeaning: "NORMALIZED_BASE_UNIT_LAST_PURCHASE_PRICE",
      sourceUnitPrice: selectedSnapshot?.input.price ?? finite(sourceLine?.unitPrice), sourceUnit: selectedSnapshot?.input.unit ?? sourceLine?.unit ?? null,
      sourceCurrency: sourceDocument?.originalCurrency ?? sourceDocument?.currency ?? null,
      evidenceStatus: !product.productKey || product.quantity == null || product.spend == null || !basis?.known || !sourceLine || !selectedSnapshot || product.sourcePurchases.some(line => line.conversionStatus !== "CAPTURED") ? "PARTIAL" : "COMPLETE" };
  }).sort((a, b) => (b.spend ?? -1) - (a.spend ?? -1) || String(a.productKey).localeCompare(String(b.productKey))).slice(0, 12);
}
