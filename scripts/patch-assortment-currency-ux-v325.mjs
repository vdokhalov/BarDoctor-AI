import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const cacheToken = "20260828-assortment-currency-ux-v325";
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

replaceOnce(
  'function bdAccountingCurrencyOptionsV243(){return bdAccountingCurrenciesV243.map(e=>({value:e,label:bdAccountingCurrencyLabelsV243[e]||e}))}',
  'function bdAccountingCurrencyOptionsV243(){return bdAccountingCurrenciesV243.map(e=>({value:e,label:bdAccountingCurrencyLabelsV243[e]||e}))}const bdCurrencySelectorsVersionV325="assortment-currency-ux-v325";function bdCurrencySelectOptionsV325(){return bdAccountingCurrencyOptionsV243().map(e=>({value:e.value,label:e.value==="PMR_RUB"?"руб. ПМР":e.value==="RUB"?"RUB — российский рубль":e.value}))}',
  "canonical client currency selector adapter",
);

replaceInSection(
  "function bdProcSupplierEditorV168(",
  "function bdProcFactV168(",
  'currency:"RUB"',
  'currency:bdCurrentAccountingCurrencyV243()||"RUB"',
  "command supplier default currency",
);
replaceInSection(
  "function bdSupplierEditor(",
  "function bdProcCurrentPackageV209(",
  'currency:"RUB"',
  'currency:bdCurrentAccountingCurrencyV243()||"RUB"',
  "legacy supplier default currency",
);

source = source.replaceAll(
  'children:["RUB","MDL","EUR","USD","UAH","RON"].map(u=>i.jsx("option",{value:u,children:u},u))',
  'children:bdCurrencySelectOptionsV325().map(u=>i.jsx("option",{value:u.value,children:u.label},u.value))',
);
source = source.replace(
  'children:["RUB","MDL","EUR","USD","UAH","RON"].map(P=>i.jsx("option",{value:P,children:P},P))',
  'children:bdCurrencySelectOptionsV325().map(P=>i.jsx("option",{value:P.value,children:P.label},P.value))',
);
source = source.replace(
  'children:["PMR_RUB","MDL","RUB","EUR","USD","UAH","RON"].map(g=>i.jsx("option",{value:g,children:g==="PMR_RUB"?"руб. ПМР":g},g))',
  'children:bdCurrencySelectOptionsV325().map(g=>i.jsx("option",{value:g.value,children:g.label},g.value))',
);

const menuEditorStartV325 = source.indexOf("function bdCatMenuEditor(");
const menuEditorEndV325 = source.indexOf("function bdCatRecipeEditor(", menuEditorStartV325);
const menuEditorV325 = source.slice(menuEditorStartV325, menuEditorEndV325);
if (!menuEditorV325.includes('currency:bdAccountingCurrencyV243(e.currency)||bdAccountingCurrencyV243(bdMenuVenueCurrency)||"RUB"')) {
  replaceInSection(
    "function bdCatMenuEditor(",
    "function bdCatRecipeEditor(",
    '[h,g]=S.useState(()=>e?{...e,groupId:',
    '[h,g]=S.useState(()=>e?{...e,currency:bdAccountingCurrencyV243(e.currency)||bdAccountingCurrencyV243(bdMenuVenueCurrency)||"RUB",groupId:',
    "menu edit currency normalization",
  );
}

const toolbarAdd = 'm&&i.jsxs("button",{type:"button",onClick:d,children:[i.jsx(Vt,{size:16}),"Позиция"]}),';
const toolbarAddCount = source.split(toolbarAdd).length - 1;
if (toolbarAddCount > 0) source = source.replaceAll(toolbarAdd, "");
const emptyAdd = 'action:m&&i.jsx("button",{type:"button",onClick:d,children:"Добавить позицию"})';
const emptyAddCount = source.split(emptyAdd).length - 1;
if (emptyAddCount > 0) source = source.replaceAll(emptyAdd, "action:null");

replaceInSection(
  "function bdAssortmentCommandPageV170()",
  "/* bd-assortment-command-v170:end */",
  'i.jsx("input",{ref:de,type:"file",accept:"image/*",multiple:!0,hidden:!0,onChange:Ce})]})}),$===!0&&',
  'i.jsx("input",{ref:de,type:"file",accept:"image/*",multiple:!0,hidden:!0,onChange:Ce}),me&&d==="menu"&&i.jsxs("button",{type:"button",className:"bd-assortment-add-fab-v325",onClick:ze,"aria-label":"Добавить позицию",children:[i.jsx(Vt,{size:18,"aria-hidden":!0}),i.jsx("span",{children:"Добавить позицию"})]})]})}),$===!0&&',
  "persistent assortment add action",
);

if (source.includes('["RUB","MDL","EUR","USD","UAH","RON"]')) {
  throw new Error("A stale local currency selector remains in the application bundle");
}
if (!source.includes('currency:bdMenuVenueCurrency||"RUB"')) {
  throw new Error("New menu items no longer default from the active venue currency");
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
console.log("Assortment currency and persistent add action v325 applied");
