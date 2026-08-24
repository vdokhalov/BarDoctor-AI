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

bundle = replaceSegment(
  bundle,
  "function bdCatRecipeFor",
  "function bdCatBalanceKey",
  String.raw`function bdCatRecipePriorityV257(e){if(e?.current===!0)return 100;if(e?.reviewStatus==="approved")return e?.source==="ai"?80:90;if(e?.status==="confirmed")return e?.source==="ai"?70:75;if(e?.currentDraft===!0)return 60;if(e?.reviewStatus==="requires_review")return 50;if(e?.reviewStatus==="ai_draft"||e?.source==="ai")return 40;return 10}
function bdCatRecipesForV257(e,t){return bdCatArray(t).filter(n=>String(n?.menuItemId||n?.ownerId||"")===String(e?.id||e||""))}
function bdCatRecipeFor(e,t){return bdCatRecipesForV257(e,t).sort((n,r)=>bdCatRecipePriorityV257(r)-bdCatRecipePriorityV257(n)||String(r?.updatedAt||r?.confirmedAt||"").localeCompare(String(n?.updatedAt||n?.confirmedAt||"")))[0]}
function bdCatTechCardStateV257(e,t){if(!e)return"missing";if(["ambiguous","orphan","wrong_venue"].includes(String(e.ownerLinkStatus||"")))return"link_error";if(e.reviewStatus==="approved"||e.status==="confirmed")return"approved";if(e.reviewStatus==="ai_draft"||e.source==="ai")return"ai_draft";return"review"}
function bdCatTechCardMetaV257(e,t){const n=bdCatTechCardStateV257(e,t),r={missing:{label:"Нет техкарты",tone:"bad"},approved:{label:"Техкарта есть",tone:"good"},ai_draft:{label:"Черновик AI",tone:"warn"},review:{label:"Требует проверки",tone:"warn"},link_error:{label:"Ошибка связи",tone:"bad"}}[n],a=bdCatArray(e?.ingredients),s=a.filter(l=>{const u=String(l?.linkStatus||(l?.purchaseProductKey?"linked":"missing"));return!["linked","auto_linked"].includes(u)}).length,l=bdCatRecipesForV257(t,arguments[2]||[]).find(u=>u?.currentDraft===!0&&u?.id!==e?.id);return{...r,state:n,source:e?.source==="ai"?"AI":e?.source==="import"?"Импорт":"Вручную",version:Number(e?.version)||1,ingredientCount:a.length,brokenIngredients:s,pendingDraft:l||null}}
`,
  "canonical tech-card helpers",
);

bundle = replaceSegment(
  bundle,
  "function bdAssortmentStatusLabelV170",
  "function bdAssortmentMenuFlatV170",
  String.raw`function bdAssortmentStatusLabelV170(e){return e==="ready"?"Рассчитано":e==="missing_recipe"?"Нет техкарты":e==="review"?"Требует проверки":"Требует настройки"}
function bdAssortmentTechCardLabelV257(e){return e==="approved"?"Техкарта есть":e==="ai_draft"?"Черновик AI":e==="requires_review"?"Требует проверки":e==="link_error"?"Ошибка связи":"Нет техкарты"}
function bdAssortmentTechCardSourceV257(e){return e==="ai"?"AI":e==="import"?"Импорт":"Вручную"}
`,
  "assortment tech-card labels",
);

bundle = replaceOnce(
  bundle,
  'function bdAssortmentMatchesV171(e,t,n){return(n==="all"||n==="ready"&&e.status==="ready"||n==="attention"&&e.status!=="ready")&&(!t||bdAssortmentNormV170([e.name,e.groupName,e.category].join(" ")).includes(t))}',
  'function bdAssortmentMatchesV171(e,t,n){const r=e.techCardStatus||e.recipeStatus;return(n==="all"||n==="missing"&&e.recipeStatus==="missing"||n==="review"&&r==="requires_review"||n==="ai_draft"&&(r==="ai_draft"||e.hasPendingDraft)||n==="with_recipe"&&e.recipeStatus!=="missing")&&(!t||bdAssortmentNormV170([e.name,e.groupName,e.category].join(" ")).includes(t))}',
  "menu tech-card filters",
);

