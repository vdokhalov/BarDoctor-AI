import test from "node:test";
import assert from "node:assert/strict";
import { manualReferencePrice } from "../lib/bardoctor/manual-reference-price";

test("manual price persists as separate metadata, never receipt/opening valuation", () => {
  for (const amount of [0, 25]) {
    const result = manualReferencePrice(amount, "PMR_RUB", "2026-09-09T12:00:00Z");
    assert.equal(result.ok, true);
    assert.deepEqual(JSON.parse(JSON.stringify(result.fields)), {
      manualReferencePrice: { amount, currency: "PMR_RUB", capturedAt: "2026-09-09T12:00:00Z", source: "manual_catalogue" },
    });
  }
});
test("absent price is absent rather than zero; invalid input fails closed", () => {
  for (const value of [undefined, null, ""]) assert.deepEqual(manualReferencePrice(value, "MDL", "now"), { ok: true, fields: {} });
  for (const value of [-1, NaN, Infinity, {}, false, " ", "garbage"]) assert.equal(manualReferencePrice(value, "MDL", "now").ok, false);
  assert.equal(manualReferencePrice(2, null, "now").ok, false);
});
