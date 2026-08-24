import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("inventory list uses a compact action menu and an in-app danger confirmation", async () => {
  const [bundle, css] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/warehouse.css"),
  ]);
  assert.match(bundle, /inventory-delete-v270/);
  assert.match(bundle, /Удалить инвентаризацию/);
  assert.match(bundle, /bdConfirmInventoryDeleteV270/);
  assert.match(bundle, /aria-modal","true/);
  assert.match(bundle, /Остатки склада не изменятся/);
  assert.match(bundle, /action:"delete"/);
  assert.match(bundle, /bdInventoryCanDeleteV270/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function bdConfirmInventoryDeleteV270"), bundle.indexOf("async function bdDeleteInventoryFromListV270")), /window\.confirm/);
  assert.match(css, /\.bd-inventory-history-menu-v270/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /body\.bd-inventory-delete-open-v270/);
});

test("fullscreen inventory exposes deletion only for unfinished documents", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const sheet = bundle.slice(bundle.indexOf("function bdInventoryCountSheet"), bundle.indexOf("function bdWriteoffSheet"));
  assert.match(sheet, /async function remove\(\)/);
  assert.match(sheet, /doc&&!completed/);
  assert.match(sheet, /aria-label":"Удалить инвентаризацию/);
  assert.match(sheet, /request\("delete"/);
});
