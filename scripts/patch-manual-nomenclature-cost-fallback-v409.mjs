import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "bd-manual-nomenclature-cost-fallback-v409";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const distBundlePath = path.join(root, "dist/client/assets/index-BQGspy0I.js");

function patchBundle(input, label) {
  if (input.includes(marker)) return input;
  if (!input.includes("bd-unit-product-costing-v393")) return input;

  const helperAnchor = "function bdTechCostResolvedAmountV385";
  const helperCount = input.split(helperAnchor).length - 1;
  if (helperCount !== 1) throw new Error(`${label}: manual price helper anchor expected once, found ${helperCount}`);

  const helper = `/* ${marker} */\nfunction bdTechCostManualPointV409(product){const price=bdAssortmentNumberV170(product?.lastPurchasePrice,0),currency=String(product?.currency||"").toUpperCase(),unitDef=bdTechCostUnitV376(product?.unit||product?.baseUnit),rawPackageAmount=bdAssortmentNumberV170(product?.packageAmount,0);if(!(price>0&&currency&&unitDef.unit!=="unknown"))return null;let baseAmount=rawPackageAmount>0?rawPackageAmount*unitDef.factor:0;if(!(baseAmount>0)){const packed=bdTechCostPackageV380(product?.packageSize||product?.displayPackageSize||product?.purchasePackageSize||"",product?.unit||product?.baseUnit||"");if(packed.unit===unitDef.unit&&packed.amount>0)baseAmount=packed.amount}if(!(baseAmount>0)&&unitDef.unit==="pcs")baseAmount=1;if(!(baseAmount>0))return null;return{unit:unitDef.unit,baseAmount,unitPrice:price/baseAmount,currency,date:"",supplierName:"",documentId:"",documentNumber:"",lineId:"",name:product?.name||"",packageSize:product?.packageSize||product?.displayPackageSize||product?.purchasePackageSize||"",packageKeys:[],source:"manual_nomenclature_price"}}\n`;
  input = input.replace(helperAnchor, helper + helperAnchor);

  const rowStart = input.indexOf("function bdTechCostRowV376");
  const rowEnd = input.indexOf("function bdAssortmentFallbackAnalyticsV170", rowStart);
  if (rowStart < 0 || rowEnd <= rowStart) throw new Error(`${label}: tech-card cost row boundary not found`);

  const amountAnchor = "  const effectiveIngredient=";
  const amountIndex = input.indexOf(amountAnchor, rowStart);
  if (amountIndex < 0 || amountIndex >= rowEnd) throw new Error(`${label}: effective ingredient anchor not found`);

  const fallback = `  const bdManualProductKeyV409=canonical(product?.productKey||product?.key||product?.purchaseProductKey||product?.nomenclatureItemId||product?.id),bdManualProductEntriesV409=bdManualProductKeyV409?maps.pricesByKey.get(bdManualProductKeyV409)||[]:[],bdManualNamedEntriesV409=bdTechCostUniqueNamedV381(bdTechCostIdentityKeysV382(nameValue,packageValue).flatMap(candidate=>maps.pricesByName.get(candidate)||[])),bdHasPostedPurchaseV409=requestedEntries.length>0||bdManualProductEntriesV409.length>0||bdManualNamedEntriesV409.length>0;if(!point&&!bdHasPostedPurchaseV409&&product&&bdManualProductKeyV409&&bdManualProductKeyV409===key){const bdManualPointV409=bdTechCostManualPointV409(product);if(bdManualPointV409)point=bdManualPointV409}\n`;
  input = input.slice(0, amountIndex) + fallback + input.slice(amountIndex);

  const updatedRowEnd = input.indexOf("function bdAssortmentFallbackAnalyticsV170", rowStart);
  let row = input.slice(rowStart, updatedRowEnd);
  const sourceAnchor = 'source:"latest_confirmed_purchase"';
  const sourceCount = row.split(sourceAnchor).length - 1;
  if (sourceCount !== 1) throw new Error(`${label}: purchase source anchor expected once, found ${sourceCount}`);
  row = row.replace(sourceAnchor, 'source:point?.source||"latest_confirmed_purchase"');
  input = input.slice(0, rowStart) + row + input.slice(updatedRowEnd);

  return input;
}

let source = fs.readFileSync(bundlePath, "utf8");
source = patchBundle(source, "Canonical manual nomenclature cost fallback");
fs.writeFileSync(bundlePath, source);

if (fs.existsSync(distBundlePath)) {
  const distSource = fs.readFileSync(distBundlePath, "utf8");
  fs.writeFileSync(distBundlePath, patchBundle(distSource, "Packaged manual nomenclature cost fallback"));
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
    (match, version) => version.includes(marker) ? match : `${match}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
