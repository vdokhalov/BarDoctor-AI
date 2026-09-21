import fs from 'node:fs';
const file='public/assets/index-BQGspy0I.js';
let source=fs.readFileSync(file,'utf8');
const helper=fs.readFileSync('scripts/fragments/tech-card-access-v440.fragment.txt','utf8').replace(/^\uFEFF/,'').trim();
function once(before,after){if(source.split(before).length!==2)throw Error('access v440 anchor missing/ambiguous '+before.slice(0,120));source=source.replace(before,after)}
if(!source.includes('function bdEditableRecipesV440(')){
 once('function bdCatRecipeEditor(',helper+'\nfunction bdCatRecipeEditor(');
 once('j(p.id,c?{purchaseProductKey:c,nomenclatureItemId:R?.id||R?.nomenclatureItemId||c,','j(p.id,c?{...bdIngredientReferencePatchV440(R,c),');
 once('}:{purchaseProductKey:void 0,matchedName:void 0,linkStatus:"missing"', '}:{...bdIngredientReferencePatchV440(null,""),matchedName:void 0,linkStatus:"missing"');
 // Only explicitly selected products in the editor catalogue can replace a reference.
 once('N=(p,c,I)=>{const R=I||n.find(G=>G.key===c),W=', 'N=(p,c,I)=>{const R=I||n.find(G=>(G.key||G.productKey)===c);if(c&&(!R||(R.key||R.productKey)!==c||R.venueId&&Number(R.venueId)!==Number(bdRecipeVenueId)))return;const W=');
 once('function bdAssortmentItemDetailV170({item:e,onClose:t,onEdit:n,onRecipe:r,canManage:a})','function bdAssortmentItemDetailV170({item:e,onClose:t,onEdit:n,onRecipe:r,canManage:a,hasEditableRecipe:bdHasEditableRecipeV440})');
 // Existing recipes are available independently of the item's consumption mode.
 once('e.consumptionMode==="RECIPE"&&i.jsx("button",{type:"button",className:"primary",onClick:r,', '(bdHasEditableRecipeV440||e.consumptionMode==="RECIPE")&&i.jsx("button",{type:"button",className:"primary",onClick:r,');
 once('children:e.recipeId?f==="approved"?"Открыть техкарту":"Проверить техкарту":"Создать техкарту"','children:bdHasEditableRecipeV440?"Редактировать техкарту":"Создать техкарту"');
 once('item:ge,onClose:be,','item:ge,hasEditableRecipe:bdEditableRecipesV440(E.menuItems.find(w=>w.id===ge.id),E.recipes,s.activeVenueId).length>0,onClose:be,');
 once('&&bdLegacyRecipeCanOpenV418(D,E.recipes)&&!O&&!B&&!L', '&&me&&!O&&!B&&!L');
 once('i.jsx(bdCatRecipeEditor,{item:D,recipe:bdCatRecipeFor(D,E.recipes),','i.jsx(bdExistingRecipeEditorV440,{item:D,recipes:E.recipes,canManage:me,');
 once('y&&i.jsx(bdCatRecipeEditor,{item:y,recipe:bdCatRecipeFor(y,s.recipes),','y&&L&&i.jsx(bdExistingRecipeEditorV440,{item:y,recipes:s.recipes,canManage:L,');
 once('item:O.id?O:null,horizon:', 'key:String(s.activeVenueId)+":"+(O.id||"new"),item:O.id?O:null,onOpenRecipe:()=>{M(null);z(O)},horizon:');
 once('item:h.id?h:null,horizon:', 'key:String(s.activeVenueId)+":"+(h.id||"new"),item:h.id?h:null,onOpenRecipe:()=>{g(null);j(h)},horizon:');
}
if(!source.includes('bdIngredientReferenceConflictV440(p,n)||')){
 once('bdTechInvalidCount=l.ingredients.filter(p=>','bdTechInvalidCount=l.ingredients.filter(p=>bdIngredientReferenceConflictV440(p,n)||');
 once('className:"bd-catalog-form bd-explicit-form-scroll-v438",children:[','className:"bd-catalog-form bd-explicit-form-scroll-v438",children:[l.ingredients.some(p=>bdIngredientReferenceConflictV440(p,n))&&i.jsx("p",{className:"bd-catalog-structure-error",role:"alert",children:"ID и складской ключ ингредиента указывают на разные товары. Явно выберите правильную номенклатуру в поле связи."}),');

}
if(!source.includes('bd-tech-card-direct-action-v440')){
 once('(e.consumptionMode==="RECIPE"||e.consumptionMode==="NEEDS_REVIEW")&&i.jsxs("section",{className:"bd-tech-card-detail-v257",children:[','(bdHasEditableRecipeV440||e.consumptionMode==="RECIPE"||e.consumptionMode==="NEEDS_REVIEW")&&i.jsxs("section",{className:"bd-tech-card-detail-v257",children:[a&&bdHasEditableRecipeV440&&i.jsx("button",{type:"button",className:"bd-catalog-primary bd-tech-card-direct-action-v440",onClick:r,children:"Редактировать техкарту"}),');
 once('(bdHasEditableRecipeV440||e.consumptionMode==="RECIPE")&&i.jsx("button",','(!bdHasEditableRecipeV440&&e.consumptionMode==="RECIPE")&&i.jsx("button",');
}
if(source.includes('if(w.status==="confirmed"&&(!c.synced||!p))'))once('if(w.status==="confirmed"&&(!c.synced||!p))','if(!c.synced||w.status==="confirmed"&&!p)');
source=source.replaceAll('bdLegacyRecipeCanOpenV418(p,s.recipes)','bdEditableRecipesV440(p,s.recipes,s.activeVenueId).length>0').replaceAll('bdLegacyRecipeCanOpenV418(W,s.recipes)','bdEditableRecipesV440(W,s.recipes,s.activeVenueId).length>0');
source=source.replace("const R=n.find(G=>(G.key||G.productKey)===c&&(!G.venueId||Number(G.venueId)===Number(bdRecipeVenueId)));if(c&&!R)return;const W=","const R=I||n.find(G=>(G.key||G.productKey)===c);if(c&&(!R||(R.key||R.productKey)!==c||R.venueId&&Number(R.venueId)!==Number(bdRecipeVenueId)))return;const W=");
// Refresh helper definitions on prepared clients as well as first-time builds.
if(!source.includes('const bdRecipeSourceChangedV442=')){
 once('bdUseExplicitFormViewportV438(bdTechDialogRefV354);','bdUseExplicitFormViewportV438(bdTechDialogRefV354);const bdRecipeSourceChangedV442=bdUseRecipeRefreshV442(t,r,bdTechDirtyRefV438,bdRecipeSavingRefV418,u,f);');
 once('E=async p=>{if(bdRecipeSavingRefV418.current)return!1;', 'E=async p=>{if(bdRecipeSourceChangedV442){bdSetRecipeSaveErrorV418(bdRecipeRefreshMessageV442);return!1}if(bdRecipeSavingRefV418.current)return!1;');
 once('saveDisabledReason:!l.ingredients.length?', 'saveDisabledReason:bdRecipeSourceChangedV442?bdRecipeRefreshMessageV442:!l.ingredients.length?');
 once('onClick:()=>E(!1),disabled:!l.ingredients.length', 'onClick:()=>E(!1),disabled:bdRecipeSourceChangedV442||!l.ingredients.length');
}
source=source.replace('bdTechCanConfirm=!bdRecipeSourceChangedV442&&l.ingredients.length>0', 'bdTechCanConfirm=l.ingredients.length>0');
source=source.replace('error:bdRecipeSourceChangedV442?bdRecipeRefreshMessageV442:bdRecipeSaveErrorV418,','error:bdRecipeSaveErrorV418,');
source=source.replace('saveDisabled:!bdTechCanConfirm,','saveDisabled:bdRecipeSourceChangedV442||!bdTechCanConfirm,');
if(!source.includes('children:[bdRecipeSourceChangedV442&&'))once('className:"bd-catalog-form bd-explicit-form-scroll-v438",children:[','className:"bd-catalog-form bd-explicit-form-scroll-v438",children:[bdRecipeSourceChangedV442&&i.jsx("p",{className:"bd-catalog-structure-error",role:"alert",children:bdRecipeRefreshMessageV442}),');
source=source.replace('resolutionStatus:"linked_ready",linkStatus:p.linkSource===', 'resolutionStatus:bdIngredientReferenceConflictV440(p,n)?"reference_conflict":"linked_ready",linkStatus:p.linkSource===');
const helperStart=source.indexOf('function bdEditableRecipesV440(');
const helperEnd=source.indexOf('function bdCatRecipeEditor(',helperStart);
if(helperStart<0||helperEnd<helperStart)throw Error('access helper boundaries missing');
source=source.slice(0,helperStart)+helper+'\n'+source.slice(helperEnd);
fs.writeFileSync(file,source);
const path='scripts/fragments/menu-consumption-sot-v418.fragment.txt';
let menu=fs.readFileSync(path,'utf8');
if(!menu.includes('onOpenRecipe:bdMenuOpenRecipeV440')){
 menu=menu.replace('onClose:a,onSave:s,','onClose:a,onSave:s,onOpenRecipe:bdMenuOpenRecipeV440,');
 menu=menu.replace('bdMenuOwnerRecipesV418=bdCatArray(bdMenuRecipes).filter(P=>String(P?.menuItemId||P?.ownerId||"")===String(e?.id||"")&&P?.lifecycleStatus!=="superseded"&&P?.lifecycleStatus!=="inactive"&&P?.current!==!1)','bdMenuOwnerRecipesV418=bdEditableRecipesV440(e,bdMenuRecipes,bdMenuVenueId)');
 const anchor='h.consumptionMode==="RECIPE"&&!bdMenuRecipeChoiceRequiredV418&&i.jsx("p",';
 if(!menu.includes(anchor))throw Error('access v440 menu action anchor');
 menu=menu.replace(anchor,'bdMenuHasRecipeV418&&bdMenuOpenRecipeV440&&i.jsx("button",{type:"button",className:"bd-catalog-secondary",disabled:bdMenuSavingV418,onClick:()=>{bdMenuCloseV435()&&bdMenuOpenRecipeV440()},children:"Редактировать техкарту"}),h.consumptionMode==="RECIPE"&&!bdMenuHasRecipeV418&&!bdMenuRecipeChoiceRequiredV418&&i.jsx("p",');
 fs.writeFileSync(path,menu);
}
console.log('Applied general tech-card access and explicit reference selection v440');
