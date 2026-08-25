import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("sales UX exposes product language, unified source selection and mobile-safe quick entry", async () => {
  const [route, script, styles] = await Promise.all([
    read("app/sales-import/route.ts"),
    read("public/sales-import.js"),
    read("public/sales-import.css"),
  ]);
  for (const label of ["Загрузить файл / фото", "Вставить текст", "Продиктовать", "Ввести вручную"]) assert.match(route, new RegExp(label));
  assert.match(route, /data-sales-experience="v278"/);
  for (const label of ["Продажи смен → склад", "Продажи за смены", "Документы", "Что не попало на склад", "НОВЫЙ ДОКУМЕНТ"]) assert.match(route, new RegExp(label));
  assert.match(script, /\/api\/sales-batches/);
  assert.match(script, /inputmode="decimal"/);
  assert.match(script, /beforeunload/);
  assert.match(script, /Черновик сохранён на сервере/);
  assert.match(script, /columnMappingRequired/);
  for (const label of ["Прошлая смена", "Частые", "Всё меню", "Без привязки к смене", "Проверка продаж", "Провести продажи", "Сохранить черновик"]) assert.match(script, new RegExp(label));
  assert.doesNotMatch(route, /SALES CONSUMPTION ENGINE|DATA QUALITY|НОВЫЙ SALESBATCH|cost basis/i);
  assert.doesNotMatch(script, /Нет SalesBatch|immutable SALE_CONSUMPTION|Data Quality|ID смены|Ручной grid|venue-scoped/i);
  assert.doesNotMatch(script, /data-clear/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(styles, /@media\(max-width:360px\)/);
  assert.match(styles, /position:sticky/);
  assert.doesNotMatch(styles, /overflow-x/);
  const shellStyles = await read("public/sales-consumption-v275.css");
  assert.match(shellStyles, /body\[data-bd-route="\/sales-import"\] > bd-app-header \{ display: none; \}/);
});

test("warehouse and shift patch exposes sales entry, filters and movement lineage", async () => {
  const [bundle, patcher] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("scripts/patch-sales-consumption-v275.mjs"),
  ]);
  for (const marker of [
    "sales-batch-ledger-v275",
    'sales:"Продажи"',
    "bdWarehouseMovementFilterV275",
    'children:"Документ продаж"',
    'children:"Продажи смены"',
    'height:"100dvh"',
  ]) assert.ok(bundle.includes(marker), `bundle missing ${marker}`);
  assert.match(patcher, /sale_consumption/);
  assert.match(patcher, /sale_reversal/);
  assert.match(patcher, /Закупки/);
  assert.match(patcher, /Производство/);
});

test("sales presentation payload supplies shifts, aliases, frequent items and zero-safe templates", async () => {
  const [route, script] = await Promise.all([
    read("app/api/sales-batches/route.ts"),
    read("public/sales-import.js"),
  ]);
  assert.match(route, /REVENUE_STORE_KEY = "bd_finance_revenue"/);
  assert.match(route, /function availableShifts/);
  assert.match(route, /function frequentItems/);
  assert.match(route, /aliases:/);
  assert.match(route, /quantity: 0/);
  assert.match(script, /filter\(function \(id\) \{ return number\(state\.quantities\[id\]\) > 0; \}\)/);
  assert.match(script, /menuSearchText\(item\)/);
  assert.match(script, /scrollIntoView/);
  assert.match(script, /enterkeyhint="next"/);
});

test("sales review translates canonical units for venue staff", async () => {
  const script = await read("public/sales-import.js");
  assert.match(script, /function unitLabel\(value\)/);
  assert.match(script, /ml: "мл"/);
  assert.match(script, /unitLabel\(item\.baseUnit\)/);
});

test("SalesBatch API keeps RBAC, tenant checks, audit and atomic ledger persistence", async () => {
  const [route, importer, engine] = await Promise.all([
    read("app/api/sales-batches/route.ts"),
    read("app/api/sales-batches/import/route.ts"),
    read("lib/bardoctor/sales-consumption.ts"),
  ]);
  for (const permission of ["sales.view", "sales.create", "sales.post", "sales.reverse", "sales.manage_mapping"]) assert.ok(route.includes(permission));
  assert.match(route, /SALES_VENUE_MISMATCH/);
  assert.match(route, /database\.batch/);
  assert.match(route, /sales_batch\.partially_posted/);
  assert.match(importer, /columnMappingRequired/);
  assert.match(importer, /CSV, XLSX и XLS/);
  assert.match(engine, /export interface SalesSourceAdapter/);
  assert.match(engine, /RecipeSnapshot/);
  assert.match(engine, /sale-consumption:\$\{batchId\}/);
  assert.match(engine, /originalMovementId/);
});
