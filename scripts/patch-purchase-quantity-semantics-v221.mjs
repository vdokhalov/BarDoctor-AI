import fs from "node:fs";

const file = "public/assets/index-BQGspy0I.js";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  "function bdProcPackageUpdateV209(e){return{packageSize:e,unit:bdProcPackageUnitV209(e)}}",
  `function bdProcPackageUpdateV209(e){return{packageSize:e}}
const bdProcQuantityUnitsV221=[["шт.","штуки"],["уп.","упаковки"],["л","литры"],["мл","миллилитры"],["кг","килограммы"],["г","граммы"],["усл.","услуги"]];
function bdProcQuantityModeV221(e){return/^(л|l|литр|мл|ml|миллилитр|кг|kg|килограмм|г|гр|g|грамм)/i.test(String(e||"").trim())?"measure":"count"}
function bdProcFormatAmountV221(e,t){const n=Math.round((Number(e)||0)*1e3)/1e3;return String(n).replace(".",",")+" "+t}
function bdProcPurchaseBaseV221(e){const t=Math.max(0,Number(e?.quantity)||0),n=String(e?.unit||"шт.").trim().toLowerCase();if(/^(л|l|литр)/.test(n))return{amount:t*1e3,unit:"мл"};if(/^(мл|ml|миллилитр)/.test(n))return{amount:t,unit:"мл"};if(/^(кг|kg|килограмм)/.test(n))return{amount:t*1e3,unit:"г"};if(/^(г|гр|g|грамм)/.test(n))return{amount:t,unit:"г"};const r=String(e?.packageSize||"").toLowerCase().replace(",","."),a=r.match(/(\\d+(?:\\.\\d+)?)\\s*(мл|ml|л|l|кг|kg|г|гр|g|шт)/);if(!a)return{amount:t,unit:"шт."};const s=Number(a[1])||0,l=a[2];return/^(л|l)$/.test(l)?{amount:t*s*1e3,unit:"мл"}:/^(мл|ml)$/.test(l)?{amount:t*s,unit:"мл"}:/^(кг|kg)$/.test(l)?{amount:t*s*1e3,unit:"г"}:/^(г|гр|g)$/.test(l)?{amount:t*s,unit:"г"}:{amount:t*s,unit:"шт."}}
function bdProcStockPreviewV221(e){const t=bdProcPurchaseBaseV221(e);return t.unit==="мл"&&t.amount>=1e3?bdProcFormatAmountV221(t.amount/1e3,"л"):t.unit==="г"&&t.amount>=1e3?bdProcFormatAmountV221(t.amount/1e3,"кг"):bdProcFormatAmountV221(t.amount,t.unit)}
function bdProcPurchaseLineLabelV221(e){return bdProcQuantityModeV221(e?.unit)==="measure"?bdProcFormatAmountV221(e?.quantity,e?.unit||"ед."):String(Number(e?.quantity)||0)+" "+String(e?.unit||"шт.")+" × "+String(e?.packageSize||"1 шт.")+" = "+bdProcStockPreviewV221(e)}`,
  "quantity semantics helpers",
);

replaceOnce(
  'id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",packageSize:"",unitPrice:0',
  'id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",quantityMode:"count",packageSize:"",unitPrice:0',
  "new line defaults",
);

const oldFields = 'i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Количество",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:g.quantity,onChange:j=>u(g.id,{quantity:j.target.value})})}),i.jsx(bdProcField,{label:"Фасовка одной единицы",children:i.jsxs("div",{className:"bd-procurement-package-editor-v209",children:[i.jsxs("select",{"aria-label":"Выбрать стандартную фасовку",value:bdProcPackagePresetsV209.includes(bdProcCurrentPackageV209(g))?bdProcCurrentPackageV209(g):"",onChange:j=>{const v=j.target.value;v&&u(g.id,bdProcPackageUpdateV209(v))},children:[i.jsx("option",{value:"",children:"Выбрать фасовку"}),...bdProcPackageGroupsV209.map(j=>i.jsx("optgroup",{label:j.label,children:j.options.map(v=>i.jsx("option",{value:v,children:v},v))},j.label))]}),i.jsx("input",{"aria-label":"Своя фасовка",value:bdProcCurrentPackageV209(g),onChange:j=>u(g.id,bdProcPackageUpdateV209(j.target.value)),placeholder:"Или введите свою: 0,9 л"})]})})]})';
const newFields = 'i.jsxs(i.Fragment,{children:[i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Количество",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:g.quantity,onChange:j=>u(g.id,{quantity:j.target.value})})}),i.jsx(bdProcField,{label:"Единица количества",children:i.jsx("select",{value:g.unit||"шт.",onChange:j=>u(g.id,{unit:j.target.value,quantityMode:bdProcQuantityModeV221(j.target.value)}),children:bdProcQuantityUnitsV221.map(([j,v])=>i.jsx("option",{value:j,children:v},j))})})]}),i.jsx(bdProcField,{label:"Фасовка одной единицы",children:i.jsxs("div",{className:"bd-procurement-package-editor-v209",children:[i.jsxs("select",{"aria-label":"Выбрать стандартную фасовку",value:bdProcPackagePresetsV209.includes(bdProcCurrentPackageV209(g))?bdProcCurrentPackageV209(g):"",onChange:j=>{const v=j.target.value;v&&u(g.id,bdProcPackageUpdateV209(v))},children:[i.jsx("option",{value:"",children:"Выбрать фасовку"}),...bdProcPackageGroupsV209.map(j=>i.jsx("optgroup",{label:j.label,children:j.options.map(v=>i.jsx("option",{value:v,children:v},v))},j.label))]}),i.jsx("input",{"aria-label":"Своя фасовка",value:bdProcCurrentPackageV209(g),onChange:j=>u(g.id,bdProcPackageUpdateV209(j.target.value)),placeholder:"Например: 0,5 л"})]})}),i.jsxs("div",{className:"bd-procurement-stock-preview-v221",children:[i.jsx("span",{children:"На склад поступит"}),i.jsx("strong",{children:bdProcStockPreviewV221(g)})]})]})';
replaceOnce(oldFields, newFields, "purchase quantity fields");

replaceOnce(
  'children:[Number(o.quantity)||0," × ",o.packageSize||o.unit||"ед.",Number(o.unitPrice)>0?" · "+bdProcMoney(o.unitPrice,d)+"/ед.":""]',
  'children:[bdProcPurchaseLineLabelV221(o),Number(o.unitPrice)>0?" · "+bdProcMoney(o.unitPrice,d)+"/ед.":""]',
  "document line label",
);

fs.writeFileSync(file, source);
