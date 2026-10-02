import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
let source = readFileSync(file, 'utf8');
const marker = 'const bdCanonicalBoundaryClientPhase3a5=';
if (process.argv.includes('--restore')) {
  if (source.includes(marker)) {
    const start = source.indexOf(marker), end = source.indexOf('// end canonical boundary Phase3a5', start);
    if (end < start) throw new Error('Phase3a5 restoration boundary missing');
    source = source.slice(0, start) + source.slice(end + '// end canonical boundary Phase3a5'.length).replace(/^\n/, '');
    const restore = (after, before) => { if (!source.includes(after)) throw new Error('Phase3a5 restoration invariant missing'); source = source.replace(after, before); };
    restore('function WS(){if(bdAnalysisContextRestrictedPhase3a5())return null;try{', 'function WS(){try{');
    restore('function bdBusinessHealthGetSharedV284(){return bdAnalysisContextRestrictedPhase3a5()?bdRestrictedAnalysisEmptyPhase3a5:bdBusinessHealthSharedStoreV284.current}', 'function bdBusinessHealthGetSharedV284(){return bdBusinessHealthSharedStoreV284.current}');
    restore('function bdBusinessHealthHydrateSharedV284(t=!1){if(bdAnalysisContextRestrictedPhase3a5())return bdRestrictedAnalysisEmptyPhase3a5;', 'function bdBusinessHealthHydrateSharedV284(t=!1){');
    restore('function bdBusinessHealthCommitEnvelopeV284(e,t=!0){if(bdAnalysisContextRestrictedPhase3a5())return bdRestrictedAnalysisEmptyPhase3a5;', 'function bdBusinessHealthCommitEnvelopeV284(e,t=!0){');
    restore('if(r.status===403||r.status===401)bdRestrictAnalysisContextPhase3a5(t);if(!r.ok||!a?.success)throw new Error(a?.error||"Business Health unavailable");bdRestrictedAnalysisContextsPhase3a5.delete(t);bdBusinessHealthCommitEnvelopeV284(a,!0)', 'if(!r.ok||!a?.success)throw new Error(a?.error||"Business Health unavailable");bdBusinessHealthCommitEnvelopeV284(a,!0)');
    restore('q=await L.json().catch(()=>null);if(L.status===403||L.status===401){bdRestrictAnalysisContextPhase3a5();E(null)}if(L.status>=500', 'q=await L.json().catch(()=>null);if(L.status>=500');
    writeFileSync(file, source);
  }
  process.exit(0);
}
if (!source.includes(marker)) {
  const helpers = `const bdCanonicalBoundaryClientPhase3a5="source-permissions",bdRestrictedAnalysisContextsPhase3a5=new Set,bdRestrictedAnalysisEmptyPhase3a5={snapshot:null,diagnosis:null};
function bdAnalysisContextRestrictedPhase3a5(){return bdRestrictedAnalysisContextsPhase3a5.has(bdBusinessHealthAccountContextV284())}
function bdRestrictAnalysisContextPhase3a5(context=bdBusinessHealthAccountContextV284()){bdRestrictedAnalysisContextsPhase3a5.add(context);for(const[key,entry]of bdBusinessHealthSharedStoreV284.entries)if(entry.context===context)bdBusinessHealthSharedStoreV284.entries.delete(key);if(bdBusinessHealthAccountContextV284()!==context)return;for(let version=3;version<=9;version++)localStorage.removeItem(Sz("bd_ai_diagnosis_v"+version));bdBusinessHealthSharedStoreV284.current=bdRestrictedAnalysisEmptyPhase3a5;bdLiveBusinessHealthContextV335="";for(const listener of bdBusinessHealthSharedStoreV284.listeners)listener()}
// end canonical boundary Phase3a5
`;
  function replace(before, after) {
    if (!source.includes(before)) throw new Error('Phase3a5 client boundary anchor missing: ' + before.slice(0, 100));
    source = source.replace(before, after);
  }
  replace('function WS(){try{', helpers + 'function WS(){if(bdAnalysisContextRestrictedPhase3a5())return null;try{');
  replace('function bdBusinessHealthGetSharedV284(){return bdBusinessHealthSharedStoreV284.current}', 'function bdBusinessHealthGetSharedV284(){return bdAnalysisContextRestrictedPhase3a5()?bdRestrictedAnalysisEmptyPhase3a5:bdBusinessHealthSharedStoreV284.current}');
  replace('function bdBusinessHealthHydrateSharedV284(t=!1){', 'function bdBusinessHealthHydrateSharedV284(t=!1){if(bdAnalysisContextRestrictedPhase3a5())return bdRestrictedAnalysisEmptyPhase3a5;');
  replace('function bdBusinessHealthCommitEnvelopeV284(e,t=!0){', 'function bdBusinessHealthCommitEnvelopeV284(e,t=!0){if(bdAnalysisContextRestrictedPhase3a5())return bdRestrictedAnalysisEmptyPhase3a5;');
  replace('if(!r.ok||!a?.success)throw new Error(a?.error||"Business Health unavailable");bdBusinessHealthCommitEnvelopeV284(a,!0)', 'if(r.status===403||r.status===401)bdRestrictAnalysisContextPhase3a5(t);if(!r.ok||!a?.success)throw new Error(a?.error||"Business Health unavailable");bdRestrictedAnalysisContextsPhase3a5.delete(t);bdBusinessHealthCommitEnvelopeV284(a,!0)');
  replace('q=await L.json().catch(()=>null);if(L.status>=500', 'q=await L.json().catch(()=>null);if(L.status===403||L.status===401){bdRestrictAnalysisContextPhase3a5();E(null)}if(L.status>=500');
  writeFileSync(file, source);
}
for (const invariant of ['bdRestrictAnalysisContextPhase3a5(t);if(!r.ok', 'bdRestrictedAnalysisContextsPhase3a5.delete(t);bdBusinessHealthCommitEnvelopeV284', 'bdRestrictAnalysisContextPhase3a5();E(null)', 'function WS(){if(bdAnalysisContextRestrictedPhase3a5())return null;']) {
  if (!source.includes(invariant)) throw new Error('Phase3a5 client permission invariant missing');
}
console.info('Phase3a5 client cache: authorization denial clears current analysis; transient failures preserve authorized cache.');
