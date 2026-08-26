import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssPath = new URL("../public/catalog.css", import.meta.url);
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

if (!bundle.includes("bd-tech-card-consistency-v299")) {
  bundle = replaceSegment(
    bundle,
    "function bdCatIngredientMatchV259",
    "function bdCatRecipeEditor",
    String.raw`const bdTechCardConsistencyV299="bd-tech-card-consistency-v299";
function bdCatIngredientMatchV299({ingredient:e,products:t,onChoose:n,showAll:r,onShowAll:a,query:s,onQuery:l,conversionValue:u,onConversionChange:d,onConfirmConversion:f}){const m=bdCatArray(e.matchSuggestions).slice(0,3),h=e.purchaseProductKey,g=t.find(v=>v.key===h),y=e.matchedName||g?.name||m.find(v=>v.productKey===h)?.name||e.canonicalName,j=e.linkStatus==="auto_linked"||e.linkSource==="semantic_match",v=e.resolutionStatus==="linked_unit_review"||e.linkStatus==="linked_unit_review",b=e.resolutionStatus==="linked_packaging_review"||e.linkStatus==="linked_packaging_review",N=v||b,E=bdCatArray(e.unitPackageOptions),[P,c]=S.useState([]),[I,R]=S.useState(null),[W,J]=S.useState("idle"),[K,Q]=S.useState(""),[H,V]=S.useState(0);S.useEffect(()=>{if(!r)return;Q("");const D=setTimeout(()=>V(A=>A+1),250);return()=>clearTimeout(D)},[r,s]);S.useEffect(()=>{if(!r)return;const D=new AbortController,A=Ot(),k=new URLSearchParams({q:s||"",limit:"50"});K&&k.set("cursor",K),J("loading"),fetch("/api/tech-cards/nomenclature?"+k.toString(),{headers:ca(A),cache:"no-store",signal:D.signal}).then(O=>O.json().then(M=>({ok:O.ok,body:M}))).then(({ok:O,body:M})=>{if(!O||!M.ok)throw new Error(M.error||"Не удалось загрузить номенклатуру");c(bdCatArray(M.items)),R(M.nextCursor||null),J("loaded")}).catch(O=>{O.name!=="AbortError"&&J("error")});return()=>D.abort()},[r,s,K,H]);if(h&&!r)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-linked"+(N?" needs-unit-review-v259":""),children:[i.jsxs("div",{className:"bd-ingredient-match-main-v258",children:[i.jsxs("span",{children:[i.jsx("strong",{children:y||"Связанный товар"}),i.jsx("small",{children:j?"Товар найден автоматически":"Товар связан пользователем"})]}),i.jsx("button",{type:"button",onClick:a,children:"Изменить товар"})]}),N&&i.jsxs("div",{className:"bd-ingredient-unit-review-v259",children:[i.jsx("strong",{children:b?"Нужно выбрать фасовку":"Нужно уточнить норму"}),i.jsxs("p",{children:["В техкарте указано ",e.quantity," ",e.unit||"ед.",", товар учитывается в ",bdCatMatchUnitV258(e.matchedBaseUnit||g?.unit),"."]}),E.length>0&&i.jsx("div",{className:"bd-ingredient-package-options-v259",children:E.map(D=>i.jsxs("button",{type:"button",onClick:()=>f(D.amount,D.unit),children:[D.label," · ",D.amount," ",bdCatMatchUnitV258(D.unit)]},D.unit+":"+D.amount))}),!E.length&&i.jsxs("div",{className:"bd-ingredient-conversion-v259",children:[i.jsx("input",{type:"number",min:"0",step:"0.001",inputMode:"decimal",value:u||"",onChange:D=>d(D.target.value),placeholder:"Вес или объём 1 шт.","aria-label":"Вес или объём одной штуки"}),i.jsx("span",{children:bdCatMatchUnitV258(e.matchedBaseUnit||g?.unit)}),i.jsx("button",{type:"button",disabled:!(bdCatNumber(u)>0),onClick:()=>f(bdCatNumber(u),e.matchedBaseUnit||g?.unit),children:"Подтвердить"})]}),i.jsx("small",{children:e.unitResolutionReason||"BarDoctor не придумывает вес или объём — укажите подтверждённое значение."})]}),!N&&j&&bdCatArray(e.matchEvidence).length>0&&i.jsxs("details",{children:[i.jsx("summary",{children:"Почему связано?"}),i.jsx("p",{children:bdCatArray(e.matchEvidence).join(" · ")})]})]});if(!r&&e.matchTier==="medium"&&m.length)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-review",children:[i.jsxs("header",{children:[i.jsx("strong",{children:"Найдено "+m.length+" возможных соответствия"}),i.jsx("small",{children:e.matchReason||"Выберите подходящую позицию"})]}),i.jsx("div",{className:"bd-ingredient-suggestions-v258",children:m.map(D=>i.jsxs("button",{type:"button",onClick:()=>n(D.productKey,D),children:[i.jsxs("span",{children:[i.jsx("b",{children:D.name}),i.jsxs("small",{children:[bdCatMatchUnitV258(D.unit),D.category?" · "+D.category:"",D.supplierName?" · Поставщики: "+D.supplierName:""]})]}),i.jsxs("em",{children:[D.score,"%"]})]},D.productKey))}),i.jsx("button",{type:"button",className:"bd-ingredient-show-all-v258",onClick:a,children:"Показать все"})]});if(!r)return i.jsxs("div",{className:"bd-ingredient-match-v258 is-missing",children:[i.jsxs("span",{children:[i.jsx("strong",{children:e.manualCardProtected?"Связь требует подтверждения":"Товар не найден"}),i.jsx("small",{children:e.matchReason||"Надёжного соответствия не найдено"})]}),i.jsx("button",{type:"button",onClick:a,children:e.manualCardProtected?"Проверить":"Показать все"})]});const D=Number((/^v1:(\d+)$/.exec(K)||[])[1]||0),A=P.find(k=>k.key===h)||g;return i.jsxs("div",{className:"bd-ingredient-full-search-v258 bd-ingredient-selector-v299",children:[i.jsx("input",{type:"search",value:s||"",autoFocus:!0,onChange:k=>l(k.target.value),placeholder:"Поиск по всей номенклатуре…","aria-label":"Поиск canonical-товара для ингредиента"}),W==="loading"&&i.jsx("div",{className:"bd-selector-state-v299",role:"status",children:s?"Ищем по всей номенклатуре…":"Загружаем номенклатуру…"}),W==="error"&&i.jsxs("div",{className:"bd-selector-state-v299 is-error",role:"alert",children:["Не удалось загрузить номенклатуру. ",i.jsx("button",{type:"button",onClick:()=>V(k=>k+1),children:"Повторить"})]}),W==="loaded"&&!P.length&&i.jsx("div",{className:"bd-selector-state-v299",children:"Ничего не найдено"}),W==="loaded"&&P.length>0&&i.jsxs("select",{value:h||"",onChange:k=>{const O=P.find(M=>M.key===k.target.value)||t.find(M=>M.key===k.target.value);n(k.target.value,O)},children:[i.jsx("option",{value:"",children:"Не связано"}),A&&!P.some(k=>k.key===A.key)&&i.jsx("option",{value:A.key,children:A.name},A.key),...P.map(k=>i.jsxs("option",{value:k.key,children:[k.name,k.packageSize?" · "+k.packageSize:"",k.supplierName?" · Поставщики: "+k.supplierName:""]},k.key))]}),W==="loaded"&&i.jsxs("div",{className:"bd-selector-pagination-v299",children:[i.jsx("button",{type:"button",disabled:D===0,onClick:()=>Q(D>50?"v1:"+(D-50):""),children:"Назад"}),i.jsx("span",{children:P.length?D+1+"–"+(D+P.length):"0"}),i.jsx("button",{type:"button",disabled:!I,onClick:()=>Q(I||""),children:"Дальше"})]}),i.jsx("button",{type:"button",className:"bd-ingredient-show-all-v258",onClick:a,children:"Свернуть поиск"})]})}
`,
    "canonical nomenclature selector",
  );

  bundle = replaceOnce(
    bundle,
    'c?{purchaseProductKey:c,matchedName:R?.name||p.matchedName,linkStatus:"linked",linkSource:"manual",linkConfirmedByUser:!0,matchTier:"high",matchScore:100,matchEvidence:["подтверждено пользователем"],matchSuggestions:[]}',
    'c?{purchaseProductKey:c,nomenclatureItemId:R?.id||R?.nomenclatureItemId||c,matchedName:R?.name||p.matchedName,matchedBaseUnit:R?.unit||R?.baseUnit||p.matchedBaseUnit,linkStatus:"linked",linkSource:"manual",linkConfirmedByUser:!0,matchTier:"high",matchScore:100,matchEvidence:["подтверждено пользователем"],matchSuggestions:[]}',
    "canonical ingredient reference",
  );
  bundle = replaceOnce(bundle, "i.jsx(bdCatIngredientMatchV259,{", "i.jsx(bdCatIngredientMatchV299,{", "selector component");
  bundle = replaceOnce(bundle, "},E=p=>{const c=", "},E=async p=>{const c=", "awaitable recipe save");
  bundle = replaceOnce(
    bundle,
    's({...l,ingredients:c,status:p?"confirmed":"draft",source:l.source||"manual",updatedAt:new Date().toISOString(),confirmedAt:p?new Date().toISOString():l.confirmedAt},I),a()',
    'await s({...l,ingredients:c,status:p?"confirmed":"draft",source:l.source||"manual",updatedAt:new Date().toISOString(),confirmedAt:p?new Date().toISOString():l.confirmedAt},I)',
    "wait for authoritative recipe persistence",
  );

  const oldSave = 'Ne=async(w,R)=>{const P={...bdCatState(R),updatedAt:new Date().toISOString()};_(P);const c=await qr(bdCatalogStoreKey,P);Kse(bdCatalogStoreKey,P);a({variant:c?"success":"default",title:w,description:c?"Данные сохранены в аккаунте выбранного заведения.":"Изменение сохранено локально и синхронизируется после восстановления связи."})}';
  const newSave = 'Ne=async(w,R)=>{const P={...bdCatState(R),updatedAt:new Date().toISOString()};_(P);const c=await qr(bdCatalogStoreKey,P),p=bdCatState(xr(bdCatalogStoreKey)||P);_(p),Kse(bdCatalogStoreKey,p),a({variant:c?"success":"default",title:w,description:c?"Данные сохранены в аккаунте выбранного заведения.":"Изменение сохранено локально и синхронизируется после восстановления связи."});return{synced:c,state:p}}';
  bundle = replaceOnce(bundle, oldSave, newSave, "authoritative assortment refresh");

  const saveStart = bundle.indexOf("ke=async(w,R)=>");
  const saveEnd = bundle.indexOf(",Oe=async", saveStart);
  if (saveStart < 0 || saveEnd < 0) throw new Error("recipe save handler not found");
  const existing = bundle.slice(saveStart, saveEnd);
  const guarded = existing
    .replace('await Ne(w.status==="confirmed"?"Техкарта подтверждена":"Черновик сохранён",{...P,recipes:c,stockBalances:[...p.values()]}),z(null)', 'const oe=await Ne(w.status==="confirmed"?"Техкарта подтверждена":"Черновик сохранён",{...P,recipes:c,stockBalances:[...p.values()]}),ie=bdCatArray(oe.state.recipes).filter(Ce=>Ce.menuItemId===w.menuItemId&&Ce.reviewStatus==="approved").sort((Ce,Ge)=>String(Ge.confirmedAt||Ge.updatedAt||"").localeCompare(String(Ce.confirmedAt||Ce.updatedAt||"")))[0];if(w.status==="confirmed"&&(!oe.synced||!ie)){a({variant:"error",title:"Техкарта требует проверки",description:oe.synced?"Подтвердите связь и единицу каждого ингредиента.":"Утверждение будет доступно после синхронизации с сервером."});return!1}return z(null),!0');
  if (guarded === existing) throw new Error("recipe authoritative guard marker not found");
  bundle = bundle.slice(0, saveStart) + guarded + bundle.slice(saveEnd);
}

