import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const cacheToken = "20260828-venue-currency-lock-v326";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(from, to, label) {
  if (source.includes(to)) return;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(from, to);
}

function replaceInSection(startMarker, endMarker, from, to, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`${label}: section markers not found`);
  const section = source.slice(start, end);
  if (section.includes(to)) return;
  const count = section.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one section match, found ${count}`);
  source = source.slice(0, start) + section.replace(from, to) + source.slice(end);
}

const selectorAdapter = 'const bdCurrencySelectorsVersionV325="assortment-currency-ux-v325";function bdCurrencySelectOptionsV325(){return bdAccountingCurrencyOptionsV243().map(e=>({value:e.value,label:e.value==="PMR_RUB"?"руб. ПМР":e.value==="RUB"?"RUB — российский рубль":e.value}))}';
const lockedCurrency = 'const bdVenueCurrencyLockVersionV326="venue-currency-lock-v326";function bdVenueCurrencyLabelV326(e){const t=bdAccountingCurrencyV243(e)||bdCurrentAccountingCurrencyV243()||"RUB";return t==="PMR_RUB"?"руб. ПМР":t==="RUB"?"RUB — российский рубль":t}function bdVenueCurrencyLockedV326({currency:e}){return i.jsxs("div",{"data-bd-venue-currency-lock":"v326",className:"bd-venue-currency-lock-v326",children:[i.jsxs("strong",{children:["Валюта · ",bdVenueCurrencyLabelV326(e)]}),i.jsx("small",{children:"Задаётся в настройках профиля"})]})}';
if (source.includes(lockedCurrency)) {
  const adapterCount = source.split(selectorAdapter).length - 1;
  if (adapterCount > 1) throw new Error(`selector adapter cleanup: expected at most one match, found ${adapterCount}`);
  if (adapterCount === 1) source = source.replace(selectorAdapter, "");
} else {
  replaceOnce(selectorAdapter, lockedCurrency, "replace operational currency selector adapter with a locked venue currency");
}

replaceInSection(
  "function bdProcSupplierEditorV168(",
  "function bdProcFactV168(",
  'n({...r,name:r.name.trim(),categories:',
  'n({...r,currency:bdCurrentAccountingCurrencyV243()||r.currency||"RUB",name:r.name.trim(),categories:',
  "command supplier save uses venue currency",
);
replaceInSection(
  "function bdSupplierEditor(",
  "function bdProcCurrentPackageV209(",
  'n({...r,name:r.name.trim(),categories:',
  'n({...r,currency:bdCurrentAccountingCurrencyV243()||r.currency||"RUB",name:r.name.trim(),categories:',
  "legacy supplier save uses venue currency",
);

replaceInSection(
  "function bdProcSupplierEditorV168(",
  "function bdProcFactV168(",
  'i.jsx(bdProcField,{label:"Валюта",children:i.jsx("select",{value:r.currency||"RUB",onChange:u=>s("currency",u.target.value),children:bdCurrencySelectOptionsV325().map(u=>i.jsx("option",{value:u.value,children:u.label},u.value))})})',
  'i.jsx(bdVenueCurrencyLockedV326,{currency:bdCurrentAccountingCurrencyV243()||r.currency})',
  "command supplier currency lock",
);
replaceInSection(
  "function bdSupplierEditor(",
  "function bdProcCurrentPackageV209(",
  'i.jsx(bdProcField,{label:"Валюта",children:i.jsxs("select",{value:r.currency||"RUB",onChange:u=>s("currency",u.target.value),children:bdCurrencySelectOptionsV325().map(u=>i.jsx("option",{value:u.value,children:u.label},u.value))})})',
  'i.jsx(bdVenueCurrencyLockedV326,{currency:bdCurrentAccountingCurrencyV243()||r.currency})',
  "legacy supplier currency lock",
);
replaceOnce(
  'i.jsx(bdProcField,{label:"Валюта",children:i.jsxs("select",{value:e.currency||"RUB",onChange:g=>l("currency",g.target.value),children:bdCurrencySelectOptionsV325().map(g=>i.jsx("option",{value:g.value,children:g.label},g.value))})})',
  'i.jsx(bdVenueCurrencyLockedV326,{currency:bdAccountingCurrency})',
  "purchase currency lock",
);
replaceOnce(
  'i.jsx(bdCatField,{label:"Валюта",children:i.jsx("select",{value:h.currency||bdMenuVenueCurrency||"RUB",onChange:P=>v("currency",P.target.value),children:bdCurrencySelectOptionsV325().map(P=>i.jsx("option",{value:P.value,children:P.label},P.value))})})',
  'i.jsx(bdVenueCurrencyLockedV326,{currency:bdMenuVenueCurrency})',
  "menu currency lock",
);

if (!source.includes('const bdPurchaseReviewUxVersion="v356"')) {
  replaceInSection(
    "function bdPurchaseReview(",
    "function bdUploadFileName(",
    'bdAccountingCurrency=bdCurrentAccountingCurrencyV243(),bdFxNeeded=e.documentType!=="price_list"&&!!bdAccountingCurrency&&String(e.currency||"").toUpperCase()!==bdAccountingCurrency,h=',
    'bdAccountingCurrency=bdCurrentAccountingCurrencyV243()||"RUB";S.useEffect(()=>{e.status!=="confirmed"&&String(e.currency||"").toUpperCase()!==bdAccountingCurrency&&n({...e,currency:bdAccountingCurrency,originalCurrency:void 0,originalAmount:void 0,accountingCurrency:void 0,accountingAmount:void 0,fxRate:void 0,fxEffectiveDate:void 0,fxSource:void 0,fxLockedAt:void 0})},[e.currency,e.status,bdAccountingCurrency]);const bdFxNeeded=e.status==="confirmed"&&e.documentType!=="price_list"&&String(e.currency||"").toUpperCase()!==bdAccountingCurrency,h=',
    "draft purchases follow venue currency while historical FX remains readable",
  );
  replaceInSection(
    "function bdPurchaseReview(",
    "function bdUploadFileName(",
    'currency:y.currency||e.currency',
    'currency:e.status==="confirmed"?e.currency:bdAccountingCurrency||e.currency||"RUB"',
    "supplier choice cannot override venue currency",
  );
}
replaceInSection(
  "function bdCatMenuEditor(",
  "function bdCatRecipeEditor(",
  's({...K,groupId:h.groupId,',
  's({...K,currency:bdAccountingCurrencyV243(bdMenuVenueCurrency)||"RUB",groupId:h.groupId,',
  "menu save uses venue currency",
);

if (source.includes("bdCurrencySelectOptionsV325")) {
  throw new Error("An operational currency selector remains in the application bundle");
}
if ((source.match(/sheetTitle:"Валюта учёта"/g) || []).length !== 2) {
  throw new Error("Profile accounting-currency selectors were unexpectedly changed");
}

let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!new RegExp(`index-BQGspy0I\\.js\\?v=[^\"]*${cacheToken}`).test(bootstrap)) {
  bootstrap = bootstrap.replace(/(script\.src = "\/assets\/index-BQGspy0I\.js\?v=[^"]+)";/, `$1-${cacheToken}";`);
}
let appHtml = fs.readFileSync(appHtmlPath, "utf8");
if (!new RegExp(`bardoctor-preview\\.js\\?v=[^\"]*${cacheToken}`).test(appHtml)) {
  appHtml = appHtml.replace(/(src="\/bardoctor-preview\.js\?v=[^"]+)"/, `$1-${cacheToken}"`);
}
if (!new RegExp(`assortment-command-v170\\.css\\?v=[^\"]*${cacheToken}`).test(appHtml)) {
  appHtml = appHtml.replace(/(href="\/assortment-command-v170\.css\?v=[^"]+)"/, `$1-${cacheToken}"`);
}

fs.writeFileSync(bundlePath, source);
fs.writeFileSync(bootstrapPath, bootstrap);
fs.writeFileSync(appHtmlPath, appHtml);
console.log("Venue currency lock v326 applied");
