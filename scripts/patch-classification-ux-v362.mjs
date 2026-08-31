import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const nomenclatureCssPath = path.join(root, "public/nomenclature-v208.css");
const taxonomyCssPath = path.join(root, "public/canonical-taxonomy-v336.css");
const marker = "bd-classification-ux-v362";

let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

function classificationBlock(handler) {
  return `i.jsxs("section",{className:"bd-nomenclature-classification-v362","data-bd-classification":"compact-path-v362",children:[i.jsxs("header",{children:[i.jsxs("div",{children:[i.jsx("span",{children:"Классификация"}),i.jsxs("strong",{children:[y.find(P=>P.id===u.sectionId)?.name||"Раздел не выбран",u.taxonomyCategoryId?" → ":"",j.find(P=>P.id===u.taxonomyCategoryId)?.name||"",u.subcategoryId?" → ":"",v.find(P=>P.id===u.subcategoryId)?.name||""]})]}),i.jsx("small",{className:!u.sectionId||!u.taxonomyCategoryId?"needs-choice":"ready",children:!u.sectionId?"Выберите раздел":!u.taxonomyCategoryId?"Выберите категорию":"Путь задан"})]}),i.jsxs("details",{className:"bd-nomenclature-classification-edit-v362",open:!s,children:[i.jsx("summary",{children:s?"Изменить":"Выбрать классификацию"}),i.jsxs("div",{className:"bd-nomenclature-classification-fields-v362",children:[i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Раздел*"}),i.jsxs("select",{value:u.sectionId,onChange:P=>${handler}("sectionId",P.target.value),children:[i.jsx("option",{value:"",children:"Выберите раздел"}),...y.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Категория*"}),i.jsxs("select",{value:u.taxonomyCategoryId,disabled:!u.sectionId,onChange:P=>${handler}("taxonomyCategoryId",P.target.value),children:[i.jsx("option",{value:"",children:u.sectionId?"Выберите категорию":"Сначала выберите раздел"}),...j.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))]})]}),v.length>0?i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Подкатегория (необязательно)"}),i.jsxs("select",{value:u.subcategoryId,onChange:P=>${handler}("subcategoryId",P.target.value),children:[i.jsx("option",{value:"",children:"Без подкатегории"}),...v.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))]})]}):u.taxonomyCategoryId?i.jsx("p",{className:"bd-nomenclature-no-subcategory-v362",children:"У этой категории нет подкатегорий — дополнительный выбор не нужен."}):null,i.jsx("button",{type:"button",className:"bd-nomenclature-create-category-v362",disabled:!u.sectionId,onClick:bdCreateCategoryV362,children:u.sectionId?"+ Создать категорию в «"+(y.find(P=>P.id===u.sectionId)?.name||"разделе")+"»":"Сначала выберите раздел"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field bd-nomenclature-storage-v362",children:[i.jsx("span",{children:"Место хранения"}),i.jsxs("select",{value:u.storageLocationId,onChange:P=>${handler}("storageLocationId",P.target.value),children:[i.jsx("option",{value:"",children:"Не задано"}),...b.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))]})]}),i.jsxs("details",{className:"bd-nomenclature-accounting-v362",children:[i.jsxs("summary",{children:[i.jsx("span",{children:"Учёт"}),i.jsxs("strong",{children:["Тип закупки: ",bdPurchaseTypeLabelV362(u,y)]})]}),i.jsx("p",{children:"BarDoctor определяет тип закупки автоматически по роли и разделу. Для услуг его можно изменить в поле «Тип закупки»."})]})]})`;
}

