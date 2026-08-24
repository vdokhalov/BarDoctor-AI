import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);

function replaceOnce(input, from, to, label) {
  const count = input.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return input.replace(from, to);
}

function replaceSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start marker not found`);
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end marker not found`);
  return input.slice(0, startIndex) + replacement + input.slice(endIndex);
}

let bundle = readFileSync(bundlePath, "utf8");

if (!bundle.includes("function bdCatIngredientMatchV258")) {
bundle = replaceOnce(
  bundle,
  'function bdCatPurchaseProducts(e){const t=new Map;for(const n of e){if(n.status!=="confirmed")continue;for(const r of bdCatArray(n.items)){const a=bdProcProductKey(r),s={key:a,name:r.name||"Товар",packageSize:r.packageSize||r.unit||"",supplierName:n.supplierName||"Поставщик",price:bdCatNumber(r.unitPrice)||bdCatNumber(r.lineTotal)/(bdCatNumber(r.quantity)||1),currency:n.currency||"RUB",date:n.date||"",...bdCatPackage(r.packageSize||r.unit)};if(!(s.price>0))continue;const l=t.get(a);(!l||s.date>=l.date)&&t.set(a,s)}}return[...t.values()].sort((n,r)=>String(n.name).localeCompare(String(r.name),"ru"))}',
  'function bdCatPurchaseProducts(e){const t=new Map;for(const n of e){if(n.status!=="confirmed")continue;for(const r of bdCatArray(n.items)){const a=bdProcProductKey(r),s={key:a,name:r.name||"Товар",packageSize:r.packageSize||r.unit||"",supplierName:n.supplierName||"Поставщик",category:r.subcategoryName||r.categoryName||r.category||"",sectionId:r.sectionId||"",categoryId:r.taxonomyCategoryId||r.categoryId||"",price:bdCatNumber(r.unitPrice)||bdCatNumber(r.lineTotal)/(bdCatNumber(r.quantity)||1),currency:n.currency||"RUB",date:n.date||"",...bdCatPackage(r.packageSize||r.unit)};const l=t.get(a);(!l||s.date>=l.date)&&t.set(a,s)}}return[...t.values()].sort((n,r)=>String(n.name).localeCompare(String(r.name),"ru"))}\nfunction bdCatMatchingProductsV258(e,t){const n=new Map,r=(a,s)=>{if(!a||a.active===!1||a.status==="archived")return;const l=a.productKey||a.key||bdProcProductKey(a),u=a.name||a.productName;if(!l||!u)return;const d=n.get(l)||{},f=bdCatPackage(a.packageSize||a.unit),m=["ml","g","pcs"].includes(a.baseUnit)?a.baseUnit:["ml","g","pcs"].includes(a.unit)?a.unit:f.unit!=="unknown"?f.unit:d.unit||"unknown";n.set(l,{...d,...a,key:l,name:s>=(d.sourceRank||0)?u:d.name||u,packageSize:a.packageSize||d.packageSize||a.unit||"",supplierName:a.supplierName||d.supplierName||"",category:a.subcategoryName||a.categoryName||a.category||d.category||"",price:bdCatNumber(a.price)||bdCatNumber(d.price),currency:a.currency||d.currency||"",amount:a.amount||f.amount||d.amount||0,unit:m,sourceRank:Math.max(s,d.sourceRank||0)})};for(const a of bdCatArray(t))r(a,1);for(const a of bdCatArray(e?.stockBalances))r(a,2);for(const a of bdCatArray(e?.nomenclature))r(a,3);return[...n.values()].sort((a,s)=>String(a.name).localeCompare(String(s.name),"ru"))}',
  "purchase products retain matching context",
);

bundle = replaceSegment(
  bundle,
  "function bdCatRecipeEditor",
  "function bdCatImportReview",
  String.raw`function bdCatMatchTokensV258(e){return[...new Set(bdProcNorm(String(e||"")).split(" ").filter(t=>t.length>1))]}
function bdCatMatchUnitV258(e){return e==="ml"?"мл":e==="g"?"г":e==="pcs"?"шт.":String(e||"ед.")}
function bdCatRankProductsV258(e,t,n=""){const r=bdCatMatchTokensV258(n||e.name),a=bdCatToBase(e.quantity,e.unit).unit,s=new Map(bdCatArray(e.matchSuggestions).map((u,d)=>[u.productKey,120-d])),l=t.map(u=>{const d=bdCatMatchTokensV258(u.name),f=r.filter(m=>d.includes(m)).length,h=r.length?f/r.length:0,g=u.unit&&a!=="unknown"&&u.unit!==a?-25:u.unit===a?12:0;return{...u,matchRank:(s.get(u.key)||0)+Math.round(h*70)+g}});return l.sort((u,d)=>d.matchRank-u.matchRank||String(u.name).localeCompare(String(d.name),"ru"))}
function bdCatIngredientMatchV258({ingredient:e,products:t,onChoose:n,showAll:r,onShowAll:a,query:s,onQuery:l}){const u=bdCatArray(e.matchSuggestions).slice(0,3),d=e.purchaseProductKey,f=t.find(g=>g.key===d),m=e.matchedName||f?.name||u.find(g=>g.productKey===d)?.name||e.canonicalName,h=e.linkStatus==="auto_linked"||e.linkSource==="semantic_match";if(d&&!r)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-linked",children:[i.jsxs("div",{className:"bd-ingredient-match-main-v258",children:[i.jsxs("span",{children:[i.jsx("strong",{children:m||"Связанный товар"}),i.jsx("small",{children:h?"Связано автоматически":"Связано пользователем"})]}),i.jsx("button",{type:"button",onClick:a,children:"Изменить"})]}),h&&bdCatArray(e.matchEvidence).length>0&&i.jsxs("details",{children:[i.jsx("summary",{children:"Почему связано?"}),i.jsx("p",{children:bdCatArray(e.matchEvidence).join(" · ")})]})]});if(!r&&e.matchTier==="medium"&&u.length)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-review",children:[i.jsxs("header",{children:[i.jsx("strong",{children:"Найдено "+u.length+" возможных соответствия"}),i.jsx("small",{children:e.matchReason||"Выберите подходящую позицию"})]}),i.jsx("div",{className:"bd-ingredient-suggestions-v258",children:u.map(g=>i.jsxs("button",{type:"button",onClick:()=>n(g.productKey,g),children:[i.jsxs("span",{children:[i.jsx("b",{children:g.name}),i.jsxs("small",{children:[bdCatMatchUnitV258(g.unit),g.category?" · "+g.category:"",g.supplierName?" · "+g.supplierName:""]})]}),i.jsxs("em",{children:[g.score,"%"]})]},g.productKey))}),i.jsx("button",{type:"button",className:"bd-ingredient-show-all-v258",onClick:a,children:"Показать все"})]});if(!r)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-missing",children:[i.jsxs("span",{children:[i.jsx("strong",{children:e.manualCardProtected?"Связь требует подтверждения":"Не связано с номенклатурой"}),i.jsx("small",{children:e.matchReason||"Надёжного соответствия не найдено"})]}),i.jsx("button",{type:"button",onClick:a,children:e.manualCardProtected?"Проверить":"Показать все"})]});const g=bdCatRankProductsV258(e,t,s),y=s?g:g.slice(0,20);return i.jsxs("div",{className:"bd-ingredient-full-search-v258",children:[i.jsx("input",{type:"search",value:s||"",onChange:j=>l(j.target.value),placeholder:"Поиск по номенклатуре и закупкам…","aria-label":"Поиск товара для ингредиента"}),i.jsxs("select",{value:d||"",onChange:j=>{const v=t.find(b=>b.key===j.target.value);n(j.target.value,v)},children:[i.jsx("option",{value:"",children:"Не связано"}),...y.map(j=>i.jsxs("option",{value:j.key,children:[j.name,j.packageSize?" · "+j.packageSize:"",j.supplierName?" · "+j.supplierName:""]},j.key))]}),!s&&g.length>20&&i.jsx("small",{children:"Показаны наиболее релевантные позиции. Используйте поиск для всего каталога."}),i.jsx("button",{type:"button",className:"bd-ingredient-show-all-v258",onClick:a,children:"Свернуть поиск"})]})}
function bdCatRecipeEditor({item:e,recipe:t,products:n,balances:r,onClose:a,onSave:s}){const[l,u]=S.useState(()=>t?{...t,ingredients:bdCatArray(t.ingredients).map(p=>({...p}))}:{id:crypto.randomUUID(),menuItemId:e.id,status:"draft",source:"manual",ingredients:e.type==="ready"?[{id:crypto.randomUUID(),name:e.name,quantity:1,unit:"шт.",confidence:1}]:[],warnings:[]}),[d,f]=S.useState(()=>{const p={};for(const c of bdCatArray(l.ingredients)){const I=bdCatBalanceKey(c),R=r.find(G=>G.key===I)||{};p[c.id]={key:I,current:R.current??"",safety:R.safety??"",onOrder:R.onOrder??"",packageAmount:R.packageAmount??"",checkedAt:R.checkedAt||""}}return p}),[m,h]=S.useState({}),[g,y]=S.useState({}),j=(p,c)=>u(I=>({...I,ingredients:I.ingredients.map(R=>R.id===p?{...R,...c}:R)})),v=(p,c)=>f(I=>({...I,[p]:{...(I[p]||{}),...c}})),b=()=>{const p={id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",confidence:1,matchTier:"low"};u(c=>({...c,ingredients:[...c.ingredients,p]})),f(c=>({...c,[p.id]:{key:bdCatBalanceKey(p),current:"",safety:"",onOrder:"",packageAmount:"",checkedAt:""}}))},N=(p,c,I)=>{const R=I||n.find(G=>G.key===c),W=c||"manual:"+bdProcNorm(p.name)+"|"+bdCatToBase(p.quantity,p.unit).unit,J=r.find(G=>G.key===W)||{};j(p.id,c?{purchaseProductKey:c,matchedName:R?.name||p.matchedName,linkStatus:"linked",linkSource:"manual",linkConfirmedByUser:!0,matchTier:"high",matchScore:100,matchEvidence:["подтверждено пользователем"],matchSuggestions:[]}:{purchaseProductKey:void 0,matchedName:void 0,linkStatus:"missing",linkSource:void 0,linkConfirmedByUser:void 0,matchTier:"low",matchScore:0,matchEvidence:[],matchSuggestions:[]}),v(p.id,{key:W,current:J.current??"",safety:J.safety??"",onOrder:J.onOrder??"",packageAmount:J.packageAmount??"",checkedAt:J.checkedAt||""}),h(G=>({...G,[p.id]:!1}))},E=p=>{const c=l.ingredients.filter(I=>I.name.trim()&&bdCatNumber(I.quantity)>0).map(I=>({...I,name:I.name.trim(),quantity:bdCatNumber(I.quantity),updatedAt:new Date().toISOString()})),I=c.map(R=>{const G=d[R.id]||{},H=R.purchaseProductKey||G.key||bdCatBalanceKey(R);return{key:H,productKey:H,name:R.matchedName||R.name,category:R.category||"other",current:Math.max(0,bdCatNumber(G.current)),safety:Math.max(0,bdCatNumber(G.safety)),onOrder:Math.max(0,bdCatNumber(G.onOrder)),packageAmount:Math.max(0,bdCatNumber(G.packageAmount)),unit:bdCatToBase(R.quantity,R.unit).unit,metadataSource:"recipe",checkedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}});s({...l,ingredients:c,status:p?"confirmed":"draft",source:l.source||"manual",updatedAt:new Date().toISOString(),confirmedAt:p?new Date().toISOString():l.confirmedAt},I),a()};return i.jsx("div",{className:"bd-catalog-sheet-backdrop",children:i.jsxs("section",{className:"bd-catalog-sheet",children:[i.jsx("div",{className:"bd-catalog-sheet-handle"}),i.jsxs("header",{className:"bd-catalog-sheet-head",children:[i.jsxs("div",{children:[i.jsx("h2",{children:"Техкарта"}),i.jsxs("p",{children:[e.name," · нормы на одну продажу"]})]}),i.jsx("button",{type:"button",className:"bd-catalog-close",onClick:a,children:"×"})]}),i.jsxs("div",{className:"bd-catalog-form",children:[l.status!=="confirmed"&&i.jsx("div",{className:"bd-catalog-review-note",children:l.source==="ai"?"ИИ предложил черновик. Очевидные связи BarDoctor уже выполнил, неоднозначные варианты оставлены для подтверждения.":"Техкарта пока не подтверждена и не участвует в расчёте закупки."}),i.jsx("div",{className:"bd-catalog-ingredient-list",children:l.ingredients.map((p,c)=>{const I=bdCatToBase(p.quantity,p.unit),R=d[p.id]||{};return i.jsxs("article",{className:"bd-catalog-ingredient",children:[i.jsxs("div",{className:"bd-catalog-ingredient-head",children:[i.jsxs("b",{children:["Ингредиент ",c+1]}),i.jsx("button",{type:"button",className:"bd-catalog-remove",onClick:()=>{u(G=>({...G,ingredients:G.ingredients.filter(H=>H.id!==p.id)})),f(G=>{const H={...G};return delete H[p.id],H})},children:"Удалить"})]}),i.jsx(bdCatField,{label:"Название",children:i.jsx("input",{value:p.name,onChange:G=>j(p.id,{name:G.target.value}),placeholder:"Ингредиент или готовый товар"})}),i.jsxs("div",{className:"bd-catalog-grid",children:[i.jsx(bdCatField,{label:"Количество на порцию",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:p.quantity,onChange:G=>j(p.id,{quantity:G.target.value})})}),i.jsx(bdCatField,{label:"Единица",children:i.jsxs("select",{value:p.unit||"шт.",onChange:G=>j(p.id,{unit:G.target.value}),children:[i.jsx("option",{value:"мл",children:"мл"}),i.jsx("option",{value:"л",children:"л"}),i.jsx("option",{value:"г",children:"г"}),i.jsx("option",{value:"кг",children:"кг"}),i.jsx("option",{value:"шт.",children:"шт."})]})})]}),i.jsx(bdCatField,{label:"Связь с номенклатурой",children:i.jsx(bdCatIngredientMatchV258,{ingredient:p,products:n,onChoose:(G,H)=>N(p,G,H),showAll:m[p.id]===!0,onShowAll:()=>h(G=>({...G,[p.id]:!G[p.id]})),query:g[p.id]||"",onQuery:G=>y(H=>({...H,[p.id]:G}))})}),i.jsxs("div",{className:"bd-catalog-stock-box",children:[i.jsxs("b",{children:["Остаток и резерв в базовой единице: ",bdCatUnitLabel(I.unit)]}),i.jsxs("div",{className:"bd-catalog-grid",children:[i.jsx(bdCatField,{label:"Сейчас",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:R.current??"",onChange:G=>v(p.id,{current:G.target.value})})}),i.jsx(bdCatField,{label:"Страховой запас",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:R.safety??"",onChange:G=>v(p.id,{safety:G.target.value})})})]}),i.jsxs("div",{className:"bd-catalog-grid",children:[i.jsx(bdCatField,{label:"Уже заказано",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:R.onOrder??"",onChange:G=>v(p.id,{onOrder:G.target.value})})}),i.jsx(bdCatField,{label:"Фасовка вручную",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:R.packageAmount??"",onChange:G=>v(p.id,{packageAmount:G.target.value}),placeholder:"Если её нет в документе"})})]})]})]},p.id)})}),i.jsx("button",{type:"button",className:"bd-catalog-secondary",onClick:b,children:"+ Добавить ингредиент"}),i.jsxs("div",{className:"bd-catalog-sheet-actions",children:[i.jsx("button",{type:"button",className:"bd-catalog-secondary",disabled:!l.ingredients.length,onClick:()=>E(!1),children:"Сохранить черновик"}),i.jsx("button",{type:"button",className:"bd-catalog-primary",disabled:!l.ingredients.length,onClick:()=>E(!0),children:"Подтвердить техкарту"})]})]})]})})}
`,
  "ranked ingredient matching UI",
);
}

