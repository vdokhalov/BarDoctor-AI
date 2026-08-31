import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const shellPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];
const cssPaths = [
  new URL("../public/catalog.css", import.meta.url),
  new URL("../public/nomenclature-v208.css", import.meta.url),
  new URL("../public/assortment-command-v170.css", import.meta.url),
];
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdCatalogWorkflowUxVersion="v353"';

function refreshShellCache() {
  for (const shellPath of shellPaths) {
    const current = readFileSync(shellPath, "utf8");
    if (current.includes("catalog-workflow-v353")) continue;
    let next = current.replace(
      /-menu-link-v352(?:-menu-link-v352)*/g,
      "-menu-link-v352-catalog-workflow-v353",
    );
    next = next.replace(/(nomenclature-v208\.css\?v=[^\"']+)/, "$1-catalog-workflow-v353");
    next = next.replace(/(catalog\.css\?v=[^\"']+)/, "$1-catalog-workflow-v353");
    next = next.replace(/(assortment-command-v170\.css\?v=[^\"']+)/, "$1-catalog-workflow-v353");
    if (next !== current) writeFileSync(shellPath, next);
  }
}

function ensureCss() {
  const blocks = new Map([
    [cssPaths[0], `

/* Catalog workflow UX v353 */
.bd-catalog-workflow-status-v353 {
  display: grid;
  gap: 5px;
  padding: 12px 14px;
  border: 1px solid #dcd9ff;
  border-radius: 14px;
  color: #403a96;
  background: #f7f6ff;
  font-size: 12px;
  line-height: 1.4;
}
.bd-catalog-workflow-status-v353.good {
  border-color: #cdebd9;
  color: #216746;
  background: #f0faf4;
}
.bd-catalog-stock-box-v353 {
  border: 1px solid #e3e5ed;
  border-radius: 13px;
  background: #fafbfe;
}
.bd-catalog-stock-box-v353 > summary {
  min-height: 42px;
  padding: 0 12px;
  cursor: pointer;
  color: #616980;
  font-size: 11px;
  font-weight: 800;
  line-height: 42px;
}
.bd-catalog-stock-box-v353 > :not(summary) { margin-inline: 12px; }
.bd-catalog-stock-box-v353 > :last-child { margin-bottom: 12px; }
.bd-menu-type-note-v353 {
  margin: -3px 0 2px;
  color: #697087;
  font-size: 11px;
  line-height: 1.45;
}
`],
    [cssPaths[1], `

/* Connected nomenclature workflow v353 */
.bd-nomenclature-usage-v353 {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e1e3ec;
  border-radius: 14px;
  background: #fafbfe;
}
.bd-nomenclature-usage-v353 header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bd-nomenclature-usage-v353 small { color: #747c92; }
.bd-nomenclature-usage-v353 div { display: flex; flex-wrap: wrap; gap: 7px; }
.bd-nomenclature-usage-v353 span {
  padding: 6px 9px;
  border-radius: 999px;
  color: #4d5470;
  background: #eef0f6;
  font-size: 11px;
  font-weight: 750;
}
.bd-nomenclature-quick-actions-v238 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
@media (max-width: 620px) {
  .bd-nomenclature-quick-actions-v238 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
`],
    [cssPaths[2], `

/* Assortment workflow navigation v353 */
.bd-assortment-tabs-v170 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
@media (max-width: 520px) {
  .bd-assortment-tabs-v170 { overflow-x: auto; grid-template-columns: repeat(5, minmax(92px, 1fr)); }
}
`],
  ]);
  for (const [cssPath, block] of blocks) {
    const current = readFileSync(cssPath, "utf8");
    if (!current.includes("v353")) appendFileSync(cssPath, block);
  }
}

function applyV353Repairs() {
  source = source.replace(
    'O=h.type==="service"||h.type==="ready"?Boolean(_&&k):Boolean(k),M=()=>{',
    'O=h.type==="service"||(h.type==="ready"?Boolean(_&&k):Boolean(k)),M=()=>{',
  );
  source = source.replace(
    'Ae=async w=>{const R=bdCatState(E),',
    'Ae=async w=>{const R=bdCatState(xr(bdCatalogStoreKey)||E),',
  );
  source = source.replace(
    'products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C)),unitOptions:he.saleSizeUnits}),!1&&i.jsx(bdCatStructureManager',
    'products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C)),unitOptions:he.saleSizeUnits,onNomenclatureCreated:P=>{if(!P)return;const R=bdCatState(P);_(R),Kse(bdCatalogStoreKey,R)}}),!1&&i.jsx(bdCatStructureManager',
  );
}

if (source.includes(marker)) {
  applyV353Repairs();
  writeFileSync(bundlePath, source);
  ensureCss();
  refreshShellCache();
  console.log("Catalog workflow UX v353 is already applied.");
  process.exit(0);
}
if (!source.includes('const bdMenuNomenclatureLinkVersion="v352"')) {
  throw new Error("Menu nomenclature link v352 must be applied first.");
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
  if (index < 0) {
    throw new Error(`${label}: marker not found inside scope`);
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  'const bdMenuNomenclatureLinkVersion="v352";',
  'const bdMenuNomenclatureLinkVersion="v352";\n' + marker + ";",
  "insert v353 marker",
);

replaceScopedOnce(
  "function bdNomenclatureInitialFormV237",
  "return{...n,purchaseMode:s,unitPackageSize:a}",
  'return{...n,itemType:e?.itemType||(e?.kind==="service"?"other":"product"),purchaseMode:s,unitPackageSize:a}',
  "add canonical item role to nomenclature form",
);
replaceScopedOnce(
  "function bdNomenclatureSheetV237",
  'sourceMappings=bdCatArray(t?.supplierProductMappings).filter(P=>P.canonicalProductKey===s&&P.status!=="orphan"),manualCandidates=',
  'sourceMappings=bdCatArray(t?.supplierProductMappings).filter(P=>P.canonicalProductKey===s&&P.status!=="orphan"),menuUsage=bdCatArray(t?.menuItems).filter(P=>P.readyProduct?.productKey===s||P.readyProduct?.nomenclatureItemId===e?.id).length,recipeUsage=bdCatArray(t?.recipes).reduce((P,C)=>P+bdCatArray(C.ingredients).filter(D=>D.purchaseProductKey===s||D.nomenclatureItemId===e?.id).length,0),manualCandidates=',
  "calculate nomenclature usage",
);
replaceScopedOnce(
  "function bdNomenclatureSheetV237",
  'if(P==="kind"&&C==="service")return{...D,kind:C,unit:"pcs",packageSize:"1 усл.",category:"other",purchaseMode:"document",displayUnit:"auto"};',
  'if(P==="kind"&&C==="service")return{...D,kind:C,itemType:"other",unit:"pcs",packageSize:"1 усл.",category:"other",purchaseMode:"document",displayUnit:"auto"};',
  "align service role",
);
replaceScopedOnce(
  "function bdNomenclatureSheetV237",
  'i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Статья покупки"}),',
  'i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Роль в системе"}),i.jsxs("select",{value:u.itemType||"product",disabled:u.kind==="service",onChange:P=>A("itemType",P.target.value),children:[i.jsx("option",{value:"product",children:"Готовый товар"}),i.jsx("option",{value:"ingredient",children:"Ингредиент"}),i.jsx("option",{value:"semi_finished",children:"Полуфабрикат"}),i.jsx("option",{value:"finished_dish",children:"Готовое блюдо"}),i.jsx("option",{value:"consumable",children:"Расходный материал"}),i.jsx("option",{value:"other",children:"Прочее"})]})]}),i.jsxs("label",{className:"bd-warehouse-product-field",children:[i.jsx("span",{children:"Статья покупки"}),',
  "show nomenclature role",
);
replaceScopedOnce(
  "function bdNomenclatureSheetV237",
  'sourceMappings.length>0&&i.jsxs("section",{className:"bd-nomenclature-suppliers-v260"',
  's&&i.jsxs("section",{className:"bd-nomenclature-usage-v353",children:[i.jsxs("header",{children:[i.jsx("strong",{children:"Использование"}),i.jsx("small",{children:"Связи обновляются автоматически"})]}),i.jsxs("div",{children:[i.jsxs("span",{children:["Меню: ",menuUsage]}),i.jsxs("span",{children:["Техкарты: ",recipeUsage]}),i.jsxs("span",{children:["Поставщики: ",sourceMappings.length]})]})]}),sourceMappings.length>0&&i.jsxs("section",{className:"bd-nomenclature-suppliers-v260"',
  "show nomenclature usage",
);

replaceScopedOnce(
  "function bdNomenclaturePageV238",
  'back:window.bdReadNavigationQuery("returnTo","")==="warehouse"?"/warehouse":"/more"',
  'back:window.bdReadNavigationQuery("returnTo","")==="warehouse"?"/warehouse":window.bdReadNavigationQuery("returnTo","")==="assortment"?"/assortment":"/more"',
  "return nomenclature to assortment",
);
replaceScopedOnce(
  "function bdNomenclaturePageV238",
  'i.jsx("button",{type:"button",onClick:()=>e("/warehouse"),children:"Остатки"})',
  'i.jsx("button",{type:"button",onClick:()=>e("/warehouse"),children:"Остатки"}),i.jsx("button",{type:"button",onClick:()=>e("/assortment?tab=menu"),children:"Меню"}),i.jsx("button",{type:"button",onClick:()=>e("/assortment?tab=recipes"),children:"Техкарты"})',
  "add connected workflow actions",
);

replaceScopedOnce(
  "function bdCatMenuEditor",
  'O=h.type==="service"||Boolean(k),M=()=>{',
  'O=h.type==="service"||h.type==="ready"?Boolean(_&&k):Boolean(k),M=()=>{',
  "require nomenclature link for ready product",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'if(!O){j(h.legacyPortionSize?',
  'if(!O){j(h.type==="ready"&&!_?"Выберите товар из номенклатуры или создайте его здесь.":h.legacyPortionSize?',
  "explain missing ready-product link",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'children:"Размер продажи хранится отдельно от расхода по техкарте."',
  'children:"Сначала укажите, что продаётся. Готовый товар связывается со складом, блюдо или напиток — с техкартой."',
  "clarify menu editor purpose",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'label:"Тип позиции"',
  'label:"Что продаётся"',
  "rename menu type field",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  'i.jsx("option",{value:"composite",children:"Составная · по техкарте"}),i.jsx("option",{value:"ready",children:"Готовый товар · из номенклатуры"}),i.jsx("option",{value:"service",children:"Услуга"})',
  'i.jsx("option",{value:"composite",children:"Блюдо или напиток · готовится по техкарте"}),i.jsx("option",{value:"ready",children:"Готовый товар · продаётся без приготовления"}),i.jsx("option",{value:"service",children:"Услуга · без склада и техкарты"})',
  "use task-oriented menu type labels",
);
replaceScopedOnce(
  "function bdCatMenuEditor",
  '}),h.type==="ready"&&i.jsx(bdCatField,{label:"Номенклатура"',
  '}),i.jsx("p",{className:"bd-menu-type-note-v353",children:h.type==="ready"?"Обязательная связь: одна продажа спишет выбранную складскую упаковку.":h.type==="composite"?"После сохранения сразу откроется техкарта этой позиции.":"Услуга не создаёт движения по складу."}),h.type==="ready"&&i.jsx(bdCatField,{label:"Номенклатура"',
  "show menu type consequence",
);

replaceScopedOnce(
  "function bdCatRecipeEditor",
  'const bdMissingCostCount=l.ingredients.filter(p=>{if(!p.purchaseProductKey)return!1;',
  'const bdMissingCostCount=l.ingredients.filter(p=>{if(!p.purchaseProductKey)return!1;',
  "locate recipe validation",
);
replaceScopedOnce(
  "function bdCatRecipeEditor",
  '}).length;return i.jsx("div",{className:"bd-catalog-sheet-backdrop"',
  '}).length,bdTechInvalidCount=l.ingredients.filter(p=>!p.name.trim()||!(bdCatNumber(p.quantity)>0)||!p.purchaseProductKey||p.linkStatus==="missing"||["requires_review","invalid","missing"].includes(p.unitResolutionStatus)).length,bdTechLinkedCount=l.ingredients.length-bdTechInvalidCount,bdTechCanConfirm=l.ingredients.length>0&&bdTechInvalidCount===0;return i.jsx("div",{className:"bd-catalog-sheet-backdrop"',
  "calculate recipe readiness",
);
replaceScopedOnce(
  "function bdCatRecipeEditor",
  'i.jsxs("p",{children:[e.name," · нормы на одну продажу"]})',
  'i.jsxs("p",{children:[e.name," · нормы на одну продажу",t?.version?" · версия "+t.version:""]})',
  "show recipe version",
);
replaceScopedOnce(
  "function bdCatRecipeEditor",
  'children:[l.status!=="confirmed"&&i.jsx("div",{className:"bd-catalog-review-note"',
  'children:[i.jsxs("div",{className:"bd-catalog-workflow-status-v353 "+(bdTechCanConfirm?"good":""),role:"status",children:[i.jsx("strong",{children:bdTechCanConfirm?"Техкарта готова к подтверждению":"Завершите обязательные связи"}),i.jsxs("span",{children:["Связано ",bdTechLinkedCount," из ",l.ingredients.length," ингредиентов",bdTechInvalidCount?" · проверить: "+bdTechInvalidCount:""]})]}),l.status!=="confirmed"&&i.jsx("div",{className:"bd-catalog-review-note"',
  "show recipe progress",
);
replaceScopedOnce(
  "function bdCatRecipeEditor",
  'i.jsxs("div",{className:"bd-catalog-stock-box",children:[i.jsxs("b",{children:["Остаток и резерв в базовой единице: ",bdCatUnitLabel(I.unit)]})',
  'i.jsxs("details",{className:"bd-catalog-stock-box-v353",children:[i.jsx("summary",{children:"Складские параметры (необязательно)"}),i.jsxs("b",{children:["Остаток и резерв в базовой единице: ",bdCatUnitLabel(I.unit)]})',
  "collapse optional stock fields",
);
replaceScopedOnce(
  "function bdCatRecipeEditor",
  'className:"bd-catalog-primary",disabled:!l.ingredients.length,onClick:()=>E(!0)',
  'className:"bd-catalog-primary",disabled:!bdTechCanConfirm,onClick:()=>E(!0)',
  "block incomplete recipe confirmation",
);

replaceScopedOnce(
  "function bdAssortmentRecipesV170",
  'children:"Создать техкарту"',
  'children:"Выбрать позицию без техкарты"',
  "rename empty recipe action",
);
replaceScopedOnce(
  "function bdAssortmentRecipesV170",
  'i.jsx(Vt,{size:18}),"Создать техкарту"',
  'i.jsx(Vt,{size:18}),"Выбрать позицию без техкарты"',
  "rename recipe CTA",
);

replaceOnce(
  'function bdAssortmentHeaderV170({tab:e,onTab:t,profile:n,venueContext:r})',
  'function bdAssortmentHeaderV170({tab:e,onTab:t,onNomenclature:bdOpenNomenclatureV353,profile:n,venueContext:r})',
  "accept nomenclature navigation",
);
replaceScopedOnce(
  "function bdAssortmentHeaderV170",
  '{id:"overview",label:"Обзор"},{id:"menu",label:"Меню"},{id:"recipes",label:"Техкарты"},{id:"needs",label:"К закупке"}',
  '{id:"overview",label:"Обзор"},{id:"nomenclature",label:"Номенклатура"},{id:"menu",label:"Меню"},{id:"recipes",label:"Техкарты"},{id:"needs",label:"К закупке"}',
  "add nomenclature tab",
);
replaceScopedOnce(
  "function bdAssortmentHeaderV170",
  'onClick:()=>t(a.id)',
  'onClick:()=>a.id==="nomenclature"?bdOpenNomenclatureV353?.():t(a.id)',
  "route nomenclature tab",
);

replaceScopedOnce(
  "function bdAssortmentCommandPageV170",
  'await Ne("Позиция сохранена",{...R,menuItems:p,recipes:oe,priceHistory:c}),M(null)',
  'await Ne("Позиция сохранена",{...R,menuItems:p,recipes:oe,priceHistory:c}),M(null),!P&&w.type==="composite"&&(f("recipes"),v("all"),z(w))',
  "continue new prepared item to recipe",
);
replaceScopedOnce(
  "function bdAssortmentCommandPageV170",
  'De=()=>{const w=he.recipes?.find(R=>R.recipeStatus==="missing"||R.recipeStatus==="draft")||he.recipes?.[0];w&&z(E.menuItems.find(R=>R.id===w.id)||null)}',
  'De=()=>{f("menu"),v("missing"),N("all"),a({variant:"default",title:"Выберите позицию меню",description:"Откройте нужное блюдо или напиток и нажмите «Создать техкарту»."})}',
  "make recipe creation explicit",
);
replaceScopedOnce(
  "function bdAssortmentCommandPageV170",
  'i.jsx(bdAssortmentHeaderV170,{tab:d,onTab:ye,profile:r,venueContext:s})',
  'i.jsx(bdAssortmentHeaderV170,{tab:d,onTab:ye,onNomenclature:()=>e("/nomenclature?returnTo=assortment"),profile:r,venueContext:s})',
  "connect assortment to nomenclature",
);

applyV353Repairs();
writeFileSync(bundlePath, source);
ensureCss();
refreshShellCache();
console.log("Applied catalog workflow UX v353.");
