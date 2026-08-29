import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdCanonicalTaxonomyIntegrationsVersion="v337"';
if (source.includes(marker)) {
  console.log("Canonical taxonomy integrations v337 are already applied.");
  process.exit(0);
}
if (!source.includes('const bdCanonicalTaxonomyWorkflowVersion="v336"')) {
  throw new Error("Canonical taxonomy workflow v336 must be applied first.");
}

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

function replaceSegment(start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex);
}

function replaceScopedOnce(scopeStart, before, after, label) {
  const scopeIndex = source.indexOf(scopeStart);
  if (scopeIndex < 0) throw new Error(`${label}: scope marker not found`);
  const index = source.indexOf(before, scopeIndex + scopeStart.length);
  if (index < 0) throw new Error(`${label}: marker not found`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

const bulkComponent = String.raw`
const bdCanonicalTaxonomyIntegrationsVersion="v337";
function bdBulkClassificationV337({onSaved:e}){const[t,n]=S.useState(null),[r,a]=S.useState([]),[s,l]=S.useState(""),[u,d]=S.useState(new Set),[f,m]=S.useState({sectionId:"",taxonomyCategoryId:"",subcategoryId:""}),[h,g]=S.useState(""),[y,j]=S.useState(""),[v,b]=S.useState(!1);async function N(){g("");try{const T=await bdTaxRequestV336("/api/nomenclature/taxonomy");n(T.taxonomy),a(bdTaxArrayV336(T.items).filter(A=>!A.archived)),j(T.updatedAt||"");const E=bdTaxActiveV336(T.taxonomy?.sections)[0],_=E&&bdTaxActiveV336(T.taxonomy?.categories).find(A=>A.parentId===E.id),k=_&&bdTaxActiveV336(T.taxonomy?.subcategories).find(A=>A.parentId===_.id);m(A=>({...A,sectionId:A.sectionId||E?.id||"",taxonomyCategoryId:A.taxonomyCategoryId||_?.id||"",subcategoryId:A.subcategoryId||k?.id||""}))}catch(T){g(T.message)}}S.useEffect(()=>{N()},[]);const E=String(s||"").trim().toLocaleLowerCase("ru"),_=r.filter(T=>!E||String(T.name).toLocaleLowerCase("ru").includes(E)).slice(0,120),T=f.sectionId&&f.taxonomyCategoryId&&f.subcategoryId&&u.size>0;async function A(){if(!T)return;b(!0),g("");try{const k=await bdTaxRequestV336("/api/nomenclature/bulk-classification",{method:"POST",body:JSON.stringify({productKeys:[...u],...f,expectedUpdatedAt:y})});k.assortment&&(Kse("bd_assortment_v1",k.assortment),e?.(k.assortment)),d(new Set),j(k.updatedAt||""),a(R=>R.map(O=>u.has(O.productKey)?{...O,...f}:O)),g("Обновлено позиций: "+k.affectedItems)}catch(k){g(k.message),k.code==="DATA_STALE"&&await N()}finally{b(!1)}}return i.jsxs("section",{className:"bd-bulk-taxonomy-v337",children:[i.jsxs("header",{children:[i.jsxs("div",{children:[i.jsx("h3",{children:"Массовая классификация"}),i.jsx("p",{children:"Выберите позиции и назначьте единый путь. История закупок и складских документов не изменяется."})]}),i.jsx("strong",{children:u.size+" выбрано"})]}),t&&i.jsx(bdTaxonomySelectorsV336,{taxonomy:t,value:f,onChange:m}),i.jsx("input",{type:"search",value:s,onChange:k=>l(k.target.value),placeholder:"Поиск позиций…","aria-label":"Поиск для массовой классификации"}),i.jsx("div",{className:"bd-bulk-items-v337",children:_.map(k=>i.jsxs("label",{children:[i.jsx("input",{type:"checkbox",checked:u.has(k.productKey),onChange:()=>d(O=>{const M=new Set(O);return M.has(k.productKey)?M.delete(k.productKey):M.add(k.productKey),M})}),i.jsxs("span",{children:[i.jsx("b",{children:k.name}),i.jsx("small",{children:bdTaxonomyPathLabelV336(t,k)})]})]},k.productKey))}),r.length>120&&!E&&i.jsx("small",{children:"Показаны первые 120 позиций — используйте поиск."}),i.jsxs("footer",{children:[i.jsx("button",{type:"button",disabled:!T||v,onClick:A,children:v?"Сохраняем…":"Изменить классификацию"}),h&&i.jsx("span",{role:"status",children:h})]})]})}
`;

replaceOnce(
  "function bdTaxonomyManagerV336",
  bulkComponent + "\nfunction bdTaxonomyManagerV336",
  "insert bulk classification component",
);

replaceScopedOnce(
  "function bdTaxonomyManagerV336",
  '),u&&i.jsx("p",{className:"bd-tax-error-v336"',
  '),i.jsx(bdBulkClassificationV337,{onSaved:e}),u&&i.jsx("p",{className:"bd-tax-error-v336"',
  "render bulk classification in taxonomy manager",
);

const canonicalMenuGroups = String.raw`function bdCatMenuGroups(e,t,n){const r=bdTaxRecordV336(bdWarehouseRecord(xr(bdCatalogStoreKey)).nomenclatureStructure),a=bdTaxArrayV336(r.sections),s=bdTaxArrayV336(r.categories),l=bdTaxArrayV336(r.subcategories),u=new Map(a.map(C=>[C.id,{...C,label:C.name,total:0,subsections:new Map}])),d={id:"unassigned",name:"Без категории",label:"Без категории",sortOrder:99999,total:0,subsections:new Map};u.set(d.id,d);for(const C of bdCatArray(e)){const x=u.get(C.sectionId)||d,R=s.find(W=>W.id===C.taxonomyCategoryId),W=l.find(J=>J.id===C.subcategoryId),J=W?.id||R?.id||"unassigned",K=[R?.name,W?.name].filter(Boolean).join(" → ")||"Без категории",Q=x.subsections.get(J)||{id:J,groupId:x.id,name:K,label:K,sortOrder:W?.order??R?.order??99999,items:[]};Q.items.push(C),x.subsections.set(J,Q),x.total++}return[...u.values()].sort((C,x)=>(Number(C.order??C.sortOrder)||0)-(Number(x.order??x.sortOrder)||0)||C.name.localeCompare(x.name,"ru")).map(C=>({...C,subsections:[...C.subsections.values()].sort((x,R)=>(Number(x.sortOrder)||0)-(Number(R.sortOrder)||0)||x.name.localeCompare(R.name,"ru")).map(x=>({...x,items:x.items.sort((R,W)=>String(R.name).localeCompare(String(W.name),"ru"))}))})).filter(C=>C.total>0)}
`;
replaceSegment("function bdCatMenuGroups", "function bdCatReadiness", canonicalMenuGroups, "canonical menu grouping");

replaceScopedOnce(
  "function bdCatMenuEditor",
  "const u=bdCatArray(n),d=bdCatArray(r),f=u.find(P=>P.id===e?.groupId)||u[0],m=bdMenuSaleDraftV298(e),[h,g]=S.useState(()=>e?",
  'const u=bdCatArray(n),d=bdCatArray(r),bdMenuTaxInitial=bdTaxRecordV336(bdWarehouseRecord(xr("bd_assortment_v1")).nomenclatureStructure),bdMenuTaxDefaultSection=bdTaxActiveV336(bdMenuTaxInitial.sections)[0],bdMenuTaxDefaultCategory=bdMenuTaxDefaultSection&&bdTaxActiveV336(bdMenuTaxInitial.categories).find(P=>P.parentId===bdMenuTaxDefaultSection.id),bdMenuTaxDefaultSubcategory=bdMenuTaxDefaultCategory&&bdTaxActiveV336(bdMenuTaxInitial.subcategories).find(P=>P.parentId===bdMenuTaxDefaultCategory.id),f=u.find(P=>P.id===e?.groupId)||u[0],m=bdMenuSaleDraftV298(e),[h,g]=S.useState(()=>e?',
  "menu taxonomy bootstrap",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  "{...e,currency:",
  '{...e,sectionId:e.sectionId||"",taxonomyCategoryId:e.taxonomyCategoryId||"",subcategoryId:e.subcategoryId||"",currency:',
  "existing menu canonical references",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  ":{id:crypto.randomUUID(),groupId:",
  ':{id:crypto.randomUUID(),sectionId:bdMenuTaxDefaultSection?.id||"",taxonomyCategoryId:bdMenuTaxDefaultCategory?.id||"",subcategoryId:bdMenuTaxDefaultSubcategory?.id||"",groupId:',
  "new menu canonical defaults",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  ',[y,j]=S.useState(""),v=',
  ',[y,j]=S.useState(""),[bdMenuTaxonomy,bdSetMenuTaxonomy]=S.useState(bdMenuTaxInitial);async function bdCreateMenuTaxonomy(P){const c=window.prompt("Название нового "+(P==="section"?"раздела":P==="category"?"категории":"подкатегории"));if(!c?.trim())return;try{const I=await bdTaxRequestV336("/api/nomenclature/taxonomy",{method:"POST",body:JSON.stringify({action:"create",level:P,name:c.trim(),parentId:P==="category"?h.sectionId:P==="subcategory"?h.taxonomyCategoryId:void 0})});bdSetMenuTaxonomy(I.taxonomy),I.assortment&&Kse("bd_assortment_v1",I.assortment);const R=I.node?.id;R&&g(W=>({...W,[P==="section"?"sectionId":P==="category"?"taxonomyCategoryId":"subcategoryId"]:R,...(P==="section"?{taxonomyCategoryId:"",subcategoryId:""}:P==="category"?{subcategoryId:""}:{})}))}catch(I){j(I.message)}}const v=',
  "menu inline taxonomy create",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  "if(!h.name.trim()||!h.groupId)return;",
  'if(!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!h.subcategoryId){j("Выберите раздел, категорию и подкатегорию");return}',
  "menu canonical path validation",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'i.jsxs("div",{className:"bd-catalog-grid",children:[i.jsx(bdCatField,{label:"Группа",children:i.jsx("select",{value:h.groupId,onChange:P=>N(P.target.value),children:u.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))})}),i.jsx(bdCatField,{label:"Подраздел",children:i.jsxs("select",{value:h.subgroupId||"",onChange:P=>v("subgroupId",P.target.value),children:[i.jsx("option",{value:"",children:"Без подраздела"}),...b.map(P=>i.jsx("option",{value:P.id,children:P.name},P.id))]})})]}),i.jsx("button",{type:"button",className:"bd-catalog-structure-link",onClick:()=>{a(),l?.()},children:"Настроить группы и подразделы →"})',
  'i.jsx(bdTaxonomySelectorsV336,{taxonomy:bdMenuTaxonomy,value:h,onChange:g,onCreate:bdCreateMenuTaxonomy}),i.jsx("button",{type:"button",className:"bd-catalog-structure-link",onClick:()=>{a(),l?.()},children:"Управление общей структурой →"})',
  "menu canonical taxonomy controls",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'disabled:!h.name.trim()||!h.groupId||!O',
  'disabled:!h.name.trim()||!h.sectionId||!h.taxonomyCategoryId||!h.subcategoryId||!O',
  "menu save guard",
);

for (let index = 0; index < 3; index += 1) {
  const scope = "function bdCatalogPage";
  const scopeIndex = source.indexOf(scope);
  const nextFunction = source.indexOf("function ", scopeIndex + scope.length);
  const match = 'onClick:()=>bdSetStructureOpen(!0)';
  const found = source.indexOf(match, scopeIndex);
  if (found < 0 || found > nextFunction) break;
  source = source.slice(0, found) + 'onClick:()=>e("/nomenclature?view=taxonomy&returnTo=catalog")' + source.slice(found + match.length);
}
replaceScopedOnce(
  "function bdCatalogPage",
  "onManageStructure:()=>bdSetStructureOpen(!0)",
  'onManageStructure:()=>e("/nomenclature?view=taxonomy&returnTo=catalog")',
  "catalog taxonomy manager route",
);
replaceScopedOnce(
  "function bdCatalogPage",
  ",bdStructureOpen&&i.jsx(bdCatStructureManager",
  ",!1&&i.jsx(bdCatStructureManager",
  "disable parallel catalog taxonomy manager",
);

replaceScopedOnce(
  "function bdAssortmentCommandPageV170",
  "onStructure:()=>I(!0)",
  'onStructure:()=>e("/nomenclature?view=taxonomy&returnTo=assortment")',
  "assortment taxonomy manager route",
);
replaceScopedOnce(
  "function bdAssortmentCommandPageV170",
  "onManageStructure:()=>{M(null),I(!0)}",
  'onManageStructure:()=>{M(null),e("/nomenclature?view=taxonomy&returnTo=assortment")}',
  "assortment editor taxonomy route",
);
replaceScopedOnce(
  "function bdAssortmentCommandPageV170",
  ",H&&i.jsx(bdCatStructureManager",
  ",!1&&i.jsx(bdCatStructureManager",
  "disable parallel assortment taxonomy manager",
);

replaceScopedOnce(
  "function bdCatRecipeEditor",
  'updatedAt:new Date().toISOString(),confirmedAt:p?new Date().toISOString():l.confirmedAt},I)};return i.jsx',
  'updatedAt:new Date().toISOString(),confirmedAt:p?new Date().toISOString():l.confirmedAt},I)};const bdMissingCostCount=l.ingredients.filter(p=>{if(!p.purchaseProductKey)return!1;const c=n.find(I=>I.key===p.purchaseProductKey),R=Number(c?.averageUnitCost??c?.lastPurchasePrice??c?.price);return!(R>0)}).length;return i.jsx',
  "tech card incomplete cost count",
);
replaceScopedOnce(
  "function bdCatRecipeEditor",
  'i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:b,children:"+ Добавить ингредиент"}),i.jsxs("div",{className:"bd-catalog-sheet-actions"',
  'i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:b,children:"+ Добавить ингредиент"}),bdMissingCostCount>0&&i.jsxs("div",{className:"bd-catalog-issue",role:"status",children:["Себестоимость неполная: отсутствует стоимость ",bdMissingCostCount," ингредиентов. Цена появится после authoritative закупки."]}),i.jsxs("div",{className:"bd-catalog-sheet-actions"',
  "tech card incomplete cost warning",
);

writeFileSync(bundlePath, source);
console.log("Applied canonical taxonomy integrations v337.");
