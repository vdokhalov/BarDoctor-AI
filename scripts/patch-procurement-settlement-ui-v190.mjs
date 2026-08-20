import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const procurementTargets = [
  "public/assets/index-BQGspy0I.js",
  "scripts/fragments/procurement-command-v168.fragment.txt",
].map((file) => resolve(root, file));
const bundlePath = procurementTargets[0];
const moreFragmentPath = resolve(root, "scripts/fragments/more-hub-v166.fragment.txt");

function required(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  return source.replace(before, after);
}

function replaceBlock(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Missing ${label}`);
  return source.slice(0, start) + replacement + "\n" + source.slice(end);
}

function transformBlock(source, startMarker, endMarker, transform, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Missing ${label}`);
  const current = source.slice(start, end);
  const next = transform(current);
  if (next === current) throw new Error(`No changes made for ${label}`);
  return source.slice(0, start) + next + source.slice(end);
}

const settlementHelpers = String.raw`const bdProcurementSettlementUiV190="v190";
function bdProcMoneySourceLabelV190(e){return{cash:"Наличные · касса",card:"Корпоративная карта",transfer:"Банковский счёт · перевод",unknown:"Источник не указан"}[e]||"Источник не указан"}
function bdProcMoneySourceV190(e){return e?.moneySourceName||e?.cashboxName||bdProcMoneySourceLabelV190(e?.paymentMethod)}
function bdProcDebtSummaryV190(e=[],t=[]){const n=new Map;for(const r of e){if(r?.status!=="confirmed"||r?.documentType==="price_list")continue;const a=bdProcPurchasePaymentV188(r,t),s=String(r?.supplierId||bdProcNormV168(r?.supplierName)||"supplier"),l=n.get(s)||{supplierKey:s,supplierId:r?.supplierId||null,supplierName:r?.supplierName||"Поставщик",currency:r?.currency||"RUB",purchaseAmount:0,paidAmount:0,balanceDue:0,openDocumentCount:0,documents:[]},u=Math.max(0,bdProcNumberV168(r?.total)),d=Math.min(u,a.paidAmount);l.purchaseAmount+=u,l.paidAmount+=d,l.balanceDue+=a.balanceDue,a.balanceDue>.005&&(l.openDocumentCount+=1,l.documents.push({id:r.id,documentNumber:r.documentNumber||null,date:r.date||"",currency:r.currency||"RUB",total:u,paidAmount:d,balanceDue:a.balanceDue,paymentStatus:a.paymentStatus})),n.set(s,l)}const r=[...n.values()].map(a=>({...a,purchaseAmount:Math.round(a.purchaseAmount*100)/100,paidAmount:Math.round(a.paidAmount*100)/100,balanceDue:Math.round(a.balanceDue*100)/100,documents:a.documents.sort((s,l)=>String(l.date).localeCompare(String(s.date)))})).sort((a,s)=>s.balanceDue-a.balanceDue||String(a.supplierName).localeCompare(String(s.supplierName),"ru"));return{totalOutstanding:Math.round(r.reduce((a,s)=>a+s.balanceDue,0)*100)/100,openDocumentCount:r.reduce((a,s)=>a+s.openDocumentCount,0),suppliers:r}}
function bdProcSupplierDebtV190(e,t,n){const r=bdProcDebtSummaryV190(t,n),a=String(e?.id||""),s=bdProcNormV168(e?.name);return r.suppliers.find(l=>a&&String(l.supplierId||"")===a||bdProcNormV168(l.supplierName)===s)||{supplierKey:a||s,supplierId:e?.id||null,supplierName:e?.name||"Поставщик",currency:e?.currency||"RUB",purchaseAmount:0,paidAmount:0,balanceDue:0,openDocumentCount:0,documents:[]}}`;

