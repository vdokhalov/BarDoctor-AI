import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdCanonicalTaxonomyWorkflowVersion="v336"';
if (source.includes(marker)) {
  const duplicatedInvoiceFunction = 'function P(){bdSetQuickOpenV336(!0)}function R(){if(!t||!e.rawName||!e.purchaseProductKey){}function R(){if(!t||!e.rawName||!e.purchaseProductKey){';
  if (source.includes(duplicatedInvoiceFunction)) {
    source = source.replace(
      duplicatedInvoiceFunction,
      'function P(){bdSetQuickOpenV336(!0)}function R(){if(!t||!e.rawName||!e.purchaseProductKey){',
    );
    writeFileSync(bundlePath, source);
    console.log("Repaired canonical taxonomy workflow v336 invoice picker.");
    process.exit(0);
  }
  console.log("Canonical taxonomy workflow v336 is already applied.");
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceScopedSegment(scopeStart, start, end, replacement, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const startIndex = source.indexOf(start, scopeIndex + scopeStart.length);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex + end.length);
}

function replaceScopedOnce(scopeStart, before, after, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const index = source.indexOf(before, scopeIndex + scopeStart.length);
  if (index < 0) throw new Error(`${label}: marker not found`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

const components = String.raw`
const bdCanonicalTaxonomyWorkflowVersion="v336";
function bdTaxArrayV336(e){return Array.isArray(e)?e:[]}
function bdTaxRecordV336(e){return e&&typeof e==="object"&&!Array.isArray(e)?e:{}}
function bdTaxActiveV336(e){return bdTaxArrayV336(e).filter(t=>t?.active!==!1).sort((t,n)=>(Number(t.order)||0)-(Number(n.order)||0)||String(t.name).localeCompare(String(n.name),"ru"))}
function bdTaxUsageV336(e,t,n){return Number(bdTaxArrayV336(e).find(r=>r.level===t&&r.id===n)?.count)||0}
function bdTaxBaseUnitV336(e){const t=String(e||"").toLocaleLowerCase("ru");return/кг|kg|(?:^|\s)г|g|грам/.test(t)?"g":/мл|ml|(?:^|\s)л|литр/.test(t)?"ml":"pcs"}
function bdTaxDisplayUnitV336(e,t){const n=String(e||"").toLocaleLowerCase("ru");return t==="g"?/кг|kg/.test(n)?"kg":"g":t==="ml"?/(^|\s)л|литр/.test(n)?"l":"ml":"pcs"}
async function bdTaxRequestV336(e,t={}){const n=await fetch(e,{credentials:"include",cache:"no-store",...t,headers:{...(t.body?{"Content-Type":"application/json"}:{}),...ca(Ot()),...(t.headers||{})}}),r=await n.json().catch(()=>({}));if(!n.ok||!r?.ok){const a=new Error(r?.error||"Операция не выполнена");a.code=r?.code,a.details=r;throw a}return r}
function bdTaxonomyPathLabelV336(e,t){const n=bdTaxRecordV336(e),r=bdTaxArrayV336(n.sections).find(l=>l.id===t?.sectionId),a=bdTaxArrayV336(n.categories).find(l=>l.id===t?.taxonomyCategoryId),s=bdTaxArrayV336(n.subcategories).find(l=>l.id===t?.subcategoryId);return[r?.name,a?.name,s?.name].filter(Boolean).join(" → ")||"Без категории"}
function bdTaxonomySelectorsV336({taxonomy:e,value:t,onChange:n,onCreate:r}){const a=bdTaxActiveV336(e?.sections),s=bdTaxActiveV336(e?.categories).filter(d=>d.parentId===t.sectionId),l=bdTaxActiveV336(e?.subcategories).filter(d=>d.parentId===t.taxonomyCategoryId),u=(d,f)=>n({...t,[d]:f,...(d==="sectionId"?{taxonomyCategoryId:"",subcategoryId:""}:d==="taxonomyCategoryId"?{subcategoryId:""}:{})});return i.jsxs("div",{className:"bd-tax-selectors-v336",children:[i.jsxs("label",{children:[i.jsx("span",{children:"Раздел"}),i.jsxs("div",{children:[i.jsxs("select",{value:t.sectionId||"",onChange:d=>u("sectionId",d.target.value),children:[i.jsx("option",{value:"",children:"Без раздела"}),a.map(d=>i.jsx("option",{value:d.id,children:d.name},d.id))]}),r&&i.jsx("button",{type:"button",onClick:()=>r("section"),children:"+"})]})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Категория"}),i.jsxs("div",{children:[i.jsxs("select",{value:t.taxonomyCategoryId||"",disabled:!t.sectionId,onChange:d=>u("taxonomyCategoryId",d.target.value),children:[i.jsx("option",{value:"",children:"Без категории"}),s.map(d=>i.jsx("option",{value:d.id,children:d.name},d.id))]}),r&&i.jsx("button",{type:"button",disabled:!t.sectionId,onClick:()=>r("category"),children:"+"})]})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Подкатегория"}),i.jsxs("div",{children:[i.jsxs("select",{value:t.subcategoryId||"",disabled:!t.taxonomyCategoryId,onChange:d=>u("subcategoryId",d.target.value),children:[i.jsx("option",{value:"",children:"Без подкатегории"}),l.map(d=>i.jsx("option",{value:d.id,children:d.name},d.id))]}),r&&i.jsx("button",{type:"button",disabled:!t.taxonomyCategoryId,onClick:()=>r("subcategory"),children:"+"})]})]})]})}
function bdNomenclatureQuickCreateV336({initialName:e="",prefill:t,onClose:n,onCreated:r,context:a="workflow"}){const[s,l]=S.useState(null),[u,d]=S.useState([]),[f,m]=S.useState([]),[h,g]=S.useState(()=>({name:e,itemType:"ingredient",sectionId:"",taxonomyCategoryId:"",subcategoryId:"",unit:bdTaxBaseUnitV336(t?.unit),displayUnit:bdTaxDisplayUnitV336(t?.unit,bdTaxBaseUnitV336(t?.unit)),packageSize:t?.packageSize||"",purchasePrice:t?.price??""})),[y,j]=S.useState("loading"),[v,b]=S.useState(""),[N,E]=S.useState([]),[_,T]=S.useState(!1);const A=(k,O)=>g(M=>({...M,[k]:O}));S.useEffect(()=>{let k=!1;bdTaxRequestV336("/api/nomenclature/quick-create?q="+encodeURIComponent(e||t?.name||"")).then(O=>{if(k)return;l(O.taxonomy),d(O.matches||[]),m(O.purchaseSources||[]);const M=bdTaxActiveV336(O.taxonomy?.sections)[0],D=M&&bdTaxActiveV336(O.taxonomy?.categories).find(z=>z.parentId===M.id),L=D&&bdTaxActiveV336(O.taxonomy?.subcategories).find(z=>z.parentId===D.id);g(z=>({...z,sectionId:z.sectionId||M?.id||"",taxonomyCategoryId:z.taxonomyCategoryId||D?.id||"",subcategoryId:z.subcategoryId||L?.id||""})),j("ready")}).catch(k=>{b(k.message),j("error")});return()=>{k=!0}},[]);async function k(O){const M=window.prompt("Название нового "+(O==="section"?"раздела":O==="category"?"категории":"подкатегории"));if(!M?.trim())return;try{const D=await bdTaxRequestV336("/api/nomenclature/taxonomy",{method:"POST",body:JSON.stringify({action:"create",level:O,name:M.trim(),parentId:O==="category"?h.sectionId:O==="subcategory"?h.taxonomyCategoryId:void 0})});l(D.taxonomy),D.assortment&&Kse("bd_assortment_v1",D.assortment);const z=D.node?.id;z&&g(L=>({...L,[O==="section"?"sectionId":O==="category"?"taxonomyCategoryId":"subcategoryId"]:z,...(O==="section"?{taxonomyCategoryId:"",subcategoryId:""}:O==="category"?{subcategoryId:""}:{})}))}catch(D){b(D.message)}}function O(M){const D=bdTaxBaseUnitV336(M.unit),z=bdTaxDisplayUnitV336(M.unit,D);g(L=>({...L,name:M.name||L.name,unit:D,displayUnit:z,packageSize:M.packageSize||L.packageSize,purchasePrice:M.price??L.purchasePrice})),b("")}function M(D){r?.({key:D.key||D.productKey,id:D.id||D.key,name:D.name,unit:D.unit,baseUnit:D.unit,packageSize:D.packageSize,archived:D.archived},D),n()}async function D(z=!1){if(!h.name.trim())return;b(""),T(!0);try{const L=await bdTaxRequestV336("/api/inventory/products",{method:"POST",body:JSON.stringify({action:"create",name:h.name.trim(),kind:"stock",itemType:h.itemType,unit:h.unit,displayUnit:h.displayUnit,packageSize:h.packageSize||"1 "+(h.displayUnit==="pcs"?"шт.":h.displayUnit),purchaseMode:"document",sectionId:h.sectionId,taxonomyCategoryId:h.taxonomyCategoryId,subcategoryId:h.subcategoryId,purchasePrice:h.purchasePrice===""?void 0:Number(h.purchasePrice),confirmSimilar:z})});L.assortment&&Kse("bd_assortment_v1",L.assortment),M(L.product)}catch(L){if(L.code==="PRODUCT_SIMILAR"||L.code==="PRODUCT_EXISTS")E(L.details?.possibleDuplicates||[]);else b(L.message)}finally{T(!1)}}const z=Boolean(h.name.trim()&&h.sectionId&&h.taxonomyCategoryId&&h.subcategoryId&&h.unit);return ug.createPortal(i.jsx("div",{className:"bd-quick-create-backdrop-v336",onClick:L=>L.target===L.currentTarget&&n(),children:i.jsxs("section",{className:"bd-quick-create-sheet-v336",role:"dialog","aria-modal":"true","aria-label":"Быстрое создание номенклатуры",children:[i.jsxs("header",{children:[i.jsxs("div",{children:[i.jsx("small",{children:a==="tech-card"?"Не закрывая техкарту":a==="receipt"?"Не закрывая приход":"Canonical номенклатура"}),i.jsx("h2",{children:"Новая позиция"})]}),i.jsx("button",{type:"button",onClick:n,"aria-label":"Закрыть",children:"×"})]}),i.jsxs("main",{children:[i.jsxs("label",{children:[i.jsx("span",{children:"Название"}),i.jsx("input",{value:h.name,onChange:L=>A("name",L.target.value),placeholder:"Например, Лайм",autoFocus:!0})]}),y==="loading"&&i.jsx("p",{className:"bd-tax-status-v336",children:"Проверяем номенклатуру и историю закупок…"}),u.length>0&&i.jsxs("section",{className:"bd-quick-suggestions-v336",children:[i.jsx("strong",{children:"Возможно, позиция уже существует"}),u.slice(0,4).map(L=>i.jsxs("button",{type:"button",onClick:()=>M(L),children:[i.jsxs("span",{children:[i.jsx("b",{children:L.name}),i.jsx("small",{children:[L.packageSize,L.supplierName,L.archived?"Архив":""].filter(Boolean).join(" · ")})]}),i.jsx("em",{children:"Использовать"})]},L.key))]}),f.length>0&&i.jsxs("section",{className:"bd-quick-suggestions-v336 purchase",children:[i.jsx("strong",{children:"Создать на основе закупки"}),f.slice(0,4).map(L=>i.jsxs("button",{type:"button",onClick:()=>O(L),children:[i.jsxs("span",{children:[i.jsx("b",{children:L.name}),i.jsx("small",{children:[L.supplierName,L.packageSize,L.price!=null?L.price+" "+L.currency:"",L.date].filter(Boolean).join(" · ")})]}),i.jsx("em",{children:"Заполнить"})]},L.id+L.supplierId))]}),i.jsxs("label",{children:[i.jsx("span",{children:"Тип позиции"}),i.jsxs("select",{value:h.itemType,onChange:L=>A("itemType",L.target.value),children:[i.jsx("option",{value:"product",children:"Товар"}),i.jsx("option",{value:"ingredient",children:"Ингредиент"}),i.jsx("option",{value:"semi_finished",children:"Полуфабрикат"}),i.jsx("option",{value:"finished_dish",children:"Готовое блюдо"}),i.jsx("option",{value:"consumable",children:"Расходник"}),i.jsx("option",{value:"other",children:"Другое"})]})]}),s&&i.jsx(bdTaxonomySelectorsV336,{taxonomy:s,value:h,onChange:g,onCreate:k}),i.jsxs("div",{className:"bd-quick-grid-v336",children:[i.jsxs("label",{children:[i.jsx("span",{children:"Базовая единица"}),i.jsxs("select",{value:h.unit,onChange:L=>{const q=L.target.value;g(B=>({...B,unit:q,displayUnit:q}))},children:[i.jsx("option",{value:"pcs",children:"шт."}),i.jsx("option",{value:"g",children:"г"}),i.jsx("option",{value:"ml",children:"мл"})]})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Закупочная фасовка"}),i.jsx("input",{value:h.packageSize,onChange:L=>A("packageSize",L.target.value),placeholder:h.unit==="g"?"1 кг":h.unit==="ml"?"1 л":"1 шт."})]})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Последняя цена, если известна"}),i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:h.purchasePrice,onChange:L=>A("purchasePrice",L.target.value),placeholder:"Можно оставить пустым"})]}),i.jsx("p",{className:"bd-tax-note-v336",children:h.purchasePrice===""?"Позиция будет создана без стоимости. Себестоимость останется неполной до authoritative закупки.":"Цена сохранится как справочная; документ закупки остаётся authoritative источником стоимости."}),N.length>0&&i.jsxs("section",{className:"bd-duplicate-warning-v336",children:[i.jsx("strong",{children:"Возможно, позиция уже существует"}),N.map(L=>i.jsxs("button",{type:"button",onClick:()=>M(L),children:[i.jsx("span",{children:L.name}),i.jsx("em",{children:"Использовать существующую"})]},L.productKey)),i.jsx("button",{type:"button",className:"danger",onClick:()=>D(!0),children:"Всё равно создать новую"})]}),v&&i.jsx("p",{className:"bd-tax-error-v336",role:"alert",children:v})]}),i.jsxs("footer",{children:[i.jsx("button",{type:"button",onClick:n,children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:!z||_,onClick:()=>D(!1),children:_?"Создаём…":"Создать и добавить"})]})]})}),document.body)}
function bdTaxonomyManagerV336({onSaved:e}){const[t,n]=S.useState(null),[r,a]=S.useState([]),[s,l]=S.useState("loading"),[u,d]=S.useState(""),[f,m]=S.useState(null),[h,g]=S.useState("");async function y(){l("loading"),d("");try{const C=await bdTaxRequestV336("/api/nomenclature/taxonomy");n(C.taxonomy),a(C.usage||[]),l("ready")}catch(C){d(C.message),l("error")}}S.useEffect(()=>{y()},[]);async function j(C){d("");try{const x=await bdTaxRequestV336("/api/nomenclature/taxonomy",{method:"POST",body:JSON.stringify(C)});n(x.taxonomy),a(x.usage||[]),x.assortment&&(Kse("bd_assortment_v1",x.assortment),e?.(x.assortment)),m(null)}catch(x){if(x.code==="TAXONOMY_NOT_EMPTY")m({mutation:C,count:x.details?.itemCount||0});else d(x.message)}}async function v(C,x,R){const W=window.prompt("Новое название",R);W?.trim()&&await j({action:"rename",level:C,id:x,name:W.trim()})}async function b(C,x,R){if(!window.confirm("Архивировать «"+R+"»? Позиции и история сохранятся."))return;await j({action:"archive",level:C,id:x})}async function N(C,x,R){if(!window.confirm("Удалить «"+R+"»? Если элемент используется, BarDoctor предложит безопасный перенос."))return;await j({action:"delete",level:C,id:x})}async function E(C,x){const R=window.prompt("Название");R?.trim()&&await j({action:"create",level:C,name:R.trim(),parentId:x||void 0})}function _(C,x,R){const W=bdTaxUsageV336(r,C,x.id),J=C==="category"?bdTaxActiveV336(t?.sections):C==="subcategory"?bdTaxActiveV336(t?.categories):[];return i.jsxs("article",{className:"bd-tax-node-v336 level-"+C+(!x.active?" archived":""),children:[i.jsxs("div",{className:"bd-tax-node-main-v336",children:[i.jsxs("span",{children:[i.jsx("strong",{children:x.name}),i.jsxs("small",{children:[W," поз.",!x.active?" · Архив":""]})]}),i.jsxs("div",{className:"bd-tax-node-actions-v336",children:[i.jsx("button",{type:"button",title:"Выше",onClick:()=>j({action:"reorder",level:C,id:x.id,direction:"up"}),children:"↑"}),i.jsx("button",{type:"button",title:"Ниже",onClick:()=>j({action:"reorder",level:C,id:x.id,direction:"down"}),children:"↓"}),i.jsx("button",{type:"button",onClick:()=>v(C,x.id,x.name),children:"Переименовать"}),x.active?i.jsx("button",{type:"button",onClick:()=>b(C,x.id,x.name),children:"В архив"}):i.jsx("button",{type:"button",onClick:()=>j({action:"restore",level:C,id:x.id}),children:"Восстановить"}),i.jsx("button",{type:"button",className:"danger",onClick:()=>N(C,x.id,x.name),children:"Удалить"})]})]}),C!=="section"&&J.length>0&&i.jsxs("label",{className:"bd-tax-move-v336",children:[i.jsx("span",{children:"Родитель"}),i.jsx("select",{value:x.parentId||"",onChange:K=>j({action:"move",level:C,id:x.id,parentId:K.target.value}),children:J.map(K=>i.jsx("option",{value:K.id,children:K.name},K.id))})]}),R]},x.id)}(s==="loading")return i.jsx("div",{className:"bd-tax-loading-v336",children:"Загружаем структуру…"});if(!t)return i.jsxs("div",{className:"bd-tax-loading-v336",children:[u||"Структура недоступна",i.jsx("button",{type:"button",onClick:y,children:"Повторить"})]});const T=bdTaxArrayV336(t.sections),A=bdTaxArrayV336(t.categories),k=bdTaxArrayV336(t.subcategories);return i.jsxs("section",{className:"bd-tax-manager-v336",children:[i.jsxs("header",{children:[i.jsxs("div",{children:[i.jsx("h3",{children:"Разделы, категории и подкатегории"}),i.jsx("p",{children:"Единая структура для номенклатуры, ТХ-карт, закупок и склада. Места хранения управляются отдельно."})]}),i.jsx("button",{type:"button",onClick:()=>E("section"),children:"+ Раздел"})]}),i.jsx("div",{className:"bd-tax-tree-v336",children:T.map(C=>_("section",C,i.jsxs("div",{className:"bd-tax-children-v336",children:[A.filter(x=>x.parentId===C.id).map(x=>_("category",x,i.jsxs("div",{className:"bd-tax-children-v336",children:[k.filter(R=>R.parentId===x.id).map(R=>_("subcategory",R,null)),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336",onClick:()=>E("subcategory",x.id),children:"+ Подкатегория"})]}))),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336",onClick:()=>E("category",C.id),children:"+ Категория"})]})))}),u&&i.jsx("p",{className:"bd-tax-error-v336",role:"alert",children:u}),f&&i.jsxs("div",{className:"bd-tax-conflict-v336",children:[i.jsxs("strong",{children:["В категории находится ",f.count," позиций"]}),i.jsx("p",{children:"Перенесите позиции в другой элемент того же уровня или оставьте их без категории. Исторические документы не изменятся."}),i.jsx("select",{value:h,onChange:C=>g(C.target.value),children:[i.jsx("option",{value:"",children:"Выберите категорию для переноса"}),bdTaxArrayV336(t[f.mutation.level==="section"?"sections":f.mutation.level==="category"?"categories":"subcategories"]).filter(C=>C.id!==f.mutation.id&&C.active).map(C=>i.jsx("option",{value:C.id,children:C.name},C.id))]}),i.jsxs("div",{children:[i.jsx("button",{type:"button",disabled:!h,onClick:()=>j({...f.mutation,strategy:"move",targetId:h}),children:"Перенести и удалить"}),i.jsx("button",{type:"button",onClick:()=>j({...f.mutation,strategy:"unassign"}),children:"Оставить без категории"}),i.jsx("button",{type:"button",onClick:()=>m(null),children:"Отмена"})]})]})]})}
`;

replaceOnce(
  "function bdNomenclaturePageV238()",
  components + "\nfunction bdNomenclaturePageV238()",
  "insert canonical taxonomy components",
);

replaceScopedSegment(
  "function bdNomenclaturePageV238()",
  'S.useEffect(()=>{if(!t)return;j();if(y&&!g.current){',
  '}},[t]),S.useEffect(()=>{const P=C=>',
  'S.useEffect(()=>{t&&j()},[t]),S.useEffect(()=>{const P=C=>',
  "remove automatic production classification on page open",
);

replaceScopedOnce(
  "function bdNomenclaturePageV238()",
  '["structure","all","attention"].includes(window.bdReadNavigationQuery("view","structure"))',
  '["structure","all","attention","taxonomy"].includes(window.bdReadNavigationQuery("view","structure"))',
  "allow taxonomy view",
);

replaceScopedOnce(
  "function bdNomenclaturePageV238()",
  'l==="structure"?"Структура номенклатуры":l==="attention"?"Позиции на проверке":"Все позиции"',
  'l==="taxonomy"?"Управление категориями":l==="structure"?"Структура номенклатуры":l==="attention"?"Позиции на проверке":"Все позиции"',
  "taxonomy title",
);

replaceScopedOnce(
  "function bdNomenclaturePageV238()",
  'l==="structure"?"Раздел → категория → подкатегория → позиция":l==="attention"?"Откройте позицию и подтвердите правильный путь":"Полный список товаров, расходников и услуг"',
  'l==="taxonomy"?"Создание, перенос, порядок, архив и безопасное удаление":l==="structure"?"Раздел → категория → подкатегория → позиция":l==="attention"?"Откройте позицию и подтвердите правильный путь":"Полный список товаров, расходников и услуг"',
  "taxonomy subtitle",
);

replaceScopedOnce(
  "function bdNomenclaturePageV238()",
  '[["structure","Структура"],["all","Все позиции"],["attention","На проверке"]]',
  '[["structure","Структура"],["taxonomy","Категории"],["all","Все позиции"],["attention","На проверке"]]',
  "taxonomy tab",
);

replaceScopedOnce(
  "function bdNomenclaturePageV238()",
  'l==="structure"?i.jsx(bdNomenclatureStructureViewV238,{items:k,tree:v,onOpen:f,searchActive:!!a,searchKey:a,venueKey:localStorage.getItem("bd_active_venue_id")||"default"}):A.length?',
  'l==="taxonomy"?i.jsx(bdTaxonomyManagerV336,{onSaved:P=>r(bdWarehouseRecord(P))}):l==="structure"?i.jsx(bdNomenclatureStructureViewV238,{items:k,tree:v,onOpen:f,searchActive:!!a,searchKey:a,venueKey:localStorage.getItem("bd_active_venue_id")||"default"}):A.length?',
  "taxonomy workspace",
);

replaceOnce(
  '[K,Q]=S.useState(""),[H,V]=S.useState(0);S.useEffect',
  '[K,Q]=S.useState(""),[H,V]=S.useState(0),[bdQuickOpenV336,bdSetQuickOpenV336]=S.useState(!1);S.useEffect',
  "ingredient quick create state",
);

replaceOnce(
  'W==="loaded"&&i.jsxs("div",{className:"bd-selector-pagination-v299",children:',
  'W==="loaded"&&i.jsxs("div",{className:"bd-selector-pagination-v299",children:',
  "ingredient pagination anchor",
);

replaceOnce(
  'i.jsx("button",{type:"button",className:"bd-ingredient-show-all-v258",onClick:a,children:"Свернуть поиск"})]})}',
  'i.jsx("button",{type:"button",className:"bd-ingredient-create-v336",onClick:()=>bdSetQuickOpenV336(!0),children:"+ Создать «"+(s||e.name||"позицию")+"»"}),i.jsx("button",{type:"button",className:"bd-ingredient-show-all-v258",onClick:a,children:"Свернуть поиск"}),bdQuickOpenV336&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:s||e.name||"",context:"tech-card",onClose:()=>bdSetQuickOpenV336(!1),onCreated:D=>{n(D.key,D),bdSetQuickOpenV336(!1)}})]})}',
  "tech card inline quick create",
);

replaceOnce(
  '[N,E]=S.useState(0),[_,T]=S.useState("idle"),[q,x]=S.useState("idle"),C=bdCatArray(e.mappingCandidates)',
  '[N,E]=S.useState(0),[_,T]=S.useState("idle"),[q,x]=S.useState("idle"),[bdQuickOpenV336,bdSetQuickOpenV336]=S.useState(!1),C=bdCatArray(e.mappingCandidates)',
  "invoice quick create state",
);

replaceScopedSegment(
  "function bdInvoiceLineMappingV3",
  'function P(){if(q==="creating")return;',
  '}function R(){if(!t||!e.rawName||!e.purchaseProductKey){',
  'function P(){bdSetQuickOpenV336(!0)}function R(){if(!t||!e.rawName||!e.purchaseProductKey){',
  "replace hardcoded invoice quick create",
);

replaceOnce(
  'typeof q==="string"&&!['+"'idle','creating','created'"+'].includes(q)&&i.jsx("div",{className:"bd-invoice-mapping-state-v2 is-error",role:"alert",children:q}),e.purchaseProductKey&&',
  'bdQuickOpenV336&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:D,prefill:{name:D,unit:e.unit,packageSize:e.packageSize,price:e.unitPrice},context:"receipt",onClose:()=>bdSetQuickOpenV336(!1),onCreated:k=>{O(k),bdSetQuickOpenV336(!1)}}),e.purchaseProductKey&&',
  "invoice shared quick create sheet",
);

replaceOnce(
  '(g.rawName||g.requiresReview||g.mappingSource||bdCatArray(g.mappingCandidates).length>0)&&i.jsx(bdInvoiceLineMappingV3',
  'e.documentType!=="price_list"&&i.jsx(bdInvoiceLineMappingV3',
  "canonical picker for manual purchase lines",
);

replaceOnce(
  'i.jsx(bdProcField,{label:"Категория",children:i.jsx("select",{value:g.category||"auto",onChange:j=>u(g.id,{category:j.target.value}),children:[i.jsx("option",{value:"auto",children:"Определить автоматически"}),...Object.entries(bdProcCategoryLabels).map(([j,v])=>i.jsx("option",{value:j,children:v},j))]})})',
  'i.jsx("div",{className:"bd-purchase-classification-note-v336",children:g.purchaseProductKey?"Классификация берётся из canonical Номенклатуры":"Выберите или создайте позицию Номенклатуры выше"})',
  "remove hardcoded purchase line taxonomy",
);

writeFileSync(bundlePath, source);
console.log("Applied canonical taxonomy workflow v336.");
||!e.purchaseProductKey){',
  "replace hardcoded invoice quick create",
);

replaceOnce(
  'typeof q==="string"&&!['+"'idle','creating','created'"+'].includes(q)&&i.jsx("div",{className:"bd-invoice-mapping-state-v2 is-error",role:"alert",children:q}),e.purchaseProductKey&&',
  'bdQuickOpenV336&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:D,prefill:{name:D,unit:e.unit,packageSize:e.packageSize,price:e.unitPrice},context:"receipt",onClose:()=>bdSetQuickOpenV336(!1),onCreated:k=>{O(k),bdSetQuickOpenV336(!1)}}),e.purchaseProductKey&&',
  "invoice shared quick create sheet",
);

replaceOnce(
  '(g.rawName||g.requiresReview||g.mappingSource||bdCatArray(g.mappingCandidates).length>0)&&i.jsx(bdInvoiceLineMappingV3',
  'e.documentType!=="price_list"&&i.jsx(bdInvoiceLineMappingV3',
  "canonical picker for manual purchase lines",
);

replaceOnce(
  'i.jsx(bdProcField,{label:"Категория",children:i.jsx("select",{value:g.category||"auto",onChange:j=>u(g.id,{category:j.target.value}),children:[i.jsx("option",{value:"auto",children:"Определить автоматически"}),...Object.entries(bdProcCategoryLabels).map(([j,v])=>i.jsx("option",{value:j,children:v},j))]})})',
  'i.jsx("div",{className:"bd-purchase-classification-note-v336",children:g.purchaseProductKey?"Классификация берётся из canonical Номенклатуры":"Выберите или создайте позицию Номенклатуры выше"})',
  "remove hardcoded purchase line taxonomy",
);

writeFileSync(bundlePath, source);
console.log("Applied canonical taxonomy workflow v336.");
