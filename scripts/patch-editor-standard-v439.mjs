import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "bd-editor-standard-v439";
const releaseToken = "20260920-editor-standard-v439";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const fragmentPath = path.join(root, "scripts/fragments/menu-consumption-sot-v418.fragment.txt");
const cssPath = path.join(root, "public/catalog.css");

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(marker + ": " + label + " expected once, found " + count);
  return source.replace(before, after);
}

const sharedActions = [
  'function bdUseExplicitFormViewportV438(e){S.useEffect(()=>{let t=0;const n=()=>{cancelAnimationFrame(t),t=requestAnimationFrame(()=>{const r=window.visualViewport,a=Math.max(240,Math.round(r?.height||window.innerHeight||0)),s=Math.max(0,Math.round((window.innerHeight||a)-((r?.offsetTop||0)+a))),l=e.current;if(!l?.style?.setProperty)return;l.style.setProperty("--bd-explicit-visual-height-v438",a+"px"),l.style.setProperty("--bd-explicit-visual-bottom-v438",s+"px");const u=document.activeElement;if(!u||!l.contains(u)||!["INPUT","TEXTAREA","SELECT"].includes(u.tagName))return;const d=(u.closest(".bd-catalog-field")||u).getBoundingClientRect(),f=l.querySelector(".bd-explicit-mobile-toolbar-v439")?.getBoundingClientRect(),m=(f?.bottom||0)+8,h=(r?.offsetTop||0)+a-8;(d.top<m||d.bottom>h)&&(u.closest(".bd-catalog-field")||u).scrollIntoView({block:"start",inline:"nearest",behavior:"instant"})})};return n(),window.addEventListener?.("focusin",n),window.visualViewport?.addEventListener?.("resize",n),window.visualViewport?.addEventListener?.("scroll",n),window.addEventListener?.("resize",n),()=>{cancelAnimationFrame(t),window.removeEventListener?.("focusin",n),window.visualViewport?.removeEventListener?.("resize",n),window.visualViewport?.removeEventListener?.("scroll",n),window.removeEventListener?.("resize",n)}},[e])}',
  'const bdEditorStandardVersionV439="v439";',
  'function bdExplicitFormActionsV438({onCancel:e,onSave:t,saving:n,saveDisabled:r,error:a,saveLabel:s="Сохранить",secondaryAction:l,contextClass:u="",mobileTitle:d="Редактор",saveDisabledReason:f=""}){const[m,h]=S.useState(!1),g=()=>e(),y=()=>{h(!1),t()},v=r&&f?f:void 0,b=r&&f?s+". "+f:s;return i.jsxs("footer",{"data-bd-editor-standard":"v439",className:("bd-explicit-form-actions-v438 "+u).trim(),children:[i.jsxs("div",{className:"bd-explicit-mobile-toolbar-v439",children:[i.jsx("button",{type:"button",className:"bd-explicit-mobile-cancel-v439","data-bd-internal-step-navigation":!0,onClick:g,disabled:n,children:"Отмена"}),i.jsx("strong",{className:"bd-explicit-mobile-title-v439",children:d}),i.jsxs("div",{className:"bd-explicit-mobile-primary-v439",children:[l&&i.jsx("button",{type:"button",className:"bd-explicit-mobile-more-v439",onClick:()=>h(p=>!p),disabled:n,"aria-haspopup":"menu","aria-expanded":m,"aria-label":"Дополнительные действия",children:"Ещё"}),i.jsx("button",{type:"button",className:"bd-catalog-primary bd-explicit-save-v438 bd-explicit-mobile-save-v439",onClick:y,disabled:n||r,"aria-busy":n?"true":void 0,"aria-label":n?"Сохраняем…":b,title:v,children:n?"Сохраняем…":s})]})]}),l&&m&&i.jsx("div",{className:"bd-explicit-mobile-menu-v439",role:"menu",children:i.jsx("button",{type:"button",role:"menuitem",className:"bd-explicit-secondary-v438",onClick:()=>{h(!1),l.onClick()},disabled:n||l.disabled,children:l.label})}),a&&i.jsx("div",{className:"bd-catalog-structure-error bd-explicit-form-error-v438",role:"alert",children:a}),i.jsxs("div",{className:"bd-catalog-sheet-actions bd-explicit-desktop-actions-v439",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary bd-explicit-cancel-v438","data-bd-internal-step-navigation":!0,onClick:e,disabled:n,children:"Отмена"}),l&&i.jsx("button",{type:"button",className:"bd-catalog-secondary bd-explicit-secondary-v438",onClick:l.onClick,disabled:n||l.disabled,children:n?"Сохраняем…":l.label}),i.jsx("button",{type:"button",className:"bd-catalog-primary bd-explicit-save-v438",onClick:t,disabled:n||r,"aria-busy":n?"true":void 0,"aria-label":n?"Сохраняем…":b,title:v,children:n?"Сохраняем…":s})]})]})}'
].join("\n") + "\n";

