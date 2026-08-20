import { readFile, writeFile } from "node:fs/promises";

const procurementTargets = [
  new URL("../scripts/fragments/procurement-command-v168.fragment.txt", import.meta.url),
  new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
];
const bundlePath = procurementTargets[1];

const [existingFragment, existingBundle] = await Promise.all([
  readFile(procurementTargets[0], "utf8"),
  readFile(bundlePath, "utf8"),
]);
if (
  existingFragment.includes('const bdUnifiedPurchaseLedgerV186="v186"')
  && existingBundle.includes('const bdUnifiedPurchaseLedgerV186="v186"')
  && existingBundle.includes("purchasePayments:bdPurchasePayments")
  && existingBundle.includes("noe=Object.keys(Lg).filter(e=>!roe.has(e))")
  && !existingBundle.includes("Закупка сохранена, но расход не подтверждён")
) {
  console.log("Unified purchase ledger v186 is already applied.");
  process.exit(0);
}

function replaceRequired(source, previous, next, label) {
  if (!source.includes(previous)) throw new Error(`Missing ${label}`);
  return source.replace(previous, next);
}

function replaceFunction(source, name, nextName, replacement) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  if (start === -1 || end === -1) {
    throw new Error(`Could not locate ${name} before ${nextName}`);
  }
  return source.slice(0, start) + replacement + "\n" + source.slice(end);
}

const stateFunction = String.raw`function bdProcStateV168(e){if(e?.syncStatus==="failed")return"error";if(e?.status==="cancelled")return"cancelled";if(e?.status==="confirmed")return e.syncStatus==="partial"?"review":e.documentType==="price_list"?"verified":"conducted";const t=Array.isArray(e?.warnings)?e.warnings.filter(Boolean).length:0,n=Array.isArray(e?.items)&&e.items.some(r=>r?.confidence!=null&&Number(r.confidence)<.8);return t||n||e?.confidence!=null&&Number(e.confidence)<.8?"review":"draft"}`;

const effectiveStateFunction = String.raw`function bdProcEffectiveStateV168(e,t){const n=String(e?.id||"");return t?.integrity?.paymentMismatchDocumentIds?.includes(n)||t?.integrity?.stockMissingDocumentIds?.includes(n)?"error":bdProcStateV168(e)}`;

const purchasesFunction = String.raw`function bdProcPurchasesV168({documents:e,analytics:t,query:n,onQuery:r,filter:a,onFilter:s,sort:l,onSort:u,onOpen:d}){const[bdProcVisibleDocs,bdSetProcVisibleDocs]=S.useState(80);S.useEffect(()=>bdSetProcVisibleDocs(80),[n,a,l]);const f=bdProcNormV168(n),m=e.filter(v=>{const b=bdProcEffectiveStateV168(v,t),N=a==="all"||a==="review"&&["review","error"].includes(b)||a==="verified"&&["conducted","verified"].includes(b)||a==="draft"&&b==="draft"||a==="unpaid"&&v?.status==="confirmed"&&v?.documentType!=="price_list"&&bdProcNumberV168(v?.balanceDue,bdProcNumberV168(v?.total)-bdProcNumberV168(v?.paidAmount))>.005||a==="cancelled"&&b==="cancelled";if(!N)return!1;const E=[v.supplierName,v.documentNumber,bdProcCategoryV168(v.expenseCategory),...(Array.isArray(v.items)?v.items.map(_=>_.name):[])].join(" ");return!f||bdProcNormV168(E).includes(f)}).sort((v,b)=>l==="old"?String(v.date||"").localeCompare(String(b.date||"")):l==="amount"?bdProcNumberV168(b.total)-bdProcNumberV168(v.total):String(b.date||"").localeCompare(String(v.date||""))||String(b.confirmedAt||"").localeCompare(String(v.confirmedAt||"")));return i.jsxs("div",{className:"bd-proc-purchases-v168",children:[i.jsxs("section",{className:"bd-proc-tools-v168",children:[i.jsxs("label",{className:"bd-proc-search-v168",children:[i.jsx(xi,{size:16}),i.jsx("input",{value:n,onChange:v=>r(v.target.value),placeholder:"Поиск по закупкам…","aria-label":"Поиск закупок"})]}),i.jsx("div",{className:"bd-proc-filter-chips-v168",children:[{id:"all",label:"Все"},{id:"unpaid",label:"К оплате"},{id:"review",label:"Требуют проверки"},{id:"verified",label:"Проведены"},{id:"draft",label:"Черновики"},{id:"cancelled",label:"Отменены"}].map(v=>i.jsx("button",{type:"button",className:a===v.id?"active":"",onClick:()=>s(v.id),children:v.label},v.id))}),i.jsxs("div",{className:"bd-proc-sortbar-v168",children:[i.jsx("span",{children:f?m.length+" найдено":e.length+" "+bdProcPluralV168(e.length,"закупка","закупки","закупок")}),i.jsxs("label",{children:[i.jsx(fX,{size:14}),i.jsxs("select",{value:l,onChange:v=>u(v.target.value),"aria-label":"Сортировка закупок",children:[i.jsx("option",{value:"new",children:"Сначала новые"}),i.jsx("option",{value:"old",children:"Сначала старые"}),i.jsx("option",{value:"amount",children:"По сумме"})]})]})]})]}),m.length?i.jsx("section",{className:"bd-proc-purchase-list-v168",children:[m.slice(0,bdProcVisibleDocs).map(v=>{const b=bdProcEffectiveStateV168(v,t),N=bdProcOriginalV168(v),E=v.documentType==="price_list"?String(v.items?.length||0)+" поз.":bdProcMoneyV168(v.total,v.currency||"RUB"),_=v.documentType==="price_list"?null:v.status==="cancelled"?"Проведение отменено":v.paymentStatus==="paid"?"Оплачено":v.paymentStatus==="partial"?"Оплачено "+bdProcMoneyV168(v.paidAmount,v.currency||"RUB")+" · осталось "+bdProcMoneyV168(v.balanceDue,v.currency||"RUB"):"К оплате "+bdProcMoneyV168(v.balanceDue??v.total,v.currency||"RUB");return i.jsxs("article",{className:"bd-proc-purchase-row-v168 "+(["review","error"].includes(b)?"attention ":"")+(b==="cancelled"?"cancelled":""),children:[i.jsx("button",{type:"button",className:"bd-proc-purchase-main-v168",onClick:()=>d(v),children:i.jsxs(i.Fragment,{children:[i.jsx("span",{className:"bd-proc-purchase-dot-v168 "+(bdProcStatusMetaV168[b]||bdProcStatusMetaV168.draft).tone,"aria-hidden":!0}),i.jsxs("span",{className:"bd-proc-purchase-copy-v168",children:[i.jsx("strong",{children:v.supplierName||"Поставщик"}),i.jsxs("small",{children:[bdProcCategoryV168(v.expenseCategory)," · ",v.items?.length||0," ",bdProcPluralV168(v.items?.length||0,"позиция","позиции","позиций")]}),i.jsx("em",{children:[bdProcDateV168(v.date),bdProcDocTypeV168(v.documentType)+(v.documentNumber?" №"+v.documentNumber:"")].join(" · ")}),_&&i.jsx("em",{className:"bd-proc-payment-line-v186",children:_})]}),i.jsxs("span",{className:"bd-proc-purchase-result-v168",children:[i.jsx("b",{children:E}),i.jsx(bdProcBadgeV168,{state:b})]}),i.jsx(Br,{size:17})]})}),N&&i.jsx("a",{href:N,target:"_blank",rel:"noreferrer",className:"bd-proc-original-v168",children:[i.jsx(aQ,{size:14}),"Оригинал"]})]},v.id)}),m.length>bdProcVisibleDocs&&i.jsx("button",{type:"button",className:"bd-proc-load-more-v168",onClick:()=>bdSetProcVisibleDocs(C=>C+80),children:"Показать ещё "+Math.min(80,m.length-bdProcVisibleDocs)+" закупок"})]}):i.jsx(bdProcEmptyV168,{icon:xi,title:e.length?"Ничего не найдено":"Закупок пока нет",copy:e.length?"Измените поиск или фильтр.":"Сканируйте чек, выберите фото из галереи или импортируйте PDF, Excel и CSV."})]})}`;

