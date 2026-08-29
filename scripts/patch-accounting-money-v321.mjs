import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const cacheToken = "20260828-accounting-money-v321";
let source = fs.readFileSync(bundlePath, "utf8");

source = source.replace(
  'bdAccountingCurrenciesV243=["MDL","RUB","EUR","USD","UAH","RON"],bdAccountingCurrencyLabelsV243={MDL:"MDL — молдавский лей",RUB:"RUB — российский рубль",EUR:"EUR — евро",USD:"USD — доллар",UAH:"UAH — гривна",RON:"RON — румынский лей"}',
  'bdAccountingCurrenciesV243=["MDL","PMR_RUB","RUB","EUR","USD","UAH","RON"],bdAccountingCurrencyLabelsV243={MDL:"MDL — молдавский лей",PMR_RUB:"руб. ПМР — приднестровский рубль",RUB:"RUB — российский рубль",EUR:"EUR — евро",USD:"USD — доллар",UAH:"UAH — гривна",RON:"RON — румынский лей"}',
);
source = source.replace(
  'function bdAccountingMoneyV243(e,t){const n=bdAccountingCurrencyV243(t)||bdCurrentAccountingCurrencyV243(),r=Number(e);if(!Number.isFinite(r))return"—";if(!n)return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(r)+" —";try{return new Intl.NumberFormat("ru-RU",{style:"currency",currency:n,maximumFractionDigits:2}).format(r)}catch{return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(r)+" "+n}}',
  'function bdAccountingMoneyV243(e,t){const n=bdAccountingCurrencyV243(t)||bdCurrentAccountingCurrencyV243(),r=Number(e);if(!Number.isFinite(r))return"—";if(!n)return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(r)+" —";if(n==="PMR_RUB")return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(r)+" руб. ПМР";try{return new Intl.NumberFormat("ru-RU",{style:"currency",currency:n,maximumFractionDigits:2}).format(r)}catch{return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(r)+" "+n}}',
);
source = source.replace(
  'function bdMonthlyCurrencyCodeV320(e,t){const n=String(e??"").trim().toUpperCase();return /^[A-Z]{3}$/.test(n)?n:t}',
  'function bdMonthlyCurrencyCodeV320(e,t){const n=String(e??"").trim().toUpperCase();return n==="PMR_RUB"||/^[A-Z]{3}$/.test(n)?n:t}',
);
source = source.replaceAll(
  'bdMonthlyFiniteMoneyV320(e?.exchangeRateToAccounting)',
  'bdMonthlyFiniteMoneyV320(e?.fxRate??e?.exchangeRateToAccounting)',
);
source = source.replace(
  'children:["RUB","MDL","EUR","USD","UAH","RON"].map(g=>i.jsx("option",{value:g,children:g},g))',
  'children:["PMR_RUB","MDL","RUB","EUR","USD","UAH","RON"].map(g=>i.jsx("option",{value:g,children:g==="PMR_RUB"?"руб. ПМР":g},g))',
);
source = source.replace(
  'const f=()=>l("items",[...e.items,{id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",quantityMode:"count",packageSize:"",unitPrice:0,lineTotal:0,category:e.expenseCategory||"products",confidence:1}]),m=()=>l("total",Math.round(d*100)/100),h=e.documentType==="price_list"?',
  'const f=()=>l("items",[...e.items,{id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",quantityMode:"count",packageSize:"",unitPrice:0,lineTotal:0,category:e.expenseCategory||"products",confidence:1}]),m=()=>l("total",Math.round(d*100)/100),bdAccountingCurrency=bdCurrentAccountingCurrencyV243(),bdFxNeeded=e.documentType!=="price_list"&&!!bdAccountingCurrency&&String(e.currency||"").toUpperCase()!==bdAccountingCurrency,h=e.documentType==="price_list"?',
);
const fxAnchor = ']}),i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Категория расхода"';
const fxUi = ']}),bdFxNeeded&&i.jsxs("section",{"data-bd-accounting-fx":"v321",className:"bd-procurement-review-note",children:[i.jsxs("p",{children:["Сумма документа: ",Number(e.total||0).toFixed(2)," ",e.currency," · Учётная валюта: ",bdAccountingCurrency]}),i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Исторический курс (1 "+e.currency+" = … "+bdAccountingCurrency+")",children:i.jsx("input",{type:"number",step:"0.000001",inputMode:"decimal",value:e.fxRate||"",onChange:g=>l("fxRate",g.target.value)})}),i.jsx(bdProcField,{label:"Дата курса",children:i.jsx("input",{type:"date",value:e.fxEffectiveDate||e.date||"",onChange:g=>l("fxEffectiveDate",g.target.value)})})]}),i.jsx(bdProcField,{label:"Источник курса",children:i.jsx("input",{value:e.fxSource||"",onChange:g=>l("fxSource",g.target.value),placeholder:"Документ / банк / подтверждение пользователя"})}),Number(e.fxRate)>0&&i.jsxs("strong",{children:["Учётная сумма: ",Math.round(Number(e.total||0)*Number(e.fxRate)*100)/100," ",bdAccountingCurrency]})]}),i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Категория расхода"';
const fxBlockStart = 'bdFxNeeded&&i.jsxs("section",{"data-bd-accounting-fx":"v321"';
const fxCategoryStart = ',i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Категория расхода"';
const canonicalFxBlock = fxUi.slice(
  fxUi.indexOf(fxBlockStart),
  fxUi.indexOf(fxCategoryStart),
);
const existingFxStart = source.indexOf(fxBlockStart);
const existingFxEnd = existingFxStart >= 0 ? source.indexOf(fxCategoryStart, existingFxStart) : -1;
if (existingFxStart >= 0 && existingFxEnd >= 0) {
  source = source.slice(0, existingFxStart) + canonicalFxBlock + source.slice(existingFxEnd);
} else if (source.includes(fxAnchor)) {
  source = source.replace(fxAnchor, fxUi);
}

if (!source.includes('data-bd-accounting-fx":"v321')) {
  throw new Error("Accounting FX UI anchor not found");
}

let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!new RegExp(`index-BQGspy0I\\.js\\?v=[^\"]*${cacheToken}`).test(bootstrap)) {
  bootstrap = bootstrap.replace(/(script\.src = "\/assets\/index-BQGspy0I\.js\?v=[^"]+)";/, `$1-${cacheToken}";`);
}
let appHtml = fs.readFileSync(appHtmlPath, "utf8");
if (!new RegExp(`bardoctor-preview\\.js\\?v=[^\"]*${cacheToken}`).test(appHtml)) {
  appHtml = appHtml.replace(/(src="\/bardoctor-preview\.js\?v=[^"]+)"/, `$1-${cacheToken}"`);
}

fs.writeFileSync(bundlePath, source);
fs.writeFileSync(bootstrapPath, bootstrap);
fs.writeFileSync(appHtmlPath, appHtml);
console.log("Accounting money UI v321 applied");
