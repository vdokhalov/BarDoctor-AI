import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "bd-menu-edit-actions-v435";
const releaseToken = "20260919-menu-edit-actions-v435";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const fragmentPath = path.join(root, "scripts/fragments/menu-consumption-sot-v418.fragment.txt");
const cssPath = path.join(root, "public/catalog.css");

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${marker}: ${label} expected once, found ${count}`);
  return source.replace(before, after);
}

function transformEditor(source) {
  const failedSaveBefore = "ie===!1||a()";
  const failedSaveAfter = 'ie===!1?j("Не удалось сохранить позицию. Повторите попытку."):a()';
  if (source.includes("bd-menu-position-actions-v435")) {
    return source.includes(failedSaveBefore) ? source.replace(failedSaveBefore, failedSaveAfter) : source;
  }

  source = replaceOnce(
    source,
    "  const bdMenuDialogRefV418=S.useRef(null),bdMenuInteractedRefV418=S.useRef(!1);",
    "  const bdMenuDialogRefV418=S.useRef(null),bdMenuInteractedRefV418=S.useRef(!1);",
    "editor refs",
  );
  source = replaceOnce(
    source,
    "  S.useEffect(()=>{if(bdMenuTaxLoadingV350)return;const frame=requestAnimationFrame(()=>{if(!bdMenuInteractedRefV418.current&&bdMenuDialogRefV418.current)window.bdMarkNavigationClean?.(bdMenuDialogRefV418.current)});return()=>cancelAnimationFrame(frame)},[bdMenuTaxLoadingV350]);\n  const M=async()=>",
    "  S.useEffect(()=>{if(bdMenuTaxLoadingV350)return;const frame=requestAnimationFrame(()=>{if(!bdMenuInteractedRefV418.current&&bdMenuDialogRefV418.current)window.bdMarkNavigationClean?.(bdMenuDialogRefV418.current)});return()=>cancelAnimationFrame(frame)},[bdMenuTaxLoadingV350]);\n  S.useEffect(()=>{const P=()=>{const c=window.visualViewport,I=Math.max(240,Math.round(c?.height||window.innerHeight||0)),R=Math.max(0,Math.round((window.innerHeight||I)-((c?.offsetTop||0)+I))),W=bdMenuDialogRefV418.current;W?.style?.setProperty&&(W.style.setProperty(\"--bd-menu-visual-height-v435\",I+\"px\"),W.style.setProperty(\"--bd-menu-visual-bottom-v435\",R+\"px\"))};return P(),window.visualViewport?.addEventListener?.(\"resize\",P),window.visualViewport?.addEventListener?.(\"scroll\",P),window.addEventListener?.(\"resize\",P),()=>{window.visualViewport?.removeEventListener?.(\"resize\",P),window.visualViewport?.removeEventListener?.(\"scroll\",P),window.removeEventListener?.(\"resize\",P)}},[]);\n  const bdMenuMarkDirtyV435=()=>{bdMenuInteractedRefV418.current=!0,bdMenuDialogRefV418.current?.setAttribute(\"data-bd-unsaved-changes\",\"true\")},bdMenuCloseV435=()=>{if(bdMenuSavingV418)return!1;const P=bdMenuDialogRefV418.current,c=P?.getAttribute(\"data-bd-unsaved-changes\")==\"true\";if(c&&!window.confirm(\"Изменения не сохранены. Выйти без сохранения?\"))return!1;return window.bdMarkNavigationClean?.(P),a(),!0};\n  const M=async()=>",
    "viewport and discard lifecycle",
  );
  source = replaceOnce(
    source,
    'return i.jsx("div",{className:"bd-catalog-sheet-backdrop bd-menu-position-backdrop-v400",onClick:P=>P.target===P.currentTarget&&!bdMenuSavingV418&&a(),children:i.jsxs("section",{className:"bd-catalog-sheet bd-menu-position-editor-v400",ref:bdMenuDialogRefV418,onInputCapture:()=>{bdMenuInteractedRefV418.current=!0},onChangeCapture:()=>{bdMenuInteractedRefV418.current=!0},onClickCapture:P=>{if(P.target.closest(".bd-menu-consumption-option-v418"))bdMenuInteractedRefV418.current=!0},children:',
    'return i.jsx("div",{className:"bd-catalog-sheet-backdrop bd-menu-position-backdrop-v400",onClick:P=>P.target===P.currentTarget&&bdMenuCloseV435(),children:i.jsxs("section",{className:"bd-catalog-sheet bd-menu-position-editor-v400",ref:bdMenuDialogRefV418,role:"dialog","aria-modal":!0,"aria-labelledby":"bd-menu-position-title-v435",children:',
    "dialog close routing",
  );
  source = replaceOnce(
    source,
    'i.jsx("h2",{children:e?"Редактировать позицию":"Новая позиция"})',
    'i.jsx("h2",{id:"bd-menu-position-title-v435",children:e?"Редактировать позицию":"Новая позиция"})',
    "dialog title",
  );
  source = replaceOnce(
    source,
    'i.jsx("button",{type:"button",className:"bd-catalog-close",onClick:a,disabled:bdMenuSavingV418,children:"×"})',
    'i.jsx("button",{type:"button",className:"bd-catalog-close",onClick:bdMenuCloseV435,disabled:bdMenuSavingV418,"aria-label":"Закрыть",children:"×"})',
    "close button",
  );
  source = replaceOnce(
    source,
    'i.jsxs("div",{className:"bd-catalog-form",children:',
    'i.jsxs("div",{className:"bd-catalog-form bd-menu-position-scroll-v435",onInputCapture:bdMenuMarkDirtyV435,onChangeCapture:bdMenuMarkDirtyV435,onClickCapture:P=>{P.target.closest(".bd-menu-consumption-option-v418")&&bdMenuMarkDirtyV435()},children:',
    "scroll content",
  );
  source = replaceOnce(
    source,
    'className:"bd-catalog-structure-link",onClick:()=>{a(),l?.()}',
    'className:"bd-catalog-structure-link",onClick:()=>{bdMenuCloseV435()&&l?.()}',
    "structure navigation",
  );
  source = replaceOnce(
    source,
    ',bdMenuQuickOpenV350&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:h.name,prefill:{name:h.name,unit:h.consumptionMode==="DIRECT_ITEM"?"pcs":h.saleUnit,packageSize:h.consumptionMode==="DIRECT_ITEM"?"":h.saleQuantityInput?String(h.saleQuantityInput)+" "+h.saleUnit:"",sectionId:h.sectionId,taxonomyCategoryId:h.taxonomyCategoryId,subcategoryId:h.subcategoryId},context:"menu",onClose:()=>bdSetMenuQuickOpenV350(!1),onCreated:(P,c,bdMenuAssortmentV352)=>{const I={...c,...P,key:P.key||P.productKey,productKey:P.productKey||P.key};bdMenuOnNomenclatureCreatedV352?.(bdMenuAssortmentV352,I);bdSetMenuCreatedProductV350(I);g(R=>({...R,sectionId:I.sectionId||R.sectionId,taxonomyCategoryId:I.taxonomyCategoryId||R.taxonomyCategoryId,subcategoryId:I.subcategoryId||R.subcategoryId,readyProduct:{nomenclatureItemId:I.id||I.nomenclatureItemId||I.key,productKey:I.key,packagesPerSale:1}})),bdSetMenuProductQueryV350(I.name||""),bdSetMenuQuickOpenV350(!1),j("")}}),y&&i.jsx("div",{className:"bd-catalog-structure-error",role:"alert",children:y}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:a,disabled:bdMenuSavingV418,children:"Отмена"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:bdMenuSavingV418||!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!bdMenuValidV418,onClick:M,children:bdMenuSavingV418?"Сохраняем…":"Сохранить позицию"})]})]})]})})',
    ',bdMenuQuickOpenV350&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:h.name,prefill:{name:h.name,unit:h.consumptionMode==="DIRECT_ITEM"?"pcs":h.saleUnit,packageSize:h.consumptionMode==="DIRECT_ITEM"?"":h.saleQuantityInput?String(h.saleQuantityInput)+" "+h.saleUnit:"",sectionId:h.sectionId,taxonomyCategoryId:h.taxonomyCategoryId,subcategoryId:h.subcategoryId},context:"menu",onClose:()=>bdSetMenuQuickOpenV350(!1),onCreated:(P,c,bdMenuAssortmentV352)=>{const I={...c,...P,key:P.key||P.productKey,productKey:P.productKey||P.key};bdMenuOnNomenclatureCreatedV352?.(bdMenuAssortmentV352,I);bdSetMenuCreatedProductV350(I);g(R=>({...R,sectionId:I.sectionId||R.sectionId,taxonomyCategoryId:I.taxonomyCategoryId||R.taxonomyCategoryId,subcategoryId:I.subcategoryId||R.subcategoryId,readyProduct:{nomenclatureItemId:I.id||I.nomenclatureItemId||I.key,productKey:I.key,packagesPerSale:1}})),bdSetMenuProductQueryV350(I.name||""),bdSetMenuQuickOpenV350(!1),j("")}})]}),i.jsxs("footer",{className:"bd-menu-position-actions-v435",children:[y&&i.jsx("div",{className:"bd-catalog-structure-error bd-menu-position-error-v435",role:"alert",children:y}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:bdMenuCloseV435,disabled:bdMenuSavingV418,children:"Отмена"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:bdMenuSavingV418||!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!bdMenuValidV418,onClick:M,children:bdMenuSavingV418?"Сохраняем…":"Сохранить"})]})]})]})})',
    "footer outside scroll region",
  );
  return source.replace(failedSaveBefore, failedSaveAfter);
}

const fragment = transformEditor(fs.readFileSync(fragmentPath, "utf8"));
fs.writeFileSync(fragmentPath, fragment);

let bundle = fs.readFileSync(bundlePath, "utf8");
const editorStart = bundle.indexOf("function bdCatMenuEditor(");
const editorEnd = bundle.indexOf("function bdCatStructureManager(", editorStart);
if (editorStart < 0 || editorEnd < 0) throw new Error(`${marker}: editor boundary missing`);
bundle = `${bundle.slice(0, editorStart)}${fragment.trim()}\n${bundle.slice(editorEnd)}`;
if (!bundle.includes('const bdMenuEditActionsVersionV435="v435";')) {
  bundle = bundle.replace("function bdCatMenuEditor(", 'const bdMenuEditActionsVersionV435="v435";function bdCatMenuEditor(');
}
fs.writeFileSync(bundlePath, bundle);

const css = `