if (!source.includes(marker)) {
  const helperAnchor = "function bdServiceExpenseOptionsV359(current){";
  if (!source.includes(helperAnchor)) throw new Error("Purchase type helper anchor not found");
  source = source.replace(helperAnchor, `/* ${marker} */function bdPurchaseTypeLabelV362(form,sections){const section=String(sections.find(item=>item.id===form.sectionId)?.name||"").toLocaleLowerCase("ru");if(form.kind==="service")return bdServiceExpenseOptionsV359(form.category).find(([key])=>key===form.category)?.[1]||"Прочая услуга";if(form.itemType==="consumable"||section.includes("расход"))return"Расходные материалы";if(section.includes("хоз"))return"Хозяйственные расходы";if(section.includes("оборуд"))return"Оборудование";if(section.includes("ремонт"))return"Ремонт и обслуживание";if(section.includes("маркет"))return"Маркетинговые расходы";return"Товар и ингредиенты"}function bdNomenclatureSaveHintV362(form,needsPackage){if(!form.name.trim())return"Укажите название";if(!form.sectionId)return"Выберите раздел";if(!form.taxonomyCategoryId)return"Выберите категорию";if(form.kind==="stock"&&!form.packageSize.trim())return"Укажите фасовку";if(form.kind==="stock"&&needsPackage&&!form.unitPackageSize.trim())return"Укажите фасовку прихода";return""}\n${helperAnchor}`);

  replaceExactly(
    'const n=e?.kind==="service"?"service":"stock",r=t.sections.some(d=>d.id===e?.sectionId&&d.id!=="unassigned")?String(e.sectionId):"kitchen",a=t.categories.filter(d=>d.parentId===r&&d.id!=="unassigned-category"),s=a.some(d=>d.id===e?.taxonomyCategoryId)?String(e.taxonomyCategoryId):a[0]?.id||"",l=t.subcategories.filter(d=>d.parentId===s&&d.id!=="unassigned-subcategory"),u=l.some(d=>d.id===e?.subcategoryId)?String(e.subcategoryId):l[0]?.id||""',
    'const n=e?.kind==="service"?"service":"stock",r=t.sections.some(d=>d.id===e?.sectionId&&d.id!=="unassigned")?String(e.sectionId):"",a=t.categories.filter(d=>d.parentId===r&&d.id!=="unassigned-category"),s=a.some(d=>d.id===e?.taxonomyCategoryId)?String(e.taxonomyCategoryId):"",l=t.subcategories.filter(d=>d.parentId===s&&d.id!=="unassigned-subcategory"),u=l.some(d=>d.id===e?.subcategoryId)?String(e.subcategoryId):""',
    "Nomenclature initial classification",
  );

  replaceExactly(
    'const s=bdWarehouseKey(e),l=bdNomenclatureTree(t),[u,d]=S.useState(()=>bdNomenclatureInitialFormV237(e,l))',
    'const s=bdWarehouseKey(e),[bdLocalAssortmentV362,bdSetLocalAssortmentV362]=S.useState(t),l=bdNomenclatureTree(bdLocalAssortmentV362),[u,d]=S.useState(()=>bdNomenclatureInitialFormV237(e,l))',
    "Modern editor local taxonomy",
  );
  replaceExactly(
    'const s=bdWarehouseKey(e),l=bdNomenclatureTree(t),[u,d]=S.useState(()=>bdNomenclatureInitialFormV213(e,l))',
    'const s=bdWarehouseKey(e),[bdLocalAssortmentV362,bdSetLocalAssortmentV362]=S.useState(t),l=bdNomenclatureTree(bdLocalAssortmentV362),[u,d]=S.useState(()=>bdNomenclatureInitialFormV213(e,l))',
    "Legacy editor local taxonomy",
  );

  replaceExactly(
    'if(P==="sectionId"){const O=l.categories.find(M=>M.parentId===C&&M.id!=="unassigned-category")?.id||"",R=l.subcategories.find(M=>M.parentId===O&&M.id!=="unassigned-subcategory")?.id||"";return{...D,sectionId:C,taxonomyCategoryId:O,subcategoryId:R,storageLocationId:l.locations.find(M=>M.parentId===C)?.id||""}}if(P==="taxonomyCategoryId")return{...D,taxonomyCategoryId:C,subcategoryId:l.subcategories.find(O=>O.parentId===C&&O.id!=="unassigned-subcategory")?.id||""};',
    'if(P==="sectionId")return{...D,sectionId:C,taxonomyCategoryId:"",subcategoryId:"",storageLocationId:l.locations.find(M=>M.parentId===C)?.id||""};if(P==="taxonomyCategoryId")return{...D,taxonomyCategoryId:C,subcategoryId:""};',
    "Modern editor dependent selectors",
  );
  replaceExactly(
    'if(P==="sectionId"){const A=l.categories.find(T=>T.parentId===C&&T.id!=="unassigned-category")?.id||"",O=l.subcategories.find(T=>T.parentId===A&&T.id!=="unassigned-subcategory")?.id||"";return{...D,sectionId:C,taxonomyCategoryId:A,subcategoryId:O,storageLocationId:l.locations.find(T=>T.parentId===C)?.id||""}}if(P==="taxonomyCategoryId")return{...D,taxonomyCategoryId:C,subcategoryId:l.subcategories.find(A=>A.parentId===C&&A.id!=="unassigned-subcategory")?.id||""};',
    'if(P==="sectionId")return{...D,sectionId:C,taxonomyCategoryId:"",subcategoryId:"",storageLocationId:l.locations.find(T=>T.parentId===C)?.id||""};if(P==="taxonomyCategoryId")return{...D,taxonomyCategoryId:C,subcategoryId:""};',
    "Legacy editor dependent selectors",
  );

  const modernHandlerEnd = 'return{...D,[P]:C}})}\nasync function k()';
  replaceExactly(modernHandlerEnd, 'return{...D,[P]:C}})}async function bdCreateCategoryV362(){if(!u.sectionId)return;const P=window.prompt("Название новой категории в разделе «"+(y.find(C=>C.id===u.sectionId)?.name||"разделе")+"»");if(!P?.trim())return;try{g("");const C=await bdTaxRequestV336("/api/nomenclature/taxonomy",{method:"POST",body:JSON.stringify({action:"create",level:"category",name:P.trim(),parentId:u.sectionId})});if(C.assortment){Kse("bd_assortment_v1",C.assortment),bdSetLocalAssortmentV362(C.assortment),window.dispatchEvent(new CustomEvent("bd:store-updated",{detail:{storeKey:"bd_assortment_v1"}}))}C.node?.id&&A("taxonomyCategoryId",C.node.id)}catch(C){g(C instanceof Error?C.message:"Не удалось создать категорию")}}\nasync function k()', "Modern inline category creation");
  const legacyHandlerEnd = 'return{...D,[P]:C}})}async function _()';
  replaceExactly(legacyHandlerEnd, 'return{...D,[P]:C}})}async function bdCreateCategoryV362(){if(!u.sectionId)return;const P=window.prompt("Название новой категории в разделе «"+(y.find(C=>C.id===u.sectionId)?.name||"разделе")+"»");if(!P?.trim())return;try{g("");const C=await bdTaxRequestV336("/api/nomenclature/taxonomy",{method:"POST",body:JSON.stringify({action:"create",level:"category",name:P.trim(),parentId:u.sectionId})});if(C.assortment){Kse("bd_assortment_v1",C.assortment),bdSetLocalAssortmentV362(C.assortment),window.dispatchEvent(new CustomEvent("bd:store-updated",{detail:{storeKey:"bd_assortment_v1"}}))}C.node?.id&&E("taxonomyCategoryId",C.node.id)}catch(C){g(C instanceof Error?C.message:"Не удалось создать категорию")}}async function _()', "Legacy inline category creation");

  const oldPath = handler => `i.jsxs("div",{className:"bd-nomenclature-path-editor-v209",children:[i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Раздел"}),i.jsx("select",{value:u.sectionId,onChange:P=>${handler}("sectionId",P.target.value),children:y.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Категория"}),i.jsx("select",{value:u.taxonomyCategoryId,onChange:P=>${handler}("taxonomyCategoryId",P.target.value),children:j.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Подкатегория (необязательно)"}),i.jsx("select",{value:u.subcategoryId,onChange:P=>${handler}("subcategoryId",P.target.value),children:[i.jsx("option",{value:"",children:"Без подкатегории"}),...v.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Место хранения"}),i.jsxs("select",{value:u.storageLocationId,onChange:P=>${handler}("storageLocationId",P.target.value),children:[i.jsx("option",{value:"",children:"Не задано"}),...b.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))]})]})]})`;
  replaceExactly(oldPath("A"), classificationBlock("A"), "Modern compact classification");
  replaceExactly(oldPath("E"), classificationBlock("E"), "Legacy compact classification");

  replaceExactly('i.jsx("span",{children:"Что покупаем"})', 'i.jsx("span",{children:"Тип закупки"})', "Service purchase type label", 2);

  replaceExactly(
    'children:[i.jsx("option",{value:"",children:"Без раздела"}),a.map(d=>i.jsx("option",{value:d.id,children:d.name},d.id))]',
    'children:[i.jsx("option",{value:"",children:"Выберите раздел"}),a.map(d=>i.jsx("option",{value:d.id,children:d.name},d.id))]',
    "Shared section placeholder",
  );
  replaceExactly(
    'children:[i.jsx("option",{value:"",children:"Без категории"}),s.map(d=>i.jsx("option",{value:d.id,children:d.name},d.id))]',
    'children:[i.jsx("option",{value:"",children:t.sectionId?"Выберите категорию":"Сначала выберите раздел"}),s.map(d=>i.jsx("option",{value:d.id,children:d.name},d.id))]',
    "Shared category placeholder",
  );
  const sharedSubcategory = 'i.jsxs("label",{children:[i.jsx("span",{children:"Подкатегория (необязательно)"}),i.jsxs("div",{children:[i.jsxs("select",{value:t.subcategoryId||"",disabled:!t.taxonomyCategoryId,onChange:d=>u("subcategoryId",d.target.value),children:[i.jsx("option",{value:"",children:"Без подкатегории"}),l.map(d=>i.jsx("option",{value:d.id,children:d.name},d.id))]}),r&&i.jsx("button",{type:"button",disabled:!t.taxonomyCategoryId,onClick:()=>r("subcategory"),children:"+"})]})]})';
  replaceExactly(sharedSubcategory, `l.length>0&&${sharedSubcategory}`, "Conditional shared subcategory");
  replaceExactly('subcategoryId:z.subcategoryId||L?.id||""', 'subcategoryId:z.subcategoryId||""', "Quick-create optional subcategory");

  const treeBefore = 'T.map(C=>("section",C,i.jsxs("div",{className:"bd-tax-children-v336",children:[i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-primary-v360",onClick:()=>E("category",C.id,"Название новой категории в разделе «"+C.name+"»"),children:"+ Добавить категорию в «"+C.name+"»"}),A.filter(x=>x.parentId===C.id).map(x=>("category",x,i.jsxs("div",{className:"bd-tax-children-v336",children:[i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-secondary-v360",onClick:()=>E("subcategory",x.id,"Название новой подкатегории в категории «"+x.name+"»"),children:"+ Добавить подкатегорию"}),...k.filter(R=>R.parentId===x.id).map(R=>("subcategory",R,null))]})))]})))';
  const treeActualBefore = treeBefore.replaceAll('>("', '>_("');
  const treeAfter = 'T.map(C=>("section",C,i.jsxs("div",{className:"bd-tax-children-v336",children:[...A.filter(x=>x.parentId===C.id).map(x=>("category",x,i.jsxs("div",{className:"bd-tax-children-v336",children:[...k.filter(R=>R.parentId===x.id).map(R=>("subcategory",R,null)),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-secondary-v360",onClick:()=>E("subcategory",x.id,"Название новой подкатегории в категории «"+x.name+"»"),children:"+ Добавить подкатегорию"})]}))),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-primary-v360",onClick:()=>E("category",C.id,"Название новой категории в разделе «"+C.name+"»"),children:"+ Добавить категорию в «"+C.name+"»"})]})))';
  const treeActualAfter = treeAfter.replaceAll('>("', '>_("');
  replaceExactly(treeActualBefore, treeActualAfter, "Taxonomy action ordering");

  const actionsBefore = 'i.jsxs("div",{className:"bd-tax-node-actions-v336",children:[i.jsx("button",{type:"button",title:"Выше",onClick:()=>j({action:"reorder",level:C,id:x.id,direction:"up"}),children:"↑"}),i.jsx("button",{type:"button",title:"Ниже",onClick:()=>j({action:"reorder",level:C,id:x.id,direction:"down"}),children:"↓"}),i.jsx("button",{type:"button",onClick:()=>v(C,x.id,x.name),children:"Переименовать"}),x.active?i.jsx("button",{type:"button",onClick:()=>b(C,x.id,x.name),children:"В архив"}):i.jsx("button",{type:"button",onClick:()=>j({action:"restore",level:C,id:x.id}),children:"Восстановить"}),i.jsx("button",{type:"button",className:"danger",onClick:()=>N(C,x.id,x.name),children:"Удалить"})]})';
  const actionsAfter = 'i.jsxs("details",{className:"bd-tax-node-menu-v362",children:[i.jsx("summary",{children:"Действия"}),i.jsxs("div",{className:"bd-tax-node-actions-v336",children:[i.jsx("button",{type:"button",onClick:()=>j({action:"reorder",level:C,id:x.id,direction:"up"}),children:"Выше"}),i.jsx("button",{type:"button",onClick:()=>j({action:"reorder",level:C,id:x.id,direction:"down"}),children:"Ниже"}),i.jsx("button",{type:"button",onClick:()=>v(C,x.id,x.name),children:"Переименовать"}),x.active?i.jsx("button",{type:"button",onClick:()=>b(C,x.id,x.name),children:"В архив"}):i.jsx("button",{type:"button",onClick:()=>j({action:"restore",level:C,id:x.id}),children:"Восстановить"}),i.jsx("button",{type:"button",className:"danger",onClick:()=>N(C,x.id,x.name),children:"Удалить"})]}),C!=="section"&&J.length>0&&i.jsxs("label",{className:"bd-tax-move-v336 bd-tax-move-menu-v362",children:[i.jsx("span",{children:"Переместить в"}),i.jsx("select",{value:x.parentId||"",onChange:K=>j({action:"move",level:C,id:x.id,parentId:K.target.value}),children:J.map(K=>i.jsx("option",{value:K.id,children:K.name},K.id))})]})]})';
  replaceExactly(actionsBefore, actionsAfter, "Taxonomy compact actions");
  replaceExactly('children:"Разделы, категории и подкатегории"', 'children:"Разделы и категории"', "Taxonomy manager title");
  replaceExactly('children:"Единая структура для номенклатуры, ТХ-карт, закупок и склада. Места хранения управляются отдельно."', 'children:"Откройте раздел, чтобы увидеть категории. Подкатегории добавляйте только когда они действительно нужны."', "Taxonomy manager guidance");
}

