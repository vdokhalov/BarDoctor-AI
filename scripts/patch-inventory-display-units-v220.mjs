import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

function replaceOnce(label, from, to) {
  const index = source.indexOf(from);
  if (index < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(from, index + from.length) >= 0) throw new Error(`Duplicate ${label}`);
  source = source.slice(0, index) + to + source.slice(index + from.length);
}

replaceOnce(
  "inventory amount helpers",
  'function bdWarehouseUnit(e){return e==="ml"?"мл":e==="g"?"г":e==="pcs"?"шт.":String(e||"ед.")}\nfunction bdWarehouseDecimal(e,t=2){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:t}).format(bdWarehouseNumber(e))}\nfunction bdWarehouseMoney(e,t="MDL"){return bdWarehouseDecimal(e,2)+" "+String(t||"MDL").toUpperCase()}\nfunction bdWarehouseDisplayAmount(e,t){const n=Math.max(0,bdWarehouseNumber(e?.packageAmount)),r=bdWarehouseNumber(t);return n>0&&e?.packageSize?bdWarehouseDecimal(r/n,2)+" уп. · "+bdWarehouseDecimal(r,2)+" "+bdWarehouseUnit(e.unit):bdWarehouseDecimal(r,2)+" "+bdWarehouseUnit(e?.unit)}\nfunction bdWarehouseInputAmount(e,t){const n=Math.max(0,bdWarehouseNumber(e?.packageAmount));return n>0?bdWarehouseNumber(t)/n:bdWarehouseNumber(t)}\nfunction bdWarehouseBaseAmount(e,t){const n=Math.max(0,bdWarehouseNumber(e?.packageAmount));return Math.round(bdWarehouseNumber(t)*(n>0?n:1)*1e3)/1e3}',
  'function bdWarehouseUnit(e){return e==="ml"?"мл":e==="l"?"л":e==="g"?"г":e==="kg"?"кг":e==="pcs"?"шт.":String(e||"ед.")}\nfunction bdWarehouseDecimal(e,t=2){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:t}).format(bdWarehouseNumber(e))}\nfunction bdWarehouseMoney(e,t="MDL"){return bdWarehouseDecimal(e,2)+" "+String(t||"MDL").toUpperCase()}\nfunction bdWarehouseEffectiveDisplayUnit(e,t){const n=e?.unit,r=String(e?.displayUnit||"auto"),a=Math.abs(bdWarehouseNumber(t));if(n==="ml")return r==="l"||r==="ml"?r:a>=1e3?"l":"ml";if(n==="g")return r==="kg"||r==="g"?r:a>=1e3?"kg":"g";return"pcs"}\nfunction bdWarehouseDisplayPreferenceLabel(e){const t=String(e?.displayUnit||"auto");return t==="auto"?"Автоматически":t==="l"?"Литры":t==="ml"?"Миллилитры":t==="kg"?"Килограммы":t==="g"?"Граммы":"Штуки"}\nfunction bdWarehouseDisplayAmount(e,t){const n=bdWarehouseNumber(t),r=bdWarehouseEffectiveDisplayUnit(e,n),a=r==="l"||r==="kg"?n/1e3:n;return bdWarehouseDecimal(a,3)+" "+bdWarehouseUnit(r)}\nfunction bdWarehouseUsesPackages(e){return!e?.multiplePackageSizes&&String(e?.packageSize||"")!=="Несколько фасовок"&&Math.max(0,bdWarehouseNumber(e?.packageAmount))>0}\nfunction bdWarehouseInputAmount(e,t){const n=bdWarehouseUsesPackages(e)?Math.max(0,bdWarehouseNumber(e?.packageAmount)):0;return n>0?bdWarehouseNumber(t)/n:bdWarehouseNumber(t)}\nfunction bdWarehouseBaseAmount(e,t){const n=bdWarehouseUsesPackages(e)?Math.max(0,bdWarehouseNumber(e?.packageAmount)):0;return Math.round(bdWarehouseNumber(t)*(n>0?n:1)*1e3)/1e3}',
);

