export type SupplierAlternativeRecord = Record<string, unknown>;

export type SupplierPositionGroup = {
  key: string;
  internalPosition: string;
  offerCount: number;
  supplierCount: number;
  offers: SupplierAlternativeRecord[];
  bestOfferId: string | null;
  bestAmount: number | null;
  bestCurrency: string | null;
  bestPackageLabel: string | null;
  mixedPackages: boolean;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normal(value: unknown): string {
  return text(value).toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/gi, " ").trim();
}

export function canonicalSupplierOfferUrl(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`.toLocaleLowerCase("en");
  } catch {
    return raw.replace(/[?#].*$/, "").replace(/\/$/, "").toLocaleLowerCase("en");
  }
}

export function supplierOfferIdentity(offer: SupplierAlternativeRecord): string {
  const urls = Array.isArray(offer.sourceUrls) ? offer.sourceUrls : [];
  return [normal(offer.matchedTo), normal(offer.supplierName), normal(offer.product), canonicalSupplierOfferUrl(urls[0])].join("|");
}

function decisionRank(value: unknown): number {
  return value === "confirmed" ? 0 : value === "checking" ? 1 : value === "new" ? 2 : 3;
}

export function deduplicateSupplierOffers(offers: SupplierAlternativeRecord[]): SupplierAlternativeRecord[] {
  const selected = new Map<string, SupplierAlternativeRecord>();
  for (const offer of offers) {
    const key = supplierOfferIdentity(offer);
    if (!key.replace(/\|/g, "")) continue;
    const current = selected.get(key);
    if (!current) {
      selected.set(key, offer);
      continue;
    }
    if (decisionRank(offer.decision) < decisionRank(current.decision)) {
      selected.set(key, {
        ...current,
        id: offer.id || current.id,
        decision: offer.decision,
        sourceUrls: [...new Set([
          ...(Array.isArray(current.sourceUrls) ? current.sourceUrls : []),
          ...(Array.isArray(offer.sourceUrls) ? offer.sourceUrls : []),
        ])],
      });
    }
  }
  return [...selected.values()];
}

type PackageIdentity = { key: string | null; label: string };

export function supplierPackageIdentity(offer: SupplierAlternativeRecord): PackageIdentity {
  const packageSize = text(offer.packageSize);
  const unit = text(offer.unit);
  const raw = `${packageSize} ${unit}`.toLocaleLowerCase("ru").replace(",", ".");
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(ml|мл|l|л|kg|кг|g|гр|г)\b/i);
  if (!match) return { key: null, label: [packageSize, unit].filter(Boolean).join(" · ") || "Фасовка не указана" };
  const amount = Number(match[1]);
  const sourceUnit = match[2].toLocaleLowerCase("ru");
  const isVolume = ["ml", "мл", "l", "л"].includes(sourceUnit);
  const baseAmount = isVolume
    ? amount * (["l", "л"].includes(sourceUnit) ? 1_000 : 1)
    : amount * (["kg", "кг"].includes(sourceUnit) ? 1_000 : 1);
  const baseUnit = isVolume ? "ml" : "g";
  return {
    key: `${Math.round(baseAmount * 1000) / 1000}${baseUnit}`,
    label: packageSize || `${amount} ${sourceUnit}`,
  };
}

function comparableKey(offer: SupplierAlternativeRecord): string | null {
  const currency = text(offer.currency).toUpperCase();
  const packageIdentity = supplierPackageIdentity(offer).key;
  return currency && packageIdentity ? `${currency}|${packageIdentity}` : null;
}

export function sortSupplierOffers(offers: SupplierAlternativeRecord[], referenceKey?: string | null): SupplierAlternativeRecord[] {
  return [...offers].sort((left, right) => {
    const status = decisionRank(left.decision) - decisionRank(right.decision);
    if (status) return status;
    const leftComparable = referenceKey && comparableKey(left) === referenceKey ? 0 : 1;
    const rightComparable = referenceKey && comparableKey(right) === referenceKey ? 0 : 1;
    if (leftComparable !== rightComparable) return leftComparable - rightComparable;
    if (comparableKey(left) && comparableKey(left) === comparableKey(right)) {
      return (number(left.candidatePrice) ?? Number.POSITIVE_INFINITY) - (number(right.candidatePrice) ?? Number.POSITIVE_INFINITY);
    }
    return text(right.verifiedAt).localeCompare(text(left.verifiedAt));
  });
}

export function groupSupplierOffers(offers: SupplierAlternativeRecord[]): SupplierPositionGroup[] {
  const deduplicated = deduplicateSupplierOffers(offers).filter(offer => offer.decision !== "dismissed");
  const grouped = new Map<string, SupplierAlternativeRecord[]>();
  for (const offer of deduplicated) {
    const internalPosition = text(offer.matchedTo);
    const key = normal(internalPosition);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), offer]);
  }
  return [...grouped.entries()].map(([key, groupOffers]) => {
    const packageBuckets = new Map<string, SupplierAlternativeRecord[]>();
    for (const offer of groupOffers) {
      const comparison = comparableKey(offer);
      if (comparison) packageBuckets.set(comparison, [...(packageBuckets.get(comparison) ?? []), offer]);
    }
    const rankedBuckets = [...packageBuckets.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const reference = rankedBuckets[0]?.[0] ?? null;
    const comparableOffers = reference ? rankedBuckets[0][1] : [];
    const best = comparableOffers.reduce<SupplierAlternativeRecord | null>((current, offer) => {
      const amount = number(offer.candidatePrice);
      if (amount === null) return current;
      if (!current || amount < (number(current.candidatePrice) ?? Number.POSITIVE_INFINITY)) return offer;
      return current;
    }, null);
    return {
      key,
      internalPosition: text(groupOffers[0]?.matchedTo),
      offerCount: groupOffers.length,
      supplierCount: new Set(groupOffers.map(offer => normal(offer.supplierName)).filter(Boolean)).size,
      offers: sortSupplierOffers(groupOffers, reference),
      bestOfferId: best ? text(best.id) : null,
      bestAmount: best ? number(best.candidatePrice) : null,
      bestCurrency: best ? text(best.currency).toUpperCase() : null,
      bestPackageLabel: best ? supplierPackageIdentity(best).label : null,
      mixedPackages: packageBuckets.size > 1 || groupOffers.some(offer => !comparableKey(offer)),
    };
  }).sort((a, b) => a.internalPosition.localeCompare(b.internalPosition, "ru"));
}
