import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { openingRuntime } from "./helpers/opening-runtime";
import * as counts from "../lib/bardoctor/inventory-counts";
import * as shifts from "../lib/bardoctor/shift-close-write-offs";
import * as writeOffs from "../lib/bardoctor/write-offs";
import * as purchases from "../lib/bardoctor/purchases";
import * as sales from "../lib/bardoctor/sales-consumption";
import * as imports from "../lib/bardoctor/sales-import-identity";

type Row = Record<string, unknown>;
const record = (value: unknown) => value as Row;
const closing = (monthKey: string) => ({ id: `qa-${monthKey}`, monthKey, status: "closed" });
function runtime() {
  const r = openingRuntime();
  const load = (name: string, dependencies: Row) => r.loadRoute(new URL(`../app/api/${name}/route.ts`, import.meta.url), dependencies);
  const api = {
    count: load("inventory/counts", counts), shift: load("shifts/close", { ...shifts, ...writeOffs, ...purchases }),
    writeOff: load("write-offs", { ...writeOffs, ...purchases }), batch: load("sales-batches", sales),
    import: load("sales-batches/import", { ...sales, ...imports, XLSX }),
  };
  const bean = { id: "qa-pcs", productKey: "qa-pcs", key: "qa-pcs", name: "QA pieces", venueId: 1, current: 10, unit: "pcs", currency: "MDL", active: true, kind: "stock" };
  r.put("bd_assortment_v1", { menuItems: [], recipes: [], nomenclature: [bean], stockBalances: [bean] });
  r.put("bd_stock_movements", [{ id: "qa-receipt", type: "receipt", date: "2026-08-01", amount: 10, unit: "pcs", unitCost: 10, costAmount: 100, currency: "MDL", productKey: "qa-pcs", venueId: 1, status: "active", sourceDocumentId: "qa-receipt", sourceLineId: "qa-line", createdAt: "2026-08-01T10:00:00Z" }]);
  for (const key of ["bd_month_closings", "bd_inventory_snapshots", "bd_finance_revenue", "bd_finance_expenses", writeOffs.WRITE_OFF_STORE_KEY, sales.SALES_BATCH_STORE_KEY]) r.put(key, []);
  const bytes = () => JSON.stringify({ domain: r.sqlite.prepare("SELECT * FROM domain_data ORDER BY store_key").all(), audit: r.sqlite.prepare("SELECT rowid,* FROM audit_log ORDER BY rowid").all() });
  const post = async (name: keyof typeof api, body: unknown) => {
    const response = await api[name].POST(new Request("https://qa.invalid/api/phase7-test", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Venue-Id": "1" }, body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() as Row };
  };
  const reject = async (name: keyof typeof api, body: unknown) => {
    const before = bytes(), batches = r.batches();
    for (let i = 0; i < 2; i++) {
      const result = await post(name, body);
      assert.equal(result.status, 423, JSON.stringify(result.body)); assert.equal(result.body.code, "MONTH_LOCKED");
      assert.equal(bytes(), before); assert.equal(r.batches(), batches);
    }
  };
  return { ...r, api, post, reject, bytes };
}

test("legacy shift close cannot move existing closed revenue via a new close key", async () => {
  const r = runtime();
  try {
    const body = { shiftCloseId: "qa-close", shiftId: "qa-shift", venueId: 1, revenueRecord: { id: "qa-shift", date: "2026-08-05", revenue: 100, receipts: 1, currency: "MDL" }, writeOffItems: [] };
    assert.equal((await r.post("shift", body)).status, 201);
    r.put("bd_month_closings", [closing("2026-08")]);
    await r.reject("shift", { ...body, shiftCloseId: "qa-other-close", revenueRecord: { ...body.revenueRecord, date: "2026-09-05", revenue: 200 } });
  } finally { r.close(); }
});

test("closed count create, legacy finalize, save, review, cancel, delete and finalize preserve every byte", async () => {
  const r = runtime();
  try {
    const body = { action: "create", date: "2026-08-05", scope: { type: "all" }, items: [{ productKey: "qa-pcs", actual: 9 }] };
    const created = await r.post("count", body); assert.equal(created.status, 201);
    const id = record(created.body.inventory).id;
    r.put("bd_month_closings", [closing("2026-08")]);
    await r.reject("count", body);
    await r.reject("count", { snapshot: { id: "qa-legacy", date: "2026-08-05", items: body.items } });
    for (const action of ["save", "review", "cancel", "delete", "finalize"]) await r.reject("count", { action, id, items: body.items });
  } finally { r.close(); }
});

test("open legacy count finalizes in one atomic batch and unknown actual rejection writes nothing", async () => {
  const r = runtime();
  try {
    const before = r.bytes(), batches = r.batches();
    const invalid = await r.post("count", { snapshot: { id: "qa-incomplete", date: "2026-08-05", items: [{ productKey: "qa-pcs", actual: null }] } });
    assert.equal(invalid.status, 422); assert.equal(r.bytes(), before); assert.equal(r.batches(), batches);
    const result = await r.post("count", { snapshot: { id: "qa-legacy", date: "2026-08-05", items: [{ productKey: "qa-pcs", actual: 9 }] } });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(record(result.body.inventory).status, "completed"); assert.equal(r.batches(), batches + 1);
    assert.equal((r.get("bd_inventory_snapshots") as Row[]).length, 1);
    assert.equal((r.get("bd_stock_movements") as Row[]).filter(row => row.type === "inventory_adjustment").length, 1);
  } finally { r.close(); }
});

test("write-off draft cannot leave or enter a closed period and cannot be deleted or posted there", async () => {
  const r = runtime();
  try {
    const document = { id: "qa-writeoff", date: "2026-08-05", reasonCode: "spoilage", items: [{ productKey: "qa-pcs", quantity: 1, unit: "шт" }] };
    const saved = await r.post("writeOff", { action: "save_draft", document }); assert.equal(saved.status, 201, JSON.stringify(saved.body));
    r.put("bd_month_closings", [closing("2026-08")]);
    await r.reject("writeOff", { action: "save_draft", document: { ...document, date: "2026-09-05" } });
    await r.reject("writeOff", { action: "post", document: { ...document, date: "2026-09-05" } });
    await r.reject("writeOff", { action: "delete_draft", id: document.id });
    r.put("bd_month_closings", [closing("2026-09")]);
    await r.reject("writeOff", { action: "save_draft", document: { ...document, date: "2026-09-05" } });
  } finally { r.close(); }
});

test("write-off cancellation checks the current reversal period as well as original period", async () => {
  const r = runtime();
  try {
    const created = await r.post("writeOff", { action: "post", document: { id: "qa-posted", date: "2026-08-05", reasonCode: "spoilage", items: [{ productKey: "qa-pcs", quantity: 1, unit: "шт" }] } });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    for (const month of ["2026-08", new Date().toISOString().slice(0, 7)]) {
      r.put("bd_month_closings", [closing(month)]);
      await r.reject("writeOff", { action: "cancel", id: "qa-posted" });
    }
  } finally { r.close(); }
});

test("completed write-off cancellation remains idempotent after its reversal period closes", async () => {
  const r = runtime();
  try {
    const posted = await r.post("writeOff", { action: "post", document: { id: "qa-cancelled", date: "2026-08-05", reasonCode: "spoilage", items: [{ productKey: "qa-pcs", quantity: 1, unit: "шт" }] } });
    assert.equal(posted.status, 201);
    assert.equal((await r.post("writeOff", { action: "cancel", id: "qa-cancelled" })).status, 200);
    r.put("bd_month_closings", [closing(new Date().toISOString().slice(0, 7))]);
    const before = r.bytes();
    const retry = await r.post("writeOff", { action: "cancel", id: "qa-cancelled" });
    assert.equal(retry.status, 200); assert.equal(retry.body.idempotent, true); assert.equal(r.bytes(), before);
  } finally { r.close(); }
});

test("sales draft save/import/cancel respects original and target businessDate", async () => {
  const r = runtime();
  try {
    const draft = { businessDate: "2026-08-05", lines: [{ rawName: "QA unresolved", quantity: 1 }] };
    const saved = await r.post("batch", { action: "save", draft }); assert.equal(saved.status, 201, JSON.stringify(saved.body));
    const id = record(saved.body.batch).id;
    r.put("bd_month_closings", [closing("2026-08")]);
    await r.reject("batch", { action: "save", id, draft: { ...draft, businessDate: "2026-09-05" } });
    await r.reject("batch", { action: "cancel", id });
    await r.reject("batch", { action: "import_text", text: "QA unresolved 1", businessDate: "2026-08-05" });
    r.put("bd_month_closings", [closing("2026-09")]);
    await r.reject("batch", { action: "save", id, draft: { ...draft, businessDate: "2026-09-05" } });
  } finally { r.close(); }
});

test("CSV sales import cannot write a draft or audit in a closed period", async () => {
  const r = runtime();
  try {
    r.put("bd_month_closings", [closing("2026-08")]);
    const before = r.bytes();
    for (let i = 0; i < 2; i++) {
      const form = new FormData(); form.set("file", new File(["Name,Quantity\nQA item,1\n"], "qa.csv", { type: "text/csv" }));
      form.set("businessDate", "2026-08-05"); form.set("nameColumn", "0"); form.set("quantityColumn", "1"); form.set("headerRow", "0");
      const result = await r.api.import.POST(new Request("https://qa.invalid/api/sales-batches/import", { method: "POST", headers: { "X-Venue-Id": "1" }, body: form }));
      const body = await result.json() as Row; assert.equal(result.status, 423, JSON.stringify(body)); assert.equal(body.code, "MONTH_LOCKED"); assert.equal(r.bytes(), before);
    }
  } finally { r.close(); }
});