const paymentEditor = String.raw`function bdProcPaymentEditorV186({document:e,onClose:t,onSave:n,saving:r}){const a=Math.max(0,bdProcNumberV168(e?.balanceDue,bdProcNumberV168(e?.total)-bdProcNumberV168(e?.paidAmount))),[s,l]=S.useState(()=>a.toFixed(2)),[u,d]=S.useState(()=>new Date().toISOString().slice(0,10)),[f,m]=S.useState("transfer"),[h,g]=S.useState(""),[y]=S.useState(()=>crypto.randomUUID()),j=bdProcNumberV168(s),v=j>0&&j<=a+.005&&/^\d{4}-\d{2}-\d{2}$/.test(u),b=bdProcMoneySourceLabelV190(f);return i.jsx(bdProcSheetV168,{label:"Оплата поставщику",title:e?.supplierName||"Закупка",copy:e?.documentNumber?"Накладная №"+e.documentNumber:bdProcDocTypeV168(e?.documentType),onClose:t,className:"detail",footer:i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"secondary",onClick:t,disabled:r,children:"Отмена"}),i.jsx("button",{type:"button",className:"primary",disabled:r||!v,onClick:()=>n({amount:j,date:u,paymentMethod:f,moneySourceName:b,note:h,idempotencyKey:y}),children:r?"Сохраняю…":"Подтвердить оплату"})]}),children:i.jsxs("div",{className:"bd-proc-payment-form-v186",children:[i.jsxs("section",{className:"bd-proc-payment-due-v190",children:[i.jsx("span",{children:"Осталось к оплате"}),i.jsx("strong",{children:bdProcMoneyV168(a,e?.currency||"RUB")}),i.jsx("small",{children:"По накладной · оплата не изменит склад повторно"})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Сумма оплаты"}),i.jsx("input",{type:"number",min:"0.01",max:String(a),step:"0.01",value:s,onChange:N=>l(N.target.value),inputMode:"decimal","aria-label":"Сумма оплаты"}),i.jsx("small",{children:j<a-.005?"Будет частичная оплата · останется "+bdProcMoneyV168(a-j,e?.currency||"RUB"):"Будет оплачен весь текущий остаток"})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Источник денег"}),i.jsxs("select",{value:f,onChange:N=>m(N.target.value),"aria-label":"Источник денег",children:[i.jsx("option",{value:"transfer",children:"Банковский счёт · перевод"}),i.jsx("option",{value:"card",children:"Корпоративная карта"}),i.jsx("option",{value:"cash",children:"Наличные · касса"})]})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Дата платежа"}),i.jsx("input",{type:"date",value:u,onChange:N=>d(N.target.value)})]}),i.jsxs("label",{children:[i.jsx("span",{children:"Комментарий"}),i.jsx("textarea",{value:h,onChange:N=>g(N.target.value),rows:3,placeholder:"Необязательно"})]}),i.jsx("p",{className:"bd-proc-payment-help-v186",children:"BarDoctor создаст одну связанную финансовую операцию, пересчитает оплачено и остаток. Новая закупка не создаётся."})]})})}`;