const purchasesFunctionV189 = purchasesFunction
  .replace("function bdProcPurchasesV168({documents:e,analytics:t,query:n", "function bdProcPurchasesV168({documents:e,analytics:t,expenses:o=[],query:n")
  .replace("const f=bdProcNormV168(n),m=e.filter(v=>{const b=", "const f=bdProcNormV168(n),m=e.filter(v=>{const P=bdProcPurchasePaymentV188(v,o),b=")
  .replace("bdProcNumberV168(v?.balanceDue,bdProcNumberV168(v?.total)-bdProcNumberV168(v?.paidAmount))>.005", "P.balanceDue>.005")
  .replace("m.slice(0,bdProcVisibleDocs).map(v=>{const b=", "m.slice(0,bdProcVisibleDocs).map(v=>{const P=bdProcPurchasePaymentV188(v,o),b=")
  .replace('v.status==="cancelled"?"Проведение отменено":v.paymentStatus==="paid"?"Оплачено":v.paymentStatus==="partial"?"Оплачено "+bdProcMoneyV168(v.paidAmount,v.currency||"RUB")+" · осталось "+bdProcMoneyV168(v.balanceDue,v.currency||"RUB"):"К оплате "+bdProcMoneyV168(v.balanceDue??v.total,v.currency||"RUB")', 'v.status==="cancelled"?"Проведение отменено":P.paymentStatus==="paid"?"Оплачено":P.paymentStatus==="partial"?"Оплачено "+bdProcMoneyV168(P.paidAmount,v.currency||"RUB")+" · осталось "+bdProcMoneyV168(P.balanceDue,v.currency||"RUB"):"К оплате "+bdProcMoneyV168(P.balanceDue,v.currency||"RUB")');

