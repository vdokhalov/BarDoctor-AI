import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";

const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = await readFile(new URL("../public/catalog.css", import.meta.url), "utf8");
const response = await readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8");
const shell = await readFile(new URL("../public/app.html", import.meta.url), "utf8");
const bootstrap = await readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");

test("compiled catalog bundle remains valid JavaScript", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
});

test("recipe editor exposes confidence-aware matching states", () => {
  for (const marker of [
    "bdCatIngredientMatchV259",
    "Товар найден автоматически",
    "Почему связано?",
    "возможных соответствия",
    "Показать все",
    "Товар не найден",
    "Введите название, поставщика или фасовку…",
  ]) {
    assert.ok(bundle.includes(marker), `missing matching UI marker: ${marker}`);
  }
});

test("manual choice is persisted as a confirmed user alias", () => {
  assert.ok(bundle.includes('linkSource:"manual"'));
  assert.ok(bundle.includes("linkConfirmedByUser:!0"));
  assert.ok(bundle.includes('matchEvidence:["подтверждено пользователем"]'));
  assert.ok(bundle.includes("bdCatMatchingProductsV258"));
  assert.ok(bundle.includes("nomenclature:bdCatArray(t.nomenclature)"));
  assert.ok(bundle.includes("techCardIngredientAliases:bdCatArray(t.techCardIngredientAliases)"));
  assert.ok(
    bundle.split("products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C))").length - 1 >= 2,
    "both recipe flows must keep the canonical product matcher",
  );
});

test("matching surfaces are responsive and overflow safe", () => {
  for (const marker of [
    ".bd-ingredient-match-v258",
    ".bd-ingredient-suggestions-v258",
    ".bd-ingredient-full-search-v258",
    "overflow-wrap: anywhere",
    "@media (max-width: 520px)",
  ]) {
    assert.ok(css.includes(marker), `missing semantic matching CSS: ${marker}`);
  }
});

test("v258 assets are cache-busted across both app shells", () => {
  for (const source of [response, shell, bootstrap]) {
    assert.ok(source.includes("20260823-tech-card-semantic-matching-v258"));
  }
});
