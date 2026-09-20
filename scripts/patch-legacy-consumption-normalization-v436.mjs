import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "bd-legacy-consumption-normalization-v436";
const releaseToken = "20260919-legacy-consumption-normalization-v436";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const fragmentPath = path.join(root, "scripts/fragments/menu-consumption-sot-v418.fragment.txt");

function transform(source) {
  const cleanDraft = "{saleQuantityInput:I,saleUnit:R,activeRecipeId:bdActiveRecipeIdV418,readyProduct:bdLegacyReadyProductV436,readyProductLink:bdLegacyReadyProductLinkV436,readyProductKey:bdLegacyReadyProductKeyV436,nomenclatureItemId:bdLegacyNomenclatureIdV436,saleSize:bdLegacySaleSizeV436,portionSize:bdLegacyPortionSizeV436,legacyPortionSize:bdLegacyReviewSizeV436,...K}=h,Q=";
  if (!source.includes(cleanDraft)) {
    const legacyDraft = "{saleQuantityInput:I,saleUnit:R,activeRecipeId:bdActiveRecipeIdV418,...K}=h,Q=";
    const count = source.split(legacyDraft).length - 1;
    if (count !== 1) throw new Error(`${marker}: editor save draft expected once, found ${count}`);
    source = source.replace(legacyDraft, cleanDraft);
  }
  return source;
}

function restoreHistoricalRecipes(source) {
  const replacements = [
    {
      old: 'if(w.consumptionMode==="RECIPE"&&!ie.length){const Ce={id:crypto.randomUUID(),menuItemId:w.id,ownerId:w.id,ownerType:"menu_item",venueId:Number(s.activeVenueId)||w.venueId,status:"draft",reviewStatus:"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"manual",ingredients:[],warnings:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};oe=[Ce,...oe],ie=[Ce]}',
      next: 'if(w.consumptionMode==="RECIPE"&&!ie.length){const bdRestorableRecipeV436=oe.filter(Ce=>String(Ce?.menuItemId||Ce?.ownerId||"")===String(w.id)&&Ce?.lifecycleStatus==="inactive"&&Ce?.reviewStatus!=="superseded"&&Ce?.status!=="superseded").sort((Ce,Qe)=>String(Qe?.deactivatedAt||Qe?.updatedAt||Qe?.confirmedAt||Qe?.createdAt||"").localeCompare(String(Ce?.deactivatedAt||Ce?.updatedAt||Ce?.confirmedAt||Ce?.createdAt||"")))[0];if(bdRestorableRecipeV436){const Ce=new Date().toISOString();oe=oe.map(Qe=>Qe===bdRestorableRecipeV436?{...Qe,current:!0,currentDraft:Qe.status!=="confirmed",lifecycleStatus:"current",inactiveReason:void 0,deactivatedAt:void 0,reactivatedAt:Ce}:Qe),ie=[bdRestorableRecipeV436]}else{const Ce={id:crypto.randomUUID(),menuItemId:w.id,ownerId:w.id,ownerType:"menu_item",venueId:Number(s.activeVenueId)||w.venueId,status:"draft",reviewStatus:"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"manual",ingredients:[],warnings:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};oe=[Ce,...oe],ie=[Ce]}}',
      label: "command menu recipe restore",
    },
    {
      old: 'if(p.consumptionMode==="RECIPE"&&!W.length){const J={id:crypto.randomUUID(),menuItemId:p.id,ownerId:p.id,ownerType:"menu_item",venueId:Number(s.activeVenueId)||p.venueId,status:"draft",reviewStatus:"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"manual",ingredients:[],warnings:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};R=[J,...R],W=[J]}',
      next: 'if(p.consumptionMode==="RECIPE"&&!W.length){const bdRestorableRecipeV436=R.filter(J=>String(J?.menuItemId||J?.ownerId||"")===String(p.id)&&J?.lifecycleStatus==="inactive"&&J?.reviewStatus!=="superseded"&&J?.status!=="superseded").sort((J,K)=>String(K?.deactivatedAt||K?.updatedAt||K?.confirmedAt||K?.createdAt||"").localeCompare(String(J?.deactivatedAt||J?.updatedAt||J?.confirmedAt||J?.createdAt||"")))[0];if(bdRestorableRecipeV436){const J=new Date().toISOString();R=R.map(K=>K===bdRestorableRecipeV436?{...K,current:!0,currentDraft:K.status!=="confirmed",lifecycleStatus:"current",inactiveReason:void 0,deactivatedAt:void 0,reactivatedAt:J}:K),W=[bdRestorableRecipeV436]}else{const J={id:crypto.randomUUID(),menuItemId:p.id,ownerId:p.id,ownerType:"menu_item",venueId:Number(s.activeVenueId)||p.venueId,status:"draft",reviewStatus:"requires_review",lifecycleStatus:"current",current:!0,currentDraft:!0,source:"manual",ingredients:[],warnings:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};R=[J,...R],W=[J]}}',
      label: "legacy menu recipe restore",
    },
  ];
  for (const replacement of replacements) {
    if (source.includes(replacement.next)) continue;
    const count = source.split(replacement.old).length - 1;
    if (count !== 1) throw new Error(`${marker}: ${replacement.label} expected once, found ${count}`);
    source = source.replace(replacement.old, replacement.next);
  }
  return source;
}

const fragment = transform(fs.readFileSync(fragmentPath, "utf8"));
fs.writeFileSync(fragmentPath, fragment);

let bundle = fs.readFileSync(bundlePath, "utf8");
const editorStart = bundle.indexOf("function bdCatMenuEditor(");
const editorEnd = bundle.indexOf("function bdCatStructureManager(", editorStart);
if (editorStart < 0 || editorEnd < 0) throw new Error(`${marker}: editor boundary missing`);
bundle = `${bundle.slice(0, editorStart)}${fragment.trim()}\n${bundle.slice(editorEnd)}`;
bundle = restoreHistoricalRecipes(bundle);
if (!bundle.includes('const bdLegacyConsumptionNormalizationVersionV436="v436";')) {
  bundle = bundle.replace("function bdCatMenuEditor(", 'const bdLegacyConsumptionNormalizationVersionV436="v436";function bdCatMenuEditor(');
}
fs.writeFileSync(bundlePath, bundle);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js", "public/bardoctor-preview-v396.js"]) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  source = source.replace(/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g, (match, version) =>
    version.includes(releaseToken) ? match : `${match}-${releaseToken}`
  );
  fs.writeFileSync(filePath, source);
}

console.log(`${marker}: applied`);
