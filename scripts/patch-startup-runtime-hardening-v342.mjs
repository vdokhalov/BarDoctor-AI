import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdStartupRuntimeHardeningVersionV342="v342"';
let changed = false;

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
  changed = true;
}

if (!source.includes(marker)) {
  const anchor = 'const bdCanonicalTaxonomyPostbuildVersion="v340"';
  if (!source.includes(anchor)) throw new Error("Canonical taxonomy post-build v340 must be applied first.");
  source = source.replace(anchor, `${marker};${anchor}`);
  changed = true;
}

const restoredCatalogHelpers = String.raw`
function bdCatIsOpen(e,t,n){return Object.prototype.hasOwnProperty.call(e,t)?e[t]===!0:n==="section"}
function bdCatUnitLabel(e){return e==="ml"?"мл":e==="g"?"г":e==="pcs"?"шт.":String(e||"ед.")}
function bdCatToBase(e,t){const n=Math.max(0,bdCatNumber(e)),r=String(t||"").toLocaleLowerCase("ru");return/^(л|l|литр)/.test(r)?{amount:n*1e3,unit:"ml"}:/^(мл|ml)/.test(r)?{amount:n,unit:"ml"}:/^(кг|kg)/.test(r)?{amount:n*1e3,unit:"g"}:/^(г|гр|g)/.test(r)?{amount:n,unit:"g"}:/^(шт|pcs|порц)/.test(r)?{amount:n,unit:"pcs"}:{amount:n,unit:"unknown"}}
function bdCatPackage(e){const t=String(e||"").toLocaleLowerCase("ru").replace(",","."),n=t.match(/(\d+(?:\.\d+)?)\s*(мл|ml|л|l|литр(?:а|ов)?|г|гр|g|кг|kg|шт|pcs)/i);return n?bdCatToBase(n[1],n[2]):{amount:0,unit:"unknown"}}
function bdCatPurchaseProducts(e){const t=new Map;for(const n of e){if(n.status!=="confirmed")continue;for(const r of bdCatArray(n.items)){const a=bdProcProductKey(r),s={key:a,name:r.name||"Товар",packageSize:r.packageSize||r.unit||"",supplierName:n.supplierName||"Поставщик",category:r.subcategoryName||r.categoryName||r.category||"",sectionId:r.sectionId||"",categoryId:r.taxonomyCategoryId||r.categoryId||"",price:bdCatNumber(r.unitPrice)||bdCatNumber(r.lineTotal)/(bdCatNumber(r.quantity)||1),currency:n.currency||"RUB",date:n.date||"",...bdCatPackage(r.packageSize||r.unit)};const l=t.get(a);(!l||s.date>=l.date)&&t.set(a,s)}}return[...t.values()].sort((n,r)=>String(n.name).localeCompare(String(r.name),"ru"))}
function bdCatMatchingProductsV258(e,t){const n=new Map,r=(a,s)=>{if(!a||a.active===!1||a.status==="archived")return;const l=a.productKey||a.key,u=a.name||a.productName;if(!l||!u)return;const d=n.get(l)||{},f=bdCatPackage(a.packageSize||a.unit),m=["ml","g","pcs"].includes(a.baseUnit)?a.baseUnit:["ml","g","pcs"].includes(a.unit)?a.unit:f.unit!=="unknown"?f.unit:d.unit||"unknown";n.set(l,{...d,...a,key:l,name:s>=(d.sourceRank||0)?u:d.name||u,packageSize:a.packageSize||d.packageSize||a.unit||"",supplierName:d.supplierName||"",supplierNames:d.supplierNames||[],supplierAliases:d.supplierAliases||[],category:a.subcategoryName||a.categoryName||a.category||d.category||"",price:bdCatNumber(a.price)||bdCatNumber(d.price),currency:a.currency||d.currency||"",amount:a.amount||f.amount||d.amount||0,unit:m,sourceRank:Math.max(s,d.sourceRank||0)})};for(const a of bdCatArray(e?.stockBalances))r(a,2);for(const a of bdCatArray(e?.nomenclature))r(a,3);for(const a of bdCatArray(e?.supplierProductMappings)){const s=n.get(a.canonicalProductKey);if(!s||a.status==="orphan")continue;const l=[...new Set([...(s.supplierNames||[]),a.supplierName].filter(Boolean))],u=[...new Set([...(s.supplierAliases||[]),a.sourceName].filter(Boolean))];n.set(a.canonicalProductKey,{...s,supplierNames:l,supplierAliases:u,supplierName:l.length>1?l[0]+" + ещё "+(l.length-1):l[0]||"",supplierCount:l.length,sourceCount:u.length})}return[...n.values()].sort((a,s)=>String(a.name).localeCompare(String(s.name),"ru"))}
function bdCatRecipePriorityV257(e){if(e?.current===!0)return 100;if(e?.reviewStatus==="approved")return e?.source==="ai"?80:90;if(e?.status==="confirmed")return e?.source==="ai"?70:75;if(e?.currentDraft===!0)return 60;if(e?.reviewStatus==="requires_review")return 50;if(e?.reviewStatus==="ai_draft"||e?.source==="ai")return 40;return 10}
function bdCatRecipesForV257(e,t){return bdCatArray(t).filter(n=>String(n?.menuItemId||n?.ownerId||"")===String(e?.id||e||""))}
function bdCatRecipeFor(e,t){return bdCatRecipesForV257(e,t).sort((n,r)=>bdCatRecipePriorityV257(r)-bdCatRecipePriorityV257(n)||String(r?.updatedAt||r?.confirmedAt||"").localeCompare(String(n?.updatedAt||n?.confirmedAt||"")))[0]}
function bdCatTechCardStateV257(e,t){if(!e)return"missing";if(["ambiguous","orphan","wrong_venue"].includes(String(e.ownerLinkStatus||"")))return"link_error";if(e.reviewStatus==="approved"||e.status==="confirmed")return"approved";if(e.reviewStatus==="ai_draft"||e.source==="ai")return"ai_draft";return"review"}
function bdCatTechCardMetaV257(e,t){const n=bdCatTechCardStateV257(e,t),r={missing:{label:"Нет техкарты",tone:"bad"},approved:{label:"Техкарта есть",tone:"good"},ai_draft:{label:"Черновик AI",tone:"warn"},review:{label:"Требует проверки",tone:"warn"},link_error:{label:"Ошибка связи",tone:"bad"}}[n],a=bdCatArray(e?.ingredients),s=a.filter(l=>{const u=String(l?.linkStatus||(l?.purchaseProductKey?"linked":"missing"));return!["linked","auto_linked"].includes(u)}).length,l=bdCatRecipesForV257(t,arguments[2]||[]).find(u=>u?.currentDraft===!0&&u?.id!==e?.id);return{...r,state:n,source:e?.source==="ai"?"AI":e?.source==="import"?"Импорт":"Вручную",version:Number(e?.version)||1,ingredientCount:a.length,brokenIngredients:s,pendingDraft:l||null}}
function bdCatBalanceKey(e){const t=bdCatToBase(e.quantity,e.unit);return e.purchaseProductKey||"manual:"+bdProcNorm(e.name)+"|"+t.unit}
`;

