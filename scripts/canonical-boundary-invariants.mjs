// Exact supported response flows. Do not accept arbitrary code between authorization
// denial and failure handling: the empty-snapshot branch is successful HTTP only.
const denied = 'if(r.status===403||r.status===401)bdRestrictAnalysisContextPhase3a5(t);';
const failed = 'if(!r.ok||!a?.success)throw new Error(a?.error||"Business Health unavailable");';
const committed = 'bdRestrictedAnalysisContextsPhase3a5.delete(t);bdBusinessHealthCommitEnvelopeV284(a,!0)';
const empty = 'if(r.ok&&a?.success===false&&a.code==="HEALTH_NO_SNAPSHOT"){bdClosedHealthEmptyContexts.add(t);for(const[key,entry]of bdBusinessHealthSharedStoreV284.entries)if(entry.context===t)bdBusinessHealthSharedStoreV284.entries.delete(key);bdBusinessHealthSharedStoreV284.current={snapshot:null,diagnosis:null};for(const listener of bdBusinessHealthSharedStoreV284.listeners)listener();bdLiveBusinessHealthContextV335=t;return a}';
export function assertCanonicalBoundaryInvariants(source) {
  const supported = [denied + failed + committed, denied + empty + failed + 'bdClosedHealthEmptyContexts.delete(t);' + committed];
  if (!supported.some(flow => source.includes(flow))) throw new Error('Phase3a5 client permission invariant missing: response flow');
  for (const invariant of ['bdRestrictAnalysisContextPhase3a5();E(null)', 'function WS(){if(bdAnalysisContextRestrictedPhase3a5())return null;']) {
    if (!source.includes(invariant)) throw new Error('Phase3a5 client permission invariant missing');
  }
}
