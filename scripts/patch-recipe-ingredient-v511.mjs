import fs from 'node:fs';
const file='public/assets/index-BQGspy0I.js';let source=fs.readFileSync(file,'utf8');
const start=source.indexOf('function bdCatRecipeEditor('),end=source.indexOf('function bdCatImportReview(',start);
if(start<0||end<start)throw Error('Recipe editor boundaries missing');
let editor=source.slice(start,end);
function once(a,b){if(editor.split(a).length!==2)throw Error('Recipe v511 anchor missing/ambiguous: '+a.slice(0,90));editor=editor.replace(a,b)}
if(!editor.includes('bdRecipeIngredientV511')){
 once('name:"",quantity:1,unit:"шт.",confidence:1,matchTier:"low"','name:"",quantity:1,unit:"шт.",confidence:1,matchTier:"low",_editorNewIngredient:true');
 const selectStart=editor.indexOf('N=(p,c,I)=>'),selectEnd=editor.indexOf(',K=(p,c,I)=>',selectStart);
 if(selectStart<0||selectEnd<selectStart)throw Error('Recipe select boundaries missing');
 editor=editor.slice(0,selectStart)+'N=(p,c,I)=>{const product=I||n.find(row=>(row.key||row.productKey)===c),patch=bdRecipeChooseV511(p,product,bdRecipeVenueId);if(!patch)return;j(p.id,patch);const balance=r.find(row=>row.key===c)||{};v(p.id,{key:c,current:balance.current??"",safety:balance.safety??"",onOrder:balance.onOrder??"",packageAmount:balance.packageAmount??"",checkedAt:balance.checkedAt||""});h(rows=>({...rows,[p.id]:false}))}'+editor.slice(selectEnd);
 const fieldStart=editor.indexOf('i.jsx(bdCatField,{label:"Название",children:i.jsx("input",{value:p.name'),fieldEnd=editor.indexOf('i.jsxs("div",{className:"bd-tech-cost-row-v418"',fieldStart);
 if(fieldStart<0||fieldEnd<fieldStart)throw Error('Recipe fields missing');
 editor=editor.slice(0,fieldStart)+'i.jsx(bdRecipeIngredientV511,{line:p,products:bdTechCompleteProductsV375(n),venueId:bdRecipeVenueId,onChange:patch=>j(p.id,patch),onChoose:(G,H)=>{N(p,G,H),h(J=>({...J,[p.id]:!1}))}}),'+editor.slice(fieldEnd);
 const costStart=editor.indexOf('bdRecipeCalculatedCostByIdV418=new Map('),costEnd=editor.indexOf(',bdRecipeCalculatedCostsV418=',costStart);
 if(costStart<0||costEnd<costStart)throw Error('Recipe cost boundaries missing');
 editor=editor.slice(0,costStart)+'bdRecipeCalculatedCostByIdV418=new Map(l.ingredients.map(p=>[String(p.id),bdRecipeLineCostV511(p,bdRecipeCostRows,bdTechCompleteProductsV375(n),bdRecipeVenueId)]))'+editor.slice(costEnd);
 const validStart=editor.indexOf('bdTechInvalidCount='),validEnd=editor.indexOf(',bdTechLinkedCount=',validStart);
 editor=editor.slice(0,validStart)+'bdTechInvalidCount=l.ingredients.filter(p=>bdIngredientReferenceConflictV440(p,n)||!p.name.trim()||!bdRecipeProductV511(p,bdTechCompleteProductsV375(n),bdRecipeVenueId)||!bdRecipeAmountV511(p,bdRecipeProductV511(p,bdTechCompleteProductsV375(n),bdRecipeVenueId))).length'+editor.slice(validEnd);
 once('name:I.name.trim(),quantity:bdCatNumber(I.quantity),','name:I.name.trim(),_editorNewIngredient:undefined,quantity:bdCatNumber(I.quantity),');
 once('bdTechCanConfirm?"Техкарта готова к подтверждению":"Завершите обязательные связи"','bdTechCanConfirm?(bdRecipeTotalCostV418!==null?"Нормы и себестоимость проверены":"Нормы проверены · себестоимость неполная"):"Проверьте ингредиенты и нормы"');
 once('"нет подтверждённых данных"','bdLineCostV418?.reason==="unit"?"уточните единицу и норму":bdLineCostV418?.reason==="mapping"?"выберите складской товар":bdLineCostV418?.reason==="price_unit"?"единица цены требует проверки":"нет подтверждённой цены выбранного товара"');
 once('Цена появится после authoritative закупки.','Проверьте подсказку у каждой строки: связь, единицу нормы или подтверждённую цену товара.');
 once('Явно выберите правильную номенклатуру в поле связи.','Явно выберите правильный товар в поле «Ингредиент».');
 // On-save validation stays distinct from draft saving; no false confirmation via event handlers.
 once('if(bdRecipeSavingRefV418.current)return!1;bdRecipeSavingRefV418.current=!0', 'if(p&&!bdTechCanConfirm){bdSetRecipeSaveErrorV418("Проверьте ингредиенты и нормы перед подтверждением.");return false}if(bdRecipeSavingRefV418.current)return!1;bdRecipeSavingRefV418.current=!0');
}
if(!editor.includes('const bdRecipeProductsV511=')) {
 editor=editor.replaceAll('bdTechCompleteProductsV375(n)','bdRecipeProductsV511');
 editor=editor.replace('const bdRecipeAuthoritativeCostByIdV418=', 'const bdRecipeProductsV511=bdTechCompleteProductsV375(n);const bdRecipeAuthoritativeCostByIdV418=');
}
if(!editor.includes('bdUseRecipeBackV511(bdTechCloseV438'))editor=editor.replace('S.useEffect(()=>{const p=document.body.style.overflow', 'bdUseRecipeBackV511(bdTechCloseV438,bdTechDirtyRefV438,bdTechDialogRefV354);S.useEffect(()=>{const p=document.body.style.overflow');
editor=editor.replace('bdUseRecipeBackV511(bdTechCloseV438);','bdUseRecipeBackV511(bdTechCloseV438,bdTechDirtyRefV438,bdTechDialogRefV354);');
source=source.slice(0,start)+editor+source.slice(end);
const helper=fs.readFileSync('scripts/fragments/recipe-ingredient-v511.fragment.txt','utf8').trim();
const hs=source.indexOf('/* Recipe ingredient selection v511:'),he=hs<0?-1:source.indexOf('function bdCatImportReview(',hs);
if(hs>=0)source=source.slice(0,hs)+helper+'\n'+source.slice(he);
else source=source.replace('function bdCatImportReview(',helper+'\nfunction bdCatImportReview(');
source=source.replace('function bdCatIngredientMatchV375({ingredient:e,products:t,','function bdCatIngredientMatchV375({ingredient:e,venueId:bdPickerVenueV511,products:t,');
source=source.replace('products=bdTechCompleteProductsV375(t),sections=','products=bdTechCompleteProductsV375(t).filter(item=>!bdPickerVenueV511||!item.venueId||Number(item.venueId)===Number(bdPickerVenueV511)),sections=');
fs.writeFileSync(file,source);
for(const path of ['app/bar-doctor-response.ts','public/app.html']) {
 const before=fs.readFileSync(path,'utf8');
 const after=before.replace(/catalog\.css\?v=([^"']+)/g,(match,version)=>version.includes('recipe-ingredient-v511')?match:match+'-recipe-ingredient-v511');
 if(after!==before)fs.writeFileSync(path,after);
}
console.log('Recipe ingredient v511 applied');
