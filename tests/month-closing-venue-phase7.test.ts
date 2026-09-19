import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { storeRuntime } from "./helpers/store-runtime";
import { purchaseVenueScopeIssue } from "../lib/bardoctor/purchase-venue-scope";

const key = "bd_month_closings";
test("actual packaged closing hook writes numeric active venue and preserves reopen history", () => {
  const bundle = readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
  const hook = bundle.split("\n").find(line => line.startsWith("function bdUseMonthClosingStore("));
  const resolver = bundle.split("\n").find(line => line.startsWith("function bdMonthlyVenueIdPhase7("));
  assert.ok(hook); assert.ok(resolver);
  for (const venueId of [1, 3293]) {
    let rows: unknown[] = [];
    const context = vm.createContext({ Ai: () => ({ isReady: true }), bdMonthClosingsKey: key,
      bdProcVenueContextV168: () => ({ activeVenueId: venueId }), bdArrayStore: () => rows,
      qr: (store: string, value: unknown[]) => { assert.equal(store, key); rows = value; },
      S: { useState: (init: () => unknown) => [init(), () => {}], useEffect: () => {},
        useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn },
    });
    vm.runInContext(`${resolver}\n${hook}\nglobalThis.hook=bdUseMonthClosingStore;`, context);
    const history = [{ reason: "QA reopen" }];
    context.hook("primary").saveClosing({ monthKey: "2026-08", status: "closed", snapshot: { revenue: 1320 }, reopenHistory: history });
    assert.equal((rows[0] as Record<string, unknown>).venueId, venueId);
    assert.equal((rows[0] as Record<string, unknown>).id, `${venueId}:2026-08`);
    context.hook("primary").reopenClosing(rows[0]);
    context.hook("primary").saveClosing({ ...(rows[0] as object), status: "closed" });
    assert.equal(rows.length, 1);
    assert.equal(context.hook("primary").closings.length, 1);
    assert.equal((rows[0] as Record<string, unknown>).venueId, venueId);
    assert.deepEqual((rows[0] as Record<string, unknown>).reopenHistory, history);
  }
});
for (const venueId of [1, 3293]) test(`period alias is canonical across close, reload and reopen/reclose in venue ${venueId}`, async () => {
  const runtime = await storeRuntime(venueId);
  try {
    const original = { id: "primary:2026-08", venueId: "primary", monthKey: "2026-08", status: "closed",
      snapshot: { revenue: 1320, costOfGoods: 780, venueId }, closedAt: "2026-09-01T00:00:00Z" };
    const saved = { ...original, venueId };
    assert.equal((await runtime.put(key, [original])).status, 200);
    assert.deepEqual((await runtime.get(key)).body.data, [saved]);
    assert.equal(purchaseVenueScopeIssue(venueId, (await runtime.get(key)).body.data), null);
    const audit = runtime.audits();
    assert.deepEqual(JSON.parse(String(audit[0].after_json)), saved);
    assert.equal((await runtime.put(key, [original])).status, 200);
    assert.deepEqual(runtime.audits(), audit, "alias retry is not a new mutation");
    const reopened = { ...saved, venueId: "primary", status: "reopened", reopenedAt: "2026-09-02T00:00:00Z",
      reopenHistory: [{ reason: "QA correction", at: "2026-09-02T00:00:00Z" }] };
    assert.equal((await runtime.put(key, [reopened], "QA explicit reopen")).status, 200);
    assert.equal((await runtime.put(key, [{ ...reopened, status: "closed" }])).status, 200);
    assert.deepEqual((await runtime.get(key)).body.data, [{ ...reopened, status: "closed", venueId }]);
    assert.equal(runtime.audits().length, 3);
    const before = runtime.bytes();
    assert.equal((await runtime.put(key, [{ ...saved, snapshot: { revenue: 0 } }])).status, 423);
    assert.equal(runtime.bytes(), before);
  } finally { runtime.close(); }
});

test("legacy alias normalization retains signed snapshot and original audit before-image", async () => {
  const runtime = await storeRuntime(3293);
  try {
    const legacy = { id: "primary:2026-08", venueId: "primary", monthKey: "2026-08", status: "closed", snapshot: { revenue: 1320 } };
    runtime.seed(key, [legacy]);
    assert.equal((await runtime.put(key, [legacy], "Canonical venue repair")).status, 200);
    assert.deepEqual((await runtime.get(key)).body.data, [{ ...legacy, venueId: 3293 }]);
    assert.deepEqual(JSON.parse(String(runtime.audits()[0].before_json)), legacy);
    assert.deepEqual(JSON.parse(String(runtime.audits()[0].after_json)), { ...legacy, venueId: 3293 });
  } finally { runtime.close(); }
});

for (const wrong of [1, "1", "other", 0, "03293", -1]) test(`foreign or invalid period venue ${JSON.stringify(wrong)} is rejected without writes`, async () => {
  const runtime = await storeRuntime(3293);
  try {
    const before = runtime.bytes();
    const result = await runtime.put(key, [{ id: "qa", venueId: wrong, monthKey: "2026-08", status: "closed" }]);
    assert.equal(result.status, 422);
    assert.equal(runtime.bytes(), before);
  } finally { runtime.close(); }
});

test("nested foreign snapshot ownership and raw purchase alias checks remain strict", async () => {
  const runtime = await storeRuntime(3293);
  try {
    const before = runtime.bytes();
    assert.equal((await runtime.put(key, [{ id: "qa", venueId: "primary", snapshot: { venueId: 1 } }])).status, 422);
    assert.equal(runtime.bytes(), before);
    assert.equal(purchaseVenueScopeIssue(3293, [{ venueId: "primary" }])?.code, "PURCHASE_VENUE_SCOPE_NEEDS_REVIEW");
    assert.equal(purchaseVenueScopeIssue(3293, [{ venueId: 1 }])?.code, "PURCHASE_VENUE_SCOPE_NEEDS_REVIEW");
  } finally { runtime.close(); }
});
