import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-unit-product-costing-v381";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(label + ": start marker not found");
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(label + ": end marker not found");
  return input.slice(0, startIndex) + replacement + input.slice(endIndex);
}

if (!source.includes(marker)) {
  const stateNeedle = "priceHistory:bdCatArray(t.priceHistory),nomenclature:bdCatArray(t.nomenclature),stockBalances:bdCatArray(t.stockBalances)";
  const stateReplacement = "priceHistory:bdCatArray(t.priceHistory),canonicalProductAliases:bdCatArray(t.canonicalProductAliases),inventoryProductAliases:bdCatArray(t.inventoryProductAliases),supplierProductMappings:bdCatArray(t.supplierProductMappings),nomenclature:bdCatArray(t.nomenclature),stockBalances:bdCatArray(t.stockBalances)";
  if (!source.includes(stateNeedle)) throw new Error("Catalog state identity fields: marker not found");
  source = source.replace(stateNeedle, stateReplacement);

  const mapsReplacement = String.raw`/* bd-unit-product-costing-v381 */
function bdTechCostNameV381(value){return String(value||"").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").replace(/,/g,".").replace(/milliliters?|millilitres?|миллилитр(?:а|ов)?/g,"мл").replace(/liters?|litres?|литр(?:а|ов)?|ltr/g,"л").replace(/[^a-zа-я0-9]+/gi,"")}
function bdTechCostNamedAddV381(map,raw,value){const name=bdTechCostNameV381(raw);if(!name)return;const list=map.get(name)||[];list.push(value);map.set(name,list)}
function bdTechCostUniqueNamedV381(values){const result=new Map;for(const entry of values||[]){const key=String(entry?.key||"")+":"+String(entry?.value?.unit||"")+":"+String(entry?.value?.packageSize||"");result.set(key,entry)}return[...result.values()]}
function bdTechCostMapsV376(state,purchases,canonical){const balances=new Map,prices=new Map,products=new Map,lineLinks=new Map,balancesByName=new Map,pricesByName=new Map,productsByName=new Map;for(const mapping of bdCatArray(state.supplierProductMappings)){const key=canonical(mapping?.canonicalProductKey);if(!key)continue;for(const lineId of bdCatArray(mapping?.purchaseLineIds)){const id=String(lineId||"").trim();if(id)lineLinks.set(id,key)}}for(const product of [...bdCatArray(state.nomenclature),...bdCatArray(state.stockBalances)]){const key=canonical(product?.productKey||product?.key||product?.purchaseProductKey||product?.nomenclatureItemId||product?.id);if(!key)continue;products.set(key,{...(products.get(key)||{}),...product});for(const name of [product?.name,product?.nomenclatureName,product?.matchedName])bdTechCostNamedAddV381(productsByName,name,{key,value:product})}for(const balance of bdCatArray(state.stockBalances)){const key=canonical(balance?.productKey||balance?.key||balance?.purchaseProductKey||balance?.nomenclatureItemId||balance?.id);if(!key)continue;balances.set(key,balance);for(const name of [balance?.name,balance?.nomenclatureName,balance?.matchedName])bdTechCostNamedAddV381(balancesByName,name,{key,value:balance})}for(const document of bdCatArray(purchases)){if(document?.status!=="confirmed")continue;for(const line of bdCatArray(document?.items)){const key=canonical(line?.purchaseProductKey||line?.productKey||line?.canonicalProductKey||lineLinks.get(String(line?.id||""))||line?.nomenclatureId);if(!key)continue;const quantity=bdAssortmentNumberV170(line?.quantity,0),product=products.get(key),productUnit=bdTechCostUnitV376(product?.unit||product?.baseUnit),lineUnit=bdTechCostUnitV376(line?.unit);let resolved=lineUnit,baseAmount=quantity*lineUnit.factor;if(lineUnit.unit==="pcs"&&productUnit.unit!=="pcs"){const packed=bdTechCostPackageV380(line?.packageSize,line?.unit);if(packed.unit!=="unknown"&&packed.unit!=="pcs"){resolved={unit:packed.unit,factor:1};baseAmount=quantity*packed.amount}}const total=Math.max(0,bdAssortmentNumberV170(line?.lineTotal,0)||bdAssortmentNumberV170(line?.unitPrice,0)*quantity);if(!(baseAmount>0&&total>0&&resolved.unit!=="unknown"))continue;const point={unit:resolved.unit,unitPrice:total/baseAmount,currency:String(document?.currency||"RUB").toUpperCase(),date:String(document?.date||""),name:line?.name||line?.nomenclatureName||line?.rawName||"",rawName:line?.rawName||"",nomenclatureName:line?.nomenclatureName||"",packageSize:line?.packageSize||""},current=prices.get(key);if(!current||point.date>=current.date)prices.set(key,point)}}for(const [key,point]of prices)for(const name of [point.name,point.rawName,point.nomenclatureName])bdTechCostNamedAddV381(pricesByName,name,{key,value:point});return{balances,prices,products,balancesByName,pricesByName,productsByName}}
`;
  source = replaceSegment(
    source,
    "function bdTechCostMapsV376",
    "function bdTechCostResolvedAmountV380",
    mapsReplacement,
    "Production identity maps",
  );

  const rowReplacement = String.raw`function bdTechCostRowV376(ingredient,maps,canonical){const rawAmount=bdTechCostAmountV376(ingredient),nameKey=bdTechCostNameV381(ingredient?.matchedName||ingredient?.canonicalName||ingredient?.name),requestedKey=canonical(ingredient?.purchaseProductKey||ingredient?.productKey||ingredient?.canonicalProductKey||ingredient?.nomenclatureItemId);let key=requestedKey,balance=maps.balances.get(key),point=maps.prices.get(key),product=maps.products.get(key);const namedProducts=bdTechCostUniqueNamedV381(maps.productsByName.get(nameKey)),namedBalances=bdTechCostUniqueNamedV381(maps.balancesByName.get(nameKey)),namedPrices=bdTechCostUniqueNamedV381(maps.pricesByName.get(nameKey));if(!product&&namedProducts.length===1){product=namedProducts[0].value;if(!key)key=namedProducts[0].key}if(!balance&&namedBalances.length===1){balance=namedBalances[0].value;if(!point)key=namedBalances[0].key}if(!point&&namedPrices.length===1){point=namedPrices[0].value;key=namedPrices[0].key;product=maps.products.get(key)||product;balance=maps.balances.get(key)||balance}const amount=bdTechCostResolvedAmountV380(rawAmount,ingredient,product,balance,point),balanceUnit=bdTechCostUnitV376(balance?.unit||balance?.baseUnit).unit,average=bdAssortmentNumberV170(balance?.averageUnitCost,0),useBalance=average>0&&balanceUnit===amount.unit,unitPrice=useBalance?average:point?.unit===amount.unit?point.unitPrice:0,currency=String(useBalance?balance?.currency||point?.currency||"":point?.currency||"").toUpperCase(),name=ingredient?.matchedName||ingredient?.canonicalName||product?.name||balance?.name||point?.name||ingredient?.name||"Ингредиент";if(!key)return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"mapping",productKey:"",amount:amount.amount};if(amount.unit==="unknown")return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"unit",productKey:key,amount:amount.amount};if(!(unitPrice>0&&currency))return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"price",productKey:key,amount:amount.amount};return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!0,reason:null,productKey:key,amount:amount.amount,normalizedUnit:amount.unit,packageLabel:amount.packageLabel||null,unitPrice,cost:Math.round(amount.amount*unitPrice*100)/100,currency,source:useBalance?"weighted_inventory_average":"latest_confirmed_purchase"}}
`;
  source = replaceSegment(
    source,
    "function bdTechCostRowV376",
    "function bdAssortmentFallbackAnalyticsV170",
    rowReplacement,
    "Production cost row",
  );
}

fs.writeFileSync(bundlePath, source);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : "index-BQGspy0I.js?v=" + version + "-" + marker,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(marker + ": applied");