replaceOnce(
  "warehouse product form state",
  '[v,b]=S.useState({name:String(e.name||"")==="Товар"?"":String(e.name||""),unit:y,packageSize:String(j)})',
  '[v,b]=S.useState({name:String(e.name||"")==="Товар"?"":String(e.name||""),unit:y,displayUnit:String(e.displayUnit||"auto"),packageSize:String(j)})',
);

replaceOnce(
  "warehouse product save payload",
  'name:v.name.trim(),unit:v.unit,packageSize:v.packageSize.trim()})',
  'name:v.name.trim(),unit:v.unit,displayUnit:v.displayUnit,packageSize:v.packageSize.trim()})',
);

replaceOnce(
  "warehouse unit and package fields",
  'i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Складская единица"}),i.jsxs("select",{value:v.unit,disabled:E,onChange:B=>b(U=>({...U,unit:B.target.value})),children:[i.jsx("option",{value:"ml",children:"мл — жидкости"}),i.jsx("option",{value:"g",children:"г — вес"}),i.jsx("option",{value:"pcs",children:"шт. — поштучно"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Фасовка прихода"})',
  'i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Тип складского учёта"}),i.jsxs("select",{value:v.unit,disabled:E,onChange:B=>b(U=>({...U,unit:B.target.value,displayUnit:"auto"})),children:[i.jsx("option",{value:"ml",children:"Жидкость"}),i.jsx("option",{value:"g",children:"Вес"}),i.jsx("option",{value:"pcs",children:"Поштучно"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Показывать остаток"}),i.jsxs("select",{value:v.displayUnit,onChange:B=>b(U=>({...U,displayUnit:B.target.value})),children:[i.jsx("option",{value:"auto",children:"Автоматически"}),...(v.unit==="ml"?[i.jsx("option",{value:"l",children:"В литрах"}),i.jsx("option",{value:"ml",children:"В миллилитрах"})]:v.unit==="g"?[i.jsx("option",{value:"kg",children:"В килограммах"}),i.jsx("option",{value:"g",children:"В граммах"})]:[i.jsx("option",{value:"pcs",children:"В штуках"})])]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Фасовка прихода"})',
);

replaceOnce(
  "warehouse product help",
  'Склад хранит жидкости в мл, вес в граммах, штучный товар — в штуках. Фасовка определяет, сколько базовых единиц в одной бутылке, пачке или коробке.',
  'Остаток хранится точно, а показывается в выбранной единице. Фасовка — это размер бутылки, пачки или коробки при приходе; она не превращает весь остаток в «упаковки».',
);

replaceOnce(
  "warehouse multiple-package field",
  'i.jsx("input",{value:v.packageSize,onChange:B=>b(U=>({...U,packageSize:B.target.value})),placeholder:v.unit==="ml"?"0,5 л":v.unit==="g"?"1 кг":"1 шт."})',
  'i.jsx("input",{value:v.packageSize,disabled:e.multiplePackageSizes===!0,onChange:B=>b(U=>({...U,packageSize:B.target.value})),placeholder:v.unit==="ml"?"0,5 л":v.unit==="g"?"1 кг":"1 шт."})',
);

replaceOnce(
  "warehouse multiple-package explanation",
  'i.jsx("p",{children:"Остаток хранится точно, а показывается в выбранной единице. Фасовка — это размер бутылки, пачки или коробки при приходе; она не превращает весь остаток в «упаковки»."})',
  'i.jsx("p",{children:"Остаток хранится точно, а показывается в выбранной единице. Фасовка — это размер бутылки, пачки или коробки при приходе; она не превращает весь остаток в «упаковки»."}),e.multiplePackageSizes===!0&&i.jsx("p",{children:"У товара несколько фасовок из накладных. Они сохраняются отдельно и не складываются в одну условную упаковку."})',
);

