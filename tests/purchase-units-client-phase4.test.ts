import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { canonicalStockUnit, normalizePurchaseQuantity } from "../lib/bardoctor/stock-units";
import { normalizePurchaseDocument, PURCHASE_STORE_KEY } from "../lib/bardoctor/purchases";
import { preparePurchaseConversions } from "../lib/bardoctor/purchase-conversion";
import { applyPurchaseToInventory, inventoryPackageAmount } from "../lib/bardoctor/inventory";
import { queryCanonicalNomenclature } from "../lib/bardoctor/nomenclature-selector";
import { observedAwait } from "../lib/bardoctor/request-observability";

import { openingRuntime } from "./helpers/opening-runtime";
import { manualReferencePrice } from "../lib/bardoctor/manual-reference-price";
import * as nomenclatureIdentity from "../lib/bardoctor/nomenclature-identity";
import { changedConsumptionModeIssues } from "../lib/bardoctor/consumption-mode";
type Element = { type: string; props: Record<string, unknown> };
type Row = Record<string, unknown>;
function runtime(openQuickCreate = false) {
  const source = readFileSync("public/assets/index-BQGspy0I.js", "utf8");
  const start = source.indexOf("/* purchase-units-v421:start */");
  const end = source.indexOf("/* purchase-units-v421:end */", start);
  assert.ok(start >= 0 && end > start);
  const jsx = (type: string, props: Row): Element => ({ type, props });
  const mapping = source.slice(source.indexOf("function bdInvoiceLineMappingV356"), source.indexOf("function bdInvoiceReviewPriorityV4"));
  return runInNewContext(source.slice(start, end) + mapping + ";({render:bdPurchaseUnitsV421,preview:bdPurchasePreviewV421,mapping:bdInvoiceLineMappingV356})", {
    S: { useState: (value: unknown) => [value === false && openQuickCreate ? true : value, () => {}], useEffect: () => {} },
    bdNomenclatureQuickCreateV336: "quick-create",
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

test("Native new receipt quick-create callback exposes canonical stock controls without a manual category workaround", () => {
  const api = runtime(true);
  let line: Row = { id: "quick-auto", name: "TEST new liquid", rawName: "TEST new liquid", category: "auto",
    quantity: 2, unit: "l", packageSize: "1 шт.", unitPrice: 25, lineTotal: 50 };
  const compact = { id: "new-liquid", key: "stock:test new liquid|ml", name: "TEST new liquid", unit: "l", baseUnit: "l", packageSize: "1 l", archived: false };
  const product = { ...compact, productKey: compact.key, kind: "stock", category: "products", venueId: 1 };
  const tree = api.mapping({ line, onSelect: patch => { line = { ...line, ...patch }; } });
  const quick = all(tree).find(element => element.type === "quick-create");
  assert.ok(quick);
  (quick.props.onCreated as (compact: Row, product: Row) => void)(compact, product);
  assert.equal(line.category, "products"); assert.equal(line.purchaseProductKey, compact.key);
  assert.equal(line.nomenclatureId, compact.id); assert.equal(line.mappingSource, "manual");
  assert.equal(line.packageSize, "1 шт.", "Preserve the invoice input while sanitizing only canonical metadata");
  const rendered = api.render({ line, onChange: patch => { line = { ...line, ...patch }; } });
  assert.equal(all(rendered).some(element => element.props["data-bd-purchase-units"] === "v421"), true);
  assert.equal(api.preview(line).snapshot.canonicalQuantity, 2);
});

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

function nomenclatureCardRuntime(product: Row, assortment: Row, post: (request: Request) => Promise<Response>, warehouse = false, movements: Row[] = []) {
  const source = readFileSync("public/assets/index-BQGspy0I.js", "utf8");
  const units = source.slice(source.indexOf("/* purchase-units-v421:start */"), source.indexOf("/* purchase-units-v421:end */"));
  const initialStart = source.indexOf("function bdNomenclatureInitialFormV213(");
  const initial = warehouse ? "" : source.slice(initialStart, source.indexOf("\nfunction ", initialStart + 1));
  const cardStart = source.indexOf("function bdNomenclatureInitialFormV237(");
  const definition = (name: string) => {
    const start = source.indexOf("function " + name + "(");
    const end = source.indexOf("\nfunction ", start + 1);
    assert.ok(start >= 0 && end > start, name);
    return source.slice(start, end);
  };
  const card = warehouse ? ["bdWarehouseUnit", "bdWarehouseDecimal", "bdWarehouseEffectiveDisplayUnit", "bdWarehouseDisplayAmount", "bdWarehouseDisplayPreferenceLabel", "bdWarehouseProductSheet"].map(definition).join("\n")
    : source.slice(cardStart, source.indexOf("\nbdNomenclatureSheet=", cardStart));
  assert.ok(initialStart >= 0 && cardStart >= 0 && card.length > 1000);
  const tree = { sections: [{ id: "kitchen", name: "Kitchen" }],
    categories: [{ id: "food", name: "Food", parentId: "kitchen" }],
    subcategories: [{ id: "grocery", name: "Grocery", parentId: "food" }], locations: [] };
  const hooks: unknown[] = [];
  let cursor = 0;
  let saved: Row | undefined;
  const requests: Row[] = [];
  const jsx = (type: string, props: Row): Element => ({ type, props });
  const api = runInNewContext(units + initial + card + (warehouse ? ";({render:bdWarehouseProductSheet,amount:bdWarehouseDisplayAmount})" : ";({render:bdNomenclatureSheetV237})"), {
    i: { jsx, jsxs: jsx }, structuredClone, Error,
    S: { useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (next: unknown) => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; }];
    } },
    bdWarehouseKey: (value: Row) => String(value?.productKey ?? value?.key ?? ""),
    bdNomenclatureTree: () => tree, bdWarehouseRecord: (value: unknown) => value ?? {},
    bdCatArray: (value: unknown) => Array.isArray(value) ? value : [], bdWarehouseNumber: Number,
    W: { div: "div", section: "section" }, sn: () => ({ toast: () => {} }), sg: String,
    bdWarehouseMoney: (value: unknown) => String(value ?? 0),
    window: { confirm: () => { throw new Error("No archive/delete allowed in unit-preservation checks"); } },
    bdServiceExpenseOptionsV359: () => [], bdSectionPathLabelV365: (_: unknown, item: Row) => item?.name ?? "",
    bdPurchaseTypeLabelV362: () => "Products", bdNomenclatureSaveHintV362: () => "", ca: () => ({ "X-Venue-Id": "1" }), Ot: () => null,
    fetch: async (url: string, options: RequestInit) => {
      assert.equal(url, "/api/inventory/products");
      requests.push(JSON.parse(String(options.body)) as Row);
      return post(new Request("http://localhost" + url, options));
    },
  }) as { render: (props: Row) => Element; amount?: (product: Row, quantity: number) => string };
  const render = () => { cursor = 0; return api.render({ product, assortment, movements, canEdit: true,
    onClose: () => {}, onSaved: (result: Row) => { saved = result; } }); };
  const control = (label: string, kind: "input" | "select") => {
    const parent = all(render()).find(element => element.type === "label"
      && all(element).some(child => child.type === "span" && child.props.children === label));
    const element = all(parent).find(child => child.type === kind);
    assert.ok(element, `Missing ${kind}: ${label}`);
    return element;
  };
  const initialTree = render();
  if (warehouse) {
    const edit = all(initialTree).find(element => element.type === "button" && element.props.children === "Редактировать");
    assert.ok(edit);
    (edit.props.onClick as () => void)();
  }
  return { render, control, requests, initialTree, amount: api.amount, result: () => saved,
    change(label: string, kind: "input" | "select", value: string) {
      (control(label, kind).props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
    },
    async save() {
      const button = all(render()).find(element => element.type === "button" && element.props.children === "Сохранить");
      assert.ok(button);
      assert.equal(button.props.disabled, false, "A metadata-only rename must remain saveable");
      await (button.props.onClick as () => Promise<void>)();
      assert.ok(saved, "Real product update must succeed; card errors: " + JSON.stringify(all(render()).filter(element => element.props.className === "bd-inventory-error").map(element => element.props.children)));
    },
  };
}

for (const scenario of [
  { unit: "kg", displayUnit: "kg", packageSize: "1 г", packageAmount: 0.001, current: 1.09, type: "Вес", display: "g", displayed: "1\u00a0090 г", packaged: "1\u00a0090 шт." },
  { unit: "l", displayUnit: "l", packageSize: "0,7 л", packageAmount: 0.7, current: 4.2, type: "Жидкость", display: "ml", displayed: "4\u00a0200 мл", packaged: "6 шт." },
  { unit: "pcs", displayUnit: "pcs", packageSize: "1 шт.", packageAmount: 1, current: 12, type: "Поштучно", display: "pcs", displayed: "12 шт.", packaged: "12 шт." },
  { unit: "g", displayUnit: "kg", packageSize: "1 кг", packageAmount: 1000, current: 2000, type: "Вес", display: "kg", displayed: "2 кг", packaged: "2 шт." },
  { unit: "ml", displayUnit: "l", packageSize: "0,5 л", packageAmount: 500, current: 1000, type: "Жидкость", display: "l", displayed: "1 л", packaged: "2 шт." },
  { unit: "kg", displayUnit: "kg", packageSize: "1 кг", packageAmount: 1, current: 0, type: "Вес", display: "kg", displayed: "0 кг", packaged: "0 шт." },
]) {
  test(`warehouse card ${scenario.unit}/${scenario.current}: actual save, reload and display keep physical units and immutable movements`, async () => {
    const r = openingRuntime();
    const products = r.loadRoute(new URL("../app/api/inventory/products/route.ts", import.meta.url), {
      canonicalStockUnit, manualReferencePrice, PURCHASE_STORE_KEY, ...nomenclatureIdentity, changedConsumptionModeIssues,
    });
    try {
      const product: Row = { id: "warehouse-card", key: "warehouse-card", productKey: "warehouse-card", name: "Warehouse TEST", venueId: 1,
        kind: "stock", itemType: "ingredient", category: "products", active: true, currency: "MDL", onOrder: 0,
        unit: scenario.unit, displayUnit: scenario.displayUnit, packageSize: scenario.packageSize, packageAmount: scenario.packageAmount, current: scenario.current,
        ...(["kg", "l", "pcs"].includes(scenario.unit) ? { unitModelVersion: 4 } : {}),
      };
      const movements = [{ id: "prior-warehouse-movement", venueId: 1, type: "receipt", status: "active", productKey: product.productKey,
        unit: scenario.unit, amount: scenario.current, costAmount: 100, currency: "MDL", sourceDocumentId: "prior", sourceLineId: "line", date: "2026-09-08" }];
      r.put("bd_assortment_v1", { nomenclature: [product], stockBalances: [product], recipes: [], menuItems: [] });
      r.put("bd_stock_movements", movements);
      const before = r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key='bd_stock_movements'").get();
      const open = () => {
        const assortment = r.get("bd_assortment_v1") as Row;
        return nomenclatureCardRuntime((assortment.nomenclature as Row[])[0], assortment, products.POST, true, movements);
      };
      const card = open();
      assert.ok(all(card.initialTree).some(element => element.type === "dd" && element.props.children === scenario.type));
      const base = card.control("Тип складского учёта", "select");
      assert.equal(base.props.value, scenario.unit);
      assert.equal(base.props.disabled, true, "Prior movements lock the base unit even at zero stock");
      assert.ok(all(base).some(option => option.type === "option" && option.props.value === scenario.unit));
      card.change("Название товара", "input", "Warehouse TEST renamed");
      await card.save();
      assert.equal(card.requests[0].unit, scenario.unit);
      for (const key of ["nomenclature", "stockBalances"]) {
        const item = (r.get("bd_assortment_v1") as Record<string, Row[]>)[key][0];
        for (const field of ["unit", "unitModelVersion", "current", "packageSize", "packageAmount", "displayUnit"]) assert.equal(item[field], product[field], `${key}.${field}`);
        assert.equal(item.name, "Warehouse TEST renamed");
      }
      const reopened = open();
      assert.equal(reopened.control("Тип складского учёта", "select").props.value, scenario.unit);
      reopened.change("Показывать остаток", "select", scenario.display);
      await reopened.save();
      const measure = (r.get("bd_assortment_v1") as Record<string, Row[]>).nomenclature[0];
      assert.equal(reopened.amount!(measure, scenario.current), scenario.displayed);
      const packaged = open();
      packaged.change("Показывать остаток", "select", "pcs");
      await packaged.save();
      const stored = (r.get("bd_assortment_v1") as Record<string, Row[]>).nomenclature[0];
      assert.equal(packaged.amount!(stored, scenario.current), scenario.packaged);
      assert.equal(stored.unit, scenario.unit);
      assert.equal(stored.current, scenario.current);
      assert.deepEqual(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key='bd_stock_movements'").get(), before);
    } finally { r.close(); }
  });
}

for (const unit of ["kg", "l"]) {
  test(`empty warehouse card ${unit}: explicit unit selection resets only draft package defaults`, () => {
    const product = { productKey: "empty", name: "Empty TEST", unit: "pcs", packageSize: "1 шт.", current: 0 };
    const card = nomenclatureCardRuntime(product, {}, async () => { throw new Error("Draft edit must not save"); }, true);
    assert.equal(card.control("Тип складского учёта", "select").props.disabled, false);
    card.change("Тип складского учёта", "select", unit);
    const amount = inventoryPackageAmount(card.control("Фасовка прихода", "input").props.value, unit, unit);
    assert.equal(amount.unit, unit);
    assert.equal(amount.amount, 1);
    assert.equal(card.requests.length, 0);
  });
}

for (const scenario of [
  { unit: "kg", displayUnit: "kg", packageSize: "1 кг", amount: 1.09, measure: "килограммах", displayOptions: ["kg", "g", "pcs"] },
  { unit: "l", displayUnit: "l", packageSize: "1 л", amount: 2.5, measure: "литрах", displayOptions: ["l", "ml", "pcs"] },
  { unit: "pcs", displayUnit: "pcs", packageSize: "1 шт.", amount: 12, measure: "штуках", displayOptions: ["pcs"] },
  { unit: "g", displayUnit: "kg", packageSize: "1 кг", amount: 1090, measure: "килограммах", displayOptions: ["kg", "g", "pcs"] },
  { unit: "ml", displayUnit: "l", packageSize: "1 л", amount: 2500, measure: "литрах", displayOptions: ["l", "ml", "pcs"] },
]) {
  test(`Phase 6 real nomenclature card ${scenario.unit}: rename, API save and reload preserve units, packages, stock and movements`, async () => {
    const r = openingRuntime();
    const products = r.loadRoute(new URL("../app/api/inventory/products/route.ts", import.meta.url), {
      canonicalStockUnit, manualReferencePrice, PURCHASE_STORE_KEY, ...nomenclatureIdentity, changedConsumptionModeIssues,
    });
    try {
      const product: Row = { id: `card-${scenario.unit}`, key: `card-${scenario.unit}`, productKey: `card-${scenario.unit}`,
        name: "TEST card", venueId: 1, kind: "stock", itemType: "ingredient", category: "products",
        unit: scenario.unit, displayUnit: scenario.displayUnit, packageSize: scenario.packageSize,
        packageAmount: ["g", "ml"].includes(scenario.unit) ? 1000 : 1, purchaseMode: "document",
        current: scenario.amount, onOrder: 0, currency: "MDL", active: true,
        sectionId: "kitchen", taxonomyCategoryId: "food", subcategoryId: "grocery",
        ...(["kg", "l", "pcs"].includes(scenario.unit) ? { unitModelVersion: 4 } : {}),
      };
      const movements = [{ id: `receipt-${scenario.unit}`, type: "receipt", status: "active", venueId: 1,
        sourceDocumentId: "prior-receipt", sourceLineId: "line", productKey: product.productKey,
        productName: product.name, amount: scenario.amount, unit: scenario.unit, costAmount: 100, currency: "MDL",
        date: "2026-09-08", createdAt: "2026-09-08T12:00:00.000Z" }];
      r.put("bd_assortment_v1", { nomenclature: [product], stockBalances: [product], recipes: [], menuItems: [] });
      r.put("bd_stock_movements", movements);
      const beforeMovements = r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key='bd_stock_movements'").get();
      const persisted = r.get("bd_assortment_v1") as Row;
      const card = nomenclatureCardRuntime((persisted.nomenclature as Row[])[0], persisted, products.POST);
      const base = card.control("Склад считает в", "select");
      assert.equal(base.props.value, scenario.unit, "Opening the card must not coerce kg/l or legacy g/ml into pcs");
      assert.ok(all(base).some(option => option.type === "option" && option.props.value === scenario.unit), "Persisted base unit must exist in select options");
      const display = card.control("Показывать остаток", "select");
      assert.equal(display.props.value, scenario.displayUnit);
      for (const value of scenario.displayOptions) assert.ok(all(display).some(option => option.type === "option" && option.props.value === value), `Missing compatible display unit ${value}`);
      const intake = card.control("Приходовать в", "select");
      assert.equal(all(intake).find(option => option.type === "option" && option.props.value === "measure")?.props.children, "В " + scenario.measure);
      card.change("Название", "input", "TEST card renamed");
      await card.save();
      assert.equal(card.requests.length, 1);
      assert.equal(card.requests[0].unit, scenario.unit);
      assert.equal(card.requests[0].packageSize, scenario.packageSize);
      const after = r.get("bd_assortment_v1") as Row;
      for (const store of ["nomenclature", "stockBalances"]) {
        const item = (after[store] as Row[]).find(item => item.productKey === product.productKey);
        assert.ok(item);
        assert.equal(item.name, "TEST card renamed");
        for (const key of ["unit", "unitModelVersion", "displayUnit", "packageSize", "packageAmount", "current"]) assert.equal(item[key], product[key], `${store}.${key} must remain stable`);
      }
      assert.deepEqual(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key='bd_stock_movements'").get(), beforeMovements);
      const reopened = nomenclatureCardRuntime((after.nomenclature as Row[])[0], after, products.POST);
      assert.equal(reopened.control("Склад считает в", "select").props.value, scenario.unit);
      assert.equal(reopened.control("Основная фасовка", "input").props.value, scenario.packageSize);
      assert.deepEqual(r.get("bd_stock_movements"), movements);
    } finally { r.close(); }
  });
}

for (const unit of ["kg", "l"]) {
  test(`Phase 6 nomenclature ${unit} unit-change handler keeps package defaults in the same physical dimension`, () => {
    const product = { id: "new-card", productKey: "new-card", name: "TEST card", kind: "stock",
      unit: "pcs", displayUnit: "auto", packageSize: "1 шт.", current: 0,
      sectionId: "kitchen", taxonomyCategoryId: "food", subcategoryId: "grocery" };
    const card = nomenclatureCardRuntime(product, { nomenclature: [product], stockBalances: [product] },
      async () => { throw new Error("Unit editing alone must not save metadata"); });
    card.change("Склад считает в", "select", unit);
    assert.equal(card.control("Склад считает в", "select").props.value, unit);
    const packageSize = card.control("Основная фасовка", "input").props.value;
    const converted = inventoryPackageAmount(packageSize, unit, unit);
    assert.equal(converted.unit, unit, `Default ${String(packageSize)} must not turn a measured product into pieces`);
    assert.ok(converted.amount > 0);
    const intake = card.control("Приходовать в", "select");
    assert.equal(all(intake).find(option => option.type === "option" && option.props.value === "measure")?.props.children,
      "В " + (unit === "kg" ? "килограммах" : "литрах"));
    const display = card.control("Показывать остаток", "select");
    assert.ok(all(display).some(option => option.type === "option" && option.props.value === unit));
    assert.equal(card.requests.length, 0);
  });
}

function quickNomenclatureRuntime(unit: string, post: (request: Request) => Promise<Response>, packageSize = "") {
  const source = readFileSync("public/assets/index-BQGspy0I.js", "utf8");
  let code = source.slice(source.indexOf("/* purchase-units-v421:start */"), source.indexOf("/* purchase-units-v421:end */"));
  for (const name of ["bdTaxBaseUnitV336", "bdTaxDisplayUnitV336", "bdNomenclatureQuickCreateV336"]) {
    const start = source.indexOf(`function ${name}(`);
    const end = source.indexOf("\nfunction ", start + 1);
    assert.ok(start >= 0 && end > start);
    code += source.slice(start, end);
  }
  const hooks: unknown[] = [];
  let cursor = 0;
  let created: Row | undefined;
  const requests: Row[] = [];
  const jsx = (type: string, props: Row): Element => ({ type, props });
  const api = runInNewContext(code + ";({render:bdNomenclatureQuickCreateV336})", {
    i: { jsx, jsxs: jsx }, ug: { createPortal: (element: Element) => element }, document: { body: {} },
    S: { useEffect: () => {}, useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (next: unknown) => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; }];
    } },
    Error, structuredClone, ca: () => ({ "X-Venue-Id": "1" }), Ot: () => null, Kse: () => {},
    fetch: async (url: string, options: RequestInit) => {
      assert.equal(url, "/api/inventory/products");
      requests.push(JSON.parse(String(options.body)) as Row);
      return post(new Request("http://localhost" + url, options));
    },
  }) as { render: (props: Row) => Element };
  // Taxonomy is supplied in the prefill. Only asynchronous suggestion loading is
  // omitted; unit initialization, the visible selector, submit, and HTTP save are real.
  const render = () => { cursor = 0; return api.render({ initialName: `TEST quick ${unit}`, context: "receipt",
    prefill: { unit, packageSize, sectionId: "kitchen", taxonomyCategoryId: "food", subcategoryId: "grocery" },
    onClose: () => {}, onCreated: (_: Row, product: Row) => { created = product; } }); };
  const select = all(render()).find(element => element.type === "select" && element.props["aria-label"] === "В чём учитывать остаток?");
  assert.ok(select);
  return { requests, visibleUnit: select.props.value,
    async create() {
      const button = all(render()).find(element => element.type === "button" && element.props.children === "Создать и добавить");
      assert.ok(button);
      assert.equal(button.props.disabled, false);
      await (button.props.onClick as () => Promise<void>)();
      assert.ok(created, "Quick-create must succeed; errors: " + JSON.stringify(all(render()).filter(element => element.props.role === "alert").map(element => element.props.children)));
      return created;
    },
  };
}