const paymentAndDetailFunctions = String.raw`function bdProcActivePaymentV186(e,t){return String(e?.sourceDocumentId||e?.purchaseId||"")===String(t||"")&&e?.status!=="voided"&&!e?.reversedAt&&(e?.source==="purchase_payment"||e?.paymentKind==="supplier_payment"||e?.source==="purchase_document")}
function bdProcPaymentStatusLabelV186(e){return e==="paid"?"Оплачено":e==="partial"?"Частично оплачено":e==="not_applicable"?"Не применяется":"Не оплачено"}
function bdProcPaymentMethodV186(e){return{cash:"Наличные",card:"Карта",transfer:"Перевод",unknown:"Не указано"}[e]||"Не указано"}
function bdProcPaymentEditorV186({document:e,onClose:t,onSave:n,saving:r}){const a=Math.max(0,bdProcNumberV168(e?.balanceDue,bdProcNumberV168(e?.total)-bdProcNumberV168(e?.paidAmount))),[s,l]=S.useState(()=>a.toFixed(2)),[u,d]=S.useState(()=>new Date().toISOString().slice(0,10)),[f,m]=S.useState("transfer"),[h,g]=S.useState(""),[y]=S.useState(()=>crypto.randomUUID()),j=bdProcNumberV168(s),v=j>0&&j<=a+.005&&/^\d{4}-\d{2}-\d{2}$/.test(u);return i.jsx(bdProcSheetV168,{label:"Оплата поставщику",title:e?.supplierName||"Закупка",copy:[e?.documentNumber?"Накладная №"+e.documentNumber:bdProcDocTypeV168(e?.documentType),"Остаток "+bdProcMoneyV168(a,e?.currency||"RUB")].join(" · "),onClose:t,className:"detail",footer:i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"secondary",onClick:t,disabled:r,children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:r||!v,onClick:()=>n({amount:j,date:u,paymentMethod:f,note:h,idempotencyKey:y}),children:r?"Сохраняю…":"Создать платёж"})]}),children:i.jsxs("div",{className:"bd-proc-payment-form-v186",children:[i.jsxs("label",{children:[i.jsx("span",{children:"Сумма оплаты"}),i.jsx("input",{type:"number",min:"0.01",max:String(a),step:"0.01",value:s,onChange:b=>l(b.target.value),inputMode:"decimal"}),i.jsx("small",{children:"Не больше остатка "+bdProcMoneyV168(a,e?.currency||"RUB")})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Дата платежа"}),i.jsx("input",{type:"date",value:u,onChange:b=>d(b.target.value)})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Способ оплаты"}),i.jsxs("select",{value:f,onChange:b=>m(b.target.value),children:[i.jsx("option",{value:"transfer",children:"Перевод"}),i.jsx("option",{value:"card",children:"Карта"}),i.jsx("option",{value:"cash",children:"Наличные"}),i.jsx("option",{value:"unknown",children:"Не указано"})]})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Комментарий"}),i.jsx("textarea",{value:h,onChange:b=>g(b.target.value),rows:3,placeholder:"Необязательно"})]}),i.jsx("p",{className:"bd-proc-payment-help-v186",children:"Платёж станет отдельной финансовой операцией и изменит только статус оплаты накладной. Склад повторно не изменится."})]})})}
function bdProcPurchaseDetailV168({document:e,analytics:t,expenses:n,movements:r,onClose:a,onEdit:s,onPay:l,onCancelPosting:u,onRepost:d,onDelete:f,onReversePayment:m,canEdit:h,canPay:g,canLifecycle:y,canFinance:j,busy:v}){const[bdProcVisibleLines,bdSetProcVisibleLines]=S.useState(100);S.useEffect(()=>bdSetProcVisibleLines(100),[e?.id]);const b=Array.isArray(e?.items)?e.items:[],N=bdProcEffectiveStateV168(e,t),E=bdProcOriginalV168(e),_=n.filter(C=>String(C?.sourceDocumentId||C?.purchaseId||"")===String(e?.id||"")),T=_.filter(C=>bdProcActivePaymentV186(C,e?.id)),A=r.filter(C=>String(C?.sourceDocumentId||"")===String(e?.id||"")&&C?.type==="receipt"&&C?.status!=="cancelled"&&!C?.reversedAt),k=b.filter(C=>!bdProcTextV168(C?.purchaseProductKey||C?.productKey)).length,O=b.filter(C=>C?.confidence!=null&&bdProcNumberV168(C.confidence,1)<.8).length,M=e?.status==="confirmed",D=e?.status==="cancelled",z=e?.documentType==="price_list",L=bdProcNumberV168(e?.paidAmount,T.reduce((C,x)=>C+bdProcNumberV168(x?.amount),0)),q=Math.max(0,bdProcNumberV168(e?.balanceDue,bdProcNumberV168(e?.total)-L)),B=e?.paymentStatus||(L<=0?"unpaid":q<=.005?"paid":"partial"),U=!M&&(e?.status==="draft"||D&&T.length===0)||z;return i.jsx(bdProcSheetV168,{label:bdProcDocTypeV168(e?.documentType),title:e?.supplierName||"Закупка",copy:[bdProcDateV168(e?.date),e?.documentNumber?"№ "+e.documentNumber:null].filter(Boolean).join(" · "),onClose:a,className:"detail wide",footer:i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"secondary",onClick:a,disabled:v,children:"Закрыть"}),h&&s&&i.jsx("button",{type:"button",className:"secondary",onClick:s,disabled:v,children:"Редактировать"}),!z&&M&&g&&q>.005&&l&&i.jsx("button",{type:"button",className:"primary",onClick:l,disabled:v,children:"Добавить оплату"}),!z&&M&&y&&u&&i.jsx("button",{type:"button",className:"danger",onClick:u,disabled:v,children:"Отменить проведение"}),D&&y&&d&&i.jsx("button",{type:"button",className:"primary",onClick:d,disabled:v,children:"Провести заново"}),U&&y&&f&&i.jsx("button",{type:"button",className:"danger",onClick:f,disabled:v,children:z?"Удалить прайс":"Удалить документ"})]}),children:i.jsxs("div",{className:"bd-proc-detail-v168",children:[i.jsxs("section",{className:"bd-proc-document-summary-v168",children:[i.jsxs("div",{children:[i.jsx("span",{children:z?"Позиций в предложении":"Итого по закупке"}),i.jsx("strong",{children:z?String(b.length):bdProcMoneyV168(e?.total,e?.currency||"RUB")})]}),i.jsx(bdProcBadgeV168,{state:N})]}),O>0&&i.jsxs("div",{className:"bd-proc-review-callout-v168",children:[i.jsx(Fn,{size:18}),i.jsxs("span",{children:[i.jsx("strong",{children:O+" "+bdProcPluralV168(O,"позиция требует","позиции требуют","позиций требуют")+" ручной проверки"}),i.jsx("small",{children:"Низкая уверенность выделена непосредственно в строках. Документ не подтверждается автоматически."})]})]}),!z&&i.jsxs("section",{className:"bd-proc-payment-summary-v186 "+B,children:[i.jsxs("header",{children:[i.jsxs("div",{children:[i.jsx("span",{children:"Статус оплаты"}),i.jsx("strong",{children:bdProcPaymentStatusLabelV186(B)})]}),i.jsx("em",{children:T.length+" "+bdProcPluralV168(T.length,"платёж","платежа","платежей")})]}),i.jsx("div",{className:"bd-proc-facts-grid-v168 three",children:[i.jsx(bdProcFactV168,{label:"Сумма закупки",value:bdProcMoneyV168(e?.total,e?.currency||"RUB")}),i.jsx(bdProcFactV168,{label:"Оплачено",value:bdProcMoneyV168(L,e?.currency||"RUB"),tone:L>0?"good":"neutral"}),i.jsx(bdProcFactV168,{label:"К оплате",value:bdProcMoneyV168(q,e?.currency||"RUB"),tone:q>.005?"warn":"good"})]}),D&&T.length>0&&i.jsx("p",{className:"bd-proc-reconcile-v186",children:"Проведение отменено, но платежи сохранены. Они требуют финансовой сверки и не удалены из истории."})]}),i.jsx("div",{className:"bd-proc-facts-grid-v168",children:[i.jsx(bdProcFactV168,{label:"Категория",value:bdProcCategoryV168(e?.expenseCategory)}),i.jsx(bdProcFactV168,{label:"Способ по документу",value:bdProcPaymentMethodV186(e?.paymentMethod)}),i.jsx(bdProcFactV168,{label:"Mapping",value:k?k+" без сопоставления":"Все доступные позиции сопоставлены",tone:k?"warn":"good"}),i.jsx(bdProcFactV168,{label:"Уверенность OCR",value:e?.confidence==null?"Не указана":Math.round(bdProcNumberV168(e.confidence)*100)+"%"})]}),i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsxs("header",{children:[i.jsx("h3",{children:"Позиции"}),i.jsx("span",{children:b.length})]}),b.length?i.jsx("div",{className:"bd-proc-line-list-v168",children:[b.slice(0,bdProcVisibleLines).map((C,x)=>{const R=C?.confidence!=null&&bdProcNumberV168(C.confidence,1)<.8,P=bdProcTextV168(C?.purchaseProductKey||C?.productKey);return i.jsxs("article",{className:R?"needs-review":"",children:[i.jsx("span",{className:"index",children:x+1}),i.jsxs("span",{className:"copy",children:[i.jsx("strong",{children:C?.name||"Позиция"}),i.jsxs("small",{children:[bdProcNumberV168(C?.quantity)," × ",C?.packageSize||C?.unit||"ед.",C?.unitPrice?" · "+bdProcMoneyV168(C.unitPrice,e?.currency||"RUB")+" / ед.":""]}),i.jsx("em",{className:P?"mapped":"unmapped",children:P?"Сопоставлено со складским товаром":"Требуется сопоставление"}),R&&i.jsx("em",{className:"confidence",children:"Проверьте распознавание · "+Math.round(bdProcNumberV168(C.confidence)*100)+"%"})]}),i.jsx("b",{children:bdProcMoneyV168(C?.lineTotal||bdProcNumberV168(C?.quantity)*bdProcNumberV168(C?.unitPrice),e?.currency||"RUB")})]},C?.id||x)}),b.length>bdProcVisibleLines&&i.jsx("button",{type:"button",className:"bd-proc-load-more-v168",onClick:()=>bdSetProcVisibleLines(C=>C+100),children:"Показать ещё "+Math.min(100,b.length-bdProcVisibleLines)+" позиций"})]}):i.jsx("p",{className:"bd-proc-insufficient-v168",children:"В документе нет сохранённых позиций."})]}),!z&&i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsx("h3",{children:"Результат проведения"}),i.jsx("div",{className:"bd-proc-facts-grid-v168",children:[i.jsx(bdProcFactV168,{label:"Финансы",value:D?T.length?"Платежи сохранены для сверки":"Связанных платежей нет":B==="paid"?"Закупка оплачена":B==="partial"?"Есть частичная оплата":"Оплата ещё не проводилась",tone:D&&T.length?"warn":B==="paid"?"good":"neutral"}),i.jsx(bdProcFactV168,{label:"Склад",value:D?"Приход отменён с сохранением истории":A.length?A.length+" "+bdProcPluralV168(A.length,"движение","движения","движений")+" прихода":!M?"Будет создан после проведения":e?.inventorySummary?.postedLines===0?"Приход не требуется":"Связанный приход не найден",tone:D||A.length||M&&e?.inventorySummary?.postedLines===0?"good":M?"bad":"neutral"})]})]}),!z&&_.length>0&&i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsxs("header",{children:[i.jsx("h3",{children:"Финансовые операции"}),i.jsx("span",{children:_.length})]}),i.jsx("div",{className:"bd-proc-payment-list-v186",children:_.map(C=>{const x=bdProcActivePaymentV186(C,e?.id),R=C?.status==="voided"||C?.reversedAt;return i.jsxs("article",{className:R?"voided":"",children:[i.jsxs("span",{children:[i.jsx("strong",{children:bdProcMoneyV168(C?.amount,C?.currency||e?.currency||"RUB")}),i.jsx("small",{children:[bdProcDateV168(C?.date),bdProcPaymentMethodV186(C?.paymentMethod),R?"Сторнирован":null].filter(Boolean).join(" · ")})]}),x&&j&&m&&i.jsx("button",{type:"button",onClick:()=>m(C),disabled:v,children:"Отменить"})]},C?.id)})})]}),E&&i.jsx("a",{className:"bd-proc-open-original-v168",href:E,target:"_blank",rel:"noreferrer",children:[i.jsx(aQ,{size:16}),"Открыть оригинал документа",i.jsx(Br,{size:16})]})]})})}`;

