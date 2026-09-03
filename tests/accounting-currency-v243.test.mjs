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
  assert.match(bundle, /bdAccountingCurrenciesV243=\["MDL","PMR_RUB","RUB","EUR","USD","UAH","RON"\]/);
  assert.match(bundle, /PMR_RUB:"руб\. ПМР — приднестровский рубль"/);
  assert.match(profile, /data-bd-accounting-currency/);
  assert.match(profile, /Валюта учёта \*/);
  assert.match(profile, /currency:bdAccountingCurrencyV243\(a\.currency\)/);
  assert.match(profile, /S\.useEffect\(\(\)=>\{e&&t&&s\(QCe\(t\)\)\},\[e,t\]\)/);
  assert.match(profile, /Изменить валюту учёта\?/);
  assert.match(profile, /Исходные суммы и валюты документов не изменятся/);
  assert.match(bundle, /const a=r\.restaurant\?\?e;jz\(a\)/);
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

test("setup and profile own the selector while new documents inherit the venue currency", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const setupStart = bundle.indexOf("function Fle");
  const setupEnd = bundle.indexOf("function Ule", setupStart);
  const setup = bundle.slice(setupStart, setupEnd);
  assert.match(setup, /Валюта учёта \*/);
  assert.match(bundle, /currency:bdAccountingCurrencyV243\(u\.currency\)/);
  assert.match(bundle, /bdProcMoneyV168\(v\.total,v\.currency\|\|"RUB"\)/);
  assert.match(bundle, /bdProcManualDraftV207/);
  assert.match(bundle, /function bdProcManualDraftV207\(e,t="RUB"\)/);
  assert.match(bundle, /currency:t\|\|"RUB"/);
  assert.match(bundle, /bdProcManualDraftV207\(s\.activeVenueId,s\.venues\.find/);
  assert.match(bundle, /bdVenueCurrencyLockVersionV326="venue-currency-lock-v326"/);
  assert.doesNotMatch(bundle, /bdCurrencySelectOptionsV325/);
  assert.match(bundle, /confirmedPurchases\?\.\[0\]\?\.currency\|\|o\.find/);
  assert.match(bundle, /r\.currency\|\|r\.accountingCurrency\|\|"RUB"/);
});

test("shift closing labels and totals use the active venue accounting currency", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function PAe(");
  const end = bundle.indexOf("function DAe(", start);
  const shiftClosing = bundle.slice(start, end);
  assert.match(shiftClosing, /bdShiftCurrency=bdAccountingCurrencyV243\(a\?\.currency\)/);
  assert.match(shiftClosing, /children:\["Выручка \(",bdShiftCurrency,"\) \*"\]/);
  assert.match(shiftClosing, /"aria-label":"Выручка, "\+bdShiftCurrency/);
  assert.match(shiftClosing, /bdShiftMoney\(payrollTotal\)/);
  assert.doesNotMatch(shiftClosing, /Выручка \(₽\)|Выручка, ₽/);
});

test("assortment economics uses the active venue currency without menu items", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdOwnerUATFixesV287="owner-uat-v287"/);
  assert.match(bundle, /currency:bdAssortmentCurrency/);
  assert.match(bundle, /e\.menuItems\?\.\[0\]\?\.currency\|\|bdAssortmentCurrency\|\|"RUB"/);
  assert.match(bundle, /currency:r\?\.currency\|\|s\.venues\.find/);
});

test("new menu items default to the active venue currency", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdOwnerUATFixesV288="owner-uat-v288"/);
  assert.match(bundle, /currency:bdMenuVenueCurrency="RUB"/);
  assert.match(bundle, /currency:bdMenuVenueCurrency\|\|"RUB",saleQuantityInput:"",saleUnit:"ml"/);
  assert.match(bundle, /onManageStructure:[^}]+currency:r\?\.currency\|\|s\.venues\.find/);
  assert.match(bundle, /bdOwnerUATFixesV289="owner-uat-v289"/);
  assert.match(bundle, /onSave:Ae,onManageStructure:.*?currency:r\?\.currency\|\|s\.venues\.find/s);
});

test("saved venue catalog remains authoritative while server analytics refreshes", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdOwnerUATFixesV290="owner-uat-v290"/);
  assert.match(bundle, /bdAssortmentLocal=bdAssortmentFallbackAnalyticsV170\(E,C,m\)/);
  assert.match(bundle, /bdAssortmentLocal\.menuItems\.length\?\{\.\.\.bdAssortmentLocal,economics:V\?\.economics/);
});

test("catalog sync captures the server base before updating its local cache", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdOwnerUATFixesV291="owner-uat-v291"/);
  assert.match(bundle, /_\(P\);const c=await qr\(bdCatalogStoreKey,P\),p=bdCatState\(xr\(bdCatalogStoreKey\)\|\|P\);_\(p\),Kse\(bdCatalogStoreKey,p\)/);
  assert.doesNotMatch(bundle, /_\(P\),Kse\(bdCatalogStoreKey,P\);const c=await qr\(bdCatalogStoreKey,P\)/);
});

test("assortment prefers the populated server read model and labels confirmed fallback cards correctly", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdOwnerUATFixesV292="owner-uat-v292"/);
  assert.match(bundle, /he=V\?\.menuItems\?\.length\?V:bdAssortmentLocal\.menuItems\.length/);
  assert.match(bundle, /approved=Boolean\(h&&\(h\.reviewStatus==="approved"\|\|h\.status==="confirmed"\)\)/);
  assert.match(bundle, /techCardStatus:h\?approved\?"approved"/);
});

test("assortment renders canonical base units in owner-facing Russian labels", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdOwnerUATFixesV293="owner-uat-v293"/);
  assert.match(bundle, /function bdAssortmentUnitLabelV293/);
  assert.match(bundle, /bdTechCostLineAmountV393\(v\)/);
});

test("AI diagnosis uses authoritative last-write persistence", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdOwnerUATFixesV294="owner-uat-v294"/);
  assert.match(bundle, /function bdPersistDiagnosisV294/);
  assert.match(bundle, /S0\(IC,t,e,void 0\)/);
  assert.doesNotMatch(bundle, /function cle\(e,t\).*?qr\(IC,n\)/s);
});

test("empty venues do not claim completed setup or 100 percent readiness", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /" шаг остался"/);
  assert.match(bundle, /" шага осталось"/);
  assert.match(bundle, /Пока нет прошедших смен для оценки готовности/);
  assert.match(bundle, /Готовность данных пока не рассчитывается/);
});

test("assortment detail also translates canonical base units", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /bdOwnerUATFixesV295="owner-uat-v295"/);
  assert.match(bundle, /function bdTechCostLineAmountV393/);
  assert.match(bundle, /children:bdTechCostLineAmountV393\(g\)/);
  assert.match(bundle, /bdTechCostLineAmountV393\(v\)/);
  assert.doesNotMatch(bundle, /g\.quantity!=null\?g\.quantity:"—"," ",g\.unit\|\|""/);
});
