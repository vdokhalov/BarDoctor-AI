import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const releaseToken = "20260907-menu-consumption-sot-v418";
const bundleMarker = 'const bdMenuConsumptionSotVersionV418="v418";';
const cssMarker = "bd-menu-consumption-sot-v418";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const menuFragmentPath = path.join(root, "scripts/fragments/menu-consumption-sot-v418.fragment.txt");

function count(source, token) {
  return source.split(token).length - 1;
}

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function scope(source, startToken, endToken, label) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0 || end <= start) throw new Error(`${releaseToken}: ${label} boundary missing`);
  return { start, end, value: source.slice(start, end) };
}

function replaceOnce(source, before, after, label) {
  const matches = count(source, before);
  if (matches !== 1) throw new Error(`${releaseToken}: ${label} expected once, found ${matches}`);
  return source.replace(before, after);
}

function patchRecipe(recipe) {
  recipe = replaceOnce(
    recipe,
    "function bdCatRecipeEditor({item:e,recipe:t,products:n,balances:r,onClose:a,onSave:s})",
    "function bdCatRecipeEditor({item:e,recipe:t,products:n,balances:r,onClose:a,onSave:s,venueId:bdRecipeVenueId,costRows:bdRecipeCostRows=[]})",
    "recipe props",
  );
  recipe = replaceOnce(
    recipe,
    ':{id:crypto.randomUUID(),menuItemId:e.id,status:"draft",source:"manual",ingredients:e.type==="ready"?[{id:crypto.randomUUID(),name:e.name,quantity:1,unit:"шт.",confidence:1}]:[],warnings:[]}',
    ':{id:crypto.randomUUID(),menuItemId:e.id,ownerId:e.id,ownerType:"menu_item",venueId:Number(bdRecipeVenueId)||void 0,status:"draft",reviewStatus:"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"manual",ingredients:[],warnings:[]}',
    "recipe must start empty",
  );
  recipe = replaceOnce(
    recipe,
    'await s({...l,ingredients:c,status:p?"confirmed":"draft",source:l.source||"manual",updatedAt:new Date().toISOString(),confirmedAt:p?new Date().toISOString():l.confirmedAt},I)',
    'await s({...l,menuItemId:e.id,ownerId:e.id,ownerType:"menu_item",venueId:Number(bdRecipeVenueId)||l.venueId,status:p?"confirmed":"draft",reviewStatus:p?"approved":"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!p,ingredients:c.map(R=>({...R,venueId:Number(bdRecipeVenueId)||R.venueId})),source:l.source||"manual",updatedAt:new Date().toISOString(),confirmedAt:p?new Date().toISOString():l.confirmedAt},I)',
    "recipe identity save",
  );

  const costStart = recipe.indexOf("const bdMissingCostCount=");
  const costEnd = recipe.indexOf(",bdTechInvalidCount=", costStart);
  if (costStart < 0 || costEnd < 0) throw new Error(`${releaseToken}: recipe cost boundary missing`);
  const costModel = String.raw`const bdRecipeAuthoritativeCostByIdV418=new Map(bdCatArray(bdRecipeCostRows).map(p=>[String(p?.id||""),p])),bdRecipeAuthoritativeCostByReferenceV418=new Map(bdCatArray(bdRecipeCostRows).flatMap(p=>[p?.nomenclatureItemId,p?.productKey,p?.purchaseProductKey].filter(Boolean).map(c=>[String(c),p]))),bdRecipeCalculatedCostByIdV418=new Map(l.ingredients.map(p=>{const c=bdRecipeAuthoritativeCostByIdV418.get(String(p.id))||bdRecipeAuthoritativeCostByReferenceV418.get(String(p.nomenclatureItemId||p.purchaseProductKey||"")),I=bdCatToBase(p.quantity,p.unit),R=Number(c?.unitPrice),W=c?.complete===!0&&Number.isFinite(R)&&I.unit!=="unknown"&&(!c?.unit||c.unit===I.unit),J=W?Math.round(I.amount*R*100)/100:null;return[String(p.id),{...c,id:p.id,complete:W,amount:I.amount,unit:I.unit,unitPrice:Number.isFinite(R)?R:null,cost:J,currency:c?.currency||"",costStatus:c?.costStatus||(W&&R===0?"KNOWN_ZERO":"UNKNOWN")}] })),bdRecipeCalculatedCostsV418=[...bdRecipeCalculatedCostByIdV418.values()],bdMissingCostCount=l.ingredients.filter(p=>p.purchaseProductKey&&!bdRecipeCalculatedCostByIdV418.get(String(p.id))?.complete).length,bdRecipeTotalKnownV418=l.ingredients.length>0&&bdRecipeCalculatedCostsV418.length===l.ingredients.length&&bdRecipeCalculatedCostsV418.every(p=>p.complete),bdRecipeCostCurrenciesV418=new Set(bdRecipeCalculatedCostsV418.filter(p=>p.complete).map(p=>p.currency).filter(Boolean)),bdRecipeTotalCurrencyV418=bdRecipeCostCurrenciesV418.size===1?[...bdRecipeCostCurrenciesV418][0]:"",bdRecipeTotalCostV418=bdRecipeTotalKnownV418&&bdRecipeTotalCurrencyV418?Math.round(bdRecipeCalculatedCostsV418.reduce((p,c)=>p+(c.cost||0),0)*100)/100:null`;
  recipe = recipe.slice(0, costStart) + costModel + recipe.slice(costEnd);
  recipe = replaceOnce(
    recipe,
    "const I=bdCatToBase(p.quantity,p.unit),R=d[p.id]||{};return",
    "const I=bdCatToBase(p.quantity,p.unit),R=d[p.id]||{},bdLineCostV418=bdRecipeCalculatedCostByIdV418.get(String(p.id));return",
    "recipe line cost lookup",
  );
  recipe = replaceOnce(
    recipe,
    '}),i.jsxs("details",{className:"bd-catalog-stock-box-v353"',
    '}),i.jsxs("div",{className:"bd-tech-cost-row-v418",children:[i.jsxs("span",{children:["Текущая стоимость: ",bdLineCostV418?.complete?(bdLineCostV418.unitPrice??0)+" "+(bdLineCostV418.currency||"")+" / "+bdCatUnitLabel(bdLineCostV418.unit):"нет подтверждённых данных"]}),i.jsxs("strong",{children:["Стоимость строки: ",bdLineCostV418?.complete?bdAssortmentMoneyV170(bdLineCostV418.cost||0,bdLineCostV418.currency):"—"]})]}),i.jsxs("details",{className:"bd-catalog-stock-box-v353"',
    "recipe line cost UI",
  );
  const stockStartToken = ',i.jsxs("details",{className:"bd-catalog-stock-box-v353"';
  const stockStart = recipe.indexOf(stockStartToken);
  const stockEndToken = "]})]},p.id)";
  const stockEnd = recipe.indexOf(stockEndToken, stockStart);
  if (stockStart < 0 || stockEnd < 0) throw new Error(`${releaseToken}: obsolete recipe stock editor boundary missing`);
  recipe = recipe.slice(0, stockStart) + recipe.slice(stockEnd + 3);
  recipe = replaceOnce(
    recipe,
    'bdMissingCostCount>0&&i.jsxs("div",{className:"bd-catalog-issue",role:"status",children:["Себестоимость неполная: отсутствует стоимость ",bdMissingCostCount," ингредиентов. Цена появится после authoritative закупки."]}),i.jsxs("div",{className:"bd-catalog-sheet-actions"',
    'bdMissingCostCount>0&&i.jsxs("div",{className:"bd-catalog-issue",role:"status",children:["Себестоимость неполная: отсутствует стоимость ",bdMissingCostCount," ингредиентов. Цена появится после authoritative закупки."]}),i.jsxs("div",{className:"bd-tech-card-total-v418",role:"status",children:[i.jsx("span",{children:"Текущая себестоимость техкарты"}),i.jsx("strong",{children:bdRecipeTotalCostV418!==null?bdAssortmentMoneyV170(bdRecipeTotalCostV418,bdRecipeTotalCurrencyV418):"Недостаточно подтверждённых данных"})]}),i.jsxs("div",{className:"bd-catalog-sheet-actions"',
    "recipe total cost UI",
  );
  return recipe;
}

function commandMenuSaveModel() {
  return String.raw`Ae=async(w,bdActiveRecipeIdV418="")=>{const R=bdCatState(xr(bdCatalogStoreKey)||E),P=R.menuItems.find(p=>p.id===w.id),c=bdAssortmentAppendPriceHistoryV170(R.priceHistory,w.id,P?.salePrice,w.salePrice,w.currency,"manual"),p=R.menuItems.some(oe=>oe.id===w.id)?R.menuItems.map(oe=>oe.id===w.id?w:oe):[w,...R.menuItems];let oe=R.recipes,ie=oe.filter(Ce=>String(Ce?.menuItemId||Ce?.ownerId||"")===String(w.id)&&Ce?.lifecycleStatus!=="superseded"&&Ce?.lifecycleStatus!=="inactive"&&Ce?.current!==!1);if(w.consumptionMode==="RECIPE"&&ie.length>1){const Ce=ie.findIndex((Qe,At)=>String(Qe?.id||"legacy:"+At)===String(bdActiveRecipeIdV418));if(Ce<0)throw new Error("Выберите одну техкарту, которая станет активной для будущих продаж.");const Qe=new Date().toISOString(),At=ie[Ce];oe=oe.map(J=>J===At?{...J,id:J.id||crypto.randomUUID(),current:!0,lifecycleStatus:"current",inactiveReason:void 0,reactivatedAt:Qe}:ie.includes(J)?{...J,current:!1,currentDraft:!1,lifecycleStatus:"inactive",inactiveReason:"consumption_mode_review",deactivatedAt:Qe}:J),ie=[At]}if(w.consumptionMode==="RECIPE"&&!ie.length){const Ce={id:crypto.randomUUID(),menuItemId:w.id,ownerId:w.id,ownerType:"menu_item",venueId:Number(s.activeVenueId)||w.venueId,status:"draft",reviewStatus:"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"manual",ingredients:[],warnings:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};oe=[Ce,...oe],ie=[Ce]}if(w.consumptionMode!=="RECIPE"&&ie.length){const Ce=new Date().toISOString();oe=oe.map(Qe=>ie.includes(Qe)?{...Qe,current:!1,currentDraft:!1,lifecycleStatus:"inactive",inactiveReason:"consumption_mode_switch",deactivatedAt:Ce}:Qe)}const Ce=await Ne("Позиция сохранена",{...R,menuItems:p,recipes:oe,priceHistory:c},!0);if(!Ce.synced)return!1;return M(null),w.consumptionMode==="RECIPE"&&(f("recipes"),v("all"),z(w)),Ce}`;
}

function legacyMenuSaveModel() {
  return String.raw`ie=async(p,bdActiveRecipeIdV418="")=>{const c=bdCatState(xr(bdCatalogStoreKey)||s),I=c.menuItems.some(R=>R.id===p.id)?c.menuItems.map(R=>R.id===p.id?p:R):[p,...c.menuItems];let R=c.recipes,W=R.filter(J=>String(J?.menuItemId||J?.ownerId||"")===String(p.id)&&J?.lifecycleStatus!=="superseded"&&J?.lifecycleStatus!=="inactive"&&J?.current!==!1);if(p.consumptionMode==="RECIPE"&&W.length>1){const J=W.findIndex((K,ce)=>String(K?.id||"legacy:"+ce)===String(bdActiveRecipeIdV418));if(J<0)throw new Error("Выберите одну техкарту, которая станет активной для будущих продаж.");const K=new Date().toISOString(),ce=W[J];R=R.map(Q=>Q===ce?{...Q,id:Q.id||crypto.randomUUID(),current:!0,lifecycleStatus:"current",inactiveReason:void 0,reactivatedAt:K}:W.includes(Q)?{...Q,current:!1,currentDraft:!1,lifecycleStatus:"inactive",inactiveReason:"consumption_mode_review",deactivatedAt:K}:Q),W=[ce]}if(p.consumptionMode==="RECIPE"&&!W.length){const J={id:crypto.randomUUID(),menuItemId:p.id,ownerId:p.id,ownerType:"menu_item",venueId:Number(s.activeVenueId)||p.venueId,status:"draft",reviewStatus:"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"manual",ingredients:[],warnings:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};R=[J,...R],W=[J]}if(p.consumptionMode!=="RECIPE"&&W.length){const J=new Date().toISOString();R=R.map(K=>W.includes(K)?{...K,current:!1,currentDraft:!1,lifecycleStatus:"inactive",inactiveReason:"consumption_mode_switch",deactivatedAt:J}:K)}const J=await V("Позиция сохранена",{...c,menuItems:I,recipes:R},!0);return J.synced?J:!1}`;
}