const paymentAndDetailFunctionsV189 = paymentAndDetailFunctions
  .replace("function bdProcPaymentStatusLabelV186(e)", 'function bdProcPurchasePaymentV188(e,t=[]){const n=t.filter(r=>bdProcActivePaymentV186(r,e?.id)),a=n.length?n.reduce((r,s)=>r+bdProcNumberV168(s?.amount),0):bdProcNumberV168(e?.paidAmount),s=Math.max(0,bdProcNumberV168(e?.total)-a);return{paidAmount:a,balanceDue:s,paymentStatus:e?.documentType==="price_list"?"not_applicable":a<=0?"unpaid":s<=.005?"paid":"partial"}}\nfunction bdProcPaymentStatusLabelV186(e)')
  .replace('z=e?.documentType==="price_list",L=bdProcNumberV168(e?.paidAmount,T.reduce((C,x)=>C+bdProcNumberV168(x?.amount),0)),q=Math.max(0,bdProcNumberV168(e?.balanceDue,bdProcNumberV168(e?.total)-L)),B=e?.paymentStatus||(L<=0?"unpaid":q<=.005?"paid":"partial"),U=', 'z=e?.documentType==="price_list",P=bdProcPurchasePaymentV188(e,n),L=P.paidAmount,q=P.balanceDue,B=P.paymentStatus,U=')
  .replace('h&&s&&i.jsx("button",{type:"button",className:"secondary",onClick:s,disabled:v,children:"Редактировать"}),!z&&M&&g&&q>.005', 'h&&s&&i.jsx("button",{type:"button",className:"secondary",onClick:s,disabled:v,children:"Редактировать"}),!z&&!M&&!D&&h&&s&&i.jsx("button",{type:"button",className:"primary",onClick:s,disabled:v,children:"Провести"}),!z&&M&&g&&q>.005');