const supplierDetail = String.raw`function bdProcSupplierDetailV168({supplier:e,metric:t,documents:n,expenses:o=[],analytics:r,onClose:a,onEdit:s,onOpenDocument:l,canEdit:u}){const[d,f]=S.useState(!1);S.useEffect(()=>f(!1),[e?.id]);const m=n.filter(P=>String(P?.supplierId||"")===String(e?.id||"")||bdProcNormV168(P?.supplierName)===bdProcNormV168(e?.name)).sort((P,C)=>String(C?.date||"").localeCompare(String(P?.date||""))),h=bdProcSupplierDebtV190(e,n,o),g=(r.aiContext?.confirmedPurchases||[]).filter(P=>String(P.supplierId||"")===String(e?.id||"")||bdProcNormV168(P.supplierName)===bdProcNormV168(e?.name)).slice(0,8),y=(r.priceChanges||[]).filter(P=>String(P.supplierId||"")===String(e?.id||"")||bdProcNormV168(P.supplierName)===bdProcNormV168(e?.name)).slice(0,6),j=t?.conditions||{},v=[e?.contactPerson,e?.phone,e?.email,e?.address].filter(Boolean),b=[j.payment,j.minimumOrder,j.delivery,j.leadTime,j.availability,j.discounts].filter(Boolean),N=h.documents.map(P=>({debt:P,document:m.find(C=>String(C?.id)===String(P.id))})).filter(P=>P.document);return i.jsx(bdProcSheetV168,{label:e?.type==="retail"?"Розничный магазин":"Поставщик",title:e?.name||"Поставщик",copy:(e?.categories||[]).map(bdProcCategoryV168).join(" · ")||"Категории не указаны",onClose:a,className:"detail wide",footer:i.jsxs(i.Fragment,{children:[i.jsx("button",{type:"button",className:"secondary",onClick:a,children:"Закрыть"}),u&&i.jsx("button",{type:"button",className:"primary",onClick:s,children:"Редактировать"})]}),children:i.jsxs("div",{className:"bd-proc-detail-v168",children:[i.jsx("div",{className:"bd-proc-facts-grid-v168 three",children:[i.jsx(bdProcFactV168,{label:"Закупки за период",value:bdProcMoneyV168(t?.periodTotal,e?.currency||"RUB")}),i.jsx(bdProcFactV168,{label:"Оплачено по актуальным накладным",value:bdProcMoneyV168(h.paidAmount,h.currency||e?.currency||"RUB"),tone:h.paidAmount>0?"good":"neutral"}),i.jsx(bdProcFactV168,{label:"К оплате поставщику",value:bdProcMoneyV168(h.balanceDue,h.currency||e?.currency||"RUB"),tone:h.balanceDue>.005?"warn":"good"})]}),i.jsxs("section",{className:"bd-proc-supplier-debt-v190",children:[i.jsxs("button",{type:"button",className:"bd-proc-supplier-debt-toggle-v190",onClick:()=>f(P=>!P),"aria-expanded":d,disabled:!h.openDocumentCount,children:[i.jsxs("span",{children:[i.jsx("strong",{children:h.openDocumentCount?h.openDocumentCount+" "+bdProcPluralV168(h.openDocumentCount,"накладная к оплате","накладные к оплате","накладных к оплате"):"Открытых обязательств нет"}),i.jsx("small",{children:h.openDocumentCount?"Нажмите, чтобы увидеть накладные, формирующие долг":"Все проведённые накладные оплачены"})]}),i.jsx("b",{children:bdProcMoneyV168(h.balanceDue,h.currency||"RUB")}),h.openDocumentCount&&i.jsx(Br,{size:16})]}),d&&N.length>0&&i.jsxs("div",{className:"bd-proc-debt-list-v190",children:[i.jsx("div",{className:"head",children:["Накладная","Дата","Сумма","Осталось"].map(P=>i.jsx("span",{children:P},P))}),N.map(({debt:P,document:C})=>i.jsxs("button",{type:"button",onClick:()=>l(C),children:[i.jsx("strong",{children:P.documentNumber?"№"+P.documentNumber:bdProcDocTypeV168(C.documentType)}),i.jsx("span",{children:bdProcDateV168(P.date,!1)}),i.jsx("span",{children:bdProcMoneyV168(P.total,P.currency)}),i.jsx("b",{children:bdProcMoneyV168(P.balanceDue,P.currency)})]},P.id)),i.jsxs("footer",{children:[i.jsx("span",{children:"Итого к оплате"}),i.jsx("strong",{children:bdProcMoneyV168(h.balanceDue,h.currency||"RUB")})]})]})]}),i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsx("h3",{children:"Контакты"}),v.length?i.jsx("div",{className:"bd-proc-contact-list-v168",children:[e?.contactPerson&&i.jsx("span",{children:e.contactPerson}),e?.phone&&i.jsx("a",{href:"tel:"+e.phone,children:e.phone}),e?.email&&i.jsx("a",{href:"mailto:"+e.email,children:e.email}),e?.address&&i.jsx("span",{children:e.address})]}):i.jsx("p",{className:"bd-proc-insufficient-v168",children:"Контакты пока не заполнены."})]}),i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsx("h3",{children:"Условия"}),b.length?i.jsx("div",{className:"bd-proc-condition-grid-v168",children:[j.payment&&i.jsx(bdProcFactV168,{label:"Условия оплаты",value:j.payment}),j.minimumOrder&&i.jsx(bdProcFactV168,{label:"Минимальный заказ",value:j.minimumOrder}),j.delivery&&i.jsx(bdProcFactV168,{label:"Доставка",value:j.delivery}),j.leadTime&&i.jsx(bdProcFactV168,{label:"Срок",value:j.leadTime}),j.availability&&i.jsx(bdProcFactV168,{label:"Наличие",value:j.availability}),j.discounts&&i.jsx(bdProcFactV168,{label:"Скидки",value:j.discounts})]}):i.jsx("p",{className:"bd-proc-insufficient-v168",children:"Условия не указаны. Сравнение с этим поставщиком выполняется только по цене."})]}),i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsxs("header",{children:[i.jsx("h3",{children:"Закупки и документы"}),i.jsx("span",{children:m.length})]}),m.length?i.jsx("div",{className:"bd-proc-mini-list-v168",children:m.slice(0,8).map(P=>{const C=bdProcPurchasePaymentV188(P,o);return i.jsxs("button",{type:"button",onClick:()=>l(P),children:[i.jsxs("span",{children:[i.jsx("strong",{children:bdProcDateV168(P.date)}),i.jsx("small",{children:bdProcDocTypeV168(P.documentType)+(P.documentNumber?" №"+P.documentNumber:"")})]}),i.jsxs("span",{className:"bd-proc-supplier-doc-money-v190",children:[i.jsx("b",{children:P.documentType==="price_list"?(P.items?.length||0)+" поз.":bdProcMoneyV168(P.total,P.currency||e?.currency||"RUB")}),P.status==="confirmed"&&P.documentType!=="price_list"&&i.jsx("small",{children:C.balanceDue>.005?"Осталось "+bdProcMoneyV168(C.balanceDue,P.currency||"RUB"):"Оплачено"})]}),i.jsx(Br,{size:15})]},P.id)})}):i.jsx("p",{className:"bd-proc-insufficient-v168",children:"Закупочных документов пока нет."})]}),i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsx("h3",{children:"История цен"}),g.length?i.jsx("div",{className:"bd-proc-price-history-v168",children:g.map(P=>i.jsxs("div",{children:[i.jsxs("span",{children:[i.jsx("strong",{children:P.productName}),i.jsx("small",{children:bdProcDateV168(P.date)+" · "+P.packageSize})]}),i.jsx("b",{children:bdProcMoneyV168(P.normalizedDisplayPrice,P.currency)+" / "+P.normalizedDisplayUnit})]},P.id))}):i.jsx("p",{className:"bd-proc-insufficient-v168",children:"Нет подтверждённых сопоставленных цен."}),y.length>0&&i.jsx("div",{className:"bd-proc-change-list-v168",children:y.map(P=>i.jsxs("span",{children:[i.jsx("strong",{children:P.productName}),i.jsx("em",{className:P.direction==="up"?"up":"down",children:(P.percent>0?"+":"")+P.percent+"%"})]},P.productKey+P.date))})]}),e?.notes&&i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsx("h3",{children:"Заметки"}),i.jsx("p",{children:e.notes})]})]})})}`;

