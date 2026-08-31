import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const catalogCssPath = new URL("../public/catalog.css", import.meta.url);
const suppliersCssPath = new URL("../public/suppliers.css", import.meta.url);
const shellPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const marker = 'const bdPurchaseReviewUxVersion="v356";';

let source = readFileSync(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  source = source.replace(before, after);
}

const mappingComponent = String.raw`${marker}
function bdInvoiceLineMappingV356({line:e,supplierId:t,supplierName:n,documentId:r,onSelect:a}){const[s,l]=S.useState(!1),[u,d]=S.useState(""),[f,m]=S.useState([]),[h,g]=S.useState(""),[y,j]=S.useState(null),[v,b]=S.useState("idle"),[N,E]=S.useState(0),[_,T]=S.useState("idle"),[bdQuickOpenV356,bdSetQuickOpenV356]=S.useState(!1),C=bdCatArray(e.mappingCandidates),D=e.rawName||e.name||"Новая позиция",z=C.find(k=>k.id===e.nomenclatureId||k.key===e.purchaseProductKey)||{key:e.purchaseProductKey,id:e.nomenclatureId,name:e.nomenclatureName||D,unit:e.unit,packageSize:e.packageSize};S.useEffect(()=>{if(!s||u.trim().length<2)return;const k=setTimeout(()=>E(O=>O+1),250);return()=>clearTimeout(k)},[s,u]);S.useEffect(()=>{const k=u.trim();if(!s||k.length<2){m([]),j(null),b("idle");return}const O=new AbortController,P=new URLSearchParams({q:k,limit:"12"});h&&P.set("cursor",h),b("loading"),fetch("/api/tech-cards/nomenclature?"+P.toString(),{headers:ca(Ot()),cache:"no-store",signal:O.signal}).then(R=>R.json().then(M=>({ok:R.ok,body:M}))).then(({ok:R,body:M})=>{if(!R||!M.ok)throw new Error(M.error||"Не удалось загрузить номенклатуру");const L=bdCatArray(M.items);m(I=>h?[...new Map([...I,...L].map(F=>[F.key,F])).values()]:L),j(M.nextCursor||null),b("loaded")}).catch(R=>{R.name!=="AbortError"&&b("error")});return()=>O.abort()},[s,u,h,N]);function A(k){if((!t&&!n)||!e.rawName){T("deferred");return}T("saving"),fetch("/api/purchases/mappings",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({supplierId:t,supplierName:n,ensureSupplier:!t,documentId:r,lineId:e.id,rawName:e.rawName,unit:e.unit,packageSize:e.packageSize,supplierArticle:e.supplierArticle,barcode:e.barcode,currency:e.currency,purchaseProductKey:k.key,nomenclatureId:k.id})}).then(O=>O.json().then(P=>({ok:O.ok,body:P}))).then(({ok:O,body:P})=>{if(!O||!P.ok)throw new Error(P.error||"mapping failed");T("saved")}).catch(()=>T("error"))}function O(k){a({purchaseProductKey:k.key,nomenclatureId:k.id,nomenclatureName:k.name,name:e.rawName||e.name,requiresReview:!1,mappingSource:"manual",confidence:1,confidenceLevel:"high"}),l(!1),d(""),A(k)}function P(){d(D),g(""),l(!0)}function R(){if(!t||!e.rawName||!e.purchaseProductKey){a({purchaseProductKey:void 0,nomenclatureId:void 0,nomenclatureName:void 0,mappingSource:void 0,confidenceLevel:"low",requiresReview:!0,name:e.rawName||e.name}),l(!1),d("");return}T("saving"),fetch("/api/purchases/mappings",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",...ca(Ot())},body:JSON.stringify({action:"remove",supplierId:t,supplierName:n,documentId:r,lineId:e.id,rawName:e.rawName,unit:e.unit,packageSize:e.packageSize,supplierArticle:e.supplierArticle,barcode:e.barcode,currency:e.currency,purchaseProductKey:e.purchaseProductKey,nomenclatureId:e.nomenclatureId})}).then(k=>k.json().then(O=>({ok:k.ok,body:O}))).then(({ok:k,body:O})=>{if(!k||!O.ok)throw new Error(O.error||"mapping remove failed");a({purchaseProductKey:void 0,nomenclatureId:void 0,nomenclatureName:void 0,mappingSource:void 0,confidenceLevel:"low",requiresReview:!0,name:e.rawName||e.name}),l(!1),d(""),T("removed")}).catch(()=>T("error"))}if(!s&&e.purchaseProductKey&&e.requiresReview)return i.jsxs("div",{"data-bd-invoice-mapping-memory":"compact-v356",className:"bd-invoice-mapping-v356 is-review",children:[i.jsxs("span",{children:[i.jsx("strong",{children:e.nomenclatureName||z.name||"Предложено соответствие"}),i.jsx("small",{children:"Проверьте предложенную связь перед сохранением"})]}),i.jsxs("div",{className:"bd-invoice-mapping-actions-v356",children:[i.jsx("button",{type:"button",className:"confirm",onClick:()=>O(z),children:"Подтвердить"}),i.jsx("button",{type:"button",onClick:P,children:"Изменить"})]})]});if(!s&&e.purchaseProductKey)return i.jsxs("div",{"data-bd-invoice-mapping-memory":"compact-v356",className:"bd-invoice-mapping-v356 is-linked",children:[i.jsxs("span",{children:[i.jsx("strong",{children:e.nomenclatureName||z.name||"Связанная позиция"}),i.jsx("small",{children:e.mappingSource==="history"?"Знакомая позиция поставщика":_==="saved"?"Соответствие поставщика сохранено":_==="saving"?"Сохраняем соответствие…":_==="error"?"Связано; обучение сохранится при подтверждении покупки":"Связано с номенклатурой"})]}),i.jsx("button",{type:"button",onClick:P,children:"Изменить"})]});if(!s)return i.jsxs("div",{"data-bd-invoice-mapping-memory":"compact-v356",className:"bd-invoice-mapping-v356 is-unlinked",children:[i.jsxs("span",{children:[i.jsx("strong",{children:"Не связано с номенклатурой"}),i.jsx("small",{children:C.length?"Есть подходящие варианты — выберите один":"Найдите существующую позицию или создайте новую"})]}),C.length>0&&i.jsx("div",{className:"bd-invoice-suggestions-v356",children:C.slice(0,2).map(k=>i.jsxs("button",{type:"button",onClick:()=>O(k),children:[i.jsx("b",{children:k.name}),i.jsxs("small",{children:[k.packageSize||k.unit," · ",Math.round((Number(k.score)||0)*100),"%"]})]},k.key||k.id))}),i.jsx("button",{type:"button",className:"open",onClick:P,children:C.length?"Другой вариант":"Сопоставить"})]});return i.jsxs("div",{"data-bd-invoice-mapping-memory":"search-v356",className:"bd-invoice-mapping-v356 is-open",children:[i.jsxs("div",{className:"bd-invoice-mapping-title-v356",children:[i.jsxs("span",{children:[i.jsx("strong",{children:"Сопоставить с номенклатурой"}),i.jsx("small",{children:D})]}),i.jsx("button",{type:"button",onClick:()=>{l(!1),d("")},"aria-label":"Свернуть поиск",children:"×"})]}),i.jsx("input",{type:"search",value:u,autoFocus:!0,onChange:k=>{d(k.target.value),g("")},placeholder:"Введите минимум 2 символа…","aria-label":"Поиск номенклатуры для строки накладной"}),u.trim().length<2&&i.jsx("div",{className:"bd-invoice-mapping-state-v2",children:"Введите название товара"}),v==="loading"&&i.jsx("div",{className:"bd-invoice-mapping-state-v2",role:"status",children:"Ищем подходящие позиции…"}),v==="error"&&i.jsxs("div",{className:"bd-invoice-mapping-state-v2 is-error",role:"alert",children:["Не удалось загрузить номенклатуру. ",i.jsx("button",{type:"button",onClick:()=>E(k=>k+1),children:"Повторить"})]}),v==="loaded"&&!f.length&&i.jsx("div",{className:"bd-invoice-mapping-state-v2",children:"Совпадений не найдено"}),v==="loaded"&&f.length>0&&i.jsx("div",{className:"bd-invoice-mapping-results-v356",children:f.map(k=>i.jsxs("button",{type:"button",onClick:()=>O(k),children:[i.jsx("b",{children:k.name}),i.jsx("small",{children:[k.packageSize||k.unit,k.supplierName?" · "+k.supplierName:""].join("")})]},k.key))}),v==="loaded"&&y&&i.jsx("button",{type:"button",className:"bd-invoice-mapping-more-v2",onClick:()=>g(y),children:"Показать ещё"}),u.trim().length>=2&&v!=="loading"&&i.jsx("button",{type:"button",className:"bd-invoice-create-canonical-v297",onClick:()=>bdSetQuickOpenV356(!0),children:'Создать «'+D+'» в номенклатуре'}),bdQuickOpenV356&&i.jsx(bdNomenclatureQuickCreateV336,{initialName:D,prefill:{name:D,unit:e.unit,packageSize:e.packageSize,price:e.unitPrice},context:"receipt",onClose:()=>bdSetQuickOpenV356(!1),onCreated:k=>{O(k),bdSetQuickOpenV356(!1)}}),e.purchaseProductKey&&i.jsx("button",{type:"button",className:"bd-invoice-mapping-unlink-v296",disabled:_==="saving",onClick:R,children:_==="saving"?"Отменяем связь…":"Оставить без связи"})]})}
`;

