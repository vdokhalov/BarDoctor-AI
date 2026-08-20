import fs from "node:fs";

const path = "public/assets/index-BQGspy0I.js";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(label, from, to) {
  const index = source.indexOf(from);
  if (index < 0) throw new Error(`Не найден фрагмент: ${label}`);
  if (source.indexOf(from, index + from.length) >= 0) {
    throw new Error(`Фрагмент найден больше одного раза: ${label}`);
  }
  source = source.slice(0, index) + to + source.slice(index + from.length);
}

replaceOnce(
  "метаданные складского остатка из техкарты",
  "return{key:H,current:Math.max(0,bdCatNumber(G.current)),safety:Math.max(0,bdCatNumber(G.safety)),onOrder:Math.max(0,bdCatNumber(G.onOrder)),packageAmount:Math.max(0,bdCatNumber(G.packageAmount)),unit:bdCatToBase(R.quantity,R.unit).unit,checkedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}",
  "return{key:H,productKey:H,name:R.name,category:R.category||\"other\",current:Math.max(0,bdCatNumber(G.current)),safety:Math.max(0,bdCatNumber(G.safety)),onOrder:Math.max(0,bdCatNumber(G.onOrder)),packageAmount:Math.max(0,bdCatNumber(G.packageAmount)),unit:bdCatToBase(R.quantity,R.unit).unit,metadataSource:\"recipe\",checkedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}",
);