bundle = replaceSegment(
  bundle,
  "function bdAssortmentMenuItemRowV171",
  "function bdAssortmentSubgroupV171",
  String.raw`function bdAssortmentMenuItemRowV171({item:e,onOpen:t}){const n=e.techCardStatus||e.recipeStatus,r=bdAssortmentTechCardLabelV257(n),a=e.hasPendingDraft?" · Есть AI-черновик":"";return i.jsxs("button",{type:"button",className:"bd-assortment-menu-row-v170 "+e.status,"data-menu-item-id":e.id,onClick:()=>t(e),children:[i.jsx("span",{className:"bd-assortment-menu-mark-v170","aria-hidden":!0,children:i.jsx(kX,{size:17})}),i.jsxs("span",{className:"copy",children:[i.jsx("strong",{children:e.name}),i.jsx("small",{children:e.recipeCost!=null?"Себестоимость: "+bdAssortmentMoneyV170(e.recipeCost,e.costCurrency||e.currency)+(e.costPercent!=null?" · "+String(e.costPercent).replace(".",",")+"%":""):r+a}),e.costChangePercent!=null&&Math.abs(e.costChangePercent)>=5&&i.jsx("em",{children:"Себестоимость "+bdAssortmentPercentV170(e.costChangePercent)})]}),i.jsxs("span",{className:"amount",children:[i.jsx("strong",{children:e.salePrice!=null?bdAssortmentMoneyV170(e.salePrice,e.currency):"Цена не определена"}),i.jsx("small",{className:"tech-card "+n,children:r})]}),i.jsx(Br,{size:17})]},e.id)}
`,
  "menu item tech-card status",
);

bundle = replaceOnce(
  bundle,
  '[{id:"all",label:"Все"},{id:"ready",label:"Рассчитано"},{id:"attention",label:"Требуют настройки"}].map(A=>i.jsx("button",{type:"button",className:r===A.id?"active":"",onClick:()=>a(A.id),children:A.label},A.id))',
  '[{id:"all",label:"Все"},{id:"missing",label:"Без техкарты"},{id:"review",label:"Требуют проверки"},{id:"ai_draft",label:"AI-черновики"},{id:"with_recipe",label:"С техкартой"}].map(A=>i.jsx("button",{type:"button",className:r===A.id?"active":"",onClick:()=>a(A.id),children:A.label},A.id))',
  "menu status filter labels",
);

