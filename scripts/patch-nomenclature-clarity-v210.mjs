import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

function replaceRange(startText, endText, replacement, label) {
  const start = source.indexOf(startText);
  if (start < 0) throw new Error(`Missing ${label} start`);
  const end = source.indexOf(endText, start + startText.length);
  if (end < 0) throw new Error(`Missing ${label} end`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

function replaceOnce(before, after, label) {
  if (source.includes(after)) return;
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing ${label}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

const taxonomyUi = String.raw`
function bdNomenclatureNeedsAttention(e){return!e?.sectionId||!e?.taxonomyCategoryId||!e?.subcategoryId||e.sectionId==="unassigned"||e.taxonomyCategoryId==="unassigned-category"||e.subcategoryId==="unassigned-subcategory"||e.classificationStatus==="unassigned"||e.classificationStatus==="suggested"}
function bdNomenclaturePathParts(e,t){const n=[],r=e.sections.find(a=>a.id===t.sectionId),s=e.categories.find(a=>a.id===t.taxonomyCategoryId),l=e.subcategories.find(a=>a.id===t.subcategoryId);return r&&r.id!=="unassigned"&&n.push(r.name),s&&s.id!=="unassigned-category"&&n.push(s.name),l&&l.id!=="unassigned-subcategory"&&n.push(l.name),n}
function bdNomenclatureCard({item:e,tree:t,onOpen:n}){const r=e.kind==="service",a=bdWarehouseNumber(e.current),s=e.active===!1,l=bdNomenclatureNeedsAttention(e),u=bdNomenclaturePathParts(t,e),d=bdTaxonomyName(t,"locations",e.storageLocationId);return i.jsxs("button",{type:"button",className:"bd-nomenclature-card-v208 "+(s?"archived ":"")+(l?"needs-attention-v210":""),onClick:()=>n(e),children:[i.jsx("span",{className:"bd-nomenclature-type-v208 "+(r?"service":"stock"),children:r?"У":"Т"}),i.jsxs("span",{className:"bd-nomenclature-copy-v208",children:[i.jsx("strong",{children:e.name||"Позиция без названия"}),i.jsx("small",{children:u.length?u.join(" → "):"Путь не задан"}),i.jsx("em",{children:l?"Нужно проверить распределение":e.storageLocationId?d:bdNomenclatureKindLabel(e.kind)})]}),i.jsxs("span",{className:"bd-nomenclature-state-v208",children:[i.jsx("strong",{children:r?"Без склада":bdWarehouseDisplayAmount(e,a)}),i.jsx("small",{children:e.lastPurchaseAt?(r?"Покупка ":"Приход ")+sg(e.lastPurchaseAt):r?"Покупок пока нет":"Приходов пока нет"}),i.jsx("b",{children:"→"})]})]},bdWarehouseKey(e))}
function bdNomenclatureSubcategoryChip({subcategory:e,items:t}){const n=t.filter(r=>r.subcategoryId===e.id).length;return i.jsxs("span",{className:n?"has-items":"",children:[e.name,i.jsx("b",{children:n})]})}
function bdNomenclatureStructureView({items:e,tree:t,onOpen:n}){const r=t.sections.filter(s=>s.id!=="unassigned"),a=r.find(s=>e.some(l=>l.sectionId===s.id))?.id||r[0]?.id;return i.jsx("div",{className:"bd-taxonomy-tree-v210",children:r.map(s=>{const l=e.filter(g=>g.sectionId===s.id),u=t.categories.filter(g=>g.parentId===s.id&&g.id!=="unassigned-category");return i.jsxs("details",{className:"bd-taxonomy-section-v210",open:s.id===a,children:[i.jsxs("summary",{children:[i.jsxs("span",{className:"bd-taxonomy-section-title-v210",children:[i.jsx("b",{children:s.name.slice(0,1)}),i.jsxs("span",{children:[i.jsx("strong",{children:s.name}),i.jsxs("small",{children:[u.length," категорий"]})]})]}),i.jsxs("span",{className:"bd-taxonomy-section-count-v210",children:[l.length," поз.",i.jsx("b",{children:"⌄"})]})]}),i.jsx("div",{className:"bd-taxonomy-categories-v210",children:u.map(g=>{const y=l.filter(E=>E.taxonomyCategoryId===g.id),j=t.subcategories.filter(E=>E.parentId===g.id&&E.id!=="unassigned-subcategory");return i.jsxs("article",{className:"bd-taxonomy-category-v210",children:[i.jsxs("header",{children:[i.jsx("strong",{children:g.name}),i.jsxs("span",{children:[y.length," позиций"]})]}),j.length?i.jsx("div",{className:"bd-taxonomy-subcategories-v210",children:j.map(E=>i.jsx(bdNomenclatureSubcategoryChip,{subcategory:E,items:y},E.id))}):i.jsx("small",{className:"bd-taxonomy-no-subcategories-v210",children:"Подкатегорий пока нет"}),y.length?i.jsx("div",{className:"bd-nomenclature-list-v208",children:y.map(E=>i.jsx(bdNomenclatureCard,{item:E,tree:t,onOpen:n},bdWarehouseKey(E)))}):null]},g.id)})})]},s.id)})})}
`;

replaceRange(
  source.includes("function bdNomenclatureNeedsAttention")
    ? "function bdNomenclatureNeedsAttention"
    : "function bdNomenclatureCard",
  "function bdWarehouseStockCard",
  taxonomyUi + "\n",
  "clear nomenclature hierarchy UI",
);

const page = String.raw`
function bdNomenclaturePage(){const[,e]=bt(),{isReady:t}=Ai(),[n,r]=S.useState(()=>bdWarehouseRecord(xr("bd_assortment_v1"))),[a,s]=S.useState(""),[l,u]=S.useState("structure"),[d,f]=S.useState(null),[m,h]=S.useState("idle"),g=S.useRef(!1),y=typeof window.bdHasClientPermission==="function"?window.bdHasClientPermission("inventory.manage"):localStorage.getItem("bd_active_role")==="owner";function j(){r(bdWarehouseRecord(xr("bd_assortment_v1")))}S.useEffect(()=>{if(!t)return;j();if(y&&!g.current){g.current=!0,h("loading"),fetch("/api/inventory/products",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:"classify"})}).then(v=>v.json().then(b=>({ok:v.ok,body:b}))).then(({ok:v,body:b})=>{if(!v||!b?.ok)throw new Error(b?.error||"classification failed");b.assortment&&(Kse("bd_assortment_v1",b.assortment),r(bdWarehouseRecord(b.assortment))),h("ready")}).catch(()=>h("error"))}},[t]),S.useEffect(()=>{const v=b=>{b?.detail?.storeKey==="bd_assortment_v1"&&j()};return window.addEventListener("bd:store-updated",v),()=>window.removeEventListener("bd:store-updated",v)},[]);const v=bdNomenclatureTree(n),b=bdNomenclatureItems(n),N=b.filter(P=>P.active!==!1),E=N.filter(P=>P.kind==="stock"),_=N.filter(bdNomenclatureNeedsAttention),T=N.filter(P=>{const C=(String(P.name||"")+" "+bdNomenclaturePathParts(v,P).join(" ")).toLocaleLowerCase("ru");return!a||C.includes(a.toLocaleLowerCase("ru"))}),A=l==="attention"?T.filter(bdNomenclatureNeedsAttention):T,k=T.filter(P=>P.sectionId&&P.sectionId!=="unassigned");function O(P){if(P.assortment){Kse("bd_assortment_v1",P.assortment),r(bdWarehouseRecord(P.assortment))}f(null)}return i.jsx(nt,{showBottomNav:!0,className:"pb-32",children:i.jsxs($e,{className:"pt-0",children:[i.jsx(bdAccountingHeader,{title:"Номенклатура",back:"/more",right:y?i.jsx("button",{type:"button",onClick:()=>f({kind:"stock",active:!0}),className:"text-[13px] font-bold text-primary",children:"+ Добавить"}):null}),i.jsxs("main",{"data-bd-nomenclature-version":"v211",className:"bd-nomenclature-main-v208 bd-nomenclature-main-v210",children:[i.jsxs("section",{className:"bd-nomenclature-hero-v208",children:[i.jsx("p",{children:"Единый справочник"}),i.jsx("h2",{children:"Номенклатура заведения"}),i.jsx("span",{children:"Откройте раздел, затем категорию или карточку позиции. Новые покупки BarDoctor распределяет автоматически."}),i.jsxs("div",{className:"bd-nomenclature-hero-actions-v208",children:[y&&i.jsx("button",{type:"button",className:"primary",onClick:()=>f({kind:"stock",active:!0}),children:"Добавить позицию"}),i.jsx("button",{type:"button",onClick:()=>e("/suppliers?create=1&returnTo=nomenclature"),children:"Добавить покупку"}),i.jsx("button",{type:"button",onClick:()=>e("/warehouse"),children:"Открыть остатки"})]})]}),i.jsx("section",{className:"bd-nomenclature-summary-v208 bd-nomenclature-summary-v210",children:[[N.length,"Позиций"],[E.length,"На складе"],[v.sections.filter(P=>P.id!=="unassigned").length,"Разделов"],[_.length,"На проверке"]].map(([P,C])=>i.jsxs("article",{className:C==="На проверке"&&P?"warning":"",children:[i.jsx("strong",{children:P}),i.jsx("span",{children:C})]},C))}),i.jsxs("section",{className:"bd-nomenclature-catalog-v208 bd-nomenclature-catalog-v210",children:[i.jsxs("header",{className:"bd-nomenclature-catalog-head-v210",children:[i.jsxs("div",{children:[i.jsx("h3",{children:l==="structure"?"Структура номенклатуры":l==="attention"?"Позиции на проверке":"Все позиции"}),i.jsx("p",{children:l==="structure"?"Раздел → категория → подкатегория → позиция":l==="attention"?"Откройте карточку и подтвердите правильный путь":"Полный список товаров, расходников и услуг"})]}),m==="loading"&&i.jsx("span",{children:"Распределяем…"}),m==="error"&&i.jsx("span",{className:"error",children:"Автораспределение не завершено"})]}),i.jsx("input",{className:"bd-nomenclature-search-v210",value:a,onChange:P=>s(P.target.value),placeholder:"Поиск по названию или разделу","aria-label":"Поиск по номенклатуре"}),i.jsx("div",{className:"bd-nomenclature-filters-v208 bd-nomenclature-tabs-v210","aria-label":"Режим номенклатуры",children:[["structure","Структура"],["all","Все позиции"],["attention","На проверке"]].map(([P,C])=>i.jsxs("button",{type:"button",className:(l===P?"active ":"")+(P==="attention"?"attention":""),onClick:()=>u(P),children:[C,P==="attention"&&_.length?i.jsx("b",{children:_.length}):null]},P))}),l==="structure"?i.jsxs(i.Fragment,{children:[i.jsx(bdNomenclatureStructureView,{items:k,tree:v,onOpen:f}),_.length?i.jsxs("button",{type:"button",className:"bd-nomenclature-attention-banner-v210",onClick:()=>u("attention"),children:[i.jsxs("span",{children:[i.jsx("strong",{children:"Нужно проверить распределение"}),i.jsxs("small",{children:[_.length," позиций без подтверждённого пути"]})]}),i.jsx("b",{children:"Открыть →"})]}):null]}):A.length?i.jsx("div",{className:"bd-nomenclature-list-v208",children:A.map(P=>i.jsx(bdNomenclatureCard,{item:P,tree:v,onOpen:f},bdWarehouseKey(P)))}):i.jsxs("div",{className:"bd-nomenclature-empty-v208",children:[i.jsx("strong",{children:b.length?l==="attention"?"Проверка не требуется":"Ничего не найдено":"Номенклатура пока пуста"}),i.jsx("p",{children:b.length?l==="attention"?"У всех активных позиций задан полный путь.":"Измените запрос поиска.":"Добавьте первую позицию вручную или проведите покупку."})]})]})]}),i.jsx(qe,{children:d&&i.jsx(bdNomenclatureSheet,{product:d,assortment:n,canEdit:y,onClose:()=>f(null),onSaved:O},bdWarehouseKey(d)||"new-nomenclature")})]})})}
`;

replaceRange(
  "function bdNomenclaturePage",
  "function bdInventoryCountSheet",
  page + "\n",
  "nomenclature clarity page",
);

replaceOnce(
  '{id:"bakery",name:"Хлеб и выпечка",parentId:"food",order:80}',
  '{id:"bakery",name:"Хлеб и выпечка",parentId:"food",order:80},{id:"canned",name:"Консервы",parentId:"food",order:90}',
  "client canned-food subcategory",
);

await writeFile(bundlePath, source);
