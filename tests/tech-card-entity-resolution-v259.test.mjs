import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";

const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = await readFile(new URL("../public/catalog.css", import.meta.url), "utf8");
const response = await readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8");
const shell = await readFile(new URL("../public/app.html", import.meta.url), "utf8");
const bootstrap = await readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");

test("compiled bundle remains valid after entity-resolution UI patch", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
});

test("linked entity with unresolved unit has a dedicated workflow", () => {
  for (const marker of [
    "bdCatIngredientMatchV259",
    "Товар найден автоматически",
    "Нужно уточнить норму",
    "Нужно выбрать фасовку",
    "Вес или объём 1 шт.",
    "Подтвердить",
    "Изменить товар",
  ]) {
    assert.ok(bundle.includes(marker), `missing entity resolution UI: ${marker}`);
  }
  assert.ok(bundle.includes('unitConversion:{amount:R,unit:W,confirmedByUser:!0,source:"manual"}'));
  assert.ok(bundle.includes('unitResolutionStatus:"packaging_compatible"'));
  assert.ok(bundle.includes("bdCatResolvedAmountV259"));
  assert.ok(bundle.includes("Нужно уточнить норму или фасовку"));
});

test("unit-review UI is responsive and package options remain usable", () => {
  for (const marker of [
    ".bd-ingredient-unit-review-v259",
    ".bd-ingredient-conversion-v259",
    ".bd-ingredient-package-options-v259",
    "overflow-x: auto",
    "@media (max-width: 520px)",
  ]) {
    assert.ok(css.includes(marker), `missing v259 CSS marker: ${marker}`);
  }
});

test("v259 assets are cache-busted across every app shell", () => {
  for (const source of [response, shell, bootstrap]) {
    assert.ok(source.includes("20260823-tech-card-entity-resolution-v259"));
  }
});
