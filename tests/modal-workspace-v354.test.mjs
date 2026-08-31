import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bundle = readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/catalog.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../public/app.html", import.meta.url), "utf8");

test("v354 allows only one primary assortment workspace", () => {
  assert.match(bundle, /bdModalWorkspaceVersion="v354"/);
  assert.match(bundle, /ge&&!O&&!D&&!L&&!B&&!A&&/);
  assert.match(bundle, /O&&!D&&!B&&!L&&/);
  assert.match(bundle, /D&&!O&&!B&&!L&&/);
  assert.match(bundle, /B&&!O&&!D&&!L&&/);
  assert.match(bundle, /L&&!O&&!D&&!B&&/);
});

test("detail-to-editor transitions close competing layers atomically", () => {
  assert.match(bundle, /se\(null\),z\(null\),U\(null\),q\(null\),M\(w\)/);
  assert.match(bundle, /M\(null\),U\(null\),q\(null\),z\(w\)/);
});

test("tech-card editor is a labeled, dismissible primary dialog", () => {
  assert.match(bundle, /bd-tech-card-workspace-v354/);
  assert.match(bundle, /role:"dialog","aria-modal":!0/);
  assert.match(bundle, /aria-labelledby":"bd-tech-card-title-v354"/);
  assert.match(bundle, /I\.key==="Escape"/);
  assert.match(bundle, /document\.body\.style\.overflow="hidden"/);
  assert.match(bundle, /Меню → Техкарта/);
});

test("tech-card workspace owns the viewport on desktop and mobile", () => {
  assert.match(css, /\.bd-tech-card-workspace-v354/);
  assert.match(css, /z-index:\s*1220/);
  assert.match(css, /\.bd-tech-card-editor-v354[\s\S]*height:\s*100dvh/);
  assert.match(css, /\.bd-tech-card-editor-v354 \.bd-catalog-sheet-actions[\s\S]*position:\s*sticky/);
  assert.match(css, /@media \(max-width: 719px\)/);
  assert.match(shell, /modal-workspace-v354/);
});

test("contextual nomenclature creation remains the only child layer", () => {
  assert.match(css, /\.bd-tech-card-workspace-v354[\s\S]*z-index:\s*1220/);
  const taxonomyCss = readFileSync(new URL("../public/canonical-taxonomy-v336.css", import.meta.url), "utf8");
  assert.match(taxonomyCss, /\.bd-quick-create-backdrop-v336[\s\S]*z-index:\s*2147482500/);
});
