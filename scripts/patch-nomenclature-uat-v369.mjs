import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const taxonomyCssPath = path.join(root, "public/canonical-taxonomy-v336.css");
const nomenclatureCssPath = path.join(root, "public/nomenclature-v208.css");
const marker = "bd-nomenclature-uat-v369";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker)) {
  const managerStart = source.indexOf("function bdTaxonomyManagerV336");
  const managerEnd = source.indexOf("function bdNomenclaturePageV238", managerStart);
  if (managerStart < 0 || managerEnd <= managerStart) throw new Error("Taxonomy manager boundary not found");

  const helpers = `/* ${marker} */
function bdNormalizeNomenclatureSearchV369(e){return String(e||"").normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g,"е").replace(/(\\d),(?=\\d)/g,"$1.").replace(/(\\d)\\s*(мл|ml|л|l|кг|kg|г|g|шт\\.?)/g,"$1 $2").replace(/\\s+/g," ").trim()}
function bdTaxDuplicateSignatureV369(e){const t=bdNormalizeNomenclatureSearchV369(e).replace(/[^a-zа-я0-9]+/g," ").trim();return /^(кальян|кальяны|кальянная)$/.test(t)?"кальяны":/^(хозтовары|хозяйственные товары|хоз товары)$/.test(t)?"хозтовары":t}
function bdNomenclatureRelationUrlV369(e,t,n){const r=encodeURIComponent(String(n?.name||"")),a=encodeURIComponent(String(bdWarehouseKey(n)||""));return e==="suppliers"?"/suppliers?q="+r+"&returnTo=nomenclature&returnItem="+a:"/catalog?tab="+(e==="menu"?"menu":"recipes")+"&q="+r+"&returnTo=nomenclature&returnItem="+a}
function bdNomenclatureReturnUrlV369(){const e=window.bdReadNavigationQuery("returnItem","");return e?"/nomenclature?item="+encodeURIComponent(e):"/nomenclature"}
`;

  const manager = `function bdTaxonomyManagerV336({onSaved:e,query:bdQueryV369=""}){
const[t,n]=S.useState(null),[r,a]=S.useState([]),[s,l]=S.useState("loading"),[u,d]=S.useState(""),[f,m]=S.useState(null),[h,g]=S.useState(""),[bdTaxUpdatedV339,bdSetTaxUpdatedV339]=S.useState(""),[bdOpenSectionsV369,bdSetOpenSectionsV369]=S.useState({}),[bdOpenCategoriesV369,bdSetOpenCategoriesV369]=S.useState({}),[bdFocusV369,bdSetFocusV369]=S.useState(null);
async function y(){l("loading"),d("");try{const C=await bdTaxRequestV336("/api/nomenclature/taxonomy");n(C.taxonomy),a(C.usage||[]),bdSetTaxUpdatedV339(C.updatedAt||""),l("ready")}catch(C){d(C.message),l("error")}}
S.useEffect(()=>{y()},[]);
async function j(C){d("");try{const x=await bdTaxRequestV336("/api/nomenclature/taxonomy",{method:"POST",body:JSON.stringify({...C,expectedUpdatedAt:bdTaxUpdatedV339})});n(x.taxonomy),a(x.usage||[]),bdSetTaxUpdatedV339(x.updatedAt||""),x.assortment&&(Kse("bd_assortment_v1",x.assortment),e?.(x.assortment)),m(null)}catch(x){if(x.code==="TAXONOMY_NOT_EMPTY")m({mutation:C,count:x.details?.itemCount||0});else if(x.code==="DATA_STALE")await y();else d(x.message)}}
async function v(C,x,R){const W=window.prompt("Новое название",R);W?.trim()&&await j({action:"rename",level:C,id:x,name:W.trim()})}
async function b(C,x,R){if(window.confirm("Архивировать «"+R+"»? Позиции и история сохранятся."))await j({action:"archive",level:C,id:x})}
async function N(C,x,R){if(window.confirm("Удалить «"+R+"»? Если элемент используется, BarDoctor предложит безопасный перенос."))await j({action:"delete",level:C,id:x})}
async function E(C,x,R){const W=window.prompt(R||"Название нового элемента");W?.trim()&&await j({action:"create",level:C,name:W.trim(),parentId:x||void 0})}
if(s==="loading")return i.jsx("div",{className:"bd-tax-loading-v336",children:"Загружаем структуру…"});
if(!t)return i.jsxs("div",{className:"bd-tax-loading-v336",children:[u||"Структура недоступна",i.jsx("button",{type:"button",onClick:y,children:"Повторить"})]});
const T=bdAlphabeticalV363(t.sections),A=bdAlphabeticalV363(t.categories),k=bdAlphabeticalV363(t.subcategories),bdTaxQueryV369=bdNormalizeNomenclatureSearchV369(bdQueryV369),bdSearchV369=Boolean(bdTaxQueryV369);
const bdDuplicateMapV369=new Map;for(const C of T.filter(C=>C.active!==!1&&!C.parentId)){const x=bdTaxDuplicateSignatureV369(C.name),R=bdDuplicateMapV369.get(x)||[];R.push(C),bdDuplicateMapV369.set(x,R)}const bdDuplicatesV369=[...bdDuplicateMapV369.values()].filter(C=>C.length>1);
function bdMatchesV369(C){return!bdSearchV369||bdNormalizeNomenclatureSearchV369(C?.name).includes(bdTaxQueryV369)}
function bdSectionMatchesV369(C){if(bdMatchesV369(C))return!0;const x=T.filter(R=>R.parentId===C.id),W=A.filter(R=>R.parentId===C.id);return x.some(bdSectionMatchesV369)||W.some(R=>bdMatchesV369(R)||k.some(K=>K.parentId===R.id&&bdMatchesV369(K)))}
function bdNodeV369(C,x,R,W){const J=bdTaxUsageV336(r,C,x.id),K=C==="section"?bdTaxActiveV336(t?.sections).filter(q=>q.id!==x.id&&!bdSectionDescendantIdsV365(t?.sections,x.id).has(q.id)):C==="category"?bdTaxActiveV336(t?.sections):C==="subcategory"?bdTaxActiveV336(t?.categories):[],q=C==="section"?"разделом":C==="category"?"категорией":"подкатегорией";return i.jsxs("article",{className:"bd-tax-node-v336 level-"+C+(!x.active?" archived":""),children:[i.jsxs("div",{className:"bd-tax-node-main-v336",children:[R?i.jsxs("button",{type:"button",className:"bd-tax-disclosure-v369","aria-expanded":R.open,"aria-controls":R.controls,onClick:()=>{R.toggle(),bdSetFocusV369({level:C,id:x.id})},children:[i.jsxs("span",{children:[i.jsx("strong",{children:x.name}),i.jsxs("small",{children:[J," активных поз.",!x.active?" · Архив":""]})]}),i.jsx("b",{"aria-hidden":!0,children:R.open?"−":"+"})]}):i.jsxs("span",{children:[i.jsx("strong",{children:x.name}),i.jsxs("small",{children:[J," активных поз.",!x.active?" · Архив":""]})]}),i.jsxs("details",{className:"bd-tax-node-menu-v362 bd-tax-node-menu-v364",children:[i.jsx("summary",{"aria-label":"Действия: "+x.name,children:"Действия"}),i.jsxs("div",{className:"bd-tax-node-popover-v364",children:[i.jsxs("header",{children:[i.jsx("strong",{children:"Действия с "+q}),i.jsx("small",{children:x.name})]}),i.jsxs("div",{className:"bd-tax-node-actions-v336",children:[i.jsx("button",{type:"button",onClick:()=>v(C,x.id,x.name),children:"Переименовать"}),x.active?i.jsx("button",{type:"button",onClick:()=>b(C,x.id,x.name),children:"В архив"}):i.jsx("button",{type:"button",onClick:()=>j({action:"restore",level:C,id:x.id}),children:"Восстановить"}),i.jsx("button",{type:"button",className:"danger",onClick:()=>N(C,x.id,x.name),children:"Удалить"})]}),C==="section"?i.jsxs("label",{className:"bd-tax-move-menu-v364 bd-tax-section-parent-v365",children:[i.jsx("span",{children:"Родитель раздела"}),i.jsxs("select",{"aria-label":"Родитель раздела: "+x.name,value:x.parentId||"",onChange:Q=>j({action:"move",level:C,id:x.id,parentId:Q.target.value}),children:[i.jsx("option",{value:"",children:"Верхний уровень"}),...K.map(Q=>i.jsx("option",{value:Q.id,children:bdSectionPathLabelV365(t?.sections,Q)},Q.id))]}),i.jsx("small",{children:"Выберите родительский раздел или оставьте верхний уровень."})]}):K.length?i.jsxs("label",{className:"bd-tax-move-menu-v364",children:[i.jsx("span",{children:C==="category"?"Родитель категории":"Родитель подкатегории"}),i.jsx("select",{"aria-label":(C==="category"?"Родитель категории: ":"Родитель подкатегории: ")+x.name,value:x.parentId||"",onChange:Q=>j({action:"move",level:C,id:x.id,parentId:Q.target.value}),children:K.map(Q=>i.jsx("option",{value:Q.id,children:C==="category"?bdSectionPathLabelV365(t?.sections,Q):Q.name},Q.id))}),i.jsx("small",{children:C==="category"?"Категория появится внутри выбранного раздела.":"Подкатегория появится внутри выбранной категории."})]}):null]})]})]})]}),W]},x.id)}
function bdCategoryV369(C){if(bdSearchV369&&!bdMatchesV369(C)&&!k.some(x=>x.parentId===C.id&&bdMatchesV369(x)))return null;const x=bdSearchV369||!!bdOpenCategoriesV369[C.id],R="bd-tax-category-v369-"+C.id,W=x?i.jsxs("div",{id:R,className:"bd-tax-children-v336",children:[...k.filter(J=>J.parentId===C.id&&(!bdSearchV369||bdMatchesV369(J))).map(J=>bdNodeV369("subcategory",J,null,null)),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-secondary-v360",onClick:()=>E("subcategory",C.id,"Название новой подкатегории в категории «"+C.name+"»"),children:"+ Добавить подкатегорию"})]}):null;return bdNodeV369("category",C,{open:x,controls:R,toggle:()=>bdSetOpenCategoriesV369(J=>({...J,[C.id]:!J[C.id]}))},W)}
function bdSectionV369(C,x=0){if(bdSearchV369&&!bdSectionMatchesV369(C))return null;const R=bdSearchV369||!!bdOpenSectionsV369[C.id],W="bd-tax-section-v369-"+C.id,J=R?i.jsxs("div",{id:W,className:"bd-tax-children-v336",children:[...bdAlphabeticalV363([...T.filter(K=>K.parentId===C.id).map(K=>({kind:"section",node:K,name:K.name})),...A.filter(K=>K.parentId===C.id).map(K=>({kind:"category",node:K,name:K.name}))]).map(K=>K.kind==="section"?bdSectionV369(K.node,x+1):bdCategoryV369(K.node)),i.jsx("button",{type:"button",className:"bd-tax-add-child-v336 bd-tax-add-primary-v360",onClick:()=>E("category",C.id,"Название новой категории в разделе «"+C.name+"»"),children:"+ Добавить категорию в «"+C.name+"»"})]}):null,Q=bdNodeV369("section",C,{open:R,controls:W,toggle:()=>bdSetOpenSectionsV369(K=>({...K,[C.id]:!K[C.id]}))},J);return x?i.jsx("div",{className:"bd-tax-nested-section-v365",children:Q},C.id):Q}
const bdFocusNodeV369=bdFocusV369&&(bdFocusV369.level==="section"?T:bdFocusV369.level==="category"?A:k).find(C=>C.id===bdFocusV369.id),bdRootsV369=T.filter(C=>!C.parentId||!T.some(x=>x.id===C.parentId));
return i.jsxs("section",{className:"bd-tax-manager-v336 bd-tax-manager-v369","data-bd-taxonomy-order":"alphabetical-v363",children:[i.jsxs("header",{children:[i.jsxs("div",{children:[i.jsx("h3",{children:"Разделы и категории"}),i.jsx("p",{children:"Раскрывайте только нужную ветку. Поиск применяется к названиям всех уровней."})]}),i.jsx("button",{type:"button",onClick:()=>E("section",null,"Название нового раздела"),children:"+ Добавить раздел"})]}),bdFocusNodeV369&&i.jsxs("div",{className:"bd-tax-breadcrumb-v369","aria-label":"Выбранный элемент",children:[i.jsx("span",{children:"Выбрано"}),i.jsx("strong",{children:bdFocusV369.level==="section"?bdSectionPathLabelV365(T,bdFocusNodeV369):bdFocusNodeV369.name})]}),bdDuplicatesV369.length?i.jsxs("section",{className:"bd-tax-duplicate-audit-v369",role:"status",children:[i.jsx("strong",{children:"Возможные дубли разделов"}),bdDuplicatesV369.map(C=>i.jsx("p",{children:C.map(x=>x.name).join(" ↔ ")+". Проверьте связи перед безопасным объединением."},C.map(x=>x.id).join("-"))),i.jsx("small",{children:"BarDoctor не объединяет разделы автоматически, чтобы не повредить меню, техкарты, остатки и историю."})]}):null,i.jsx("div",{className:"bd-tax-tree-v336",children:bdRootsV369.map(C=>bdSectionV369(C))}),bdSearchV369&&!bdRootsV369.some(bdSectionMatchesV369)&&i.jsx("div",{className:"bd-tax-empty-v369",children:"Категории не найдены — измените запрос."}),i.jsx(bdBulkClassificationV337,{onSaved:e}),u&&i.jsx("p",{className:"bd-tax-error-v336",role:"alert",children:u}),f&&i.jsxs("div",{className:"bd-tax-conflict-v336",children:[i.jsxs("strong",{children:["В категории находится ",f.count," позиций"]}),i.jsx("p",{children:"Перенесите позиции в другой элемент того же уровня или оставьте их без категории. Исторические документы не изменятся."}),i.jsx("select",{value:h,onChange:C=>g(C.target.value),children:[i.jsx("option",{value:"",children:"Выберите категорию для переноса"}),...bdAlphabeticalV363(bdTaxArrayV336(t[f.mutation.level==="section"?"sections":f.mutation.level==="category"?"categories":"subcategories"]).filter(C=>C.id!==f.mutation.id&&C.active)).map(C=>i.jsx("option",{value:C.id,children:C.name},C.id))]}),i.jsxs("div",{children:[i.jsx("button",{type:"button",disabled:!h,onClick:()=>j({...f.mutation,strategy:"move",targetId:h}),children:"Перенести и удалить"}),i.jsx("button",{type:"button",onClick:()=>j({...f.mutation,strategy:"unassign"}),children:"Оставить без категории"}),i.jsx("button",{type:"button",onClick:()=>m(null),children:"Отмена"})]})]})]})}

`;
  source = source.slice(0, managerStart) + helpers + manager + source.slice(managerEnd);

  replaceExactly('const v=bdNomenclatureTree(n),b=bdNomenclatureItems(n),N=b.filter(P=>P.active!==!1)', 'const v=bdNomenclatureTree(n),b=bdNomenclatureItems(n),bdReturnItemV369=window.bdReadNavigationQuery("item","");S.useEffect(()=>{if(!bdReturnItemV369||d)return;const P=b.find(C=>String(bdWarehouseKey(C))===String(bdReturnItemV369)||String(C.id||"")===String(bdReturnItemV369));P&&f(P)},[bdReturnItemV369,b.length]);const N=b.filter(P=>P.active!==!1)', "Nomenclature relation return state", 2);
  replaceExactly('const C=(String(P.name||"")+" "+bdNomenclaturePathParts(v,P).join(" ")).toLocaleLowerCase("ru");return!a||C.includes(a.toLocaleLowerCase("ru"))', 'const C=bdNormalizeNomenclatureSearchV369(String(P.name||"")+" "+bdNomenclaturePathParts(v,P).join(" "));return!a||C.includes(bdNormalizeNomenclatureSearchV369(a))', "Normalized nomenclature search", 2);
  replaceExactly('l==="attention"?_.length:l==="all"?N.length:E.length," ",l==="attention"?"на проверке":l==="all"?"всего":"на складе"', 'l==="attention"?_.length:l==="all"?N.length:E.length," ",l==="attention"?"на проверке":l==="all"?"активных позиций":"активных складских позиций"', "Metric label");
  replaceExactly('onClick:()=>u(P),children:[i.jsx("span",{children:C})', 'onClick:()=>{P==="taxonomy"&&s("");u(P)},children:[i.jsx("span",{children:C})', "Mode-scoped search");
  replaceExactly('placeholder:"Поиск по названию или разделу","aria-label":"Поиск по номенклатуре"', 'placeholder:l==="taxonomy"?"Найти раздел или категорию":"Поиск по названию, объёму или разделу","aria-label":l==="taxonomy"?"Поиск по категориям":"Поиск по номенклатуре"', "Search mode copy", 2);
  replaceExactly('i.jsx(bdTaxonomyManagerV336,{onSaved:P=>r(bdWarehouseRecord(P))})', 'i.jsx(bdTaxonomyManagerV336,{onSaved:P=>r(bdWarehouseRecord(P)),query:a})', "Taxonomy query binding");
  replaceExactly('Q.length&&i.jsxs("section",{className:"bd-taxonomy-subcategory-v238 open bd-taxonomy-direct-v362"', 'Q.length>0?i.jsxs("section",{className:"bd-taxonomy-subcategory-v238 open bd-taxonomy-direct-v362"', "Orphan zero guard");
  replaceExactly('i.jsx("div",{className:"bd-taxonomy-items-v238",children:Q.map(Y=>i.jsx(bdNomenclatureRowV238,{item:Y,tree:t,onOpen:n,nested:!0},bdWarehouseKey(Y)))})]})]}):', 'i.jsx("div",{className:"bd-taxonomy-items-v238",children:Q.map(Y=>i.jsx(bdNomenclatureRowV238,{item:Y,tree:t,onOpen:n,nested:!0},bdWarehouseKey(Y)))})]}):null]}):', "Orphan zero ternary");
  replaceExactly('i.jsxs("div",{children:[i.jsxs("span",{children:["Меню: ",menuUsage]}),i.jsxs("span",{children:["Техкарты: ",recipeUsage]}),i.jsxs("span",{children:["Поставщики: ",sourceMappings.length]})]})', 'i.jsxs("div",{children:[i.jsxs("button",{type:"button",onClick:()=>window.location.assign(bdNomenclatureRelationUrlV369("menu",menuUsage,e)),"aria-label":"Открыть связанные позиции меню: "+menuUsage,children:["Меню: ",menuUsage]}),i.jsxs("button",{type:"button",onClick:()=>window.location.assign(bdNomenclatureRelationUrlV369("recipes",recipeUsage,e)),"aria-label":"Открыть связанные техкарты: "+recipeUsage,children:["Техкарты: ",recipeUsage]}),i.jsxs("button",{type:"button",onClick:()=>window.location.assign(bdNomenclatureRelationUrlV369("suppliers",sourceMappings.length,e)),"aria-label":"Открыть связи с поставщиками: "+sourceMappings.length,children:["Поставщики: ",sourceMappings.length]})]})', "Relation drill-down chips");
  replaceExactly('className:"bd-assortment-back-v170",onClick:()=>window.bdNavigateBack(window.bdReadNavigationQuery("returnTo","")==="nomenclature"?"/nomenclature":"/more"),"aria-label":window.bdReadNavigationQuery("returnTo","")==="nomenclature"?"Назад в номенклатуру":"Назад в Ещё"', 'className:"bd-assortment-back-v170",onClick:()=>window.bdNavigateBack(window.bdReadNavigationQuery("returnTo","")==="nomenclature"?bdNomenclatureReturnUrlV369():"/more"),"aria-label":window.bdReadNavigationQuery("returnTo","")==="nomenclature"?"Назад в карточку номенклатуры":"Назад в Ещё"', "Catalog relation Back");
  replaceExactly('className:"bd-proc-back-v168",onClick:()=>window.bdNavigateBack("/more"),"aria-label":"Назад в Ещё"', 'className:"bd-proc-back-v168",onClick:()=>window.bdNavigateBack(window.bdReadNavigationQuery("returnTo","")==="nomenclature"?bdNomenclatureReturnUrlV369():"/more"),"aria-label":window.bdReadNavigationQuery("returnTo","")==="nomenclature"?"Назад в карточку номенклатуры":"Назад в Ещё"', "Supplier relation Back");
}