const saveHintMarker = "bd-save-hint-v362";
if (!source.includes(saveHintMarker)) {
  const modernFooter = 'i.jsxs("footer",{className:"bd-nomenclature-panel-actions-v213",children:[i.jsx("button",{type:"button",className:"secondary",onClick:r,children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:!n||f||!u.name.trim()||!u.sectionId||!u.taxonomyCategoryId||u.kind==="stock"&&(!u.packageSize.trim()||_&&!u.unitPackageSize.trim()),onClick:k,children:f?"Сохраняю…":"Сохранить"})]})';
  const modernFooterAfter = `/* ${saveHintMarker} */i.jsxs("footer",{className:"bd-nomenclature-panel-actions-v213",children:[bdNomenclatureSaveHintV362(u,_)&&i.jsx("p",{className:"bd-nomenclature-save-hint-v362",role:"status",children:bdNomenclatureSaveHintV362(u,_)}),i.jsx("button",{type:"button",className:"secondary",onClick:r,children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:!n||f||!u.name.trim()||!u.sectionId||!u.taxonomyCategoryId||u.kind==="stock"&&(!u.packageSize.trim()||_&&!u.unitPackageSize.trim()),onClick:k,children:f?"Сохраняю…":"Сохранить"})]})`;
  replaceExactly(modernFooter, modernFooterAfter, "Modern save reason");

  const legacyFooter = 'i.jsxs("footer",{className:"bd-nomenclature-panel-actions-v213",children:[i.jsx("button",{type:"button",className:"secondary",onClick:r,children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:!n||f||!u.name.trim()||!u.sectionId||!u.taxonomyCategoryId||u.kind==="stock"&&!u.packageSize.trim(),onClick:_,children:f?"Сохраняю…":"Сохранить"})]})';
  const legacyFooterAfter = 'i.jsxs("footer",{className:"bd-nomenclature-panel-actions-v213",children:[bdNomenclatureSaveHintV362(u,!1)&&i.jsx("p",{className:"bd-nomenclature-save-hint-v362",role:"status",children:bdNomenclatureSaveHintV362(u,!1)}),i.jsx("button",{type:"button",className:"secondary",onClick:r,children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:!n||f||!u.name.trim()||!u.sectionId||!u.taxonomyCategoryId||u.kind==="stock"&&!u.packageSize.trim(),onClick:_,children:f?"Сохраняю…":"Сохранить"})]})';
  replaceExactly(legacyFooter, legacyFooterAfter, "Legacy save reason");
}

