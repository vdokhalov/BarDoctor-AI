import type { OpenAIWebSource } from './openai';
type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : null;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
function source(value: unknown): (OpenAIWebSource & { titled: boolean }) | null {
  const outer = row(value), data = row(outer?.url_citation) ?? outer;
  if (!data || typeof data.url !== 'string') return null;
  const url = data.url.trim();
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    const titled = typeof data.title === 'string' && Boolean(data.title.trim());
    return { url, title: titled ? String(data.title).trim().slice(0, 180) : parsed.hostname.replace(/^www\./, ''), titled };
  } catch { return null; }
}
/** Prioritize actual answer citations over background search results. Metadata
 * remains unverified: the existing geography/entity filters still run afterwards. */
export function responseWebSources(payload: { output?: unknown }): OpenAIWebSource[] {
  const output = list(payload.output).map(row).filter((item): item is Row => Boolean(item));
  const citations = output.flatMap(item => list(item.content).flatMap(content => list(row(content)?.annotations)));
  const originalOrder = output.flatMap(item => [...list(row(item.action)?.sources), ...list(item.content).flatMap(content => list(row(content)?.annotations))]);
  const byUrl = new Map<string, OpenAIWebSource & { titled: boolean }>();
  for (const value of originalOrder) {
    const next = source(value);
    if (!next) continue;
    const previous = byUrl.get(next.url);
    if (!previous || (!previous.titled && next.titled)) byUrl.set(next.url, next);
  }
  const order = new Set([...citations.map(source).filter((item): item is NonNullable<ReturnType<typeof source>> => Boolean(item)).map(item => item.url), ...byUrl.keys()]);
  return [...order].slice(0, 30).map(url => { const item = byUrl.get(url)!; return { url: item.url, title: item.title }; });
}