const monthlyReportFunction = String.raw`function bdBuildMonthlyReport(e,t,n,r,a,s,l=[]){const u=bdMonthMeta(t),d=n.filter(q=>q.date.slice(0,7)===t),f=r.filter(q=>q.date.slice(0,7)===t&&q?.status!=="voided"&&!q?.reversedAt),m=[...a].sort((q,B)=>q.date.localeCompare(B.date)),h=m.find(q=>q.date===u.start)||null,g=m.find(q=>q.date===u.nextStart)||m.find(q=>q.date===u.end)||null,y=d.reduce((q,B)=>q+(Number(B.revenue)||0),0),j=d.reduce((q,B)=>q+(Number(B.receipts)||0),0),bdCanonicalPurchases=bdProcArray("bd_purchase_documents").filter(q=>q?.status==="confirmed"&&q?.documentType!=="price_list"&&String(q?.date||"").slice(0,7)===t&&Gm(q?.expenseCategory)==="inventory").map(q=>({...q,amount:Number(q.total)||0,area:bdExpenseArea(q)})),bdLegacyPurchases=f.filter(q=>Gm(q.category)==="inventory"&&!q?.sourceDocumentId&&!q?.purchaseId).map(q=>({...q,amount:Number(q.amount)||0})),v=[...bdCanonicalPurchases,...bdLegacyPurchases],bdPurchaseCashRows=f.filter(q=>Gm(q.category)==="inventory"),b=f.filter(q=>q.category==="writeoff"),N=f.filter(q=>q.category==="taxes"),E=f.filter(q=>q.category==="utilities"),_=f.filter(q=>q.category==="payroll"),T=f.filter(q=>Gm(q.category)!=="inventory"&&!(["writeoff","taxes","utilities","payroll"].includes(q.category))),A=v.reduce((q,B)=>q+(Number(B.amount)||0),0),bdPurchasePayments=bdPurchaseCashRows.reduce((q,B)=>q+(Number(B.amount)||0),0),k=b.reduce((q,B)=>q+(Number(B.amount)||0),0),O=T.reduce((q,B)=>q+(Number(B.amount)||0),0),M=N.reduce((q,B)=>q+(Number(B.amount)||0),0),D=E.reduce((q,B)=>q+(Number(B.amount)||0),0),z=d.reduce((q,B)=>q+(Number(B.payrollBreakdown?.total??B.payrollBreakdown?.totalPayroll)||0),0),L=_.reduce((q,B)=>q+(Number(B.amount)||0),0),q=z>0?z:L,B=bdRecurringAmount(s.taxModel,M,y),U=bdRecurringAmount(s.utilityModel,D,y),H=h?bdSnapshotTotal(h):null,I=g?bdSnapshotTotal(g):null,V=H!==null&&I!==null?H+A-I-k:null,F=V!==null?y-V-k-q-O-B-U:null,Z=bdPlannedShiftDates(e,u),R=new Set(d.map(q=>q.date.slice(0,10))),K=new Set(l.filter(q=>q.resolved).map(q=>q.date.slice(0,10))),re=bdDateKey(new Date),pe=Z.filter(oe=>oe<re),Y=pe.filter(oe=>R.has(oe)||K.has(oe)).length,ne=pe.length?Math.round(Y/pe.length*100):100,ae=u.end<re,ce=ae&&h!==null&&g!==null&&ne===100,ge=[...new Set([...(s.inventorySections||[]),...Object.keys(h?.sections||{}),...Object.keys(g?.sections||{}),...v.map(q=>bdExpenseArea(q)),...b.map(q=>bdExpenseArea(q))])],ye=ge.map(q=>{const oe=bdSectionAmount(h,q),Q=v.filter(C=>bdExpenseArea(C)===q).reduce((C,de)=>C+(Number(de.amount)||0),0),Qe=bdSectionAmount(g,q),Me=b.filter(C=>bdExpenseArea(C)===q).reduce((C,de)=>C+(Number(de.amount)||0),0);return{section:q,opening:oe,purchases:Q,closing:Qe,writeoffs:Me,cost:h&&g?oe+Q-Qe-Me:null}}),bdInventoryMismatch=V!==null&&(V<0||ye.some(q=>q.cost!==null&&q.cost<0)),je=Z.length?(B+U)/Z.length:0,ze=Z.length?B/Z.length:0,Q=Z.length?U/Z.length:0,Qe=[...new Set(d.map(C=>C.date.slice(0,10)))],Me=ze*Qe.length,De=Q*Qe.length,$=Me+De,et=y>0?Qe.map(C=>{const de=d.filter(x=>x.date.slice(0,10)===C),tt=de.reduce((x,w)=>x+(Number(w.revenue)||0),0),At=tt/y,st=!bdInventoryMismatch&&V!==null?V*At:null,vt=b.filter(x=>x.date.slice(0,10)===C).reduce((x,w)=>x+(Number(w.amount)||0),0);let Ct=de.reduce((x,w)=>x+(Number(w.payrollBreakdown?.total??w.payrollBreakdown?.totalPayroll)||0),0);if(z===0)Ct=L*At;const Nt=T.filter(x=>x.date.slice(0,10)===C).reduce((x,w)=>x+(Number(w.amount)||0),0),Dt=tt-vt-Ct-je;return{date:C,revenue:tt,estimatedCost:st,writeoffs:vt,payroll:Ct,otherExpenses:Nt,taxAllocation:ze,utilityAllocation:Q,recurringAllocation:je,resultBeforeCost:Dt,estimatedResult:st===null?null:Dt-st}}).sort((C,de)=>de.date.localeCompare(C.date)):[],tt=y-k-q-O-(ae?B+U:$);return{meta:u,status:ce&&!bdInventoryMismatch?"closed":"preliminary",isClosed:ce&&!bdInventoryMismatch,periodPast:ae,revenue:y,receipts:j,purchases:A,purchasePayments:bdPurchasePayments,periodExpenses:bdPurchasePayments+O,expenseBreakdown:bdPeriodExpenseBreakdown(bdPurchaseCashRows,T),writeoffs:k,otherExpenses:O,payroll:q,payrollSource:z>0?"По составу смен":"По внесённым расходам",taxes:B,utilities:U,taxMode:bdRecurringModeLabel(s.taxModel?.mode),utilityMode:bdRecurringModeLabel(s.utilityModel?.mode),openingSnapshot:h,closingSnapshot:g,openingInventory:H,closingInventory:I,costOfGoods:bdInventoryMismatch?null:V,inventoryMismatch:bdInventoryMismatch,rawCostOfGoods:V,operatingResult:bdInventoryMismatch?null:F,resultBeforeCost:tt,cashResult:tt-bdPurchasePayments,plannedShifts:Z.length,expectedShifts:pe.length,accountedShifts:Y,coveragePercent:ne,recurringPerShift:je,taxPerShift:ze,utilityPerShift:Q,dataShiftCount:Qe.length,allocatedTaxes:Me,allocatedUtilities:De,allocatedRecurring:$,unallocatedRecurring:Math.max(0,B+U-$),sections:ye,shiftEstimates:et}}`;