function patchCommand(command) {
  command = replaceOnce(
    command,
    "de=S.useRef(null),fe=S.useRef(0),me=",
    "de=S.useRef(null),fe=S.useRef(0),bdPhase3VenueRefV418=S.useRef(s.activeVenueId),me=",
    "venue guard ref",
  );
  command = replaceOnce(
    command,
    "S.useEffect(()=>{let w=!1;const R=()=>",
    "S.useEffect(()=>{if(bdPhase3VenueRefV418.current===s.activeVenueId)return;bdPhase3VenueRefV418.current=s.activeVenueId,M(null),z(null),q(null),U(null),se(null)},[s.activeVenueId]);S.useEffect(()=>{let w=!1;const R=()=>",
    "venue guard effect",
  );
  const saveStart = command.indexOf("Ae=async w=>{");
  const saveEnd = command.indexOf(",ke=async(w,R)=>{", saveStart);
  if (saveStart < 0 || saveEnd < 0) throw new Error(`${releaseToken}: menu save handler boundary missing`);
  const menuSave = commandMenuSaveModel();
  command = command.slice(0, saveStart) + menuSave + command.slice(saveEnd);

  const recipeStart = command.indexOf("ke=async(w,R)=>{");
  const recipeEnd = command.indexOf(",Oe=async w=>{", recipeStart);
  if (recipeStart < 0 || recipeEnd < 0) throw new Error(`${releaseToken}: recipe save handler boundary missing`);
  const recipeSave = String.raw`ke=async(w,R)=>{const P=bdCatState(E),X=P.recipes.find(p=>p.id===w.id),ce=Number(X?.version||w.version)||1,Qe={...X,...w,id:X?.id||w.id||crypto.randomUUID(),menuItemId:w.menuItemId,ownerId:w.menuItemId,ownerType:"menu_item",venueId:Number(s.activeVenueId)||w.venueId,version:ce,current:!0,currentDraft:w.status!=="confirmed",lifecycleStatus:"current",reviewStatus:w.status==="confirmed"?"approved":w.source==="ai"?"ai_draft":"requires_review"},At=P.recipes.some(p=>p.id===Qe.id)?P.recipes.map(p=>p.id===Qe.id?Qe:p):[Qe,...P.recipes],c=await Ne(w.status==="confirmed"?"Техкарта подтверждена":"Черновик сохранён",{...P,recipes:At},w.status==="confirmed"),p=bdCatArray(c.state.recipes).find(Ce=>Ce.id===Qe.id&&Ce.reviewStatus==="approved");if(w.status==="confirmed"&&(!c.synced||!p)){c.synced&&a({variant:"error",title:"Техкарта требует проверки",description:"Подтвердите связь и единицу каждого ингредиента."});return!1}return z(null),!0}`;
  command = command.slice(0, recipeStart) + recipeSave + command.slice(recipeEnd);
  command = replaceOnce(
    command,
    "onSave:Ae,onManageStructure:",
    "onSave:Ae,recipes:E.recipes,venueId:s.activeVenueId,onManageStructure:",
    "menu props",
  );
  command = replaceOnce(
    command,
    "balances:E.stockBalances,onClose:()=>z(null),onSave:ke",
    "balances:E.stockBalances,venueId:s.activeVenueId,costRows:[...(he.nomenclatureCosts||[]),...(he.menuItems?.find(w=>String(w.id)===String(D.id))?.ingredientRows||[])],onClose:()=>z(null),onSave:ke",
    "recipe props",
  );
  return command;
}

function patchFallback(fallback) {
  if (!fallback.includes("bdTechCostMapsV376")) throw new Error(`${releaseToken}: fallback analytics input missing`);
  let value = String.raw`function bdAssortmentFallbackAnalyticsV170(e,purchases,t){
  const n=bdCatState(e),canonical=bdTechCostCanonicalV376(n),maps=bdTechCostMapsV376(n,purchases,canonical),bdExplicitCostKeyV418=value=>String(value||"").trim(),bdExplicitCostMapsV418=bdTechCostMapsV376(n,purchases,bdExplicitCostKeyV418),r=n.menuItems.filter(m=>m.active!==!1),a=r.map(m=>{
    const bdProductsV418=[...bdCatArray(n.nomenclature),...bdCatArray(n.stockBalances)].filter(p=>p?.active!==!1&&p?.archived!==!0&&p?.status!=="archived"&&(!m.venueId||!p?.venueId||Number(p.venueId)===Number(m.venueId))),bdOwnerRecipesV418=bdCatArray(n.recipes).filter(p=>String(p?.menuItemId||p?.ownerId||"")===String(m.id)&&p?.lifecycleStatus!=="superseded"&&p?.lifecycleStatus!=="inactive"&&p?.current!==!1),bdRawRecipeV418=bdOwnerRecipesV418.length===1?bdOwnerRecipesV418[0]:void 0,bdReadyV418=m.readyProduct||m.readyProductLink||{},bdReadyIdV418=String(bdReadyV418.nomenclatureItemId||""),bdReadyKeyV418=String(bdReadyV418.productKey||""),bdStoredModeV418=["DIRECT_ITEM","FIXED_QUANTITY","RECIPE","NONE"].includes(m?.consumptionMode)?m.consumptionMode:"",bdExactReadyProductV418=bdReadyIdV418?bdProductsV418.find(p=>[p?.id,p?.nomenclatureItemId].map(String).includes(bdReadyIdV418)):void 0,bdLegacyReadyProductV418=bdExactReadyProductV418||(!bdStoredModeV418&&bdReadyKeyV418?bdProductsV418.find(p=>canonical(p?.productKey||p?.key||p?.id)===canonical(bdReadyKeyV418)):void 0),bdReadyProductV418=bdStoredModeV418?bdExactReadyProductV418:bdLegacyReadyProductV418,bdReadyCanonicalKeyV418=bdReadyProductV418?canonical(bdReadyProductV418.productKey||bdReadyProductV418.key||bdReadyProductV418.id):"",bdReadyLinkValidV418=Boolean(bdReadyProductV418&&bdReadyCanonicalKeyV418&&(!bdStoredModeV418||bdReadyIdV418&&(!bdReadyKeyV418||bdReadyKeyV418===bdReadyCanonicalKeyV418))),bdPackagesPerSaleV418=Number(bdReadyV418.packagesPerSale??1),bdProductUnitV418=bdReadyProductV418?bdCatToBase(1,bdReadyProductV418.unit||bdReadyProductV418.baseUnit).unit:"unknown",bdFixedSizeV418=m.saleSize||null,bdFixedAmountV418=bdCatToBase(bdFixedSizeV418?.quantity,bdFixedSizeV418?.unit),bdDirectValidV418=bdReadyLinkValidV418&&bdProductUnitV418==="pcs"&&bdPackagesPerSaleV418===1,bdFixedValidV418=bdReadyLinkValidV418&&bdPackagesPerSaleV418>0&&bdFixedAmountV418.amount>0&&bdFixedAmountV418.unit!=="unknown"&&bdFixedAmountV418.unit===bdProductUnitV418,bdHasLegacyReadyV418=Boolean(bdReadyIdV418||bdReadyKeyV418),bdLegacyModeV418=m.type==="service"?(bdHasLegacyReadyV418||bdOwnerRecipesV418.length?"NEEDS_REVIEW":"NONE"):bdHasLegacyReadyV418&&bdOwnerRecipesV418.length?"NEEDS_REVIEW":bdOwnerRecipesV418.length>1?"NEEDS_REVIEW":bdRawRecipeV418?"RECIPE":bdHasLegacyReadyV418&&bdDirectValidV418?"DIRECT_ITEM":"NEEDS_REVIEW",bdModeV418=bdStoredModeV418==="RECIPE"&&bdOwnerRecipesV418.length>1||bdStoredModeV418==="DIRECT_ITEM"&&!bdDirectValidV418||bdStoredModeV418==="FIXED_QUANTITY"&&!bdFixedValidV418?"NEEDS_REVIEW":bdStoredModeV418||bdLegacyModeV418,h=bdModeV418==="RECIPE"?bdRawRecipeV418:void 0,bdDirectIngredientV418=bdReadyLinkValidV418&&(bdModeV418==="DIRECT_ITEM"||bdModeV418==="FIXED_QUANTITY")?{id:"consumption:"+m.id,name:bdReadyProductV418?.name||m.name,nomenclatureItemId:bdReadyIdV418,purchaseProductKey:bdReadyCanonicalKeyV418,productKey:bdReadyCanonicalKeyV418,quantity:bdModeV418==="DIRECT_ITEM"?1:bdAssortmentNumberV170(bdFixedSizeV418?.quantity,0),unit:bdModeV418==="DIRECT_ITEM"?"pcs":bdFixedSizeV418?.unit}:null,g=bdModeV418==="RECIPE"?bdCatArray(h?.ingredients):bdDirectIngredientV418?[bdDirectIngredientV418]:[],rows=g.map(item=>{const row=bdTechCostRowV376(item,maps,canonical);if(!bdStoredModeV418||!["DIRECT_ITEM","FIXED_QUANTITY","RECIPE"].includes(bdModeV418))return row;const id=String(item?.nomenclatureItemId||""),product=id?bdProductsV418.find(p=>[p?.id,p?.nomenclatureItemId].map(String).includes(id)):void 0,expected=product?canonical(product.productKey||product.key||product.id):"",configured=String(item?.purchaseProductKey||item?.productKey||"");return id&&product&&expected&&(!configured||configured===expected)&&row.productKey===expected?row:{...row,complete:!1,reason:"mapping",productKey:expected||"",unitPrice:null,cost:null,currency:""}}),approved=bdModeV418==="RECIPE"?Boolean(h&&(h.reviewStatus==="approved"||h.status==="confirmed")):["DIRECT_ITEM","FIXED_QUANTITY","NONE"].includes(bdModeV418),complete=bdModeV418==="NONE"||approved&&rows.length>0&&rows.every(item=>item.complete),salePrice=bdAssortmentNumberV170(m.salePrice)>0?bdAssortmentNumberV170(m.salePrice):null,saleCurrency=String(m.currency||"RUB").toUpperCase(),currencies=new Set(rows.filter(item=>item.complete).map(item=>item.currency)),costCurrency=bdModeV418==="NONE"?saleCurrency:complete&&currencies.size===1?[...currencies][0]:null,recipeCost=bdModeV418==="NONE"?0:costCurrency?Math.round(rows.reduce((sum,item)=>sum+(item.cost||0),0)*100)/100:null,comparable=recipeCost!=null&&costCurrency===saleCurrency,status=bdModeV418==="NONE"?"ready":bdModeV418==="NEEDS_REVIEW"?"review":bdModeV418==="RECIPE"&&!h?"missing_recipe":bdModeV418==="RECIPE"&&!approved?"review":complete?"ready":"attention";
    return{id:m.id,name:m.name,groupId:m.groupId||null,groupName:n.groups.find(j=>j.id===m.groupId)?.name||({bar:"Бар",kitchen:"Кухня",hookah:"Кальяны"}[m.department]||"Другое"),subgroupId:m.subgroupId||null,category:m.category||"Без подраздела",type:m.type||"composite",saleSize:m.saleSize||null,portionSize:bdMenuSaleSizeTextV298(m.saleSize||bdMenuLegacySizeV298(m.legacyPortionSize||m.portionSize))||null,salePrice,currency:saleCurrency,consumptionMode:bdModeV418,consumptionStatus:bdModeV418==="NEEDS_REVIEW"?"NEEDS_REVIEW":"CONFIGURED",consumptionSummary:bdModeV418==="DIRECT_ITEM"?"При продаже списывается одна выбранная складская позиция.":bdModeV418==="FIXED_QUANTITY"?"При продаже списывается выбранное количество товара.":bdModeV418==="RECIPE"?"При продаже списываются ингредиенты техкарты.":bdModeV418==="NONE"?"Складской расход не требуется.":"Требуется выбрать один способ списания.",recipeId:bdModeV418==="RECIPE"?h?.id||null:null,recipeStatus:bdModeV418==="RECIPE"?h?.status||"missing":"not_applicable",techCardStatus:bdModeV418==="RECIPE"?(h?approved?"approved":h.reviewStatus==="ai_draft"?"ai_draft":"requires_review":"missing"):bdModeV418==="NEEDS_REVIEW"?"needs_review":"not_applicable",techCardSource:bdModeV418==="RECIPE"?h?.source||null:null,techCardVersion:bdModeV418==="RECIPE"?h?.version||1:null,techCardUpdatedAt:bdModeV418==="RECIPE"?h?.updatedAt||h?.confirmedAt||null:null,status,ingredientCount:g.length,mappedIngredientCount:rows.filter(item=>item.reason!=="mapping").length,pricedIngredientCount:rows.filter(item=>item.complete).length,invalidUnitCount:rows.filter(item=>item.reason==="unit").length,unmappedIngredientCount:rows.filter(item=>item.reason==="mapping").length,missingPriceCount:rows.filter(item=>item.reason==="price").length,ingredientRows:bdModeV418==="RECIPE"?rows:[],recipeCost,costCurrency,costPercent:comparable&&salePrice?Math.round(recipeCost/salePrice*1e3)/10:null,unitGrossProfit:comparable&&salePrice!=null?Math.round((salePrice-recipeCost)*100)/100:null,costChangePercent:null,costHistory:[],sales:null,plannedSales:bdAssortmentNumberV170(m.plannedSales),priceHistory:bdCatArray(n.priceHistory).filter(j=>j.menuItemId===m.id)}
  }),s=a.filter(m=>m.status==="ready").length,bdConfirmedRecipesV418=a.filter(m=>m.consumptionMode==="RECIPE"&&m.techCardStatus==="approved").length,l=a.filter(m=>m.status!=="ready").length,u=a.filter(m=>m.consumptionMode==="RECIPE"&&m.recipeStatus==="missing").length,d=a.filter(m=>m.consumptionMode==="RECIPE"&&(m.techCardStatus==="ai_draft"||m.techCardStatus==="requires_review")).length,bdReviewModesV418=a.filter(m=>m.consumptionMode==="NEEDS_REVIEW").length,f=[];
  bdReviewModesV418&&f.push({id:"consumption-review",type:"consumption_review",tone:"red",title:bdReviewModesV418+" "+bdAssortmentPluralV170(bdReviewModesV418,"позиция требует выбора списания","позиции требуют выбора списания","позиций требуют выбора списания"),detail:"Выберите один активный способ списания",tab:"menu",filter:"attention",itemId:a.find(m=>m.consumptionMode==="NEEDS_REVIEW")?.id||null}),u&&f.push({id:"missing-recipes",type:"recipe_missing",tone:"red",title:u+" "+bdAssortmentPluralV170(u,"позиция без техкарты","позиции без техкарт","позиций без техкарт"),detail:"Нельзя достоверно рассчитать себестоимость и потребность",tab:"recipes",filter:"missing",itemId:a.find(m=>m.recipeStatus==="missing")?.id||null}),d&&f.push({id:"draft-recipes",type:"recipe_review",tone:"orange",title:d+" "+bdAssortmentPluralV170(d,"техкарта требует проверки","техкарты требуют проверки","техкарт требуют проверки"),detail:"Черновые рецептуры не участвуют в расчётах",tab:"recipes",filter:"review",itemId:a.find(m=>m.techCardStatus!=="approved")?.id||null});
  const p=new Map;for(const m of a){const h=p.get(m.groupId||m.groupName)||{id:m.groupId||m.groupName,name:m.groupName,total:0,calculated:0,attention:0};h.total++,m.status==="ready"?h.calculated++:h.attention++,p.set(h.id,h)}
  return{version:"assortment-fallback-v418",period:{key:t,previousKey:"",comparisonBasis:"not_comparable"},summary:{menuItems:a.length,readinessPercent:a.length?Math.round(s/a.length*100):0,readyRecipes:bdConfirmedRecipesV418,attentionItems:l},readiness:{score:a.length?Math.round(s/a.length*100):0,formula:"Локальный расчёт по активному способу списания",mandatory:[],desirable:[],unavailable:[]},counts:{activeItems:a.length,confirmedRecipes:bdConfirmedRecipesV418,aiDraftRecipes:a.filter(m=>m.techCardStatus==="ai_draft").length,reviewRecipes:a.filter(m=>["requires_review","needs_review"].includes(m.techCardStatus)).length,draftRecipes:d,missingRecipes:u,attentionItems:l,unmappedIngredients:a.reduce((m,h)=>m+h.unmappedIngredientCount,0),invalidUnits:a.reduce((m,h)=>m+h.invalidUnitCount,0),missingPurchasePrices:a.reduce((m,h)=>m+h.missingPriceCount,0),missingSalePrices:a.filter(m=>m.salePrice==null).length},signals:f,costChanges:[],sections:[...p.values()],menuItems:a,recipes:a.filter(m=>m.consumptionMode==="RECIPE"||m.consumptionMode==="NEEDS_REVIEW"),economics:{available:!1,revenue:null,costOfGoods:null,costPercent:null,grossMargin:null,comparison:null,insufficientReason:"Для экономики нужны подтверждённые продажи по позициям"},needs:{horizonDays:n.horizonDays,rows:[],issues:[],completeRows:0,forecastStatus:"insufficient_data",formula:"Расчёт потребности обновится после серверной синхронизации"},sources:n.sources||[],valuation:{currentCostRule:"Последний применимый подтверждённый приход",costChangeRule:"Подтверждённые закупочные цены"},aiContext:{confirmedMenuEconomics:[],signals:f}}
}`;
  value = replaceOnce(
    value,
    'bdReadyCanonicalKeyV418=bdReadyProductV418?canonical(bdReadyProductV418.productKey||bdReadyProductV418.key||bdReadyProductV418.id):""',
    'bdReadyCanonicalKeyV418=bdReadyProductV418?(bdStoredModeV418?bdExplicitCostKeyV418(bdReadyProductV418.productKey||bdReadyProductV418.key||bdReadyProductV418.id):canonical(bdReadyProductV418.productKey||bdReadyProductV418.key||bdReadyProductV418.id)):""',
    "explicit ready-product cost key",
  );
  value = replaceOnce(
    value,
    'rows=g.map(item=>{const row=bdTechCostRowV376(item,maps,canonical);if(!bdStoredModeV418||!["DIRECT_ITEM","FIXED_QUANTITY","RECIPE"].includes(bdModeV418))return row;const id=String(item?.nomenclatureItemId||""),product=id?bdProductsV418.find(p=>[p?.id,p?.nomenclatureItemId].map(String).includes(id)):void 0,expected=product?canonical(product.productKey||product.key||product.id):"",configured=String(item?.purchaseProductKey||item?.productKey||"");return id&&product&&expected&&(!configured||configured===expected)&&row.productKey===expected?row:{...row,complete:!1,reason:"mapping",productKey:expected||"",unitPrice:null,cost:null,currency:""}})',
    'rows=g.map(item=>{const bdExplicitCostV418=bdStoredModeV418&&["DIRECT_ITEM","FIXED_QUANTITY","RECIPE"].includes(bdModeV418);if(!bdExplicitCostV418)return bdTechCostRowV376(item,maps,canonical);const id=String(item?.nomenclatureItemId||""),product=id?bdProductsV418.find(p=>[p?.id,p?.nomenclatureItemId].map(String).includes(id)):void 0,expected=product?bdExplicitCostKeyV418(product.productKey||product.key||product.id):"",configured=String(item?.purchaseProductKey||item?.productKey||""),row=bdTechCostRowV376({...item,purchaseProductKey:expected,productKey:expected},bdExplicitCostMapsV418,bdExplicitCostKeyV418);return id&&product&&expected&&(!configured||configured===expected)&&row.productKey===expected?row:{...row,complete:!1,reason:"mapping",productKey:expected||"",unitPrice:null,cost:null,currency:""}})',
    "explicit exact-ID costing",
  );
  return value;
}