const reviewHelpers = String.raw`function bdInvoiceReviewPriorityV4(e){if(!e.purchaseProductKey&&!e.nomenclatureId)return 0;if(e.confidenceLevel==="low")return 1;if(e.requiresReview||e.confidenceLevel==="medium")return 2;return 3}
function bdInvoiceReviewOrderV4(e){return[...e].sort((t,n)=>bdInvoiceReviewPriorityV4(t)-bdInvoiceReviewPriorityV4(n))}
function bdInvoiceReviewSummaryV4({items:e,onChange:t}){const n=e.length,r=e.filter(v=>!v.purchaseProductKey&&!v.nomenclatureId).length,a=e.filter(v=>(v.requiresReview||v.confidenceLevel==="medium")&&(v.purchaseProductKey||v.nomenclatureId)).length,s=e.filter(v=>v.mappingSource==="ai"&&v.confidenceLevel==="high"&&!v.requiresReview).length,l=n-a-r;function u(){s&&t(e.map(v=>v.mappingSource==="ai"&&v.confidenceLevel==="high"&&!v.requiresReview?{...v,mappingSource:"manual",confirmedByUser:!0}:v))}return i.jsxs("section",{"data-bd-invoice-review-summary":"hybrid-v4",className:"bd-invoice-review-summary-v4",children:[i.jsxs("div",{children:[i.jsxs("strong",{children:[n," позиций"]}),i.jsxs("span",{children:[l," сопоставлены · ",a," требуют подтверждения · ",r," не найдены"]})]}),s>0&&i.jsxs("button",{type:"button",onClick:u,children:["Подтвердить ",s," уверенных соответствий"]})]})}
`;

