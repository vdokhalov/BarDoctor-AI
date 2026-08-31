type JsonRecord = Record<string, unknown>;

export type NomenclatureSelectorItem = {
  id: string;
  key: string;
  name: string;
  unit: string;
  packageSize: string;
  category: string;
  kind: "stock" | "service";
  supplierName: string;
  archived: boolean;
  matchType: "exact" | "prefix" | "contains" | "fuzzy" | "all";
  matchScore: number;
};

export type NomenclatureSelectorPage = {
  items: NomenclatureSelectorItem[];
  nextCursor: string | null;
  total: number;
  query: string;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 400): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sameVenue(item: JsonRecord, venueId?: number): boolean {
  if (!venueId || item.venueId == null || item.venueId === "") return true;
  return number(item.venueId) === venueId;
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterate(value: string): string {
  return [...value].map((letter) => CYRILLIC_TO_LATIN[letter] ?? letter).join("");
}

export function normalizeNomenclatureSearch(value: unknown): string {
  return text(value, "", 160)
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/(\d)[,.](\d)/g, "$1.$2")
    .replace(/[^a-zа-я0-9.]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchable(item: JsonRecord, supplierEvidence: string[] = []): string {
  const packages = array(item.packaging ?? item.packages)
    .map((value) => {
      const packaging = record(value);
      return [packaging.name, packaging.label, packaging.quantity, packaging.amount, packaging.unit].join(" ");
    });
  const base = normalizeNomenclatureSearch([
    item.name,
    item.productName,
    item.canonicalName,
    item.aliases && array(item.aliases).join(" "),
    item.packageSize,
    item.displayPackageSize,
    item.purchasePackageSize,
    item.unit,
    item.baseUnit,
    item.category,
    item.sectionName,
    item.categoryName,
    item.subcategoryName,
    ...supplierEvidence,
    ...packages,
  ].join(" "));
  const latin = transliterate(base).replace(/c(?=[aou])/g, "k").replace(/q/g, "k");
  return `${base} ${latin}`;
}

function eligible(item: JsonRecord, venueId?: number, includeArchived = false): boolean {
  if (!sameVenue(item, venueId)) return false;
  if (item.deleted === true || item.isDeleted === true) return false;
  if (!includeArchived && (item.active === false || text(item.status).toLocaleLowerCase("en-US") === "archived")) return false;
  if (text(item.status).toLocaleLowerCase("en-US") === "deleted") return false;
  return !["service", "non_stock", "non-stock"].includes(
    text(item.inventoryType ?? item.productType ?? item.type).toLocaleLowerCase("en-US"),
  );
}

function keyOf(item: JsonRecord): string {
  return text(item.productKey ?? item.key ?? item.nomenclatureItemId ?? item.id, "", 320);
}

function selectorItem(
  item: JsonRecord,
  matchType: NomenclatureSelectorItem["matchType"] = "all",
  matchScore = 0,
): NomenclatureSelectorItem {
  const key = keyOf(item);
  return {
    id: text(item.id ?? item.nomenclatureItemId, key, 160),
    key,
    name: text(item.name ?? item.productName ?? item.canonicalName, "Без названия", 300),
    unit: text(item.baseUnit ?? item.unit, "unknown", 40),
    packageSize: text(item.packageSize ?? item.displayPackageSize ?? item.purchasePackageSize, "", 120),
    category: text(item.category ?? item.subcategory, "", 160),
    kind: text(item.kind, "stock", 20) === "service" ? "service" : "stock",
    supplierName: text(item.supplierSummary ?? item.supplierName, "", 240),
    archived: item.active === false || text(item.status).toLocaleLowerCase("en-US") === "archived",
    matchType,
    matchScore,
  };
}

function levenshtein(left: string, right: string): number {
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function rankMatch(query: string, name: string, document: string): {
  type: NomenclatureSelectorItem["matchType"];
  score: number;
} | null {
  if (!query) return { type: "all", score: 0 };
  const normalizedName = normalizeNomenclatureSearch(name);
  if (normalizedName === query) return { type: "exact", score: 100 };
  if (normalizedName.startsWith(query)) return { type: "prefix", score: 94 };
  if (document.includes(query)) return { type: "contains", score: 86 };
  const distance = levenshtein(query, normalizedName);
  const similarity = 1 - distance / Math.max(query.length, normalizedName.length, 1);
  return similarity >= 0.58 ? { type: "fuzzy", score: Math.round(similarity * 100) } : null;
}

function cursorOffset(cursor: unknown): number {
  const match = /^v1:(\d+)$/.exec(text(cursor, "", 40));
  return match ? Number(match[1]) : 0;
}

export function queryCanonicalNomenclature(input: {
  assortment: unknown;
  venueId?: number;
  query?: unknown;
  cursor?: unknown;
  limit?: unknown;
  includeArchived?: boolean;
}): NomenclatureSelectorPage {
  const root = record(input.assortment);
  const query = normalizeNomenclatureSearch(input.query);
  const tokens = query.split(" ").filter(Boolean).map((token) => [
    token,
    transliterate(token).replace(/c(?=[aou])/g, "k").replace(/q/g, "k"),
  ]);
  const byKey = new Map<string, JsonRecord>();
  const supplierEvidence = new Map<string, string[]>();
  for (const value of array(root.supplierProductMappings).map(record)) {
    if (!sameVenue(value, input.venueId) || text(value.status).toLocaleLowerCase("en-US") === "orphan") continue;
    const key = text(value.canonicalProductKey ?? value.purchaseProductKey, "", 320);
    if (!key) continue;
    supplierEvidence.set(key, [
      ...(supplierEvidence.get(key) ?? []),
      text(value.sourceName, "", 240),
      text(value.supplierName, "", 200),
      text(value.supplierSku, "", 120),
      text(value.barcode, "", 120),
    ].filter(Boolean));
  }
  for (const value of array(root.nomenclature).map(record)) {
    const key = keyOf(value);
    if (key && eligible(value, input.venueId, input.includeArchived) && !byKey.has(key)) byKey.set(key, value);
  }
  const matches = [...byKey.values()]
    .flatMap((item) => {
      const key = keyOf(item);
      const document = searchable(item, supplierEvidence.get(key));
      const tokenMatch = !tokens.length || tokens.every((forms) => forms.some((form) => document.includes(form)));
      const ranked = rankMatch(query, text(item.name ?? item.productName ?? item.canonicalName), document)
        ?? (tokenMatch ? { type: "contains" as const, score: 82 } : null);
      return ranked ? [selectorItem(item, ranked.type, ranked.score)] : [];
    })
    .sort((left, right) => right.matchScore - left.matchScore
      || Number(left.archived) - Number(right.archived)
      || left.name.localeCompare(right.name, "ru-RU", { sensitivity: "base", numeric: true })
      || left.key.localeCompare(right.key));
  const limit = Math.min(100, Math.max(10, Math.trunc(number(input.limit) ?? 50)));
  const offset = Math.min(cursorOffset(input.cursor), matches.length);
  const items = matches.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  return {
    items,
    nextCursor: nextOffset < matches.length ? `v1:${nextOffset}` : null,
    total: matches.length,
    query,
  };
}