const productSheet = String.raw`
function bdWarehouseProductSheet({product:e,movements:t,canEdit:n,onClose:r,onSaved:a}){const{toast:s}=sn(),[l,u]=S.useState(!1),[d,f]=S.useState(!1),[m,h]=S.useState(""),g=bdWarehouseKey(e),y=["ml","g","pcs"].includes(e.unit)?e.unit:"pcs",j=e.packageSize||("1 "+bdWarehouseUnit(y)),[v,b]=S.useState({name:String(e.name||"")==="Товар"?"":String(e.name||""),unit:y,packageSize:String(j)}),N=(Array.isArray(t)?t:[]).some(B=>bdWarehouseKey(B)===g),E=Math.abs(bdWarehouseNumber(e.current))>.0001||N,_=Math.max(0,Math.round(bdWarehouseNumber(e.linkedRecipeCount))),T=e.lastPurchaseAt?"Приходная накладная":_>0||e.metadataSource==="recipe"?"Техкарта":"Вручную";
async function A(){if(d||!v.name.trim()||!v.packageSize.trim())return;f(!0),h("");try{const B=await fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update",productKey:g,name:v.name.trim(),unit:v.unit,packageSize:v.packageSize.trim()})}),U=await B.json();if(!B.ok||!U?.ok)throw new Error(U?.error||"Не удалось сохранить карточку товара");a(U),s({variant:"success",title:"Карточка товара сохранена",description:U.linkedRecipes?"Связанные техкарты обновлены: "+U.linkedRecipes:"Название и фасовка обновлены."})}catch(B){h(B instanceof Error?B.message:"Не удалось сохранить карточку товара")}finally{f(!1)}}
return i.jsxs(i.Fragment,{children:[i.jsx(W.div,{className:"fixed inset-0 bg-foreground/40 z-[60]",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:r}),i.jsxs(W.section,{className:"bd-warehouse-product-sheet fixed inset-x-0 bottom-0 z-[70] bg-white",style:{margin:"0 auto"},initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},children:[i.jsx("div",{className:"bd-warehouse-product-handle"}),i.jsxs("header",{className:"bd-warehouse-product-head",children:[i.jsxs("div",{children:[i.jsx("p",{children:l?"Настройка учёта":"Карточка склада"}),i.jsx("h2",{children:l?"Изменить товар":e.name||"Позиция без названия"})]}),i.jsx("button",{type:"button","aria-label":"Закрыть карточку товара",onClick:r,children:"×"})]}),l?i.jsxs("div",{className:"bd-warehouse-product-body",children:[i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Название товара"}),i.jsx("input",{value:v.name,onChange:B=>b(U=>({...U,name:B.target.value})),placeholder:"Например, Coca-Cola 0,5 л",autoFocus:!0})]}),i.jsxs("div",{className:"bd-warehouse-product-form-grid",children:[i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Складская единица"}),i.jsxs("select",{value:v.unit,disabled:E,onChange:B=>b(U=>({...U,unit:B.target.value})),children:[i.jsx("option",{value:"ml",children:"мл — жидкости"}),i.jsx("option",{value:"g",children:"г — вес"}),i.jsx("option",{value:"pcs",children:"шт. — поштучно"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Фасовка прихода"}),i.jsx("input",{value:v.packageSize,onChange:B=>b(U=>({...U,packageSize:B.target.value})),placeholder:v.unit==="ml"?"0,5 л":v.unit==="g"?"1 кг":"1 шт."})]})]}),i.jsxs("div",{className:"bd-warehouse-product-help",children:[i.jsx("b",{children:"Как это работает"}),i.jsx("p",{children:"Склад хранит жидкости в мл, вес в граммах, штучный товар — в штуках. Фасовка определяет, сколько базовых единиц в одной бутылке, пачке или коробке."}),E&&i.jsx("p",{className:"warning",children:"Базовая единица заблокирована, потому что по товару уже есть остаток или движения. Название и фасовку можно исправить безопасно."})]}),m&&i.jsx("div",{className:"bd-inventory-error",children:m}),i.jsxs("div",{className:"bd-warehouse-product-actions",children:[i.jsx("button",{type:"button",className:"secondary",onClick:()=>{u(!1),h("")},children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:d||!v.name.trim()||!v.packageSize.trim(),onClick:A,children:d?"Сохраняю…":"Сохранить"})]})]}):i.jsxs("div",{className:"bd-warehouse-product-body",children:[i.jsxs("div",{className:"bd-warehouse-product-summary",children:[i.jsxs("article",{children:[i.jsx("span",{children:"Расчётный остаток"}),i.jsx("strong",{children:bdWarehouseDisplayAmount(e,e.current)})]}),i.jsxs("article",{children:[i.jsx("span",{children:"Стоимость"}),i.jsx("strong",{children:bdWarehouseMoney(e.inventoryValue,e.currency||"MDL")})]})]}),i.jsxs("dl",{className:"bd-warehouse-product-details",children:[i.jsxs("div",{children:[i.jsx("dt",{children:"Фасовка"}),i.jsx("dd",{children:e.packageSize||bdWarehouseUnit(e.unit)})]}),i.jsxs("div",{children:[i.jsx("dt",{children:"Единица учёта"}),i.jsx("dd",{children:bdWarehouseUnit(e.unit)})]}),i.jsxs("div",{children:[i.jsx("dt",{children:"Источник"}),i.jsx("dd",{children:T})]}),i.jsxs("div",{children:[i.jsx("dt",{children:"Последний приход"}),i.jsx("dd",{children:e.lastPurchaseAt?sg(e.lastPurchaseAt):"Приходов ещё не было"})]}),_>0&&i.jsxs("div",{children:[i.jsx("dt",{children:"Связь"}),i.jsxs("dd",{children:[_," ",_===1?"техкарта":"техкарты"]})]})]}),(!e.name||e.name==="Товар")&&i.jsxs("div",{className:"bd-inventory-warning",children:[i.jsx("b",{children:"Название не сохранилось"}),i.jsx("p",{children:"Это техническая карточка из старой версии. Введите настоящее название — остаток и связи сохранятся."})]}),i.jsxs("div",{className:"bd-warehouse-product-actions",children:[_>0&&i.jsx("button",{type:"button",className:"secondary",onClick:()=>window.location.assign("/catalog"),children:"Открыть техкарты"}),n&&i.jsx("button",{type:"button",className:"primary",onClick:()=>u(!0),children:"Редактировать"})]})]})]})]})}
`;

replaceOnce(
  "форма складского товара",
  "function bdInventoryCountSheet",
  productSheet + "function bdInventoryCountSheet",
);

replaceOnce(
  "состояние выбранного товара",
  "[O,M]=S.useState(!1),D=S.useRef(null),z=typeof window.bdHasClientPermission",
  "[O,M]=S.useState(!1),[P,C]=S.useState(null),D=S.useRef(null),z=typeof window.bdHasClientPermission",
);

