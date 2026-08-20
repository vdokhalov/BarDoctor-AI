import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  if (source.includes(after)) return;
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Ambiguous ${label}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

const nomenclatureModule = String.raw`
function bdNomenclatureItems(e){const t=bdWarehouseRecord(e),n=Array.isArray(t.nomenclature)?t.nomenclature.map(bdWarehouseRecord):[],r=Array.isArray(t.stockBalances)?t.stockBalances.map(bdWarehouseRecord):[],a=new Map;for(const l of n){const u=bdWarehouseKey(l);u&&a.set(u,{...l,kind:l.kind==="service"?"service":"stock"})}for(const l of r){const u=bdWarehouseKey(l);if(!u)continue;const d=a.get(u);a.set(u,d?{...l,...d,current:l.current,averageUnitCost:l.averageUnitCost,inventoryValue:l.inventoryValue,currency:l.currency,lastPurchaseAt:d.lastPurchaseAt||l.lastPurchaseAt,kind:"stock"}:{...l,kind:"stock",active:l.active!==!1})}return[...a.values()].sort((l,u)=>String(l.name||"").localeCompare(String(u.name||""),"ru"))}
function bdWarehouseCanonicalBalances(e){const t=bdWarehouseRecord(e),n=Array.isArray(t.nomenclature)?t.nomenclature.map(bdWarehouseRecord):[],r=new Map(n.map(l=>[bdWarehouseKey(l),l]));return(Array.isArray(t.stockBalances)?t.stockBalances:[]).map(bdWarehouseRecord).map(l=>{const u=r.get(bdWarehouseKey(l));return u?{...l,name:u.name||l.name,category:u.category||l.category,unit:u.unit||l.unit,packageSize:u.packageSize||l.packageSize,packageAmount:u.packageAmount||l.packageAmount,active:u.active!==!1}:l})}
function bdNomenclatureKindLabel(e){return e==="service"?"Услуга":"Товар"}
function bdNomenclatureCategoryLabel(e){return bdProcCategoryLabels[e]||"Прочее"}
function bdNomenclatureSheet({product:e,canEdit:t,onClose:n,onSaved:r}){const{toast:a}=sn(),s=bdWarehouseKey(e),l=e?.kind==="service"?"service":"stock",[u,d]=S.useState({name:String(e?.name||""),kind:l,category:String(e?.category||(l==="service"?"other":"products")),unit:["ml","g","pcs"].includes(e?.unit)?e.unit:"pcs",packageSize:String(e?.packageSize||(l==="service"?"1 усл.":"1 шт.")),active:e?.active!==!1}),[f,m]=S.useState(!1),[h,g]=S.useState("");function y(v,b){d(N=>({...N,[v]:b,...v==="kind"&&b==="service"?{unit:"pcs",packageSize:"1 усл.",category:"other"}:{}}))}async function j(){if(!t||f||!u.name.trim()||u.kind==="stock"&&!u.packageSize.trim())return;m(!0),g("");try{const v=await fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:s?"update":"create",productKey:s||void 0,name:u.name.trim(),kind:u.kind,category:u.category,unit:u.kind==="service"?"service":u.unit,packageSize:u.kind==="service"?u.packageSize||"1 усл.":u.packageSize.trim(),active:u.active})}),b=await v.json();if(!v.ok||!b?.ok)throw new Error(b?.error||"Не удалось сохранить позицию");r(b),a({variant:"success",title:s?"Позиция обновлена":"Позиция добавлена",description:u.kind==="stock"?"Название связано со складскими остатками.":"Услуга сохранена без складского учёта."})}catch(v){g(v instanceof Error?v.message:"Не удалось сохранить позицию")}finally{m(!1)}}return i.jsxs(i.Fragment,{children:[i.jsx(W.div,{className:"fixed inset-0 bg-foreground/40 z-[60]",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:n}),i.jsxs(W.section,{className:"bd-warehouse-product-sheet bd-nomenclature-sheet-v208 fixed inset-x-0 bottom-0 z-[70] bg-white",style:{margin:"0 auto"},initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},children:[i.jsx("div",{className:"bd-warehouse-product-handle"}),i.jsxs("header",{className:"bd-warehouse-product-head",children:[i.jsxs("div",{children:[i.jsx("p",{children:s?"Карточка номенклатуры":"Новая позиция"}),i.jsx("h2",{children:s?e.name:"Добавить позицию"})]}),i.jsx("button",{type:"button","aria-label":"Закрыть карточку",onClick:n,children:"×"})]}),i.jsxs("div",{className:"bd-warehouse-product-body",children:[i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Название"}),i.jsx("input",{value:u.name,onChange:v=>y("name",v.target.value),placeholder:u.kind==="service"?"Например, обслуживание кассы":"Например, Coca-Cola 0,5 л",autoFocus:!0})]}),i.jsxs("div",{className:"bd-nomenclature-form-grid-v208",children:[i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Тип позиции"}),i.jsxs("select",{value:u.kind,disabled:!!s,onChange:v=>y("kind",v.target.value),children:[i.jsx("option",{value:"stock",children:"Товар — учитывать на складе"}),i.jsx("option",{value:"service",children:"Услуга — без склада"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Категория"}),i.jsx("select",{value:u.category,onChange:v=>y("category",v.target.value),children:Object.entries(bdProcCategoryLabels).map(([v,b])=>i.jsx("option",{value:v,children:b},v))})]})]}),u.kind==="stock"&&i.jsxs("div",{className:"bd-nomenclature-form-grid-v208",children:[i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Складская единица"}),i.jsxs("select",{value:u.unit,onChange:v=>y("unit",v.target.value),children:[i.jsx("option",{value:"ml",children:"мл — жидкости"}),i.jsx("option",{value:"g",children:"г — вес"}),i.jsx("option",{value:"pcs",children:"шт. — поштучно"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Фасовка прихода"}),i.jsx("input",{value:u.packageSize,onChange:v=>y("packageSize",v.target.value),placeholder:u.unit==="ml"?"0,5 л":u.unit==="g"?"1 кг":"1 шт."})]})]}),u.kind==="service"&&i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Единица услуги"}),i.jsx("input",{value:u.packageSize,onChange:v=>y("packageSize",v.target.value),placeholder:"1 усл."})]}),s&&i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Статус"}),i.jsxs("select",{value:u.active?"active":"archive",onChange:v=>y("active",v.target.value==="active"),children:[i.jsx("option",{value:"active",children:"Активна"}),i.jsx("option",{value:"archive",children:"В архиве"})]})]}),i.jsxs("div",{className:"bd-warehouse-product-help",children:[i.jsx("b",{children:u.kind==="stock"?"Связь со складом":"Без складского движения"}),i.jsx("p",{children:u.kind==="stock"?"Остатки, инвентаризации и движения используют название из этой карточки. Количество и история хранятся отдельно и не теряются при переименовании.":"Покупка услуги попадёт в расходы и историю закупок, но не изменит складские остатки."})]}),h&&i.jsx("div",{className:"bd-inventory-error",children:h}),i.jsxs("div",{className:"bd-warehouse-product-actions",children:[i.jsx("button",{type:"button",className:"secondary",onClick:n,children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:!t||f||!u.name.trim()||u.kind==="stock"&&!u.packageSize.trim(),onClick:j,children:f?"Сохраняю…":"Сохранить"})]})]})]})]})}
function bdNomenclaturePage(){const[,e]=bt(),{isReady:t}=Ai(),{toast:n}=sn(),[r,a]=S.useState(()=>bdWarehouseRecord(xr("bd_assortment_v1"))),[s,l]=S.useState(""),[u,d]=S.useState("all"),[f,m]=S.useState(null),h=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner";function g(){a(bdWarehouseRecord(xr("bd_assortment_v1")))}S.useEffect(()=>{t&&g()},[t]),S.useEffect(()=>{const v=b=>{b?.detail?.storeKey==="bd_assortment_v1"&&g()};return window.addEventListener("bd:store-updated",v),()=>window.removeEventListener("bd:store-updated",v)},[]);const y=bdNomenclatureItems(r),j=y.filter(v=>v.active!==!1),b=y.filter(v=>v.kind==="stock"&&v.active!==!1),N=y.filter(v=>v.kind==="service"&&v.active!==!1),E=y.filter(v=>v.active===!1),_=y.filter(v=>{const P=(String(v.name||"")+" "+bdNomenclatureCategoryLabel(v.category)).toLocaleLowerCase("ru"),C=!s||P.includes(s.toLocaleLowerCase("ru")),D=u==="all"?v.active!==!1:u==="inactive"?v.active===!1:v.active!==!1&&v.kind===u;return C&&D});function T(v){if(v.assortment){Kse("bd_assortment_v1",v.assortment),a(bdWarehouseRecord(v.assortment))}m(null)}return i.jsx(nt,{showBottomNav:!0,className:"pb-32",children:i.jsxs($e,{className:"pt-0",children:[i.jsx(bdAccountingHeader,{title:"Номенклатура",back:"/more",right:h?i.jsx("button",{type:"button",onClick:()=>m({kind:"stock",active:!0}),className:"text-[13px] font-bold text-primary",children:"+ Добавить"}):null}),i.jsxs("main",{"data-bd-nomenclature-version":"v208",className:"bd-nomenclature-main-v208",children:[i.jsxs("section",{className:"bd-nomenclature-hero-v208",children:[i.jsx("p",{children:"Единый справочник"}),i.jsx("h2",{children:"Товары, расходники и услуги"}),i.jsx("span",{children:"Здесь задаются названия и правила учёта. Склад, закупки и техкарты используют одни и те же карточки без дублей."}),i.jsxs("div",{className:"bd-nomenclature-hero-actions-v208",children:[h&&i.jsx("button",{type:"button",className:"primary",onClick:()=>m({kind:"stock",active:!0}),children:"Добавить позицию"}),i.jsx("button",{type:"button",onClick:()=>e("/suppliers?create=1&returnTo=nomenclature"),children:"Добавить покупку"}),i.jsx("button",{type:"button",onClick:()=>e("/warehouse"),children:"Открыть остатки"})]})]}),i.jsx("section",{className:"bd-nomenclature-summary-v208",children:[[j.length,"Активных"],[b.length,"Со складским учётом"],[N.length,"Услуг"],[E.length,"В архиве"]].map(([v,P])=>i.jsxs("article",{children:[i.jsx("strong",{children:v}),i.jsx("span",{children:P})]},P))}),i.jsxs("section",{className:"bd-nomenclature-catalog-v208",children:[i.jsxs("div",{className:"bd-nomenclature-toolbar-v208",children:[i.jsx("input",{value:s,onChange:v=>l(v.target.value),placeholder:"Найти позицию…","aria-label":"Поиск по номенклатуре"}),i.jsx("div",{className:"bd-nomenclature-filters-v208","aria-label":"Фильтр номенклатуры",children:[["all","Все"],["stock","Товары"],["service","Услуги"],["inactive","Архив"]].map(([v,P])=>i.jsx("button",{type:"button",className:u===v?"active":"",onClick:()=>d(v),children:P},v))})]}),_.length?i.jsx("div",{className:"bd-nomenclature-list-v208",children:_.map(v=>{const P=v.kind==="service",C=bdWarehouseNumber(v.current),D=v.active===!1;return i.jsxs("button",{type:"button",className:"bd-nomenclature-card-v208 "+(D?"archived":""),onClick:()=>m(v),children:[i.jsx("span",{className:"bd-nomenclature-type-v208 "+(P?"service":"stock"),children:P?"У":"Т"}),i.jsxs("span",{className:"bd-nomenclature-copy-v208",children:[i.jsx("strong",{children:v.name||"Позиция без названия"}),i.jsxs("small",{children:[bdNomenclatureCategoryLabel(v.category)," · ",P?v.packageSize||"услуга":v.packageSize||bdWarehouseUnit(v.unit)]}),i.jsxs("em",{children:[bdNomenclatureKindLabel(v.kind),D?" · в архиве":""]})]}),i.jsxs("span",{className:"bd-nomenclature-state-v208",children:[i.jsx("strong",{children:P?"Без склада":bdWarehouseDisplayAmount(v,C)}),i.jsx("small",{children:P?v.lastPurchaseAt?"Покупка "+sg(v.lastPurchaseAt):"Покупок пока нет":v.lastPurchaseAt?"Приход "+sg(v.lastPurchaseAt):"Приходов пока нет"}),i.jsx("b",{children:"→"})]})]},bdWarehouseKey(v))})}):i.jsxs("div",{className:"bd-nomenclature-empty-v208",children:[i.jsx("strong",{children:y.length?"Ничего не найдено":"Номенклатура пока пуста"}),i.jsx("p",{children:y.length?"Измените запрос или фильтр.":"Добавьте первую позицию вручную или проведите покупку — карточки появятся здесь автоматически."}),h&&!y.length&&i.jsx("button",{type:"button",onClick:()=>m({kind:"stock",active:!0}),children:"Добавить позицию"})]})]}),i.jsxs("aside",{className:"bd-nomenclature-note-v208",children:[i.jsx("strong",{children:"Как связаны разделы"}),i.jsx("p",{children:"Название и тип берутся из номенклатуры. Склад хранит только остаток, себестоимость и движения; услуги проходят мимо склада и отражаются как расходы."})]})]}),i.jsx(qe,{children:f&&i.jsx(bdNomenclatureSheet,{product:f,canEdit:h,onClose:()=>m(null),onSaved:T},bdWarehouseKey(f)||"new-nomenclature")})]})})}
`;