const receivingWorkspace = String.raw`const bdReceivingWorkspaceVersion="v357";const bdPurchaseReceivingStabilityV371="v371";
function bdPurchaseReview({draft:e,suppliers:t,onChange:n,onCancel:r,onConfirm:a,onAddSupplier:o,saving:s}){
  const l=(k,v)=>n({...e,[k]:v});
  const u=(id,patch)=>{const items=e.items.map(line=>{if(line.id!==id)return line;const next={...line,...patch},quantity=Number(next.quantity)||0,price=Number(next.unitPrice)||0;return("quantity" in patch||"unitPrice" in patch)&&quantity>=0&&price>=0?{...next,lineTotal:Math.round(quantity*price*100)/100}:next});l("items",items)};
  const d=e.items.reduce((sum,line)=>sum+(Number(line.lineTotal)||0),0);
  S.useEffect(()=>{if(e.source!=="manual"||e.documentType==="price_list")return;const total=Math.round(d*100)/100;Number(e.total)!==total&&l("total",total)},[d,e.documentType,e.source]);
  const f=()=>{const id=crypto.randomUUID();l("items",[...e.items,{id,name:"",quantity:1,unit:"шт.",quantityMode:"count",packageSize:"1 шт.",unitPrice:0,lineTotal:0,category:e.expenseCategory||"products",confidence:1}]);bdSetActiveLineV357(id);bdSetLineViewV357("all")};
  const m=()=>l("total",Math.round(d*100)/100);
  const bdAccountingCurrency=bdCurrentAccountingCurrencyV243()||"RUB";
  const[bdSupplierSearch,bdSetSupplierSearch]=S.useState(()=>e.supplierName||"");
  const[bdSupplierOpen,bdSetSupplierOpen]=S.useState(!1);
  const[bdLineViewV357,bdSetLineViewV357]=S.useState("all");
  const[bdActiveLineV357,bdSetActiveLineV357]=S.useState(()=>{const line=e.items.find(item=>!item.purchaseProductKey&&!item.nomenclatureId||item.requiresReview||item.confidenceLevel==="medium");return line?.id||e.items[0]?.id||null});
  const bdActiveSuppliers=t.filter(item=>item.status!=="archived");
  const bdSupplierNeedle=bdProcNormV168(bdSupplierSearch);
  const bdSupplierMatches=bdActiveSuppliers.filter(item=>!bdSupplierNeedle||bdProcNormV168(item.name).includes(bdSupplierNeedle)).slice(0,8);
  S.useEffect(()=>{e.supplierId&&bdSetSupplierSearch(e.supplierName||"")},[e.supplierId,e.supplierName]);
  function bdSelectSupplierV357(item){bdSetSupplierSearch(item.name);bdSetSupplierOpen(!1);n({...e,supplierId:item.id,supplierName:item.name,supplierType:item.type||e.supplierType,currency:e.status==="confirmed"?e.currency:bdAccountingCurrency||e.currency||"RUB"})}
  S.useEffect(()=>{e.status!=="confirmed"&&String(e.currency||"").toUpperCase()!==bdAccountingCurrency&&n({...e,currency:bdAccountingCurrency,originalCurrency:void 0,originalAmount:void 0,accountingCurrency:void 0,accountingAmount:void 0,fxRate:void 0,fxEffectiveDate:void 0,fxSource:void 0,fxLockedAt:void 0})},[e.currency,e.status,bdAccountingCurrency]);
  const bdFxNeeded=e.status==="confirmed"&&e.documentType!=="price_list"&&String(e.currency||"").toUpperCase()!==bdAccountingCurrency;
  const bdAttentionLinesV357=e.items.filter(line=>!line.purchaseProductKey&&!line.nomenclatureId||line.requiresReview||line.confidenceLevel==="medium");
  const bdReadyLinesV357=e.items.filter(line=>!bdAttentionLinesV357.includes(line));
  const bdShownLinesV357=(bdLineViewV357==="attention"?e.items.filter(line=>bdAttentionLinesV357.includes(line)||line.id===bdActiveLineV357):bdLineViewV357==="ready"?bdReadyLinesV357:e.items);
  const bdProgressV357=e.items.length?Math.round(bdReadyLinesV357.length/e.items.length*100):0;
  const bdSupplierReady=e.status==="confirmed"||Boolean(e.supplierId);
  const bdLinesReady=e.documentType==="price_list"?e.items.length>0&&e.items.every(line=>String(line.name||"").trim()&&(Number(line.unitPrice)>0||Number(line.lineTotal)>0)):e.items.length>0&&e.items.every(line=>(e.source==="manual"||(!line.requiresReview&&Boolean(line.purchaseProductKey||line.nomenclatureId)))&&String(line.name||"").trim()&&Number(line.quantity)>0&&(Number(line.unitPrice)>0||Number(line.lineTotal)>0));
  const bdTotalMismatchV357=e.documentType!=="price_list"&&Math.abs(Number(e.total||0)-d)>.02;
  const bdCanPostV357=bdSupplierReady&&bdLinesReady&&(e.documentType==="price_list"||Number(e.total)>0&&!bdTotalMismatchV357);
  const bdBlockingTextV357=!bdSupplierReady?"Выберите поставщика":!e.items.length?"Добавьте хотя бы одну позицию":bdAttentionLinesV357.length?"Сопоставьте "+bdAttentionLinesV357.length+" "+bdProcPluralV168(bdAttentionLinesV357.length,"позицию","позиции","позиций"):Number(e.total)<=0?"Проверьте итог документа":bdTotalMismatchV357?"Сверьте итог с суммой позиций":"Готово к проведению";
  function bdLineStateV357(line){if(!line.purchaseProductKey&&!line.nomenclatureId)return{tone:"missing",label:"Не сопоставлено"};if(line.requiresReview||line.confidenceLevel==="medium")return{tone:"review",label:"Проверьте связь"};return{tone:"ready",label:"Готово"}}
  function bdNextAttentionV357(){const currentIndex=e.items.findIndex(line=>line.id===bdActiveLineV357),next=e.items.slice(currentIndex+1).find(line=>bdAttentionLinesV357.includes(line))||e.items.find(line=>bdAttentionLinesV357.includes(line));if(next){bdSetActiveLineV357(next.id);bdSetLineViewV357("all")}else{bdSetActiveLineV357(null);bdSetLineViewV357("all")}}
  return i.jsx("div",{className:"bd-procurement-sheet-backdrop",children:i.jsxs("section",{className:"bd-procurement-sheet bd-receiving-workspace-v357",role:"dialog","aria-modal":!0,"aria-label":e.status==="confirmed"?"Редактировать приход":"Проверка прихода",children:[
    i.jsxs("header",{className:"bd-procurement-sheet-head bd-receiving-head-v357",children:[i.jsxs("div",{children:[i.jsx("span",{className:"bd-receiving-kicker-v357",children:e.status==="confirmed"?"Проведённый документ":"Черновик · склад не изменён"}),i.jsx("h2",{children:e.status==="confirmed"?"Редактировать приход":e.documentType==="price_list"?"Проверка прайса":"Проверка прихода"}),i.jsxs("p",{children:[bdProcDocLabel(e.documentType)," · ",e.items.length," ",bdProcPluralV168(e.items.length,"позиция","позиции","позиций")]})]}),i.jsx("button",{type:"button",className:"bd-procurement-close",onClick:r,"aria-label":"Закрыть",children:"×"})]}),
    i.jsxs("div",{className:"bd-procurement-form",children:[
      i.jsxs("section",{className:"bd-receiving-readiness-v357 "+(bdCanPostV357?"ready":"attention"),children:[i.jsxs("div",{className:"bd-receiving-readiness-top-v357",children:[i.jsxs("div",{children:[i.jsx("strong",{children:bdBlockingTextV357}),i.jsxs("span",{children:[bdReadyLinesV357.length," из ",e.items.length," позиций готовы"]})]}),i.jsxs("b",{children:[bdProgressV357,"%"]})]}),i.jsx("div",{className:"bd-receiving-progress-v357",children:i.jsx("span",{style:{width:bdProgressV357+"%"}})}),i.jsxs("div",{className:"bd-receiving-counts-v357",children:[i.jsxs("span",{className:"ready",children:[bdReadyLinesV357.length," готово"]}),bdAttentionLinesV357.length>0&&i.jsxs("span",{className:"attention",children:[bdAttentionLinesV357.length," требуют внимания"]}),bdTotalMismatchV357&&i.jsx("button",{type:"button",onClick:m,children:"Итог не сходится · пересчитать"})]})]}),
      e.sourceUrl&&i.jsx("a",{className:"bd-receiving-original-v357",href:e.sourceUrl,target:"_blank",rel:"noreferrer",children:"Сверить с оригиналом документа →"}),
      i.jsxs("details",{className:"bd-receiving-meta-v357",open:!e.supplierId,children:[i.jsxs("summary",{children:[i.jsxs("span",{children:[i.jsx("b",{children:"Реквизиты"}),i.jsxs("small",{children:[e.supplierName||"Поставщик не выбран"," · ",bdProcDate(e.date)," · ",bdProcMoney(Number(e.total)||d,e.currency)]})]}),i.jsx("em",{children:e.supplierId?"Заполнено":"Нужно заполнить"})]}),i.jsxs("div",{className:"bd-receiving-meta-fields-v357",children:[
        i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Тип документа",children:i.jsxs("select",{value:e.documentType,onChange:g=>l("documentType",g.target.value),children:[i.jsx("option",{value:"receipt",children:"Чек магазина"}),i.jsx("option",{value:"invoice",children:"Накладная"}),i.jsx("option",{value:"price_list",children:"Прайс-лист"})]})}),i.jsx(bdProcField,{label:"Дата",children:i.jsx("input",{type:"date",value:e.date,onChange:g=>l("date",g.target.value),onInput:g=>l("date",g.currentTarget.value)})})]}),
        i.jsx(bdProcField,{label:"Поставщик",children:i.jsxs("div",{className:"bd-purchase-supplier-v356",children:[i.jsx("input",{type:"search",value:bdSupplierSearch,onFocus:()=>bdSetSupplierOpen(!0),onBlur:()=>setTimeout(()=>bdSetSupplierOpen(!1),120),onChange:g=>{const value=g.target.value;bdSetSupplierSearch(value);bdSetSupplierOpen(!0);e.supplierId&&bdProcNormV168(value)!==bdProcNormV168(e.supplierName)&&n({...e,supplierId:void 0,supplierName:value})},placeholder:"Найти существующего поставщика…","aria-label":"Поиск поставщика"}),e.supplierId&&i.jsx("span",{className:"selected",children:"Выбран существующий поставщик"}),bdSupplierOpen&&i.jsxs("div",{className:"bd-purchase-supplier-results-v356",children:[bdSupplierMatches.map(item=>i.jsxs("button",{type:"button",onMouseDown:event=>event.preventDefault(),onClick:()=>bdSelectSupplierV357(item),children:[i.jsx("b",{children:item.name}),i.jsx("small",{children:item.type==="retail"?"Розничный магазин":"Поставщик"})]},item.id)),!bdSupplierMatches.length&&i.jsx("p",{children:"Поставщик не найден"}),o&&i.jsx("button",{type:"button",className:"create",onMouseDown:event=>event.preventDefault(),onClick:()=>{bdSetSupplierOpen(!1);o()},children:"+ Создать карточку поставщика"})]})]})}),
        i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Номер документа",children:i.jsx("input",{value:e.documentNumber||"",onChange:g=>l("documentNumber",g.target.value),placeholder:"Необязательно"})}),i.jsx(bdVenueCurrencyLockedV326,{currency:bdAccountingCurrency})]}),
        bdFxNeeded&&i.jsxs("section",{"data-bd-accounting-fx":"v321",className:"bd-procurement-review-note",children:[i.jsxs("p",{children:["Сумма документа: ",Number(e.total||0).toFixed(2)," ",e.currency," · Учётная валюта: ",bdAccountingCurrency]}),i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Исторический курс (1 "+e.currency+" = … "+bdAccountingCurrency+")",children:i.jsx("input",{type:"number",step:"0.000001",inputMode:"decimal",value:e.fxRate||"",onChange:g=>l("fxRate",g.target.value)})}),i.jsx(bdProcField,{label:"Дата курса",children:i.jsx("input",{type:"date",value:e.fxEffectiveDate||e.date||"",onChange:g=>l("fxEffectiveDate",g.target.value)})})]}),i.jsx(bdProcField,{label:"Источник курса",children:i.jsx("input",{value:e.fxSource||"",onChange:g=>l("fxSource",g.target.value)})})]}),
        i.jsx(bdProcField,{label:"Категория закупки",children:i.jsx("select",{value:e.expenseCategory||"auto",onChange:g=>l("expenseCategory",g.target.value),children:[i.jsx("option",{value:"auto",children:"Определить автоматически"}),...Object.entries(bdProcCategoryLabels).map(([key,label])=>i.jsx("option",{value:key,children:label},key))]})}),
        i.jsx("p",{className:"bd-receiving-accounting-note-v357",children:"После проведения товарные позиции увеличат остатки и обновят себестоимость. Долг поставщику появится по документу; оплату добавьте отдельной операцией."})
      ]})]}),
      i.jsxs("div",{className:"bd-receiving-lines-head-v357",children:[i.jsxs("div",{children:[i.jsx("h3",{children:"Позиции документа"}),i.jsx("span",{children:"Порядок строк сохранён как в документе"})]}),bdAttentionLinesV357.length>0&&i.jsx("button",{type:"button",onClick:bdNextAttentionV357,children:"Следующая проблема"})]}),
      e.source!=="manual"&&i.jsx(bdInvoiceReviewSummaryV4,{items:e.items,onChange:g=>l("items",g)}),
      i.jsx("div",{className:"bd-receiving-filters-v357",children:[{id:"attention",label:"Требуют внимания",count:bdAttentionLinesV357.length},{id:"all",label:"Все",count:e.items.length},{id:"ready",label:"Готово",count:bdReadyLinesV357.length}].map(filter=>i.jsxs("button",{type:"button",className:bdLineViewV357===filter.id?"active":"",disabled:filter.id!=="all"&&!filter.count,onClick:()=>bdSetLineViewV357(filter.id),children:[filter.label,i.jsx("b",{children:filter.count})]},filter.id))}),
      i.jsx("div",{className:"bd-receiving-line-list-v357",children:bdShownLinesV357.map(line=>{const state=bdLineStateV357(line),isOpen=line.id===bdActiveLineV357,index=e.items.findIndex(item=>item.id===line.id)+1;return i.jsxs("article",{className:"bd-receiving-line-v357 "+state.tone+(isOpen?" open":""),children:[
        i.jsxs("button",{type:"button",className:"bd-receiving-line-summary-v357",onClick:()=>bdSetActiveLineV357(isOpen?null:line.id),"aria-expanded":isOpen,children:[i.jsx("span",{className:"bd-receiving-line-dot-v357","aria-hidden":!0}),i.jsxs("span",{className:"bd-receiving-line-copy-v357",children:[i.jsxs("small",{children:["Позиция ",index," · ",state.label]}),i.jsx("strong",{children:line.rawName||line.name||"Без названия"}),i.jsx("em",{children:line.purchaseProductKey?(line.nomenclatureName||line.name):"Выберите позицию номенклатуры"})]}),i.jsxs("span",{className:"bd-receiving-line-result-v357",children:[i.jsx("b",{children:bdProcMoney(Number(line.lineTotal)||0,e.currency)}),i.jsx("small",{children:bdProcStockPreviewV221(line)}),i.jsx("i",{children:isOpen?"−":"+"})]})]}),
        isOpen&&i.jsxs("div",{className:"bd-receiving-line-editor-v357",children:[i.jsx(bdProcField,{label:"Название в документе",children:i.jsx("input",{value:line.name,onChange:event=>{const value=event.target.value,pack=bdProcSuggestedPackageV209(value,bdProcCurrentPackageV209(line));u(line.id,{name:value,...pack!==bdProcCurrentPackageV209(line)?bdProcPackageUpdateV209(pack):{}})},placeholder:"Название товара"})}),e.documentType!=="price_list"&&i.jsx(bdInvoiceLineMappingV356,{line,supplierId:e.supplierId,supplierName:e.supplierName,documentId:e.id,onSelect:patch=>u(line.id,patch)}),i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Количество",children:i.jsx("input",{type:"number",step:"0.001",inputMode:"decimal",value:line.quantity,onChange:event=>u(line.id,{quantity:event.target.value})})}),i.jsx(bdProcField,{label:"Единица количества",children:i.jsx("select",{value:line.unit||"шт.",onChange:event=>u(line.id,{unit:event.target.value,quantityMode:bdProcQuantityModeV221(event.target.value)}),children:bdProcQuantityUnitsV221.map(([value,label])=>i.jsx("option",{value,children:label},value))})})]}),i.jsx(bdProcField,{label:"Фасовка одной единицы",children:i.jsxs("div",{className:"bd-procurement-package-editor-v209",children:[i.jsxs("select",{"aria-label":"Выбрать стандартную фасовку",value:bdProcPackagePresetsV209.includes(bdProcCurrentPackageV209(line))?bdProcCurrentPackageV209(line):"",onChange:event=>{const value=event.target.value;value&&u(line.id,bdProcPackageUpdateV209(value))},children:[i.jsx("option",{value:"",children:"Выбрать фасовку"}),...bdProcPackageGroupsV209.map(group=>i.jsx("optgroup",{label:group.label,children:group.options.map(value=>i.jsx("option",{value,children:value},value))},group.label))]}),i.jsx("input",{"aria-label":"Своя фасовка",value:bdProcCurrentPackageV209(line),onChange:event=>u(line.id,bdProcPackageUpdateV209(event.target.value)),placeholder:"Например: 0,5 л"})]})}),i.jsxs("div",{className:"bd-procurement-stock-preview-v221",children:[i.jsx("span",{children:"На склад поступит"}),i.jsx("strong",{children:bdProcStockPreviewV221(line)})]}),i.jsxs("div",{className:"bd-procurement-form-grid",children:[i.jsx(bdProcField,{label:"Цена за единицу",children:i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:line.unitPrice,onChange:event=>u(line.id,{unitPrice:event.target.value})})}),i.jsx(bdProcField,{label:"Сумма строки",children:i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:line.lineTotal,onChange:event=>u(line.id,{lineTotal:Number(event.target.value)||0})})})]}),i.jsxs("div",{className:"bd-receiving-line-actions-v357",children:[i.jsx("button",{type:"button",className:"danger",onClick:()=>{l("items",e.items.filter(item=>item.id!==line.id));bdSetActiveLineV357(null)},children:"Удалить позицию"}),state.tone==="ready"&&bdAttentionLinesV357.length>0&&i.jsx("button",{type:"button",onClick:bdNextAttentionV357,children:"К следующей проблеме →"})]})]})
      ]},line.id)} )}),
      i.jsx("button",{type:"button",className:"bd-procurement-secondary bd-receiving-add-line-v357",onClick:f,children:"+ Добавить позицию"}),
      e.documentType!=="price_list"&&i.jsxs("section",{className:"bd-receiving-totals-v357",children:[i.jsxs("div",{children:[i.jsx("span",{children:"Сумма позиций"}),i.jsx("strong",{children:bdProcMoney(d,e.currency)})]}),i.jsxs("div",{children:[i.jsx("span",{children:"Итог документа"}),i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:e.total,onChange:event=>l("total",Number(event.target.value)||0),"aria-label":"Итог документа"})]}),i.jsxs("div",{children:[i.jsx("span",{children:"НДС / налог"}),i.jsx("input",{type:"number",step:"0.01",inputMode:"decimal",value:e.vat||"",onChange:event=>l("vat",Number(event.target.value)||0),placeholder:"0","aria-label":"НДС или налог"})]}),bdTotalMismatchV357&&i.jsx("button",{type:"button",onClick:m,children:"Принять сумму позиций как итог"})]}),
      i.jsxs("div",{className:"bd-procurement-sheet-actions bd-receiving-actions-v357",children:[i.jsx("button",{type:"button",className:"bd-procurement-secondary",disabled:s,onClick:r,children:e.status==="confirmed"?"Закрыть":"Не сохранять"}),i.jsxs("div",{children:[i.jsx("small",{children:bdCanPostV357?e.status==="confirmed"?"Изменения будут пересчитаны":"Склад и себестоимость обновятся после проведения":bdBlockingTextV357}),i.jsx("button",{type:"button",className:"bd-procurement-primary",disabled:s||!bdCanPostV357,onClick:a,children:s?"Сохраняю…":e.status==="confirmed"?"Сохранить изменения":e.documentType==="price_list"?"Сохранить прайс":"Провести приход"})]})]})
    ]})
  ]})})
}
`;

