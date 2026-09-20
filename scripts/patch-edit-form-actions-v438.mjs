import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "bd-edit-form-actions-v438";
const releaseToken = "20260920-edit-form-actions-v438";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const fragmentPath = path.join(root, "scripts/fragments/menu-consumption-sot-v418.fragment.txt");
const cssPath = path.join(root, "public/catalog.css");

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${marker}: ${label} expected once, found ${count}`);
  return source.replace(before, after);
}

const sharedActions = `const bdEditFormActionsVersionV438="v438";
function bdUseExplicitFormViewportV438(e){S.useEffect(()=>{const t=()=>{const n=window.visualViewport,r=Math.max(240,Math.round(n?.height||window.innerHeight||0)),a=Math.max(0,Math.round((window.innerHeight||r)-((n?.offsetTop||0)+r))),s=e.current;s?.style?.setProperty&&(s.style.setProperty("--bd-explicit-visual-height-v438",r+"px"),s.style.setProperty("--bd-explicit-visual-bottom-v438",a+"px"))};return t(),window.visualViewport?.addEventListener?.("resize",t),window.visualViewport?.addEventListener?.("scroll",t),window.addEventListener?.("resize",t),()=>{window.visualViewport?.removeEventListener?.("resize",t),window.visualViewport?.removeEventListener?.("scroll",t),window.removeEventListener?.("resize",t)}},[e])}
function bdExplicitFormActionsV438({onCancel:e,onSave:t,saving:n,saveDisabled:r,error:a,saveLabel:s="Сохранить",secondaryAction:l,contextClass:u=""}){return i.jsxs("footer",{className:("bd-explicit-form-actions-v438 "+u).trim(),children:[a&&i.jsx("div",{className:"bd-catalog-structure-error bd-explicit-form-error-v438",role:"alert",children:a}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary bd-explicit-cancel-v438",onClick:e,disabled:n,children:"Отмена"}),l&&i.jsx("button",{type:"button",className:"bd-catalog-secondary bd-explicit-secondary-v438",onClick:l.onClick,disabled:n||l.disabled,children:n?"Сохраняем…":l.label}),i.jsx("button",{type:"button",className:"bd-catalog-primary bd-explicit-save-v438",onClick:t,disabled:n||r,"aria-busy":n?"true":void 0,children:n?"Сохраняем…":s})]})]})}
`;

function transformMenu(source) {
  if (!source.includes("bdMenuSavingRefV438")) {
    source = replaceOnce(
      source,
      "const bdMenuDialogRefV418=S.useRef(null),bdMenuInteractedRefV418=S.useRef(!1);",
      "const bdMenuDialogRefV418=S.useRef(null),bdMenuInteractedRefV418=S.useRef(!1),bdMenuSavingRefV438=S.useRef(!1);",
      "menu single-flight ref",
    );
    source = replaceOnce(source, "const M=async()=>{", "const M=async()=>{if(bdMenuSavingRefV438.current)return!1;", "menu single-flight guard");
    source = replaceOnce(source, "try{bdSetMenuSavingV418(!0),j(\"\");", "try{bdMenuSavingRefV438.current=!0,bdSetMenuSavingV418(!0),j(\"\");", "menu save lock");
    source = replaceOnce(source, "finally{bdSetMenuSavingV418(!1)}", "finally{bdMenuSavingRefV438.current=!1,bdSetMenuSavingV418(!1)}", "menu save unlock");
  }
  if (!source.includes("bdExplicitFormActionsV438")) {
    source = replaceOnce(
      source,
      'i.jsxs("footer",{className:"bd-menu-position-actions-v435",children:[y&&i.jsx("div",{className:"bd-catalog-structure-error bd-menu-position-error-v435",role:"alert",children:y}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:bdMenuCloseV435,disabled:bdMenuSavingV418,children:"Отмена"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:bdMenuSavingV418||!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!bdMenuValidV418,onClick:M,children:bdMenuSavingV418?"Сохраняем…":"Сохранить"})]})]})',
      'i.jsx(bdExplicitFormActionsV438,{onCancel:bdMenuCloseV435,onSave:M,saving:bdMenuSavingV418,saveDisabled:!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!bdMenuValidV418,error:y,saveLabel:"Сохранить",contextClass:"bd-menu-position-actions-v435"})',
      "menu shared action footer",
    );
  }
  return source;
}

function transformRecipe(source) {
  if (!source.includes("bdTechCloseV438")) {
    source = replaceOnce(source,
      'bdRecipeSavingRefV418=S.useRef(!1),bdTechDialogRefV354=S.useRef(null);S.useEffect(()=>{const p=document.body.style.overflow==="hidden"?"":document.body.style.overflow,c=I=>{I.key==="Escape"&&!document.querySelector(".bd-quick-create-backdrop-v336")&&!bdRecipeSavingV418&&a()};document.body.style.overflow="hidden",window.addEventListener("keydown",c);const I=requestAnimationFrame(()=>bdTechDialogRefV354.current?.focus({preventScroll:!0}));return()=>{cancelAnimationFrame(I),window.removeEventListener("keydown",c),document.body.style.overflow=p}},[a,bdRecipeSavingV418]);',
      'bdRecipeSavingRefV418=S.useRef(!1),bdTechDialogRefV354=S.useRef(null),bdTechDirtyRefV438=S.useRef(!1);bdUseExplicitFormViewportV438(bdTechDialogRefV354);const bdTechMarkDirtyV438=()=>{bdTechDirtyRefV438.current=!0,bdTechDialogRefV354.current?.setAttribute("data-bd-unsaved-changes","true")},bdTechCloseV438=()=>{if(bdRecipeSavingV418)return!1;const p=bdTechDialogRefV354.current,c=bdTechDirtyRefV438.current||p?.getAttribute("data-bd-unsaved-changes")==="true";if(c&&!window.confirm("Изменения не сохранены. Выйти без сохранения?"))return!1;return window.bdMarkNavigationClean?.(p),a(),!0};S.useEffect(()=>{const p=document.body.style.overflow==="hidden"?"":document.body.style.overflow,c=I=>{I.key==="Escape"&&!document.querySelector(".bd-quick-create-backdrop-v336")&&bdTechCloseV438()};document.body.style.overflow="hidden",window.addEventListener("keydown",c);const I=requestAnimationFrame(()=>bdTechDialogRefV354.current?.focus({preventScroll:!0}));return()=>{cancelAnimationFrame(I),window.removeEventListener("keydown",c),document.body.style.overflow=p}},[a,bdRecipeSavingV418]);',
      "tech-card close and viewport lifecycle");
    source = replaceOnce(source,
      'const j=(p,c)=>u(I=>({...I,ingredients:I.ingredients.map(R=>R.id===p?{...R,...c}:R)})),v=(p,c)=>f(I=>({...I,[p]:{...(I[p]||{}),...c}})),b=()=>{',
      'const j=(p,c)=>{bdTechMarkDirtyV438(),u(I=>({...I,ingredients:I.ingredients.map(R=>R.id===p?{...R,...c}:R)}))},v=(p,c)=>{bdTechMarkDirtyV438(),f(I=>({...I,[p]:{...(I[p]||{}),...c}}))},b=()=>{bdTechMarkDirtyV438();',
      "tech-card authoritative dirty setters");
    source = replaceOnce(source,
      'return R!==!1}catch(c){return bdSetRecipeSaveErrorV418(c instanceof Error?c.message:"Не удалось сохранить техкарту."),!1}',
      'return R!==!1?(bdTechDirtyRefV438.current=!1,bdTechDialogRefV354.current?.removeAttribute("data-bd-unsaved-changes"),window.bdMarkNavigationClean?.(bdTechDialogRefV354.current),a(),!0):!1}catch(c){return bdSetRecipeSaveErrorV418(c instanceof Error?c.message:"Не удалось сохранить техкарту."),!1}',
      "tech-card successful save close");
    source = replaceOnce(source, 'onClick:p=>p.target===p.currentTarget&&!bdRecipeSavingV418&&a()', 'onClick:p=>p.target===p.currentTarget&&bdTechCloseV438()', "tech-card backdrop close");
    source = replaceOnce(source, 'className:"bd-catalog-close",onClick:a,disabled:bdRecipeSavingV418,"aria-label":"Закрыть техкарту"', 'className:"bd-catalog-close",onClick:bdTechCloseV438,disabled:bdRecipeSavingV418,"aria-label":"Закрыть техкарту"', "tech-card close button");
    source = replaceOnce(source, 'i.jsxs("div",{className:"bd-catalog-form",children:', 'i.jsxs("div",{className:"bd-catalog-form bd-explicit-form-scroll-v438",children:', "tech-card independent scroll region");
    source = replaceOnce(source, 'className:"bd-catalog-remove",onClick:()=>{u(G=>', 'className:"bd-catalog-remove",onClick:()=>{bdTechMarkDirtyV438(),u(G=>', "ingredient removal dirty state");
    source = replaceOnce(source,
      'bdRecipeSaveErrorV418&&i.jsx("div",{className:"bd-catalog-structure-error",role:"alert",children:bdRecipeSaveErrorV418}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",disabled:bdRecipeSavingV418||!l.ingredients.length,onClick:()=>E(!1),children:bdRecipeSavingV418?"Сохраняем…":"Сохранить черновик"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:bdRecipeSavingV418||!bdTechCanConfirm,onClick:()=>E(!0),children:bdRecipeSavingV418?"Сохраняем…":"Подтвердить техкарту"})]})]})]})})}',
      ']}) ,i.jsx(bdExplicitFormActionsV438,{onCancel:bdTechCloseV438,onSave:()=>E(!0),saving:bdRecipeSavingV418,saveDisabled:!bdTechCanConfirm,error:bdRecipeSaveErrorV418,saveLabel:t?"Сохранить":"Сохранить и подтвердить",secondaryAction:{label:"Сохранить черновик",onClick:()=>E(!1),disabled:!l.ingredients.length},contextClass:"bd-tech-card-actions-v438"})]})})}',
      "tech-card footer outside scroll region");
  }
  if (!source.includes("Не удалось сохранить техкарту. Повторите попытку.")) {
    source = replaceOnce(source,
      'a(),!0):!1}catch(c){return bdSetRecipeSaveErrorV418(c instanceof Error?c.message:"Не удалось сохранить техкарту."),!1}',
      'a(),!0):(bdSetRecipeSaveErrorV418("Не удалось сохранить техкарту. Повторите попытку."),!1)}catch(c){return bdSetRecipeSaveErrorV418(c instanceof Error?c.message:"Не удалось сохранить техкарту."),!1}',
      "tech-card controlled failure message");
  }
  return source;
}

let fragment = transformMenu(fs.readFileSync(fragmentPath, "utf8"));
fs.writeFileSync(fragmentPath, fragment);

let bundle = fs.readFileSync(bundlePath, "utf8");
const menuStart = bundle.indexOf("function bdCatMenuEditor(");
const menuEnd = bundle.indexOf("function bdCatStructureManager(", menuStart);
if (menuStart < 0 || menuEnd < 0) throw new Error(`${marker}: menu editor boundary missing`);
bundle = `${bundle.slice(0, menuStart)}${fragment.trim()}\n${bundle.slice(menuEnd)}`;
if (!bundle.includes('const bdEditFormActionsVersionV438="v438";')) {
  bundle = bundle.replace("function bdCatMenuEditor(", `${sharedActions}function bdCatMenuEditor(`);
}
const recipeStart = bundle.indexOf("function bdCatRecipeEditor(");
const recipeEnd = bundle.indexOf("function bdCatImportReview", recipeStart);
if (recipeStart < 0 || recipeEnd < 0) throw new Error(`${marker}: recipe editor boundary missing`);
const recipe = transformRecipe(bundle.slice(recipeStart, recipeEnd));
bundle = `${bundle.slice(0, recipeStart)}${recipe}${bundle.slice(recipeEnd)}`;
fs.writeFileSync(bundlePath, bundle);

const css = `

/* ${marker}: one reachable action contract for explicit-save modal editors. */
.bd-explicit-form-actions-v438{position:relative;z-index:12;flex:0 0 auto;padding:10px max(18px,env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));border-top:1px solid rgba(222,226,236,.9);background:rgba(248,249,252,.98);box-shadow:0 -9px 24px rgba(24,29,53,.08)}
.bd-explicit-form-actions-v438 .bd-catalog-sheet-actions{position:static!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);width:100%;max-width:none;margin:0!important;padding:0!important;background:transparent!important;box-shadow:none!important}
.bd-explicit-form-actions-v438 .bd-explicit-secondary-v438{grid-column:1/-1;grid-row:1}
.bd-explicit-form-actions-v438 .bd-explicit-cancel-v438{grid-column:1;grid-row:2}
.bd-explicit-form-actions-v438 .bd-explicit-save-v438{grid-column:2;grid-row:2}
.bd-explicit-form-error-v438{margin:0 0 8px}
.bd-menu-position-editor-v400>.bd-explicit-form-actions-v438{margin:0 -18px calc(-28px - env(safe-area-inset-bottom))}
.bd-tech-card-editor-v354>.bd-explicit-form-scroll-v438{min-height:0;flex:1 1 auto;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:18px!important}
.bd-tech-card-editor-v354>.bd-tech-card-actions-v438{margin:0}
@media(max-width:719px){
  .bd-menu-position-editor-v400>.bd-explicit-form-actions-v438{margin:0 -18px}
  .bd-tech-card-editor-v354{position:fixed;right:0;bottom:var(--bd-explicit-visual-bottom-v438,0);left:0;height:var(--bd-explicit-visual-height-v438,100dvh)!important;max-height:var(--bd-explicit-visual-height-v438,100dvh)!important}
  .bd-tech-card-editor-v354>.bd-explicit-form-scroll-v438{padding-bottom:18px!important;scroll-padding-bottom:18px}
  .bd-tech-card-editor-v354>.bd-explicit-form-actions-v438{padding-inline:max(14px,env(safe-area-inset-left),env(safe-area-inset-right))}
}
@media(max-width:420px){
  .bd-explicit-form-actions-v438 .bd-catalog-sheet-actions{gap:8px}
  .bd-explicit-form-actions-v438 button{min-width:0;padding-inline:10px}
}
`;
let catalogCss = fs.readFileSync(cssPath, "utf8");
if (!catalogCss.includes(`/* ${marker}:`)) catalogCss += css;
fs.writeFileSync(cssPath, catalogCss);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js", "public/bardoctor-preview-v396.js"]) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  source = source.replace(/catalog\.css\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : `${match}-${releaseToken}`);
  source = source.replace(/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : `${match}-${releaseToken}`);
  fs.writeFileSync(filePath, source);
}

console.log(`${marker}: applied`);