replaceOnce(
  "function bdInventoryCountSheet",
  nomenclatureModule + "\nfunction bdInventoryCountSheet",
  "nomenclature module insertion",
);

replaceOnce(
  'const Ele=["/more","/equipment","/suppliers","/catalog","/reviews","/notifications","/settings","/about","/integrations","/data-control"]',
  'const Ele=["/more","/equipment","/suppliers","/nomenclature","/catalog","/reviews","/notifications","/settings","/about","/integrations","/data-control"]',
  "more navigation ownership",
);

replaceOnce(
  'g&&{key:"suppliers",icon:Pf,title:"Поставщики",description:"Поставщики и закупки",onClick:()=>e("/suppliers")},g&&{key:"warehouse",icon:kX,title:"Склад",description:"Остатки, приходы и инвентаризация",onClick:()=>e("/warehouse")}',
  'g&&{key:"suppliers",icon:Pf,title:"Поставщики",description:"Поставщики и закупки",onClick:()=>e("/suppliers")},g&&{key:"nomenclature",icon:kX,title:"Номенклатура",description:"Товары, расходники и услуги",onClick:()=>e("/nomenclature")},g&&{key:"warehouse",icon:kX,title:"Склад",description:"Остатки, движения и инвентаризация",onClick:()=>e("/warehouse")}',
  "nomenclature more menu entry",
);

