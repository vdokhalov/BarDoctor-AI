import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdMenuNomenclatureFlowVersion="v350"';
if (source.includes(marker)) {
  const repaired = source
    .replace('name:e,itemType:"ingredient"', 'name:e,itemType:a==="menu"?"product":"ingredient"')
    .replace('placeholder:"Найти товар, например Спрайт",ariaLabel:"Поиск в номенклатуре"', 'placeholder:"Найти товар, например Спрайт","aria-label":"Поиск в номенклатуре"')
    .replace('i.jsx("option",{value:"composite",children:"Составная"}),i.jsx("option",{value:"ready",children:"Готовый товар"})', 'i.jsx("option",{value:"composite",children:"Составная · по техкарте"}),i.jsx("option",{value:"ready",children:"Готовый товар · из номенклатуры"})');
  if (repaired !== source) writeFileSync(bundlePath, repaired);
  console.log("Menu nomenclature flow v350 is already applied.");
  process.exit(0);
}
if (!source.includes('const bdCanonicalTaxonomyPostbuildVersion="v340"')) {
  throw new Error("Canonical taxonomy postbuild v340 must be applied first.");
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceScopedOnce(scopeStart, before, after, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const index = source.indexOf(before, scopeIndex + scopeStart.length);
  if (index < 0) throw new Error(`${label}: marker not found inside scope`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  'const bdCanonicalTaxonomyWorkflowVersion="v336";',
  'const bdCanonicalTaxonomyWorkflowVersion="v336";\n' + marker + ';',
  "insert v350 marker",
);

replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  'name:e,itemType:"ingredient"',
  'name:e,itemType:a==="menu"?"product":"ingredient"',
  "menu quick create defaults to product",
);
replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  'sectionId:"",taxonomyCategoryId:"",subcategoryId:"",unit:',
  'sectionId:t?.sectionId||"",taxonomyCategoryId:t?.taxonomyCategoryId||"",subcategoryId:t?.subcategoryId||"",unit:',
  "quick create taxonomy prefill",
);
replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  'a==="tech-card"?"Не закрывая техкарту":a==="receipt"?"Не закрывая приход":"Canonical номенклатура"',
  'a==="tech-card"?"Не закрывая техкарту":a==="receipt"?"Не закрывая приход":a==="menu"?"Не закрывая позицию меню":"Canonical номенклатура"',
  "menu quick create context",
);
replaceScopedOnce(
  "function bdNomenclatureQuickCreateV336",
  'children:_?"Создаём…":"Создать и добавить"',
  'children:_?"Создаём…":a==="menu"?"Создать и связать":"Создать и добавить"',
  "menu quick create action copy",
);

replaceScopedOnce(
  "function bdCatMenuGroups",
  'u=new Map(a.map(C=>[C.id,{...C,label:C.name,total:0,subsections:new Map}])),d={id:"unassigned"',
  'u=new Map(a.map(C=>[C.id,{...C,label:C.name,total:0,subsections:new Map}])),bdLegacyMenuSectionsV350=new Map;for(const C of bdCatArray(t)){const x=a.find(R=>bdCatNormName(R.name)===bdCatNormName(C.name)),R=x?.id||C.id;bdLegacyMenuSectionsV350.set(C.id,R),u.has(R)||u.set(R,{...C,id:R,label:C.name,total:0,subsections:new Map})}const d={id:"unassigned"',
  "expose legacy menu sections",
);
replaceScopedOnce(
  "function bdCatMenuGroups",
  'const x=u.get(C.sectionId)||d,R=s.find(W=>W.id===C.taxonomyCategoryId),W=l.find(J=>J.id===C.subcategoryId),J=W?.id||R?.id||"unassigned",K=[R?.name,W?.name].filter(Boolean).join(" → ")||"Без категории"',
  'const bdLegacyGroupV350=bdCatArray(t).find(Q=>Q.id===C.groupId),bdLegacySubgroupV350=bdCatArray(n).find(Q=>Q.id===C.subgroupId&&Q.groupId===C.groupId),x=u.get(C.sectionId)||u.get(bdLegacyMenuSectionsV350.get(bdLegacyGroupV350?.id))||d,R=s.find(W=>W.id===C.taxonomyCategoryId),W=l.find(J=>J.id===C.subcategoryId),J=W?.id||R?.id||bdLegacySubgroupV350?.id||"unassigned",K=[R?.name,W?.name].filter(Boolean).join(" → ")||bdLegacySubgroupV350?.name||"Без категории"',
  "map legacy menu items into visible sections",
);

