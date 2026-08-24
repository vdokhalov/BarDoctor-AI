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

if (!bundle.includes("function bdCatIngredientMatchV259")) {
  bundle = replaceSegment(
    bundle,
    "function bdCatIngredientMatchV258",
    "function bdCatRecipeEditor",
    String.raw`function bdCatIngredientMatchV259({ingredient:e,products:t,onChoose:n,showAll:r,onShowAll:a,query:s,onQuery:l,conversionValue:u,onConversionChange:d,onConfirmConversion:f}){const m=bdCatArray(e.matchSuggestions).slice(0,3),h=e.purchaseProductKey,g=t.find(v=>v.key===h),y=e.matchedName||g?.name||m.find(v=>v.productKey===h)?.name||e.canonicalName,j=e.linkStatus==="auto_linked"||e.linkSource==="semantic_match",v=e.resolutionStatus==="linked_unit_review"||e.linkStatus==="linked_unit_review",b=e.resolutionStatus==="linked_packaging_review"||e.linkStatus==="linked_packaging_review",N=v||b,E=bdCatArray(e.unitPackageOptions);if(h&&!r)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-linked"+(N?" needs-unit-review-v259":""),children:[i.jsxs("div",{className:"bd-ingredient-match-main-v258",children:[i.jsxs("span",{children:[i.jsx("strong",{children:y||"Связанный товар"}),i.jsx("small",{children:j?"Товар найден автоматически":"Товар связан пользователем"})]}),i.jsx("button",{type:"button",onClick:a,children:"Изменить товар"})]}),N&&i.jsxs("div",{className:"bd-ingredient-unit-review-v259",children:[i.jsx("strong",{children:b?"Нужно выбрать фасовку":"Нужно уточнить норму"}),i.jsxs("p",{children:["В техкарте указано ",e.quantity," ",e.unit||"ед.",", товар учитывается в ",bdCatMatchUnitV258(e.matchedBaseUnit||g?.unit),"."]}),E.length>0&&i.jsx("div",{className:"bd-ingredient-package-options-v259",children:E.map(P=>i.jsxs("button",{type:"button",onClick:()=>f(P.amount,P.unit),children:[P.label," · ",P.amount," ",bdCatMatchUnitV258(P.unit)]},P.unit+":"+P.amount))}),!E.length&&i.jsxs("div",{className:"bd-ingredient-conversion-v259",children:[i.jsx("input",{type:"number",min:"0",step:"0.001",inputMode:"decimal",value:u||"",onChange:P=>d(P.target.value),placeholder:"Вес или объём 1 шт.","aria-label":"Вес или объём одной штуки"}),i.jsx("span",{children:bdCatMatchUnitV258(e.matchedBaseUnit||g?.unit)}),i.jsx("button",{type:"button",disabled:!(bdCatNumber(u)>0),onClick:()=>f(bdCatNumber(u),e.matchedBaseUnit||g?.unit),children:"Подтвердить"})]}),i.jsx("small",{children:e.unitResolutionReason||"BarDoctor не придумывает вес или объём — укажите подтверждённое значение."})]}),!N&&j&&bdCatArray(e.matchEvidence).length>0&&i.jsxs("details",{children:[i.jsx("summary",{children:"Почему связано?"}),i.jsx("p",{children:bdCatArray(e.matchEvidence).join(" · ")})]})]});if(!r&&e.matchTier==="medium"&&m.length)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-review",children:[i.jsxs("header",{children:[i.jsx("strong",{children:"Найдено "+m.length+" возможных соответствия"}),i.jsx("small",{children:e.matchReason||"Выберите подходящую позицию"})]}),i.jsx("div",{className:"bd-ingredient-suggestions-v258",children:m.map(P=>i.jsxs("button",{type:"button",onClick:()=>n(P.productKey,P),children:[i.jsxs("span",{children:[i.jsx("b",{children:P.name}),i.jsxs("small",{children:[bdCatMatchUnitV258(P.unit),P.category?" · "+P.category:"",P.supplierName?" · "+P.supplierName:""]})]}),i.jsxs("em",{children:[P.score,"%"]})]},P.productKey))}),i.jsx("button",{type:"button",className:"bd-ingredient-show-all-v258",onClick:a,children:"Показать все"})]});if(!r)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-missing",children:[i.jsxs("span",{children:[i.jsx("strong",{children:e.manualCardProtected?"Связь требует подтверждения":"Товар не найден"}),i.jsx("small",{children:e.matchReason||"Надёжного соответствия не найдено"})]}),i.jsx("button",{type:"button",onClick:a,children:e.manualCardProtected?"Проверить":"Показать все"})]});const P=bdCatRankProductsV258(e,t,s),c=s?P:P.slice(0,20);return i.jsxs("div",{className:"bd-ingredient-full-search-v258",children:[i.jsx("input",{type:"search",value:s||"",onChange:I=>l(I.target.value),placeholder:"Поиск по номенклатуре и закупкам…","aria-label":"Поиск товара для ингредиента"}),i.jsxs("select",{value:h||"",onChange:I=>{const R=t.find(W=>W.key===I.target.value);n(I.target.value,R)},children:[i.jsx("option",{value:"",children:"Не связано"}),...c.map(I=>i.jsxs("option",{value:I.key,children:[I.name,I.packageSize?" · "+I.packageSize:"",I.supplierName?" · "+I.supplierName:""]},I.key))]}),!s&&P.length>20&&i.jsx("small",{children:"Показаны наиболее релевантные позиции. Используйте поиск для всего каталога."}),i.jsx("button",{type:"button",className:"bd-ingredient-show-all-v258",onClick:a,children:"Свернуть поиск"})]})}
`,
    "entity resolution ingredient UI",
  );

  const recipeStart = bundle.indexOf("function bdCatRecipeEditor");
  const recipeEnd = bundle.indexOf("function bdCatImportReview", recipeStart);
  if (recipeStart < 0 || recipeEnd < 0) throw new Error("recipe editor segment not found");
  let recipe = bundle.slice(recipeStart, recipeEnd);
  recipe = replaceOnce(
    recipe,
    "[g,y]=S.useState({}),j=",
    "[g,y]=S.useState({}),[x,C]=S.useState({}),j=",
    "conversion editor state",
  );
  recipe = replaceOnce(
    recipe,
    "},E=p=>{",
    '},K=(p,c,I)=>{const R=bdCatNumber(c),W=I||p.matchedBaseUnit;if(!(R>0)||!["g","ml","pcs"].includes(W))return;j(p.id,{unitConversion:{amount:R,unit:W,confirmedByUser:!0,source:"manual"},unitResolutionStatus:"packaging_compatible",unitResolutionReason:"Конверсия подтверждена пользователем",resolutionStatus:"linked_ready",linkStatus:p.linkSource==="semantic_match"?"auto_linked":"linked",normalizedQuantity:bdCatNumber(p.quantity)*R,normalizedUnit:W,plausibilityWarnings:[]}),C(J=>({...J,[p.id]:""}))},E=p=>{',
    "confirmed unit conversion handler",
  );
  recipe = replaceOnce(
    recipe,
    "i.jsx(bdCatIngredientMatchV258,{ingredient:p,products:n,onChoose:(G,H)=>N(p,G,H),showAll:m[p.id]===!0,onShowAll:()=>h(G=>({...G,[p.id]:!G[p.id]})),query:g[p.id]||\"\",onQuery:G=>y(H=>({...H,[p.id]:G}))})",
    "i.jsx(bdCatIngredientMatchV259,{ingredient:p,products:n,onChoose:(G,H)=>N(p,G,H),showAll:m[p.id]===!0,onShowAll:()=>h(G=>({...G,[p.id]:!G[p.id]})),query:g[p.id]||\"\",onQuery:G=>y(H=>({...H,[p.id]:G})),conversionValue:x[p.id]||\"\",onConversionChange:G=>C(H=>({...H,[p.id]:G})),onConfirmConversion:(G,H)=>K(p,G,H)})",
    "recipe editor entity resolution props",
  );
  bundle = bundle.slice(0, recipeStart) + recipe + bundle.slice(recipeEnd);
}