const directItemsMarker = "bd-direct-category-items-v362";
if (!source.includes(directItemsMarker)) {
  replaceExactly(
    'G=t.subcategories.filter(Y=>Y.parentId===H.id&&Y.id!=="unassigned-subcategory").filter(Y=>!r||V.some(ne=>ne.subcategoryId===Y.id)),J=r?searchCategoryState[H.id]??!0:!!categoryState[H.id]',
    'G=t.subcategories.filter(Y=>Y.parentId===H.id&&Y.id!=="unassigned-subcategory").filter(Y=>!r||V.some(ne=>ne.subcategoryId===Y.id)),Q=V.filter(Y=>!G.some(ne=>ne.id===Y.subcategoryId)),J=r?searchCategoryState[H.id]??!0:!!categoryState[H.id]',
    "Direct category item set",
  );
  const directBefore = 'J&&(G.length?i.jsx("div",{id:ie,className:"bd-taxonomy-subcategories-v238",children:G.map(Y=>{const ne=V.filter(oe=>oe.subcategoryId===Y.id),le=r?searchSubcategoryState[Y.id]??!0:!!subcategoryState[Y.id],ue="bd-nom-subcategory-"+Y.id;return i.jsxs("section",{className:"bd-taxonomy-subcategory-v238 "+(le?"open":""),children:[i.jsxs("button",{type:"button",className:"bd-taxonomy-subcategory-toggle-v238","aria-expanded":le,"aria-controls":ue,onClick:()=>toggle(Y.id,setSubcategoryState,setSearchSubcategoryState,le),children:[i.jsxs("span",{className:"bd-taxonomy-node-title-v238",children:[i.jsx("i",{"aria-hidden":!0}),i.jsx("strong",{children:Y.name})]}),i.jsxs("span",{className:"bd-taxonomy-disclosure-meta-v238",children:[i.jsx("span",{children:ne.length}),i.jsx(Br,{size:15,className:"bd-taxonomy-chevron-v238","aria-hidden":!0})]})]}),le&&(ne.length?i.jsx("div",{id:ue,className:"bd-taxonomy-items-v238",children:ne.map(oe=>i.jsx(bdNomenclatureRowV238,{item:oe,tree:t,onOpen:n,nested:!0},bdWarehouseKey(oe)))}):i.jsx("p",{id:ue,className:"bd-taxonomy-empty-v238",children:"В этой подкатегории пока нет позиций"}))]},Y.id)})}):i.jsx("p",{id:ie,className:"bd-taxonomy-empty-v238",children:"В этой категории пока нет подкатегорий"}))';
  const directAfter = `/* ${directItemsMarker} */J&&(G.length||Q.length?i.jsxs("div",{id:ie,className:"bd-taxonomy-subcategories-v238",children:[...G.map(Y=>{const ne=V.filter(oe=>oe.subcategoryId===Y.id),le=r?searchSubcategoryState[Y.id]??!0:!!subcategoryState[Y.id],ue="bd-nom-subcategory-"+Y.id;return i.jsxs("section",{className:"bd-taxonomy-subcategory-v238 "+(le?"open":""),children:[i.jsxs("button",{type:"button",className:"bd-taxonomy-subcategory-toggle-v238","aria-expanded":le,"aria-controls":ue,onClick:()=>toggle(Y.id,setSubcategoryState,setSearchSubcategoryState,le),children:[i.jsxs("span",{className:"bd-taxonomy-node-title-v238",children:[i.jsx("i",{"aria-hidden":!0}),i.jsx("strong",{children:Y.name})]}),i.jsxs("span",{className:"bd-taxonomy-disclosure-meta-v238",children:[i.jsx("span",{children:ne.length}),i.jsx(Br,{size:15,className:"bd-taxonomy-chevron-v238","aria-hidden":!0})]})]}),le&&(ne.length?i.jsx("div",{id:ue,className:"bd-taxonomy-items-v238",children:ne.map(oe=>i.jsx(bdNomenclatureRowV238,{item:oe,tree:t,onOpen:n,nested:!0},bdWarehouseKey(oe)))}):i.jsx("p",{id:ue,className:"bd-taxonomy-empty-v238",children:"В этой подкатегории пока нет позиций"}))]},Y.id)}),Q.length&&i.jsxs("section",{className:"bd-taxonomy-subcategory-v238 open bd-taxonomy-direct-v362",children:[i.jsxs("div",{className:"bd-taxonomy-direct-head-v362",children:[i.jsx("strong",{children:"Без подкатегории"}),i.jsx("span",{children:Q.length})]}),i.jsx("div",{className:"bd-taxonomy-items-v238",children:Q.map(Y=>i.jsx(bdNomenclatureRowV238,{item:Y,tree:t,onOpen:n,nested:!0},bdWarehouseKey(Y)))})]})]}):i.jsx("p",{id:ie,className:"bd-taxonomy-empty-v238",children:"В этой категории пока нет позиций"}))`;
  replaceExactly(directBefore, directAfter, "Direct items in structure");
}

