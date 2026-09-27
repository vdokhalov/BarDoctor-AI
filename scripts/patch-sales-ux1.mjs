import fs from 'node:fs';
const path='public/assets/index-BQGspy0I.js';
let source=fs.readFileSync(path,'utf8');
const before='R=[..._].filter(B=>bdWarehouseMovementFilterV275(B,bdWarehouseMovementFilterV275Value))';
const after='R=[..._].filter(B=>bdWarehouseMovementFilterV275(B,bdWarehouseMovementFilterV275Value)&&(!new URLSearchParams(o).get("sourceDocumentId")||String(B.sourceDocumentId||B.salesBatchId||"")===new URLSearchParams(o).get("sourceDocumentId")))';
if(!source.includes(before)&&!source.includes(after))throw Error('Warehouse sales document filter anchor missing');
source=source.replace(before,after);
const heading='R.length?i.jsx("div",{className:"bd-warehouse-movement-list"';
const replacement='new URLSearchParams(o).get("sourceDocumentId")&&i.jsxs("p",{children:["Движения выбранного документа · ",i.jsx("button",{type:"button",onClick:()=>e(bdWarehouseNavigationUrlV247({sourceDocumentId:null})),children:"Показать все"})]}),R.length?i.jsx("div",{className:"bd-warehouse-movement-list"';
if(!source.includes(replacement))source=source.replace(heading,replacement);
fs.writeFileSync(path,source);
console.log('Sales document movement navigation applied (read-only)');

// Refresh the shared navigation contract after the Sales workspace header polish.
for (const html of ["public/app.html", "dist/client/app.html"]) {
  if (fs.existsSync(html)) fs.writeFileSync(html, fs.readFileSync(html,"utf8").replace(/navigation-contract-v247\.js\?v=[^"\s]+/g,"navigation-contract-v247.js?v=20260927-sales-workspace-ux2"));
}