replaceOnce(
  'i.jsx(Xe,{path:"/suppliers",component:()=>i.jsx(pt,{component:bdProcurementCommandPageV168})}),i.jsx(Xe,{path:"/warehouse",component:()=>i.jsx(pt,{component:bdWarehousePage})})',
  'i.jsx(Xe,{path:"/suppliers",component:()=>i.jsx(pt,{component:bdProcurementCommandPageV168})}),i.jsx(Xe,{path:"/nomenclature",component:()=>i.jsx(pt,{component:bdNomenclaturePage})}),i.jsx(Xe,{path:"/warehouse",component:()=>i.jsx(pt,{component:bdWarehousePage})})',
  "nomenclature route",
);

replaceOnce(
  'const Se={stock:"Номенклатура",movements:"Движения",counts:"Инвентаризации",writeoffs:"Списания"}',
  'const Se={stock:"Остатки",movements:"Движения",counts:"Инвентаризации",writeoffs:"Списания"}',
  "warehouse stock tab label",
);

replaceOnce(
  'i.jsx("h3",{children:"Номенклатура и остатки"})',
  'i.jsx("h3",{children:"Товары на складе"})',
  "warehouse stock heading",
);

replaceOnce(
  'i.jsxs("div",{className:"bd-warehouse-nomenclature-tools-v207",children:[i.jsx("input",{className:"bd-warehouse-search",value:v,onChange:B=>b(B.target.value),placeholder:"Найти позицию…","aria-label":"Найти позицию в номенклатуре"}),z&&i.jsx("button",{type:"button",onClick:()=>C({name:"",unit:"pcs",packageSize:"1 шт.",current:0}),children:"+ Позиция"})]})',
  'i.jsxs("div",{className:"bd-warehouse-nomenclature-tools-v207",children:[i.jsx("input",{className:"bd-warehouse-search",value:v,onChange:B=>b(B.target.value),placeholder:"Найти товар…","aria-label":"Найти товар на складе"}),i.jsx("button",{type:"button",onClick:()=>e("/nomenclature"),children:"Номенклатура"})]})',
  "warehouse nomenclature link",
);

