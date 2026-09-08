import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { normalizePurchaseQuantity } from "../lib/bardoctor/stock-units";

type Element = { type: string; props: Record<string, unknown> };
type Row = Record<string, unknown>;
function runtime() {
  const source = readFileSync("public/assets/index-BQGspy0I.js", "utf8");
  const start = source.indexOf("/* purchase-units-v421:start */");
  const end = source.indexOf("/* purchase-units-v421:end */", start);
  assert.ok(start >= 0 && end > start);
  const jsx = (type: string, props: Row): Element => ({ type, props });
  return runInNewContext(source.slice(start, end) + ";({render:bdPurchaseUnitsV421,preview:bdPurchasePreviewV421})", {
    structuredClone, i: { jsx, jsxs: jsx }, bdProcField: "field", bdCatArray: (v: unknown) => Array.isArray(v) ? v : [],
    bdWarehouseRecord: (v: unknown) => v ?? {}, xr: () => ({}), bdCatNumber: Number,
    bdProcFormatAmountV221: (amount: number, unit: string) => `${amount} ${unit}`,
  }) as { render: (input: { line: Row; onChange: (patch: Row) => void }) => Element; preview: (line: Row) => { ok: boolean; snapshot: Row } };
}
function all(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(all);
  if (!value || typeof value !== "object") return [];
  const element = value as Element;
  return element.props ? [element, ...all(element.props.children)] : [];
}

test("actual purchase component toggles relevant fields and produces canonical persisted request inputs", () => {
  const api = runtime();
  let line: Row = { quantity: 24, unit: "pcs", unitPrice: 15, lineTotal: 360, packageSize: "1 шт." };
  const render = () => api.render({ line, onChange: (patch) => { line = { ...line, ...patch }; } });
  const change = (element: Element, target: Row) => (element.props.onChange as (event: { target: Row }) => void)({ target });
  assert.equal(all(render()).filter((element) => element.props["aria-label"] === "Количество в упаковке").length, 0);
  assert.equal(api.preview(line).snapshot.canonicalQuantity, 24);
  change(all(render()).find((element) => element.props.type === "checkbox")!, { checked: true });
  assert.equal(api.preview(line).ok, false, "An empty package content must not guess one item");
  change(all(render()).find((element) => element.props["aria-label"] === "Количество упаковок")!, { value: "2" });
  change(all(render()).find((element) => element.props["aria-label"] === "Количество в упаковке")!, { value: "12" });
  line = { ...line, unitPrice: 180, lineTotal: 360 };
  assert.equal(api.preview(line).snapshot.canonicalQuantity, 24);
  assert.equal(api.preview(line).snapshot.normalizedUnitCost, 15);
  line = JSON.parse(JSON.stringify(line)) as Row;
  assert.equal(all(render()).filter((element) => element.props["aria-label"] === "Количество в упаковке").length, 1);
  change(all(render()).find((element) => element.props["aria-label"] === "Количество упаковок")!, { value: "6" });
  change(all(render()).find((element) => element.props["aria-label"] === "Количество в упаковке")!, { value: "0.7" });
  change(all(render()).find((element) => element.props["aria-label"] === "Единица содержимого")!, { value: "l" });
  line = { ...line, unitPrice: 200, lineTotal: 1200 };
  assert.equal(api.preview(line).snapshot.canonicalQuantity, 4.2);
  assert.equal(api.preview(line).snapshot.canonicalUnit, "l");
  assert.ok(Math.abs(Number(api.preview(line).snapshot.normalizedUnitCost) - 1200 / 4.2) < 1e-10);
  change(all(render()).find((element) => element.props.type === "checkbox")!, { checked: false });
  assert.equal(all(render()).filter((element) => element.props["aria-label"] === "Количество в упаковке").length, 0);
  assert.equal(line.packageContent, undefined);
  assert.equal(line.packageSize, "");
});

test("actual tech-card client reads canonical receipt snapshot without another packaging conversion", () => {
  const source = readFileSync("public/assets/index-BQGspy0I.js", "utf8");
  const units = source.slice(source.indexOf("/* purchase-units-v421:start */"), source.indexOf("/* purchase-units-v421:end */"));
  const costs = source.slice(source.indexOf("function bdTechCostUnitV376"), source.indexOf("function bdAssortmentFallbackAnalyticsV170"));
  const api = runInNewContext(units + costs + ";({maps:bdTechCostMapsV376,row:bdTechCostRowV376})", {
    structuredClone, bdCatArray: (v: unknown) => Array.isArray(v) ? v : [],
    bdAssortmentNumberV170: (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback,
  });
  const conversion = normalizePurchaseQuantity({ quantity: 6, unit: "pcs", price: 200, stockUnit: "l",
    packageContent: { quantity: 0.7, unit: "l" } });
  assert.equal(conversion.ok, true);
  if (!conversion.ok) return;
  const root = { nomenclature: [{ id: "product", key: "product", productKey: "product", name: "Whisky",
    unit: "l", unitModelVersion: 4 }], stockBalances: [] };
  const document = { id: "purchase", status: "confirmed", date: "2026-09-08", currency: "RUB",
    items: [{ id: "line", name: "Whisky", purchaseProductKey: "product", quantity: 6, unit: "pcs",
      lineTotal: 1200, unitPrice: 200, purchaseConversion: conversion.snapshot }] };
  const identity = (value: unknown) => String(value ?? "");
  const maps = api.maps(root, [JSON.parse(JSON.stringify(document))], identity);
  const result = api.row({ id: "ingredient", name: "Whisky", purchaseProductKey: "product", quantity: 50, unit: "ml" }, maps, identity);
  assert.equal(result.complete, true);
  assert.equal(result.cost, 14.29);
  assert.equal(result.purchaseDocumentId, "purchase");
});
