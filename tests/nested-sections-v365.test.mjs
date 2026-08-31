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

test("sections can choose a parent or return to the top level", () => {
  assert.match(bundle, /bd-nested-sections-v365/);
  assert.match(bundle, /children:"Родитель раздела"/);
  assert.match(bundle, /children:"Верхний уровень"/);
  assert.match(bundle, /Выберите родительский раздел или оставьте верхний уровень/);
});

test("section parent choices exclude self and descendants", () => {
  assert.match(bundle, /function bdSectionDescendantIdsV365/);
  assert.match(bundle, /q=>q\.id!==x\.id&&!bdSectionDescendantIdsV365\(t\?\.sections,x\.id\)\.has\(q\.id\)/);
});

test("nested sections render recursively while preserving alphabetical order", () => {
  assert.match(bundle, /function bdSectionV369/);
  assert.match(bundle, /bdRootsV369=T\.filter\(C=>!C\.parentId\|\|!T\.some\(x=>x\.id===C\.parentId\)\)/);
  assert.match(bundle, /bdRootsV369\.map\(C=>bdSectionV369\(C\)\)/);
  assert.match(bundle, /bdAlphabeticalV363\(\[\.\.\.T\.filter/);
  assert.match(css, /\.bd-tax-nested-section-v365 \{[\s\S]*?border-left: 2px solid/);
});

test("item paths and classification selectors show the full section path", () => {
  assert.match(bundle, /bd-nested-section-paths-v365/);
  assert.match(bundle, /n\.push\(\.\.\.bdSectionPathLabelV365\(e\.sections,r\)\.split\(" → "\)\)/);
  assert.match(bundle, /children:bdSectionPathLabelV365\(y,P\)/);
  assert.match(bundle, /children:bdSectionPathLabelV365\(t\.sections,C\)/);
});

test("nested section release is cache-busted", () => {
  for (const shell of shells) assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-nested-sections-v365/);
  for (const shell of shells.slice(0, 2)) assert.match(shell, /canonical-taxonomy-v336\.css\?v=[^"']*bd-nested-sections-v365/);
});
