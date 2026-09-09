import test from "node:test";
import assert from "node:assert/strict";
import { openingRuntime } from "./helpers/opening-runtime";
import { parseOnboardingCsv } from "../lib/bardoctor/onboarding-csv";
import type { OpeningDocument } from "../lib/bardoctor/opening-stock";
import type { CanonicalTaxonomy } from "../lib/bardoctor/nomenclature-taxonomy";
type ApiBody = { taxonomy: CanonicalTaxonomy; document: OpeningDocument; documents: OpeningDocument[]; code: string };
const body = async (response: Response) => await response.json() as ApiBody;

const request = (body?: unknown, venue = 1) => new Request("https://example.test/api/inventory/opening", { method: body ? "POST" : "GET", headers: { "X-Venue-Id": String(venue), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
const taxonomy = { version: "v336", sections: [{ id: "bar", name: "Бар", order: 1, active: true }], categories: [{ id: "drinks", name: "Напитки", parentId: "bar", order: 1, active: true }], subcategories: [], locations: [] };
const command = { action: "confirm", id: "opening-http-001", venueId: 1, inputs: [{ rowId: "r1", name: "Вода", stockUnit: "pcs", sectionId: "bar", taxonomyCategoryId: "drinks", quantity: 12, unit: "pcs" }], selectedRowIds: ["r1"] };
test("actual HTTP preview -> SQLite atomic confirm -> GET reload -> duplicate; no receipt", async () => {
  const runtime = openingRuntime();
  try {
    runtime.put("bd_assortment_v1", { nomenclatureTaxonomy: taxonomy });
    const info = await body(await runtime.api.GET(request()));
    // Use the actual projected taxonomy, avoiding a fixture-only taxonomy contract.
    const section = info.taxonomy.sections.find(v => v.active); assert.ok(section);
    const category = info.taxonomy.categories.find(v => v.active && v.parentId === section.id); assert.ok(category);
    const cmd = structuredClone(command); cmd.inputs[0].sectionId = section.id; cmd.inputs[0].taxonomyCategoryId = category.id;
    assert.equal((await runtime.api.POST(request({ ...cmd, action: "preview" }))).status, 200);
    assert.equal(runtime.batches(), 0);
    const response = await runtime.api.POST(request(cmd)); assert.equal(response.status, 201, await response.clone().text());
    const result = await body(response); assert.equal(result.document.items[0].quantity, 12);
    assert.equal((await runtime.api.POST(request(cmd))).status, 200); assert.equal(runtime.batches(), 1);
    const reloaded = await body(await runtime.api.GET(request())); assert.deepEqual(reloaded.documents, [result.document]);
    assert.equal(runtime.get("bd_purchase_documents"), null);
    assert.equal((runtime.get("bd_stock_movements") as {type: string}[])[0].type, "opening_balance");
    assert.equal((await body(await runtime.api.GET(request(undefined, 2)))).documents.length, 0);
  } finally { runtime.close(); }
});
test("HTTP unauthorized, stale venue, missing assortment with history fail without writes", async () => {
  const r = openingRuntime();
  try {
    r.setSignedIn(false); assert.equal((await r.api.POST(request(command))).status, 401); r.setSignedIn(true);
    r.setAllowed(false); assert.equal((await r.api.POST(request(command))).status, 403); r.setAllowed(true);
    assert.equal((await r.api.POST(request(command, 2))).status, 409);
    r.put("bd_purchase_documents", [{ id: "historical" }]);
    const response = await r.api.POST(request(command)); assert.equal((await body(response)).code, "OPENING_STORE_NEEDS_REVIEW");
    assert.equal(r.batches(), 0); assert.equal(r.get("bd_assortment_v1"), null);
  } finally { r.close(); }
});
test("actual CAS retries concurrent change and rolls back entire D1 batch on failure", async () => {
  const r = openingRuntime();
  try {
    const info = await body(await r.api.GET(request()));
    const section = info.taxonomy.sections.find(v => v.active); assert.ok(section);
    const category = info.taxonomy.categories.find(v => v.active && v.parentId === section.id); assert.ok(category);
    const cmd = structuredClone(command); cmd.inputs[0].sectionId = section.id; cmd.inputs[0].taxonomyCategoryId = category.id;
    r.beforeBatch(() => r.put("bd_assortment_v1", { preservedConcurrentField: "keep" }));
    const response = await r.api.POST(request(cmd)); assert.equal(response.status, 201, await response.clone().text());
    assert.equal(r.batches(), 2); assert.equal((r.get("bd_assortment_v1") as {preservedConcurrentField: string}).preservedConcurrentField, "keep");
    const before = r.get("bd_assortment_v1"), beforeDocs = r.get("bd_opening_stock_v1");
    r.failAt(2);
    await assert.rejects(r.api.POST(request({ ...cmd, id: "opening-http-002", inputs: [{ ...cmd.inputs[0], name: "Другой" }] })), /SIMULATED_D1_WRITE_FAILURE/);
    assert.deepEqual(r.get("bd_assortment_v1"), before); assert.deepEqual(r.get("bd_opening_stock_v1"), beforeDocs);
  } finally { r.close(); }
});
test("retained confirmed purchase prevents a false clean start even if old movements are absent", async () => {
  const r = openingRuntime();
  try {
    const product = { id: "existing", productKey: "existing", venueId: 1, name: "Existing", kind: "stock", unit: "pcs", active: true, current: 0 };
    r.put("bd_assortment_v1", { nomenclature: [product], stockBalances: [product] });
    r.put("bd_purchase_documents", [{ id: "old", status: "confirmed", venueId: 1, items: [{ purchaseProductKey: "existing" }] }]);
    const result = await r.api.POST(request({ ...command, inputs: [{ rowId: "r1", productKey: "existing", quantity: 1, unit: "pcs" }] }));
    assert.equal(result.status, 422); assert.equal((await body(result)).code, "OPENING_NEEDS_REVIEW"); assert.equal(r.batches(), 0);
  } finally { r.close(); }
});
test("CSV preserves quoted names and decimal commas; rejects formula, ambiguous or excessive input", () => {
  assert.deepEqual(parseOnboardingCsv('name;quantity;unit\r\n"Вода; газ";0,5;l').rows, [["Вода; газ", "0,5", "l"]]);
  for (const bad of ['name,name\nx,y', 'name\n=SUM(A1)', 'name,unit\nx', 'name\n"unterminated', 'name\n' + 'x\n'.repeat(501)]) assert.throws(() => parseOnboardingCsv(bad));
});