/* ${marker} */
.bd-menu-position-editor-v400{display:flex;flex-direction:column;overflow:hidden}
.bd-menu-position-editor-v400>.bd-menu-position-scroll-v435{width:100%;min-height:0;flex:1 1 auto;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:18px!important}
.bd-menu-position-actions-v435{position:relative;z-index:2;flex:0 0 auto;margin:0 -18px calc(-28px - env(safe-area-inset-bottom));padding:10px max(18px,env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));background:rgba(248,249,252,.98);border-top:1px solid rgba(222,226,236,.9);box-shadow:0 -9px 24px rgba(24,29,53,.08)}
.bd-menu-position-actions-v435 .bd-catalog-sheet-actions{position:static;display:grid;width:100%;max-width:none;margin:0!important;padding:0;background:transparent;box-shadow:none}
.bd-menu-position-error-v435{margin:0 0 8px}
@media(max-width:719px){
  .bd-menu-position-editor-v400{position:fixed;right:0;bottom:var(--bd-menu-visual-bottom-v435,0);left:0;height:min(calc(var(--bd-menu-visual-height-v435,100dvh) - 8px),94dvh);max-height:min(calc(var(--bd-menu-visual-height-v435,100dvh) - 8px),94dvh);padding-bottom:0}
  .bd-menu-position-editor-v400>.bd-menu-position-scroll-v435{padding-bottom:18px!important;scroll-padding-bottom:18px}
  .bd-menu-position-actions-v435{margin:0 -18px;padding-bottom:calc(12px + env(safe-area-inset-bottom))}
}
@media(min-width:720px){
  .bd-menu-position-editor-v400{max-height:min(760px,calc(100dvh - 48px))}
}
`;
let catalogCss = fs.readFileSync(cssPath, "utf8");
if (!catalogCss.includes(`/* ${marker} */`)) catalogCss += css;
fs.writeFileSync(cssPath, catalogCss);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  source = source.replace(/catalog\.css\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : `${match}-${releaseToken}`);
  source = source.replace(/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : `${match}-${releaseToken}`);
  fs.writeFileSync(filePath, source);
}

console.log(`${marker}: applied`);