function patchProcurement(source) {
  if (source.includes('const bdUnifiedPurchaseLedgerV186="v186"')) return source;
  source = replaceRequired(
    source,
    '/* bd-procurement-command-v168:start */\nconst bdProcurementCommandVersionV168="v168"',
    '/* bd-procurement-command-v168:start */\nconst bdUnifiedPurchaseLedgerV186="v186";\nconst bdProcurementCommandVersionV168="v168"',
    "unified purchase marker",
  );
  source = replaceRequired(
    source,
    '  draft:{label:"Черновик",tone:"neutral"},\n  error:{label:"Ошибка",tone:"red"}',
    '  draft:{label:"Черновик",tone:"neutral"},\n  cancelled:{label:"Отменено",tone:"neutral"},\n  error:{label:"Ошибка",tone:"red"}',
    "cancelled status metadata",
  );
  source = replaceFunction(source, "bdProcStateV168", "bdProcEffectiveStateV168", stateFunction);
  source = replaceFunction(source, "bdProcEffectiveStateV168", "bdProcOriginalV168", effectiveStateFunction);
  source = replaceRequired(
    source,
    'integrity:{financeMissingDocumentIds:[],stockMissingDocumentIds:[]}',
    'integrity:{financeMissingDocumentIds:[],paymentMismatchDocumentIds:[],stockMissingDocumentIds:[]}',
    "fallback payment integrity",
  );
  source = replaceFunction(source, "bdProcPurchasesV168", "bdProcSuppliersV168", purchasesFunctionV189);
  source = replaceFunction(source, "bdProcPurchaseDetailV168", "bdProcSupplierDetailV168", paymentAndDetailFunctionsV189);
  source = replaceRequired(
    source,
    "bdProcPurchasesV168,{documents:le,analytics:fe,query:E",
    "bdProcPurchasesV168,{documents:le,analytics:fe,expenses:m,query:E",
    "purchase list linked payments",
  );
  source = replaceRequired(
    source,
    '[m]=bdUseProcStoreV168("bd_finance_expenses"),[h]=bdUseProcStoreV168("bd_stock_movements")',
    '[m,bdSetProcExpenses]=bdUseProcStoreV168("bd_finance_expenses"),[h,bdSetProcMovements]=bdUseProcStoreV168("bd_stock_movements")',
    "procurement linked store setters",
  );
  source = replaceRequired(
    source,
    '[C,x]=S.useState(()=>g.get("filter")||"all")',
    '[C,x]=S.useState(()=>g.get("filter")||(g.get("payment")==="1"?"unpaid":"all"))',
    "payment-mode initial filter",
  );
  source = replaceRequired(
    source,
    '[bdProcSaving,bdSetProcSaving]=S.useState(!1),[J,G]=S.useState("")',
    '[bdProcSaving,bdSetProcSaving]=S.useState(!1),[bdProcPaymentDocument,bdSetProcPaymentDocument]=S.useState(null),[bdProcLifecycleBusy,bdSetProcLifecycleBusy]=S.useState(!1),[J,G]=S.useState("")',
    "payment and lifecycle state",
  );
  source = replaceRequired(
    source,
    'ue=bdProcHasPermissionV168("inventory.manage"),de=bdProcHasPermissionV168("finance.manage");',
    'ue=bdProcHasPermissionV168("inventory.manage"),de=bdProcHasPermissionV168("finance.manage"),bdCanPay=bdProcHasPermissionV168("expenses.create");',
    "payment permission",
  );
  source = replaceRequired(
    source,
    'if(w?.status==="confirmed"){e(g.get("returnTo")==="finance"?"/finance":"/suppliers");return}',
    'if(w?.status==="confirmed"||w?.status==="cancelled"){e(g.get("returnTo")==="finance"?"/finance":"/suppliers");return}',
    "cancel editing posted document",
  );

  const saveStart = source.indexOf("async function _e(){", source.indexOf("function bdProcurementCommandPageV168(){"));
  const supplierSave = source.indexOf("async function Ce(w){", saveStart);
  if (saveStart === -1 || supplierSave === -1) throw new Error("Could not locate procurement save handlers");
  const lifecycleHandlers = String.raw`async function _e(){if(!A)return;bdSetProcSaving(!0);try{const w=A.status==="confirmed"||A.status==="cancelled",R=await fetch(w?"/api/purchases/update":"/api/purchases/confirm",{method:"POST",headers:{"Content-Type":"application/json","x-venue-id":String(s.activeVenueId||"")},body:JSON.stringify({document:A,idempotencyKey:A.idempotencyKey||A.id})}),P=await R.json();if(!R.ok||!P.ok)throw new Error(P.error||"Не удалось сохранить закупку");bdProcApplyServerResultV186(P),k(null),w&&e(g.get("returnTo")==="finance"?"/finance":"/suppliers"),a({variant:"success",title:w?A.status==="cancelled"?"Отменённый документ обновлён":"Закупка обновлена":A.documentType==="price_list"?"Прайс сохранён":"Закупка проведена",description:A.documentType==="price_list"?"Предложение доступно для безопасного сравнения, но не считается фактом закупки.":A.status==="cancelled"?"Изменения сохранены без влияния на склад. Проведите документ заново, когда он готов.":bdProcNumberV168(P.inventorySummary?.postedLines)>0?bdProcNumberV168(P.inventorySummary.postedLines)+" позиций поставлено на приход. Оплату добавьте отдельной операцией.":"Документ проведён. Оплата поставщику ведётся отдельными связанными операциями."})}catch(w){a({variant:"error",title:"Не удалось сохранить",description:w instanceof Error?w.message:"Проверьте данные и повторите."})}finally{bdSetProcSaving(!1)}}
function bdProcApplyServerResultV186(P){Array.isArray(P.suppliers)&&(Kse(bdProcurementSupplierStoreV168,P.suppliers),f(P.suppliers)),Array.isArray(P.documents)&&(Kse(bdProcurementStoreV168,P.documents),u(P.documents)),Array.isArray(P.expenses)&&(Kse("bd_finance_expenses",P.expenses),bdSetProcExpenses(P.expenses)),P.assortment&&Kse("bd_assortment_v1",P.assortment),Array.isArray(P.stockMovements)&&(Kse("bd_stock_movements",P.stockMovements),bdSetProcMovements(P.stockMovements)),P.document&&M(P.document)}
async function bdProcCancelPostingV186(w){const R=m.filter(P=>bdProcActivePaymentV186(P,w.id)).length,P=R?"\n\nСвязанные платежи ("+R+") останутся в финансах и будут отмечены для сверки.":"";if(!window.confirm("Отменить проведение накладной «"+(w.supplierName||"Поставщик")+"»?\n\nСкладской приход будет сторнирован, история сохранится."+P))return;bdSetProcLifecycleBusy(!0);try{const c=await fetch("/api/purchases/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id,reason:"Проведение отменено пользователем"})}),p=await c.json();if(!c.ok||!p.ok)throw new Error(p.error||"Не удалось отменить проведение");bdProcApplyServerResultV186(p),a({variant:"success",title:"Проведение отменено",description:R?"Склад сторнирован. Платежи сохранены для финансовой сверки.":"Складское влияние отменено, история документа сохранена."})}catch(c){a({variant:"error",title:"Проведение не отменено",description:c instanceof Error?c.message:"Повторите попытку."})}finally{bdSetProcLifecycleBusy(!1)}}
async function bdProcRepostV186(w){bdSetProcLifecycleBusy(!0);try{const R=await fetch("/api/purchases/repost",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id})}),P=await R.json();if(!R.ok||!P.ok)throw new Error(P.error||"Не удалось провести документ заново");bdProcApplyServerResultV186(P),a({variant:"success",title:"Закупка проведена заново",description:"Склад и статус оплаты пересчитаны по единому документу."})}catch(R){a({variant:"error",title:"Документ не проведён",description:R instanceof Error?R.message:"Повторите попытку."})}finally{bdSetProcLifecycleBusy(!1)}}
async function bdProcDeleteV186(w){const R=w.documentType==="price_list"?"прайс":"документ";if(!window.confirm("Удалить "+R+" «"+(w.supplierName||"Поставщик")+"»?\n\nУдаление возможно только без активных складских движений и платежей."))return;bdSetProcLifecycleBusy(!0);try{const P=await fetch("/api/purchases/delete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id})}),c=await P.json();if(!P.ok||!c.ok)throw new Error(c.error||"Не удалось удалить документ");bdProcApplyServerResultV186(c),M(null),e(bdProcQueryUrlV168({documentId:null,edit:null})),a({variant:"success",title:"Документ удалён",description:"Удаление выполнено безопасно; финансовые операции не затронуты."})}catch(P){a({variant:"error",title:"Документ не удалён",description:P instanceof Error?P.message:"Повторите попытку."})}finally{bdSetProcLifecycleBusy(!1)}}
async function bdProcSavePaymentV186(w){if(!bdProcPaymentDocument)return;bdSetProcLifecycleBusy(!0);try{const R=await fetch("/api/purchases/payment",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":w.idempotencyKey},body:JSON.stringify({...w,purchaseId:bdProcPaymentDocument.id})}),P=await R.json();if(!R.ok||!P.ok)throw new Error(P.error||"Не удалось сохранить платёж");bdProcApplyServerResultV186(P),bdSetProcPaymentDocument(null),a({variant:"success",title:"Оплата сохранена",description:"Финансовая операция связана с накладной. Остаток к оплате пересчитан."}),g.get("returnTo")==="finance"&&(M(null),e("/finance?view=expenses"))}catch(R){a({variant:"error",title:"Оплата не сохранена",description:R instanceof Error?R.message:"Повторите попытку."})}finally{bdSetProcLifecycleBusy(!1)}}
async function bdProcReversePaymentV186(w){if(!window.confirm("Отменить платёж "+bdProcMoneyV168(w.amount,w.currency||"RUB")+"?\n\nОперация останется в истории со статусом сторно."))return;bdSetProcLifecycleBusy(!0);try{const R=await fetch("/api/purchases/payment/reverse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentId:w.id,reason:"Платёж сторнирован пользователем"})}),P=await R.json();if(!R.ok||!P.ok)throw new Error(P.error||"Не удалось отменить платёж");bdProcApplyServerResultV186(P),a({variant:"success",title:"Платёж сторнирован",description:"История сохранена, статус оплаты накладной пересчитан."})}catch(R){a({variant:"error",title:"Платёж не отменён",description:R instanceof Error?R.message:"Повторите попытку."})}finally{bdSetProcLifecycleBusy(!1)}}
`;
  source = source.slice(0, saveStart) + lifecycleHandlers + source.slice(supplierSave);

  source = replaceRequired(
    source,
    'children:[$==="error"&&i.jsxs("div",{className:"bd-proc-offline-v168"',
    'children:[g.get("payment")==="1"&&i.jsxs("div",{className:"bd-proc-payment-entry-v186",children:[i.jsxs("span",{children:[i.jsx("strong",{children:"Оплата поставщику"}),i.jsx("small",{children:"Выберите проведённую накладную с остатком к оплате. Если документа ещё нет — сначала создайте закупку с позициями."})]}),ue&&i.jsx("button",{type:"button",onClick:()=>Y(!0),children:"Создать закупку"})]}),$==="error"&&i.jsxs("div",{className:"bd-proc-offline-v168"',
    "finance payment entry callout",
  );

  const detailStart = source.indexOf("O&&i.jsx(bdProcPurchaseDetailV168,{", source.indexOf("function bdProcurementCommandPageV168(){"));
  const detailEnd = source.indexOf(",D&&i.jsx(bdProcSupplierDetailV168", detailStart);
  if (detailStart === -1 || detailEnd === -1) throw new Error("Could not locate purchase detail invocation");
  const detailInvocation = String.raw`O&&i.jsx(bdProcPurchaseDetailV168,{document:O,analytics:fe,expenses:m,movements:h,onClose:xe,onEdit:ue&&(O.documentType==="price_list"||O.status==="draft"||de)?()=>{const w=O;M(null),k({...w}),e(bdProcQueryUrlV168({edit:"1"}))}:null,onPay:bdCanPay?()=>bdSetProcPaymentDocument({...O,...bdProcPurchasePaymentV188(O,m)}):null,onCancelPosting:ue?()=>bdProcCancelPostingV186(O):null,onRepost:ue?()=>bdProcRepostV186(O):null,onDelete:ue?()=>bdProcDeleteV186(O):null,onReversePayment:de?bdProcReversePaymentV186:null,canEdit:ue&&(O.documentType==="price_list"||O.status==="draft"||de),canPay:bdCanPay,canLifecycle:ue,canFinance:de,busy:bdProcLifecycleBusy})`;
  source = source.slice(0, detailStart) + detailInvocation + source.slice(detailEnd);
  source = replaceRequired(
    source,
    ',A&&i.jsx(bdPurchaseReview,{draft:A',
    ',bdProcPaymentDocument&&i.jsx(bdProcPaymentEditorV186,{document:bdProcPaymentDocument,onClose:()=>bdSetProcPaymentDocument(null),onSave:bdProcSavePaymentV186,saving:bdProcLifecycleBusy}),A&&i.jsx(bdPurchaseReview,{draft:A',
    "payment editor mount",
  );
  return source;
}