source = source.replace(
  '):null]})]})]})]}),W]},x.id)}\nfunction bdCategoryV369',
  '):null]})]})]}),W]},x.id)}\nfunction bdCategoryV369',
);

fs.writeFileSync(bundlePath, source);

let taxonomyCss = fs.readFileSync(taxonomyCssPath, "utf8");
if (!taxonomyCss.includes(marker)) taxonomyCss += `

/* ${marker} */
.bd-tax-manager-v369 .bd-tax-tree-v336 { contain: layout style; }
.bd-tax-disclosure-v369 { display: flex; min-width: 0; flex: 1 1 auto; min-height: 44px !important; align-items: center; justify-content: space-between; border: 0 !important; padding: 4px 2px !important; background: transparent !important; text-align: left; }
.bd-tax-disclosure-v369 > span { min-width: 0; }
.bd-tax-disclosure-v369 strong, .bd-tax-disclosure-v369 small { display: block; }
.bd-tax-disclosure-v369 strong { overflow-wrap: break-word; word-break: normal; }
.bd-tax-disclosure-v369 > b { flex: none; color: #625cf2; font-size: 18px; }
.bd-tax-breadcrumb-v369 { position: sticky; z-index: 12; top: 68px; display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid #dddafe; border-radius: 12px; background: rgba(248,247,255,.96); backdrop-filter: blur(8px); color: #4f49ce; font-size: 11px; }
.bd-tax-breadcrumb-v369 span { color: #7d8294; }
.bd-tax-duplicate-audit-v369 { display: grid; gap: 5px; padding: 12px; border: 1px solid #f1cb79; border-radius: 14px; background: #fff9e8; color: #704c05; }
.bd-tax-duplicate-audit-v369 p { margin: 0; font-size: 12px; }
.bd-tax-duplicate-audit-v369 small { line-height: 1.4; }
.bd-tax-empty-v369 { padding: 18px; border: 1px dashed #d9dce7; border-radius: 14px; color: #73798d; text-align: center; }
.bd-tax-node-menu-v364 > summary { white-space: nowrap; }
@media (max-width: 620px) { .bd-tax-breadcrumb-v369 { top: 60px; } .bd-tax-node-main-v336 { align-items: flex-start; } }
`;
fs.writeFileSync(taxonomyCssPath, taxonomyCss);

