import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v416 release artifact is versioned and retains the unified costing implementation", async () => {
  const [response, app, bootstrap, resolver, sales, writeOffs, valuation, analytics] = await Promise.all([
    read("app/bar-doctor-response.ts"),
    read("public/app.html"),
    read("public/bardoctor-preview.js"),
    read("lib/bardoctor/cost-basis.ts"),
    read("lib/bardoctor/sales-consumption.ts"),
    read("lib/bardoctor/write-offs.ts"),
    read("lib/bardoctor/valuation.ts"),
    read("lib/bardoctor/assortment-analytics.ts"),
  ]);
  for (const source of [response, app, bootstrap]) {
    assert.match(source, /20260907-unified-costing-v416/);
  }
  assert.match(resolver, /latest_confirmed_receipt/);
  assert.match(resolver, /asOf/);
  assert.match(sales, /costSourceDocumentId/);
  assert.match(writeOffs, /costEffectiveDate/);
  assert.match(valuation, /resolveCostBasis/);
  assert.match(analytics, /batch\.totalTheoreticalCost/);
});