const cancelPosting = String.raw`async function bdProcCancelPostingV186(w){const R=m.filter(P=>bdProcActivePaymentV186(P,w.id)),c=R.reduce((P,p)=>P+bdProcNumberV168(p?.amount),0),P=R.length?"\n\nПо этой закупке уже проведены платежи на "+bdProcMoneyV168(c,w.currency||"RUB")+". Они останутся в финансах и будут отмечены для сверки.":"";if(!window.confirm("Отменить проведение накладной «"+(w.supplierName||"Поставщик")+"»?\n\nСкладской приход будет сторнирован, история сохранится."+P))return;bdSetProcLifecycleBusy(!0);try{const p=await fetch("/api/purchases/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id,reason:"Проведение отменено пользователем"})}),X=await p.json();if(!p.ok||!X.ok)throw new Error(X.error||"Не удалось отменить проведение");bdProcApplyServerResultV186(X),a({variant:"success",title:"Проведение отменено",description:R.length?"Склад сторнирован. Платежи сохранены для финансовой сверки.":"Складское влияние отменено, история документа сохранена."})}catch(p){a({variant:"error",title:"Проведение не отменено",description:p instanceof Error?p.message:"Повторите попытку."})}finally{bdSetProcLifecycleBusy(!1)}}`;

const deletePurchase = String.raw`async function bdProcDeleteV186(w){const R=w.documentType==="price_list"?"прайс":"закупку";if(!window.confirm("Удалить "+R+" «"+(w.supplierName||"Поставщик")+"»?\n\nЧерновик будет удалён безопасно. Складских движений и финансовых операций не останется."))return;bdSetProcLifecycleBusy(!0);try{const P=await fetch("/api/purchases/delete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:w.id})}),c=await P.json();if(!P.ok||!c.ok)throw new Error(c.error||"Не удалось удалить закупку");bdProcApplyServerResultV186(c),M(null),e(bdProcQueryUrlV168({documentId:null,edit:null})),a({variant:"success",title:w.documentType==="price_list"?"Прайс удалён":"Закупка удалена",description:"Удаление выполнено безопасно; склад и финансовые операции не затронуты."})}catch(P){a({variant:"error",title:"Закупка не удалена",description:P instanceof Error?P.message:"Повторите попытку."})}finally{bdSetProcLifecycleBusy(!1)}}`;