let nomenclatureCss = fs.readFileSync(nomenclatureCssPath, "utf8");
if (!nomenclatureCss.includes(marker)) nomenclatureCss += `

/* ${marker} */
.bd-nomenclature-quick-actions-v238 { overflow-x: auto; grid-template-columns: repeat(5, minmax(92px, 1fr)); scrollbar-width: thin; }
.bd-nomenclature-quick-actions-v238 button { overflow-wrap: normal; word-break: normal; white-space: nowrap; }
.bd-nomenclature-usage-v353 button { min-height: 34px; padding: 6px 10px; border: 1px solid #dcdef0; border-radius: 999px; color: #514bd3; background: #f0efff; font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.bd-nomenclature-usage-v353 button:focus-visible { outline: 3px solid rgba(91,92,235,.25); outline-offset: 2px; }
@media (max-width: 620px) { .bd-nomenclature-quick-actions-v238 { display: flex; padding-bottom: 3px; } .bd-nomenclature-quick-actions-v238 button { flex: 0 0 auto; min-width: 96px; } }
`;
fs.writeFileSync(nomenclatureCssPath, nomenclatureCss);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(/index-BQGspy0I\.js\?v=([^"']+)/g, (match, version) => version.includes(marker) ? match : `index-BQGspy0I.js?v=${version}-${marker}`);
  contents = contents.replace(/canonical-taxonomy-v336\.css\?v=([^"']+)/g, (match, version) => version.includes(marker) ? match : `canonical-taxonomy-v336.css?v=${version}-${marker}`);
  contents = contents.replace(/nomenclature-v208\.css\?v=([^"']+)/g, (match, version) => version.includes(marker) ? match : `nomenclature-v208.css?v=${version}-${marker}`);
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