function transformMenu(source) {
  source = source.replace('className:"bd-catalog-close",onClick:bdMenuCloseV435,disabled:bdMenuSavingV418,"aria-label":"Закрыть"', 'className:"bd-catalog-close",onClick:bdMenuCloseV435,disabled:bdMenuSavingV418,"data-bd-internal-step-navigation":!0,"aria-label":"Закрыть"');
  source = source.replace('return window.bdMarkNavigationClean?.(P),a(),!0', 'return bdMenuInteractedRefV418.current=!1,P?.removeAttribute?.("data-bd-unsaved-changes"),window.bdMarkNavigationClean?.(P),a(),!0');
  if (!source.includes("bdUseExplicitFormViewportV438(bdMenuDialogRefV418)")) {
    const start = source.indexOf('S.useEffect(()=>{const P=()=>{const c=window.visualViewport');
    const endToken = '},[]);\n  const bdMenuMarkDirtyV435=';
    const end = source.indexOf(endToken, start);
    if (start < 0 || end < 0) throw new Error(marker + ": menu viewport lifecycle missing");
    source = source.slice(0, start) + 'bdUseExplicitFormViewportV438(bdMenuDialogRefV418);\n  const bdMenuMarkDirtyV435=' + source.slice(end + endToken.length);
  }
  source = source.replace('"aria-label":"Позиция меню"', '"aria-labelledby":"bd-menu-position-title-v435"');
  if (!source.includes("bd-explicit-mobile-content-head-v439")) {
    source = replaceOnce(
      source,
      'className:"bd-catalog-form bd-menu-position-scroll-v435",onInputCapture:bdMenuMarkDirtyV435,onChangeCapture:bdMenuMarkDirtyV435,onClickCapture:P=>{P.target.closest(".bd-menu-consumption-option-v418")&&bdMenuMarkDirtyV435()},children:[',
      'className:"bd-catalog-form bd-menu-position-scroll-v435",onInputCapture:bdMenuMarkDirtyV435,onChangeCapture:bdMenuMarkDirtyV435,onClickCapture:P=>{P.target.closest(".bd-menu-consumption-option-v418")&&bdMenuMarkDirtyV435()},children:[i.jsxs("div",{className:"bd-explicit-mobile-content-head-v439",children:[i.jsx("span",{children:"МЕНЮ"}),i.jsx("h2",{children:h.name.trim()|| (e?"Позиция меню":"Новая позиция")}),i.jsx("p",{children:e?"Редактирование позиции и способа списания":"Новая позиция и способ списания"})]}),',
      "menu mobile content heading",
    );
  }
  source = replaceOnce(
    source,
    'i.jsx(bdExplicitFormActionsV438,{onCancel:bdMenuCloseV435,onSave:M,saving:bdMenuSavingV418,saveDisabled:!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!bdMenuValidV418,error:y,saveLabel:"Сохранить",contextClass:"bd-menu-position-actions-v435"})',
    'i.jsx(bdExplicitFormActionsV438,{onCancel:bdMenuCloseV435,onSave:M,saving:bdMenuSavingV418,saveDisabled:!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!bdMenuValidV418,saveDisabledReason:!h.name.trim()?"Укажите название":!h.sectionId?"Выберите раздел":!h.taxonomyCategoryId?"Выберите категорию":!bdMenuValidV418?"Проверьте способ списания и связанные данные":"",error:y,saveLabel:"Сохранить",mobileTitle:"Позиция меню",contextClass:"bd-menu-position-actions-v435"})',
    "menu editor standard action contract",
  );
  return source;
}

