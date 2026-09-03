import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "bd-warehouse-unit-integrity-v399";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const cssPath = path.join(root, "public/catalog.css");
let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker)) {
  replaceExactly(
    'function bdNomenclatureItems(e){const t=bdWarehouseRecord(e),n=Array.isArray(t.nomenclature)?t.nomenclature.map(bdWarehouseRecord):[],r=Array.isArray(t.stockBalances)?t.stockBalances.map(bdWarehouseRecord):[],a=new Map;for(const l of n){const u=bdWarehouseKey(l);u&&a.set(u,{...l,kind:l.kind==="service"?"service":"stock"})}for(const l of r){const u=bdWarehouseKey(l);if(!u)continue;const d=a.get(u);a.set(u,d?{...l,...d,current:l.current,averageUnitCost:l.averageUnitCost,inventoryValue:l.inventoryValue,currency:l.currency,lastPurchaseAt:d.lastPurchaseAt||l.lastPurchaseAt,kind:"stock"}:{...l,kind:"stock",active:l.active!==!1})}return[...a.values()].sort((l,u)=>String(l.name||"").localeCompare(String(u.name||""),"ru"))}',
    'const bdWarehouseUnitIntegrityVersionV399="v399";/* bd-warehouse-unit-integrity-v399 */\nfunction bdWarehouseQuantityMetadata(e,t){const n=bdWarehouseRecord(e),r=bdWarehouseRecord(t),a=String(n.unit||""),s=String(r.unit||""),l=!!a&&!!s&&a!==s;if(l)return{unit:n.unit,packageSize:n.packageSize,packageAmount:n.packageAmount,multiplePackageSizes:n.multiplePackageSizes,packageOptions:n.packageOptions,displayUnit:n.displayUnit||"auto",displayPackageSize:n.displayPackageSize,displayPackageAmount:n.displayPackageAmount,unitConflict:!0};return{unit:r.unit||n.unit,packageSize:r.packageSize||n.packageSize,packageAmount:r.multiplePackageSizes?0:bdWarehouseNumber(r.packageAmount)>0?r.packageAmount:n.packageAmount,multiplePackageSizes:r.multiplePackageSizes||n.multiplePackageSizes,packageOptions:r.packageOptions||n.packageOptions,displayUnit:r.displayUnit||n.displayUnit||"auto",displayPackageSize:r.displayPackageSize||n.displayPackageSize,displayPackageAmount:bdWarehouseNumber(r.displayPackageAmount)>0?r.displayPackageAmount:n.displayPackageAmount,unitConflict:!1}}\nfunction bdNomenclatureItems(e){const t=bdWarehouseRecord(e),n=Array.isArray(t.nomenclature)?t.nomenclature.map(bdWarehouseRecord):[],r=Array.isArray(t.stockBalances)?t.stockBalances.map(bdWarehouseRecord):[],a=new Map;for(const l of n){const u=bdWarehouseKey(l);u&&a.set(u,{...l,kind:l.kind==="service"?"service":"stock"})}for(const l of r){const u=bdWarehouseKey(l);if(!u)continue;const d=a.get(u);a.set(u,d?{...l,...d,...bdWarehouseQuantityMetadata(l,d),current:l.current,averageUnitCost:l.averageUnitCost,inventoryValue:l.inventoryValue,currency:l.currency,lastPurchaseAt:d.lastPurchaseAt||l.lastPurchaseAt,kind:"stock"}:{...l,kind:"stock",active:l.active!==!1})}return[...a.values()].sort((l,u)=>String(l.name||"").localeCompare(String(u.name||""),"ru"))}',
    "Nomenclature quantity metadata merge",
  );

  replaceExactly(
    'function bdWarehouseCanonicalBalances(e){const t=bdWarehouseRecord(e),n=Array.isArray(t.nomenclature)?t.nomenclature.map(bdWarehouseRecord):[],r=new Map(n.map(l=>[bdWarehouseKey(l),l]));return(Array.isArray(t.stockBalances)?t.stockBalances:[]).map(bdWarehouseRecord).map(l=>{const u=r.get(bdWarehouseKey(l));return u?{...l,name:u.name||l.name,category:u.category||l.category,unit:u.unit||l.unit,packageSize:u.packageSize||l.packageSize,packageAmount:u.multiplePackageSizes?0:bdWarehouseNumber(u.packageAmount)>0?u.packageAmount:l.packageAmount,multiplePackageSizes:u.multiplePackageSizes||l.multiplePackageSizes,packageOptions:u.packageOptions||l.packageOptions,displayUnit:u.displayUnit||l.displayUnit||"auto",displayPackageSize:u.displayPackageSize||l.displayPackageSize,displayPackageAmount:bdWarehouseNumber(u.displayPackageAmount)>0?u.displayPackageAmount:l.displayPackageAmount,purchaseMode:u.purchaseMode||l.purchaseMode||"document",purchasePackageSize:u.purchasePackageSize||l.purchasePackageSize,purchasePackageAmount:bdWarehouseNumber(u.purchasePackageAmount)>0?u.purchasePackageAmount:l.purchasePackageAmount,active:u.active!==!1,sectionId:u.sectionId,taxonomyCategoryId:u.taxonomyCategoryId,subcategoryId:u.subcategoryId,storageLocationId:u.storageLocationId,classificationStatus:u.classificationStatus}:l}).filter(l=>l.archived!==!0&&l.active!==!1)}',
    'function bdWarehouseCanonicalBalances(e){const t=bdWarehouseRecord(e),n=Array.isArray(t.nomenclature)?t.nomenclature.map(bdWarehouseRecord):[],r=new Map(n.map(l=>[bdWarehouseKey(l),l]));return(Array.isArray(t.stockBalances)?t.stockBalances:[]).map(bdWarehouseRecord).map(l=>{const u=r.get(bdWarehouseKey(l));return u?{...l,name:u.name||l.name,category:u.category||l.category,...bdWarehouseQuantityMetadata(l,u),purchaseMode:u.purchaseMode||l.purchaseMode||"document",purchasePackageSize:u.purchasePackageSize||l.purchasePackageSize,purchasePackageAmount:bdWarehouseNumber(u.purchasePackageAmount)>0?u.purchasePackageAmount:l.purchasePackageAmount,active:u.active!==!1,sectionId:u.sectionId,taxonomyCategoryId:u.taxonomyCategoryId,subcategoryId:u.subcategoryId,storageLocationId:u.storageLocationId,classificationStatus:u.classificationStatus}:l}).filter(l=>l.archived!==!0&&l.active!==!1)}',
    "Warehouse quantity metadata merge",
  );

  replaceExactly(
    ']}),(!e.name||e.name==="Товар")&&i.jsxs("div",{className:"bd-inventory-warning",children:[i.jsx("b",{children:"Название не сохранилось"})',
    ']}),e.unitConflict&&i.jsxs("div",{className:"bd-inventory-warning",children:[i.jsx("b",{children:"Единица исправлена по движениям"}),i.jsx("p",{children:"Номенклатура содержала другую единицу. Расчётный остаток показан в базовой единице складских движений без изменения количества и стоимости."})]}),(!e.name||e.name==="Товар")&&i.jsxs("div",{className:"bd-inventory-warning",children:[i.jsx("b",{children:"Название не сохранилось"})',
    "Warehouse unit conflict notice",
  );

  fs.writeFileSync(bundlePath, source);
}

for (const relativePath of [
  "app/bar-doctor-response.ts",
  "public/app.html",
  "public/bardoctor-preview.js",
]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(
    /index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g,
    (match, version) => version.includes(marker)
      ? match
      : `${match}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

await import("./patch-manual-nomenclature-cost-fallback-v409.mjs");

console.log(`${marker}: applied`);