const purchaseLineField = 'i.jsx(bdProcField,{label:"Товар или услуга",children:i.jsx("input",{value:g.name,onChange:j=>{const v=j.target.value,b=bdProcSuggestedPackageV209(v,bdProcCurrentPackageV209(g));u(g.id,{name:v,...b!==bdProcCurrentPackageV209(g)?bdProcPackageUpdateV209(b):{}})},placeholder:"Название товара"})})';
const legacyInjectedPurchaseField = 'i.jsxs(i.Fragment,{children:[' + purchaseLineField + ',(g.rawName||g.requiresReview)&&i.jsx(bdInvoiceLineMappingV3,{line:g,supplierId:e.supplierId,supplierName:e.supplierName,documentId:e.id,onSelect:j=>u(g.id,j)})]})';

if (!source.includes(marker)) {
  const start = source.indexOf("function bdInvoiceLineMappingV3(");
  const end = source.indexOf("function bdPurchaseReview(", start);
  if (start < 0 || end < 0) throw new Error("Invoice mapping component anchors not found");
  source = source.slice(0, start) + mappingComponent + source.slice(end);

  replaceOnce(
    "function bdPurchaseReview({draft:e,suppliers:t,onChange:n,onCancel:r,onConfirm:a,saving:s}){",
    "function bdPurchaseReview({draft:e,suppliers:t,onChange:n,onCancel:r,onConfirm:a,onAddSupplier:o,saving:s}){",
    "extend purchase review props",
  );

  replaceOnce(
    'm=()=>l("total",Math.round(d*100)/100),bdAccountingCurrency=bdCurrentAccountingCurrencyV243()||"RUB";',
    'm=()=>l("total",Math.round(d*100)/100),bdAccountingCurrency=bdCurrentAccountingCurrencyV243()||"RUB",[bdSupplierSearch,bdSetSupplierSearch]=S.useState(()=>e.supplierName||""),[bdSupplierOpen,bdSetSupplierOpen]=S.useState(!1),bdActiveSuppliers=t.filter(g=>g.status!=="archived"),bdSupplierNeedle=bdProcNormV168(bdSupplierSearch),bdSupplierMatches=bdActiveSuppliers.filter(g=>!bdSupplierNeedle||bdProcNormV168(g.name).includes(bdSupplierNeedle)).slice(0,8);S.useEffect(()=>{e.supplierId&&bdSetSupplierSearch(e.supplierName||"")},[e.supplierId,e.supplierName]);function bdSelectSupplierV356(g){bdSetSupplierSearch(g.name),bdSetSupplierOpen(!1),n({...e,supplierId:g.id,supplierName:g.name,supplierType:g.type||e.supplierType,currency:e.status==="confirmed"?e.currency:bdAccountingCurrency||e.currency||"RUB"})}',
    "add supplier picker state",
  );

  const oldSupplierFields = 'i.jsx(bdProcField,{label:"Поставщик",children:i.jsxs("select",{value:e.supplierId||"__new__",onChange:g=>{const y=t.find(j=>j.id===g.target.value);y?n({...e,supplierId:y.id,supplierName:y.name,supplierType:y.type||e.supplierType,currency:e.status==="confirmed"?e.currency:bdAccountingCurrency||e.currency||"RUB"}):n({...e,supplierId:void 0})},children:[i.jsx("option",{value:"__new__",children:"Создать из документа"}),...t.filter(g=>g.status!=="archived").map(g=>i.jsx("option",{value:g.id,children:g.name},g.id))]})}),i.jsx(bdProcField,{label:"Название поставщика или магазина",children:i.jsx("input",{value:e.supplierName,onChange:g=>l("supplierName",g.target.value),placeholder:"Название на документе"})})';
  const newSupplierField = 'i.jsx(bdProcField,{label:"Поставщик",children:i.jsxs("div",{className:"bd-purchase-supplier-v356",children:[i.jsx("input",{type:"search",value:bdSupplierSearch,onFocus:()=>bdSetSupplierOpen(!0),onBlur:()=>setTimeout(()=>bdSetSupplierOpen(!1),120),onChange:g=>{const y=g.target.value;bdSetSupplierSearch(y),bdSetSupplierOpen(!0),e.supplierId&&bdProcNormV168(y)!==bdProcNormV168(e.supplierName)&&n({...e,supplierId:void 0,supplierName:y})},placeholder:"Найти существующего поставщика…","aria-label":"Поиск поставщика"}),e.supplierId&&i.jsx("span",{className:"selected",children:"Выбран существующий поставщик"}),bdSupplierOpen&&i.jsxs("div",{className:"bd-purchase-supplier-results-v356",children:[bdSupplierMatches.map(g=>i.jsxs("button",{type:"button",onMouseDown:y=>y.preventDefault(),onClick:()=>bdSelectSupplierV356(g),children:[i.jsx("b",{children:g.name}),i.jsx("small",{children:g.type==="retail"?"Розничный магазин":"Поставщик"})]},g.id)),!bdSupplierMatches.length&&i.jsx("p",{children:"Поставщик не найден"}),o&&i.jsx("button",{type:"button",className:"create",onMouseDown:g=>g.preventDefault(),onClick:()=>{bdSetSupplierOpen(!1),o()},children:"+ Создать поставщика"})]})]})})';
  replaceOnce(oldSupplierFields, newSupplierField, "replace supplier auto-create fields");

  replaceOnce(
    'e.documentType!=="price_list"&&i.jsx(bdInvoiceLineMappingV3,{line:g,supplierId:e.supplierId,supplierName:e.supplierName,documentId:e.id,onSelect:j=>u(g.id,j)})',
    'e.documentType!=="price_list"&&i.jsx(bdInvoiceLineMappingV356,{line:g,supplierId:e.supplierId,supplierName:e.supplierName,documentId:e.id,onSelect:j=>u(g.id,j)})',
    "wire compact mapping component",
  );

  replaceOnce(
    'bdFxNeeded=e.status==="confirmed"&&e.documentType!=="price_list"&&String(e.currency||"").toUpperCase()!==bdAccountingCurrency,h=e.documentType==="price_list"?',
    'bdFxNeeded=e.status==="confirmed"&&e.documentType!=="price_list"&&String(e.currency||"").toUpperCase()!==bdAccountingCurrency,bdSupplierReady=e.status==="confirmed"||Boolean(e.supplierId),h=bdSupplierReady&&(e.documentType==="price_list"?',
    "require selected supplier",
  );
  replaceOnce(
    ':e.items.length>0&&Number(e.total)>0&&e.items.every(g=>(e.source==="manual"||(!g.requiresReview&&Boolean(g.purchaseProductKey||g.nomenclatureId)))&&String(g.name||"").trim()&&Number(g.quantity)>0&&(Number(g.unitPrice)>0||Number(g.lineTotal)>0));return i.jsx("div",',
    ':e.items.length>0&&Number(e.total)>0&&e.items.every(g=>(e.source==="manual"||(!g.requiresReview&&Boolean(g.purchaseProductKey||g.nomenclatureId)))&&String(g.name||"").trim()&&Number(g.quantity)>0&&(Number(g.unitPrice)>0||Number(g.lineTotal)>0)));return i.jsx("div",',
    "close supplier validation group",
  );

  replaceOnce(
    'A&&i.jsx(bdPurchaseReview,{draft:A,suppliers:d,onChange:k,onCancel:Ee,onConfirm:_e,saving:bdProcSaving})',
    'A&&i.jsx(bdPurchaseReview,{draft:A,suppliers:d,onChange:k,onCancel:Ee,onConfirm:_e,onAddSupplier:()=>U({}),saving:bdProcSaving})',
    "wire supplier creation action",
  );

  replaceOnce(
    'async function Ce(w){const R=d.some(P=>P.id===w.id)?d.map(P=>P.id===w.id?w:P):[w,...d];f(R),await qr(bdProcurementSupplierStoreV168,R),U(null),z(null),a({variant:"success",title:"Поставщик сохранён",description:w.name})}',
    'async function Ce(w){const R=d.some(P=>P.id===w.id)?d.map(P=>P.id===w.id?w:P):[w,...d];f(R),await qr(bdProcurementSupplierStoreV168,R),A&&k({...A,supplierId:w.id,supplierName:w.name,supplierType:w.type||A.supplierType,currency:A.status==="confirmed"?A.currency:bdCurrentAccountingCurrencyV243()||A.currency||"RUB"}),U(null),z(null),a({variant:"success",title:"Поставщик сохранён",description:w.name})}',
    "select newly created supplier",
  );

  source = source
    .replace(
      "Добавьте карточку вручную или проведите первую закупку — поставщик создастся из документа.",
      "Добавьте карточку поставщика, затем выбирайте её в закупках и приходах.",
    )
    .replace(
      "Если начать со сканирования чека, розничный магазин создастся автоматически.",
      "Перед сохранением документа выберите существующего поставщика или создайте отдельную карточку.",
    );
}