function transformRecipe(source) {
  source = source.replace('c=bdTechDirtyRefV438.current||p?.getAttribute("data-bd-unsaved-changes")==="true"', 'c=p?.getAttribute("data-bd-unsaved-changes")==="true"');
  source = source.replace('className:"bd-catalog-close",onClick:bdTechCloseV438,disabled:bdRecipeSavingV418,"aria-label":"Закрыть техкарту"', 'className:"bd-catalog-close",onClick:bdTechCloseV438,disabled:bdRecipeSavingV418,"data-bd-internal-step-navigation":!0,"aria-label":"Закрыть техкарту"');
  source = source.replace('return window.bdMarkNavigationClean?.(p),a(),!0', 'return bdTechDirtyRefV438.current=!1,p?.removeAttribute?.("data-bd-unsaved-changes"),window.bdMarkNavigationClean?.(p),a(),!0');
  source = source.replace('"aria-label":"Техкарта"', '"aria-labelledby":"bd-tech-card-title-v354"');
  if (!source.includes("bd-explicit-mobile-content-head-v439")) {
    source = replaceOnce(
      source,
      'className:"bd-catalog-form bd-explicit-form-scroll-v438",children:[',
      'className:"bd-catalog-form bd-explicit-form-scroll-v438",children:[i.jsxs("div",{className:"bd-explicit-mobile-content-head-v439",children:[i.jsx("span",{children:"МЕНЮ → ТЕХКАРТА"}),i.jsx("h2",{children:e.name}),i.jsxs("p",{children:["Нормы на одну продажу",t?.version?" · версия "+t.version:""]})]}),',
      "tech-card mobile content heading",
    );
  }
  source = replaceOnce(
    source,
    'i.jsx(bdExplicitFormActionsV438,{onCancel:bdTechCloseV438,onSave:()=>E(!0),saving:bdRecipeSavingV418,saveDisabled:!bdTechCanConfirm,error:bdRecipeSaveErrorV418,saveLabel:t?"Сохранить":"Сохранить и подтвердить",secondaryAction:{label:"Сохранить черновик",onClick:()=>E(!1),disabled:!l.ingredients.length},contextClass:"bd-tech-card-actions-v438"})',
    'i.jsx(bdExplicitFormActionsV438,{onCancel:bdTechCloseV438,onSave:()=>E(!0),saving:bdRecipeSavingV418,saveDisabled:!bdTechCanConfirm,saveDisabledReason:!l.ingredients.length?"Добавьте хотя бы один ингредиент":bdTechInvalidCount>0?"Проверьте количество, единицу и связь с номенклатурой":"",error:bdRecipeSaveErrorV418,saveLabel:"Сохранить",mobileTitle:"Техкарта",secondaryAction:{label:"Сохранить черновик",onClick:()=>E(!1),disabled:!l.ingredients.length},contextClass:"bd-tech-card-actions-v438"})',
    "tech-card editor standard action contract",
  );
  return source;
}

let fragment = fs.readFileSync(fragmentPath, "utf8");
fragment = fragment.replace('"aria-label":"Позиция меню"', '"aria-labelledby":"bd-menu-position-title-v435"');
if (!fragment.includes('mobileTitle:"Позиция меню"')) fragment = transformMenu(fragment);
fs.writeFileSync(fragmentPath, fragment);