replaceOnce(
  "восстановление карточек склада",
  "S.useEffect(()=>{t&&L()},[t])",
  "async function bdWarehouseRepairProducts(){try{const B=await fetch(\"/api/inventory/products\",{method:\"POST\",credentials:\"include\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({action:\"repair\"})}),U=await B.json();if(B.ok&&U?.ok&&U.assortment){Kse(\"bd_assortment_v1\",U.assortment);const Q=Array.isArray(U.assortment.stockBalances)?U.assortment.stockBalances.map(bdWarehouseRecord):[];E(Q)}}catch{}}S.useEffect(()=>{t&&(L(),bdWarehouseRepairProducts())},[t])",
);

replaceOnce(
  "применение изменения карточки",
  "function we(B){a(B),j(!1),l({variant:\"success\",title:\"Списание сохранено\"})}",
  "function we(B){a(B),j(!1),l({variant:\"success\",title:\"Списание сохранено\"})}function bdWarehouseProductSaved(B){if(B.assortment){Kse(\"bd_assortment_v1\",B.assortment);E(Array.isArray(B.assortment.stockBalances)?B.assortment.stockBalances.map(bdWarehouseRecord):[])}C(null)}",
);

const stockStart = source.indexOf('F.length?i.jsx("div",{className:"bd-warehouse-stock-grid",children:F.map(B=>{');
if (stockStart < 0) throw new Error("Не найден список карточек склада");
const stockEndMarker = ':i.jsxs("div",{className:"bd-warehouse-empty"';
const stockEnd = source.indexOf(stockEndMarker, stockStart);
if (stockEnd < 0) throw new Error("Не найдено пустое состояние склада");
const stockCards = String.raw`F.length?i.jsx("div",{className:"bd-warehouse-stock-grid",children:F.map(B=>{const U=bdWarehouseNumber(B.current),Q=U<0?"negative":U===0?"zero":"ok";return i.jsxs("button",{type:"button",className:"bd-warehouse-stock-card "+Q,onClick:()=>C(B),"aria-label":"Открыть карточку "+String(B.name||"товара"),children:[i.jsxs("div",{className:"bd-warehouse-stock-top",children:[i.jsxs("div",{children:[i.jsx("h4",{children:B.name||"Позиция без названия"}),i.jsx("p",{children:B.packageSize||bdWarehouseUnit(B.unit)})]}),i.jsx("span",{children:Q==="negative"?"Ниже нуля":Q==="zero"?"Нет остатка":"Актуально"})]}),i.jsx("strong",{className:"bd-warehouse-stock-amount",children:bdWarehouseDisplayAmount(B,U)}),i.jsxs("div",{className:"bd-warehouse-stock-meta",children:[i.jsxs("span",{children:["Стоимость: ",i.jsx("b",{children:bdWarehouseMoney(B.inventoryValue,B.currency||"MDL")})]}),i.jsxs("span",{children:["Последний приход: ",i.jsx("b",{children:B.lastPurchaseAt?sg(B.lastPurchaseAt):"нет"})]})]}),i.jsxs("span",{className:"bd-warehouse-stock-open",children:["Открыть карточку",i.jsx("b",{children:"→"})]})]},bdWarehouseKey(B))})})`;
source = source.slice(0, stockStart) + stockCards + source.slice(stockEnd);

replaceOnce(
  "рендер карточки товара",
  "i.jsx(qe,{children:h&&i.jsx(bdInventoryCountSheet",
  "i.jsx(qe,{children:P&&i.jsx(bdWarehouseProductSheet,{product:P,movements:_,canEdit:z,onClose:()=>C(null),onSaved:bdWarehouseProductSaved},bdWarehouseKey(P))}),i.jsx(qe,{children:h&&i.jsx(bdInventoryCountSheet",
);

replaceOnce(
  "версия интерфейса склада",
  '"data-bd-warehouse-version":"ledger-v76"',
  '"data-bd-warehouse-version":"product-cards-v78"',
);

replaceOnce(
  "версия релиз-кандидата",
  'const bdReleaseCandidateVersion="rc-v77"',
  'const bdReleaseCandidateVersion="rc-v78"',
);

fs.writeFileSync(path, source);
console.log("Warehouse product cards v78 applied");