fs.writeFileSync(bundlePath, source);

let nomenclatureCss = fs.readFileSync(nomenclatureCssPath, "utf8");
if (!nomenclatureCss.includes(marker)) {
  nomenclatureCss += `

/* ${marker} */
.bd-nomenclature-classification-v362 {
  display: grid;
  flex: none;
  gap: 0;
  overflow: hidden;
  border: 1px solid #e1e4ed;
  border-radius: 20px;
  background: #fff;
}
.bd-nomenclature-classification-v362 > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
}
.bd-nomenclature-classification-v362 > header span,
.bd-nomenclature-classification-v362 > header strong { display: block; }
.bd-nomenclature-classification-v362 > header span {
  color: #858ca0;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.bd-nomenclature-classification-v362 > header strong {
  margin-top: 6px;
  color: #171a34;
  font-size: 17px;
  line-height: 1.25;
}
.bd-nomenclature-classification-v362 > header small {
  flex: none;
  margin-top: 2px;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
}
.bd-nomenclature-classification-v362 > header small.ready { background: #ecf8ef; color: #267a3c; }
.bd-nomenclature-classification-v362 > header small.needs-choice { background: #fff4df; color: #93620a; }
.bd-nomenclature-classification-edit-v362 {
  border-top: 1px solid #eceef4;
  border-bottom: 1px solid #eceef4;
}
.bd-nomenclature-classification-edit-v362 > summary {
  min-height: 46px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: #514de0;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.bd-nomenclature-classification-fields-v362 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 16px 16px;
}
.bd-nomenclature-no-subcategory-v362 {
  grid-column: 1 / -1;
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f4f5f8;
  color: #6f7689;
  font-size: 11px;
  line-height: 1.4;
}
.bd-nomenclature-create-category-v362 {
  grid-column: 1 / -1;
  min-height: 42px;
  border: 1px dashed #7774e7;
  border-radius: 12px;
  background: #f8f8ff;
  color: #514de0;
  font-size: 12px;
  font-weight: 850;
  text-align: left;
  padding: 0 12px;
}
.bd-nomenclature-create-category-v362:disabled { opacity: .5; }
.bd-nomenclature-storage-v362 { padding: 14px 16px; }
.bd-nomenclature-accounting-v362 { border-top: 1px solid #eceef4; }
.bd-nomenclature-accounting-v362 > summary {
  display: grid;
  gap: 4px;
  min-height: 58px;
  padding: 12px 16px;
  cursor: pointer;
}
.bd-nomenclature-accounting-v362 > summary span {
  color: #858ca0;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.bd-nomenclature-accounting-v362 > summary strong { color: #272b45; font-size: 13px; }
.bd-nomenclature-accounting-v362 > p {
  margin: 0;
  padding: 0 16px 14px;
  color: #747b8e;
  font-size: 11px;
  line-height: 1.45;
}
.bd-nomenclature-save-hint-v362 {
  grid-column: 1 / -1;
  margin: 0;
  color: #9b6300;
  font-size: 11px;
  font-weight: 750;
  text-align: center;
}
.bd-taxonomy-direct-head-v362 {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  border-bottom: 1px solid #eceef4;
  color: #626a80;
  font-size: 11px;
}
.bd-taxonomy-direct-head-v362 strong { color: #343950; font-size: 12px; }
.bd-taxonomy-direct-v362 > .bd-taxonomy-items-v238 { padding-top: 8px; }
@media (max-width: 620px) {
  .bd-nomenclature-classification-v362 > header { padding: 14px; }
  .bd-nomenclature-classification-fields-v362 { grid-template-columns: 1fr; padding: 0 14px 14px; }
  .bd-nomenclature-classification-v362 > header strong { font-size: 16px; }
  .bd-nomenclature-storage-v362 { padding: 14px; }
}
`;
  fs.writeFileSync(nomenclatureCssPath, nomenclatureCss);
}

