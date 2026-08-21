import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("profile exposes one persisted venue accounting-currency selector", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const profileStart = bundle.indexOf("function ZCe");
  const profileEnd = bundle.indexOf("function JCe", profileStart);
  const profile = bundle.slice(profileStart, profileEnd);
  assert.match(bundle, /bdAccountingCurrencyVersionV243="accounting-currency-v243"/);
  assert.match(bundle, /bdAccountingCurrenciesV243=\["MDL","RUB","EUR","USD","UAH","RON"\]/);
  assert.match(profile, /data-bd-accounting-currency/);
  assert.match(profile, /Валюта учёта \*/);
  assert.match(profile, /currency:bdAccountingCurrencyV243\(a\.currency\)/);
  assert.match(profile, /S\.useEffect\(\(\)=>\{e&&t&&s\(QCe\(t\)\)\},\[e,t\]\)/);
  assert.match(profile, /Изменить валюту учёта\?/);
  assert.match(profile, /Исходные суммы и валюты документов не изменятся/);
  assert.match(bundle, /jz\(r\.restaurant\?\?e\)/);
});

test("warehouse links a missing accounting currency to the current venue profile", async () => {
  const [bundle, css] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/warehouse.css"),
  ]);
  const start = bundle.indexOf("function bdWarehousePage");
  const end = bundle.indexOf("function bdRecurringSettingsEditor", start);
  const warehouse = bundle.slice(start, end);
  assert.match(warehouse, /bdWarehouseInventoryValueSummary\(q,n\?\.currency\)/);
  assert.match(warehouse, /Валюта учёта не выбрана/);
  assert.match(warehouse, /\/profile\?edit=venue&focus=currency/);
  assert.match(css, /\.bd-warehouse-currency-link-v243/);
});

test("venue accounting currency is reused by core aggregated monetary formatters", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /function Mn\(e\)\{return bdAccountingMoneyV243\(e\)\}/);
  assert.match(bundle, /function GM\(e\)\{return bdAccountingMoneyV243\(Math\.round\(e\)\)\}/);
  assert.match(bundle, /function Ge\(e\)\{return bdAccountingMoneyV243\(Math\.round\(e\)\)\}/);
  assert.match(bundle, /function bdDiagnosisMoneyV48\(e\)\{return bdAccountingMoneyV243\(e\)\}/);
  assert.match(bundle, /function bdEquipmentMoneyV167\(e\)\{return bdAccountingMoneyV243\(e\)\}/);
  assert.match(bundle, /function qI\(e\)\{return bdAccountingMoneyV243\(e\)\}/);
  assert.match(bundle, /function bdCurrentAccountingCurrencyV243\(\)/);
  assert.match(bundle, /function bdAccountingCurrencySuffixV243\(e=""\)/);
});

test("setup and profile require currency while document currencies remain independent", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const setupStart = bundle.indexOf("function Fle");
  const setupEnd = bundle.indexOf("function Ule", setupStart);
  const setup = bundle.slice(setupStart, setupEnd);
  assert.match(setup, /Валюта учёта \*/);
  assert.match(bundle, /currency:bdAccountingCurrencyV243\(u\.currency\)/);
  assert.match(bundle, /bdProcMoneyV168\(v\.total,v\.currency\|\|"RUB"\)/);
  assert.match(bundle, /bdProcManualDraftV207/);
});
