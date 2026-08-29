import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdCanonicalTaxonomyPostbuildVersion="v340"';
let changed = false;

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
  changed = true;
}

function replaceScopedOnce(scopeStart, before, after, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const index = source.indexOf(before, scopeIndex + scopeStart.length);
  if (index < 0) throw new Error(`${label}: marker not found`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
  changed = true;
}

function replaceScopedSegment(scopeStart, start, end, replacement, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const startIndex = source.indexOf(start, scopeIndex + scopeStart.length);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex + end.length);
  changed = true;
}

if (!source.includes(marker)) {
  const anchor = 'const bdCanonicalTaxonomyFreshnessVersion="v339"';
  if (!source.includes(anchor)) throw new Error("Canonical taxonomy freshness v339 must be applied first.");
  source = source.replace(anchor, `${marker};${anchor}`);
  changed = true;
}

const invoiceStart = source.indexOf("function bdInvoiceLineMappingV3");
const invoiceEnd = source.indexOf("function bdInvoiceReviewPriorityV4", invoiceStart);
if (invoiceStart < 0 || invoiceEnd < 0) throw new Error("Invoice mapping component not found");
if (!source.slice(invoiceStart, invoiceEnd).includes("bdNomenclatureQuickCreateV336")) {
  replaceScopedOnce(
    "function bdInvoiceLineMappingV3",
    '[q,x]=S.useState("idle"),C=',
    '[q,x]=S.useState("idle"),[bdQuickOpenV336,bdSetQuickOpenV336]=S.useState(!1),C=',
    "restore invoice quick create state",
  );
  replaceScopedSegment(
    "function bdInvoiceLineMappingV3",
    'function P(){if(q==="creating")return;',
    '}function R(){if(!t||!e.rawName||!e.purchaseProductKey){',
    'function P(){bdSetQuickOpenV336(!0)}function R(){if(!t||!e.rawName||!e.purchaseProductKey){',
    "restore shared invoice quick create",
  );
  replaceScopedOnce(
    "function bdInvoiceLineMappingV3",
    'typeof q==="string"&&!['+"'idle','creating','created'"+'].includes(q)&&i.jsx("div",{className:"bd-invoice-mapping-state-v2 is-error",role:"alert",children:q}),e.purchaseProductKey&&',
    'bdQuickOpenV336&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:D,prefill:{name:D,unit:e.unit,packageSize:e.packageSize,price:e.unitPrice},context:"receipt",onClose:()=>bdSetQuickOpenV336(!1),onCreated:k=>{O(k),bdSetQuickOpenV336(!1)}}),e.purchaseProductKey&&',
    "restore invoice quick create sheet",
  );
}

const writeoffPickerStart = source.indexOf("function bdWriteoffPickerV271");
const writeoffPickerEnd = source.indexOf("function bdWriteoffPickerRowV271", writeoffPickerStart);
if (writeoffPickerStart < 0 || writeoffPickerEnd < 0) throw new Error("Write-off picker not found");
if (!source.slice(writeoffPickerStart, writeoffPickerEnd).includes("bdNomenclatureQuickCreateV336")) {
  replaceScopedOnce(
    "function bdWriteoffPickerV271",
    '({catalog:e,onPick:t,onClose:n}){const[r,a]=S.useState(""),[s,l]=S.useState("all")',
    '({catalog:e,onPick:t,onClose:n,onCreate:o}){const[r,a]=S.useState(""),[s,l]=S.useState("all"),[bdQuickOpenV338,bdSetQuickOpenV338]=S.useState(!1)',
    "restore writeoff quick create state",
  );
  replaceOnce(
    ']})}\nfunction bdWriteoffPickerRowV271',
    ',i.jsx("button",{type:"button",className:"bd-ingredient-create-v336",onClick:()=>bdSetQuickOpenV338(!0),children:"+ Создать «"+(r||"позицию")+"»"}),bdQuickOpenV338&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:r,context:"writeoff",onClose:()=>bdSetQuickOpenV338(!1),onCreated:(g,Y)=>{o?.({...Y,...g}),bdSetQuickOpenV338(!1)}})]})}\nfunction bdWriteoffPickerRowV271',
    "restore writeoff quick create control",
  );
}

const writeoffSheetStart = source.indexOf("function bdWriteoffSheet");
const writeoffSheetEnd = source.indexOf("function bdWriteoffDetailV271", writeoffSheetStart);
if (writeoffSheetStart < 0 || writeoffSheetEnd < 0) throw new Error("Write-off sheet not found");
if (!source.slice(writeoffSheetStart, writeoffSheetEnd).includes("bdWriteoffCatalogV338")) {
  replaceScopedOnce(
    "function bdWriteoffSheet",
    '[D,z]=S.useState(!1),P=new Map(t.map(p=>[p.productKey,p]))',
    '[D,z]=S.useState(!1),[bdWriteoffCatalogV338,bdSetWriteoffCatalogV338]=S.useState(t),P=new Map(bdWriteoffCatalogV338.map(p=>[p.productKey,p]))',
    "restore writeoff local catalog",
  );
  replaceScopedOnce(
    "function bdWriteoffSheet",
    'function Y(p){E(c=>[...c,{id:crypto.randomUUID(),productKey:p.productKey,quantity:"",unit:bdWriteoffDefaultUnitV271(p)}]),T(!1),z(!0)}function J',
    'function Y(p){E(c=>[...c,{id:crypto.randomUUID(),productKey:p.productKey,quantity:"",unit:bdWriteoffDefaultUnitV271(p)}]),T(!1),z(!0)}function bdWriteoffCreatedV338(p){const c={...p,productKey:p.productKey||p.key,key:p.key||p.productKey,current:Number(p.current)||0,averageUnitCost:Number(p.averageUnitCost??p.lastPurchasePrice)||0};bdSetWriteoffCatalogV338(x=>[c,...x.filter(R=>R.productKey!==c.productKey)]),Y(c)}function J',
    "restore writeoff created item attachment",
  );
  replaceScopedOnce(
    "function bdWriteoffSheet",
    'onPick:Y,onClose:()=>T(!1)',
    'onPick:Y,onCreate:bdWriteoffCreatedV338,onClose:()=>T(!1)',
    "restore writeoff quick create callback",
  );
}

if (changed) writeFileSync(bundlePath, source);
console.log(changed ? "Applied canonical taxonomy post-build repairs v340." : "Canonical taxonomy post-build repairs v340 are intact.");
