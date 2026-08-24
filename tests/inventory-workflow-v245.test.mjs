import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("inventory workflow bundle is valid and keeps the count blind until review", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  parse(bundle, { ecmaVersion: "latest", sourceType: "script" });
  assert.match(bundle, /bd-inventory-sheet-v245/);
  assert.match(bundle, /Учётный остаток и стоимость скрыты до этапа проверки/);
  assert.match(bundle, /Пустое поле не считается нулём/);
  assert.match(bundle, /Перейти к результатам/);
  assert.match(bundle, /Завершить инвентаризацию/);
  assert.match(bundle, /Печатная ведомость/);
  assert.match(bundle, /actual:s/);
  assert.match(bundle, /a===""\?null/);
  assert.doesNotMatch(bundle, /Остальные совпадают с расчётом/);
  assert.doesNotMatch(bundle, /Расчётный остаток показан рядом/);
});

test("warehouse inventory tab exposes draft continuation and immutable completed results", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /Инвентаризация № /);
  assert.match(bundle, /Продолжить/);
  assert.match(bundle, /Открыть результаты/);
  assert.match(bundle, /bdInventoryCountStatusLabel/);
  assert.match(bundle, /\["completed","confirmed"\]/);
  assert.match(bundle, /Последняя завершена/);
});

test("inventory workflow preserves all warehouse entry points", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  for (const label of [
    "Остатки",
    "Движения",
    "Инвентаризации",
    "Списания",
    "Провести инвентаризацию",
    "Сканировать ведомость",
    "Импортировать продажи",
    "Добавить покупку",
    "Номенклатура",
    "Требуют распределения",
  ]) assert.match(bundle, new RegExp(label));
});

test("inventory count UI is mobile-first without losing the desktop table layout", async () => {
  const css = await read("public/warehouse.css");
  assert.match(css, /Inventory workflow v245/);
  assert.match(css, /\.bd-inventory-sheet-v245/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /grid-template-columns: minmax\(145px, 1fr\) minmax\(300px, 1\.5fr\)/);
  assert.match(css, /\.bd-inventory-entry-v245 input/);
});

test("cache markers deliver the current inventory scope hierarchy styles", async () => {
  const [html, response, bootstrap] = await Promise.all([
    read("public/app.html"),
    read("app/bar-doctor-response.ts"),
    read("public/bardoctor-preview.js"),
  ]);
  assert.match(html, /inventory-scope-hierarchy-v256/);
  assert.match(response, /inventory-scope-hierarchy-v256/);
  assert.match(bootstrap, /inventory-workflow-v245/);
});