let bundle = fs.readFileSync(bundlePath, "utf8");
const helperStart = bundle.indexOf("function bdUseExplicitFormViewportV438(");
const menuStart = bundle.indexOf("function bdCatMenuEditor(", helperStart);
if (helperStart < 0 || menuStart < 0) throw new Error(marker + ": shared helper boundary missing");
if (!bundle.includes('const bdEditorStandardVersionV439="v439";')) {
  bundle = bundle.slice(0, helperStart) + sharedActions + bundle.slice(menuStart);
}
const menuEnd = bundle.indexOf("function bdCatStructureManager(", bundle.indexOf("function bdCatMenuEditor("));
bundle = bundle.slice(0, bundle.indexOf("function bdCatMenuEditor(")) + fragment.trim() + "\n" + bundle.slice(menuEnd);
const recipeStart = bundle.indexOf("function bdCatRecipeEditor(");
const recipeEnd = bundle.indexOf("function bdCatImportReview", recipeStart);
if (recipeStart < 0 || recipeEnd < 0) throw new Error(marker + ": recipe boundary missing");
let recipe = bundle.slice(recipeStart, recipeEnd);
recipe = recipe.replace('"aria-label":"Техкарта"', '"aria-labelledby":"bd-tech-card-title-v354"');
if (!recipe.includes('mobileTitle:"Техкарта"')) recipe = transformRecipe(recipe);
bundle = bundle.slice(0, recipeStart) + recipe + bundle.slice(recipeEnd);
fs.writeFileSync(bundlePath, bundle);