function patchSmallUi(source) {
  const row = scope(source, "function bdAssortmentMenuItemRowV171", "function bdAssortmentMenuV170", "menu row");
  let value = replaceOnce(
    row.value,
    "r=bdAssortmentTechCardLabelV257(n)",
    'r=e.consumptionMode==="RECIPE"?bdAssortmentTechCardLabelV257(n):e.consumptionMode==="DIRECT_ITEM"?"Готовый товар":e.consumptionMode==="FIXED_QUANTITY"?"Порция товара":e.consumptionMode==="NONE"?"Без списания":"Требуется проверка"',
    "menu row mode label",
  );
  value = replaceOnce(value, ":r+a}),e.costChangePercent", ":e.consumptionSummary||r+a}),e.costChangePercent", "menu row summary");
  source = source.slice(0, row.start) + value + source.slice(row.end);

  const detail = scope(source, "function bdAssortmentItemDetailV170", "function bdAssortmentSourceChoiceV170", "item detail");
  value = detail.value.replaceAll('e.type!=="service"', '(e.consumptionMode==="RECIPE"||e.consumptionMode==="NEEDS_REVIEW")');
  value = replaceOnce(value, "copy:e.portionSize||bdAssortmentStatusLabelV170(e.status)", "copy:e.consumptionSummary||e.portionSize||bdAssortmentStatusLabelV170(e.status)", "detail consumption summary");
  source = source.slice(0, detail.start) + value + source.slice(detail.end);

  const nomenclature = scope(source, "function bdNomenclatureSheetV237", "function bdNomenclaturePage", "nomenclature sheet");
  value = replaceOnce(
    nomenclature.value,
    'menuUsage=bdCatArray(t?.menuItems).filter(P=>P.readyProduct?.productKey===s||P.readyProduct?.nomenclatureItemId===e?.id).length,recipeUsage=bdCatArray(t?.recipes).reduce((P,C)=>P+bdCatArray(C.ingredients).filter(D=>D.purchaseProductKey===s||D.nomenclatureItemId===e?.id).length,0)',
    'menuUsage=bdCatArray(t?.menuItems).filter(P=>(!P.consumptionMode||P.consumptionMode==="DIRECT_ITEM"||P.consumptionMode==="FIXED_QUANTITY")&&(P.readyProduct?.productKey===s||P.readyProduct?.nomenclatureItemId===e?.id)).length,recipeUsage=bdCatArray(t?.recipes).reduce((P,C)=>{const D=bdCatArray(t?.menuItems).find(F=>String(F.id)===String(C.menuItemId||C.ownerId)),z=D?.consumptionMode;if(z&&z!=="RECIPE"||!z&&D?.readyProduct)return P;return P+bdCatArray(C.ingredients).filter(F=>F.purchaseProductKey===s||F.nomenclatureItemId===e?.id).length},0)',
    "active nomenclature usage",
  );
  return source.slice(0, nomenclature.start) + value + source.slice(nomenclature.end);
}

function patchLegacyCatalogPage(source) {
  const page = scope(source, "function bdCatalogPage", "function bdAssortmentTextV170", "legacy catalog page");
  let value = page.value;
  value = replaceOnce(
    value,
    'ie=async p=>{const c=bdCatState(xr(bdCatalogStoreKey)||s),I=c.menuItems.some(R=>R.id===p.id)?c.menuItems.map(R=>R.id===p.id?p:R):[p,...c.menuItems],R=p.type==="service"?c.recipes.filter(W=>W.menuItemId!==p.id):c.recipes;await V("Позиция сохранена",{...c,menuItems:I,recipes:R})}',
    'ie=async(p,bdActiveRecipeIdV418="")=>{const c=bdCatState(xr(bdCatalogStoreKey)||s),I=c.menuItems.some(R=>R.id===p.id)?c.menuItems.map(R=>R.id===p.id?p:R):[p,...c.menuItems];let R=c.recipes,W=R.filter(J=>String(J?.menuItemId||J?.ownerId||"")===String(p.id)&&J?.lifecycleStatus!=="superseded"&&J?.current!==!1);if(p.consumptionMode==="RECIPE"&&W.length>1){const J=W.findIndex((K,ce)=>String(K?.id||"legacy:"+ce)===String(bdActiveRecipeIdV418));if(J<0)throw new Error("Выберите одну техкарту, которая станет активной для будущих продаж.");const K=new Date().toISOString(),ce=W[J];R=R.map(Q=>Q===ce?{...Q,id:Q.id||crypto.randomUUID(),current:!0,lifecycleStatus:"current",inactiveReason:void 0,reactivatedAt:K}:W.includes(Q)?{...Q,current:!1,currentDraft:!1,inactiveReason:"consumption_mode_review",deactivatedAt:K}:Q),W=[ce]}if(p.consumptionMode==="RECIPE"&&!W.length){const J={id:crypto.randomUUID(),menuItemId:p.id,ownerId:p.id,ownerType:"menu_item",venueId:Number(s.activeVenueId)||p.venueId,status:"draft",reviewStatus:"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"manual",ingredients:[],warnings:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};R=[J,...R]}await V("Позиция сохранена",{...c,menuItems:I,recipes:R})}',
    "legacy menu save preserves inactive recipe",
  );
  value = replaceOnce(
    value,
    "onSave:ie,onManageStructure:",
    "onSave:ie,recipes:s.recipes,venueId:s.activeVenueId,onManageStructure:",
    "legacy menu props",
  );
  value = replaceOnce(
    value,
    "balances:s.stockBalances,onClose:()=>j(null),onSave:oe",
    "balances:s.stockBalances,venueId:s.activeVenueId,costRows:[],onClose:()=>j(null),onSave:oe",
    "legacy recipe props",
  );
  value = replaceOnce(
    value,
    'W.type!=="service"&&i.jsx("span",{className:"bd-catalog-chip "+(J?.status==="confirmed"?"good":"warn")',
    '(W.consumptionMode==="RECIPE"||W.consumptionMode==="NEEDS_REVIEW"||!W.consumptionMode&&Boolean(J))&&i.jsx("span",{className:"bd-catalog-chip "+(J?.status==="confirmed"?"good":"warn")',
    "legacy menu recipe chip",
  );
  value = replaceOnce(
    value,
    '[W.type!=="service"&&i.jsx("button",{type:"button",className:"bd-catalog-link",onClick:()=>j(W)',
    '[((W.consumptionMode==="RECIPE")||!W.consumptionMode&&Boolean(J))&&i.jsx("button",{type:"button",className:"bd-catalog-link",onClick:()=>j(W)',
    "legacy menu recipe action",
  );
  const oldRecipeFilter = 's.menuItems.filter(p=>p.active!==!1&&p.type!=="service")';
  const newRecipeFilter = 's.menuItems.filter(p=>p.active!==!1&&(p.consumptionMode==="RECIPE"||!p.consumptionMode&&Boolean(bdCatRecipeFor(p,s.recipes))))';
  if (count(value, oldRecipeFilter) !== 2) throw new Error(`${releaseToken}: legacy recipe filter expected twice`);
  value = value.replaceAll(oldRecipeFilter, newRecipeFilter);
  return source.slice(0, page.start) + value + source.slice(page.end);
}

function patchMenuLegacyReview(source) {
  const menu = scope(source, "function bdCatMenuEditor", "function bdCatStructureManager", "menu legacy review model");
  let value = menu.value;
  const start = value.indexOf("bdMenuLegacyConflictV418=");
  const end = value.indexOf(",bdMenuTaxInitial=", start);
  if (start < 0 || end < 0) throw new Error(`${releaseToken}: menu legacy review boundary missing`);
  const model = 'bdMenuLegacyConflictV418=!bdMenuStoredModeV418&&(bdMenuOwnerRecipesV418.length>1||(bdMenuHasReadyV418&&bdMenuHasRecipeV418)||(bdMenuHasReadyV418&&Boolean(e?.saleSize?.quantity))||(e?.type==="service"&&(bdMenuHasReadyV418||bdMenuHasRecipeV418))),bdMenuInitialModeV418=bdMenuStoredModeV418||(!bdMenuLegacyConflictV418?(e?.type==="service"?"NONE":bdMenuHasRecipeV418?"RECIPE":bdMenuHasReadyV418?"DIRECT_ITEM":""):"")';
  value = value.slice(0, start) + model + value.slice(end);
  return source.slice(0, menu.start) + value + source.slice(menu.end);
}