replaceOnce(
  '[N,E]=S.useState(()=>{const B=bdWarehouseRecord(xr("bd_assortment_v1"));return Array.isArray(B.stockBalances)?B.stockBalances.map(bdWarehouseRecord):[]})',
  '[N,E]=S.useState(()=>bdWarehouseCanonicalBalances(xr("bd_assortment_v1")))',
  "warehouse canonical initial names",
);

replaceOnce(
  'function L(){const B=bdWarehouseRecord(xr("bd_assortment_v1"));E(Array.isArray(B.stockBalances)?B.stockBalances.map(bdWarehouseRecord):[])',
  'function L(){const B=bdWarehouseRecord(xr("bd_assortment_v1"));E(bdWarehouseCanonicalBalances(B))',
  "warehouse canonical reload names",
);

replaceOnce(
  'const Q=Array.isArray(U.assortment.stockBalances)?U.assortment.stockBalances.map(bdWarehouseRecord):[];E(Q)',
  'const Q=bdWarehouseCanonicalBalances(U.assortment);E(Q)',
  "warehouse canonical repaired names",
);

replaceOnce(
  'B.assortment&&(Kse("bd_assortment_v1",B.assortment),E(Array.isArray(B.assortment.stockBalances)?B.assortment.stockBalances.map(bdWarehouseRecord):[]))',
  'B.assortment&&(Kse("bd_assortment_v1",B.assortment),E(bdWarehouseCanonicalBalances(B.assortment)))',
  "warehouse canonical saved names",
);

replaceOnce(
  'E(Array.isArray(B.assortment.stockBalances)?B.assortment.stockBalances.map(bdWarehouseRecord):[])}C(null)',
  'E(bdWarehouseCanonicalBalances(B.assortment))}C(null)',
  "warehouse canonical edited names",
);

replaceOnce(
  'onClick:()=>e("/suppliers"),children:"Добавить покупку"',
  'onClick:()=>e("/suppliers?create=1&returnTo=warehouse"),children:"Добавить покупку"',
  "empty warehouse purchase target",
);

replaceOnce(
  'c==="opportunities"?"/opportunities":"/suppliers"',
  'c==="opportunities"?"/opportunities":c==="nomenclature"?"/nomenclature":"/suppliers"',
  "purchase return to nomenclature",
);

await writeFile(bundlePath, source);