if (!bundle.includes("nomenclature:bdCatArray(t.nomenclature)")) {
  bundle = replaceOnce(
    bundle,
    "priceHistory:bdCatArray(t.priceHistory),stockBalances:bdCatArray(t.stockBalances)",
    "priceHistory:bdCatArray(t.priceHistory),nomenclature:bdCatArray(t.nomenclature),stockBalances:bdCatArray(t.stockBalances),techCardIngredientAliases:bdCatArray(t.techCardIngredientAliases),techCardReconciliation:t.techCardReconciliation&&typeof t.techCardReconciliation===\"object\"?t.techCardReconciliation:null",
    "catalog state preserves matching metadata",
  );
}

if (!bundle.includes("bdCatMatchingProductsV258(s,bdCatPurchaseProducts(u))")) {
  bundle = replaceOnce(
    bundle,
    "bdCatPurchaseProducts(u)",
    "bdCatMatchingProductsV258(s,bdCatPurchaseProducts(u))",
    "legacy catalog uses full candidate list",
  );
}

if (!bundle.includes("products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C))")) {
  const current = "products:bdCatPurchaseProducts(C)";
  const count = bundle.split(current).length - 1;
  if (count !== 2) throw new Error(`assortment candidate lists: expected two matches, found ${count}`);
  bundle = bundle.replaceAll(current, "products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C))");
}

for (const path of [responsePath, appHtmlPath]) {
  let source = readFileSync(path, "utf8");
  if (!source.includes("20260823-tech-card-semantic-matching-v258")) {
    source = source.replaceAll(
      "20260801-catalog-move-v44",
      "20260801-catalog-move-v44-20260823-tech-card-semantic-matching-v258",
    );
    source = source.replaceAll(
      "20260823-tech-card-reconciliation-v257",
      "20260823-tech-card-reconciliation-v257-20260823-tech-card-semantic-matching-v258",
    );
  }
  writeFileSync(path, source);
}

let bootstrap = readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes("20260823-tech-card-semantic-matching-v258")) {
  bootstrap = bootstrap.replaceAll(
    "20260823-tech-card-reconciliation-v257",
    "20260823-tech-card-reconciliation-v257-20260823-tech-card-semantic-matching-v258",
  );
}
writeFileSync(
  bootstrapPath,
  bootstrap,
);

writeFileSync(bundlePath, bundle);
console.log("Applied tech-card semantic matching v258.");