function patchRecipeCostReferences(source) {
  if (!source.includes("bdRecipeAuthoritativeCostByReferenceV418")) {
    const recipe = scope(source, "function bdCatRecipeEditor", "function bdCatImportReview", "recipe cost reference model");
    let value = replaceOnce(
      recipe.value,
      'const bdRecipeAuthoritativeCostByIdV418=new Map(bdCatArray(bdRecipeCostRows).map(p=>[String(p?.id||""),p])),bdRecipeCalculatedCostByIdV418=new Map(l.ingredients.map(p=>{const c=bdRecipeAuthoritativeCostByIdV418.get(String(p.id)),',
      'const bdRecipeAuthoritativeCostByIdV418=new Map(bdCatArray(bdRecipeCostRows).map(p=>[String(p?.id||""),p])),bdRecipeAuthoritativeCostByReferenceV418=new Map(bdCatArray(bdRecipeCostRows).flatMap(p=>[p?.nomenclatureItemId,p?.productKey,p?.purchaseProductKey].filter(Boolean).map(c=>[String(c),p]))),bdRecipeCalculatedCostByIdV418=new Map(l.ingredients.map(p=>{const c=bdRecipeAuthoritativeCostByIdV418.get(String(p.id))||bdRecipeAuthoritativeCostByReferenceV418.get(String(p.nomenclatureItemId||p.purchaseProductKey||"")),',
      "recipe cost reference lookup",
    );
    source = source.slice(0, recipe.start) + value + source.slice(recipe.end);
  }
  if (source.includes("costRows:he.menuItems?.find")) {
    source = replaceOnce(
      source,
      "balances:E.stockBalances,venueId:s.activeVenueId,costRows:he.menuItems?.find(w=>String(w.id)===String(D.id))?.ingredientRows||[],onClose:()=>z(null),onSave:ke",
      "balances:E.stockBalances,venueId:s.activeVenueId,costRows:[...(he.nomenclatureCosts||[]),...(he.menuItems?.find(w=>String(w.id)===String(D.id))?.ingredientRows||[])],onClose:()=>z(null),onSave:ke",
      "recipe canonical nomenclature costs",
    );
  }
  return source;
}

function syncMenuEditor(source) {
  const menu = scope(source, "function bdCatMenuEditor", "function bdCatStructureManager", "menu editor sync");
  const fragment = fs.readFileSync(menuFragmentPath, "utf8").trim();
  if (menu.value.trim() === fragment) return source;
  return source.slice(0, menu.start) + fragment + "\n" + source.slice(menu.end);
}

function syncFallbackAnalytics(source) {
  const fallback = scope(source, "function bdAssortmentFallbackAnalyticsV170", "function bdAssortmentHeaderV170", "fallback analytics sync");
  const replacement = patchFallback(fallback.value);
  if (fallback.value.trim() === replacement.trim()) return source;
  return source.slice(0, fallback.start) + replacement + "\n" + source.slice(fallback.end);
}

function patchAssortmentModeReadModels(source) {
  if (!source.includes('e==="needs_review"?"Выберите способ списания"')) {
    source = replaceOnce(
      source,
      'function bdAssortmentTechCardLabelV257(e){return e==="approved"?"Техкарта есть":e==="ai_draft"?"Черновик AI":e==="requires_review"?"Требует проверки":e==="link_error"?"Ошибка связи":"Нет техкарты"}',
      'function bdAssortmentTechCardLabelV257(e){return e==="approved"?"Техкарта есть":e==="ai_draft"?"Черновик AI":e==="requires_review"?"Требует проверки":e==="needs_review"?"Выберите способ списания":e==="link_error"?"Ошибка связи":"Нет техкарты"}',
      "tech-card review label",
    );
  }
  const matcher = scope(source, "function bdAssortmentMatchesV171", "function bdAssortmentHierarchyV171", "menu filter matcher");
  const matcherModel = 'function bdAssortmentMatchesV171(e,t,n){const r=e.techCardStatus||e.recipeStatus,a=e.consumptionMode==="RECIPE";return(n==="all"||n==="attention"&&e.status!=="ready"||n==="missing"&&a&&e.recipeStatus==="missing"||n==="review"&&["requires_review","needs_review"].includes(r)||n==="ai_draft"&&a&&(r==="ai_draft"||e.hasPendingDraft)||n==="with_recipe"&&a&&e.recipeStatus!=="missing")&&(!t||bdAssortmentNormV170([e.name,e.groupName,e.category].join(" ")).includes(t))}\n';
  source = source.slice(0, matcher.start) + matcherModel + source.slice(matcher.end);
  const menu = scope(source, "function bdAssortmentMenuV170", "function bdAssortmentRecipesV170", "menu filter controls");
  let menuValue = menu.value;
  const filterControls = '[{id:"all",label:"Все"},{id:"attention",label:"Требуют внимания"},{id:"missing",label:"Без техкарты"},{id:"review",label:"Требуют проверки"},{id:"ai_draft",label:"AI-черновики"},{id:"with_recipe",label:"С техкартой"}]';
  if (!menuValue.includes('{id:"attention",label:"Требуют внимания"}')) {
    menuValue = replaceOnce(
      menuValue,
      '[{id:"all",label:"Все"},{id:"missing",label:"Без техкарты"},{id:"review",label:"Требуют проверки"},{id:"ai_draft",label:"AI-черновики"},{id:"with_recipe",label:"С техкартой"}]',
      filterControls,
      "attention filter control",
    );
  }
  source = source.slice(0, menu.start) + menuValue + source.slice(menu.end);
  const recipes = scope(source, "function bdAssortmentRecipesV170", "function bdAssortmentNeedsV170", "recipe filters");
  let value = recipes.value.includes('["requires_review","needs_review"].includes(g)')
    ? recipes.value
    : replaceOnce(recipes.value, 'r==="review"&&g==="requires_review"', 'r==="review"&&["requires_review","needs_review"].includes(g)', "recipe review filter");
  source = source.slice(0, recipes.start) + value + source.slice(recipes.end);
  const home = scope(source, "function bdAssortmentHomeSignalsV170", "function bdAssortmentCommandPageV170", "home assortment signals");
  let homeModel = String.raw`function bdAssortmentHomeSignalsV170(){
  const e=bdCatState(xr(bdCatalogStoreKey)),bdProductsV418=[...bdCatArray(e.nomenclature),...bdCatArray(e.stockBalances)].filter(v=>v?.active!==!1&&v?.archived!==!0&&v?.status!=="archived"),t=e.menuItems.filter(v=>v.active!==!1).map(v=>{
    const b=bdCatArray(e.recipes).filter(N=>String(N?.menuItemId||N?.ownerId||"")===String(v.id)&&N?.lifecycleStatus!=="superseded"&&N?.current!==!1),bdReadyV418=v.readyProduct||v.readyProductLink||{},bdReadyIdV418=String(bdReadyV418.nomenclatureItemId||""),bdReadyKeyV418=String(bdReadyV418.productKey||""),bdProductV418=bdProductsV418.find(N=>bdReadyIdV418&&[N?.id,N?.nomenclatureItemId].map(String).includes(bdReadyIdV418))||bdProductsV418.find(N=>bdReadyKeyV418&&String(N?.productKey||N?.key||N?.id||"")===bdReadyKeyV418),E=Boolean(bdReadyIdV418||bdReadyKeyV418),_= ["DIRECT_ITEM","FIXED_QUANTITY","RECIPE","NONE"].includes(v?.consumptionMode)?v.consumptionMode:"",bdProductUnitV418=bdProductV418?bdCatToBase(1,bdProductV418.unit||bdProductV418.baseUnit).unit:"unknown",bdSaleUnitV418=bdCatToBase(v?.saleSize?.quantity,v?.saleSize?.unit).unit,bdExplicitInvalidV418=_==="RECIPE"&&b.length>1||_==="DIRECT_ITEM"&&(!bdProductV418||bdProductUnitV418!=="pcs")||_==="FIXED_QUANTITY"&&(!bdProductV418||!(bdCatNumber(v?.saleSize?.quantity)>0)||bdSaleUnitV418==="unknown"||bdSaleUnitV418!==bdProductUnitV418),T=bdExplicitInvalidV418?"NEEDS_REVIEW":_||(b.length>1||E&&b.length||v.type==="service"&&(E||b.length)?"NEEDS_REVIEW":v.type==="service"?"NONE":b.length===1?"RECIPE":E?"DIRECT_ITEM":"NEEDS_REVIEW");
    return{item:v,cards:b,recipe:b.length===1?b[0]:null,mode:T}
  }),n=t.filter(v=>v.mode==="NEEDS_REVIEW"),r=t.filter(v=>v.mode==="RECIPE"&&!v.recipe),a=t.filter(v=>v.mode==="RECIPE"&&v.recipe?.status!=="confirmed"),s=t.filter(v=>v.mode==="RECIPE"&&bdCatArray(v.recipe?.ingredients).some(b=>!b.nomenclatureItemId&&!b.purchaseProductKey));
  if(n.length)return[{id:"assortment-consumption",label:"Ассортимент требует выбора списания",detail:n.length+" "+bdAssortmentPluralV170(n.length,"позиция требует проверки","позиции требуют проверки","позиций требуют проверки"),href:"/catalog?tab=menu&filter=attention",tone:"red"}];
  if(r.length)return[{id:"assortment-recipes",label:"Ассортимент требует настройки",detail:r.length+" "+bdAssortmentPluralV170(r.length,"позиция без техкарты","позиции без техкарт","позиций без техкарт"),href:"/catalog?tab=recipes&filter=missing",tone:"red"}];
  if(a.length)return[{id:"assortment-review",label:"Техкарты требуют проверки",detail:a.length+" "+bdAssortmentPluralV170(a.length,"черновик","черновика","черновиков")+" не участвуют в расчётах",href:"/catalog?tab=recipes&filter=review",tone:"orange"}];
  if(s.length)return[{id:"assortment-mapping",label:"Ингредиенты не связаны с закупками",detail:"Себестоимость зависимых позиций неполна",href:"/catalog?tab=recipes&filter=review",tone:"orange"}];return[]
}
`;
  homeModel = homeModel.replace(/\n    const b=[^\n]+;\n/, String.raw`
    const b=bdCatArray(e.recipes).filter(N=>String(N?.menuItemId||N?.ownerId||"")===String(v.id)&&N?.lifecycleStatus!=="superseded"&&N?.lifecycleStatus!=="inactive"&&N?.current!==!1),bdReadyV418=v.readyProduct||v.readyProductLink||{},bdReadyIdV418=String(bdReadyV418.nomenclatureItemId||""),bdReadyKeyV418=String(bdReadyV418.productKey||""),E=Boolean(bdReadyIdV418||bdReadyKeyV418),_= ["DIRECT_ITEM","FIXED_QUANTITY","RECIPE","NONE"].includes(v?.consumptionMode)?v.consumptionMode:"",bdIdProductV418=bdReadyIdV418?bdProductsV418.find(N=>[N?.id,N?.nomenclatureItemId].map(String).includes(bdReadyIdV418)&&(!v.venueId||!N?.venueId||Number(N.venueId)===Number(v.venueId))):void 0,bdLegacyProductV418=bdIdProductV418||(!_&&bdReadyKeyV418?bdProductsV418.find(N=>String(N?.productKey||N?.key||N?.id||"")===bdReadyKeyV418&&(!v.venueId||!N?.venueId||Number(N.venueId)===Number(v.venueId))):void 0),bdProductV418=_?bdIdProductV418:bdLegacyProductV418,bdCanonicalKeyV418=String(bdProductV418?.productKey||bdProductV418?.key||bdProductV418?.id||""),bdLinkValidV418=Boolean(bdProductV418&&(!_||bdReadyIdV418&&(!bdReadyKeyV418||bdReadyKeyV418===bdCanonicalKeyV418))),bdPackagesV418=Number(bdReadyV418.packagesPerSale??1),bdProductUnitV418=bdProductV418?bdCatToBase(1,bdProductV418.unit||bdProductV418.baseUnit).unit:"unknown",bdSaleV418=bdCatToBase(v?.saleSize?.quantity,v?.saleSize?.unit),bdDirectValidV418=bdLinkValidV418&&bdProductUnitV418==="pcs"&&bdPackagesV418===1,bdFixedValidV418=bdLinkValidV418&&bdPackagesV418>0&&bdCatNumber(v?.saleSize?.quantity)>0&&bdSaleV418.unit!=="unknown"&&bdSaleV418.unit===bdProductUnitV418,bdExplicitInvalidV418=_==="RECIPE"&&b.length>1||_==="DIRECT_ITEM"&&!bdDirectValidV418||_==="FIXED_QUANTITY"&&!bdFixedValidV418,T=bdExplicitInvalidV418?"NEEDS_REVIEW":_||(b.length>1||E&&b.length||v.type==="service"&&(E||b.length)?"NEEDS_REVIEW":v.type==="service"?"NONE":b.length===1?"RECIPE":E&&bdDirectValidV418?"DIRECT_ITEM":"NEEDS_REVIEW");
`);
  return source.slice(0, home.start) + homeModel + source.slice(home.end);
}

