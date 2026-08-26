type JsonRecord = Record<string, unknown>;

export type NomenclatureSelectorItem = {
  id: string;
  key: string;
  name: string;
  unit: string;
  packageSize: string;
  category: string;
  supplierName: string;
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

function searchable(item: JsonRecord): string {
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
    ...packages,
  ].join(" "));
  const latin = transliterate(base).replace(/c(?=[aou])/g, "k").replace(/q/g, "k");
  return `${base} ${latin}`;
}

function eligible(item: JsonRecord, venueId?: number): boolean {
  if (!sameVenue(item, venueId)) return false;
  if (item.active === false || item.deleted === true || item.isDeleted === true) return false;
  if (["archived", "deleted"].includes(text(item.status).toLocaleLowerCase("en-US"))) return false;
  return !["service", "non_stock", "non-stock"].includes(
    text(item.inventoryType ?? item.productType ?? item.type).toLocaleLowerCase("en-US"),
  );
}

function keyOf(item: JsonRecord): string {
  return text(item.productKey ?? item.key ?? item.nomenclatureItemId ?? item.id, "", 320);
}

function selectorItem(item: JsonRecord): NomenclatureSelectorItem {
  const key = keyOf(item);
  return {
    id: text(item.id ?? item.nomenclatureItemId, key, 160),
    key,
    name: text(item.name ?? item.productName ?? item.canonicalName, "Без названия", 300),
    unit: text(item.baseUnit ?? item.unit, "unknown", 40),
    packageSize: text(item.packageSize ?? item.displayPackageSize ?? item.purchasePackageSize, "", 120),
    category: text(item.category ?? item.subcategory, "", 160),
    supplierName: text(item.supplierSummary ?? item.supplierName, "", 240),
  };
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
}): NomenclatureSelectorPage {
  const root = record(input.assortment);
  const query = normalizeNomenclatureSearch(input.query);
  const tokens = query.split(" ").filter(Boolean).map((token) => [
    token,
    transliterate(token).replace(/c(?=[aou])/g, "k").replace(/q/g, "k"),
  ]);
  const byKey = new Map<string, JsonRecord>();
  for (const value of array(root.nomenclature).map(record)) {
    const key = keyOf(value);
    if (key && eligible(value, input.venueId) && !byKey.has(key)) byKey.set(key, value);
  }
  const matches = [...byKey.values()]
    .filter((item) => {
      if (!tokens.length) return true;
      const document = searchable(item);
      return tokens.every((forms) => forms.some((form) => document.includes(form)));
    })
    .map(selectorItem)
    .sort((left, right) => left.name.localeCompare(right.name, "ru-RU", { sensitivity: "base", numeric: true })
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
