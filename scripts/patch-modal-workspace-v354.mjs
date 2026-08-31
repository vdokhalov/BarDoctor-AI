import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssPath = new URL("../public/catalog.css", import.meta.url);
const shellPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdModalWorkspaceVersion="v354"';

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

function ensureCss() {
  const current = readFileSync(cssPath, "utf8");
  if (current.includes("Modal workspace v354")) return;
  appendFileSync(cssPath, `

/* Modal workspace v354
 * Contract: one primary workspace at a time; contextual quick-create is the only child layer.
 */
.bd-tech-card-workspace-v354 {
  z-index: 1220;
  align-items: stretch;
  justify-content: flex-end;
  background: rgba(15, 18, 39, .58);
  backdrop-filter: blur(6px);
}

.bd-tech-card-editor-v354 {
  display: flex;
  width: min(720px, calc(100vw - 260px));
  max-width: 720px;
  height: 100dvh;
  max-height: 100dvh;
  margin-left: auto;
  padding: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0;
  background: #f8f9fc;
  box-shadow: -20px 0 68px rgba(12, 16, 39, .28);
}

.bd-tech-card-editor-v354:focus { outline: none; }
.bd-tech-card-editor-v354 .bd-catalog-sheet-handle { display: none; }

.bd-tech-card-editor-v354 .bd-catalog-sheet-head {
  flex: 0 0 auto;
  align-items: center;
  margin: 0;
  padding: calc(16px + env(safe-area-inset-top)) 20px 15px;
  border-bottom: 1px solid #e5e7ee;
  background: rgba(255, 255, 255, .97);
}

.bd-tech-card-context-v354 {
  display: block;
  margin-bottom: 4px;
  color: #5b55d9;
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.bd-tech-card-editor-v354 .bd-catalog-sheet-head h2 {
  font-size: 22px;
  line-height: 1.15;
}

.bd-tech-card-editor-v354 .bd-catalog-form {
  min-height: 0;
  flex: 1 1 auto;
  gap: 13px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 20px calc(18px + env(safe-area-inset-bottom));
}

.bd-tech-card-editor-v354 .bd-catalog-sheet-actions {
  position: sticky;
  z-index: 2;
  bottom: calc(-18px - env(safe-area-inset-bottom));
  margin: 4px -20px calc(-18px - env(safe-area-inset-bottom));
  padding: 12px 20px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid #e5e7ee;
  background: rgba(255, 255, 255, .98);
  box-shadow: 0 -10px 28px rgba(24, 29, 53, .07);
}

.bd-tech-card-editor-v354 .bd-catalog-ingredient {
  padding: 14px;
  border-radius: 17px;
}

@media (max-width: 719px) {
  .bd-tech-card-workspace-v354 { padding: 0; }
  .bd-tech-card-editor-v354 {
    width: 100%;
    max-width: none;
    border-radius: 0;
  }
  .bd-tech-card-editor-v354 .bd-catalog-sheet-head,
  .bd-tech-card-editor-v354 .bd-catalog-form { padding-inline: 14px; }
  .bd-tech-card-editor-v354 .bd-catalog-sheet-actions {
    margin-inline: -14px;
    padding-inline: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bd-tech-card-editor-v354 { scroll-behavior: auto; }
}
`);
}

