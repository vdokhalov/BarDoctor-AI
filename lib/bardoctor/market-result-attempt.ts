type Row = Record<string, unknown>;
const rows = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
export function marketResultAttempt(raw: unknown, providerSources: unknown[], filtered: Row, result: Row, completedAt: string) {
  const input = raw && typeof raw === 'object' ? raw as Row : {};
  const modelCandidates = rows(input.competitors).filter(v => v && typeof v === 'object' && typeof (v as Row).name === 'string' && String((v as Row).name).trim()).length;
  const modelReferences = ['location','economy','audience','opportunities','risks','pricing','marketing','actions'].reduce((count, key) => {
    const values = Array.isArray(input[key]) ? input[key] as unknown[] : [input[key]];
    return count + values.reduce<number>((total, value) => total + (value && typeof value === 'object' ? rows((value as Row).sourceUrls).filter(url => typeof url === 'string' && url.trim()).length : 0), 0);
  }, 0);
  const filteredCandidates = rows(filtered.competitors).length;
  const candidates = rows(result.competitors).length;
  const sources = rows(result.sources).length;
  const reason = candidates || sources ? 'RESULT' : filteredCandidates ? 'USER_EXCLUDED' : modelCandidates || modelReferences ? 'FILTER_EMPTY' : 'MODEL_EMPTY';
  return { completedAt, reason, counts: { modelCandidates, modelReferences, providerSources: providerSources.length, filteredCandidates, candidates, sources } };
}
export function retainMarketResult(previous: Row | null, result: Row, attempt: ReturnType<typeof marketResultAttempt>): Row {
  return attempt.reason === 'RESULT' ? { ...result, lastAttempt: attempt } : { ...(previous ?? {}), lastAttempt: attempt };
}