function patchControlledStoreRejections(source) {
  source = replaceOnce(
    source,
    'async function S0(e,t,n,r){const a=await(await fetch(`${EC}/${e}`,{method:"PUT",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify({data:n,baseData:r})})).json();return a.ok?{ok:!0,data:Object.prototype.hasOwnProperty.call(a,"data")?a.data:n}:{ok:!1,data:n}}',
    'async function S0(e,t,n,r){const a=await fetch(`${EC}/${e}`,{method:"PUT",headers:{"Content-Type":"application/json",...ca(t)},body:JSON.stringify({data:n,baseData:r})}),s=await a.json();return s.ok?{ok:!0,data:Object.prototype.hasOwnProperty.call(s,"data")?s.data:n}:{ok:!1,data:n,code:s.code,error:s.error||"Сервер отклонил изменение",issues:s.issues,status:a.status}}',
    "store rejection payload",
  );
  source = replaceOnce(source, 'if(!u.ok)throw new Error(`PUT /api/store/${e} rejected`)', 'if(!u.ok)throw Object.assign(new Error(u.error||`PUT /api/store/${e} rejected`),{bdControlledStoreRejectionV418:!0,code:u.code,status:u.status,issues:u.issues})', "non-array store rejection");
  source = replaceOnce(source, 'if(!f.ok)throw new Error(`PUT /api/store/${e} rejected`)', 'if(!f.ok)throw Object.assign(new Error(f.error||`PUT /api/store/${e} rejected`),{bdControlledStoreRejectionV418:!0,code:f.code,status:f.status,issues:f.issues})', "merged store rejection");
  source = replaceOnce(source, 'if(!l.ok)throw new Error(`PUT /api/store/${e} rejected`)', 'if(!l.ok)throw Object.assign(new Error(l.error||`PUT /api/store/${e} rejected`),{bdControlledStoreRejectionV418:!0,code:l.code,status:l.status,issues:l.issues})', "object store rejection");
  source = replaceOnce(
    source,
    '}catch{return lM(e,a,t),jm(),!1}finally{pz()}',
    '}catch(l){if(l?.bdControlledStoreRejectionV418){Vm(e,a),jm();throw l}return lM(e,a,t),jm(),!1}finally{pz()}',
    "controlled store rejection propagation",
  );
  return source;
}

function patchStoreValidationRecovery(source) {
  const command = scope(source, "function bdAssortmentCommandPageV170", "/* bd-assortment-command-v170:end */", "command save recovery");
  let value = command.value;
  const saveStart = value.indexOf("Ne=async");
  const saveEnd = value.indexOf(",Ee=async(w,R=", saveStart);
  if (saveStart < 0 || saveEnd < 0) throw new Error(`${releaseToken}: command save recovery boundary missing`);
  const save = 'Ne=async(w,R,bdRequireServerV418=!1)=>{const P={...bdCatState(R),updatedAt:new Date().toISOString()},bdPhase3SaveRejectedV418=E,bdPhase3QueueBeforeV418=Gc()[bdCatalogStoreKey];_(P);try{const c=await qr(bdCatalogStoreKey,P);if(!c&&bdRequireServerV418){const bdPhase3QueueV418=Gc();return bdPhase3QueueBeforeV418?bdPhase3QueueV418[bdCatalogStoreKey]=bdPhase3QueueBeforeV418:delete bdPhase3QueueV418[bdCatalogStoreKey],lz(bdPhase3QueueV418),_(bdPhase3SaveRejectedV418),Kse(bdCatalogStoreKey,bdPhase3SaveRejectedV418),jm(),a({variant:"error",title:"Нужна связь с сервером",description:"Изменение способа списания не применено без серверной проверки."}),{synced:!1,state:bdPhase3SaveRejectedV418}}const p=bdCatState(xr(bdCatalogStoreKey)||P);return _(p),Kse(bdCatalogStoreKey,p),a({variant:c?"success":"default",title:w,description:c?"Данные сохранены в аккаунте выбранного заведения.":"Изменение сохранено локально и синхронизируется после восстановления связи."}),{synced:c,state:p}}catch(c){const p=bdCatState(xr(bdCatalogStoreKey)||bdPhase3SaveRejectedV418);throw _(p),Kse(bdCatalogStoreKey,p),a({variant:"error",title:"Изменение не сохранено",description:c instanceof Error?c.message:"Проверьте способ списания и связи с номенклатурой."}),c}}';
  value = value.slice(0, saveStart) + save + value.slice(saveEnd);
  source = source.slice(0, command.start) + value + source.slice(command.end);

  const legacy = scope(source, "function bdCatalogPage", "function bdAssortmentTextV170", "legacy catalog save recovery");
  value = legacy.value;
  const legacyStart = value.indexOf("V=async");
  const legacyEnd = value.indexOf(",Z=async", legacyStart);
  if (legacyStart < 0 || legacyEnd < 0) throw new Error(`${releaseToken}: legacy save recovery boundary missing`);
  const legacySave = 'V=async(p,c,bdRequireServerV418=!1)=>{const I={...bdCatState(c),updatedAt:new Date().toISOString()},bdPhase3LegacySaveRejectedV418=s,bdPhase3LegacyQueueBeforeV418=Gc()[bdCatalogStoreKey];l(I),Kse(bdCatalogStoreKey,I);try{const R=await qr(bdCatalogStoreKey,I);if(!R&&bdRequireServerV418){const bdPhase3LegacyQueueV418=Gc();return bdPhase3LegacyQueueBeforeV418?bdPhase3LegacyQueueV418[bdCatalogStoreKey]=bdPhase3LegacyQueueBeforeV418:delete bdPhase3LegacyQueueV418[bdCatalogStoreKey],lz(bdPhase3LegacyQueueV418),l(bdPhase3LegacySaveRejectedV418),Kse(bdCatalogStoreKey,bdPhase3LegacySaveRejectedV418),jm(),n({variant:"error",title:"Нужна связь с сервером",description:"Изменение способа списания не применено без серверной проверки."}),{synced:!1,state:bdPhase3LegacySaveRejectedV418}}const W=bdCatState(xr(bdCatalogStoreKey)||I);return l(W),Kse(bdCatalogStoreKey,W),n({variant:R?"success":"default",title:p,description:R?"Данные сохранены в аккаунте заведения.":"Изменение сохранено и будет синхронизировано при восстановлении связи."}),{synced:R,state:W}}catch(R){const W=bdCatState(xr(bdCatalogStoreKey)||bdPhase3LegacySaveRejectedV418);throw l(W),Kse(bdCatalogStoreKey,W),n({variant:"error",title:"Изменение не сохранено",description:R instanceof Error?R.message:"Проверьте способ списания."}),R}}';
  value = value.slice(0, legacyStart) + legacySave + value.slice(legacyEnd);
  return source.slice(0, legacy.start) + value + source.slice(legacy.end);
}

function syncConsumptionPersistencePaths(source) {
  if (!source.includes("function bdLegacyRecipeCanOpenV418")) {
    const legacyPageStart = source.indexOf("function bdCatalogPage");
    if (legacyPageStart < 0) throw new Error(`${releaseToken}: legacy page helper boundary missing`);
    const helper = 'function bdLegacyRecipeCanOpenV418(e,t){let n=bdCatArray(t).filter(r=>String(r?.menuItemId||r?.ownerId||"")===String(e?.id||"")&&r?.lifecycleStatus!=="superseded"&&r?.lifecycleStatus!=="inactive"&&r?.reviewStatus!=="superseded"&&r?.current!==!1),a=n.filter(r=>r?.current===!0);if(a.length)n=a;else{const r=n.filter(s=>s?.reviewStatus==="approved"||!s?.reviewStatus&&["approved","confirmed","published","ready"].includes(String(s?.status||"").toLowerCase()));r.length&&(n=r)}const r=Boolean(e?.readyProduct?.nomenclatureItemId||e?.readyProductLink?.nomenclatureItemId||e?.readyProduct?.productKey||e?.readyProductLink?.productKey);return(e?.consumptionMode==="RECIPE"||!e?.consumptionMode&&e?.type!=="service"&&!r)&&n.length===1}\n';
    source = source.slice(0, legacyPageStart) + helper + source.slice(legacyPageStart);
  }
  const command = scope(source, "function bdAssortmentCommandPageV170", "/* bd-assortment-command-v170:end */", "consumption persistence sync");
  let value = command.value;
  const menuStart = value.indexOf("Ae=async");
  const menuEnd = value.indexOf(",ke=async", menuStart);
  if (menuStart < 0 || menuEnd < 0) throw new Error(`${releaseToken}: synchronized menu save boundary missing`);
  const menuSave = commandMenuSaveModel();
  value = value.slice(0, menuStart) + menuSave + value.slice(menuEnd);
  const recipeStart = value.indexOf("ke=async");
  const recipeEnd = value.indexOf(",Oe=async", recipeStart);
  if (recipeStart < 0 || recipeEnd < 0) throw new Error(`${releaseToken}: synchronized recipe save boundary missing`);
  const recipeSave = String.raw`ke=async(w,R)=>{const P=bdCatState(E),X=P.recipes.find(p=>p.id===w.id),ce=Number(X?.version||w.version)||1,Qe={...X,...w,id:X?.id||w.id||crypto.randomUUID(),menuItemId:w.menuItemId,ownerId:w.menuItemId,ownerType:"menu_item",venueId:Number(s.activeVenueId)||w.venueId,version:ce,current:!0,currentDraft:w.status!=="confirmed",lifecycleStatus:"current",reviewStatus:w.status==="confirmed"?"approved":w.source==="ai"?"ai_draft":"requires_review"},At=P.recipes.some(p=>p.id===Qe.id)?P.recipes.map(p=>p.id===Qe.id?Qe:p):[Qe,...P.recipes],c=await Ne(w.status==="confirmed"?"Техкарта подтверждена":"Черновик сохранён",{...P,recipes:At},w.status==="confirmed"),p=bdCatArray(c.state.recipes).find(Ce=>Ce.id===Qe.id&&Ce.reviewStatus==="approved");if(w.status==="confirmed"&&(!c.synced||!p)){c.synced&&a({variant:"error",title:"Техкарта требует проверки",description:"Подтвердите связь и единицу каждого ингредиента."});return!1}return z(null),!0}`;
  value = value.slice(0, recipeStart) + recipeSave + value.slice(recipeEnd);
  value = value.replace('D&&!O&&!B&&!L&&i.jsx(bdCatRecipeEditor', 'D?.consumptionMode==="RECIPE"&&!O&&!B&&!L&&i.jsx(bdCatRecipeEditor');
  source = source.slice(0, command.start) + value + source.slice(command.end);

  const legacy = scope(source, "function bdCatalogPage", "function bdAssortmentTextV170", "legacy consumption persistence sync");
  value = legacy.value;
  const legacyStart = value.indexOf("ie=async");
  const legacyEnd = value.indexOf(",oe=async", legacyStart);
  if (legacyStart < 0 || legacyEnd < 0) throw new Error(`${releaseToken}: synchronized legacy menu save boundary missing`);
  const legacyMenuSave = legacyMenuSaveModel();
  value = value.slice(0, legacyStart) + legacyMenuSave + value.slice(legacyEnd);
  value = value.replaceAll('s.menuItems.filter(p=>p.active!==!1&&(p.consumptionMode==="RECIPE"||p.consumptionMode==="NEEDS_REVIEW"||!p.consumptionMode&&Boolean(bdCatRecipeFor(p,s.recipes))))', 's.menuItems.filter(p=>p.active!==!1&&bdLegacyRecipeCanOpenV418(p,s.recipes))');
  value = value.replaceAll('s.menuItems.filter(p=>p.active!==!1&&(p.consumptionMode==="RECIPE"||!p.consumptionMode&&Boolean(bdCatRecipeFor(p,s.recipes))))', 's.menuItems.filter(p=>p.active!==!1&&bdLegacyRecipeCanOpenV418(p,s.recipes))');
  value = value.replace('(W.consumptionMode==="RECIPE"||W.consumptionMode==="NEEDS_REVIEW"||!W.consumptionMode&&Boolean(J))&&i.jsx("button"', 'bdLegacyRecipeCanOpenV418(W,s.recipes)&&i.jsx("button"');
  value = value.replace('((W.consumptionMode==="RECIPE")||!W.consumptionMode&&Boolean(J))&&i.jsx("button"', 'bdLegacyRecipeCanOpenV418(W,s.recipes)&&i.jsx("button"');
  value = value.replace('(W.consumptionMode==="RECIPE"||W.consumptionMode==="NEEDS_REVIEW"||!W.consumptionMode&&Boolean(J))&&i.jsx("span"', 'bdLegacyRecipeCanOpenV418(W,s.recipes)&&i.jsx("span"');
  source = source.slice(0, legacy.start) + value + source.slice(legacy.end);

  const detail = scope(source, "function bdAssortmentItemDetailV170", "function bdAssortmentSourceChoiceV170", "ambiguous item detail sync");
  value = detail.value.replace('(e.consumptionMode==="RECIPE"||e.consumptionMode==="NEEDS_REVIEW")&&i.jsx("button"', 'e.consumptionMode==="RECIPE"&&i.jsx("button"');
  return source.slice(0, detail.start) + value + source.slice(detail.end);
}