const css = [
  "",
  "/* " + marker + ": mobile top action bar for Menu and Tech Card editors only. */",
  ".bd-explicit-mobile-toolbar-v439,.bd-explicit-mobile-menu-v439,.bd-explicit-mobile-content-head-v439{display:none}",
  "@media(max-width:719px){",
  "  .bd-menu-position-editor-v400,.bd-tech-card-editor-v354{position:fixed!important;inset:auto 0 var(--bd-explicit-visual-bottom-v438,0)!important;width:100%!important;height:var(--bd-explicit-visual-height-v438,100dvh)!important;max-height:var(--bd-explicit-visual-height-v438,100dvh)!important;padding:0!important;border-radius:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}",
  "  .bd-menu-position-editor-v400>.bd-catalog-sheet-handle,.bd-tech-card-editor-v354>.bd-catalog-sheet-handle,.bd-menu-position-editor-v400>.bd-catalog-sheet-head,.bd-tech-card-editor-v354>.bd-catalog-sheet-head{display:none!important}",
  "  .bd-menu-position-editor-v400>.bd-menu-position-scroll-v435,.bd-tech-card-editor-v354>.bd-explicit-form-scroll-v438{order:2;min-height:0!important;flex:1 1 auto!important;width:100%;padding:18px max(18px,env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left))!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;scrollbar-gutter:auto;scroll-padding:16px 0 calc(24px + env(safe-area-inset-bottom))}",
  "  .bd-menu-position-editor-v400>.bd-explicit-form-actions-v438,.bd-tech-card-editor-v354>.bd-explicit-form-actions-v438{order:1;position:relative!important;z-index:30;flex:0 0 auto;margin:0!important;padding:calc(8px + env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) 8px max(12px,env(safe-area-inset-left))!important;border:0!important;border-bottom:1px solid rgba(226,228,237,.94)!important;background:rgba(255,255,255,.98)!important;box-shadow:0 5px 18px rgba(27,31,52,.06)!important;backdrop-filter:blur(18px)}",
  "  .bd-explicit-form-actions-v438>.bd-explicit-desktop-actions-v439{display:none!important}",
  "  .bd-explicit-mobile-toolbar-v439{display:grid;grid-template-columns:minmax(74px,1fr) auto minmax(118px,1fr);align-items:center;gap:8px;min-height:44px}",
  "  .bd-explicit-mobile-cancel-v439{justify-self:start;min-width:0;min-height:44px;padding:0 6px;border:0;background:transparent;color:#6f67f4;font-size:14px;font-weight:650;line-height:1}",
  "  .bd-explicit-mobile-title-v439{max-width:142px;overflow:hidden;color:#171a2d;font-size:15px;font-weight:760;line-height:1.1;text-align:center;text-overflow:ellipsis;white-space:nowrap}",
  "  .bd-explicit-mobile-primary-v439{justify-self:end;display:flex;align-items:center;gap:6px;min-width:0}",
  "  .bd-explicit-mobile-more-v439{min-width:44px;min-height:44px;padding:0 8px;border:0;border-radius:12px;background:transparent;color:#64697c;font-size:12px;font-weight:700}",
  "  .bd-explicit-mobile-save-v439{min-width:88px!important;min-height:44px!important;padding:0 14px!important;border-radius:12px!important;font-size:13px!important;box-shadow:0 6px 16px rgba(115,106,244,.2)!important}",
  "  .bd-explicit-mobile-menu-v439{position:absolute;top:calc(100% + 6px);right:max(12px,env(safe-area-inset-right));z-index:40;display:block;min-width:210px;padding:7px;border:1px solid rgba(219,221,232,.95);border-radius:15px;background:#fff;box-shadow:0 16px 36px rgba(27,31,52,.18)}",
  "  .bd-explicit-mobile-menu-v439 .bd-explicit-secondary-v438{display:block!important;width:100%;min-height:44px;padding:10px 12px;border:0;border-radius:10px;background:#f5f4ff;color:#443dac;text-align:left;font-size:14px;font-weight:700;grid-column:auto;grid-row:auto}",
  "  .bd-explicit-form-error-v438{order:2;margin:8px 4px 0}",
  "  .bd-explicit-mobile-content-head-v439{display:block;margin:0 0 16px}",
  "  .bd-explicit-mobile-content-head-v439 span{display:block;margin:0 0 7px;color:#6f67f4;font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}",
  "  .bd-explicit-mobile-content-head-v439 h2{margin:0;color:#16192b;font-size:24px;font-weight:780;line-height:1.13;letter-spacing:-.025em}",
  "  .bd-explicit-mobile-content-head-v439 p{margin:6px 0 0;color:#7a7f91;font-size:13px;line-height:1.4}",
  "  .bd-menu-position-scroll-v435 input,.bd-menu-position-scroll-v435 textarea,.bd-menu-position-scroll-v435 select,.bd-explicit-form-scroll-v438 input,.bd-explicit-form-scroll-v438 textarea,.bd-explicit-form-scroll-v438 select{scroll-margin-block:76px 24px}",
  "  .bd-menu-position-backdrop-v400,.bd-tech-card-workspace-v354{z-index:1220!important;overscroll-behavior:none}",
  "}",
  "@media(max-width:389px){",
  "  .bd-explicit-mobile-toolbar-v439{grid-template-columns:minmax(62px,1fr) auto minmax(108px,1fr);gap:4px}",
  "  .bd-explicit-mobile-title-v439{max-width:112px;font-size:14px}",
  "  .bd-explicit-mobile-more-v439{min-width:40px;padding-inline:5px}",
  "  .bd-explicit-mobile-save-v439{min-width:78px!important;padding-inline:10px!important}",
  "}",
  ""
].join("\n");
let catalogCss = fs.readFileSync(cssPath, "utf8");
if (!catalogCss.includes("/* " + marker + ":")) catalogCss += css;
fs.writeFileSync(cssPath, catalogCss);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js", "public/bardoctor-preview-v396.js"]) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  source = source.replace(/catalog\.css\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : match + "-" + releaseToken);
  source = source.replace(/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g, (match, version) => version.includes(releaseToken) ? match : match + "-" + releaseToken);
  fs.writeFileSync(filePath, source);
}

console.log(marker + ": applied");
