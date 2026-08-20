import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync(new URL("../public/catalog-accounting-v207.js", import.meta.url), "utf8");
const labels = [
  "Продукты питания",
  "Алкоголь",
  "Безалкогольные напитки",
  "Кальянная продукция",
  "Расходные материалы",
  "Хозяйственные материалы",
  "Ремонт и обслуживание",
  "Маркетинг и реклама",
  "Оборудование",
  "Прочие затраты",
];
const groups = ["Себестоимость", "Операционные затраты", "Основные средства", "Прочее"];

test("catalog cost articles use compact professional groups for desktop and mobile selects", () => {
  for (const label of labels) assert.match(script, new RegExp(label));
  for (const group of groups) assert.match(script, new RegExp(group));
  assert.ok(Math.max(...labels.map((label) => label.length)) <= 24, "mobile labels stay compact");
  assert.match(script, /var stableValue = option\.value/);
  assert.match(script, /option\.value = stableValue/);
  assert.match(script, /var selectedValue = select\.value/);
  assert.match(script, /select\.value = selectedValue/);
  assert.match(script, /document\.createElement\("optgroup"\)/);
  assert.match(script, /data-bd-cost-article/);
});