if (!source.includes("function bdCatRecipePriorityV257")) {
  const anchor = "function bdCatReadiness(e)";
  if (!source.includes(anchor)) throw new Error("Catalog readiness anchor not found.");
  source = source.replace(anchor, `${restoredCatalogHelpers}\n${anchor}`);
  changed = true;
}

{
  const pickerStart = source.indexOf("function bdWriteoffPickerV271");
  const pickerEnd = source.indexOf("function bdWriteoffPickerRowV271", pickerStart);
  const resultsMarker = 'i.jsx("section",{className:"bd-writeoff-picker-results-v271",children:';
  const nestedResultsMarker = 'i.jsxs("section",{className:"bd-writeoff-picker-results-v271",children:[';
  const buttonMarker = 'i.jsx("button",{type:"button",className:"bd-ingredient-create-v336"';
  const resultsStart = source.indexOf(resultsMarker, pickerStart);
  const nestedResultsStart = source.indexOf(nestedResultsMarker, pickerStart);
  const searchStart = resultsStart >= 0 ? resultsStart : nestedResultsStart;
  const buttonStart = source.indexOf(buttonMarker, searchStart);
  const modalStart = source.indexOf(",bdQuickOpenV338&&", buttonStart);
  if (pickerStart < 0 || pickerEnd < 0 || searchStart < 0 || buttonStart < 0 || modalStart < 0 || modalStart > pickerEnd) {
    throw new Error("Write-off picker quick-create layout markers not found.");
  }
  const resultsPrefix = resultsStart >= 0 ? source.slice(resultsStart, buttonStart) : "";
  if (resultsStart >= 0 && resultsPrefix.endsWith("}),")) {
    const resultsContent = resultsPrefix
      .slice(0, -3)
      .replace('i.jsx("section"', 'i.jsxs("section"')
      .replace("children:", "children:[");
    const button = source.slice(buttonStart, modalStart);
    source = source.slice(0, resultsStart) + resultsContent + "," + button + "]})" + source.slice(modalStart);
    changed = true;
  }
}

