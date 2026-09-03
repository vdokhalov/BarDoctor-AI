import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-unit-product-cost-trace-v383";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(label + ": start marker not found");
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(label + ": end marker not found");
  return input.slice(0, startIndex) + replacement + input.slice(endIndex);
}

if (!source.includes(marker)) {
  if (!source.includes("bd-unit-product-costing-v382")) {
    throw new Error("v383 requires the v382 unit-product costing bundle");
  }

  const replacement = String.raw`/* bd-unit-product-cost-trace-v383 */
function bdTechCostTraceTextV383(value){return String(value??"").replace(/[\r\n\t]+/g," ").slice(0,180)}
function bdTechCostTraceNumberV383(value){const parsed=Number(value);return Number.isFinite(parsed)?parsed:null}
function bdTechCostTraceEntityV383(value,key){if(!value)return null;return{key:bdTechCostTraceTextV383(key),name:bdTechCostTraceTextV383(value?.name),rawName:bdTechCostTraceTextV383(value?.rawName),nomenclatureName:bdTechCostTraceTextV383(value?.nomenclatureName),unit:bdTechCostTraceTextV383(value?.unit),baseUnit:bdTechCostTraceTextV383(value?.baseUnit),packageSize:bdTechCostTraceTextV383(value?.packageSize),displayPackageSize:bdTechCostTraceTextV383(value?.displayPackageSize),purchasePackageSize:bdTechCostTraceTextV383(value?.purchasePackageSize),packageOptions:bdCatArray(value?.packageOptions).slice(0,4).map(item=>bdTechCostTraceTextV383(typeof item==="string"?item:item?.label||item?.packageSize)),averageUnitCost:bdTechCostTraceNumberV383(value?.averageUnitCost),unitPrice:bdTechCostTraceNumberV383(value?.unitPrice),currency:bdTechCostTraceTextV383(value?.currency),date:bdTechCostTraceTextV383(value?.date)}}
function bdTechCostTraceCandidateV383(entry){return bdTechCostTraceEntityV383(entry?.value,entry?.key)}
function bdTechCostTraceTargetV383(value){return /(?:sprite|спрайт|cola|кола|coca.?cola|кока.?кола)/i.test(String(value||""))}
function bdTechCostTraceScheduleV383(record){if(typeof window==="undefined"||!bdTechCostTraceTargetV383(record?.ingredient?.name))return;let activeVenueId="";try{activeVenueId=localStorage.getItem("bd_active_venue_id")||""}catch{}if(String(activeVenueId)!=="1")return;const records=Array.isArray(window.__bdUnitProductCostTraceV383)?window.__bdUnitProductCostTraceV383:[],signature=JSON.stringify([record?.ingredient?.name,record?.ingredient?.quantity,record?.ingredient?.unit,record?.resolution?.requestedKey,record?.resolution?.resolvedKey,record?.resolution?.amount,record?.resolution?.unit,record?.resolution?.unitPrice,record?.resolution?.reason]);if(!records.some(item=>item.signature===signature)&&records.length<16)records.push({signature,record});window.__bdUnitProductCostTraceV383=records;clearTimeout(window.__bdUnitProductCostTraceTimerV383);window.__bdUnitProductCostTraceTimerV383=setTimeout(()=>{let sent=!1;try{sent=sessionStorage.getItem("bd-unit-product-cost-trace-v383-sent")==="1"}catch{}if(sent)return;const payload={version:"v383",kind:"unit_product_costing_trace_v383",source:"assortment_local_costing",path:location.pathname,costingTrace:{activeVenueId:Number(activeVenueId),records:records.map(item=>item.record)}};fetch("/api/client-runtime-diagnostic",{method:"POST",headers:{"Content-Type":"application/json","x-venue-id":String(activeVenueId)},body:JSON.stringify(payload),cache:"no-store"}).then(response=>{if(response.ok)try{sessionStorage.setItem("bd-unit-product-cost-trace-v383-sent","1")}catch{}}).catch(()=>{})},700)}
function bdTechCostRowV376(ingredient,maps,canonical){const rawAmount=bdTechCostAmountV376(ingredient),requestedKey=canonical(ingredient?.purchaseProductKey||ingredient?.productKey||ingredient?.canonicalProductKey||ingredient?.nomenclatureItemId),packageValue=ingredient?.packageSize||ingredient?.packageLabel;let key=requestedKey,balance=maps.balances.get(key),point=maps.prices.get(key),product=maps.products.get(key);const namedProducts=bdTechCostNamedValuesV382(maps.productsByName,ingredient?.matchedName||ingredient?.canonicalName||ingredient?.name,packageValue),namedBalances=bdTechCostNamedValuesV382(maps.balancesByName,ingredient?.matchedName||ingredient?.canonicalName||ingredient?.name,packageValue),namedPrices=bdTechCostNamedValuesV382(maps.pricesByName,ingredient?.matchedName||ingredient?.canonicalName||ingredient?.name,packageValue);if(!product&&namedProducts.length===1){product=namedProducts[0].value;if(!key)key=namedProducts[0].key}if(!balance&&namedBalances.length===1){balance=namedBalances[0].value;if(!point)key=namedBalances[0].key}if(!point&&namedPrices.length===1){point=namedPrices[0].value;key=namedPrices[0].key;product=maps.products.get(key)||product;balance=maps.balances.get(key)||balance}const amount=bdTechCostResolvedAmountV380(rawAmount,ingredient,product,balance,point),balanceUnit=bdTechCostUnitV376(balance?.unit||balance?.baseUnit).unit,average=bdAssortmentNumberV170(balance?.averageUnitCost,0),useBalance=average>0&&balanceUnit===amount.unit,unitPrice=useBalance?average:point?.unit===amount.unit?point.unitPrice:0,currency=String(useBalance?balance?.currency||point?.currency||"":point?.currency||"").toUpperCase(),name=ingredient?.matchedName||ingredient?.canonicalName||product?.name||balance?.name||point?.name||ingredient?.name||"Ингредиент";let result;if(!key)result={id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"mapping",productKey:"",amount:amount.amount};else if(amount.unit==="unknown")result={id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"unit",productKey:key,amount:amount.amount};else if(!(unitPrice>0&&currency))result={id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"price",productKey:key,amount:amount.amount};else result={id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!0,reason:null,productKey:key,amount:amount.amount,normalizedUnit:amount.unit,packageLabel:amount.packageLabel||null,unitPrice,cost:Math.round(amount.amount*unitPrice*100)/100,currency,source:useBalance?"weighted_inventory_average":"latest_confirmed_purchase"};bdTechCostTraceScheduleV383({ingredient:{name:ingredient?.name||name,matchedName:ingredient?.matchedName,canonicalName:ingredient?.canonicalName,quantity:ingredient?.quantity,unit:ingredient?.unit,packageSize:ingredient?.packageSize,packageLabel:ingredient?.packageLabel,purchaseProductKey:ingredient?.purchaseProductKey},resolution:{requestedKey,resolvedKey:key,rawAmount:rawAmount.amount,rawUnit:rawAmount.unit,amount:amount.amount,unit:amount.unit,balanceUnit,averageUnitCost:average,useBalance,unitPrice,currency,cost:result.cost,reason:result.reason},product:bdTechCostTraceEntityV383(product,key),balance:bdTechCostTraceEntityV383(balance,key),point:bdTechCostTraceEntityV383(point,key),namedProducts:namedProducts.map(bdTechCostTraceCandidateV383),namedBalances:namedBalances.map(bdTechCostTraceCandidateV383),namedPrices:namedPrices.map(bdTechCostTraceCandidateV383),mapSizes:{products:maps.products.size,balances:maps.balances.size,prices:maps.prices.size}});return result}
`;

  source = replaceSegment(
    source,
    "function bdTechCostRowV376",
    "function bdAssortmentFallbackAnalyticsV170",
    replacement,
    "Unit product production trace",
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
