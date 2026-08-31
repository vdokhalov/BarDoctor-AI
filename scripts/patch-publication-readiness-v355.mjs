import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const catalogCssPath = new URL("../public/catalog.css", import.meta.url);
const assortmentCssPath = new URL("../public/assortment-command-v170.css", import.meta.url);
const shellPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdPublicationReadinessVersion="v355"';

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceScopedOnce(scopeStart, before, after, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const index = source.indexOf(before, scopeIndex + scopeStart.length);
  if (index < 0) throw new Error(`${label}: marker not found inside scope`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

function ensureCatalogCss() {
  const current = readFileSync(catalogCssPath, "utf8");
  if (current.includes("Publication readiness v355")) return;
  appendFileSync(catalogCssPath, `

/* Publication readiness v355
 * Keep primary actions reachable and make the tech-card workspace truly viewport-sized.
 */
.bd-tech-card-workspace-v354 {
  padding: 0 !important;
}

.bd-tech-card-editor-v354 {
  width: min(720px, calc(100vw - 260px)) !important;
  max-width: 720px !important;
  height: 100dvh !important;
  max-height: 100dvh !important;
  border-radius: 0 !important;
}

.bd-tech-card-workspace-v354 .bd-tech-card-editor-v354 {
  max-height: 100dvh !important;
}

.bd-tech-card-editor-v354 .bd-catalog-form {
  display: flex;
  flex-direction: column;
}

.bd-tech-card-editor-v354 .bd-catalog-sheet-actions {
  margin-top: auto !important;
  flex: 0 0 auto;
}

@media (max-width: 719px) {
  .bd-catalog-sheet-backdrop:not(.bd-tech-card-workspace-v354) {
    padding: 0;
  }

  .bd-catalog-sheet:not(.bd-tech-card-editor-v354) {
    display: flex;
    max-height: calc(100dvh - 50px);
    padding-bottom: 0;
    flex-direction: column;
    overflow: hidden;
  }

  .bd-catalog-sheet:not(.bd-tech-card-editor-v354) > .bd-catalog-form {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: calc(88px + env(safe-area-inset-bottom));
  }

  .bd-catalog-sheet:not(.bd-tech-card-editor-v354) .bd-catalog-sheet-actions {
    bottom: calc(-12px - env(safe-area-inset-bottom));
    margin: auto -18px calc(-12px - env(safe-area-inset-bottom)) !important;
    padding: 11px 18px calc(12px + env(safe-area-inset-bottom));
    background: rgba(248, 249, 252, .98);
    box-shadow: 0 -9px 24px rgba(24, 29, 53, .08);
  }

  .bd-tech-card-editor-v354 {
    width: 100% !important;
    max-width: none !important;
  }
}
`);
}

function ensureAssortmentCss() {
  const current = readFileSync(assortmentCssPath, "utf8");
  if (current.includes("Publication header alignment v355")) return;
  appendFileSync(assortmentCssPath, `

/* Publication header alignment v355 */
@media (max-width: 767px) {
  .bd-assortment-command-v170 {
    padding-top: 0;
  }

  body:has(.bd-assortment-command-v170) bd-app-header .bd-app-header-copy h1 {
    font-size: 14px;
    letter-spacing: -0.035em;
  }
}
`);
}

function refreshShellCache() {
  for (const shellPath of shellPaths) {
    const current = readFileSync(shellPath, "utf8");
    if (current.includes("publication-readiness-v355")) continue;
    let next = current.replace(
      /-modal-workspace-v354(?:-modal-workspace-v354)*/g,
      "-modal-workspace-v354-publication-readiness-v355",
    );
    next = next.replace(/(catalog\.css\?v=[^\"']+)/, "$1-publication-readiness-v355");
    next = next.replace(/(assortment-command-v170\.css\?v=[^\"']+)/, "$1-publication-readiness-v355");
    if (next !== current) writeFileSync(shellPath, next);
  }
}

function applyRepairs() {
  const oldLifecycle = 'const p=document.body.style.overflow,c=I=>{I.key==="Escape"&&!document.querySelector(".bd-quick-create-backdrop-v336")&&a()};document.body.style.overflow="hidden",window.addEventListener("keydown",c);const I=requestAnimationFrame(()=>bdTechDialogRefV354.current?.focus({preventScroll:!0}));return()=>{cancelAnimationFrame(I),window.removeEventListener("keydown",c),document.body.style.overflow=p}';
  const deferredLifecycle = 'const p=document.body.style.overflow==="hidden"?"":document.body.style.overflow,c=I=>{I.key==="Escape"&&!document.querySelector(".bd-quick-create-backdrop-v336")&&a()};document.body.style.overflow="hidden",window.addEventListener("keydown",c);const I=requestAnimationFrame(()=>bdTechDialogRefV354.current?.focus({preventScroll:!0}));return()=>{cancelAnimationFrame(I),window.removeEventListener("keydown",c),requestAnimationFrame(()=>{document.body.style.overflow=document.querySelector(".bd-quick-create-backdrop-v336,.bd-catalog-sheet-backdrop,.bd-assortment-sheet-v170")?"hidden":p})}';
  const lifecycleToReplace = source.includes(oldLifecycle) ? oldLifecycle : source.includes(deferredLifecycle) ? deferredLifecycle : null;
  if (lifecycleToReplace) {
    replaceScopedOnce(
      "function bdCatRecipeEditor",
      lifecycleToReplace,
      'const p=document.body.style.overflow==="hidden"?"":document.body.style.overflow,c=I=>{I.key==="Escape"&&!document.querySelector(".bd-quick-create-backdrop-v336")&&a()};document.body.style.overflow="hidden",window.addEventListener("keydown",c);const I=requestAnimationFrame(()=>bdTechDialogRefV354.current?.focus({preventScroll:!0}));return()=>{cancelAnimationFrame(I),window.removeEventListener("keydown",c),document.body.style.overflow=p}',
      "restore body scrolling after the last dialog closes",
    );
  }

  const oldStatus = 'i.jsxs("span",{children:["Связано ",bdTechLinkedCount," из ",l.ingredients.length," ингредиентов",bdTechInvalidCount?" · проверить: "+bdTechInvalidCount:""]})';
  if (source.includes(oldStatus)) {
    replaceScopedOnce(
      "function bdCatRecipeEditor",
      oldStatus,
      'i.jsx("span",{children:l.ingredients.length?["Связано ",bdTechLinkedCount," из ",l.ingredients.length," ингредиентов",bdTechInvalidCount?" · проверить: "+bdTechInvalidCount:""].join(""):"Добавьте хотя бы один ингредиент"})',
      "replace the zero-of-zero status with an instruction",
    );
  }
}

if (!source.includes(marker)) {
  if (!source.includes('const bdModalWorkspaceVersion="v354"')) {
    throw new Error("Modal workspace v354 must be applied first.");
  }
  replaceOnce(
    'const bdModalWorkspaceVersion="v354";',
    'const bdModalWorkspaceVersion="v354";\n' + marker + ";",
    "insert v355 marker",
  );
}

applyRepairs();
writeFileSync(bundlePath, source);
ensureCatalogCss();
ensureAssortmentCss();
refreshShellCache();
console.log("Publication readiness v355 is applied.");