let taxonomyCss = fs.readFileSync(taxonomyCssPath, "utf8");
if (!taxonomyCss.includes(marker)) {
  taxonomyCss += `

/* ${marker} */
.bd-tax-tree-v336 { gap: 12px; }
.bd-tax-node-v336 { padding: 0; overflow: visible; border-radius: 16px; }
.bd-tax-node-main-v336 { min-height: 54px; padding: 10px 12px; }
.bd-tax-node-v336.level-category,
.bd-tax-node-v336.level-subcategory {
  margin-left: 0;
  border: 0;
  border-top: 1px solid #eceef4;
  border-radius: 0;
  background: #fff;
}
.bd-tax-node-v336.level-category > .bd-tax-node-main-v336 { padding-left: 16px; }
.bd-tax-node-v336.level-subcategory > .bd-tax-node-main-v336 { padding-left: 30px; background: #fafbfe; }
.bd-tax-node-v336 > .bd-tax-move-v336 { display: none; }
.bd-tax-node-menu-v362 { position: relative; flex: none; }
.bd-tax-node-menu-v362 > summary {
  min-height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid #dedff0;
  border-radius: 10px;
  color: #555a72;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  list-style: none;
}
.bd-tax-node-menu-v362 > summary::-webkit-details-marker { display: none; }
.bd-tax-node-menu-v362[open] > div,
.bd-tax-node-menu-v362[open] > .bd-tax-move-menu-v362 {
  position: relative;
  z-index: 2;
}
.bd-tax-node-menu-v362 .bd-tax-node-actions-v336 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: min(310px, calc(100vw - 70px));
  margin-top: 7px;
  padding: 9px;
  border: 1px solid #e1e3ed;
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(28,31,54,.13);
}
.bd-tax-node-menu-v362 .bd-tax-node-actions-v336 button { min-height: 36px; font-size: 11px; }
.bd-tax-move-menu-v362 {
  display: grid !important;
  grid-template-columns: 1fr;
  width: min(310px, calc(100vw - 70px));
  margin: 0;
  padding: 0 9px 9px;
  border: 1px solid #e1e3ed;
  border-top: 0;
  border-radius: 0 0 13px 13px;
  background: #fff;
}
.bd-tax-add-child-v336 { align-self: stretch; margin: 8px 12px 12px; }
.bd-tax-children-v336 { gap: 0; }
.bd-tax-add-primary-v360,
.bd-tax-add-secondary-v360 { width: auto; }
@media (max-width: 620px) {
  .bd-tax-node-main-v336 { flex-direction: row; align-items: center; }
  .bd-tax-node-menu-v362 .bd-tax-node-actions-v336 { position: relative; right: auto; }
  .bd-tax-move-menu-v362 { margin-top: 0; }
}
`;
  fs.writeFileSync(taxonomyCssPath, taxonomyCss);
}

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`,
  );
  contents = contents.replace(/nomenclature-v208\.css\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `nomenclature-v208.css?v=${version}-${marker}`,
  );
  contents = contents.replace(/canonical-taxonomy-v336\.css\?v=([^"']+)/g, (match, version) =>
    version.includes(marker) ? match : `canonical-taxonomy-v336.css?v=${version}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