function patchProcurement(source) {
  if (source.includes('const bdProcurementSettlementUiV190="v190"')) return source;
  source = required(
    source,
    "function bdProcPaymentStatusLabelV186(e)",
    settlementHelpers + "\nfunction bdProcPaymentStatusLabelV186(e)",
    "settlement helpers",
  );
  source = replaceBlock(
    source,
    "function bdProcPaymentEditorV186(",
    "function bdProcPurchaseDetailV168(",
    paymentEditor,
    "payment editor",
  );
  source = transformBlock(
    source,
    "function bdProcOverviewV168(",
    "function bdProcPurchasesV168(",
    (block) => {
      let next = required(
        block,
        "function bdProcOverviewV168({analytics:e,period:t",
        "function bdProcOverviewV168({analytics:e,documents:o=[],expenses:c=[],period:t",
        "overview inputs",
      );
      next = required(
        next,
        "const m=e.kpi.changePercent",
        "const P=bdProcDebtSummaryV190(o,c),m=e.kpi.changePercent",
        "overview debt calculation",
      );
      next = required(
        next,
        "]}),v===0&&i.jsx(bdProcSectionV168",
        "]}),i.jsxs(\"section\",{className:\"bd-proc-debt-overview-v190\",children:[i.jsxs(\"button\",{type:\"button\",disabled:P.openDocumentCount===0,onClick:()=>window.location.href=\"/suppliers?tab=purchases&filter=unpaid\",children:[i.jsxs(\"span\",{children:[i.jsx(\"small\",{children:\"Задолженность поставщикам\"}),i.jsx(\"strong\",{children:bdProcMoneyV168(P.totalOutstanding,P.suppliers[0]?.currency||\"RUB\")}),i.jsx(\"em\",{children:P.openDocumentCount?P.openDocumentCount+\" \"+bdProcPluralV168(P.openDocumentCount,\"накладная к оплате\",\"накладные к оплате\",\"накладных к оплате\"):\"Открытых обязательств нет\"})]}),i.jsx(Br,{size:17})]}),P.totalOutstanding>0&&i.jsx(\"div\",{children:P.suppliers.filter(C=>C.balanceDue>.005).slice(0,3).map(C=>i.jsxs(\"span\",{children:[i.jsx(\"b\",{children:C.supplierName}),i.jsx(\"strong\",{children:bdProcMoneyV168(C.balanceDue,C.currency)})]},C.supplierKey))})]}),v===0&&i.jsx(bdProcSectionV168",
        "overview debt card",
      );
      return next;
    },
    "overview",
  );
  source = transformBlock(
    source,
    "function bdProcSuppliersV168(",
    "function bdProcCompareV168(",
    (block) => {
      let next = required(
        block,
        "function bdProcSuppliersV168({suppliers:e,analytics:t,query:n",
        "function bdProcSuppliersV168({suppliers:e,analytics:t,documents:o=[],expenses:c=[],query:n",
        "supplier list inputs",
      );
      next = required(
        next,
        "const u=bdProcNormV168(n),d=new Map",
        "const P=bdProcDebtSummaryV190(o,c),u=bdProcNormV168(n),d=new Map",
        "supplier list debt",
      );
      next = required(
        next,
        "f.map(m=>{const h=d.get(String(m.id))||{},g=",
        "f.map(m=>{const h=d.get(String(m.id))||{},y=P.suppliers.find(v=>String(v.supplierId||\"\")===String(m.id||\"\")||bdProcNormV168(v.supplierName)===bdProcNormV168(m.name)),g=",
        "supplier row debt",
      );
      next = required(
        next,
        'i.jsx("em",{children:m.linkedProducts+" "+bdProcPluralV168(m.linkedProducts,"связанный товар","связанных товара","связанных товаров")})',
        'i.jsx("em",{children:m.linkedProducts+" "+bdProcPluralV168(m.linkedProducts,"связанный товар","связанных товара","связанных товаров")}),y?.balanceDue>.005&&i.jsx("em",{className:"bd-proc-supplier-debt-line-v190",children:"К оплате "+bdProcMoneyV168(y.balanceDue,y.currency||"RUB")+" · "+y.openDocumentCount+" накл."})',
        "supplier row debt label",
      );
      return next;
    },
    "supplier list",
  );
  source = transformBlock(
    source,
    "function bdProcPurchaseDetailV168(",
    "function bdProcSupplierDetailV168(",
    (block) => {
      let next = required(block, 'children:"Добавить оплату"', 'children:"Оплатить"', "visible pay action");
      next = required(block.includes('children:"Оплатить"') ? next : next, 'children:z?"Удалить прайс":"Удалить документ"', 'children:z?"Удалить прайс":"Удалить закупку"', "draft delete action");
      next = required(next, '!z&&i.jsxs("section",{className:"bd-proc-payment-summary-v186 "+B', '!z&&(M||D)&&i.jsxs("section",{className:"bd-proc-payment-summary-v186 "+B', "posted payment summary");
      next = required(next, 'i.jsx("span",{children:"Статус оплаты"})', 'i.jsx("span",{children:"Расчёт с поставщиком"})', "settlement heading");
      next = required(next, 'label:"Сумма закупки"', 'label:"Сумма"', "purchase total label");
      next = required(next, 'label:"К оплате"', 'label:"Осталось"', "balance label");
      next = required(next, 'tone:q>.005?"warn":"good"})]}),D&&T.length>0', 'tone:q>.005?"warn":"good"})]}),M&&q>.005&&g&&l&&i.jsx("button",{type:"button",className:"bd-proc-pay-now-v190",onClick:l,disabled:v,children:B==="partial"?"Оплатить остаток":"Оплатить"}),D&&T.length>0', "prominent pay button");
      next = required(next, 'label:"Способ по документу"', 'label:"Предполагаемый способ"', "legacy payment method label");
      next = required(next, 'i.jsx("h3",{children:"Финансовые операции"})', 'i.jsx("h3",{children:"Платежи"})', "payment history heading");
      next = required(next, 'bdProcPaymentMethodV186(C?.paymentMethod)', 'bdProcMoneySourceV190(C)', "payment source history");
      const positions = 'i.jsxs("section",{className:"bd-proc-detail-section-v168",children:[i.jsxs("header",{children:[i.jsx("h3",{children:"Позиции"})';
      next = required(next, positions, '!z&&e?.paymentMethod&&e.paymentMethod!=="unknown"&&i.jsx("p",{className:"bd-proc-payment-method-note-v190",children:"Предполагаемый способ по документу: "+bdProcPaymentMethodV186(e.paymentMethod)+". Это поле не подтверждает факт оплаты — статус выше рассчитывается только по платежам."}),' + positions, "payment method explanation");
      return next;
    },
    "purchase detail",
  );
  source = replaceBlock(
    source,
    "function bdProcSupplierDetailV168(",
    "function bdProcComparisonDetailV168(",
    supplierDetail,
    "supplier detail",
  );
  source = replaceBlock(
    source,
    "async function bdProcCancelPostingV186(",
    "async function bdProcRepostV186(",
    cancelPosting,
    "cancel posting handler",
  );
  source = replaceBlock(
    source,
    "async function bdProcDeleteV186(",
    "async function bdProcSavePaymentV186(",
    deletePurchase,
    "delete purchase handler",
  );
  source = required(
    source,
    "bdProcOverviewV168,{analytics:fe,period:b",
    "bdProcOverviewV168,{analytics:fe,documents:le,expenses:m,period:b",
    "overview invocation",
  );
  source = required(
    source,
    "bdProcSuppliersV168,{suppliers:d,analytics:fe,query:E",
    "bdProcSuppliersV168,{suppliers:d,analytics:fe,documents:le,expenses:m,query:E",
    "supplier list invocation",
  );
  source = required(
    source,
    "bdProcSupplierDetailV168,{supplier:D.supplier,metric:D.metric,documents:le,analytics:fe",
    "bdProcSupplierDetailV168,{supplier:D.supplier,metric:D.metric,documents:le,expenses:m,analytics:fe",
    "supplier detail invocation",
  );
  return source;
}

