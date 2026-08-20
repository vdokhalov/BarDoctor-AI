import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0 && label === "unified purchase source sheet" && source.includes("function bdProcManualDraftV207")) return;
  if (index >= 0 && label === "legacy purchase entry redirect" && source.includes("window.bdSyncNavigationQuery({create:null,scan:null})")) return;
  if (index < 0 && label === "automatic purchase classification and payment" && source.includes("recordPayment:!w&&A.documentType")) return;
  if (index < 0 && source.includes(after)) return;
  if (index < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Ambiguous ${label}`);
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

const purchaseEntryEffect = 'S.useEffect(()=>{if(!n||!ue)return;const w=new URLSearchParams(t);if(w.get("create")==="1"||w.get("scan")==="1"){Y(!0),window.bdSyncNavigationQuery({create:null,scan:null})}},[n,t,ue]);';
while (source.includes(purchaseEntryEffect + purchaseEntryEffect)) {
  source = source.replace(purchaseEntryEffect + purchaseEntryEffect, purchaseEntryEffect);
}

replaceOnce(
  'children:"Добавить расход"',
  'children:"Добавить покупку"',
  "Finance purchase CTA",
);

replaceOnce(
  'function bdProcScanChoiceV168({onClose:e,onCamera:t,onGallery:n}){return i.jsx(bdProcSheetV168,{label:"Новая закупка",title:"Добавить документ",copy:"Выберите источник. После распознавания откроется обязательная сверка.",onClose:e,className:"compact",children:i.jsxs("div",{className:"bd-proc-source-grid-v168",children:[i.jsxs("button",{type:"button",onClick:t,children:[i.jsx("span",{children:i.jsx(sa,{size:20})}),i.jsxs("span",{children:[i.jsx("strong",{children:"Камера"}),i.jsx("small",{children:"Сфотографировать чек или накладную"})]}),i.jsx(Br,{size:17})]}),i.jsxs("button",{type:"button",onClick:n,children:[i.jsx("span",{children:i.jsx(aQ,{size:20})}),i.jsxs("span",{children:[i.jsx("strong",{children:"Галерея"}),i.jsx("small",{children:"Выбрать до 12 фотографий"})]}),i.jsx(Br,{size:17})]})]})})}',
  'function bdProcManualDraftV207(e){const t=new Date().toISOString(),n=crypto.randomUUID();return{id:n,idempotencyKey:n,venueId:e||void 0,documentType:"receipt",supplierName:"",supplierType:"retail",date:t.slice(0,10),documentNumber:"",currency:"RUB",expenseCategory:"auto",paymentMethod:"unknown",total:0,items:[{id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",packageSize:"1 шт.",unitPrice:0,lineTotal:0,category:"auto",confidence:1}],confidence:1,warnings:[],source:"manual",sourceType:"manual",sourceLabel:"Ручной ввод",status:"draft",createdAt:t,updatedAt:t}}\nfunction bdProcScanChoiceV168({onClose:e,onCamera:t,onGallery:n,onFile:r,onManual:a}){return i.jsx(bdProcSheetV168,{label:"Добавить покупку",title:"Как внести данные?",copy:"Выберите удобный способ. Товары попадут в номенклатуру и на склад, услуги — только в расходы.",onClose:e,className:"compact",children:i.jsxs("div",{className:"bd-proc-source-grid-v168",children:[i.jsxs("button",{type:"button",onClick:t,children:[i.jsx("span",{children:i.jsx(sa,{size:20})}),i.jsxs("span",{children:[i.jsx("strong",{children:"Камера"}),i.jsx("small",{children:"Сфотографировать чек или накладную"})]}),i.jsx(Br,{size:17})]}),i.jsxs("button",{type:"button",onClick:n,children:[i.jsx("span",{children:i.jsx(aQ,{size:20})}),i.jsxs("span",{children:[i.jsx("strong",{children:"Галерея"}),i.jsx("small",{children:"Выбрать до 12 фотографий"})]}),i.jsx(Br,{size:17})]}),i.jsxs("button",{type:"button",onClick:r,children:[i.jsx("span",{children:i.jsx(v$,{size:20})}),i.jsxs("span",{children:[i.jsx("strong",{children:"Файл"}),i.jsx("small",{children:"PDF, Excel или CSV"})]}),i.jsx(Br,{size:17})]}),i.jsxs("button",{type:"button",onClick:a,children:[i.jsx("span",{children:i.jsx(Vt,{size:20})}),i.jsxs("span",{children:[i.jsx("strong",{children:"Вручную"}),i.jsx("small",{children:"Без чека и накладной"})]}),i.jsx(Br,{size:17})]})]})})}',
  "unified purchase source sheet",
);

replaceOnce(
  'documentType:"receipt",supplierName:"",supplierType:"retail",date:t.slice(0,10),documentNumber:"",currency:"RUB",expenseCategory:"other",paymentMethod:"unknown",total:0,items:[{id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",packageSize:"1 шт.",unitPrice:0,lineTotal:0,category:"other",confidence:1}]',
  'documentType:"receipt",supplierName:"",supplierType:"retail",date:t.slice(0,10),documentNumber:"",currency:"RUB",expenseCategory:"auto",paymentMethod:"unknown",total:0,items:[{id:crypto.randomUUID(),name:"",quantity:1,unit:"шт.",packageSize:"1 шт.",unitPrice:0,lineTotal:0,category:"auto",confidence:1}]',
  "automatic manual purchase categories",
);

replaceOnce(
  'const fe=H||bdProcFallbackAnalyticsV168(le,d,b),me=w=>',
  'S.useEffect(()=>{if(!n||!ue)return;const w=new URLSearchParams(t);if(w.get("create")==="1"||w.get("scan")==="1"){Y(!0),window.bdSyncNavigationQuery({create:null,scan:null})}},[n,t,ue]);const fe=H||bdProcFallbackAnalyticsV168(le,d,b),me=w=>',
  "legacy purchase entry redirect",
);

replaceOnce(
  'V&&i.jsx(bdProcScanChoiceV168,{onClose:()=>Y(!1),onCamera:()=>{Y(!1),te.current?.click()},onGallery:()=>{Y(!1),re.current?.click()}})',
  'V&&i.jsx(bdProcScanChoiceV168,{onClose:()=>Y(!1),onCamera:()=>{Y(!1),te.current?.click()},onGallery:()=>{Y(!1),re.current?.click()},onFile:()=>{Y(!1),ne.current?.click()},onManual:()=>{Y(!1),k(bdProcManualDraftV207(s.activeVenueId))}})',
  "purchase source actions",
);

replaceOnce(
  'children:"Создать закупку"',
  'children:"Добавить покупку"',
  "payment entry purchase CTA",
);

replaceOnce(
  'children:[i.jsx(bdProcQuickV168,{icon:sa,title:"Сканировать",copy:"Камера или галерея",onClick:s}),i.jsx(bdProcQuickV168,{icon:v$,title:"Импорт файла",copy:"PDF, Excel или CSV",onClick:l}),i.jsx(bdProcQuickV168,{icon:Vt,title:"Добавить поставщика",copy:"Контакты и условия",onClick:u})]',
  'children:[i.jsx(bdProcQuickV168,{icon:Vt,title:"Добавить покупку",copy:"Чек, файл или вручную",onClick:s}),i.jsx(bdProcQuickV168,{icon:Vt,title:"Добавить поставщика",copy:"Контакты и условия",onClick:u})]',
  "procurement quick actions",
);

replaceOnce(
  'async function _e(){if(!A)return;bdSetProcSaving(!0);try{const w=A.status==="confirmed"||A.status==="cancelled",R=await fetch(w?"/api/purchases/update":"/api/purchases/confirm",{method:"POST",headers:{"Content-Type":"application/json","x-venue-id":String(s.activeVenueId||"")},body:JSON.stringify({document:A,idempotencyKey:A.idempotencyKey||A.id})}),P=await R.json();if(!R.ok||!P.ok)throw new Error(P.error||"Не удалось сохранить закупку");bdProcApplyServerResultV186(P),k(null),w&&e(g.get("returnTo")==="finance"?"/finance":"/suppliers"),a({variant:"success",title:w?A.status==="cancelled"?"Отменённый документ обновлён":"Закупка обновлена":A.documentType==="price_list"?"Прайс сохранён":"Закупка проведена",description:A.documentType==="price_list"?"Предложение доступно для безопасного сравнения, но не считается фактом закупки.":A.status==="cancelled"?"Изменения сохранены без влияния на склад. Проведите документ заново, когда он готов.":bdProcNumberV168(P.inventorySummary?.postedLines)>0?bdProcNumberV168(P.inventorySummary.postedLines)+" позиций поставлено на приход. Оплату добавьте отдельной операцией.":"Документ проведён. Оплата поставщику ведётся отдельными связанными операциями."})}catch(w){a({variant:"error",title:"Не удалось сохранить",description:w instanceof Error?w.message:"Проверьте данные и повторите."})}finally{bdSetProcSaving(!1)}}',
  'async function _e(){if(!A)return;bdSetProcSaving(!0);try{const w=A.status==="confirmed"||A.status==="cancelled",R=await fetch(w?"/api/purchases/update":"/api/purchases/confirm",{method:"POST",headers:{"Content-Type":"application/json","x-venue-id":String(s.activeVenueId||"")},body:JSON.stringify({document:A,idempotencyKey:A.idempotencyKey||A.id,recordPayment:!w&&A.documentType!=="price_list"&&A.paymentMethod!=="unknown"})}),P=await R.json();if(!R.ok||!P.ok)throw new Error(P.error||"Не удалось сохранить покупку");bdProcApplyServerResultV186(P),k(null);const c=g.get("returnTo");c&&e(c==="finance"?"/finance":c==="warehouse"?"/warehouse":c==="market"?"/market":c==="opportunities"?"/opportunities":"/suppliers");const p=bdProcNumberV168(P.inventorySummary?.postedLines),oe=Boolean(P.payment);a({variant:"success",title:w?A.status==="cancelled"?"Отменённый документ обновлён":"Покупка обновлена":A.documentType==="price_list"?"Прайс сохранён":"Покупка добавлена",description:A.documentType==="price_list"?"Предложение доступно для сравнения и не влияет на склад или расходы.":A.status==="cancelled"?"Изменения сохранены без влияния на склад.":p>0&&oe?p+" позиций поставлено на приход, оплата отражена в расходах.":p>0?p+" позиций поставлено на приход. Покупка сохранена как долг поставщику.":oe?"Покупка отражена в расходах без изменения склада.":"Покупка сохранена как долг поставщику без изменения склада."})}catch(w){a({variant:"error",title:"Не удалось сохранить",description:w instanceof Error?w.message:"Проверьте данные и повторите."})}finally{bdSetProcSaving(!1)}}',
  "automatic purchase classification and payment",
);

replaceOnce(
  'c==="market"?"/market":"/suppliers"',
  'c==="market"?"/market":c==="opportunities"?"/opportunities":"/suppliers"',
  "purchase return to opportunities",
);

replaceOnce(
  'h=e.documentType==="price_list"||e.items.length>0&&Number(e.total)>0;return',
  'h=e.documentType==="price_list"?e.items.length>0&&e.items.every(g=>String(g.name||"").trim()&&(Number(g.unitPrice)>0||Number(g.lineTotal)>0)):e.items.length>0&&Number(e.total)>0&&e.items.every(g=>String(g.name||"").trim()&&Number(g.quantity)>0&&(Number(g.unitPrice)>0||Number(g.lineTotal)>0));return',
  "meaningful purchase line validation",
);

replaceOnce(
  'children:e.status==="confirmed"?"Редактировать накладную":"Проверьте распознавание"',
  'children:e.status==="confirmed"?"Редактировать покупку":e.source==="manual"?"Добавить покупку":"Проверьте распознавание"',
  "manual purchase title",
);

replaceOnce(
  'i.jsx(bdProcField,{label:"Предполагаемый способ",children:i.jsxs("select"',
  'i.jsx(bdProcField,{label:"Оплата",children:i.jsxs("select"',
  "purchase payment label",
);

replaceOnce(
  'i.jsx("option",{value:"unknown",children:"Не указано"})',
  'i.jsx("option",{value:"unknown",children:"Не оплачено — долг поставщику"})',
  "purchase unpaid option",
);

replaceOnce(
  'value:e.expenseCategory||"products",onChange:g=>l("expenseCategory",g.target.value),children:Object.entries(bdProcCategoryLabels).map(([g,y])=>i.jsx("option",{value:g,children:y},g))',
  'value:e.expenseCategory||"auto",onChange:g=>l("expenseCategory",g.target.value),children:[i.jsx("option",{value:"auto",children:"Определить автоматически"}),...Object.entries(bdProcCategoryLabels).map(([g,y])=>i.jsx("option",{value:g,children:y},g))]',
  "automatic purchase category",
);

replaceOnce(
  'value:g.category||"products",onChange:j=>u(g.id,{category:j.target.value}),children:Object.entries(bdProcCategoryLabels).map(([j,v])=>i.jsx("option",{value:j,children:v},j))',
  'value:g.category||"auto",onChange:j=>u(g.id,{category:j.target.value}),children:[i.jsx("option",{value:"auto",children:"Определить автоматически"}),...Object.entries(bdProcCategoryLabels).map(([j,v])=>i.jsx("option",{value:j,children:v},j))]',
  "automatic purchase line category",
);

replaceOnce(
  'i.jsx(bdProcField,{label:"Товар",children:i.jsx("input",{value:g.name',
  'i.jsx(bdProcField,{label:"Товар или услуга",children:i.jsx("input",{value:g.name',
  "purchase item label",
);

replaceOnce(
  'e.documentType==="price_list"?"Сохранить прайс":"Учесть закупку"',
  'e.documentType==="price_list"?"Сохранить прайс":"Добавить покупку"',
  "purchase save CTA",
);

replaceOnce(
  '[l,u]=S.useState(!1),[d,f]=S.useState(!1),[m,h]=S.useState(""),g=bdWarehouseKey(e)',
  '[l,u]=S.useState(()=>!bdWarehouseKey(e)),[d,f]=S.useState(!1),[m,h]=S.useState(""),g=bdWarehouseKey(e)',
  "new nomenclature editor state",
);

replaceOnce(
  'i.jsx("h2",{children:l?"Изменить товар":e.name||"Позиция без названия"})',
  'i.jsx("h2",{children:l?g?"Изменить позицию":"Новая позиция":e.name||"Позиция без названия"})',
  "new nomenclature title",
);

replaceOnce(
  'body:JSON.stringify({action:"update",productKey:g,name:v.name.trim(),unit:v.unit,packageSize:v.packageSize.trim()})',
  'body:JSON.stringify({action:g?"update":"create",productKey:g||void 0,name:v.name.trim(),unit:v.unit,packageSize:v.packageSize.trim()})',
  "nomenclature create action",
);

replaceOnce(
  'const Se={stock:"Остатки",movements:"Движения",counts:"Инвентаризации",writeoffs:"Списания"}',
  'const Se={stock:"Номенклатура",movements:"Движения",counts:"Инвентаризации",writeoffs:"Списания"}',
  "warehouse nomenclature tab",
);

replaceOnce(
  'i.jsx("h3",{children:"Расчётные остатки"})',
  'i.jsx("h3",{children:"Номенклатура и остатки"})',
  "warehouse nomenclature heading",
);

replaceOnce(
  'i.jsx("input",{className:"bd-warehouse-search",value:v,onChange:B=>b(B.target.value),placeholder:"Найти товар…","aria-label":"Найти товар на складе"})',
  'i.jsxs("div",{className:"bd-warehouse-nomenclature-tools-v207",children:[i.jsx("input",{className:"bd-warehouse-search",value:v,onChange:B=>b(B.target.value),placeholder:"Найти позицию…","aria-label":"Найти позицию в номенклатуре"}),z&&i.jsx("button",{type:"button",onClick:()=>C({name:"",unit:"pcs",packageSize:"1 шт.",current:0}),children:"+ Позиция"})]})',
  "warehouse add nomenclature action",
);

replaceOnce(
  'onClick:()=>e("/suppliers"),children:[i.jsx("b",{children:"↗ Открыть приходы"}),i.jsx("small",{children:"Накладные и поставщики"})]',
  'onClick:()=>e("/suppliers?create=1&returnTo=warehouse"),children:[i.jsx("b",{children:"Добавить покупку"}),i.jsx("small",{children:"Чек, файл или вручную"})]',
  "warehouse purchase CTA",
);

replaceOnce(
  'children:"Добавить приходную накладную"',
  'children:"Добавить покупку"',
  "empty warehouse purchase CTA",
);

await writeFile(bundlePath, source);
