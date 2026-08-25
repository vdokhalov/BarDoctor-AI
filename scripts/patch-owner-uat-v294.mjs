import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV294="owner-uat-v294";';
const fullyInstalled = source.includes(marker)
  && source.includes("function bdPersistDiagnosisV294")
  && source.includes('j.length===1?" шаг остался"')
  && source.includes("Пока нет прошедших смен для оценки готовности.");
if (fullyInstalled) {
  console.log("Owner UAT v294 patch already applied");
  process.exit(0);
}
source = source.replaceAll(marker, "");

const oldDiagnosisPersistence = 'function cle(e,t){const n={data:e,generatedAt:t,cachedAt:Date.now()};bdBusinessHealthCommitEnvelopeV284(n,!0),qr(IC,n).finally(()=>{try{window.dispatchEvent(new CustomEvent("bd:business-health-snapshot"))}catch{}})}function Js(){try{const e=WS();if(!e)return;const t={...e,staleAt:Date.now()};qr(IC,t).finally(()=>{try{window.dispatchEvent(new CustomEvent("bd:business-health-snapshot"))}catch{}})}catch{}}';
const newDiagnosisPersistence = 'async function bdPersistDiagnosisV294(e){const t=Ot();if(Vm(IC,e),!t)return!1;fz();try{const n=await S0(IC,t,e,void 0);if(!n.ok)throw new Error("PUT diagnosis rejected");return Vm(IC,n.data),uz(IC),jm(),!0}catch{return lM(IC,null,e),jm(),!1}finally{pz()}}function cle(e,t){const n={data:e,generatedAt:t,cachedAt:Date.now()};bdBusinessHealthCommitEnvelopeV284(n,!0),bdPersistDiagnosisV294(n).finally(()=>{try{window.dispatchEvent(new CustomEvent("bd:business-health-snapshot"))}catch{}})}function Js(){try{const e=WS();if(!e)return;const t={...e,staleAt:Date.now()};bdPersistDiagnosisV294(t).finally(()=>{try{window.dispatchEvent(new CustomEvent("bd:business-health-snapshot"))}catch{}})}catch{}}';
if (source.includes(oldDiagnosisPersistence)) source = source.replace(oldDiagnosisPersistence, newDiagnosisPersistence);
else if (!source.includes(newDiagnosisPersistence)) throw new Error("Owner UAT v294 diagnosis persistence target not found");

const oldSetupCaption = 'children:j.length?N.length+" из "+j.length+(C?" приоритетов":" шагов настройки"):C?"Критичных действий нет":"Заведение готово к первой смене"';
const newSetupCaption = 'children:j.length?C?N.length+" из "+j.length+" приоритетов":j.length+(j.length===1?" шаг остался":j.length<5?" шага осталось":" шагов осталось"):C?"Критичных действий нет":"Заведение готово к первой смене"';
if (source.includes(oldSetupCaption)) source = source.replace(oldSetupCaption, newSetupCaption);
else if (!source.includes(newSetupCaption)) throw new Error("Owner UAT v294 setup caption target not found");

const oldReadinessValues = 'const f=e.coveragePercent??t?.coveragePercent??0,m=e.accountedShifts??(t?t.revenueEntered+t.explainedClosures:0),h=e.expectedShifts??t?.scheduledCompletedShifts??0;return i.jsxs("section",{"data-bd-finance-readiness":"v160",className:"bd-finance-readiness-v160",children:[i.jsxs("header",{children:[i.jsx("p",{children:"Готовность данных"}),i.jsx("strong",{children:f+"%"})]}),i.jsx("div",{className:"bd-finance-readiness-progress","aria-label":"Готовность данных "+f+" процентов",children:i.jsx("i",{style:{width:Math.max(0,Math.min(100,f))+"%"}})}),i.jsxs("p",{className:"bd-finance-readiness-caption",children:[m," из ",h," прошедших смен · будущие не учитываются."]})';
const newReadinessValues = 'const f=e.coveragePercent??t?.coveragePercent??0,m=e.accountedShifts??(t?t.revenueEntered+t.explainedClosures:0),h=e.expectedShifts??t?.scheduledCompletedShifts??0,g=h>0;return i.jsxs("section",{"data-bd-finance-readiness":"v160",className:"bd-finance-readiness-v160",children:[i.jsxs("header",{children:[i.jsx("p",{children:"Готовность данных"}),i.jsx("strong",{children:g?f+"%":"—"})]}),i.jsx("div",{className:"bd-finance-readiness-progress","aria-label":g?"Готовность данных "+f+" процентов":"Готовность данных пока не рассчитывается",children:i.jsx("i",{style:{width:g?Math.max(0,Math.min(100,f))+"%":"0%"}})}),i.jsx("p",{className:"bd-finance-readiness-caption",children:g?m+" из "+h+" прошедших смен · будущие не учитываются.":"Пока нет прошедших смен для оценки готовности."})';
if (source.includes(oldReadinessValues)) source = source.replace(oldReadinessValues, newReadinessValues);
else if (!source.includes(newReadinessValues)) throw new Error("Owner UAT v294 finance readiness target not found");

source = marker + source;
writeFileSync(bundlePath, source);
console.log("Owner UAT v294 patch applied");
