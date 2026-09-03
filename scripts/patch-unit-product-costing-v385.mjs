import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-unit-product-costing-v393";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(label + ": start marker not found");
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(label + ": end marker not found");
  return input.slice(0, startIndex) + replacement + input.slice(endIndex);
}

{
  const replacement = String.raw`/* bd-unit-product-costing-v385 bd-unit-product-costing-v386 bd-unit-product-costing-v387 bd-unit-product-costing-v389 bd-unit-product-costing-v390 bd-unit-product-costing-v391 bd-unit-product-costing-v392 bd-unit-product-costing-v393 */
function bdTechCostNameV381(value){return String(value||"").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").replace(/,/g,".").replace(/milliliters?|millilitres?|миллилитр(?:а|ов)?/g,"мл").replace(/liters?|litres?|литр(?:а|ов)?|ltr/g,"л").replace(/[^a-zа-я0-9]+/gi,"")}
function bdTechCostIdentityKeysV382(raw,packageValue){const source=String(raw||"").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").replace(/,/g,"."),explicit=bdTechCostPackageV380(packageValue,""),embedded=bdTechCostPackageV380(source,""),packed=explicit.unit!=="unknown"?explicit:embedded,baseSource=source.replace(/\d+(?:\.\d+)?\s*(?:кг|kg|г|гр|g|л|l|мл|ml|шт|pcs)\.?/g," "),normalized=bdTechCostNameV381(baseSource),waterFamily=normalized.replace(/^(?:водаминеральная|минеральнаявода|вода)/,"").replace(/(?:минеральнаявода|минеральная|газированнаявода|негазированнаявода|газированная|негазированная|вода)$/,"")||normalized,brand=/^(?:sprite|спрайт)$/.test(waterFamily)?"sprite":/^(?:cocacola|кокакола|cola|кола)$/.test(waterFamily)?"cola":waterFamily,keys=[];if(packed.unit!=="unknown"&&packed.amount>0&&brand)keys.push("package:"+brand+":"+packed.unit+":"+packed.amount);const exact=bdTechCostNameV381(raw);if(exact)keys.push("exact:"+exact);if(brand)keys.push("base:"+brand);return[...new Set(keys)]}
function bdTechCostNamedAddV381(map,raw,value,packageValue){for(const name of bdTechCostIdentityKeysV382(raw,packageValue)){const list=map.get(name)||[];list.push(value);map.set(name,list)}}
function bdTechCostUniqueNamedV381(values){const result=new Map;for(const entry of values||[]){const key=String(entry?.key||"")+":"+String(entry?.value?.unit||"")+":"+String(entry?.value?.packageSize||"")+":"+String(entry?.value?.order||"");result.set(key,entry)}return[...result.values()]}
function bdTechCostStrictNamedV385(map,raw,packageValue){const keys=bdTechCostIdentityKeysV382(raw,packageValue).filter(key=>!key.startsWith("base:"));return bdTechCostUniqueNamedV381(keys.flatMap(key=>map.get(key)||[]))}
function bdTechCostPostedV385(document){return["confirmed","posted","conducted"].includes(String(document?.status||"").trim().toLocaleLowerCase("ru-RU"))}
function bdTechCostPointOrderV385(document,documentIndex,lineIndex){const date=String(document?.date||document?.documentDate||"").slice(0,10),confirmed=String(document?.confirmedAt||document?.postedAt||document?.conductedAt||document?.updatedAt||document?.createdAt||"");return date+"|"+confirmed+"|"+String(documentIndex).padStart(8,"0")+"|"+String(lineIndex).padStart(6,"0")}
function bdTechCostLatestPointV385(entries){return bdTechCostUniqueNamedV381(entries).filter(entry=>bdAssortmentNumberV170(entry?.value?.unitPrice,0)>0).sort((left,right)=>String(right?.value?.order||"").localeCompare(String(left?.value?.order||"")))[0]||null}
function bdTechCostPackageKeyV386(value){const packed=bdTechCostPackageV380(value,"");return packed.unit!=="unknown"&&packed.unit!=="pcs"&&packed.amount>0?packed.unit+":"+packed.amount:""}
function bdTechCostPointPackageKeysV386(line){return[...new Set([line?.packageSize,line?.packageLabel,line?.name,line?.rawName,line?.nomenclatureName].map(bdTechCostPackageKeyV386).filter(Boolean))]}
function bdTechCostMenuPackageV386(menuItem){const saleSize=menuItem?.saleSize;if(saleSize&&typeof saleSize==="object"&&bdAssortmentNumberV170(saleSize.quantity,0)>0&&saleSize.unit)return String(saleSize.quantity)+" "+String(saleSize.unit);return typeof saleSize==="string"?saleSize:String(menuItem?.portionSize||menuItem?.legacyPortionSize||menuItem?.readyProduct?.packageLabel||"")}
function bdTechCostDimensionalPackageV389(value){const packed=bdTechCostPackageV380(value,"");return packed.unit!=="unknown"&&packed.unit!=="pcs"&&packed.amount>0?packed:null}
function bdTechCostPackagePointV386(entries,packageKey){const values=bdTechCostUniqueNamedV381(entries);if(packageKey)return bdTechCostLatestPointV385(values.filter(entry=>bdCatArray(entry?.value?.packageKeys).includes(packageKey)));const identities=new Set(values.flatMap(entry=>bdCatArray(entry?.value?.packageKeys)));return identities.size>1?null:bdTechCostLatestPointV385(values)}
function bdTechCostAggregatePointV392(entries,packageKey){const parts=String(packageKey||"").split(":"),unit=parts[0],amount=bdAssortmentNumberV170(parts[1],0),values=bdTechCostUniqueNamedV381(entries);if(!unit||!(amount>0)||!values.length||!values.every(entry=>{const point=entry?.value,baseAmount=bdAssortmentNumberV170(point?.baseAmount,0);if(point?.unit!==unit||baseAmount<amount)return!1;const packages=baseAmount/amount;return Math.abs(packages-Math.round(packages))<1e-6}))return null;return bdTechCostLatestPointV385(values)}
function bdTechCostMapsV376(state,purchases,canonical){
  const balances=new Map,prices=new Map,pricesByKey=new Map,products=new Map,lineLinks=new Map,balancesByName=new Map,pricesByName=new Map,productsByName=new Map;
  for(const mapping of bdCatArray(state.supplierProductMappings)){
    const key=canonical(mapping?.canonicalProductKey);if(!key)continue;
    for(const lineId of bdCatArray(mapping?.purchaseLineIds)){const id=String(lineId||"").trim();if(id)lineLinks.set(id,key)}
  }
  for(const product of [...bdCatArray(state.nomenclature),...bdCatArray(state.stockBalances)]){
    const key=canonical(product?.productKey||product?.key||product?.purchaseProductKey||product?.nomenclatureItemId||product?.id);if(!key)continue;
    products.set(key,{...(products.get(key)||{}),...product});
    for(const name of [product?.name,product?.nomenclatureName,product?.matchedName])bdTechCostNamedAddV381(productsByName,name,{key,value:product},product?.packageSize||product?.displayPackageSize||product?.purchasePackageSize)
  }
  for(const balance of bdCatArray(state.stockBalances)){
    const key=canonical(balance?.productKey||balance?.key||balance?.purchaseProductKey||balance?.nomenclatureItemId||balance?.id);if(!key)continue;
    balances.set(key,balance);
    for(const name of [balance?.name,balance?.nomenclatureName,balance?.matchedName])bdTechCostNamedAddV381(balancesByName,name,{key,value:balance},balance?.packageSize||balance?.displayPackageSize||balance?.purchasePackageSize)
  }
  for(const [documentIndex,document]of bdCatArray(purchases).entries()){
    if(!bdTechCostPostedV385(document))continue;
    for(const [lineIndex,line]of bdCatArray(document?.items).entries()){
      const mappedKey=canonical(line?.purchaseProductKey||line?.productKey||line?.canonicalProductKey||lineLinks.get(String(line?.id||""))||line?.nomenclatureId),pointName=line?.name||line?.nomenclatureName||line?.rawName||"",pointPackages=bdTechCostPointPackageKeysV386(line),fallbackIdentity=bdTechCostIdentityKeysV382(pointName,line?.packageSize||line?.packageLabel||pointName).find(value=>value.startsWith("package:"))||bdTechCostIdentityKeysV382(pointName,line?.packageSize||line?.packageLabel||pointName).find(value=>value.startsWith("exact:")),key=mappedKey||(fallbackIdentity?"unmapped:"+fallbackIdentity:"");if(!key)continue;
      const quantity=bdAssortmentNumberV170(line?.quantity,0),product=products.get(key),productUnit=bdTechCostUnitV376(product?.unit||product?.baseUnit),lineUnit=bdTechCostUnitV376(line?.unit);
      let resolved=lineUnit,baseAmount=quantity*lineUnit.factor;
      if(lineUnit.unit==="pcs"&&productUnit.unit!=="pcs"){
        const packed=bdTechCostPackageV380(line?.packageSize,line?.unit);
        if(packed.unit!=="unknown"&&packed.unit!=="pcs"){resolved={unit:packed.unit,factor:1};baseAmount=quantity*packed.amount}
      }
      const total=Math.max(0,bdAssortmentNumberV170(line?.lineTotal,0)||bdAssortmentNumberV170(line?.unitPrice,0)*quantity);
      if(!(baseAmount>0&&total>0&&resolved.unit!=="unknown"))continue;
      const point={unit:resolved.unit,baseAmount,unitPrice:total/baseAmount,currency:String(document?.currency||"RUB").toUpperCase(),date:String(document?.date||document?.documentDate||""),order:bdTechCostPointOrderV385(document,documentIndex,lineIndex),supplierName:String(document?.supplierName||document?.supplier?.name||""),documentId:String(document?.id||""),documentNumber:String(document?.documentNumber||document?.number||""),lineId:String(line?.id||""),name:pointName,rawName:line?.rawName||"",nomenclatureName:line?.nomenclatureName||"",packageSize:line?.packageSize||line?.packageLabel||pointName||"",packageKeys:pointPackages};
      const entry={key,value:point},byKey=pricesByKey.get(key)||[];byKey.push(entry);pricesByKey.set(key,byKey);
      for(const name of [point.name,point.rawName,point.nomenclatureName])bdTechCostNamedAddV381(pricesByName,name,entry,point.packageSize);
      const current=prices.get(key);if(!current||point.order>=current.order)prices.set(key,point)
    }
  }
  return{balances,prices,pricesByKey,products,balancesByName,pricesByName,productsByName}
}
function bdTechCostResolvedAmountV385(amount,ingredient,product,point){if(amount.unit!=="pcs")return amount;const pointUnit=bdTechCostUnitV376(point?.unit).unit;if(pointUnit==="unknown"||pointUnit==="pcs")return amount;const ingredientPackages=new Map;for(const label of [ingredient?.packageSize,ingredient?.packageLabel,ingredient?.name].filter(Boolean)){const packed=bdTechCostPackageV380(label,"");if(packed.amount>0&&packed.unit===pointUnit)ingredientPackages.set(packed.unit+":"+packed.amount,packed)}if(ingredientPackages.size===1){const packed=[...ingredientPackages.values()][0];return{amount:amount.amount*packed.amount,unit:packed.unit,packageLabel:packed.label,source:"ingredient_exact_package"}}const productPackages=new Map;for(const label of [...bdCatArray(product?.packageOptions),product?.packageSize,product?.displayPackageSize,product?.purchasePackageSize].map(item=>typeof item==="string"?item:item?.label||item?.packageSize||"").filter(Boolean)){const packed=bdTechCostPackageV380(label,"");if(packed.amount>0&&packed.unit===pointUnit)productPackages.set(packed.unit+":"+packed.amount,packed)}if(productPackages.size!==1)return amount;const packed=[...productPackages.values()][0];return{amount:amount.amount*packed.amount,unit:packed.unit,packageLabel:packed.label,source:"product_exact_package"}}
function bdTechCostRowV376(ingredient,maps,canonical,menuItem,menuPackageHint){
  const rawAmount=bdTechCostAmountV376(ingredient),requestedKey=canonical(ingredient?.purchaseProductKey||ingredient?.productKey||ingredient?.canonicalProductKey||ingredient?.nomenclatureItemId),menuPackage=String(menuPackageHint||bdTechCostMenuPackageV386(menuItem)||""),ingredientPackage=String(ingredient?.packageSize||ingredient?.packageLabel||""),ingredientDimensional=bdTechCostDimensionalPackageV389(ingredientPackage),menuDimensional=bdTechCostDimensionalPackageV389(menuPackage),packageValue=ingredientDimensional?ingredientPackage:menuDimensional?menuPackage:ingredientPackage||ingredient?.name,nameValue=ingredient?.matchedName||ingredient?.canonicalName||ingredient?.name,packageKey=bdTechCostPackageKeyV386(packageValue);
  const requestedEntries=maps.pricesByKey.get(requestedKey)||[],requestedPoint=bdTechCostPackagePointV386(requestedEntries,packageKey)||bdTechCostAggregatePointV392(requestedEntries,packageKey);
  let key=requestedKey,point=requestedPoint?.value,product=maps.products.get(key);
  if(!point){
    const namedEntries=bdTechCostStrictNamedV385(maps.pricesByName,nameValue,packageValue),latest=bdTechCostPackagePointV386(namedEntries,packageKey)||bdTechCostAggregatePointV392(namedEntries,packageKey);
    if(latest){key=latest.key;point=latest.value;product=maps.products.get(key)||product}
  }
  if(!product){
    const candidates=bdTechCostStrictNamedV385(maps.productsByName,nameValue,packageValue),keys=new Map(candidates.map(entry=>[String(entry.key),entry]));
    if(keys.size===1)product=[...keys.values()][0].value
  }
  const effectiveIngredient=packageValue&&bdTechCostPackageKeyV386(packageValue)?{...ingredient,packageSize:packageValue,packageLabel:packageValue}:ingredient,amount=bdTechCostResolvedAmountV385(rawAmount,effectiveIngredient,product,point),pointUnit=bdTechCostUnitV376(point?.unit).unit,unitPrice=pointUnit===amount.unit?bdAssortmentNumberV170(point?.unitPrice,0):0,currency=String(point?.currency||"").toUpperCase(),name=ingredient?.matchedName||ingredient?.canonicalName||product?.name||point?.name||ingredient?.name||"Ингредиент";
  if(!key)return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"mapping",productKey:"",amount:amount.amount};
  if(amount.unit==="unknown")return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"unit",productKey:key,amount:amount.amount};
  if(point&&pointUnit!==amount.unit)return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:rawAmount.unit==="pcs"?"price":"unit",productKey:key,amount:amount.amount};
  if(!(unitPrice>0&&currency))return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"price",productKey:key,amount:amount.amount};
  return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!0,reason:null,productKey:key,amount:amount.amount,normalizedUnit:amount.unit,packageLabel:packageValue||amount.packageLabel||point.packageSize||null,unitPrice,cost:Math.round(amount.amount*unitPrice*100)/100,currency,source:"latest_confirmed_purchase",purchaseDate:point.date||null,supplierName:point.supplierName||null,purchaseDocumentId:point.documentId||null,purchaseDocumentNumber:point.documentNumber||null,purchasePackageSize:point.packageSize||null}
}
function bdTechCostLineAmountV393(row){const packageLabel=String(row?.packageLabel||"").trim();if(packageLabel)return packageLabel;const amount=row?.amount!=null?row.amount:row?.quantity!=null?row.quantity:"—",unit=row?.normalizedUnit||row?.unit;return String(amount).replace(".",",")+" "+bdAssortmentUnitLabelV293(unit)}
`;

  source = replaceSegment(
    source,
    "function bdTechCostNameV381",
    "function bdAssortmentFallbackAnalyticsV170",
    replacement,
    "Latest confirmed exact-SKU costing",
  );

  const analyticsCall = "rows=g.map(item=>bdTechCostRowV376(item,maps,canonical))";
  const packageAwareAnalyticsCallV386 = "rows=g.map(item=>bdTechCostRowV376(item,maps,canonical,g.length===1?m:null))";
  const packageAwareAnalyticsCall = 'rows=g.map(item=>bdTechCostRowV376(item,maps,canonical,g.length===1?m:null,g.length===1?bdMenuSaleSizeTextV298(m.saleSize||bdMenuLegacySizeV298(m.legacyPortionSize||m.portionSize)):""))';
  if (source.includes(analyticsCall)) source = source.replace(analyticsCall, packageAwareAnalyticsCall);
  else if (source.includes(packageAwareAnalyticsCallV386)) source = source.replace(packageAwareAnalyticsCallV386, packageAwareAnalyticsCall);
  else if (!source.includes(packageAwareAnalyticsCall)) throw new Error("Package-aware menu costing call not found");

  const ingredientSummary = 'i.jsxs("span",{children:[i.jsx("strong",{children:g.name}),i.jsxs("small",{children:[g.quantity!=null?g.quantity:"—"," ",bdAssortmentUnitLabelV293(g.unit)]})]})';
  const previousIngredientTrace = 'i.jsxs("span",{children:[i.jsx("strong",{children:g.name}),i.jsxs("small",{children:[g.quantity!=null?g.quantity:"—"," ",bdAssortmentUnitLabelV293(g.unit)]}),g.complete&&g.purchaseDate&&i.jsxs("small",{className:"bd-cost-source-v386",children:["Основание: последний приход ",bdProcDateV168(g.purchaseDate),g.supplierName?" · "+g.supplierName:"",g.purchaseDocumentNumber?" · №"+g.purchaseDocumentNumber:"",g.purchasePackageSize?" · "+g.purchasePackageSize:""]})]})';
  const priorIngredientTrace = 'i.jsxs("span",{children:[i.jsx("strong",{children:g.name}),i.jsx("small",{children:bdTechCostLineAmountV392(g)}),g.complete&&g.purchaseDate&&i.jsxs("small",{className:"bd-cost-source-v386",children:["Основание: последний приход ",bdProcDateV168(g.purchaseDate),g.supplierName?" · "+g.supplierName:"",g.purchaseDocumentNumber?" · №"+g.purchaseDocumentNumber:"",g.purchasePackageSize?" · "+g.purchasePackageSize:""]})]})';
  const ingredientTrace = 'i.jsxs("span",{children:[i.jsx("strong",{children:g.name}),i.jsx("small",{children:bdTechCostLineAmountV393(g)}),g.complete&&g.purchaseDate&&i.jsxs("small",{className:"bd-cost-source-v386",children:["Основание: последний приход ",bdProcDateV168(g.purchaseDate),g.supplierName?" · "+g.supplierName:"",g.purchaseDocumentNumber?" · №"+g.purchaseDocumentNumber:"",g.purchasePackageSize?" · "+g.purchasePackageSize:""]})]})';
  if (source.includes(ingredientSummary)) source = source.replace(ingredientSummary, ingredientTrace);
  else if (source.includes(previousIngredientTrace)) source = source.replace(previousIngredientTrace, ingredientTrace);
  else if (source.includes(priorIngredientTrace)) source = source.replace(priorIngredientTrace, ingredientTrace);
  else if (!source.includes(ingredientTrace)) throw new Error("Ingredient purchase trace anchor not found");

  const listIngredientAmount = 'i.jsxs("small",{children:[v.quantity!=null?v.quantity:"—"," ",bdAssortmentUnitLabelV293(v.unit),v.complete?" · "+bdAssortmentMoneyV170(v.cost,v.currency):v.reason==="mapping"?" · Не связано с номенклатурой":v.reason==="unit"?" · Неверная единица":" · Стоимость неизвестна"]})';
  const listIngredientAmountV393 = 'i.jsxs("small",{children:[bdTechCostLineAmountV393(v),v.complete?" · "+bdAssortmentMoneyV170(v.cost,v.currency):v.reason==="mapping"?" · Не связано с номенклатурой":v.reason==="unit"?" · Неверная единица":" · Стоимость неизвестна"]})';
  if (source.includes(listIngredientAmount)) source = source.replace(listIngredientAmount, listIngredientAmountV393);
  else if (!source.includes(listIngredientAmountV393)) throw new Error("Recipe list ingredient amount anchor not found");

  const distBundlePath = path.join(root, "dist/client/assets/index-BQGspy0I.js");
  if (fs.existsSync(distBundlePath)) {
    let distSource = fs.readFileSync(distBundlePath, "utf8");
    distSource = replaceSegment(
      distSource,
      "function bdTechCostNameV381",
      "function bdAssortmentFallbackAnalyticsV170",
      replacement,
      "Packaged latest confirmed exact-SKU costing",
    );
    if (distSource.includes(analyticsCall)) distSource = distSource.replace(analyticsCall, packageAwareAnalyticsCall);
    else if (distSource.includes(packageAwareAnalyticsCallV386)) distSource = distSource.replace(packageAwareAnalyticsCallV386, packageAwareAnalyticsCall);
    else if (!distSource.includes(packageAwareAnalyticsCall)) throw new Error("Packaged package-aware menu costing call not found");
    if (distSource.includes(ingredientSummary)) distSource = distSource.replace(ingredientSummary, ingredientTrace);
    else if (distSource.includes(previousIngredientTrace)) distSource = distSource.replace(previousIngredientTrace, ingredientTrace);
    else if (distSource.includes(priorIngredientTrace)) distSource = distSource.replace(priorIngredientTrace, ingredientTrace);
    else if (!distSource.includes(ingredientTrace)) throw new Error("Packaged ingredient purchase trace anchor not found");
    if (distSource.includes(listIngredientAmount)) distSource = distSource.replace(listIngredientAmount, listIngredientAmountV393);
    else if (!distSource.includes(listIngredientAmountV393)) throw new Error("Packaged recipe list ingredient amount anchor not found");
    fs.writeFileSync(distBundlePath, distSource);
  }
}