if (!bundle.includes("const bdCatIngredientMatchV259=bdCatIngredientMatchV299")) {
  bundle = replaceOnce(
    bundle,
    "\nfunction bdCatRecipeEditor",
    "\nconst bdCatIngredientMatchV259=bdCatIngredientMatchV299;\nfunction bdCatRecipeEditor",
    "legacy selector compatibility alias",
  );
}
bundle = bundle.replaceAll("Поиск по всей номенклатуре…", "Поиск по номенклатуре…");
bundle = bundle.replace(
  'w&&(z(E.menuItems.find(R=>R.id===w.id)||null),w.id&&e(bdAssortmentQueryUrlV170({tab:"recipes",filter:w.recipeStatus==="missing"?"missing":"review"})))',
  'w&&z(E.menuItems.find(R=>R.id===w.id)||null)',
);
bundle = bundle.replace(
  'w&&(z(w),e(bdAssortmentQueryUrlV170({itemId:null,tab:"recipes"})))',
  'w&&z(w)',
);

let css = readFileSync(cssPath, "utf8");
if (!css.includes(".bd-ingredient-selector-v299")) {
  css += `\n.bd-ingredient-selector-v299{display:grid;gap:10px}.bd-selector-state-v299{min-height:44px;display:flex;align-items:center;padding:10px 12px;border-radius:12px;background:#f6f7fb;color:#5d6275}.bd-selector-state-v299.is-error{color:#9d2c38;background:#fff1f2}.bd-selector-state-v299 button{min-height:36px;margin-left:6px}.bd-selector-pagination-v299{display:grid;grid-template-columns:minmax(88px,1fr) auto minmax(88px,1fr);align-items:center;gap:8px}.bd-selector-pagination-v299 span{text-align:center;color:#73788b;font-size:13px}.bd-selector-pagination-v299 button{min-height:44px}@media(max-width:520px){.bd-ingredient-selector-v299{position:relative}.bd-ingredient-selector-v299 input[type=search]{font-size:16px;min-height:48px}.bd-ingredient-selector-v299 select{min-height:50px;width:100%}.bd-selector-pagination-v299{position:sticky;bottom:0;padding:8px 0;background:#fff}}\n`;
}

for (const path of [responsePath, appHtmlPath, bootstrapPath]) {
  let source = readFileSync(path, "utf8");
  if (!source.includes("20260826-tech-card-consistency-v299")) {
    source = source.replaceAll(
      "20260823-tech-card-entity-resolution-v259",
      "20260823-tech-card-entity-resolution-v259-20260826-tech-card-consistency-v299",
    );
  }
  if (!source.includes("20260826-tech-card-consistency-v299a")) {
    source = source.replaceAll(
      "20260826-tech-card-consistency-v299",
      "20260826-tech-card-consistency-v299a",
    );
  }
  writeFileSync(path, source);
}

writeFileSync(cssPath, css);
writeFileSync(bundlePath, bundle);
console.log("Applied tech-card consistency v299.");
