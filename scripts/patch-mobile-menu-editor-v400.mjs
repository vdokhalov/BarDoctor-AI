import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "bd-mobile-menu-editor-v400";
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const cssPath = path.join(root, "public/catalog.css");

let bundle = fs.readFileSync(bundlePath, "utf8");

if (!bundle.includes("bd-menu-position-editor-v400")) {
  const before = 'return i.jsx("div",{className:"bd-catalog-sheet-backdrop",onClick:P=>P.target===P.currentTarget&&a(),children:i.jsxs("section",{className:"bd-catalog-sheet",children:';
  const after = 'return i.jsx("div",{className:"bd-catalog-sheet-backdrop bd-menu-position-backdrop-v400",onClick:P=>P.target===P.currentTarget&&a(),children:i.jsxs("section",{className:"bd-catalog-sheet bd-menu-position-editor-v400",children:';
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${marker}: menu position editor expected once, found ${count}`);
  bundle = bundle.replace(before, after);
  fs.writeFileSync(bundlePath, bundle);
}

const css = `

/* ${marker}
 * The position editor owns one vertical scroll axis. Its footer is anchored to
 * the viewport on phones so a horizontal pan or inertial scroll cannot move it.
 */
@media (max-width: 520px) {
  .bd-menu-position-backdrop-v400 {
    width: 100%;
    max-width: 100vw;
    overflow: hidden;
    overscroll-behavior: none;
    touch-action: pan-y;
  }

  .bd-menu-position-editor-v400 {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    overscroll-behavior: contain;
  }

  .bd-menu-position-editor-v400 .bd-catalog-sheet-head,
  .bd-menu-position-editor-v400 .bd-catalog-sheet-head > div,
  .bd-menu-position-editor-v400 > .bd-catalog-form,
  .bd-menu-position-editor-v400 > .bd-catalog-form > *,
  .bd-menu-position-editor-v400 .bd-catalog-grid,
  .bd-menu-position-editor-v400 .bd-catalog-grid > *,
  .bd-menu-position-editor-v400 .bd-catalog-field,
  .bd-menu-position-editor-v400 .bd-menu-sale-size-v298,
  .bd-menu-position-editor-v400 .bd-menu-sale-size-fields-v298,
  .bd-menu-position-editor-v400 .bd-venue-currency-lock-v326 {
    min-width: 0;
    max-width: 100%;
  }

  .bd-menu-position-editor-v400 > .bd-catalog-form {
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-x: none;
    overscroll-behavior-y: contain;
    touch-action: pan-y;
    padding-bottom: calc(94px + env(safe-area-inset-bottom)) !important;
  }

  .bd-menu-position-editor-v400 .bd-catalog-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .bd-menu-position-editor-v400 .bd-catalog-field input,
  .bd-menu-position-editor-v400 .bd-catalog-field select,
  .bd-menu-position-editor-v400 .bd-catalog-field textarea {
    min-width: 0;
    max-width: 100%;
  }

  .bd-menu-position-editor-v400 .bd-catalog-sheet-actions {
    position: fixed;
    z-index: 92;
    right: max(env(safe-area-inset-right), calc((100vw - 430px) / 2));
    bottom: 0;
    left: max(env(safe-area-inset-left), calc((100vw - 430px) / 2));
    width: auto;
    max-width: none;
    margin: 0 !important;
    padding: 11px 18px calc(12px + env(safe-area-inset-bottom));
    background: rgba(248, 249, 252, .98);
    box-shadow: 0 -9px 24px rgba(24, 29, 53, .08);
  }
}
`;

let catalogCss = fs.readFileSync(cssPath, "utf8");
if (!catalogCss.includes(marker)) {
  catalogCss += css;
  fs.writeFileSync(cssPath, catalogCss);
}

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(
    /catalog\.css\?v=([^"']+)/g,
    (match, version) => version.includes(marker) ? match : `${match}-${marker}`,
  );
  contents = contents.replace(
    /index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g,
    (match, version) => version.includes(marker) ? match : `${match}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
