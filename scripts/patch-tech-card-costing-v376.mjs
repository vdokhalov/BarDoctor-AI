import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-tech-card-costing-v376";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  return input.slice(0, startIndex) + replacement + input.slice(endIndex);
}

if (!source.includes(marker)) {
  const replacement = String.raw`/* ${marker} */
function bdTechCostUnitV376(value){const unit=String(value||"").trim().toLocaleLowerCase("ru-RU").replace(/\./g,"");if(["kg","кг","килограмм","килограммы"].includes(unit))return{unit:"g",factor:1e3};if(["g","г","гр","грамм","граммы"].includes(unit))return{unit:"g",factor:1};if(["l","л","литр","литры"].includes(unit))return{unit:"ml",factor:1e3};if(["ml","мл","миллилитр","миллилитры"].includes(unit))return{unit:"ml",factor:1};if(["pcs","pc","шт","штука","штуки","ед","единица"].includes(unit))return{unit:"pcs",factor:1};return{unit:"unknown",factor:1}}
function bdTechCostCanonicalV376(state){const aliases=new Map(bdCatArray(state.canonicalProductAliases).map(item=>[String(item?.from||""),String(item?.to||"")]).filter(([from,to])=>from&&to&&from!==to));return initial=>{let key=String(initial||"").trim(),guard=0;while(aliases.has(key)&&guard++<20)key=aliases.get(key);return key}}
function bdTechCostAmountV376(item){const normalized=bdAssortmentNumberV170(item?.normalizedQuantity,NaN),normalizedUnit=bdTechCostUnitV376(item?.normalizedUnit);if(Number.isFinite(normalized)&&normalized>=0&&normalizedUnit.unit!=="unknown")return{amount:normalized*normalizedUnit.factor,unit:normalizedUnit.unit};const raw=bdAssortmentNumberV170(item?.quantity,NaN),rawUnit=bdTechCostUnitV376(item?.unit);return Number.isFinite(raw)&&raw>=0&&rawUnit.unit!=="unknown"?{amount:raw*rawUnit.factor,unit:rawUnit.unit}:{amount:Number.isFinite(raw)?raw:0,unit:"unknown"}}
function bdTechCostMapsV376(state,purchases,canonical){const balances=new Map,prices=new Map;for(const balance of bdCatArray(state.stockBalances)){const key=canonical(balance?.key||balance?.productKey||balance?.purchaseProductKey||balance?.id);if(key)balances.set(key,balance)}for(const document of bdCatArray(purchases)){if(document?.status!=="confirmed")continue;for(const line of bdCatArray(document?.items)){const key=canonical(line?.purchaseProductKey||line?.productKey);if(!key)continue;let quantity=bdAssortmentNumberV170(line?.quantity,0),resolved=bdTechCostUnitV376(line?.unit),baseAmount=quantity*resolved.factor;if(resolved.unit==="pcs"){const match=String(line?.packageSize||"").toLocaleLowerCase("ru-RU").match(/(\d+(?:[.,]\d+)?)\s*(кг|kg|г|гр|g|л|l|мл|ml)\b/);if(match){const packed=bdTechCostUnitV376(match[2]);resolved=packed;baseAmount=quantity*Number(match[1].replace(",","."))*packed.factor}}const total=Math.max(0,bdAssortmentNumberV170(line?.lineTotal,0)||bdAssortmentNumberV170(line?.unitPrice,0)*quantity);if(!(baseAmount>0&&total>0&&resolved.unit!=="unknown"))continue;const point={unit:resolved.unit,unitPrice:total/baseAmount,currency:String(document?.currency||"RUB").toUpperCase(),date:String(document?.date||""),name:line?.name||""},current=prices.get(key);if(!current||point.date>=current.date)prices.set(key,point)}}return{balances,prices}}
function bdTechCostRowV376(ingredient,maps,canonical){const amount=bdTechCostAmountV376(ingredient),key=canonical(ingredient?.purchaseProductKey||ingredient?.productKey),balance=maps.balances.get(key),point=maps.prices.get(key),balanceUnit=bdTechCostUnitV376(balance?.unit).unit,average=bdAssortmentNumberV170(balance?.averageUnitCost,0),useBalance=average>0&&balanceUnit===amount.unit,unitPrice=useBalance?average:point?.unit===amount.unit?point.unitPrice:0,currency=String(useBalance?balance?.currency||point?.currency||"":point?.currency||"").toUpperCase(),name=ingredient?.matchedName||ingredient?.canonicalName||balance?.name||point?.name||ingredient?.name||"Ингредиент";if(!key)return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"mapping",productKey:"",amount:amount.amount};if(amount.unit==="unknown")return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"unit",productKey:key,amount:amount.amount};if(!(unitPrice>0&&currency))return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!1,reason:"price",productKey:key,amount:amount.amount};return{id:ingredient?.id,name,recipeName:ingredient?.name||name,quantity:ingredient?.quantity,unit:ingredient?.unit,complete:!0,reason:null,productKey:key,amount:amount.amount,unitPrice,cost:Math.round(amount.amount*unitPrice*100)/100,currency,source:useBalance?"weighted_inventory_average":"latest_confirmed_purchase"}}
function bdAssortmentFallbackAnalyticsV170(e,purchases,t){const n=bdCatState(e),canonical=bdTechCostCanonicalV376(n),maps=bdTechCostMapsV376(n,purchases,canonical),r=n.menuItems.filter(m=>m.active!==!1),a=r.map(m=>{const h=bdCatRecipeFor(m,n.recipes),g=bdCatArray(h?.ingredients),rows=g.map(item=>bdTechCostRowV376(item,maps,canonical)),approved=Boolean(h&&(h.reviewStatus==="approved"||h.status==="confirmed")),complete=approved&&rows.length>0&&rows.every(item=>item.complete),currencies=new Set(rows.filter(item=>item.complete).map(item=>item.currency)),costCurrency=complete&&currencies.size===1?[...currencies][0]:null,recipeCost=costCurrency?Math.round(rows.reduce((sum,item)=>sum+(item.cost||0),0)*100)/100:null,salePrice=bdAssortmentNumberV170(m.salePrice)>0?bdAssortmentNumberV170(m.salePrice):null,saleCurrency=String(m.currency||"RUB").toUpperCase(),comparable=recipeCost!=null&&costCurrency===saleCurrency,status=m.type==="service"?"ready":!h?"missing_recipe":!approved?"review":complete?"ready":"attention";return{id:m.id,name:m.name,groupId:m.groupId||null,groupName:n.groups.find(j=>j.id===m.groupId)?.name||({bar:"Бар",kitchen:"Кухня",hookah:"Кальяны"}[m.department]||"Другое"),subgroupId:m.subgroupId||null,category:m.category||"Без подраздела",type:m.type||"composite",saleSize:m.saleSize||null,portionSize:bdMenuSaleSizeTextV298(m.saleSize||bdMenuLegacySizeV298(m.legacyPortionSize||m.portionSize))||null,salePrice,currency:saleCurrency,recipeId:h?.id||null,recipeStatus:h?.status||"missing",techCardStatus:h?approved?"approved":h.reviewStatus==="ai_draft"?"ai_draft":"requires_review":"missing",techCardSource:h?.source||null,techCardVersion:h?.version||1,techCardUpdatedAt:h?.updatedAt||h?.confirmedAt||null,status,ingredientCount:g.length,mappedIngredientCount:rows.filter(item=>item.reason!=="mapping").length,pricedIngredientCount:rows.filter(item=>item.complete).length,invalidUnitCount:rows.filter(item=>item.reason==="unit").length,unmappedIngredientCount:rows.filter(item=>item.reason==="mapping").length,missingPriceCount:rows.filter(item=>item.reason==="price").length,ingredientRows:rows,recipeCost,costCurrency,costPercent:comparable&&salePrice?Math.round(recipeCost/salePrice*1e3)/10:null,unitGrossProfit:comparable&&salePrice!=null?Math.round((salePrice-recipeCost)*100)/100:null,costChangePercent:null,costHistory:[],sales:null,plannedSales:bdAssortmentNumberV170(m.plannedSales),priceHistory:bdCatArray(n.priceHistory).filter(j=>j.menuItemId===m.id)}},),s=a.filter(m=>m.techCardStatus==="approved").length,l=a.filter(m=>m.status!=="ready").length,u=a.filter(m=>m.recipeStatus==="missing").length,d=a.filter(m=>m.techCardStatus==="ai_draft"||m.techCardStatus==="requires_review").length,f=[];u&&f.push({id:"missing-recipes",type:"recipe_missing",tone:"red",title:u+" "+bdAssortmentPluralV170(u,"позиция без техкарты","позиции без техкарт","позиций без техкарт"),detail:"Нельзя достоверно рассчитать себестоимость и потребность",tab:"recipes",filter:"missing",itemId:a.find(m=>m.recipeStatus==="missing")?.id||null}),d&&f.push({id:"draft-recipes",type:"recipe_review",tone:"orange",title:d+" "+bdAssortmentPluralV170(d,"техкарта требует проверки","техкарты требуют проверки","техкарт требуют проверки"),detail:"Черновые рецептуры не участвуют в расчётах",tab:"recipes",filter:"review",itemId:a.find(m=>m.techCardStatus!=="approved")?.id||null});const p=new Map;for(const m of a){const h=p.get(m.groupId||m.groupName)||{id:m.groupId||m.groupName,name:m.groupName,total:0,calculated:0,attention:0};h.total++,m.status==="ready"?h.calculated++:h.attention++,p.set(h.id,h)}return{version:"assortment-fallback-v376",period:{key:t,previousKey:"",comparisonBasis:"not_comparable"},summary:{menuItems:a.length,readinessPercent:a.length?Math.round(s/a.length*100):0,readyRecipes:s,attentionItems:l},readiness:{score:a.length?Math.round(s/a.length*100):0,formula:"Локальный расчёт по подтверждённым складским данным",mandatory:[],desirable:[],unavailable:[]},counts:{activeItems:a.length,confirmedRecipes:s,aiDraftRecipes:a.filter(m=>m.techCardStatus==="ai_draft").length,reviewRecipes:a.filter(m=>m.techCardStatus==="requires_review").length,draftRecipes:d,missingRecipes:u,attentionItems:l,unmappedIngredients:a.reduce((m,h)=>m+h.unmappedIngredientCount,0),invalidUnits:a.reduce((m,h)=>m+h.invalidUnitCount,0),missingPurchasePrices:a.reduce((m,h)=>m+h.missingPriceCount,0),missingSalePrices:a.filter(m=>m.salePrice==null).length},signals:f,costChanges:[],sections:[...p.values()],menuItems:a,recipes:a.filter(m=>m.type!=="service"),economics:{available:!1,revenue:null,costOfGoods:null,costPercent:null,grossMargin:null,comparison:null,insufficientReason:"Для экономики нужны подтверждённые продажи по позициям"},needs:{horizonDays:n.horizonDays,rows:[],issues:[],completeRows:0,forecastStatus:"insufficient_data",formula:"Расчёт потребности обновится после серверной синхронизации"},sources:n.sources||[],valuation:{currentCostRule:"Средневзвешенная складская стоимость; резерв — последняя подтверждённая закупка",costChangeRule:"Подтверждённые закупочные цены"},aiContext:{confirmedMenuEconomics:[],signals:f}}}
`;
  source = replaceSegment(
    source,
    "function bdAssortmentFallbackAnalyticsV170",
    "function bdAssortmentHeaderV170",
    replacement,
    "Local tech-card costing",
  );
}

source = source.replace(
  "bdAssortmentLocal=bdAssortmentFallbackAnalyticsV170(E,m)",
  "bdAssortmentLocal=bdAssortmentFallbackAnalyticsV170(E,C,m)",
);
if (!source.includes("bdAssortmentFallbackAnalyticsV170(E,C,m)")) {
  throw new Error("Assortment fallback call was not upgraded");
}
for (const requiredFunction of [
  "function bdAssortmentHeaderV170",
  "function bdAssortmentEmptyV170",
  "function bdAssortmentPeriodV170",
  "function bdAssortmentSummaryV170",
  "function bdAssortmentSignalRowV170",
  "function bdAssortmentOverviewV170",
]) {
  if (!source.includes(requiredFunction)) {
    throw new Error(`Required assortment UI function was removed: ${requiredFunction}`);
  }
}

fs.writeFileSync(bundlePath, source);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
