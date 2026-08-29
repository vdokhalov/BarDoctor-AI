import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { defaultNomenclatureStructure } from "../../../../lib/bardoctor/nomenclature";
import { queryCanonicalNomenclature, normalizeNomenclatureSearch } from "../../../../lib/bardoctor/nomenclature-selector";
import { normalizeCanonicalTaxonomy } from "../../../../lib/bardoctor/nomenclature-taxonomy";
import { PURCHASE_STORE_KEY } from "../../../../lib/bardoctor/purchases";
import { accountingCurrencyFromRestaurantJson } from "../../../../lib/bardoctor/currency";

type JsonRecord = Record<string, unknown>;
type StoreRow = { store_key: string; data_json: string };

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 240): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function numeric(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function json(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function sourceScore(query: string, name: string): number {
  const candidate = normalizeNomenclatureSearch(name);
  if (!query) return 1;
  if (candidate === query) return 100;
  if (candidate.startsWith(query)) return 92;
  if (candidate.includes(query) || query.includes(candidate)) return 82;
  const queryTokens = new Set(query.split(" ").filter(Boolean));
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
  const overlap = [...queryTokens].filter((token) => candidateTokens.has(token)).length;
  return overlap ? Math.round(70 * overlap / Math.max(queryTokens.size, candidateTokens.size)) : 0;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.view")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Номенклатура недоступна" }, { status: 403 });
  }
  const database = getD1();
  const storesResult = await database.prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?)
  `).bind(account.id, ASSORTMENT_STORE_KEY, PURCHASE_STORE_KEY).all<StoreRow>();
  const stores = new Map((storesResult.results ?? []).map((row) => [row.store_key, row.data_json]));
  const assortment = record(json(stores.get(ASSORTMENT_STORE_KEY), {}));
  const documents = array(json(stores.get(PURCHASE_STORE_KEY), []));
  const url = new URL(request.url);
  const query = normalizeNomenclatureSearch(url.searchParams.get("q"));
  const accountingCurrency = accountingCurrencyFromRestaurantJson(account.restaurantJson) ?? "RUB";
  const matches = queryCanonicalNomenclature({
    assortment,
    venueId: account.venueId,
    query,
    limit: 8,
    includeArchived: true,
  }).items;
  const sources = documents.map(record)
    .filter((document) => !document.venueId || Number(document.venueId) === account.venueId)
    .flatMap((document) => array(document.items).map(record).map((line) => ({
      id: text(line.id, crypto.randomUUID(), 120),
      name: text(line.rawName ?? line.name, "", 240),
      supplierName: text(document.supplierName, "", 200),
      supplierId: text(document.supplierId, "", 120),
      packageSize: text(line.packageSize ?? line.unit, "", 120),
      unit: text(line.unit, "pcs", 40),
      originalPrice: numeric(line.unitPrice ?? line.lineTotal),
      originalCurrency: text(document.currency, accountingCurrency, 12).toUpperCase(),
      price: (() => {
        const original = numeric(line.unitPrice ?? line.lineTotal);
        const documentCurrency = text(document.currency, accountingCurrency, 12).toUpperCase();
        if (original === null) return null;
        if (documentCurrency === accountingCurrency) return original;
        const fxRate = numeric(document.fxRate);
        if (fxRate !== null && fxRate > 0) return Math.round(original * fxRate * 10000) / 10000;
        const accountingAmount = numeric(document.accountingAmount);
        const total = numeric(document.total);
        return accountingAmount !== null && total !== null && total > 0
          ? Math.round(original * accountingAmount / total * 10000) / 10000
          : null;
      })(),
      currency: accountingCurrency,
      date: text(document.date, "", 20),
      purchaseProductKey: text(line.purchaseProductKey ?? line.canonicalProductKey, "", 300),
      score: sourceScore(query, text(line.rawName ?? line.name, "", 240)),
    })))
    .filter((source) => source.name && source.score >= (query ? 35 : 1))
    .sort((left, right) => right.score - left.score || right.date.localeCompare(left.date));
  const uniqueSources = [...new Map(sources.map((source) => [
    `${normalizeNomenclatureSearch(source.name)}|${normalizeNomenclatureSearch(source.packageSize)}|${source.supplierId}`,
    source,
  ])).values()].slice(0, 8);
  const mappings = array(assortment.supplierProductMappings).map(record);
  const purchaseSources = uniqueSources.map((source) => {
    const mapping = mappings.find((candidate) =>
      text(candidate.canonicalProductKey, "", 300) === source.purchaseProductKey
      || (source.supplierId && text(candidate.supplierId, "", 120) === source.supplierId
        && normalizeNomenclatureSearch(candidate.sourceName) === normalizeNomenclatureSearch(source.name))
    );
    return {
      ...source,
      canonicalProductKey: text(mapping?.canonicalProductKey ?? source.purchaseProductKey, "", 300) || null,
      mapped: Boolean(mapping?.canonicalProductKey ?? source.purchaseProductKey),
    };
  });
  return Response.json({
    ok: true,
    venueId: account.venueId,
    query,
    accountingCurrency,
    matches,
    purchaseSources,
    taxonomy: normalizeCanonicalTaxonomy(assortment.nomenclatureStructure, defaultNomenclatureStructure()),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