source = source.replaceAll(legacyInjectedPurchaseField, purchaseLineField);
const legacyMappingStarts = [
  source.indexOf("function bdInvoiceLineMappingV2("),
  source.indexOf("function bdInvoiceLineMappingV3("),
].filter((value) => value >= 0);
if (legacyMappingStarts.length) {
  const legacyStart = Math.min(...legacyMappingStarts);
  const purchaseAnchor = source.indexOf("function bdPurchaseReview(", legacyStart);
  if (purchaseAnchor < 0) throw new Error("Purchase review anchor not found after legacy mapping");
  source = source.slice(0, legacyStart) + source.slice(purchaseAnchor);
}

if (!source.includes("function bdInvoiceReviewPriorityV4(")) {
  const reviewAnchor = source.indexOf("function bdPurchaseReview(");
  if (reviewAnchor < 0) throw new Error("Purchase review anchor not found for review helpers");
  source = source.slice(0, reviewAnchor) + reviewHelpers + source.slice(reviewAnchor);
}

{
  const markerStart = source.indexOf('const bdReceivingWorkspaceVersion="v357";');
  const reviewStart = markerStart >= 0 ? markerStart : source.indexOf("function bdPurchaseReview(");
  const reviewEnd = source.indexOf("const bdImageUploadVersion=", reviewStart);
  if (reviewStart < 0 || reviewEnd < 0) throw new Error("Purchase review workspace anchors not found");
  source = source.slice(0, reviewStart) + receivingWorkspace + source.slice(reviewEnd);
}

