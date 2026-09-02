import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bundle, patchSource, appHtml, responseShell, bootstrap] = await Promise.all([
  readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
  readFile(new URL("../scripts/patch-warehouse-unit-integrity-v399.mjs", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
]);

function functionSource(name) {
  const start = bundle.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist in the production bundle`);
  const end = bundle.indexOf("\nfunction ", start + 10);
  return bundle.slice(start, end === -1 ? bundle.length : end);
}

const runtime = new Function(`
  function bdWarehouseRecord(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
  function bdWarehouseNumber(value,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback}
  function bdWarehouseDecimal(value,digits=2){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:digits}).format(bdWarehouseNumber(value))}
  function bdWarehouseUnit(value){return value==="ml"?"мл":value==="l"?"л":value==="g"?"г":value==="kg"?"кг":value==="pcs"?"шт.":String(value||"ед.")}
  ${functionSource("bdWarehouseQuantityMetadata")}
  ${functionSource("bdWarehouseEffectiveDisplayUnit")}
  ${functionSource("bdWarehouseDisplayAmount")}
  return {bdWarehouseQuantityMetadata,bdWarehouseDisplayAmount};
`)();

test("warehouse keeps the ledger unit when nomenclature metadata conflicts", () => {
  const balance = {
    unit: "ml",
    current: 12_000,
    packageSize: "0.5 л",
    packageAmount: 500,
    displayUnit: "auto",
  };
  const nomenclature = {
    unit: "pcs",
    packageSize: "1",
    packageAmount: 1,
    displayUnit: "pcs",
  };
  const metadata = runtime.bdWarehouseQuantityMetadata(balance, nomenclature);
  const product = { ...balance, ...nomenclature, ...metadata };

  assert.equal(metadata.unitConflict, true);
  assert.equal(product.unit, "ml");
  assert.equal(product.packageSize, "0.5 л");
  assert.equal(product.packageAmount, 500);
  assert.equal(product.displayUnit, "auto");
  assert.equal(runtime.bdWarehouseDisplayAmount(product, product.current), "12 л");
});

test("warehouse still accepts compatible nomenclature display preferences", () => {
  const balance = { unit: "ml", current: 6_000, packageSize: "0.5 л", packageAmount: 500 };
  const nomenclature = {
    unit: "ml",
    packageSize: "0.5 л",
    packageAmount: 500,
    displayUnit: "pcs",
    displayPackageSize: "0.5 л",
    displayPackageAmount: 500,
  };
  const metadata = runtime.bdWarehouseQuantityMetadata(balance, nomenclature);
  const product = { ...balance, ...nomenclature, ...metadata };

  assert.equal(metadata.unitConflict, false);
  assert.equal(runtime.bdWarehouseDisplayAmount(product, product.current), "12 шт.");
});

test("the unit-integrity repair is preserved in every production shell", () => {
  assert.match(bundle, /bdWarehouseUnitIntegrityVersionV399="v399"/);
  assert.match(bundle, /Единица исправлена по движениям/);
  assert.match(patchSource, /bdWarehouseQuantityMetadata/);
  for (const shell of [appHtml, responseShell, bootstrap]) {
    assert.match(shell, /bd-warehouse-unit-integrity-v399/);
  }
});