if (!bundle.includes("function bdCatResolvedAmountV259")) {
  bundle = replaceOnce(
    bundle,
    "function bdCatNeeds(e,t){",
    'function bdCatResolvedAmountV259(e){if(["linked_unit_review","linked_packaging_review"].includes(e.resolutionStatus||e.linkStatus))return{...bdCatToBase(e.quantity,e.unit),review:!0};if(["exact_compatible","packaging_compatible"].includes(e.unitResolutionStatus)&&bdCatNumber(e.normalizedQuantity)>=0&&["g","ml","pcs"].includes(e.normalizedUnit))return{amount:bdCatNumber(e.normalizedQuantity),unit:e.normalizedUnit,review:!1};return{...bdCatToBase(e.quantity,e.unit),review:!1}}\nfunction bdCatNeeds(e,t){',
    "resolved amount helper",
  );
  bundle = replaceOnce(
    bundle,
    'const v=bdCatToBase(j.quantity,j.unit);if(v.unit==="unknown"){r.push("Неясная единица измерения: "+j.name);continue}',
    'const v=bdCatResolvedAmountV259(j);if(v.review){r.push("Нужно уточнить норму или фасовку: "+j.name);continue}if(v.unit==="unknown"){r.push("Неясная единица измерения: "+j.name);continue}',
    "purchase need unit-review guard",
  );
}

for (const path of [responsePath, appHtmlPath]) {
  let source = readFileSync(path, "utf8");
  if (!source.includes("20260823-tech-card-entity-resolution-v259")) {
    source = source.replaceAll(
      "20260823-tech-card-semantic-matching-v258",
      "20260823-tech-card-semantic-matching-v258-20260823-tech-card-entity-resolution-v259",
    );
  }
  writeFileSync(path, source);
}

let bootstrap = readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes("20260823-tech-card-entity-resolution-v259")) {
  bootstrap = bootstrap.replaceAll(
    "20260823-tech-card-semantic-matching-v258",
    "20260823-tech-card-semantic-matching-v258-20260823-tech-card-entity-resolution-v259",
  );
}

writeFileSync(bootstrapPath, bootstrap);
writeFileSync(bundlePath, bundle);
console.log("Applied tech-card entity resolution v259.");