source = source.replace(
  '[H,I]=S.useState(null),[V,Y]=S.useState(!1),[bdProcSaving,bdSetProcSaving]=S.useState(!1)',
  '[H,I]=S.useState(null),[V,Y]=S.useState(()=>{const w=new URLSearchParams(window.location.search);return w.get("create")==="1"||w.get("scan")==="1"}),[bdProcSaving,bdSetProcSaving]=S.useState(!1)',
);

writeFileSync(bundlePath, source);

const catalogCss = readFileSync(catalogCssPath, "utf8");
if (!catalogCss.includes("Purchase review mapping v356")) {
  appendFileSync(catalogCssPath, `

/* Purchase review mapping v356 */
.bd-invoice-mapping-v356{display:grid;gap:9px;padding:11px 12px;border:1px solid #dfe3ec;border-radius:14px;background:#f8f9fc}.bd-invoice-mapping-v356>span{display:grid;gap:3px;min-width:0}.bd-invoice-mapping-v356 strong{color:#242941;font-size:12px}.bd-invoice-mapping-v356 small{color:#747b8e;font-size:10.5px;line-height:1.35}.bd-invoice-mapping-v356.is-linked,.bd-invoice-mapping-v356.is-review{grid-template-columns:minmax(0,1fr) auto;align-items:center}.bd-invoice-mapping-v356.is-review{border-color:#efcf8f;background:#fffaf0}.bd-invoice-mapping-v356.is-unlinked{border-color:#e1e3ee;background:#fafafe}.bd-invoice-mapping-v356>button,.bd-invoice-mapping-actions-v356 button{min-height:38px;padding:0 11px;border:1px solid #d5d9e5;border-radius:10px;background:#fff;color:#4c5267;font-size:11px;font-weight:800}.bd-invoice-mapping-v356>button.open{color:#5146dc;border-color:#d8d4ff;background:#f4f2ff}.bd-invoice-mapping-actions-v356{display:flex;gap:6px}.bd-invoice-mapping-actions-v356 button.confirm{color:#fff;border-color:#5b55f5;background:#5b55f5}.bd-invoice-suggestions-v356{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.bd-invoice-suggestions-v356 button,.bd-invoice-mapping-results-v356 button{display:grid;gap:2px;min-width:0;min-height:44px;padding:8px 10px;text-align:left;border:1px solid #e1e5ee;border-radius:10px;background:#fff}.bd-invoice-suggestions-v356 b,.bd-invoice-mapping-results-v356 b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px}.bd-invoice-mapping-v356.is-open{border-color:#cfcaff;background:#f8f7ff}.bd-invoice-mapping-title-v356{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.bd-invoice-mapping-title-v356>span{display:grid;gap:2px}.bd-invoice-mapping-title-v356>button{width:32px;height:32px;flex:0 0 auto;border:0;border-radius:50%;background:#e9e7f8;color:#4d5268;font-size:19px}.bd-invoice-mapping-v356.is-open>input{width:100%;min-height:44px;padding:0 12px;border:1px solid #cfd2df;border-radius:11px;background:#fff;font-size:16px}.bd-invoice-mapping-results-v356{display:grid;gap:6px;max-height:248px;overflow:auto;overscroll-behavior:contain}.bd-invoice-mapping-results-v356 button:active,.bd-invoice-suggestions-v356 button:active{background:#f0efff}@media(max-width:520px){.bd-invoice-mapping-v356.is-linked,.bd-invoice-mapping-v356.is-review{grid-template-columns:1fr}.bd-invoice-mapping-actions-v356{display:grid;grid-template-columns:1fr 1fr}.bd-invoice-suggestions-v356{grid-template-columns:1fr}.bd-invoice-mapping-results-v356{max-height:32dvh}}
`);
}