for (const target of procurementTargets) {
  const source = await readFile(target, "utf8");
  const next = patchProcurement(source);
  await writeFile(target, next);
}

let bundle = await readFile(bundlePath, "utf8");
bundle = replaceRequired(
  bundle,
  '},noe=Object.keys(Lg),roe=new Set(["alcohol","food","products","consumables","hookah"]);',
  '},roe=new Set(["alcohol","food","products","consumables","hookah","household"]),noe=Object.keys(Lg).filter(e=>!roe.has(e));',
  "finance categories without amount-only purchases",
);
bundle = replaceFunction(bundle, "bdBuildMonthlyReport", "bdNextInventoryDate", monthlyReportFunction);
bundle = bundle
  .replaceAll("После закупок", "Денежный итог")
  .replaceAll("Результат после закупок", "Денежный результат после оплат")
  .replaceAll("закупки и начисленные расходы", "фактические оплаты и расходы")
  .replaceAll("Выручка − закупки − начисленный ФОТ", "Выручка − оплаты закупок − начисленный ФОТ")
  .replaceAll("Управленческий ориентир после закупок и начисленных расходов.", "Денежный ориентир после фактических оплат закупок и начисленных расходов.")
  .replace(
    "{revenue:e.revenue,receipts:e.receipts,purchases:e.purchases,periodExpenses:e.periodExpenses",
    "{revenue:e.revenue,receipts:e.receipts,purchases:e.purchases,purchasePayments:e.purchasePayments,periodExpenses:e.periodExpenses",
  );

