import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdCanonicalTaxonomyReuseVersion="v338"';
if (source.includes(marker)) {
  console.log("Canonical taxonomy reuse v338 is already applied.");
  process.exit(0);
}
if (!source.includes('const bdCanonicalTaxonomyIntegrationsVersion="v337"')) {
  throw new Error("Canonical taxonomy integrations v337 must be applied first.");
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceScopedSegment(scopeStart, start, end, replacement, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const startIndex = source.indexOf(start, scopeIndex + scopeStart.length);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex + end.length);
}

function replaceScopedOnce(scopeStart, before, after, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const index = source.indexOf(before, scopeIndex + scopeStart.length);
  if (index < 0) throw new Error(`${label}: marker not found`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  "function bdNomenclaturePage()",
  marker + ";\nfunction bdNomenclaturePage()",
  "insert reuse marker",
);

replaceScopedSegment(
  "function bdNomenclaturePage()",
  "S.useEffect(()=>{if(!t)return;j();if(y&&!g.current){",
  "}},[t]),S.useEffect",
  "S.useEffect(()=>{t&&j()},[t]),S.useEffect",
  "remove legacy automatic classification write",
);

replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  'function M(D){r?.({key:D.key||D.productKey,id:D.id||D.key,name:D.name,unit:D.unit,baseUnit:D.unit,packageSize:D.packageSize,archived:D.archived},D),n()}',
  'async function M(D){let L=D;if(D.archived){try{const q=await bdTaxRequestV336("/api/inventory/products",{method:"POST",body:JSON.stringify({action:"restore",productKey:D.key||D.productKey})});q.assortment&&Kse("bd_assortment_v1",q.assortment),L=q.product||D}catch(q){b(q.message);return}}r?.({key:L.key||L.productKey,id:L.id||L.key,name:L.name,unit:L.unit,baseUnit:L.unit,packageSize:L.packageSize,archived:!1},L),n()}',
  "restore archived canonical match before use",
);

replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  '[L.supplierName,L.packageSize,L.price!=null?L.price+" "+L.currency:"",L.date]',
  '[L.supplierName,L.packageSize,L.price!=null?L.price+" "+L.currency:"",L.originalCurrency&&L.originalCurrency!==L.currency&&L.originalPrice!=null?"Документ: "+L.originalPrice+" "+L.originalCurrency:"",L.date]',
  "show authoritative and document purchase currency",
);

replaceScopedOnce(
  "function bdWriteoffPickerV271",
  '({catalog:e,onPick:t,onClose:n}){const[r,a]=S.useState(""),[s,l]=S.useState("all")',
  '({catalog:e,onPick:t,onClose:n,onCreate:o}){const[r,a]=S.useState(""),[s,l]=S.useState("all"),[bdQuickOpenV338,bdSetQuickOpenV338]=S.useState(!1)',
  "writeoff quick create state",
);
replaceOnce(
  ']})}\nfunction bdWriteoffPickerRowV271',
  ',i.jsx("button",{type:"button",className:"bd-ingredient-create-v336",onClick:()=>bdSetQuickOpenV338(!0),children:"+ Создать «"+(r||"позицию")+"»"}),bdQuickOpenV338&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:r,context:"writeoff",onClose:()=>bdSetQuickOpenV338(!1),onCreated:(g,Y)=>{o?.({...Y,...g}),bdSetQuickOpenV338(!1)}})]})}\nfunction bdWriteoffPickerRowV271',
  "writeoff quick create control",
);
replaceScopedOnce(
  "function bdWriteoffSheet",
  '[D,z]=S.useState(!1),P=new Map(t.map(p=>[p.productKey,p]))',
  '[D,z]=S.useState(!1),[bdWriteoffCatalogV338,bdSetWriteoffCatalogV338]=S.useState(t),P=new Map(bdWriteoffCatalogV338.map(p=>[p.productKey,p]))',
  "writeoff local canonical catalog",
);
replaceScopedOnce(
  "function bdWriteoffSheet",
  'function Y(p){E(c=>[...c,{id:crypto.randomUUID(),productKey:p.productKey,quantity:"",unit:bdWriteoffDefaultUnitV271(p)}]),T(!1),z(!0)}function J',
  'function Y(p){E(c=>[...c,{id:crypto.randomUUID(),productKey:p.productKey,quantity:"",unit:bdWriteoffDefaultUnitV271(p)}]),T(!1),z(!0)}function bdWriteoffCreatedV338(p){const c={...p,productKey:p.productKey||p.key,key:p.key||p.productKey,current:Number(p.current)||0,averageUnitCost:Number(p.averageUnitCost??p.lastPurchasePrice)||0};bdSetWriteoffCatalogV338(x=>[c,...x.filter(R=>R.productKey!==c.productKey)]),Y(c)}function J',
  "writeoff attach newly created canonical item",
);
replaceScopedOnce(
  "function bdWriteoffSheet",
  'onPick:Y,onClose:()=>T(!1)',
  'onPick:Y,onCreate:bdWriteoffCreatedV338,onClose:()=>T(!1)',
  "writeoff pass quick create callback",
);

writeFileSync(bundlePath, source);
console.log("Applied canonical taxonomy reuse v338.");