for (const target of procurementTargets) {
  const source = await readFile(target, "utf8");
  const patched = required(
    patchProcurement(source),
    'label:"Оплачено по накладным"',
    'label:"Оплачено по актуальным накладным"',
    "supplier paid-amount scope",
  );
  await writeFile(target, patched);
}

const moreItem = 'g&&{key:"warehouse",icon:kX,title:"Склад",description:"Остатки, приходы и инвентаризация",onClick:()=>e("/warehouse")},';
for (const target of [moreFragmentPath, bundlePath]) {
  let source = await readFile(target, "utf8");
  if (!source.includes(moreItem)) {
    source = required(
      source,
      'g&&{key:"suppliers",icon:Pf,title:"Поставщики",description:"Поставщики и закупки",onClick:()=>e("/suppliers")},',
      'g&&{key:"suppliers",icon:Pf,title:"Поставщики",description:"Поставщики и закупки",onClick:()=>e("/suppliers")},' + moreItem,
      "warehouse More item",
    );
  }
  await writeFile(target, source);
}

let bundle = await readFile(bundlePath, "utf8");
bundle = required(
  bundle,
  'label:"Оплата",children:i.jsxs("select",{value:e.paymentMethod||"unknown"',
  'label:"Предполагаемый способ",children:i.jsxs("select",{value:e.paymentMethod||"unknown"',
  "purchase review payment-method label",
);
bundle = required(
  bundle,
  'bdAccountingHeader,{title:"Склад",back:"/finance"',
  'bdAccountingHeader,{title:"Склад",back:"/more"',
  "warehouse back route",
);
await writeFile(bundlePath, bundle);

console.log("Procurement settlement UI v190 applied.");