bundle = bundle
  .replaceAll('A.documentType!=="price_list"&&!P.expense&&(()=>{throw new Error("Закупка сохранена, но расход не подтверждён. Повторите сохранение — дубли не создадутся.")})(),', "")
  .replaceAll('f.documentType!=="price_list"&&!c.expense&&(()=>{throw new Error("Закупка сохранена, но расход не подтверждён. Повторите сохранение — дубли не создадутся.")})(),', "")
  .replaceAll('"Закупка и расход учтены"', '"Закупка проведена"')
  .replaceAll('"Документ и связанный расход синхронизированы. Склад обновляется только для товарных закупок."', '"Документ обновлён. Склад пересчитан только для товарных позиций; оплаты остаются отдельными операциями."')
  .replaceAll('`${bdProcMoney(Number(c.expense?.amount)||Number(f.total)||0,f.currency)} добавлено в расходы. ${Number(c.inventorySummary.postedLines)} позиций поставлено на приход.`', '`${Number(c.inventorySummary.postedLines)} позиций поставлено на приход. Оплату добавьте отдельной операцией.`')
  .replaceAll('`${bdProcMoney(Number(c.expense?.amount)||Number(f.total)||0,f.currency)} добавлено в расходы. Документ учтён без складского прихода.`', '"Документ проведён без складского прихода. Оплату добавьте отдельной операцией."');

if (!bundle.includes('const bdUnifiedPurchaseLedgerV186="v186"')) {
  throw new Error("Unified purchase marker was not applied to the bundle");
}
if (bundle.includes("Закупка сохранена, но расход не подтверждён")) {
  throw new Error("Legacy automatic-expense assertion remains in the bundle");
}
if (!bundle.includes('purchasePayments:bdPurchasePayments')) {
  throw new Error("Monthly reporting is not using canonical purchase payments");
}
await writeFile(bundlePath, bundle);

console.log("Unified purchase ledger v186 applied.");