bundle = replaceSegment(
  bundle,
  "function bdAssortmentRecipesV170",
  "function bdAssortmentNeedsV170",
  String.raw`function bdAssortmentRecipesV170({analytics:e,query:t,onQuery:n,filter:r,onFilter:a,onOpen:s,onCreate:l,canManage:u}){const d=bdAssortmentNormV170(t),f=(e.recipes||[]).filter(h=>{const g=h.techCardStatus||h.recipeStatus,y=h.unmappedIngredientCount>0||h.invalidUnitCount>0;return(r==="all"||r==="missing"&&h.recipeStatus==="missing"||r==="review"&&g==="requires_review"||r==="ai_draft"&&(g==="ai_draft"||h.hasPendingDraft)||r==="ready"&&g==="approved"||r==="broken"&&y)&&(!d||bdAssortmentNormV170([h.name,...(h.ingredientRows||[]).map(j=>j.name)].join(" ")).includes(d))});return i.jsxs("div",{className:"bd-assortment-recipes-v170",children:[i.jsx(bdAssortmentToolbarV170,{query:t,onQuery:n,placeholder:"Поиск техкарты или ингредиента…"}),i.jsx("div",{className:"bd-assortment-filter-row-v170",children:[{id:"all",label:"Все"},{id:"missing",label:"Без техкарты"},{id:"review",label:"Требуют проверки"},{id:"ai_draft",label:"AI-черновики"},{id:"ready",label:"Готовы"},{id:"broken",label:"Проблемы связей"}].map(h=>i.jsx("button",{type:"button",className:r===h.id?"active":"",onClick:()=>a(h.id),children:h.label},h.id))}),i.jsx("section",{className:"bd-assortment-recipe-summary-v170",children:[{label:"Позиции",value:e.counts.activeItems},{label:"Утверждены",value:e.counts.confirmedRecipes,tone:"good"},{label:"AI-черновики",value:e.counts.aiDraftRecipes||0,tone:"warning"},{label:"На проверке",value:e.counts.reviewRecipes||0,tone:"warning"},{label:"Без техкарты",value:e.counts.missingRecipes,tone:"danger"}].map(h=>i.jsxs("div",{className:h.tone||"",children:[i.jsx("span",{children:h.label}),i.jsx("strong",{children:h.value})]},h.label))}),f.length?i.jsx("section",{className:"bd-assortment-recipe-list-v170",children:f.map(h=>{const g=h.techCardStatus||h.recipeStatus,y=bdAssortmentTechCardLabelV257(g),j=h.unmappedIngredientCount+h.invalidUnitCount;return i.jsxs("button",{type:"button",className:"bd-assortment-recipe-card-v170 "+h.status,onClick:()=>s(h),children:[i.jsxs("header",{children:[i.jsxs("span",{children:[i.jsx(kX,{size:18}),i.jsx("strong",{children:h.name})]}),i.jsx("em",{className:g,children:y})]}),h.ingredientRows?.length?i.jsx("div",{className:"ingredients",children:h.ingredientRows.slice(0,5).map(v=>i.jsxs("span",{children:[i.jsx("b",{children:v.name}),i.jsxs("small",{children:[v.quantity!=null?v.quantity:"—"," ",v.unit||"",v.complete?" · "+bdAssortmentMoneyV170(v.cost,v.currency):v.reason==="mapping"?" · Не связано с номенклатурой":v.reason==="unit"?" · Неверная единица":" · Стоимость неизвестна"]})]},v.id))}):i.jsx("p",{children:"Ингредиенты пока не добавлены"}),i.jsxs("footer",{children:[i.jsx("span",{children:h.recipeCost!=null?"Себестоимость: "+bdAssortmentMoneyV170(h.recipeCost,h.costCurrency||h.currency):h.ingredientCount&&h.pricedIngredientCount?"Себестоимость рассчитана не полностью":"Себестоимость не рассчитана"}),h.costPercent!=null&&i.jsxs("b",{children:[String(h.costPercent).replace(".",","),"%"]}),j>0&&i.jsxs("em",{children:[j," связей проверить"]}),h.hasPendingDraft&&i.jsx("em",{children:"Есть AI-черновик"}),i.jsx(Br,{size:17})]})]},h.id)})}):i.jsx(bdAssortmentEmptyV170,{icon:kX,title:e.recipes?.length?"Ничего не найдено":"Техкарты пока не созданы",copy:e.recipes?.length?"Измените поиск или статус.":"Создайте техкарту из позиции меню — обязательные поля можно дополнить позже.",action:u&&i.jsx("button",{type:"button",onClick:l,children:"Создать техкарту"})}),u&&i.jsxs("button",{type:"button",className:"bd-assortment-wide-cta-v170",onClick:l,children:[i.jsx(Vt,{size:18}),"Создать техкарту"]})]})}
`,
  "recipe list states and filters",
);

