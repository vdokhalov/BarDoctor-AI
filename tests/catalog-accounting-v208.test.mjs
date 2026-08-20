import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync(new URL("../public/catalog-accounting-v207.js", import.meta.url), "utf8");

test("catalog cost articles use compact professional groups for desktop and mobile selects", () => {
  for (const label of ["Продукты питания","Алкоголь","Безалкогольные напитки","Кальянная продукция","Расходные материалы","Хозяйственные материалы","Ремонт и обслуживание","Маркетинг и реклама","Оборудование","Прочие затраты"]) assert.match(script, new RegExp(label));
  for (const group of ["Себестоимость","Операционные затраты","Основные средства","Прочее"]) assert.match(script, new RegExp(group));
  assert.match(script, /var stableValue = option\.value/);
  assert.match(script, /option\.value = stableValue/);
  assert.match(script, /document\.createElement\("optgroup"\)/);
  assert.match(script, /data-bd-cost-article/);
});