if (!source.includes('function zC(e,t,n,r=[],a=[],s=[],o={}){e=Array.isArray(e)?e:[]')) {
  replaceOnce(
    "function zC(e,t,n,r=[],a=[],s=[],o={}){const l=e.filter",
    "function zC(e,t,n,r=[],a=[],s=[],o={}){e=Array.isArray(e)?e:[],t=Array.isArray(t)?t:[],n=Array.isArray(n)?n:[],r=Array.isArray(r)?r:[],a=Array.isArray(a)?a:[],s=Array.isArray(s)?s:[],o=o&&typeof o===\"object\"&&!Array.isArray(o)?o:{};const l=e.filter",
    "normalize Home health inputs",
  );
}

if (!source.includes("function bdHealthSafeComputeV342")) {
  const homeAnchor = "function Dce()";
  const safeCompute = 'function bdHealthSafeComputeV342(...e){try{return zC(...e)}catch{return zC([],[],[],[],[],[],{})}}\n';
  if (!source.includes(homeAnchor)) throw new Error("Home component anchor not found.");
  source = source.replace(homeAnchor, safeCompute + homeAnchor);
  changed = true;
}

if (!source.includes("S.useMemo(()=>bdHealthSafeComputeV342(")) {
  replaceOnce(
    "S.useMemo(()=>zC(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment})",
    "S.useMemo(()=>bdHealthSafeComputeV342(t,n,r,d,f,m,{profile:e,settings:bdHealthSettings,snapshots:bdHealthSnapshots,equipment:bdHealthEquipment})",
    "guard Home health calculation",
  );
}

if (!source.includes("function bdBusinessHealthSafeSnapshotV342")) {
  const anchor = "function bdBusinessHealthCommitEnvelopeV284";
  if (!source.includes(anchor)) throw new Error("Business Health commit anchor not found.");
  source = source.replace(
    anchor,
    "function bdBusinessHealthSafeSnapshotV342(e){try{return bdBusinessHealthSnapshotFromEnvelopeV334(e)}catch{return null}}\n" + anchor,
  );
  changed = true;
}

if (source.includes("function bdBusinessHealthCommitEnvelopeV284(e,t=!0){const n=bdBusinessHealthSnapshotFromEnvelopeV334(e);")) {
  replaceOnce(
    "function bdBusinessHealthCommitEnvelopeV284(e,t=!0){const n=bdBusinessHealthSnapshotFromEnvelopeV334(e);",
    "function bdBusinessHealthCommitEnvelopeV284(e,t=!0){const n=bdBusinessHealthSafeSnapshotV342(e);",
    "guard cached Business Health snapshots",
  );
}

if (changed) writeFileSync(bundlePath, source);
console.log(changed ? "Applied startup runtime hardening v342." : "Startup runtime hardening v342 is intact.");