const quickCreateCases = ["l", "kg", "pcs", "ml", "g"].flatMap(unit => ["", "1 шт.", "1 pcs"]
  .map(packageSize => ({ unit, packageSize, expectedAmount: ["g", "ml"].includes(unit) ? 0.001 : 1 })));
quickCreateCases.push({ unit: "kg", packageSize: "500 г", expectedAmount: 0.5 },
  { unit: "l", packageSize: "0.7 л", expectedAmount: 0.7 }, { unit: "pcs", packageSize: "12 шт.", expectedAmount: 12 });
for (const { unit, packageSize, expectedAmount } of quickCreateCases) {
  test(`Real invoice quick-create ${unit}/${packageSize || "empty"}: initial prefill survives actual submit and product API persistence without selector changes`, async () => {
    const r = openingRuntime();
    const products = r.loadRoute(new URL("../app/api/inventory/products/route.ts", import.meta.url), {
      canonicalStockUnit, manualReferencePrice, PURCHASE_STORE_KEY, ...nomenclatureIdentity, changedConsumptionModeIssues,
    });
    try {
      r.put("bd_assortment_v1", { nomenclature: [], stockBalances: [], recipes: [], menuItems: [], nomenclatureStructure: {
        sections: [{ id: "kitchen", name: "Kitchen", order: 10, active: true }],
        categories: [{ id: "food", name: "Food", parentId: "kitchen", order: 10, active: true }],
        subcategories: [{ id: "grocery", name: "Grocery", parentId: "food", order: 10, active: true }], locations: [],
      } });
      r.put("bd_stock_movements", []);
      const card = quickNomenclatureRuntime(unit, products.POST, packageSize);
      const created = await card.create();
      assert.equal(card.requests.length, 1);
      const expected = canonicalStockUnit(unit);
      assert.equal(created.unit, expected, "A measured invoice unit must not create a piece-count product");
      assert.equal(card.visibleUnit, expected, "Visible canonical unit must agree with the source physical dimension");
      assert.equal(canonicalStockUnit(card.requests[0].unit), expected);
      assert.equal(created.displayUnit, expected);
      assert.equal(created.unitModelVersion, 4);
      assert.equal(created.current, 0);
      const packageAmount = inventoryPackageAmount(created.packageSize, expected, expected);
      assert.equal(packageAmount.unit, expected);
      assert.equal(created.packageAmount, packageAmount.amount);
      assert.equal(created.packageAmount, expectedAmount);
      const after = r.get("bd_assortment_v1") as Row;
      for (const store of ["nomenclature", "stockBalances"]) {
        assert.equal((after[store] as Row[]).length, 1);
        const persisted = (after[store] as Row[])[0];
        for (const key of ["unit", "displayUnit", "unitModelVersion", "packageSize", "packageAmount", "current"]) assert.equal(persisted[key], created[key]);
      }
      assert.deepEqual(r.get("bd_stock_movements"), []);
    } finally { r.close(); }
  });
}
