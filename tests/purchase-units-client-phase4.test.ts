import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { normalizePurchaseQuantity } from "../lib/bardoctor/stock-units";
import { normalizePurchaseDocument } from "../lib/bardoctor/purchases";
import { preparePurchaseConversions } from "../lib/bardoctor/purchase-conversion";
import { applyPurchaseToInventory } from "../lib/bardoctor/inventory";
import { queryCanonicalNomenclature } from "../lib/bardoctor/nomenclature-selector";
import { observedAwait } from "../lib/bardoctor/request-observability";

type Element = { type: string; props: Record<string, unknown> };
type Row = Record<string, unknown>;
function runtime() {
  const source = readFileSync("public/assets/index-BQGspy0I.js", "utf8");
  const start = source.indexOf("/* purchase-units-v421:start */");
  const end = source.indexOf("/* purchase-units-v421:end */", start);
  assert.ok(start >= 0 && end > start);
  const jsx = (type: string, props: Row): Element => ({ type, props });
  const mapping = source.slice(source.indexOf("function bdInvoiceLineMappingV356"), source.indexOf("function bdInvoiceReviewPriorityV4"));
  return runInNewContext(source.slice(start, end) + mapping + ";({render:bdPurchaseUnitsV421,preview:bdPurchasePreviewV421,mapping:bdInvoiceLineMappingV356})", {
    S: { useState: (value: unknown) => [value, () => {}], useEffect: () => {} },
    structuredClone, i: { jsx, jsxs: jsx }, bdProcField: "field", bdCatArray: (v: unknown) => Array.isArray(v) ? v : [],
    bdWarehouseRecord: (v: unknown) => v ?? {}, xr: () => ({}), bdCatNumber: Number,
    bdProcFormatAmountV221: (amount: number, unit: string) => `${amount} ${unit}`,
  }) as { render: (input: { line: Row; onChange: (patch: Row) => void }) => Element; preview: (line: Row) => { ok: boolean; snapshot: Row }; mapping: (input: { line: Row; onSelect: (patch: Row) => void }) => Element };
}
function all(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(all);
  if (!value || typeof value !== "object") return [];
  const element = value as Element;
  return element.props ? [element, ...all(element.props.children)] : [];
}

test("production stock/other record: SQLite reload → API selector → actual mapping → canonical receipt → reload", () => {
  const store = createRequire(import.meta.url)("../scripts/purchase-units-qa-store.cjs")();
  try {
    const before = store.reload();
    const selected = store.select("Спрайт 0,5л.").items[0];
    assert.equal(selected.key, "stock:спрайт 0 5л|pcs");
    assert.equal(selected.id, selected.key);
    assert.equal(selected.kind, "stock");
    assert.equal(selected.category, "other", "Selector must not rewrite the legacy classification");
    assert.equal(selected.purchaseCategory, "products");
    assert.equal(selected.unit, "pcs");
    assert.equal(selected.packageSize, "1 шт.");
    const api = runtime();
    let line: Row = { id: "sprite-line", name: "Спрайт 0,5л.", category: "auto", quantity: 2, unit: "pcs",
      unitPrice: 180, lineTotal: 360, packageContent: { quantity: 12, unit: "pcs" }, mappingCandidates: [selected] };
    const render = () => api.render({ line, onChange: (patch) => { line = { ...line, ...patch }; } });
    assert.equal(all(render()).some((element) => element.props["data-bd-purchase-units"]), false);
    const mapping = api.mapping({ line, onSelect: (patch) => { line = { ...line, ...patch }; } });
    const button = all(mapping).find((e) => e.type === "button" && all(e).some((child) => child.props.children === selected.name));
    assert.ok(button);
    (button.props.onClick as () => void)();
    line = JSON.parse(JSON.stringify(line)) as Row;
    assert.equal(line.category, "products");
    assert.equal(line.purchaseProductKey, selected.key);
    assert.equal(all(render()).some((e) => e.props["data-bd-purchase-units"] === "v421"), true);
    assert.equal(api.preview(line).snapshot.canonicalQuantity, 24);
    assert.equal(api.preview(line).snapshot.normalizedUnitCost, 15);
    line = { ...line, packageContent: { quantity: 12, unit: "l" } };
    assert.equal(api.preview(line).ok, false, "Selected pcs basis must reject liters even before confirmation");
    line = { ...line, packageContent: { quantity: 12, unit: "pcs" }, category: "other", kind: "service" };
    // Stale/malicious request metadata must not override the persisted stock kind.
    store.confirm({ id: "sprite-purchase", venueId: 401, date: "2026-09-08", currency: "RUB", total: 360, items: [line] });
    const saved = store.reload();
    assert.equal(saved.documents[0].items[0].category, "products");
    assert.equal(saved.documents[0].items[0].purchaseConversion.canonicalQuantity, 24);
    assert.equal(saved.documents[0].items[0].purchaseConversion.normalizedUnitCost, 15);
    assert.equal(saved.stockMovements.length, 1);
    assert.equal(saved.stockMovements[0].amount, 24);
    assert.equal(saved.stockMovements[0].unit, "pcs");
    assert.equal(saved.stockMovements[0].costAmount, 360);
    assert.equal(saved.assortment.stockBalances[0].current, 24);
    assert.equal(saved.assortment.nomenclature.find((p: Row) => p.key === selected.key).kind, "stock");
    assert.equal(saved.assortment.nomenclature.find((p: Row) => p.key === selected.key).category, "other");
    assert.deepEqual(store.reload(), saved);
    assert.deepEqual(before.documents, []);
  } finally { store.close(); }
});