bundle = replaceSegment(
  bundle,
  "function bdAssortmentItemDetailV170",
  "function bdAssortmentSourceChoiceV170",
  String.raw`function bdAssortmentItemDetailV170({item:e,onClose:t,onEdit:n,onRecipe:r,canManage:a}){const s=e.sales,l=e.ingredientRows||[],u=e.priceHistory||[],d=e.costHistory||[],f=e.techCardStatus||e.recipeStatus,m=bdAssortmentTechCardLabelV257(f),h=e.techCardUpdatedAt?bdProcDateV168(String(e.techCardUpdatedAt).slice(0,10)):"Не указано";return i.jsx(bdAssortmentSheetV170,{label:e.groupName+(e.category?" · "+e.category:""),title:e.name,copy:e.portionSize||bdAssortmentStatusLabelV170(e.status),onClose:t,className:"detail",footer:a&&i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"secondary",onClick:n,children:"Изменить позицию"}),e.type!=="service"&&i.jsx("button",{type:"button",className:"primary",onClick:r,children:e.recipeId?f==="approved"?"Открыть техкарту":"Проверить техкарту":"Создать техкарту"})]}),children:i.jsxs("div",{className:"bd-assortment-item-detail-v170",children:[i.jsx("section",{className:"facts",children:[{label:"Цена продажи",value:e.salePrice!=null?bdAssortmentMoneyV170(e.salePrice,e.currency):"Не указана"},{label:"Себестоимость",value:e.recipeCost!=null?bdAssortmentMoneyV170(e.recipeCost,e.costCurrency||e.currency):e.pricedIngredientCount>0?"Рассчитана не полностью":"Недостаточно данных"},{label:"Cost %",value:e.costPercent!=null?String(e.costPercent).replace(".",",")+"%":"Недостаточно данных"},{label:"Валовая прибыль / ед.",value:e.unitGrossProfit!=null?bdAssortmentMoneyV170(e.unitGrossProfit,e.currency):"Недостаточно данных"}].map(g=>i.jsxs("div",{children:[i.jsx("span",{children:g.label}),i.jsx("strong",{children:g.value})]},g.label))}),i.jsxs("section",{children:[i.jsx("h3",{children:"Продажи за период"}),s?i.jsx("div",{className:"facts compact",children:[{label:"Количество",value:s.quantity},{label:"Выручка",value:s.revenue!=null?bdAssortmentMoneyV170(s.revenue,e.currency):"Нет line-level выручки"},{label:"Валовая прибыль",value:s.grossProfit!=null?bdAssortmentMoneyV170(s.grossProfit,e.currency):"Недостаточно данных"}].map(g=>i.jsxs("div",{children:[i.jsx("span",{children:g.label}),i.jsx("strong",{children:g.value})]},g.label))}):i.jsx("p",{className:"muted",children:"Подтверждённых item-level продаж за период нет."})]}),e.type!=="service"&&i.jsxs("section",{className:"bd-tech-card-detail-v257",children:[i.jsxs("header",{children:[i.jsx("h3",{children:"Техкарта"}),i.jsx("span",{className:"tech-card "+f,children:m})]}),e.recipeId&&i.jsx("div",{className:"bd-tech-card-meta-v257",children:[{label:"Версия",value:"v"+(e.techCardVersion||1)},{label:"Источник",value:bdAssortmentTechCardSourceV257(e.techCardSource)},{label:"Обновлена",value:h},{label:"Ингредиенты",value:String(e.ingredientCount||0)}].map(g=>i.jsxs("div",{children:[i.jsx("span",{children:g.label}),i.jsx("strong",{children:g.value})]},g.label))}),e.hasPendingDraft&&i.jsx("p",{className:"bd-tech-card-pending-v257",children:"Есть отдельный AI-черновик. Утверждённая версия не перезаписана."}),l.length?i.jsx("div",{className:"ingredient-list",children:l.map(g=>i.jsxs("div",{children:[i.jsxs("span",{children:[i.jsx("strong",{children:g.name}),i.jsxs("small",{children:[g.quantity!=null?g.quantity:"—"," ",g.unit||""]})]}),i.jsx("b",{children:g.complete?bdAssortmentMoneyV170(g.cost,g.currency):g.reason==="mapping"?"Не связано с номенклатурой":g.reason==="unit"?"Проверить единицу":"Стоимость неизвестна"})]},g.id))}):i.jsx("p",{className:"muted",children:"Ингредиенты не добавлены."})]}),d.length>=2&&i.jsxs("section",{children:[i.jsx("h3",{children:"История себестоимости"}),i.jsx("div",{className:"history",children:d.slice().reverse().map(g=>i.jsxs("p",{children:[i.jsx("span",{children:bdProcDateV168(g.date)}),i.jsx("strong",{children:bdAssortmentMoneyV170(g.cost,g.currency)})]},g.date))}),i.jsx("small",{className:"muted",children:e.costChangeBasis})]}),i.jsxs("section",{children:[i.jsx("h3",{children:"История цены продажи"}),u.length?i.jsx("div",{className:"history",children:u.map(g=>i.jsxs("p",{children:[i.jsx("span",{children:bdProcDateV168(String(g.changedAt||"").slice(0,10))}),i.jsxs("strong",{children:[bdAssortmentMoneyV170(g.oldPrice,g.currency)," → ",bdAssortmentMoneyV170(g.newPrice,g.currency)]})]},g.id))}):i.jsx("p",{className:"muted",children:"Изменений цены ещё не зафиксировано."})]})]})})}
`,
  "item tech-card detail",
);

