import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fragmentPath = new URL("../scripts/fragments/menu-consumption-sot-v418.fragment.txt", import.meta.url);
const bundle = readFileSync(bundlePath, "utf8");
const fragment = readFileSync(fragmentPath, "utf8");
const sha = (value) => createHash("sha256").update(value).digest("hex");

test("v436 client patch is idempotent and syntax-valid", () => {
  const before = [bundlePath, fragmentPath].map((path) => sha(readFileSync(path)));
  const run = spawnSync(process.execPath, ["scripts/patch-legacy-consumption-normalization-v436.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual([bundlePath, fragmentPath].map((path) => sha(readFileSync(path))), before);
  assert.equal(bundle.split('const bdLegacyConsumptionNormalizationVersionV436="v436";').length - 1, 1);
  const syntax = spawnSync(process.execPath, ["--check", fileURLToPath(bundlePath)], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test("editor save payload contains only fields for the selected consumption mode", async () => {
  const start = fragment.indexOf("const M=async()=>");
  const end = fragment.indexOf('return i.jsx("div"', start);
  assert.ok(start >= 0 && end > start);
  const handler = fragment.slice(start, end);
  const legacy = {
    readyProduct: { nomenclatureItemId: "sprite-stock", productKey: "sprite", packagesPerSale: 7 },
    readyProductLink: { nomenclatureItemId: "legacy-stock", productKey: "legacy" },
    readyProductKey: "legacy", nomenclatureItemId: "legacy-stock",
    saleSize: { quantity: 500, unit: "ml" }, portionSize: "0,5 л", legacyPortionSize: "бутылка",
  };

  for (const mode of ["DIRECT_ITEM", "FIXED_QUANTITY", "RECIPE", "NONE"]) {
    let persisted;
    const h = {
      id: "sprite-menu", name: "Спрайт 0,5л.", sectionId: "bar", taxonomyCategoryId: "soft",
      groupId: "group", subgroupId: "", venueId: 1, currency: "RUB", salePrice: 45,
      plannedSales: 0, saleQuantityInput: 500, saleUnit: "ml", consumptionMode: mode, ...legacy,
    };
    const context = {
      h, u: [{ id: "group", legacyDepartment: "bar" }], d: [],
      _: { id: "sprite-stock", key: "sprite", productKey: "sprite" },
      bdMenuModeConfiguredV418: true, bdMenuProductUnitV418: "pcs", bdMenuFixedCompatibleV418: true,
      bdMenuRecipeChoiceRequiredV418: false, bdMenuQuantityV418: 500, bdMenuVenueId: 1,
      bdMenuSavingRefV438: { current: false },
      bdMenuVenueCurrency: "RUB", bdAccountingCurrencyV243: (value) => value,
      bdCatNumber: (value) => Number(value) || 0, bdSetMenuSavingV418: () => {}, j: () => {},
      s: async (value) => { persisted = structuredClone(value); }, a: () => {},
    };
    await vm.runInNewContext(`${handler};M()`, context);
    assert.equal(persisted.consumptionMode, mode);
    for (const key of ["readyProductLink", "readyProductKey", "nomenclatureItemId", "portionSize", "legacyPortionSize"]) {
      assert.equal(key in persisted, false, `${mode}:${key}`);
    }
    assert.equal(Boolean(persisted.readyProduct), mode === "DIRECT_ITEM" || mode === "FIXED_QUANTITY", mode);
    assert.equal(Boolean(persisted.saleSize), mode === "FIXED_QUANTITY", mode);
  }
});

test("shells carry the v436 cache identity", () => {
  for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js", "public/bardoctor-preview-v396.js"]) {
    assert.match(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"), /20260919-legacy-consumption-normalization-v436/);
  }
});

test("returning to recipe mode reactivates the prior tech card instead of creating an empty duplicate", () => {
  assert.match(bundle, /bdRestorableRecipeV436=oe\.filter/);
  assert.match(bundle, /bdRestorableRecipeV436=R\.filter/);
  assert.match(bundle, /lifecycleStatus:"current",inactiveReason:void 0,deactivatedAt:void 0,reactivatedAt/);
  assert.match(bundle, /else\{const Ce=\{id:crypto\.randomUUID\(\),menuItemId:w\.id/);
});