replaceScopedOnce(
  "function bdCatMenuEditor",
  '[y,j]=S.useState(""),[bdMenuTaxonomy,bdSetMenuTaxonomy]=S.useState(bdMenuTaxInitial);async function bdCreateMenuTaxonomy',
  '[y,j]=S.useState(""),[bdMenuTaxonomy,bdSetMenuTaxonomy]=S.useState(bdMenuTaxInitial),[bdMenuTaxPathsV350,bdSetMenuTaxPathsV350]=S.useState([]),[bdMenuTaxLoadingV350,bdSetMenuTaxLoadingV350]=S.useState(!0),[bdMenuQuickOpenV350,bdSetMenuQuickOpenV350]=S.useState(!1),[bdMenuCreatedProductV350,bdSetMenuCreatedProductV350]=S.useState(null),[bdMenuProductQueryV350,bdSetMenuProductQueryV350]=S.useState("");S.useEffect(()=>{let P=!0;bdTaxRequestV336("/api/nomenclature/taxonomy").then(c=>{if(!P)return;bdSetMenuTaxonomy(c.taxonomy),bdSetMenuTaxPathsV350(c.legacyMenuPaths||[]),g(I=>{if(I.sectionId&&I.taxonomyCategoryId&&I.subcategoryId)return I;const R=(c.legacyMenuPaths||[]).find(W=>W.groupId===I.groupId&&(!I.subgroupId||W.subgroupId===I.subgroupId))||(c.legacyMenuPaths||[]).find(W=>W.groupId===I.groupId);if(R)return{...I,sectionId:R.sectionId,taxonomyCategoryId:R.taxonomyCategoryId,subcategoryId:R.subcategoryId};const W=bdTaxActiveV336(c.taxonomy?.sections)[0],J=W&&bdTaxActiveV336(c.taxonomy?.categories).find(Q=>Q.parentId===W.id),K=J&&bdTaxActiveV336(c.taxonomy?.subcategories).find(Q=>Q.parentId===J.id);return{...I,sectionId:W?.id||"",taxonomyCategoryId:J?.id||"",subcategoryId:K?.id||""}}),bdSetMenuTaxLoadingV350(!1)}).catch(P=>{j(P.message),bdSetMenuTaxLoadingV350(!1)});return()=>{P=!1}},[]);async function bdCreateMenuTaxonomy',
  "load authoritative menu taxonomy",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'const v=(P,c)=>g(I=>({...I,[P]:c})),b=d.filter(P=>P.groupId===h.groupId),N=P=>{',
  'const v=(P,c)=>g(I=>({...I,[P]:c})),bdMenuSetTaxonomyV350=P=>{const c=bdMenuTaxPathsV350.find(I=>I.sectionId===P.sectionId&&I.taxonomyCategoryId===P.taxonomyCategoryId&&I.subcategoryId===P.subcategoryId);g({...P,...(c?{groupId:c.groupId,subgroupId:c.subgroupId}:{})})},b=d.filter(P=>P.groupId===h.groupId),N=P=>{',
  "sync canonical selection with legacy menu path",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'E=bdCatArray(bdMenuProducts),_=E.find(P=>P.key===(h.readyProduct?.productKey||"")),T=',
  'E=[...(bdMenuCreatedProductV350?[bdMenuCreatedProductV350]:[]),...bdCatArray(bdMenuProducts).filter(P=>P.key!==bdMenuCreatedProductV350?.key)],bdMenuVisibleProductsV350=E.filter(P=>!bdMenuProductQueryV350.trim()||bdProcNorm(P.name).includes(bdProcNorm(bdMenuProductQueryV350))).slice(0,50),_=E.find(P=>P.key===(h.readyProduct?.productKey||"")),T=',
  "searchable menu nomenclature catalog",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'i.jsx(bdTaxonomySelectorsV336,{taxonomy:bdMenuTaxonomy,value:h,onChange:g,onCreate:bdCreateMenuTaxonomy}),',
  'bdMenuTaxLoadingV350?i.jsx("div",{className:"bd-menu-tax-loading-v350",children:"Загружаем разделы меню…"}):i.jsx(bdTaxonomySelectorsV336,{taxonomy:bdMenuTaxonomy,value:h,onChange:bdMenuSetTaxonomyV350,onCreate:bdCreateMenuTaxonomy}),',
  "render authoritative menu taxonomy",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'h.type==="ready"&&i.jsx(bdCatField,{label:"Связанный готовый товар",children:i.jsxs("select",{value:h.readyProduct?.productKey||"",onChange:P=>{const c=E.find(I=>I.key===P.target.value),I=bdMenuPackageLabelsV298(c);g(R=>({...R,readyProduct:P.target.value?{nomenclatureItemId:c?.id||c?.nomenclatureItemId||c?.key,productKey:P.target.value,packageLabel:I.length===1?I[0]:void 0,packagesPerSale:1}:void 0})),j("")},children:[i.jsx("option",{value:"",children:"Не связан — указать размер вручную"}),...E.map(P=>i.jsxs("option",{value:P.key,children:[P.name,P.packageSize?" · "+P.packageSize:""]},P.key))]})}),',
  'h.type==="ready"&&i.jsx(bdCatField,{label:"Номенклатура",children:i.jsxs("div",{className:"bd-menu-nomenclature-picker-v350",children:[i.jsx("input",{type:"search",value:bdMenuProductQueryV350,onChange:P=>bdSetMenuProductQueryV350(P.target.value),placeholder:"Найти товар, например Спрайт","aria-label":"Поиск в номенклатуре"}),i.jsxs("select",{value:h.readyProduct?.productKey||"",onChange:P=>{const c=E.find(I=>I.key===P.target.value),I=bdMenuPackageLabelsV298(c);g(R=>({...R,readyProduct:P.target.value?{nomenclatureItemId:c?.id||c?.nomenclatureItemId||c?.key,productKey:P.target.value,packageLabel:I.length===1?I[0]:void 0,packagesPerSale:1}:void 0})),j("")},children:[i.jsx("option",{value:"",children:"Не найдено / не связано"}),...bdMenuVisibleProductsV350.map(P=>i.jsxs("option",{value:P.key,children:[P.name,P.packageSize?" · "+P.packageSize:""]},P.key))]}),i.jsx("button",{type:"button",className:"bd-menu-create-nomenclature-v350",onClick:()=>bdSetMenuQuickOpenV350(!0),children:"+ Создать «"+(h.name.trim()||"новую позицию")+"» в номенклатуре"}),i.jsx("small",{children:"Готовый товар создаётся один раз и сразу связывается с этой позицией меню."})]})}),',
  "menu searchable nomenclature and create action",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'i.jsx("option",{value:"composite",children:"Составная"}),i.jsx("option",{value:"ready",children:"Готовый товар"})',
  'i.jsx("option",{value:"composite",children:"Составная · по техкарте"}),i.jsx("option",{value:"ready",children:"Готовый товар · из номенклатуры"})',
  "clarify menu item types",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'y&&i.jsx("div",{className:"bd-catalog-structure-error",role:"alert",children:y}),i.jsxs("div",{className:"bd-catalog-sheet-actions"',
  'bdMenuQuickOpenV350&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:h.name,prefill:{name:h.name,unit:h.saleUnit,packageSize:h.saleQuantityInput?String(h.saleQuantityInput)+" "+h.saleUnit:"",sectionId:h.sectionId,taxonomyCategoryId:h.taxonomyCategoryId,subcategoryId:h.subcategoryId},context:"menu",onClose:()=>bdSetMenuQuickOpenV350(!1),onCreated:(P,c)=>{const I={...c,...P,key:P.key||P.productKey,productKey:P.productKey||P.key};bdSetMenuCreatedProductV350(I);const R=bdMenuPackageLabelsV298(I);g(W=>({...W,type:"ready",readyProduct:{nomenclatureItemId:I.id||I.key,productKey:I.key,packageLabel:R.length===1?R[0]:void 0,packagesPerSale:1}})),bdSetMenuProductQueryV350(I.name||""),bdSetMenuQuickOpenV350(!1),j("")}}),y&&i.jsx("div",{className:"bd-catalog-structure-error",role:"alert",children:y}),i.jsxs("div",{className:"bd-catalog-sheet-actions"',
  "render menu quick create and auto link",
);

writeFileSync(bundlePath, source);
console.log("Applied menu nomenclature flow v350.");