bundle = replaceOnce(
  bundle,
  'const p=[...w.recipes];for(const oe of bdCatArray(A.recipes)){const ie=P[oe.menuItemId];if(!ie)continue;const X=p.findIndex(ce=>ce.menuItemId===ie),ce={...oe,id:X>=0?p[X].id:oe.id,menuItemId:ie,status:X>=0&&p[X].status==="confirmed"?"confirmed":"draft",source:"ai",updatedAt:new Date().toISOString()};X>=0?p[X].status!=="confirmed"&&(p[X]=ce):p.push(ce)}',
  'const p=[...w.recipes];for(const oe of bdCatArray(A.recipes)){const ie=P[oe.menuItemId];if(!ie)continue;const X=p.findIndex(ce=>String(ce.menuItemId||ce.ownerId)===String(ie)&&ce.status==="confirmed"),ce=p.findIndex(At=>String(At.menuItemId||At.ownerId)===String(ie)&&At.status!=="confirmed"&&At.lifecycleStatus!=="superseded"),Qe={...oe,id:ce>=0?p[ce].id:oe.id||crypto.randomUUID(),menuItemId:ie,ownerId:ie,ownerType:"menu_item",status:"draft",reviewStatus:"ai_draft",source:"ai",currentDraft:!0,idempotencyKey:oe.idempotencyKey||"menu-import:"+String(A.id||"draft")+":"+ie,updatedAt:new Date().toISOString()};X<0&&(ce>=0?p[ce]=Qe:p.push(Qe))}',
  "AI recipe generation idempotency",
);

bundle = replaceOnce(
  bundle,
  'ke=async(w,R)=>{const P=bdCatState(E),c=P.recipes.some(p=>p.id===w.id)?P.recipes.map(p=>p.id===w.id?w:p):[w,...P.recipes],p=new Map(P.stockBalances.map(oe=>[oe.key,oe]));',
  'ke=async(w,R)=>{const P=bdCatState(E),X=P.recipes.find(p=>p.id===w.id),ce=Number(X?.version)||1,Qe=X?.status==="confirmed"?{...X,current:!1,lifecycleStatus:"superseded",reviewStatus:"superseded"}:null,At=X?.status==="confirmed"?{...w,id:crypto.randomUUID(),version:ce+1,current:w.status==="confirmed",currentDraft:w.status!=="confirmed",reviewStatus:w.status==="confirmed"?"approved":w.source==="ai"?"ai_draft":"requires_review",ownerId:w.menuItemId,ownerType:"menu_item"}:{...w,version:ce,current:w.status==="confirmed",currentDraft:w.status!=="confirmed",reviewStatus:w.status==="confirmed"?"approved":w.source==="ai"?"ai_draft":"requires_review",ownerId:w.menuItemId,ownerType:"menu_item"},c=X?.status==="confirmed"?[At,...P.recipes.map(p=>p.id===X.id?Qe:p)]:P.recipes.some(p=>p.id===w.id)?P.recipes.map(p=>p.id===w.id?At:p):[At,...P.recipes],p=new Map(P.stockBalances.map(oe=>[oe.key,oe]));',
  "tech-card version preserving save",
);

for (const path of [responsePath, appHtmlPath]) {
  let source = readFileSync(path, "utf8");
  source = source.replaceAll(
    "20260823-inventory-scope-hierarchy-v256",
    "20260823-inventory-scope-hierarchy-v256-20260823-tech-card-reconciliation-v257",
  );
  source = source.replaceAll(
    "20260813-assortment-v171",
    "20260813-assortment-v171-20260823-tech-card-reconciliation-v257",
  );
  writeFileSync(path, source);
}

const bootstrap = readFileSync(bootstrapPath, "utf8");
writeFileSync(
  bootstrapPath,
  bootstrap.replaceAll(
    "20260823-inventory-scope-hierarchy-v256",
    "20260823-inventory-scope-hierarchy-v256-20260823-tech-card-reconciliation-v257",
  ),
);

writeFileSync(bundlePath, bundle);
console.log("Applied tech-card reconciliation v257.");