test("linked stock/other fail-closed guards preserve history, venue boundaries and unknown units", () => {
  const product = JSON.parse(readFileSync("tests/fixtures/purchase-stock-other-production.json", "utf8")) as Row;
  const assortment = { nomenclature: [product], stockBalances: [] };
  const raw = { id: "old-other", venueId: 401, status: "confirmed", date: "2026-09-08", currency: "RUB", total: 15,
    items: [{ id: "line", name: "Спрайт 0,5л.", purchaseProductKey: product.key, category: "other", quantity: 1, unit: "шт.", unitPrice: 15, lineTotal: 15 }] };
  const historical = JSON.stringify(raw);
  const normalized = normalizePurchaseDocument(raw, raw.id);
  assert.equal(preparePurchaseConversions(normalized, raw, assortment, true).ok, false, "Do not reinterpret historical non-stock posting");
  const posting = applyPurchaseToInventory({ assortment, document: normalized, accountingCurrency: "RUB" });
  assert.equal(posting.movements.length, 0);
  assert.equal(posting.summary.unresolvedLines.length, 1, "Bypassing conversion must not silently skip stock posting");
  assert.deepEqual(posting.assortment, assortment);
  assert.equal(JSON.stringify(raw), historical);
  for (const changed of [{ ...product, venueId: 402 }, { ...product, unit: "unknown" }, { ...product, unit: "kg" }]) {
    assert.equal(preparePurchaseConversions(normalized, raw, { nomenclature: [changed] }).ok, false);
  }
  const invalid = { ...raw, items: [{ ...raw.items[0], category: "products", kind: "stock" }] };
  assert.equal(preparePurchaseConversions(normalizePurchaseDocument(invalid, invalid.id), invalid,
    { nomenclature: [{ ...product, kind: "service" }] }).ok, false, "Request cannot promote a persisted service to stock");
});