function patchRecipeSavingGuard(source) {
  const recipe = scope(source, "function bdCatRecipeEditor", "function bdCatImportReview", "recipe saving guard");
  if (recipe.value.includes("bdRecipeSavingRefV418")) return source;
  let value = replaceOnce(
    recipe.value,
    '[g,y]=S.useState({}),[x,C]=S.useState({}),bdTechDialogRefV354=S.useRef(null)',
    '[g,y]=S.useState({}),[x,C]=S.useState({}),[bdRecipeSaveErrorV418,bdSetRecipeSaveErrorV418]=S.useState(""),[bdRecipeSavingV418,bdSetRecipeSavingV418]=S.useState(!1),bdRecipeSavingRefV418=S.useRef(!1),bdTechDialogRefV354=S.useRef(null)',
    "recipe saving state",
  );
  value = replaceOnce(
    value,
    'I.key==="Escape"&&!document.querySelector(".bd-quick-create-backdrop-v336")&&a()',
    'I.key==="Escape"&&!document.querySelector(".bd-quick-create-backdrop-v336")&&!bdRecipeSavingV418&&a()',
    "recipe escape guard",
  );
  value = replaceOnce(value, '},[a]);const j=', '},[a,bdRecipeSavingV418]);const j=', "recipe effect dependencies");
  const saveStart = value.indexOf("E=async p=>{");
  const saveEnd = value.indexOf(";const bdRecipeAuthoritativeCostByIdV418", saveStart);
  if (saveStart < 0 || saveEnd < 0) throw new Error(`${releaseToken}: recipe guarded save boundary missing`);
  const save = String.raw`E=async p=>{if(bdRecipeSavingRefV418.current)return!1;bdRecipeSavingRefV418.current=!0,bdSetRecipeSavingV418(!0),bdSetRecipeSaveErrorV418("");try{const c=l.ingredients.filter(I=>I.name.trim()&&bdCatNumber(I.quantity)>0).map(I=>({...I,name:I.name.trim(),quantity:bdCatNumber(I.quantity),updatedAt:new Date().toISOString()})),I=c.map(R=>{const G=d[R.id]||{},H=R.purchaseProductKey||G.key||bdCatBalanceKey(R);return{key:H,productKey:H,name:R.matchedName||R.name,category:R.category||"other",safety:Math.max(0,bdCatNumber(G.safety)),onOrder:Math.max(0,bdCatNumber(G.onOrder)),packageAmount:Math.max(0,bdCatNumber(G.packageAmount)),unit:bdCatToBase(R.quantity,R.unit).unit,metadataSource:"recipe",checkedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}),R=await s({...l,menuItemId:e.id,ownerId:e.id,ownerType:"menu_item",venueId:Number(bdRecipeVenueId)||l.venueId,status:p?"confirmed":"draft",reviewStatus:p?"approved":"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!p,ingredients:c.map(G=>({...G,venueId:Number(bdRecipeVenueId)||G.venueId})),source:l.source||"manual",updatedAt:new Date().toISOString(),confirmedAt:p?new Date().toISOString():l.confirmedAt},I);return R!==!1}catch(c){return bdSetRecipeSaveErrorV418(c instanceof Error?c.message:"Не удалось сохранить техкарту."),!1}finally{bdRecipeSavingRefV418.current=!1,bdSetRecipeSavingV418(!1)}}`;
  value = value.slice(0, saveStart) + save + value.slice(saveEnd);
  value = replaceOnce(value, 'onClick:p=>p.target===p.currentTarget&&a()', 'onClick:p=>p.target===p.currentTarget&&!bdRecipeSavingV418&&a()', "recipe backdrop guard");
  value = replaceOnce(value, 'className:"bd-catalog-close",onClick:a,"aria-label":"Закрыть техкарту"', 'className:"bd-catalog-close",onClick:a,disabled:bdRecipeSavingV418,"aria-label":"Закрыть техкарту"', "recipe close guard");
  value = replaceOnce(
    value,
    'i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",disabled:!l.ingredients.length,onClick:()=>E(!1),children:"Сохранить черновик"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:!bdTechCanConfirm,onClick:()=>E(!0),children:"Подтвердить техкарту"})]})',
    'bdRecipeSaveErrorV418&&i.jsx("div",{className:"bd-catalog-structure-error",role:"alert",children:bdRecipeSaveErrorV418}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",disabled:bdRecipeSavingV418||!l.ingredients.length,onClick:()=>E(!1),children:bdRecipeSavingV418?"Сохраняем…":"Сохранить черновик"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:bdRecipeSavingV418||!bdTechCanConfirm,onClick:()=>E(!0),children:bdRecipeSavingV418?"Сохраняем…":"Подтвердить техкарту"})]})',
    "recipe action guard",
  );
  return source.slice(0, recipe.start) + value + source.slice(recipe.end);
}

function patchImportConsumptionReview(source) {
  const review = scope(source, "function bdAssortmentImportReviewV170", "function bdAssortmentHomeSignalsV170", "import consumption review");
  const component = String.raw`function bdAssortmentImportReviewV170({draft:e,current:t,onChange:n,onCancel:r,onConfirm:a,saving:s,products:bdImportProductsV418=[]}){const[l,u]=S.useState(80),d=bdAssortmentImportDiffV170(e,t),f=(h,g)=>n({...e,menuItems:e.menuItems.map(y=>y.id===h?{...y,...g}:y)}),m=h=>bdCatArray(t?.menuItems).find(g=>bdAssortmentNormV170(g.name)===bdAssortmentNormV170(h.name)),v=h=>h.consumptionMode||m(h)?.consumptionMode||"",b=h=>h.readyProduct||m(h)?.readyProduct||{},N=h=>{const g=v(h),y=b(h),j=bdImportProductsV418.find(x=>String(x.key)===String(y.productKey)||String(x.id||x.nomenclatureItemId)===String(y.nomenclatureItemId));if(g==="NONE")return!0;if(g==="DIRECT_ITEM")return Boolean(j)&&bdCatToBase(1,j.unit).unit==="pcs";if(g==="FIXED_QUANTITY")return Boolean(j)&&bdMenuImportSizeValidV298(h);if(g==="RECIPE"){const x=m(h)?.id||h.id;return bdCatArray(e.recipes).some(C=>String(C.menuItemId||C.ownerId)===String(h.id))||bdCatArray(t?.recipes).some(C=>String(C.menuItemId||C.ownerId)===String(x))}return!1},E=e.menuItems.length>0&&e.menuItems.every(N),_=h=>{const g=v(h),y=b(h),j=bdImportProductsV418.find(C=>String(C.key)===String(y.productKey)||String(C.id||C.nomenclatureItemId)===String(y.nomenclatureItemId));return{mode:g,ready:y,product:j}};return i.jsx(bdAssortmentSheetV170,{label:"Обновление меню",title:"Проверьте изменения",copy:e.menuItems.length+" позиций распознано",onClose:r,className:"review",footer:i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"secondary danger",disabled:s,onClick:r,children:"Не сохранять"}),i.jsx("button",{type:"button",className:"primary",disabled:s||!E,onClick:a,children:s?"Сохраняю…":"Применить проверенные изменения"})]}),children:i.jsxs("div",{className:"bd-assortment-import-review-v170",children:[i.jsx("section",{className:"diff",children:[{label:"Новые",value:d.added.length,tone:"good"},{label:"Изменение цены",value:d.price.length,tone:"warning"},{label:"Изменение раздела",value:d.section.length,tone:"warning"},{label:"Нет в новом меню",value:d.missing.length,tone:"neutral"}].map(h=>i.jsxs("div",{className:h.tone,children:[i.jsx("span",{children:h.label}),i.jsx("strong",{children:h.value})]},h.label))}),d.missing.length>0&&i.jsxs("div",{className:"notice",children:[i.jsx(Of,{size:16}),i.jsxs("span",{children:[i.jsx("strong",{children:"Отсутствующие позиции не будут удалены"}),i.jsx("small",{children:"OCR мог пропустить строку. Архивирование выполняется только вручную после проверки."})]})]}),e.warnings?.length>0&&i.jsx("div",{className:"notice warning",children:e.warnings.join(" ")}),e.sourceUrl&&i.jsx("a",{href:e.sourceUrl,target:"_blank",rel:"noreferrer",children:"Открыть исходное меню"}),i.jsx("div",{className:"items",children:e.menuItems.slice(0,l).map((h,g)=>{const y=_(h);return i.jsxs("article",{children:[i.jsxs("header",{children:[i.jsxs("b",{children:["Позиция ",g+1]}),i.jsx("button",{type:"button",onClick:()=>n({...e,menuItems:e.menuItems.filter(j=>j.id!==h.id)}),children:"Исключить"})]}),i.jsx(bdCatField,{label:"Название",children:i.jsx("input",{value:h.name,onChange:j=>f(h.id,{name:j.target.value})})}),i.jsxs("div",{className:"grid",children:[i.jsx(bdCatField,{label:"Раздел",children:i.jsx("select",{value:h.department||bdCatDepartment(h),onChange:j=>f(h.id,{department:j.target.value}),children:bdCatDepartments.map(j=>i.jsx("option",{value:j.id,children:j.label},j.id))})}),i.jsx(bdCatField,{label:"Подраздел",children:i.jsx("input",{value:h.category,onChange:j=>f(h.id,{category:j.target.value})})})]}),i.jsx(bdCatField,{label:"Цена",children:i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:h.salePrice,onChange:j=>f(h.id,{salePrice:j.target.value})})}),i.jsx(bdCatField,{label:"Как списывать эту позицию со склада?",children:i.jsxs("select",{value:y.mode,onChange:j=>{const x=j.target.value;f(h.id,{consumptionMode:x,type:x==="RECIPE"?"composite":x==="NONE"?"service":"ready"})},children:[i.jsx("option",{value:"",children:"Выберите способ списания"}),i.jsx("option",{value:"DIRECT_ITEM",children:"Готовый товар"}),i.jsx("option",{value:"FIXED_QUANTITY",children:"Порция товара"}),i.jsx("option",{value:"RECIPE",children:"По техкарте"}),i.jsx("option",{value:"NONE",children:"Без списания"})]})}),(y.mode==="DIRECT_ITEM"||y.mode==="FIXED_QUANTITY")&&i.jsx(bdCatField,{label:"Номенклатура",children:i.jsxs("select",{value:y.ready.productKey||"",onChange:j=>{const x=bdImportProductsV418.find(C=>C.key===j.target.value);f(h.id,{readyProduct:j.target.value?{nomenclatureItemId:x?.id||x?.nomenclatureItemId||x?.key,productKey:x?.key,packagesPerSale:1}:void 0})},children:[i.jsx("option",{value:"",children:"Выберите складской товар"}),...bdImportProductsV418.map(j=>i.jsx("option",{value:j.key,children:j.name},j.key))]})}),y.mode==="FIXED_QUANTITY"&&i.jsx(bdMenuSaleSizeControlV298,{item:h,onChange:j=>f(h.id,j),unitOptions:e.saleSizeUnits}),y.mode==="RECIPE"&&i.jsx("small",{children:N(h)?"Будет использована одна распознанная техкарта этой позиции.":"Для режима «По техкарте» нужна распознанная или существующая техкарта."}),!N(h)&&y.mode&&i.jsx("div",{className:"notice warning",children:"Завершите настройку выбранного способа списания."})]},h.id)})}),e.menuItems.length>l&&i.jsx("button",{type:"button",className:"load-more",onClick:()=>u(h=>Math.min(e.menuItems.length,h+80)),children:"Показать ещё "+Math.min(80,e.menuItems.length-l)}),i.jsxs("div",{className:"notice good",children:[i.jsx(Pn,{size:16}),i.jsxs("span",{children:[i.jsx("strong",{children:"Черновиков техкарт: "+(e.recipes?.length||0)}),i.jsx("small",{children:"Они не попадут в себестоимость и закупочный расчёт до подтверждения пользователем."})]})]})]})})}`;
  source = source.slice(0, review.start) + component + "\n" + source.slice(review.end);
  return replaceOnce(
    source,
    "bdAssortmentImportReviewV170,{draft:A,current:E,onChange:k,onCancel:xe,onConfirm:Te,saving:J}",
    "bdAssortmentImportReviewV170,{draft:A,current:E,onChange:k,onCancel:xe,onConfirm:Te,saving:J,products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C))}",
    "import nomenclature products",
  );
}

