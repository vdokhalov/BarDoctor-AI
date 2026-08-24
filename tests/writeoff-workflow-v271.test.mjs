import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const routePath = new URL("../app/api/write-offs/route.ts", import.meta.url);

test("warehouse write-offs use the canonical multi-item document workflow", async () => {
  const bundle = await readFile(bundlePath, "utf8");
  assert.match(bundle, /bdWriteoffWorkflowVersionV271="canonical-document-v271"/);
  assert.match(bundle, /Товар → количество → движение → остаток → себестоимость/);
  assert.match(bundle, /Провести списание/);
  assert.match(bundle, /canonical Номенклатуры/);
  assert.match(bundle, /Стоимость не рассчитана/);
  assert.match(bundle, /bdWriteoffPickerV271/);
  assert.match(bundle, /bdWriteoffDetailV271/);
  assert.match(bundle, /bd-writeoff-movement-link-v271/);
  const workflow = bundle.slice(bundle.indexOf("const bdWriteoffWorkflowVersionV271"), bundle.indexOf("function bdWarehouseNavigationUrlV247"));
  assert.doesNotMatch(workflow, /Себестоимость списания/);
  assert.doesNotMatch(workflow, /window\.confirm/);
});

test("write-off API persists document, balance, movement, finance shadow and audit in one batch", async () => {
  const route = await readFile(routePath, "utf8");
  assert.match(route, /postWriteOffDocument/);
  assert.match(route, /database\.batch\(\[/);
  assert.match(route, /WRITE_OFF_STORE_KEY/);
  assert.match(route, /ASSORTMENT_STORE_KEY/);
  assert.match(route, /STOCK_MOVEMENT_STORE_KEY/);
  assert.match(route, /EXPENSE_STORE_KEY/);
  assert.match(route, /write_off\.posted/);
  assert.match(route, /hasPermission\(account, "inventory\.manage"\)/);
  assert.match(route, /number\(body\.venueId\) !== account\.venueId/);
});
