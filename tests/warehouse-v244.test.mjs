import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("warehouse partial valuation keeps the calculated amount visible and offers a focused path", async () => {
  const [bundle, css] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/warehouse.css"),
  ]);
  const start = bundle.indexOf("function bdWarehousePage");
  const end = bundle.indexOf("function bdRecurringSettingsEditor", start);
  const warehouse = bundle.slice(start, end);
  assert.match(warehouse, /bdWarehouseMoney\(bdWarehouseValueSummary\.total,bdWarehouseValueSummary\.baseCurrency\)/);
  assert.match(warehouse, /"Стоимость рассчитанной части"/);
  assert.match(warehouse, /"Не рассчитано: "\+bdWarehouseValueSummary\.unvaluedCount\+" из "\+bdWarehouseValueSummary\.denominator/);
  assert.match(warehouse, /bdWarehouseInventoryValueLine\(B,n\?\.currency\)\.status==="unvalued"/);
  assert.match(css, /Warehouse valuation v244/);
  assert.match(css, /@media \(min-width: 768px\)/);
});

test("warehouse valuation denominator excludes zero, archived and inactive records", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /Math\.abs\(r\)<1e-7.*status:"zero"/);
  assert.match(bundle, /e\?\.archived===!0\|\|e\?\.deleted===!0\|\|e\?\.active===!1/);
  assert.match(bundle, /status:"negative_stock"|reason:"negative_stock"/);
});

test("warehouse valuation remains presentation-unit independent and never sums mismatched currencies", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const line = bundle.split("\n").find((value) => value.startsWith("function bdWarehouseInventoryValueLine")) ?? "";
  assert.doesNotMatch(line, /displayUnit|displayPackage/);
  assert.match(line, /s!==n.*currency_mismatch/);
  assert.match(line, /h==="currency_mismatch"\?"currency_mismatch"/);
  assert.match(line, /averageUnitCost/);
});

test("partial valuation has explicit mobile QA coverage at supported widths", async () => {
  const qaFrame = await read("public/warehouse-qa-frame-v244.html");
  assert.match(qaFrame, /375 px · partial/);
  assert.match(qaFrame, /390 px · partial/);
  assert.match(qaFrame, /430 px · partial/);
  assert.match(qaFrame, /qaCurrency=incomplete/);
});

test("valuation bundle is cache-busted through both application shells", async () => {
  const [html, response, bootstrap] = await Promise.all([
    read("public/app.html"),
    read("app/bar-doctor-response.ts"),
    read("public/bardoctor-preview.js"),
  ]);
  assert.match(html, /bardoctor-preview\.js[^\"]*warehouse-valuation-v244/);
  assert.match(response, /bardoctor-preview\.js[^\"]*warehouse-valuation-v244/);
  assert.match(bootstrap, /index-BQGspy0I\.js[^\"]*warehouse-valuation-v244/);
});