test("actual authenticated nomenclature GET projects persisted stock-other without writing or leaking other venues", async () => {
  const store = createRequire(import.meta.url)("../scripts/purchase-units-qa-store.cjs")();
  try {
    const before = store.reload();
    let allowed = true, reads = 0;
    const dependencies = {
      authenticateRequest: async () => ({ id: 7, venueId: 401 }),
      unauthorized: () => new Response(null, { status: 401 }),
      hasPermission: () => allowed,
      ASSORTMENT_STORE_KEY: "bd_assortment_v1",
      domainData: { accountId: "account_id", storeKey: "store_key" },
      eq: (column: string, value: unknown) => ({ column, value }),
      and: (...conditions: unknown[]) => conditions,
      queryCanonicalNomenclature,
      observedAwait,
      getDb: () => ({ select: () => ({ from: () => ({ where: (conditions: unknown[]) => {
        assert.deepEqual(conditions, [{ column: "account_id", value: 7 }, { column: "store_key", value: "bd_assortment_v1" }]);
        return { limit: async () => {
          reads++;
          const persisted = store.reload().assortment;
          return [{ dataJson: JSON.stringify({ ...persisted, nomenclature: [...persisted.nomenclature,
            { ...persisted.nomenclature[0], id: "foreign", key: "foreign", productKey: "foreign", venueId: 402 }] }) }];
        } };
      } }) }) }),
    };
    const source = readFileSync("app/api/tech-cards/nomenclature/route.ts", "utf8");
    const body = stripTypeScriptTypes(source.replace(/^import[\s\S]*?from "[^"]+";\r?\n/gm, ""))
      .replace("export async function GET", "async function GET");
    const get = new Function("dependencies", "const {" + Object.keys(dependencies).join(",")
      + "}=dependencies;\n" + body + "\nreturn GET;")(dependencies) as (request: Request) => Promise<Response>;
    for (let reload = 0; reload < 2; reload++) {
      const response = await get(new Request("https://example.test/api/tech-cards/nomenclature?q=Спрайт&limit=12"));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      const result = await response.json() as ReturnType<typeof queryCanonicalNomenclature> & { venueId: number };
      assert.equal(result.venueId, 401);
      assert.deepEqual(result.items, store.select("Спрайт").items);
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].purchaseCategory, "products");
    }
    allowed = false;
    assert.equal((await get(new Request("https://example.test/api/tech-cards/nomenclature?q=Спрайт"))).status, 403);
    assert.equal(reads, 2);
    assert.deepEqual(store.reload(), before);
  } finally { store.close(); }
});

test("manual auto row becomes stock only through explicit nomenclature selection, then persists canonical receipt", () => {
  const store = createRequire(import.meta.url)("../scripts/purchase-units-qa-store.cjs")();
  try {
    const api = runtime();
    let line: Row = { id: "line", name: "Invoice name", category: "auto", quantity: 6, unit: "pcs", unitPrice: 200,
      lineTotal: 1200, packageContent: { quantity: 0.7, unit: "l" }, mappingCandidates: [store.products[1]] };
    const render = () => api.render({ line, onChange: (patch) => { line = { ...line, ...patch }; } });
    assert.equal(all(render()).some((e) => e.props["data-bd-purchase-units"]), false);
    const mapping = api.mapping({ line, onSelect: (patch) => { line = { ...line, ...patch }; } });
    const suggestion = all(mapping).find((e) => e.type === "button" && all(e).some((child) => child.props.children === "Phase 4 whisky"));
    assert.ok(suggestion, "Unresolved row must offer the real nomenclature selection action");
    (suggestion.props.onClick as () => void)();
    assert.equal(line.category, "alcohol");
    assert.equal(line.purchaseProductKey, "qa-liquid");
    assert.equal(line.name, "Invoice name", "Explicit ID mapping must not depend on display name");
    assert.equal(all(render()).some((e) => e.props["data-bd-purchase-units"] === "v421"), true);
    store.confirm({ id: "purchase", venueId: 401, date: "2026-09-08", currency: "RUB", total: 1200, items: [line] });
    const saved = store.reload();
    assert.equal(saved.documents[0].items[0].purchaseConversion.canonicalQuantity, 4.2);
    assert.equal(saved.documents[0].items[0].purchaseConversion.canonicalUnit, "l");
    assert.equal(saved.stockMovements.length, 1);
    assert.equal(saved.stockMovements[0].amount, 4.2);
    assert.equal(saved.stockMovements[0].costAmount, 1200);
    assert.equal(saved.assortment.stockBalances[0].current, 4.2);
    assert.deepEqual(store.reload(), saved);
    line = { ...line, category: "services" };
    assert.equal(all(render()).some((e) => e.props["data-bd-purchase-units"]), false, "Services must not gain inventory controls");
  } finally { store.close(); }
});

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
