export type OpportunitySourceReference = {
  url: string;
};

function canonicalSourceUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`;
  } catch {
    return null;
  }
}

export function resolveOpportunitySourceUrls(
  value: unknown,
  sources: OpportunitySourceReference[],
  limit = 5,
): string[] {
  if (!Array.isArray(value)) return [];
  const exact = new Set(sources.map((source) => source.url));
  const canonical = new Map(
    sources.flatMap((source) => {
      const key = canonicalSourceUrl(source.url);
      return key ? [[key, source.url] as const] : [];
    }),
  );
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const candidate = item.trim();
    const key = canonicalSourceUrl(candidate);
    const resolved = exact.has(candidate)
      ? candidate
      : key
        ? canonical.get(key)
        : undefined;
    if (!resolved || result.includes(resolved)) continue;
    result.push(resolved);
    if (result.length >= limit) break;
  }
  return result;
}
