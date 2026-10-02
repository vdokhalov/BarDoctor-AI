import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
let source = readFileSync(file, 'utf8');
const marker = 'const bdCanonicalBoundaryClientPhase3a5=';
const originalStoreRead = 'async function Yse(e,t){const r=await(await fetch(`${EC}/${e}`,{headers:ca(t)})).json();if(!r.ok)throw new Error(`GET /api/store/${e} failed`);return r.data??void 0}';
const guardedStoreRead = 'async function Yse(e,t){const response=await fetch(`${EC}/${e}`,{headers:ca(t)}),r=await response.json();if(!response.ok||!r.ok)throw Object.assign(new Error(`GET /api/store/${e} failed`),{status:response.status,code:r.code,storeKey:e});return r.data??void 0}';
const originalFinanceWarm = 'window.__bdStartupFinanceWarmV349=Promise.all(["bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons"].map(async t=>({key:t,data:await Yse(t,e)})))';
const previousFinanceWarm = originalFinanceWarm + '.catch(bdHandleFinanceWarmFailurePhase3a5)';
const guardedFinanceWarm = 'window.__bdStartupFinanceWarmV349=Promise.all(["bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons"].map(async t=>{try{return{key:t,data:await Yse(t,e)}}catch(error){return bdHandleFinanceWarmFailurePhase3a5(error)}})).then(rows=>rows.find(row=>row?.availability==="RESTRICTED"||row?.availability==="UNAVAILABLE")||rows).catch(bdHandleFinanceWarmFailurePhase3a5)';
const originalWarmApply = 'return e.then(t=>{for(const{key:n,data:r}of t)';
const guardedWarmApply = 'return e.then(t=>{if(t?.availability==="RESTRICTED"||t?.availability==="UNAVAILABLE")return!1;for(const{key:n,data:r}of t)';

if (process.argv.includes('--restore')) {
  if (source.includes(marker)) {
    if (source.includes(guardedStoreRead)) source = source.replace(guardedStoreRead, originalStoreRead);
    if (source.includes(guardedFinanceWarm)) source = source.replace(guardedFinanceWarm, originalFinanceWarm);
    if (source.includes(previousFinanceWarm)) source = source.replace(previousFinanceWarm, originalFinanceWarm);
    if (source.includes(guardedWarmApply)) source = source.replace(guardedWarmApply, originalWarmApply);
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
function bdHandleFinanceWarmFailurePhase3a5(error){if(["bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons"].includes(error?.storeKey)){if(error.status===403&&error.code==="ACCESS_DENIED")return{availability:"RESTRICTED"};if(error.status===401)return{availability:"UNAVAILABLE"}}throw error}
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
// Existing v475 bundles already contain the Phase3a5 boundary. Upgrade that
// boundary idempotently and retain the original rejected contract for unexpected errors.
if (!source.includes('function bdHandleFinanceWarmFailurePhase3a5(')) {
  source = source.replace('// end canonical boundary Phase3a5', 'function bdHandleFinanceWarmFailurePhase3a5(error){if(["bd_finance_revenue","bd_finance_expenses","bd_finance_gap_reasons"].includes(error?.storeKey)){if(error.status===403&&error.code==="ACCESS_DENIED")return{availability:"RESTRICTED"};if(error.status===401)return{availability:"UNAVAILABLE"}}throw error}\n// end canonical boundary Phase3a5');
}
if (source.includes(previousFinanceWarm)) source = source.replace(previousFinanceWarm, originalFinanceWarm);
for (const [before, after] of [[originalStoreRead, guardedStoreRead], [originalFinanceWarm, guardedFinanceWarm], [originalWarmApply, guardedWarmApply]]) {
  if (!source.includes(after)) {
    if (!source.includes(before)) throw new Error('Restricted Finance warm-read anchor missing');
    source = source.replace(before, after);
  }
}
writeFileSync(file, source);
for (const invariant of ['bdRestrictAnalysisContextPhase3a5(t);if(!r.ok', 'bdRestrictedAnalysisContextsPhase3a5.delete(t);bdBusinessHealthCommitEnvelopeV284', 'bdRestrictAnalysisContextPhase3a5();E(null)', 'function WS(){if(bdAnalysisContextRestrictedPhase3a5())return null;']) {
  if (!source.includes(invariant)) throw new Error('Phase3a5 client permission invariant missing');
}
console.info('Phase3a5 client cache: authorization denial clears current analysis; transient failures preserve authorized cache.');
