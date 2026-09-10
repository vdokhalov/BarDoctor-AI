import { readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const path = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = (await readFile(path, "utf8")).replace(/\r\n/g, "\n");
const startMarker = "/* purchase-units-v421:start */";
const endMarker = "/* purchase-units-v421:end */";
const domain = stripTypeScriptTypes(await readFile(new URL("../lib/bardoctor/stock-units.ts", import.meta.url), "utf8"))
  .replace(/\bexport\s+/g, "").replace(/[ \t]+$/gm, "");
const fragment = await readFile(new URL("./fragments/purchase-units-v421.fragment.txt", import.meta.url), "utf8");
const stockContract = stripTypeScriptTypes(await readFile(new URL("../lib/bardoctor/purchase-stock-contract.ts", import.meta.url), "utf8")).replace(/\bexport\s+/g, "");
const helpers = `${startMarker}\n${stockContract}\nconst bdStockUnitsV421=(()=>{${domain};return {physicalUnit,canonicalStockUnit,convertStockQuantity,normalizePurchaseQuantity,validatePurchaseConversionSnapshot};})();\n${fragment}\n${endMarker}\n`;
if (source.includes(startMarker)) {
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error("Unterminated canonical purchase helpers");
  source = source.slice(0,start)+helpers+source.slice(end+endMarker.length).replace(/^\r?\n/,"");
} else {
  source=helpers+source;
}
if (!source.includes('i.jsx(bdPurchaseUnitsV421,{line,onChange:patch=>u(line.id,patch)})')) {
  const before = 'i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Количество",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:line.quantity';
  const start = source.indexOf(before);
  const end = source.indexOf('i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Цена за единицу"',start);
  if(start<0||end<start)throw new Error("Canonical purchase editor boundary missing");
  source=source.slice(0,start)+'i.jsx(bdPurchaseUnitsV421,{line,onChange:patch=>u(line.id,patch)}),'+source.slice(end);
  const oldName='onChange:event=>{const value=event.target.value,pack=bdProcSuggestedPackageV209(value,bdProcCurrentPackageV209(line));u(line.id,{name:value,...pack!==bdProcCurrentPackageV209(line)?bdProcPackageUpdateV209(pack):{}})}';
  if(!source.includes(oldName))throw new Error("Purchase name handler missing");
  source=source.replace(oldName,'onChange:event=>u(line.id,{name:event.target.value})');
  source=source.replace('label:"Цена за единицу",children:i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:line.unitPrice','label:bdPurchaseContentV421(line)?"Цена упаковки":"Цена за единицу",children:i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:line.unitPrice');
}
if (!source.includes('i.jsx(bdPurchaseUnitsV421,{line,onChange:patch=>u(line.id,patch)})')) throw new Error("Canonical purchase editor not connected");
if(!source.includes('children:"В чём учитывать остаток?"')){
  const quick=source.indexOf('function bdNomenclatureQuickCreateV336(');
  const start=source.indexOf('i.jsxs("div",{className:"bd-quick-grid-v336",children:[i.jsxs("label",{children:[i.jsx("span",{children:"Базовая единица"})',quick);
  const end=source.indexOf('i.jsxs("label",{children:[i.jsx("span",{children:"Последняя цена, если известна"})',start);
  if(quick<0||start<quick||end<start)throw new Error("Nomenclature stock unit editor missing");
  source=source.slice(0,start)+'i.jsxs("label",{children:[i.jsx("span",{children:"В чём учитывать остаток?"}),i.jsx("select",{"aria-label":"В чём учитывать остаток?",value:bdStockUnitsV421.canonicalStockUnit(h.unit)||"pcs",onChange:L=>g(B=>({...B,unit:L.target.value,displayUnit:L.target.value,packageSize:""})),children:[["pcs","Штуки"],["l","Литры"],["kg","Килограммы"]].map(([value,label])=>i.jsx("option",{value,children:label},value))})]}),'+source.slice(end);
}
// The card still serves legacy g/ml records as well as canonical kg/l records.
// Preserve the stored unit and patch its controls together; opening a card must
// never turn a mass or volume into a count before the user saves another field.
function patchNomenclatureFunction(name, replacements) {
  const prefix = `function ${name}(`;
  const start = source.indexOf(prefix);
  const endMarker = name === "bdNomenclatureSheetV237" ? "\nbdNomenclatureSheet=" : "\nfunction ";
  const end = source.indexOf(endMarker, start + prefix.length);
  if (start < 0 || end < start || source.indexOf(prefix, start + prefix.length) >= 0) {
    throw new Error(`Ambiguous nomenclature function boundary: ${name}`);
  }
  let body = source.slice(start, end);
  for (const [before, after] of replacements) {
    if (body.includes(before) && body.includes(after)) {
      throw new Error(`Mixed nomenclature unit patch state: ${name}`);
    }
    if (body.includes(before)) body = body.replaceAll(before, after);
    else if (!body.includes(after)) throw new Error(`Nomenclature unit anchor missing: ${name}: ${before}`);
  }
  source = source.slice(0, start) + body + source.slice(end);
}
patchNomenclatureFunction("bdTaxBaseUnitV336", [
  ['/мл|ml|(?:^|\\s)л|литр/', '/мл|ml|(?:^|\\s)л|литр|(?:^|\\s)l(?:$|\\s)/'],
]);
patchNomenclatureFunction("bdTaxDisplayUnitV336", [
  ['/(^|\\s)л|литр/', '/(^|\\s)л|литр|(?:^|\\s)l(?:$|\\s)/'],
]);
patchNomenclatureFunction("bdNomenclatureInitialFormV213", [
  ['unit:["ml","g","pcs"].includes(e?.unit)?e.unit:"pcs"', 'unit:["ml","g","pcs","kg","l"].includes(e?.unit)?e.unit:"pcs"'],
]);
patchNomenclatureFunction("bdNomenclatureInitialFormV237", [
  ['n.unit==="ml"', '["ml","l"].includes(n.unit)'],
  ['n.unit==="g"', '["g","kg"].includes(n.unit)'],
]);
patchNomenclatureFunction("bdNomenclatureSheetV237", [
  ['u.unit==="ml"', '["ml","l"].includes(u.unit)'],
  ['u.unit==="g"', '["g","kg"].includes(u.unit)'],
  ['C==="ml"', '["ml","l"].includes(C)'],
  ['C==="g"', '["g","kg"].includes(C)'],
  ['i.jsx("option",{value:"ml",children:"Миллилитрах — жидкость"}),i.jsx("option",{value:"g",children:"Граммах — вес"}),i.jsx("option",{value:"pcs",children:"Штуках"})',
    'i.jsx("option",{value:"ml",children:"Миллилитрах — жидкость"}),i.jsx("option",{value:"l",children:"Литрах — жидкость"}),i.jsx("option",{value:"g",children:"Граммах — вес"}),i.jsx("option",{value:"kg",children:"Килограммах — вес"}),i.jsx("option",{value:"pcs",children:"Штуках"})'],
]);
source=source.replaceAll('if(e?.unitModelVersion===4)return bdWarehouseDecimal(t,3)+" "+bdWarehouseUnit(e.unit);', '');
for(const [prefix,guard] of [
  ['function bdProcStockPreviewV221(e){','if(e?.purchaseConversion?.version===4)return bdProcFormatAmountV221(e.purchaseConversion.canonicalQuantity,e.purchaseConversion.canonicalUnit);if(e?.purchaseUnitModel===4){const p=bdPurchasePreviewV421(e);return p.ok?bdProcFormatAmountV221(p.snapshot.canonicalQuantity,p.snapshot.canonicalUnit):"Проверьте количество и единицы";}'],
  ['function bdWarehouseEffectiveDisplayUnit(e,t){','if(e?.unitModelVersion===4)return bdStockUnitsV421.canonicalStockUnit(e.unit)||"unknown";'],
  ['function bdWarehouseDisplayAmount(e,t){','if(e?.unitModelVersion===4)return bdWarehouseDecimal(t,6)+" "+bdWarehouseUnit(e.unit);'],
]){
  if(!source.includes(prefix+guard)){
    if(!source.includes(prefix))throw new Error("Canonical warehouse display hook missing");
    source=source.replace(prefix,prefix+guard);
  }
}
const costAnchor='      const total=Math.max(0,bdAssortmentNumberV170(line?.lineTotal,0)||bdAssortmentNumberV170(line?.unitPrice,0)*quantity);';
const mappingOld='category:k.category||e.category||"products",requiresReview:!1,mappingSource:"manual"';
const mappingNew='category:stockPurchaseCategory(k.kind,k.purchaseCategory||k.category)||e.category||"products",matchedBaseUnit:k.unit,requiresReview:!1,mappingSource:"manual"';
if(!source.includes(mappingNew)){
  if(!source.includes(mappingOld))throw new Error("Purchase nomenclature selection contract missing");
  source=source.replace(mappingOld,mappingNew);
}
const readyAnchor='const bdCanPostV357=bdSupplierReady&&bdLinesReady&&';
const readyGuard='const bdCanPostV357=e.items.filter(bdPurchaseStockLineV421).every(line=>bdPurchasePreviewV421(line).ok)&&bdSupplierReady&&bdLinesReady&&';
if(!source.includes(readyGuard)){
  if(!source.includes(readyAnchor))throw new Error("Purchase validation control missing");
  source=source.replace(readyAnchor,readyGuard);
}
const costGuard='      if(line?.purchaseConversion!=null){const snapshot=bdStockUnitsV421.validatePurchaseConversionSnapshot(line.purchaseConversion);if(!snapshot)continue;const viewUnit=bdTechCostUnitV376(snapshot.canonicalUnit).unit,converted=bdStockUnitsV421.convertStockQuantity(snapshot.canonicalQuantity,snapshot.canonicalUnit,viewUnit);if(converted===null)continue;resolved={unit:viewUnit,factor:1};baseAmount=converted;}\n';
if(!source.includes(costGuard.trim())){
  if(!source.includes(costAnchor))throw new Error("Canonical purchase cost projection hook missing");
  source=source.replace(costAnchor,costGuard+costAnchor);
}
await writeFile(path,source);
