export type MarketRecord = Record<string, unknown>;

export const MARKET_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1_000;

function record(value: unknown): MarketRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as MarketRecord
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function normalized(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/\s+/g, " ").trim();
}

export function marketAnalysisIsStale(
  analysis: MarketRecord | null,
  now = Date.now(),
): boolean {
  if (analysis?.locationChangePending === true) return true;
  const generatedAt = text(analysis?.generatedAt);
  const generatedTime = generatedAt ? new Date(generatedAt).getTime() : Number.NaN;
  return !analysis || !Number.isFinite(generatedTime) || now - generatedTime > MARKET_REFRESH_INTERVAL_MS;
}

export function shouldRunAutomaticMarketRefresh(input: {
  analysis: MarketRecord | null;
  knownGeneratedAt: string;
  now?: number;
}): boolean {
  if (!input.analysis) return true;
  const generatedAt = text(input.analysis.generatedAt);
  if (generatedAt && generatedAt !== input.knownGeneratedAt) return false;
  return marketAnalysisIsStale(input.analysis, input.now);
}

export function marketLocationSignature(input: {
  address?: unknown;
  city?: unknown;
  region?: unknown;
  country?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  focus?: unknown;
}): string {
  const coordinate = (value: unknown) => {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number.toFixed(5) : "";
  };
  return [
    text(input.address), text(input.city), text(input.region), text(input.country),
    coordinate(input.latitude), coordinate(input.longitude), text(input.focus),
  ].map(normalized).join("|");
}

export function deriveMarketChanges(input: {
  previous: MarketRecord | null;
  nextCompetitors: unknown[];
  detectedAt: string;
}): MarketRecord[] {
  const previousByName = new Map<string, MarketRecord>();
  for (const value of Array.isArray(input.previous?.competitors) ? input.previous.competitors : []) {
    const item = record(value);
    const name = normalized(text(item?.name));
    if (item && name) previousByName.set(name, item);
  }
  const existing = (Array.isArray(input.previous?.detectedChanges) ? input.previous.detectedChanges : [])
    .map(record)
    .filter((item): item is MarketRecord => Boolean(item && text(item.id)));
  const additions: MarketRecord[] = [];
  for (const value of input.nextCompetitors) {
    const item = record(value);
    const name = text(item?.name);
    const previous = previousByName.get(normalized(name));
    if (!item || !name || !previous) continue;
    const previousSignals = new Set([
      ...list(previous.strengths),
      ...list(previous.gaps),
    ].map(normalized));
    const candidates = [...list(item.strengths), ...list(item.gaps)]
      .filter((signal) => !previousSignals.has(normalized(signal)));
    for (const summary of candidates.slice(0, 2)) {
      const id = `${normalized(name)}|${normalized(summary)}`.slice(0, 420);
      additions.push({
        id,
        competitorKey: text(item.key),
        competitorName: name,
        summary,
        detectedAt: input.detectedAt,
        sourceUrls: Array.isArray(item.sourceUrls) ? item.sourceUrls : [],
        status: "attention",
      });
    }
    const previousRating = text(previous.rating);
    const nextRating = text(item.rating);
    if (previousRating && nextRating && previousRating !== nextRating) {
      additions.push({
        id: `${normalized(name)}|rating|${nextRating}`.slice(0, 420),
        competitorKey: text(item.key),
        competitorName: name,
        summary: `Рейтинг изменился с ${previousRating} до ${nextRating}`,
        detectedAt: input.detectedAt,
        sourceUrls: Array.isArray(item.sourceUrls) ? item.sourceUrls : [],
        status: "attention",
      });
    }
  }
  const merged = new Map<string, MarketRecord>();
  for (const item of [...additions, ...existing]) {
    const id = text(item.id);
    if (id && !merged.has(id)) merged.set(id, item);
  }
  return [...merged.values()].slice(0, 100);
}