function refreshShellCache() {
  for (const shellPath of shellPaths) {
    const current = readFileSync(shellPath, "utf8");
    if (current.includes("modal-workspace-v354")) continue;
    let next = current.replace(
      /-catalog-workflow-v353(?:-catalog-workflow-v353)*/g,
      "-catalog-workflow-v353-modal-workspace-v354",
    );
    next = next.replace(/(catalog\.css\?v=[^\"']+)/, "$1-modal-workspace-v354");
    if (next !== current) writeFileSync(shellPath, next);
  }
}

function applyRepairs() {
  if (!source.includes('bd-tech-card-workspace-v354')) {
    replaceScopedOnce(
      "function bdCatRecipeEditor",
      '[x,C]=S.useState({}),j=',
      '[x,C]=S.useState({}),bdTechDialogRefV354=S.useRef(null);S.useEffect(()=>{const p=document.body.style.overflow,c=I=>{I.key==="Escape"&&!document.querySelector(".bd-quick-create-backdrop-v336")&&a()};document.body.style.overflow="hidden",window.addEventListener("keydown",c);const I=requestAnimationFrame(()=>bdTechDialogRefV354.current?.focus({preventScroll:!0}));return()=>{cancelAnimationFrame(I),window.removeEventListener("keydown",c),document.body.style.overflow=p}},[a]);const j=',
      "add tech-card dialog lifecycle",
    );
    replaceScopedOnce(
      "function bdCatRecipeEditor",
      'return i.jsx("div",{className:"bd-catalog-sheet-backdrop",children:i.jsxs("section",{className:"bd-catalog-sheet",children:',
      'return i.jsx("div",{className:"bd-catalog-sheet-backdrop bd-tech-card-workspace-v354",role:"presentation",onClick:p=>p.target===p.currentTarget&&a(),children:i.jsxs("section",{ref:bdTechDialogRefV354,className:"bd-catalog-sheet bd-tech-card-editor-v354",role:"dialog","aria-modal":!0,"aria-labelledby":"bd-tech-card-title-v354",tabIndex:-1,children:',
      "promote recipe to a single primary workspace",
    );
    replaceScopedOnce(
      "function bdCatRecipeEditor",
      'i.jsxs("div",{children:[i.jsx("h2",{children:"Техкарта"}),',
      'i.jsxs("div",{children:[i.jsx("span",{className:"bd-tech-card-context-v354",children:"Меню → Техкарта"}),i.jsx("h2",{id:"bd-tech-card-title-v354",children:t?"Редактирование техкарты":"Новая техкарта"}),',
      "add task context and dialog label",
    );
    replaceScopedOnce(
      "function bdCatRecipeEditor",
      'className:"bd-catalog-close",onClick:a,children:"×"',
      'className:"bd-catalog-close",onClick:a,"aria-label":"Закрыть техкарту",children:"×"',
      "label recipe close action",
    );
  }

  if (!source.includes('ge&&!O&&!D&&!L&&!B&&!A&&')) {
    replaceScopedOnce(
      "function bdAssortmentCommandPageV170",
      'ge&&i.jsx(bdAssortmentItemDetailV170,',
      'ge&&!O&&!D&&!L&&!B&&!A&&i.jsx(bdAssortmentItemDetailV170,',
      "unmount item detail while a primary editor is active",
    );
    replaceScopedOnce(
      "function bdAssortmentCommandPageV170",
      'onEdit:()=>{const w=E.menuItems.find(R=>R.id===ge.id);w&&(M(w),e(bdAssortmentQueryUrlV170({itemId:null})))},onRecipe:()=>{const w=E.menuItems.find(R=>R.id===ge.id);w&&z(w)}',
      'onEdit:()=>{const w=E.menuItems.find(R=>R.id===ge.id);w&&(se(null),z(null),U(null),q(null),M(w),e(bdAssortmentQueryUrlV170({itemId:null})))},onRecipe:()=>{const w=E.menuItems.find(R=>R.id===ge.id);w&&(M(null),U(null),q(null),z(w))}',
      "make detail-to-editor transitions atomic",
    );
    replaceScopedOnce(
      "function bdAssortmentCommandPageV170",
      'O&&i.jsx(bdCatMenuEditor,',
      'O&&!D&&!B&&!L&&i.jsx(bdCatMenuEditor,',
      "guard menu editor as a primary layer",
    );
    replaceScopedOnce(
      "function bdAssortmentCommandPageV170",
      'D&&i.jsx(bdCatRecipeEditor,',
      'D&&!O&&!B&&!L&&i.jsx(bdCatRecipeEditor,',
      "guard recipe editor as a primary layer",
    );
    replaceScopedOnce(
      "function bdAssortmentCommandPageV170",
      'B&&i.jsx(bdCatInternalEditor,',
      'B&&!O&&!D&&!L&&i.jsx(bdCatInternalEditor,',
      "guard internal editor as a primary layer",
    );
    replaceScopedOnce(
      "function bdAssortmentCommandPageV170",
      'L&&i.jsx(bdCatUrlSheet,',
      'L&&!O&&!D&&!B&&i.jsx(bdCatUrlSheet,',
      "guard URL editor as a primary layer",
    );
  }
}

if (!source.includes(marker)) {
  if (!source.includes('const bdCatalogWorkflowUxVersion="v353"')) {
    throw new Error("Catalog workflow UX v353 must be applied first.");
  }
  replaceOnce(
    'const bdCatalogWorkflowUxVersion="v353";',
    'const bdCatalogWorkflowUxVersion="v353";\n' + marker + ";",
    "insert v354 marker",
  );
}

applyRepairs();
writeFileSync(bundlePath, source);
ensureCss();
refreshShellCache();
console.log("Modal workspace v354 is applied.");