function patchImportReviewRefinements(source) {
  const review = scope(source, "function bdAssortmentImportReviewV170", "function bdAssortmentHomeSignalsV170", "import review refinements");
  let value = review.value;
  if (!value.includes("bdSelectableImportProductsV418")) {
    value = replaceOnce(
      value,
      'products:bdImportProductsV418=[]}){const[l,u]=S.useState(80)',
      'products:bdImportProductsV418=[]}){const bdSelectableImportProductsV418=bdCatArray(bdImportProductsV418).filter(P=>P?.id||P?.nomenclatureItemId),[l,u]=S.useState(80)',
      "import canonical nomenclature choices",
    );
    value = value.replaceAll("bdImportProductsV418.find", "bdSelectableImportProductsV418.find");
    value = value.replaceAll("bdImportProductsV418.map", "bdSelectableImportProductsV418.map");
  }
  value = value.replace(
    'if(g==="FIXED_QUANTITY")return Boolean(j)&&bdMenuImportSizeValidV298(h);',
    'if(g==="FIXED_QUANTITY"){const x={...m(h),...h},C=bdCatToBase(x.saleQuantityInput??x.saleSize?.quantity,x.saleUnit||x.saleSize?.unit),D=bdCatToBase(1,j?.unit||j?.baseUnit);return Boolean(j)&&bdMenuImportSizeValidV298(x)&&C.unit!=="unknown"&&C.unit===D.unit}',
  );
  value = value.replace(
    'if(g==="RECIPE"){const x=m(h)?.id||h.id;return bdCatArray(e.recipes).some(C=>String(C.menuItemId||C.ownerId)===String(h.id))||bdCatArray(t?.recipes).some(C=>String(C.menuItemId||C.ownerId)===String(x))}',
    'if(g==="RECIPE"){const x=m(h)?.id||h.id,C=bdCatArray(t?.recipes).filter(D=>String(D.menuItemId||D.ownerId)===String(x)&&D?.lifecycleStatus!=="superseded"&&D?.lifecycleStatus!=="inactive"&&D?.current!==!1),D=bdCatArray(e.recipes).some(F=>String(F.menuItemId||F.ownerId)===String(h.id));return C.length<=1&&(D||C.length===1)}',
  );
  value = value.replace(
    'if(g==="RECIPE"){const x=m(h)?.id||h.id,C=bdCatArray(t?.recipes).filter(D=>String(D.menuItemId||D.ownerId)===String(x)&&D?.lifecycleStatus!=="superseded"&&D?.current!==!1),D=bdCatArray(e.recipes).some(F=>String(F.menuItemId||F.ownerId)===String(h.id));return C.length<=1&&(D||C.length===1)}',
    'if(g==="RECIPE"){const x=m(h)?.id||h.id,C=bdCatArray(t?.recipes).filter(D=>String(D.menuItemId||D.ownerId)===String(x)&&D?.lifecycleStatus!=="superseded"&&D?.lifecycleStatus!=="inactive"&&D?.current!==!1),D=bdCatArray(e.recipes).some(F=>String(F.menuItemId||F.ownerId)===String(h.id));return C.length<=1&&(D||C.length===1)}',
  );
  value = value.replace('value:y.ready.productKey||""', 'value:y.product?.key||""');
  value = value.replace(
    'i.jsx(bdMenuSaleSizeControlV298,{item:h,onChange:j=>f(h.id,j),unitOptions:e.saleSizeUnits})',
    'i.jsx(bdMenuSaleSizeControlV298,{item:{...m(h),...h,saleQuantityInput:h.saleQuantityInput??m(h)?.saleSize?.quantity,saleUnit:h.saleUnit||m(h)?.saleSize?.unit},onChange:j=>f(h.id,j),unitOptions:e.saleSizeUnits})',
  );
  value = value.replace(
    'value:y.product?.key||""',
    'value:String(y.product?.key||y.product?.productKey||y.product?.id||y.product?.nomenclatureItemId||"")',
  );
  value = value.replace(
    'const x=bdSelectableImportProductsV418.find(C=>C.key===j.target.value);f(h.id,{readyProduct:j.target.value?{nomenclatureItemId:x?.id||x?.nomenclatureItemId||x?.key,productKey:x?.key,packagesPerSale:1}:void 0})',
    'const x=bdSelectableImportProductsV418.find(C=>String(C.key||C.productKey||C.id||C.nomenclatureItemId)===String(j.target.value));f(h.id,{readyProduct:j.target.value?{nomenclatureItemId:x?.id||x?.nomenclatureItemId,productKey:x?.key||x?.productKey,packagesPerSale:1}:void 0})',
  );
  value = value.replace(
    '...bdSelectableImportProductsV418.map(j=>i.jsx("option",{value:j.key,children:j.name},j.key))',
    '...bdSelectableImportProductsV418.map(j=>{const x=String(j.key||j.productKey||j.id||j.nomenclatureItemId);return i.jsx("option",{value:x,children:j.name},x)})',
  );
  value = value.replace(
    'y.mode==="RECIPE"&&i.jsx("small",{children:N(h)?"Будет использована одна распознанная техкарта этой позиции.":"Для режима «По техкарте» нужна распознанная или существующая техкарта."})',
    'y.mode==="RECIPE"&&i.jsx("small",{children:N(h)?"Распознанная техкарта будет сохранена для проверки; существующая активная версия не заменяется.":"Для режима «По техкарте» нужна распознанная или существующая техкарта."})',
  );
  return source.slice(0, review.start) + value + source.slice(review.end);
}

function patchVenueSafeImports(source) {
  const command = scope(source, "function bdAssortmentCommandPageV170", "/* bd-assortment-command-v170:end */", "venue-safe import command");
  let value = command.value;
  if (value.includes("bdPhase3ImportGenerationV418")) return source;
  value = replaceOnce(
    value,
    "bdPhase3VenueRefV418=S.useRef(s.activeVenueId),me=",
    "bdPhase3VenueRefV418=S.useRef(s.activeVenueId),bdPhase3ImportGenerationV418=S.useRef(0),me=",
    "import generation ref",
  );
  value = replaceOnce(
    value,
    "S.useEffect(()=>{if(bdPhase3VenueRefV418.current===s.activeVenueId)return;bdPhase3VenueRefV418.current=s.activeVenueId,M(null),z(null),q(null),U(null),se(null)},[s.activeVenueId]);",
    "S.useEffect(()=>{if(bdPhase3VenueRefV418.current===s.activeVenueId)return;bdPhase3VenueRefV418.current=s.activeVenueId,bdPhase3ImportGenerationV418.current+=1,k(null),M(null),z(null),q(null),U(null),se(null),ee(!1),ne([])},[s.activeVenueId]);",
    "venue switch clears import work",
  );

  const importStart = value.indexOf('Ee=async(w,R="upload")=>{');
  const importEnd = value.indexOf(",Ae=async w=>{", importStart);
  if (importStart < 0 || importEnd < 0) throw new Error(`${releaseToken}: venue-safe import handlers boundary missing`);
  const handlers = String.raw`Ee=async(w,R="upload")=>{const bdImportVenueV418=Number(s.activeVenueId),bdImportTokenV418=++bdPhase3ImportGenerationV418.current,bdImportCurrentV418=()=>bdPhase3ImportGenerationV418.current===bdImportTokenV418&&Number(bdPhase3VenueRefV418.current)===bdImportVenueV418;const P=Array.isArray(w)?w:[w];if(!P.length||!me)return;Q(R==="camera"?"Читаю фотографию меню…":R==="gallery"?"Готовлю "+P.length+" страниц меню…":"Распознаю меню и цены…");try{if(P.every(c=>bdClientImageInfo(c).isImage)){const c=await bdCatalogStageImages(P,R,Q);if(!bdImportCurrentV418()){await bdCatalogDeleteFiles(c.map(oe=>oe.id)).catch(()=>{});return}try{const p=await bdCatalogRecogniseImages(c,R,Q);if(!bdImportCurrentV418()){await bdCatalogDeleteFiles(c.map(oe=>oe.id)).catch(()=>{});return}k({...p,venueId:bdImportVenueV418})}catch(p){await bdCatalogDeleteFiles(c.map(oe=>oe.id));throw p}return}const c=P[0],p=new FormData;p.append("file",c,bdUploadFileName(c,"menu-file")),p.append("source",R);const oe=await fetch("/api/catalog/import",{method:"POST",body:p}),ie=await bdUploadResponseJson(oe,"Не удалось распознать меню");if(!bdImportCurrentV418())return;k({...ie.draft,venueId:bdImportVenueV418})}catch(c){bdImportCurrentV418()&&a({variant:"error",title:"Меню не распознано",description:c instanceof Error?c.message:"Попробуйте более чёткое фото или другой файл."})}finally{bdImportCurrentV418()&&Q("")}},_e=async w=>{const bdImportVenueV418=Number(s.activeVenueId),bdImportTokenV418=++bdPhase3ImportGenerationV418.current,bdImportCurrentV418=()=>bdPhase3ImportGenerationV418.current===bdImportTokenV418&&Number(bdPhase3VenueRefV418.current)===bdImportVenueV418;Q("Открываю ссылку и извлекаю ассортимент…");try{const R=await fetch("/api/catalog/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:w})}),P=await R.json();if(!R.ok||!P.ok)throw new Error(P.error||"Не удалось прочитать ссылку");if(!bdImportCurrentV418())return;k({...P.draft,venueId:bdImportVenueV418}),q(null)}catch(R){bdImportCurrentV418()&&a({variant:"error",title:"Ссылка не прочитана",description:R instanceof Error?R.message:"Проверьте адрес."})}finally{bdImportCurrentV418()&&Q("")}},Ce=async w=>{const R=[...(w.currentTarget.files||[])],P=w.currentTarget;w.currentTarget.value="";if(!R.length)return;if(P===de.current){ne(c=>[...c,...R].slice(0,12));return}await Ee(R,P===le.current?"camera":"upload")},xe=async()=>{bdPhase3ImportGenerationV418.current+=1;const w=A;k(null);const R=bdCatArray(w?.sourceFileIds?.length?w.sourceFileIds:[w?.sourceFileId]).filter(Boolean);for(const P of R)try{await fetch("/api/catalog/files/"+encodeURIComponent(P),{method:"DELETE"})}catch{}},Te=async()=>{if(!A)return;const bdImportVenueV418=Number(A.venueId),bdActiveVenueV418=Number(s.activeVenueId);if(!(bdImportVenueV418>0)||bdImportVenueV418!==bdActiveVenueV418){bdPhase3ImportGenerationV418.current+=1,k(null),a({variant:"error",title:"Импорт не применён",description:"Заведение изменилось во время проверки. Запустите импорт заново для текущего заведения."});return}G(!0);try{const w=bdCatState(E),R=new Map(w.menuItems.map(oe=>[bdAssortmentNormV170(oe.name),oe])),P={},c=[...bdCatArray(w.priceHistory)];for(const bdRawMenuItemV298 of A.menuItems){const oe=bdMenuCleanItemV298(bdRawMenuItemV298),ie=R.get(bdAssortmentNormV170(oe.name)),X=ie?.id||oe.id;P[oe.id]=X,ie&&(c.splice(0,c.length,...bdAssortmentAppendPriceHistoryV170(c,X,ie.salePrice,oe.salePrice,oe.currency||ie.currency,"menu_import")));const ce={...ie,...oe,id:X,venueId:bdActiveVenueV418,plannedSales:ie?.plannedSales??oe.plannedSales??0,createdAt:ie?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};R.set(bdAssortmentNormV170(ce.name),ce)}const p=[...w.recipes];for(const oe of bdCatArray(A.recipes)){const ie=P[oe.menuItemId];if(!ie)continue;const X=p.findIndex(ce=>String(ce.menuItemId||ce.ownerId)===String(ie)&&ce.status==="confirmed"),ce=p.findIndex(At=>String(At.menuItemId||At.ownerId)===String(ie)&&At.status!=="confirmed"&&At.lifecycleStatus!=="superseded"),Qe={...oe,id:ce>=0?p[ce].id:oe.id||crypto.randomUUID(),menuItemId:ie,ownerId:ie,ownerType:"menu_item",venueId:bdActiveVenueV418,status:"draft",reviewStatus:"ai_draft",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"ai",ingredients:bdCatArray(oe.ingredients).map(At=>({...At,venueId:bdActiveVenueV418})),idempotencyKey:oe.idempotencyKey||"menu-import:"+String(A.id||"draft")+":"+ie,updatedAt:new Date().toISOString()};X<0&&(ce>=0?p[ce]=Qe:p.push(Qe))}const oe={...w,menuItems:[...R.values()],recipes:p,priceHistory:c,sources:[{id:A.id,venueId:bdActiveVenueV418,sourceFileId:A.sourceFileId,sourceFileIds:A.sourceFileIds,sourceUrl:A.sourceUrl,name:A.sourceFileName||A.venueName||"Меню",source:A.source,pageCount:A.pageCount||A.sourceFileIds?.length||1,status:"confirmed",importedAt:new Date().toISOString()},...w.sources.filter(ie=>ie.sourceFileId!==A.sourceFileId)].slice(0,30)};await Ne("Меню обновлено",oe),bdPhase3ImportGenerationV418.current+=1,k(null),a({variant:"success",title:"Изменения применены",description:"Пропавшие из нового файла позиции сохранены. Новые техкарты остались черновиками до проверки."})}catch{}finally{G(!1)}}`;
  value = value.slice(0, importStart) + handlers + value.slice(importEnd);
  return source.slice(0, command.start) + value + source.slice(command.end);
}

function importApplyHandlerModel() {
  return String.raw`Te=async()=>{if(!A)return;const bdImportVenueV418=Number(A.venueId),bdActiveVenueV418=Number(s.activeVenueId);if(!(bdImportVenueV418>0)||bdImportVenueV418!==bdActiveVenueV418){bdPhase3ImportGenerationV418.current+=1,k(null),a({variant:"error",title:"Импорт не применён",description:"Заведение изменилось во время проверки. Запустите импорт заново для текущего заведения."});return}G(!0);try{const w=bdCatState(E),R=new Map(w.menuItems.map(oe=>[bdAssortmentNormV170(oe.name),oe])),P={},c=[...bdCatArray(w.priceHistory)];for(const bdRawMenuItemV298 of A.menuItems){const oe=bdMenuCleanItemV298(bdRawMenuItemV298),ie=R.get(bdAssortmentNormV170(oe.name)),X=ie?.id||oe.id;P[oe.id]=X,ie&&(c.splice(0,c.length,...bdAssortmentAppendPriceHistoryV170(c,X,ie.salePrice,oe.salePrice,oe.currency||ie.currency,"menu_import")));const ce={...ie,...oe,id:X,venueId:bdActiveVenueV418,plannedSales:ie?.plannedSales??oe.plannedSales??0,createdAt:ie?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};R.set(bdAssortmentNormV170(ce.name),ce)}const p=[...w.recipes],bdImportedMenuByIdV418=new Map([...R.values()].map(oe=>[String(oe.id),oe]));for(const oe of bdCatArray(A.recipes)){const ie=P[oe.menuItemId];if(!ie)continue;const bdImportedMenuV418=bdImportedMenuByIdV418.get(String(ie)),bdRecipeIsActiveV418=bdImportedMenuV418?.consumptionMode==="RECIPE",bdIdempotencyV418=oe.idempotencyKey||"menu-import:"+String(A.id||"draft")+":"+ie,bdExistingImportV418=p.findIndex(At=>At.idempotencyKey===bdIdempotencyV418),bdOtherActiveRecipesV418=p.filter((At,bdRecipeIndexV418)=>bdRecipeIndexV418!==bdExistingImportV418&&String(At.menuItemId||At.ownerId)===String(ie)&&At.lifecycleStatus!=="superseded"&&At.lifecycleStatus!=="inactive"&&At.current!==!1),bdActivateImportedRecipeV418=bdRecipeIsActiveV418&&bdOtherActiveRecipesV418.length===0,bdExistingImportRecipeV418=bdExistingImportV418>=0?p[bdExistingImportV418]:null,Qe={...bdExistingImportRecipeV418,...oe,id:bdExistingImportRecipeV418?.id||oe.id||crypto.randomUUID(),menuItemId:ie,ownerId:ie,ownerType:"menu_item",venueId:bdActiveVenueV418,status:"draft",reviewStatus:"ai_draft",lifecycleStatus:bdActivateImportedRecipeV418?"current":"inactive",current:bdActivateImportedRecipeV418,currentDraft:bdActivateImportedRecipeV418,source:"ai",ingredients:bdCatArray(oe.ingredients).map(At=>({...At,venueId:bdActiveVenueV418})),idempotencyKey:bdIdempotencyV418,inactiveReason:bdActivateImportedRecipeV418?void 0:bdOtherActiveRecipesV418.length?"existing_recipe_requires_review":"menu_consumption_mode",updatedAt:new Date().toISOString()};bdExistingImportV418>=0?p[bdExistingImportV418]=Qe:p.push(Qe)}const oe={...w,menuItems:[...R.values()],recipes:p,priceHistory:c,sources:[{id:A.id,venueId:bdActiveVenueV418,sourceFileId:A.sourceFileId,sourceFileIds:A.sourceFileIds,sourceUrl:A.sourceUrl,name:A.sourceFileName||A.venueName||"Меню",source:A.source,pageCount:A.pageCount||A.sourceFileIds?.length||1,status:"confirmed",importedAt:new Date().toISOString()},...w.sources.filter(ie=>ie.sourceFileId!==A.sourceFileId)].slice(0,30)},bdImportSavedV418=await Ne("Меню обновлено",oe,!0);if(!bdImportSavedV418.synced)return;bdPhase3ImportGenerationV418.current+=1,k(null),a({variant:"success",title:"Изменения применены",description:"Распознанные техкарты сохранены для проверки; существующие активные версии не заменены."})}catch(bdImportErrorV418){bdImportErrorV418?.bdControlledStoreRejectionV418||a({variant:"error",title:"Импорт не применён",description:bdImportErrorV418 instanceof Error?bdImportErrorV418.message:"Повторите попытку."})}finally{G(!1)}}`;
}

