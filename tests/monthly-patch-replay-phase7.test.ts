import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { patchMonthlyFragment, patchMonthlyBundle, monthlyHelperBlock } from "../scripts/lib/monthly-financial-model.mjs";

// Pure installer regression: no build, application execution, source writes or business mutations.
const bundleFile = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentFile = new URL("../scripts/fragments/monthly-report-v165.fragment.txt", import.meta.url);
const domainFile = new URL("../lib/bardoctor/financial-reconciliation.ts", import.meta.url);
const bundle = fs.readFileSync(bundleFile, "utf8");
const fragment = fs.readFileSync(fragmentFile, "utf8");
const domain = fs.readFileSync(domainFile, "utf8");
const lf = (value: string) => value.replace(/\r\n/g, "\n");
const newline = (value: string, ending: string) => lf(value).replace(/\n/g, ending);
const counts = (source: string) => Object.fromEntries([
  ["chartRows", 'key: "inventory"'],
  ["lossDetailRows", 'label: "Инвентаризация: потери (+), излишки (−)"'],
  ["revaluationDetailRows", 'label: "Переоценка остатков (не расход)"'],
].map(([name, marker]) => [name, source.split(marker).length - 1]));
const oneEach = { chartRows: 1, lossDetailRows: 1, revaluationDetailRows: 1 };
function monthlyUi(source: string) {
  const startMarker = "/* bd-monthly-report-v165:start */", endMarker = "/* bd-monthly-report-v165:end */";
  assert.equal(source.split(startMarker).length - 1, 1);
  assert.equal(source.split(endMarker).length - 1, 1);
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start);
  assert.ok(end > start);
  return source.slice(start, end + endMarker.length);
}

for (const ending of ["\n", "\r\n"]) {
  test(`monthly fragment ${ending === "\n" ? "LF" : "CRLF"} checkout replay generates canonical bytes and exactly one row`, () => {
    const expected = patchMonthlyFragment(lf(fragment));
    assert.deepEqual(counts(expected), oneEach);
    let input = newline(fragment, ending);
    for (let cycle = 0; cycle < 3; cycle++) {
      const patched = patchMonthlyFragment(input);
      assert.deepEqual(counts(patched), oneEach, `checkout replay ${cycle} cannot duplicate semantic UI rows`);
      // Strict generated-byte equality; no normalization of ACTUAL assertions.
      assert.deepEqual(Buffer.from(patched), Buffer.from(expected), `checkout replay ${cycle} must emit the same bytes`);
      assert.deepEqual(Buffer.from(patchMonthlyFragment(patched)), Buffer.from(expected), "immediate replay must be byte-stable");
      input = newline(patched, ending); // model the next checkout/source newline conversion
    }
  });
}

test("shared financial TS LF and CRLF generate identical helper and final bundle bytes", () => {
  const expectedHelper = monthlyHelperBlock(lf(domain));
  const expectedBundle = patchMonthlyBundle(bundle, lf(domain));
  for (const ending of ["\n", "\r\n"]) {
    const model = newline(domain, ending);
    assert.deepEqual(Buffer.from(monthlyHelperBlock(model)), Buffer.from(expectedHelper));
    const actual = patchMonthlyBundle(bundle, model);
    assert.deepEqual(Buffer.from(actual), Buffer.from(expectedBundle));
    assert.deepEqual(Buffer.from(patchMonthlyBundle(actual, model)), Buffer.from(expectedBundle));
    assert.deepEqual(counts(monthlyUi(actual)), oneEach);
  }
});

test("CRLF client checkout replay canonicalizes the owned monthly UI without duplicating rows", () => {
  const expectedUi = patchMonthlyFragment(lf(monthlyUi(bundle)));
  const actual = patchMonthlyBundle(newline(bundle, "\r\n"), newline(domain, "\r\n"));
  assert.deepEqual(counts(monthlyUi(actual)), oneEach);
  assert.deepEqual(Buffer.from(monthlyUi(actual)), Buffer.from(expectedUi));
  assert.deepEqual(Buffer.from(patchMonthlyBundle(actual, domain)), Buffer.from(actual));
});

test("monthly installer keeps strict missing and duplicate anchor rejection", () => {
  const profitAnchor = '    { key: "profit", label: "Чистая прибыль", amount: report.operatingResult, tone: Number(report.operatingResult || 0) >= 0 ? "profit" : "loss" },';
  assert.equal(lf(fragment).split(profitAnchor).length - 1, 1);
  assert.throws(() => patchMonthlyFragment(lf(fragment).replace(profitAnchor, "")), /unique signed inventory chart required/);
  assert.throws(() => patchMonthlyBundle(bundle.replace("/* bd-monthly-report-v165:end */", ""), domain), /unique monthly UI end required/);
  assert.throws(() => patchMonthlyBundle(bundle + "\n/* phase7-monthly-financial-model:start */", domain), /ambiguous financial block boundaries/);
});

test.after(() => {
  assert.equal(fs.readFileSync(bundleFile, "utf8"), bundle);
  assert.equal(fs.readFileSync(fragmentFile, "utf8"), fragment);
  assert.equal(fs.readFileSync(domainFile, "utf8"), domain);
});
