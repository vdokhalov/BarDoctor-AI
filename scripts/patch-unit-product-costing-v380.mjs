import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-unit-product-costing-v380b";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(label + ": start marker not found");
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(label + ": end marker not found");
  return input.slice(0, startIndex) + replacement + input.slice(endIndex);
}

if (!source.includes(marker)) {
  const replacement = String.raw`/* bd-unit-product-costing-v380b */
function bdTechCostCanonicalV376(state){const aliases=new Map;for(const item of [...bdCatArray(state.canonicalProductAliases),...bdCatArray(state.inventoryProductAliases)]){const from=String(item?.from||"").trim(),to=String(item?.to||"").trim();if(from&&to&&from!==to)aliases.set(from,to)}for(const item of [...bdCatArray(state.nomenclature),...bdCatArray(state.stockBalances)]){const to=String(item?.productKey||item?.key||item?.id||"").trim();if(!to)continue;for(const raw of [item?.id,item?.nomenclatureItemId,item?.key,item?.productKey]){const from=String(raw||"").trim();if(from&&from!==to)aliases.set(from,to)}}return initial=>{let key=String(initial||"").trim(),guard=0;while(aliases.has(key)&&guard++<50)key=aliases.get(key);return key}}
function bdTechCostAmountV376(item){const normalized=bdAssortmentNumberV170(item?.normalizedQuantity,NaN),normalizedUnit=bdTechCostUnitV376(item?.normalizedUnit);if(Number.isFinite(normalized)&&normalized>=0&&normalizedUnit.unit!=="unknown")return{amount:normalized*normalizedUnit.factor,unit:normalizedUnit.unit};const raw=bdAssortmentNumberV170(item?.quantity,NaN),rawUnit=bdTechCostUnitV376(item?.unit);return Number.isFinite(raw)&&raw>=0&&rawUnit.unit!=="unknown"?{amount:raw*rawUnit.factor,unit:rawUnit.unit}:{amount:Number.isFinite(raw)?raw:0,unit:"unknown"}}
function bdTechCostPackageV380(value,fallbackUnit){const label=String(value||"").toLocaleLowerCase("ru-RU").replace(/,/g,"."),match=label.match(/(\d+(?:\.\d+)?)\s*(кг|kg|г|гр|g|л|l|мл|ml|шт|pcs)/);if(match){const unit=bdTechCostUnitV376(match[2]);return{amount:Number(match[1])*unit.factor,unit:unit.unit,label:String(value||"")}}const fallback=bdTechCostUnitV376(fallbackUnit);return fallback.unit==="unknown"?{amount:0,unit:"unknown",label:String(value||"")}:{amount:1,unit:fallback.unit,label:String(value||"")}}
function bdTechCostMapsV376(state,purchases,canonical){const balances=new Map,prices=new Map,products=new Map,lineLinks=new Map;for(const mapping of bdCatArray(state.supplierProductMappings)){const key=canonical(mapping?.canonicalProductKey);if(!key)continue;for(const lineId of bdCatArray(mapping?.purchaseLineIds)){const id=String(lineId||"").trim();if(id)lineLinks.set(id,key)}}for(const product of [...bdCatArray(state.nomenclature),...bdCatArray(state.stockBalances)]){const key=canonical(product?.productKey||product?.key||product?.purchaseProductKey||product?.nomenclatureItemId||product?.id);if(key)products.set(key,{...(products.get(key)||{}),...product})}for(const balance of bdCatArray(state.stockBalances)){const key=canonical(balance?.productKey||balance?.key||balance?.purchaseProductKey||balance?.nomenclatureItemId||balance?.id);if(key)balances.set(key,balance)}for(const document of bdCatArray(purchases)){if(document?.status!=="confirmed")continue;for(const line of bdCatArray(document?.items)){const key=canonical(line?.purchaseProductKey||line?.productKey||line?.canonicalProductKey||lineLinks.get(String(line?.id||""))||line?.nomenclatureId);if(!key)continue;const quantity=bdAssortmentNumberV170(line?.quantity,0),product=products.get(key),productUnit=bdTechCostUnitV376(product?.unit||product?.baseUnit),lineUnit=bdTechCostUnitV376(line?.unit);let resolved=lineUnit,baseAmount=quantity*lineUnit.factor;if(lineUnit.unit==="pcs"&&productUnit.unit!=="pcs"){const packed=bdTechCostPackageV380(line?.packageSize,line?.unit);if(packed.unit!=="unknown"&&packed.unit!=="pcs"){resolved={unit:packed.unit,factor:1};baseAmount=quantity*packed.amount}}const total=Math.max(0,bdAssortmentNumberV170(line?.lineTotal,0)||bdAssortmentNumberV170(line?.unitPrice,0)*quantity);if(!(baseAmount>0&&total>0&&resolved.unit!=="unknown"))continue;const point={unit:resolved.unit,unitPrice:total/baseAmount,currency:String(document?.currency||"RUB").toUpperCase(),date:String(document?.date||""),name:line?.name||"",packageSize:line?.packageSize||""},current=prices.get(key);if(!current||point.date>=current.date)prices.set(key,point)}}return{balances,prices,products}}
function bdTechCostResolvedAmountV380(amount,ingredient,product,balance,point){if(amount.unit!=="pcs")return amount;const target=bdTechCostUnitV376(balance?.unit||balance?.baseUnit||product?.unit||product?.baseUnit||point?.unit).unit;if(target==="unknown"||target==="pcs")return amount;const labels=[...bdCatArray(product?.packageOptions),product?.packageSize,product?.displayPackageSize,product?.purchasePackageSize,...bdCatArray(balance?.packageOptions),balance?.packageSize,balance?.displayPackageSize,balance?.purchasePackageSize,point?.packageSize].map(item=>typeof item==="string"?item:item?.label||item?.packageSize||"").filter(item=>item&&String(item).toLocaleLowerCase("ru-RU")!=="несколько фасовок"),packages=new Map;for(const label of labels){const packed=bdTechCostPackageV380(label,target);if(packed.amount>0&&packed.unit===target)packages.set(packed.unit+":"+packed.amount,packed)}if(packages.size!==1)return amount;const packed=[...packages.values()][0];return{amount:amount.amount*packed.amount,unit:packed.unit,packageLabel:packed.label,source:"single_known_package"}}
function bdTechCostRowV376(ingredient,maps,canonical){const rawAmount=bdTechCostAmountV376(ingredient),key=canonical(ingredient?.purchaseProductKey||ingredient?.productKey||ingredient?.canonicalProductKey||ingredient?.nomenclatureItemId),balance=maps.balances.get(key),point=maps.prices.get(key),product=maps.products.get(key),amount=bdTechCostResolvedAmountV380(rawAmount,ingredient,product,balance,point),balanceUnit=bdTechCostUnitV376(balance?.unit||balance?.baseUnit).unit,average=bdAssortmentNumberV170(balance?.averageUnitCost,0),useBalance=average>0&&balanceUnit===amount.unit,unitPrice=useBalance?average:point?.unit===amount.unit?point.unitPrice:0,currency=String(useBalance?balance?.currency||point?.currency||"":point?.currency||"").toUpperCase(),name=ingredient?.matchedName||ingredient?.canonicalName||product?.name||balance?.name||point?.name||ingredient?.name||"Ингредиент";if(!key)return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"mapping",productKey:"",amount:amount.amount};if(amount.unit==="unknown")return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"unit",productKey:key,amount:amount.amount};if(!(unitPrice>0&&currency))return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"price",productKey:key,amount:amount.amount};return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!0,reason:null,productKey:key,amount:amount.amount,normalizedUnit:amount.unit,packageLabel:amount.packageLabel||null,unitPrice,cost:Math.round(amount.amount*unitPrice*100)/100,currency,source:useBalance?"weighted_inventory_average":"latest_confirmed_purchase"}}
`;
  source = replaceSegment(
    source,
    "function bdTechCostCanonicalV376",
    "function bdAssortmentFallbackAnalyticsV170",
    replacement,
    "Unit product costing",
  );
}

fs.writeFileSync(bundlePath, source);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (_match, version) => {
    const normalizedVersion = version.replace(/-bd-unit-product-costing-v380(?:a|b)?/g, "");
    return "index-BQGspy0I.js?v=" + normalizedVersion + "-" + marker;
  });
  fs.writeFileSync(filePath, contents);
}

console.log(marker + ": applied");
