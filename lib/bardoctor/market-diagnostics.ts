// Metadata only. Never retain provider messages, request bodies or credentials.
const providerFailures = new WeakMap<object, { reason: 'PROVIDER_HTTP' | 'PROVIDER_NETWORK' | 'PROVIDER_TIMEOUT' | 'PROVIDER_EMPTY'; providerStatus?: number }>();
export type MarketStage = 'request' | 'context' | 'provider' | 'format' | 'evidence' | 'save' | 'profile';
export function markWebSearchFailure<T extends Error>(error: T, reason: 'PROVIDER_HTTP' | 'PROVIDER_NETWORK' | 'PROVIDER_TIMEOUT' | 'PROVIDER_EMPTY', providerStatus?: number): T {
  providerFailures.set(error, { reason, ...(Number.isInteger(providerStatus) && providerStatus! >= 100 && providerStatus! <= 599 ? { providerStatus } : {}) });
  return error;
}
export function marketFailureDiagnostic(error: unknown, stage: MarketStage, status: number, requestId: string) {
  const metadata = error && typeof error === 'object' ? providerFailures.get(error) : undefined;
  const suppliedCode = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const code = suppliedCode === 'AI_RESPONSE_FORMAT' ? 'AI_RESPONSE_FORMAT' : suppliedCode === 'AI_SERVICE_ERROR' ? 'AI_SERVICE_ERROR' : status === 409 ? 'STORE_WRITE_CONFLICT' : 'UNEXPECTED_ERROR';
  return { event: 'market.failure', requestId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId) ? requestId : 'unavailable',
    stage: (['request','context','provider','format','evidence','save','profile'] as string[]).includes(stage) ? stage : 'request',
    status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : 502,
    code, reason: metadata?.reason ?? (code === 'AI_RESPONSE_FORMAT' ? 'INVALID_JSON' : 'UNCLASSIFIED'),
    ...(metadata?.providerStatus ? { providerStatus: metadata.providerStatus } : {}) };
}