const suppliersCss = readFileSync(suppliersCssPath, "utf8");
if (!suppliersCss.includes("Purchase review workspace v356")) {
  appendFileSync(suppliersCssPath, `

/* Purchase review workspace v356 */
.bd-purchase-supplier-v356{position:relative;display:grid;gap:6px}.bd-purchase-supplier-v356>span.selected{color:#168a50;font-size:10px;font-weight:800}.bd-purchase-supplier-results-v356{position:absolute;z-index:18;top:calc(100% - 2px);left:0;right:0;display:grid;max-height:260px;overflow:auto;padding:6px;border:1px solid #dfe2eb;border-radius:12px;background:#fff;box-shadow:0 14px 34px rgba(26,31,54,.16)}.bd-purchase-supplier-results-v356 button{display:grid;gap:2px;min-height:44px;padding:8px 10px;text-align:left;border:0;border-radius:9px;background:#fff;color:#242941}.bd-purchase-supplier-results-v356 button:active{background:#f1efff}.bd-purchase-supplier-results-v356 button.create{color:#5046d6;background:#f3f1ff;font-weight:850}.bd-purchase-supplier-results-v356 small{color:#7a8092;font-size:10px}.bd-purchase-supplier-results-v356 p{margin:0;padding:10px;color:#73798c;font-size:11px}
@media(max-width:767px){.bd-procurement-sheet-backdrop{align-items:stretch;background:#f8f9fc;backdrop-filter:none}.bd-procurement-sheet{display:flex;width:100%;max-width:none;height:100dvh;max-height:100dvh;padding:8px 0 0;border-radius:0;flex-direction:column;overflow:hidden;box-shadow:none}.bd-procurement-sheet-handle{display:none}.bd-procurement-sheet-head{flex:0 0 auto;margin:0;padding:8px 16px 12px;border-bottom:1px solid #e5e7ef}.bd-procurement-form{min-height:0;flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:12px 14px calc(10px + env(safe-area-inset-bottom));scroll-padding-bottom:86px}.bd-procurement-sheet-actions{bottom:calc(-10px - env(safe-area-inset-bottom));margin:8px -14px calc(-10px - env(safe-area-inset-bottom))!important;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(248,249,252,.98);box-shadow:0 -8px 24px rgba(27,32,54,.09);backdrop-filter:blur(14px)}.bd-procurement-item{padding:10px}.bd-procurement-form-grid{gap:7px}}
`);
}