function patchImportApplyHandler(source) {
  const command = scope(source, "function bdAssortmentCommandPageV170", "/* bd-assortment-command-v170:end */", "import apply handler");
  let value = command.value;
  const start = value.indexOf("Te=async()=>{");
  const end = value.indexOf("},Ae=async", start);
  if (start < 0 || end < 0) throw new Error(`${releaseToken}: import apply refinement boundary missing`);
  const handler = importApplyHandlerModel();
  value = value.slice(0, start) + handler + value.slice(end + 1);
  return source.slice(0, command.start) + value + source.slice(command.end);
}

function finalizePhase3Bundle(source) {
  const malformedImportClosure = ']},h.id)})})}),e.menuItems.length>l&&i.jsx("button",{type:"button",className:"load-more"';
  const validImportClosure = ']},h.id)})}),e.menuItems.length>l&&i.jsx("button",{type:"button",className:"load-more"';
  if (source.includes(malformedImportClosure)) {
    source = replaceOnce(source, malformedImportClosure, validImportClosure, "import review closure repair");
  }
  source = patchMenuLegacyReview(source);
  source = syncMenuEditor(source);
  source = patchRecipeCostReferences(source);
  source = patchRecipeSavingGuard(source);
  source = syncFallbackAnalytics(source);
  source = patchAssortmentModeReadModels(source);
  if (!source.includes("bdControlledStoreRejectionV418")) source = patchControlledStoreRejections(source);
  source = patchStoreValidationRecovery(source);
  if (!source.includes("bdImportProductsV418")) source = patchImportConsumptionReview(source);
  source = patchImportReviewRefinements(source);
  source = patchVenueSafeImports(source);
  source = syncConsumptionPersistencePaths(source);
  source = patchImportApplyHandler(source);
  return source;
}

function verifyBundle(source) {
  const required = [
    bundleMarker,
    "Как списывать эту позицию со склада?",
    "Готовый товар",
    "Порция товара",
    "По техкарте",
    "Без списания",
    "bd-menu-consumption-grid-v418",
    "bdRecipeCalculatedCostByIdV418",
    "bd-tech-card-total-v418",
    "bdPhase3VenueRefV418",
    'recipe:bdCatRecipeFor(D,E.recipes)',
    'recipes:a.filter(m=>m.consumptionMode==="RECIPE"||m.consumptionMode==="NEEDS_REVIEW")',
    'onSave:ie,recipes:s.recipes,venueId:s.activeVenueId,onManageStructure:',
    'p.consumptionMode==="RECIPE"&&!W.length',
    "bdMenuOwnerRecipesV418.length>1",
    "bdRecipeAuthoritativeCostByReferenceV418",
    "he.nomenclatureCosts||[]",
    'id:"assortment-consumption"',
    "bdControlledStoreRejectionV418",
    "bdPhase3SaveRejectedV418",
    "bdImportProductsV418",
    "bdPhase3ImportGenerationV418",
    "bdMenuRecipeChoiceRequiredV418",
    'inactiveReason:"consumption_mode_review"',
    "bdRecipeSavingRefV418",
    'n==="attention"&&e.status!=="ready"',
    'version:"assortment-fallback-v418"',
    "bdExplicitCostMapsV418",
    "bdExplicitCostKeyV418",
    "bdSelectableImportProductsV418",
    'inactiveReason:bdActivateImportedRecipeV418?void 0:bdOtherActiveRecipesV418.length?"existing_recipe_requires_review":"menu_consumption_mode"',
    "bdRequireServerV418",
    'D?.consumptionMode==="RECIPE"',
    "bdImportSavedV418",
  ];
  for (const token of required) if (!source.includes(token)) throw new Error(`${releaseToken}: bundle invariant missing: ${token}`);
  const forbidden = [
    "bdMenuExactProductsV352=",
    'ingredients:e.type==="ready"?',
    'w.type==="service"?R.recipes.filter',
    'p.type==="service"?c.recipes.filter',
    "legacyPortionSize:void 0,portionSize:void 0",
    '(e.consumptionMode==="RECIPE"||e.consumptionMode==="NEEDS_REVIEW")&&i.jsx("button"',
    "expected=product?canonical(product.productKey||product.key||product.id)",
  ];
  for (const token of forbidden) if (source.includes(token)) throw new Error(`${releaseToken}: obsolete duplicate path remains: ${token}`);
  if (count(source, bundleMarker) !== 1) throw new Error(`${releaseToken}: bundle marker must occur once`);
}

let bundle = fs.readFileSync(bundlePath, "utf8");
if (bundle.includes("bdLineCostV418.currency")) {
  const closureAnchor = 'bdLineCostV418.currency):"—"';
  const buttonAnchor = ',i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:b,children:"+ Добавить ингредиент"})';
  const closureStart = bundle.indexOf(closureAnchor);
  const closureEnd = bundle.indexOf(buttonAnchor, closureStart + closureAnchor.length);
  if (closureStart < 0 || closureEnd < 0) throw new Error(`${releaseToken}: recipe article closure boundary missing`);
  bundle = bundle.slice(0, closureStart + closureAnchor.length) + ']})]})]},p.id)})})' + bundle.slice(closureEnd);
  fs.writeFileSync(bundlePath, bundle);
}
if (!bundle.includes(bundleMarker)) {
  const menu = scope(bundle, "function bdCatMenuEditor", "function bdCatStructureManager", "menu editor");
  const recipe = scope(bundle, "function bdCatRecipeEditor", "function bdCatImportReview", "recipe editor");
  const command = scope(bundle, "function bdAssortmentCommandPageV170", "/* bd-assortment-command-v170:end */", "command page");
  const expected = [
    [menu, "5385268455946c1c491e6543520532204f59bcb1961fad4db009554a7feb57c6", "menu editor"],
    [recipe, "7c734e55ec95278323fddbbdc634a5fe645a737cdc3ce954e0aee95e1b25c639", "recipe editor"],
    [command, "272b8c746d075e05e6403989846b05360d4e3d200ba57bc58ecfdd3b6b8a657a", "command page"],
  ];
  for (const [segment, hash, label] of expected) {
    const actual = sha256(segment.value);
    if (actual !== hash) throw new Error(`${releaseToken}: unexpected ${label} input ${actual}`);
  }
  const menuFragment = fs.readFileSync(menuFragmentPath, "utf8").trim();
  bundle = bundle.slice(0, menu.start) + `${bundleMarker}\n${menuFragment}\n` + bundle.slice(menu.end);
  let current = scope(bundle, "function bdCatRecipeEditor", "function bdCatImportReview", "recipe editor after menu");
  bundle = bundle.slice(0, current.start) + patchRecipe(current.value) + bundle.slice(current.end);
  current = scope(bundle, "function bdAssortmentFallbackAnalyticsV170", "function bdAssortmentHeaderV170", "fallback analytics");
  bundle = bundle.slice(0, current.start) + patchFallback(current.value) + bundle.slice(current.end);
  current = scope(bundle, "function bdAssortmentCommandPageV170", "/* bd-assortment-command-v170:end */", "command page after menu");
  bundle = bundle.slice(0, current.start) + patchCommand(current.value) + bundle.slice(current.end);
  bundle = patchSmallUi(bundle);
  bundle = patchLegacyCatalogPage(bundle);
  bundle = finalizePhase3Bundle(bundle);
  verifyBundle(bundle);
  fs.writeFileSync(bundlePath, bundle);
} else {
  if (bundle.includes('p.type==="service"?c.recipes.filter')) {
    bundle = patchLegacyCatalogPage(bundle);
  }
  bundle = finalizePhase3Bundle(bundle);
  fs.writeFileSync(bundlePath, bundle);
  verifyBundle(bundle);
}

const cssPath = path.join(root, "public/catalog.css");
let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes(cssMarker)) {
  css += String.raw`

/* ${cssMarker} */
.bd-menu-recipe-review-v418{display:grid;gap:6px;min-width:0}.bd-menu-recipe-review-v418 select{width:100%;min-width:0}.bd-menu-recipe-review-v418 small{color:#697087;line-height:1.4}
@media(max-width:520px){.bd-menu-recipe-review-v418{width:100%;max-width:100%;min-width:0}}
.bd-menu-consumption-fieldset-v418{border:0;margin:0;padding:0;min-width:0}.bd-menu-consumption-fieldset-v418 legend{font-size:14px;font-weight:800;margin-bottom:10px}.bd-menu-consumption-grid-v418{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}.bd-menu-consumption-option-v418{min-width:0;text-align:left;border:1px solid #dfe3ec;border-radius:12px;background:#fff;padding:12px;display:grid;gap:4px;color:#24293a}.bd-menu-consumption-option-v418 strong{font-size:14px}.bd-menu-consumption-option-v418 span{font-size:12px;line-height:1.35;color:#697087}.bd-menu-consumption-option-v418.is-selected{border-color:#4a55df;background:#f1f2ff;box-shadow:0 0 0 1px #4a55df}.bd-menu-consumption-review-v418{grid-column:1/-1;border:1px solid #e8a53a;background:#fff8e8;border-radius:12px;padding:11px;display:grid;gap:3px}.bd-menu-consumption-review-v418 span{font-size:12px;line-height:1.4}.bd-menu-consumption-summary-v418{min-width:0;overflow-wrap:anywhere}.bd-tech-cost-row-v418,.bd-tech-card-total-v418{border-radius:10px;background:#f5f6fa;padding:9px 11px;display:flex;justify-content:space-between;gap:12px;align-items:center;min-width:0}.bd-tech-cost-row-v418 span,.bd-tech-card-total-v418 span{font-size:12px;color:#697087}.bd-tech-cost-row-v418 strong,.bd-tech-card-total-v418 strong{text-align:right;font-size:13px}.bd-tech-card-total-v418{margin-top:8px;background:#eef8f2;border:1px solid #cce7d6}
@media(max-width:520px){.bd-menu-consumption-grid-v418{grid-template-columns:minmax(0,1fr)}.bd-menu-consumption-fieldset-v418,.bd-menu-consumption-grid-v418,.bd-menu-consumption-option-v418,.bd-tech-cost-row-v418,.bd-tech-card-total-v418{width:100%;max-width:100%;min-width:0}.bd-tech-cost-row-v418,.bd-tech-card-total-v418{align-items:flex-start;flex-direction:column}.bd-tech-cost-row-v418 strong,.bd-tech-card-total-v418 strong{text-align:left}.bd-menu-position-editor-v400>.bd-catalog-form{overflow-x:hidden}.bd-menu-position-editor-v400 .bd-catalog-sheet-actions{position:fixed}}
`;
  fs.writeFileSync(cssPath, css);
}

const referenceTargets = [
  "app/bar-doctor-response.ts",
  "public/app.html",
  "public/bardoctor-preview.js",
  "public/bardoctor-preview-v396.js",
  "public/bardoctor-preview-v397.js",
  "dist/client/app.html",
  "dist/client/bardoctor-preview.js",
  "dist/client/bardoctor-preview-v396.js",
  "dist/client/bardoctor-preview-v397.js",
];
for (const relativePath of referenceTargets) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, "utf8");
  const next = source
    .replace(/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : `${match}-${releaseToken}`)
    .replace(/catalog\.css\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : `${match}-${releaseToken}`)
    .replace(/bardoctor-preview-v397\.js\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : `${match}-${releaseToken}`);
  fs.writeFileSync(filePath, next);
}

console.log(`${releaseToken}: applied`);
