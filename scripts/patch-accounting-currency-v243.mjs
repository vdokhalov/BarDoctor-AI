import fs from "node:fs";
import path from "node:path";

const bundlePath = path.resolve("public/assets/index-BQGspy0I.js");
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOnce(from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(from, to);
}

function replaceInSection(startMarker, endMarker, from, to, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`${label}: section markers not found`);
  const section = source.slice(start, end);
  const count = section.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one section match, found ${count}`);
  source = source.slice(0, start) + section.replace(from, to) + source.slice(end);
}

const runtimeMarker = 'const vz="/api/restaurants",Ise="bd_restaurant_cache"';
replaceOnce(runtimeMarker, `const bdAccountingCurrencyVersionV243="accounting-currency-v243",bdAccountingCurrenciesV243=["MDL","RUB","EUR","USD","UAH","RON"],bdAccountingCurrencyLabelsV243={MDL:"MDL — молдавский лей",RUB:"RUB — российский рубль",EUR:"EUR — евро",USD:"USD — доллар",UAH:"UAH — гривна",RON:"RON — румынский лей"};
function bdAccountingCurrencyV243(e){const t=String(e??"").trim().toUpperCase();return bdAccountingCurrenciesV243.includes(t)?t:""}
function bdAccountingCurrencyOptionsV243(){return bdAccountingCurrenciesV243.map(e=>({value:e,label:bdAccountingCurrencyLabelsV243[e]||e}))}
function bdCurrentAccountingCurrencyV243(){try{return bdAccountingCurrencyV243(bz()?.currency)}catch{return""}}
function bdAccountingMoneyV243(e,t){const n=bdAccountingCurrencyV243(t)||bdCurrentAccountingCurrencyV243(),r=Number(e);if(!Number.isFinite(r))return"—";if(!n)return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(r)+" —";try{return new Intl.NumberFormat("ru-RU",{style:"currency",currency:n,maximumFractionDigits:2}).format(r)}catch{return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(r)+" "+n}}
${runtimeMarker}`, "currency runtime");

replaceOnce(
  'if(!r.ok)throw new Error(r.error??"Ошибка сохранения");jz(e)}',
  'if(!r.ok)throw new Error(r.error??"Ошибка сохранения");jz(r.restaurant??e)}',
  "canonical profile cache",
);

replaceOnce(
  'Lle={name:"",businessType:"",countryCode:"",city:"",region:"",venueFormat:"",competitorsText:"",seats:"",employees:"",openTime:"10:00",closeTime:"23:00",areas:[],equipmentBusinessType:"",equipmentSelections:{}}',
  'Lle={name:"",businessType:"",countryCode:"",city:"",region:"",venueFormat:"",currency:"",competitorsText:"",seats:"",employees:"",openTime:"10:00",closeTime:"23:00",areas:[],equipmentBusinessType:"",equipmentSelections:{}}',
  "setup currency state",
);
replaceOnce(
  'function Ble(e,t){return e===1?t.name.trim().length>0&&t.businessType!==""&&t.city.trim().length>0:',
  'function Ble(e,t){return e===1?t.name.trim().length>0&&t.businessType!==""&&t.city.trim().length>0&&bdAccountingCurrencyV243(t.currency)!=="":',
  "setup currency validation",
);
replaceInSection(
  "function Fle(",
  "function Ule(",
  'i.jsxs("div",{children:[i.jsx(ja,{children:"Конкуренты рядом (необязательно)"})',
  'i.jsxs("div",{children:[i.jsx(ja,{children:"Валюта учёта *"}),i.jsx(Gd,{options:bdAccountingCurrencyOptionsV243(),value:e.currency,onChange:a=>t("currency",a),placeholder:"Выберите валюту",sheetTitle:"Валюта учёта"}),i.jsx("p",{className:"text-[11px] text-muted-foreground px-1 mt-1.5 leading-relaxed",children:"Используется для стоимости склада, финансов, отчётов и других денежных показателей заведения."})]}),i.jsxs("div",{children:[i.jsx(ja,{children:"Конкуренты рядом (необязательно)"})',
  "setup currency field",
);
replaceInSection(
  "function Yle(",
  "function Wg(",
  'venueFormat:u.venueFormat.trim(),seats:',
  'venueFormat:u.venueFormat.trim(),currency:bdAccountingCurrencyV243(u.currency),seats:',
  "setup currency payload",
);

replaceOnce(
  'function QCe(e){return e?{name:e.name,businessType:e.businessType,countryCode:',
  'function QCe(e){return e?{name:e.name,businessType:e.businessType,currency:bdAccountingCurrencyV243(e.currency),countryCode:',
  "profile editor currency state",
);
replaceOnce(
  ':{name:"",businessType:"",countryCode:"",city:"",region:"",venueFormat:"",competitorsText:',
  ':{name:"",businessType:"",currency:"",countryCode:"",city:"",region:"",venueFormat:"",competitorsText:',
  "empty profile currency state",
);
replaceInSection(
  "function ZCe(",
  "function JCe(",
  'function y(){const b=As.find',
  'function y(){if(t?.currency&&bdAccountingCurrencyV243(a.currency)!==bdAccountingCurrencyV243(t.currency)&&!window.confirm("Изменить валюту учёта?\\n\\nИсходные суммы и валюты документов не изменятся. Денежные показатели заведения будут отображаться в новой валюте учёта."))return;const b=As.find',
  "currency change warning",
);
replaceInSection(
  "function ZCe(",
  "function JCe(",
  'venueFormat:a.venueFormat.trim(),seats:',
  'venueFormat:a.venueFormat.trim(),currency:bdAccountingCurrencyV243(a.currency),seats:',
  "profile currency payload",
);
replaceInSection(
  "function ZCe(",
  "function JCe(",
  'i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Конкуренты рядом"})',
  'i.jsxs("div",{"data-bd-accounting-currency":"venue-profile-v243",children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Валюта учёта *"}),i.jsx(Gd,{options:bdAccountingCurrencyOptionsV243(),value:a.currency,onChange:b=>f("currency",b),placeholder:"Не выбрана",sheetTitle:"Валюта учёта"}),i.jsx("p",{className:"text-[11px] text-muted-foreground mt-1.5 leading-relaxed",children:"Используется для стоимости склада, финансов, отчётов и других денежных показателей заведения."})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5",children:"Конкуренты рядом"})',
  "profile currency field",
);
replaceInSection(
  "function ZCe(",
  "function JCe(",
  'v=a.name.trim().length>0;',
  'v=a.name.trim().length>0&&bdAccountingCurrencyV243(a.currency)!=="";',
  "profile currency required",
);
replaceInSection(
  "function e_e(",
  "const QI=",
  '[m,h]=S.useState(!1)',
  '[m,h]=S.useState(()=>window.bdReadNavigationQuery("edit","")==="venue")',
  "direct profile currency navigation",
);
replaceInSection(
  "function e_e(",
  "const QI=",
  '(t.businessType||t.city)&&i.jsx("p",{className:"text-[13px] text-muted-foreground font-medium mt-0.5",children:[t.businessType,t.city].filter(Boolean).join(" · ")})',
  '(t.businessType||t.city||t.currency)&&i.jsx("p",{className:"text-[13px] text-muted-foreground font-medium mt-0.5",children:[t.businessType,t.city,t.currency?"Валюта учёта: "+t.currency:"Валюта учёта не выбрана"].filter(Boolean).join(" · ")})',
  "profile currency summary",
);
replaceInSection(
  "function e_e(",
  "const QI=",
  'children:i.jsx($l,{icon:i.jsx(rZ,{className:"w-5 h-5"}),title:"Изменить данные заведения",showChevron:!0,onClick:()=>h(!0),className:"px-4"})',
  'children:i.jsxs(i.Fragment,{children:[i.jsx($l,{icon:i.jsx(lQ,{className:"w-5 h-5"}),title:"Валюта учёта",meta:t?.currency||"Не выбрана",showChevron:!0,onClick:()=>h(!0),className:"px-4"}),i.jsx("div",{className:"mx-4 border-t border-border/60"}),i.jsx($l,{icon:i.jsx(rZ,{className:"w-5 h-5"}),title:"Изменить данные заведения",showChevron:!0,onClick:()=>h(!0),className:"px-4"})]})',
  "profile currency entry",
);

replaceOnce('function Mn(e){return e.toLocaleString("ru-RU")+" ₽"}', 'function Mn(e){return bdAccountingMoneyV243(e)}', "finance formatter");
replaceOnce('function bdDiagnosisMoneyV48(e){const t=Number(e);return Number.isFinite(t)?new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(t)+" ₽":"—"}', 'function bdDiagnosisMoneyV48(e){return bdAccountingMoneyV243(e)}', "AI money formatter");
replaceOnce('function bdEquipmentMoneyV167(e){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Number(e)||0)+" ₽"}', 'function bdEquipmentMoneyV167(e){return bdAccountingMoneyV243(e)}', "equipment money formatter");
replaceOnce('N.toLocaleString("ru-RU")+" ₽"', 'bdAccountingMoneyV243(N)', "health money formatter");
replaceInSection(
  "function e_e(",
  "const QI=",
  'children:["₽",k.toLocaleString("ru")," чек"]',
  'children:[bdAccountingMoneyV243(k,t?.currency)," чек"]',
  "profile average receipt summary",
);
replaceInSection(
  "function ZCe(",
  "function JCe(",
  'children:["₽",d.toLocaleString("ru")," (рассчитан автоматически)"]',
  'children:[bdAccountingMoneyV243(d,a.currency)," (рассчитан автоматически)"]',
  "profile average receipt editor",
);

replaceInSection(
  "function bdWarehousePage(",
  "function bdRecurringSettingsEditor(",
  '}),i.jsxs("section",{className:"bd-warehouse-actions"',
  '}),!bdWarehouseValueSummary.baseCurrency&&i.jsxs("button",{type:"button",className:"bd-warehouse-currency-link-v243",onClick:()=>e("/profile?edit=venue&focus=currency"),children:[i.jsxs("span",{children:[i.jsx("strong",{children:"Валюта учёта не выбрана"}),i.jsx("small",{children:"Настройте один раз в профиле заведения"})]}),i.jsx(Br,{size:16,"aria-hidden":!0})]}),i.jsxs("section",{className:"bd-warehouse-actions"',
  "warehouse profile link",
);

fs.writeFileSync(bundlePath, source);
console.log("Applied accounting currency v243 bundle patch.");