replaceOnce(
  "warehouse display unit detail",
  'i.jsxs("div",{children:[i.jsx("dt",{children:"Единица учёта"}),i.jsx("dd",{children:bdWarehouseUnit(e.unit)})]}),i.jsxs("div",{children:[i.jsx("dt",{children:"Источник"})',
  'i.jsxs("div",{children:[i.jsx("dt",{children:"Тип учёта"}),i.jsx("dd",{children:e.unit==="ml"?"Жидкость":e.unit==="g"?"Вес":"Поштучно"})]}),i.jsxs("div",{children:[i.jsx("dt",{children:"Отображение"}),i.jsx("dd",{children:bdWarehouseDisplayPreferenceLabel(e)})]}),i.jsxs("div",{children:[i.jsx("dt",{children:"Источник"})',
);

replaceOnce(
  "canonical display settings",
  'packageSize:u.packageSize||l.packageSize,packageAmount:u.packageAmount||l.packageAmount,active:u.active!==!1',
  'packageSize:u.packageSize||l.packageSize,packageAmount:u.multiplePackageSizes?0:bdWarehouseNumber(u.packageAmount)>0?u.packageAmount:l.packageAmount,multiplePackageSizes:u.multiplePackageSizes||l.multiplePackageSizes,displayUnit:u.displayUnit||l.displayUnit||"auto",active:u.active!==!1',
);

replaceOnce(
  "nomenclature initial display setting",
  'unit:["ml","g","pcs"].includes(e?.unit)?e.unit:"pcs",packageSize:String(e?.packageSize',
  'unit:["ml","g","pcs"].includes(e?.unit)?e.unit:"pcs",displayUnit:String(e?.displayUnit||"auto"),packageSize:String(e?.packageSize',
);

replaceOnce(
  "nomenclature unit and package fields",
  'i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Единица складского учёта"}),i.jsxs("select",{value:u.unit,onChange:P=>E("unit",P.target.value),children:[i.jsx("option",{value:"ml",children:"мл — жидкости"}),i.jsx("option",{value:"g",children:"г — вес"}),i.jsx("option",{value:"pcs",children:"шт. — поштучно"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Фасовка прихода"})',
  'i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Тип складского учёта"}),i.jsxs("select",{value:u.unit,onChange:P=>{E("unit",P.target.value),E("displayUnit","auto")},children:[i.jsx("option",{value:"ml",children:"Жидкость"}),i.jsx("option",{value:"g",children:"Вес"}),i.jsx("option",{value:"pcs",children:"Поштучно"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Показывать остаток"}),i.jsxs("select",{value:u.displayUnit,onChange:P=>E("displayUnit",P.target.value),children:[i.jsx("option",{value:"auto",children:"Автоматически"}),...(u.unit==="ml"?[i.jsx("option",{value:"l",children:"В литрах"}),i.jsx("option",{value:"ml",children:"В миллилитрах"})]:u.unit==="g"?[i.jsx("option",{value:"kg",children:"В килограммах"}),i.jsx("option",{value:"g",children:"В граммах"})]:[i.jsx("option",{value:"pcs",children:"В штуках"})])]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Фасовка прихода"})',
);

replaceOnce(
  "nomenclature multiple-package field",
  'i.jsx("input",{value:u.packageSize,onChange:P=>E("packageSize",P.target.value),placeholder:u.unit==="ml"?"1 л":u.unit==="g"?"1 кг":"1 шт."})',
  'i.jsx("input",{value:u.packageSize,disabled:e?.multiplePackageSizes===!0,onChange:P=>E("packageSize",P.target.value),placeholder:u.unit==="ml"?"1 л":u.unit==="g"?"1 кг":"1 шт."})',
);

replaceOnce(
  "inventory count package availability",
  'V=Math.max(0,bdWarehouseNumber(B.packageAmount))',
  'V=bdWarehouseUsesPackages(B)?Math.max(0,bdWarehouseNumber(B.packageAmount)):0',
);

await writeFile(bundlePath, source);
console.log("Inventory display units v220 applied");