{
  const staleHydration = 'S.useEffect(()=>{if(!n)return;_(bdCatState(xr(bdCatalogStoreKey))),x(bdCatArray(xr(bdPurchaseStoreKey))),F(bdCatArray(xr("bd_sales_documents")))},[n,s.activeVenueId]);S.useEffect(()=>{if(!n||!s.activeVenueId)return;';
  const authoritativeHydration = 'S.useEffect(()=>{let w=!1;const R=()=>{_(bdCatState(xr(bdCatalogStoreKey))),x(bdCatArray(xr(bdPurchaseStoreKey))),F(bdCatArray(xr("bd_sales_documents")))},P=oe=>{(!oe?.detail?.storeKey||[bdCatalogStoreKey,bdPurchaseStoreKey,"bd_sales_documents"].includes(oe.detail.storeKey))&&R()};R(),window.addEventListener("bd:store-updated",P);const c=Ot();return s.activeVenueId&&c&&Promise.all([Yse(bdCatalogStoreKey,c),Yse(bdPurchaseStoreKey,c),Yse("bd_sales_documents",c)]).then(([p,oe,ie])=>{w||(p!==void 0&&(Vm(bdCatalogStoreKey,p),_(bdCatState(p))),oe!==void 0&&(Vm(bdPurchaseStoreKey,oe),x(bdCatArray(oe))),ie!==void 0&&(Vm("bd_sales_documents",ie),F(bdCatArray(ie))))}).catch(()=>{}),()=>{w=!0,window.removeEventListener("bd:store-updated",P)}},[n,s.activeVenueId]);S.useEffect(()=>{if(!s.activeVenueId)return;';
  const patchHydration = (input, label) => {
    if (input.includes(staleHydration)) return input.replace(staleHydration, authoritativeHydration);
    if (input.includes(authoritativeHydration)) return input;
    throw new Error(label + ": assortment hydration anchor not found");
  };
  source = patchHydration(source, "Authoritative assortment hydration");
  const distBundlePath = path.join(root, "dist/client/assets/index-BQGspy0I.js");
  if (fs.existsSync(distBundlePath)) {
    const distSource = fs.readFileSync(distBundlePath, "utf8");
    fs.writeFileSync(distBundlePath, patchHydration(distSource, "Packaged authoritative assortment hydration"));
  }
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

// Keep the latest startup architecture active when this legacy aggregate patch
// is the final step of pretest:artifact. The production build reapplies v396
// after v394/v395 as well.
await import("./patch-native-continuity-v396.mjs");