const suppliersCssV357 = readFileSync(suppliersCssPath, "utf8");
if (!suppliersCssV357.includes("Receiving workspace v357")) {
  appendFileSync(suppliersCssPath, `

/* Receiving workspace v357 */
.bd-receiving-workspace-v357{--receive-ink:#1d2135;--receive-muted:#73798c;--receive-border:#e2e5ed;--receive-accent:#5b55f5;max-width:760px}.bd-receiving-head-v357{align-items:center}.bd-receiving-kicker-v357{display:block;margin-bottom:3px;color:#7770ee;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.bd-receiving-readiness-v357{display:grid;gap:9px;padding:14px;border:1px solid #f0cd8b;border-radius:16px;background:#fff9ed}.bd-receiving-readiness-v357.ready{border-color:#b9e6cb;background:#f1fbf5}.bd-receiving-readiness-top-v357{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.bd-receiving-readiness-top-v357>div{display:grid;gap:2px}.bd-receiving-readiness-top-v357 strong{color:var(--receive-ink);font-size:13px}.bd-receiving-readiness-top-v357 span{color:var(--receive-muted);font-size:10.5px}.bd-receiving-readiness-top-v357>b{color:#9b6a12;font-size:18px}.bd-receiving-readiness-v357.ready .bd-receiving-readiness-top-v357>b{color:#168a50}.bd-receiving-progress-v357{height:6px;overflow:hidden;border-radius:999px;background:#eceef4}.bd-receiving-progress-v357 span{display:block;height:100%;border-radius:inherit;background:#e3a835;transition:width .2s ease}.bd-receiving-readiness-v357.ready .bd-receiving-progress-v357 span{background:#2ea96b}.bd-receiving-counts-v357{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.bd-receiving-counts-v357 span,.bd-receiving-counts-v357 button{min-height:27px;padding:5px 8px;border:0;border-radius:999px;font-size:10px;font-weight:850}.bd-receiving-counts-v357 span.ready{color:#137747;background:#dff5e8}.bd-receiving-counts-v357 span.attention{color:#91620e;background:#fff0cc}.bd-receiving-counts-v357 button{color:#b24940;background:#ffe8e5}.bd-receiving-original-v357{display:flex;align-items:center;justify-content:center;min-height:42px;border:1px solid #dcd9ff;border-radius:13px;background:#f7f6ff;color:#5149d9;font-size:11px;font-weight:850}.bd-receiving-meta-v357{border:1px solid var(--receive-border);border-radius:16px;background:#fff}.bd-receiving-meta-v357>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;cursor:pointer;list-style:none}.bd-receiving-meta-v357>summary::-webkit-details-marker{display:none}.bd-receiving-meta-v357>summary>span{display:grid;gap:3px;min-width:0}.bd-receiving-meta-v357>summary b{color:var(--receive-ink);font-size:12.5px}.bd-receiving-meta-v357>summary small{overflow:hidden;color:var(--receive-muted);font-size:10.5px;text-overflow:ellipsis;white-space:nowrap}.bd-receiving-meta-v357>summary em{flex:0 0 auto;padding:5px 8px;border-radius:999px;background:#eef7f1;color:#168a50;font-size:9.5px;font-style:normal;font-weight:900}.bd-receiving-meta-v357:not([open])>summary:after{content:"+";color:#747a8d;font-size:17px}.bd-receiving-meta-v357[open]>summary:after{content:"−";color:#747a8d;font-size:17px}.bd-receiving-meta-fields-v357{display:grid;gap:9px;padding:0 14px 14px;border-top:1px solid var(--receive-border)}.bd-receiving-meta-fields-v357>.bd-procurement-form-grid:first-child{margin-top:12px}.bd-receiving-accounting-note-v357{margin:2px 0 0;padding:11px 12px;border-radius:12px;background:#f1f3f8;color:#5f6679;font-size:10.5px;line-height:1.45}.bd-receiving-lines-head-v357{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:3px}.bd-receiving-lines-head-v357>div{display:grid;gap:2px}.bd-receiving-lines-head-v357 h3{margin:0;color:var(--receive-ink);font-size:15px}.bd-receiving-lines-head-v357 span{color:var(--receive-muted);font-size:10.5px}.bd-receiving-lines-head-v357>button{min-height:34px;padding:0 10px;border:1px solid #dad7ff;border-radius:10px;background:#f5f3ff;color:#5149d9;font-size:10px;font-weight:850}.bd-receiving-filters-v357{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.bd-receiving-filters-v357::-webkit-scrollbar{display:none}.bd-receiving-filters-v357 button{display:flex;align-items:center;gap:6px;min-height:36px;padding:0 11px;border:1px solid var(--receive-border);border-radius:999px;background:#fff;color:#666d80;font-size:10.5px;font-weight:850;white-space:nowrap}.bd-receiving-filters-v357 button b{display:grid;min-width:19px;height:19px;place-items:center;border-radius:999px;background:#eceef4;color:#626879;font-size:9px}.bd-receiving-filters-v357 button.active{border-color:#c9c5ff;background:#eeecff;color:#5048d8}.bd-receiving-filters-v357 button.active b{background:#5b55f5;color:#fff}.bd-receiving-filters-v357 button:disabled{opacity:.45}.bd-receiving-line-list-v357{display:grid;gap:8px}.bd-receiving-line-v357{overflow:hidden;border:1px solid var(--receive-border);border-radius:15px;background:#fff}.bd-receiving-line-v357.open{border-color:#cbc7ff;box-shadow:0 8px 24px rgba(55,51,125,.08)}.bd-receiving-line-summary-v357{display:grid;width:100%;grid-template-columns:8px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 12px;border:0;background:#fff;text-align:left}.bd-receiving-line-dot-v357{width:8px;height:8px;border-radius:50%;background:#2eaa6c}.bd-receiving-line-v357.review .bd-receiving-line-dot-v357{background:#e5a632}.bd-receiving-line-v357.missing .bd-receiving-line-dot-v357{background:#e16a5d}.bd-receiving-line-copy-v357{display:grid;gap:2px;min-width:0}.bd-receiving-line-copy-v357 small{color:var(--receive-muted);font-size:9.5px;font-weight:800}.bd-receiving-line-copy-v357 strong{overflow:hidden;color:var(--receive-ink);font-size:12.5px;text-overflow:ellipsis;white-space:nowrap}.bd-receiving-line-copy-v357 em{overflow:hidden;color:#6e7588;font-size:10.5px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.bd-receiving-line-result-v357{display:grid;gap:1px;justify-items:end;white-space:nowrap}.bd-receiving-line-result-v357 b{color:var(--receive-ink);font-size:11.5px}.bd-receiving-line-result-v357 small{color:var(--receive-muted);font-size:9px}.bd-receiving-line-result-v357 i{display:grid;width:24px;height:24px;margin-top:2px;place-items:center;border-radius:50%;background:#f0f1f5;color:#656b7d;font-size:14px;font-style:normal}.bd-receiving-line-editor-v357{display:grid;gap:9px;padding:12px;border-top:1px solid #e8e9f0;background:#fafafe}.bd-receiving-line-actions-v357{display:flex;justify-content:space-between;gap:8px}.bd-receiving-line-actions-v357 button{min-height:36px;padding:0 10px;border:1px solid #dedfea;border-radius:10px;background:#fff;color:#565d72;font-size:10px;font-weight:850}.bd-receiving-line-actions-v357 button.danger{color:#bb4f46}.bd-receiving-add-line-v357{min-height:42px}.bd-receiving-totals-v357{display:grid;gap:8px;padding:13px;border:1px solid var(--receive-border);border-radius:15px;background:#fff}.bd-receiving-totals-v357>div{display:flex;align-items:center;justify-content:space-between;gap:12px}.bd-receiving-totals-v357 span{color:#656c7e;font-size:10.5px}.bd-receiving-totals-v357 strong{color:var(--receive-ink);font-size:13px}.bd-receiving-totals-v357 input{width:132px;min-height:38px;padding:0 10px;text-align:right;border:1px solid #d9dce5;border-radius:10px;background:#fff;font-size:14px;font-weight:800}.bd-receiving-totals-v357>button{min-height:36px;border:0;border-radius:10px;background:#fff1d6;color:#8f620f;font-size:10.5px;font-weight:850}.bd-receiving-actions-v357>div{display:grid;gap:3px;min-width:0;flex:1}.bd-receiving-actions-v357>div small{overflow:hidden;color:#6e7485;font-size:9.5px;text-align:right;text-overflow:ellipsis;white-space:nowrap}.bd-receiving-actions-v357>div .bd-procurement-primary{width:100%}
@media(min-width:768px){.bd-receiving-line-summary-v357{grid-template-columns:8px minmax(0,1fr) 170px}.bd-receiving-meta-fields-v357{grid-template-columns:1fr 1fr}.bd-receiving-meta-fields-v357>.bd-procurement-form-grid:first-child,.bd-receiving-meta-fields-v357>.bd-receiving-accounting-note-v357{grid-column:1/-1}}
@media(max-width:767px){.bd-receiving-workspace-v357{padding-top:0}.bd-receiving-head-v357{padding-top:calc(10px + env(safe-area-inset-top));background:#fff}.bd-receiving-workspace-v357 .bd-procurement-form{gap:10px;padding-top:10px}.bd-receiving-workspace-v357 .bd-invoice-review-summary-v4{display:none}.bd-receiving-lines-head-v357{align-items:flex-start}.bd-receiving-lines-head-v357>button{flex:0 0 auto}.bd-receiving-line-summary-v357{padding:10px}.bd-receiving-line-editor-v357{padding:10px}.bd-receiving-actions-v357{align-items:end}.bd-receiving-actions-v357>.bd-procurement-secondary{flex:0 0 auto;width:auto;padding:0 12px}.bd-receiving-actions-v357>div small{max-width:210px;margin-left:auto}.bd-receiving-meta-v357>summary em{display:none}}
`);
}

for (const shellPath of shellPaths) {
  const current = readFileSync(shellPath, "utf8");
  if (current.includes("purchase-review-v356")) continue;
  let next = current.replace(/(index-BQGspy0I\.js\?v=[^\"']+)/, "$1-purchase-review-v356");
  next = next.replace(/(suppliers\.css\?v=[^\"']+)/, "$1-purchase-review-v356");
  next = next.replace(/(catalog\.css\?v=[^\"']+)/, "$1-purchase-review-v356");
  writeFileSync(shellPath, next);
}

for (const shellPath of shellPaths) {
  const current = readFileSync(shellPath, "utf8");
  if (current.includes("purchase-receiving-v357")) continue;
  let next = current.replace(/(index-BQGspy0I\.js\?v=[^\"']+)/, "$1-purchase-receiving-v357");
  next = next.replace(/(suppliers\.css\?v=[^\"']+)/, "$1-purchase-receiving-v357");
  next = next.replace(/(catalog\.css\?v=[^\"']+)/, "$1-purchase-receiving-v357");
  writeFileSync(shellPath, next);
}

const bootstrap = readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes("purchase-review-v356")) {
  writeFileSync(
    bootstrapPath,
    bootstrap.replace(
      /(script\.src = "\/assets\/index-BQGspy0I\.js\?v=[^"]+)/,
      "$1-purchase-review-v356",
    ),
  );
}

const bootstrapV357 = readFileSync(bootstrapPath, "utf8");
if (!bootstrapV357.includes("purchase-receiving-v357")) {
  writeFileSync(bootstrapPath, bootstrapV357.replace(/(script\.src = "\/assets\/index-BQGspy0I\.js\?v=[^"]+)/,"$1-purchase-receiving-v357"));
}

for (const shellPath of shellPaths) {
  const current = readFileSync(shellPath, "utf8");
  if (current.includes("purchase-receiving-stability-v371")) continue;
  writeFileSync(
    shellPath,
    current.replace(/(index-BQGspy0I\.js\?v=[^"']+)/, "$1-purchase-receiving-stability-v371"),
  );
}

const bootstrapV371 = readFileSync(bootstrapPath, "utf8");
if (!bootstrapV371.includes("purchase-receiving-stability-v371")) {
  writeFileSync(
    bootstrapPath,
    bootstrapV371.replace(
      /(script\.src = "\/assets\/index-BQGspy0I\.js\?v=[^"]+)/,
      "$1-purchase-receiving-stability-v371",
    ),
  );
}

console.log("Purchase receiving UX v357 is applied.");
