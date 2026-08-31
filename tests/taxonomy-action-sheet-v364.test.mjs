import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../public/canonical-taxonomy-v336.css", import.meta.url), "utf8");
const shells = [
  fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
];

test("each taxonomy level explains its parent relationship", () => {
  assert.match(bundle, /Родитель раздела/);
  assert.match(bundle, /Верхний уровень/);
  assert.match(bundle, /Родитель категории/);
  assert.match(bundle, /Родитель подкатегории/);
  assert.doesNotMatch(bundle, /children:"Родитель"/);
  assert.doesNotMatch(bundle, /children:"Переместить в"/);
});

test("section renders its own parent selector", () => {
  assert.match(bundle, /C==="section"\?i\.jsxs\("label",\{className:"bd-tax-move-menu-v364 bd-tax-section-parent-v365"/);
  assert.match(bundle, /q=C==="section"\?"разделом":C==="category"\?"категорией":"подкатегорией"/);
  assert.match(bundle, /children:"Действия с "\+q/);
});

test("taxonomy action panel is bounded on mobile", () => {
  assert.match(css, /bd-taxonomy-action-sheet-v364/);
  assert.match(css, /\.bd-tax-node-main-v336 > span \{[\s\S]*?min-width: 0;/);
  assert.match(css, /\.bd-tax-node-popover-v364 \{[\s\S]*?position: absolute;/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.bd-tax-node-popover-v364 \{[\s\S]*?position: fixed !important;/);
  assert.match(css, /\.bd-tax-move-menu-v364 select \{[\s\S]*?width: 100%;[\s\S]*?min-width: 0;/);
});

test("application shells invalidate both bundle and taxonomy stylesheet", () => {
  for (const shell of shells) {
    assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-taxonomy-action-sheet-v364/);
  }
  for (const shell of shells.slice(0, 2)) {
    assert.match(shell, /canonical-taxonomy-v336\.css\?v=[^"']*bd-taxonomy-action-sheet-v364/);
  }
});
