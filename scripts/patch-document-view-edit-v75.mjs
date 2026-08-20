import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceInSection(source, startNeedle, endNeedle, transform, label) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  if (start === -1 || end === -1) throw new Error(`Missing section: ${label}`);
  const section = source.slice(start, end);
  return source.slice(0, start) + transform(section) + source.slice(end);
}

const detailComponent = String.raw`
function bdDocumentDetailSheet({expense:e,revenue:t,document:n,equipment:r,onClose:a,onEdit:s}){const l=Array.isArray(n?.items)?n.items:[],u=n?bdProcDocLabel(n.documentType):t?"Закрытая смена":"Расход",d=n?.currency||"RUB",f=n?.date||t?.date||e?.date||"",m=n?Number(n.total)||0:t?Number(t.revenue)||0:Number(e?.amount)||0,h=e?.category==="repairs"&&e?.equipmentId?r?.find(g=>g.id===e.equipmentId):null,g=n?(n.supplierName||"Поставщик")+(n.documentNumber?" · № "+n.documentNumber:""):t?"Финансовые данные смены":e?.description||Lg[e?.category]||"Расход",y={cash:"Наличные",card:"Карта",transfer:"Перевод",unknown:"Не указано"};return i.jsxs(i.Fragment,{children:[i.jsx(W.button,{type:"button","aria-label":"Закрыть просмотр",onClick:a,initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-[60]"}),i.jsxs(W.section,{role:"dialog","aria-modal":!0,"aria-label":u,initial:{y:"100%"},animate:{y:0},exit:{y:"100%"},transition:{duration:.32,ease:[.22,1,.36,1]},className:"fixed inset-x-0 bottom-0 z-[70] bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.14)] flex flex-col overflow-hidden",style:{maxWidth:430,margin:"0 auto",maxHeight:"94dvh"},children:[i.jsx("div",{className:"flex-shrink-0 flex justify-center pt-3 pb-2",children:i.jsx("div",{className:"w-10 h-1 rounded-full bg-border"})}),i.jsxs("header",{className:"flex-shrink-0 flex items-start justify-between gap-3 px-6 pb-4",children:[i.jsxs("div",{className:"min-w-0",children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",color:"#6366F1",marginBottom:5},children:"Режим просмотра"}),i.jsx("h2",{className:"text-[20px] font-black text-foreground tracking-tight",children:u}),i.jsx("p",{className:"text-[13px] text-muted-foreground mt-1",style:{overflowWrap:"anywhere"},children:g})]}),i.jsx("button",{type:"button",onClick:a,"aria-label":"Закрыть",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0",children:i.jsx(vt,{size:16,className:"text-foreground"})})]}),i.jsxs("div",{className:"flex-1 overflow-y-auto px-6 pb-5",children:[i.jsxs("section",{style:{borderRadius:20,background:"linear-gradient(135deg,#171C3D,#292F70)",padding:"18px",color:"#fff",marginBottom:14},children:[i.jsx("p",{style:{fontSize:10,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.58)"},children:n?"Итого по документу":t?"Выручка за смену":"Сумма расхода"}),i.jsx("strong",{style:{display:"block",fontSize:28,lineHeight:1.1,fontWeight:950,marginTop:7},children:n?bdProcMoney(m,d):Mn(m)}),i.jsx("p",{style:{fontSize:12,color:"rgba(255,255,255,.68)",marginTop:8},children:bdProcDate(f)})]}),n?i.jsxs(i.Fragment,{children:[i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16},children:[i.jsx(bdDetailFact,{label:"Поставщик",value:n.supplierName||"Не указан"}),i.jsx(bdDetailFact,{label:"Номер",value:n.documentNumber||"Не указан"}),i.jsx(bdDetailFact,{label:"Оплата",value:y[n.paymentMethod]||"Не указано"}),i.jsx(bdDetailFact,{label:"Категория",value:bdProcCategoryLabels[n.expenseCategory]||"Закупка"})]}),i.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,margin:"4px 0 10px"},children:[i.jsx("h3",{style:{fontSize:15,fontWeight:900,color:"#171A34"},children:"Купленные позиции"}),i.jsxs("span",{style:{fontSize:12,fontWeight:800,color:"#6B7280"},children:[l.length," поз."]})]}),l.length?i.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:l.map((o,c)=>i.jsxs("article",{style:{border:"1px solid #E5E7F0",borderRadius:16,padding:"12px 13px",background:"#FAFAFD"},children:[i.jsxs("div",{style:{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"},children:[i.jsxs("div",{style:{minWidth:0},children:[i.jsx("strong",{style:{display:"block",fontSize:13.5,color:"#171A34",overflowWrap:"anywhere"},children:o.name||"Позиция "+(c+1)}),i.jsxs("span",{style:{display:"block",fontSize:11.5,color:"#7C8498",marginTop:3},children:[Number(o.quantity)||0," × ",o.packageSize||o.unit||"ед.",Number(o.unitPrice)>0?" · "+bdProcMoney(o.unitPrice,d)+"/ед.":""]})]}),i.jsx("b",{style:{fontSize:13,color:"#171A34",whiteSpace:"nowrap"},children:bdProcMoney(Number(o.lineTotal)||Number(o.quantity)*Number(o.unitPrice)||0,d)})]}),o.category&&i.jsx("span",{style:{display:"inline-flex",marginTop:8,padding:"4px 8px",borderRadius:999,background:"#EFEFFE",color:"#5754D8",fontSize:10.5,fontWeight:800},children:bdProcCategoryLabels[o.category]||o.category})]},o.id||c))}):i.jsx("p",{style:{padding:14,borderRadius:14,background:"#FFF8E8",color:"#8A621A",fontSize:12.5},children:"В документе нет сохранённых позиций."}),n.sourceUrl&&i.jsx("a",{href:n.sourceUrl,target:"_blank",rel:"noreferrer",style:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:44,marginTop:12,borderRadius:14,border:"1px solid #DADCF8",color:"#5754D8",fontSize:12.5,fontWeight:850},children:"Открыть оригинал документа →"})]}):t?i.jsx("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},children:[i.jsx(bdDetailFact,{label:"Чеков",value:String(t.receipts??0)}),i.jsx(bdDetailFact,{label:"Средний чек",value:t.receipts?Mn(Math.round((Number(t.revenue)||0)/t.receipts)):"—"}),i.jsx(bdDetailFact,{label:"Гостей",value:t.guests==null?"Не указано":String(t.guests)}),i.jsx(bdDetailFact,{label:"Комментарий",value:t.note||"Нет"})]}):i.jsxs(i.Fragment,{children:[i.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},children:[i.jsx(bdDetailFact,{label:"Категория",value:e?.category==="other"?e?.customCategoryLabel||"Прочее":Lg[e?.category]||"Прочее"}),i.jsx(bdDetailFact,{label:"Зона",value:e?.area||"Не указана"}),h&&i.jsx(bdDetailFact,{label:"Оборудование",value:h.name}),i.jsx(bdDetailFact,{label:"Источник",value:e?.source==="purchase_document"?"Закупочный документ":"Вручную"})]}),e?.description&&i.jsx("div",{style:{marginTop:10,padding:13,borderRadius:15,background:"#F7F8FC",border:"1px solid #E5E7F0"},children:i.jsxs(i.Fragment,{children:[i.jsx("p",{style:{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".07em",color:"#8A90A8"},children:"Описание"}),i.jsx("p",{style:{fontSize:13.5,color:"#252A42",lineHeight:1.5,marginTop:5,overflowWrap:"anywhere"},children:e.description})]})})]})]}),i.jsxs("footer",{className:"flex-shrink-0 px-6 pb-8 pt-3 border-t border-border flex gap-2",children:[i.jsx("button",{type:"button",onClick:a,className:"h-12 flex-1 rounded-2xl border border-border bg-white text-[14px] font-bold text-foreground",children:"Закрыть"}),s&&i.jsx("button",{type:"button",onClick:s,className:"h-12 flex-1 rounded-2xl bg-primary text-white text-[14px] font-bold",children:n?"Редактировать накладную":"Редактировать"})]})]})]})}
function bdDetailFact({label:e,value:t}){return i.jsxs("div",{style:{minWidth:0,border:"1px solid #E5E7F0",borderRadius:14,padding:"10px 11px",background:"#F8F9FC"},children:[i.jsx("p",{style:{fontSize:9.5,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",color:"#8A90A8"},children:e}),i.jsx("p",{style:{fontSize:12.5,fontWeight:800,color:"#252A42",marginTop:4,overflowWrap:"anywhere"},children:t})]})}
`;

let bundle = await readFile(bundlePath, "utf8");

bundle = replaceOnce(bundle, "function RAe(", `${detailComponent}function RAe(`, "document detail sheet");

bundle = replaceInSection(bundle, "function bdPurchaseReview", "const bdImageUploadVersion", (section) => {
  section = replaceOnce(
    section,
    'i.jsx("h2",{children:"Проверьте распознавание"})',
    'i.jsx("h2",{children:e.status==="confirmed"?"Редактировать накладную":"Проверьте распознавание"})',
    "purchase review title",
  );
  section = replaceOnce(
    section,
    'children:Number(e.confidence)>=.85&&!e.warnings.length?"Документ распознан уверенно. Всё равно проверьте итог и позиции перед сохранением.":(e.warnings&&e.warnings.length?e.warnings.join(" "):"Есть неуверенно распознанные поля — проверьте их вручную.")',
    'children:e.status==="confirmed"?"Изменения синхронно обновят накладную, связанный расход и склад. Если по товару уже были продажи, опасная правка будет заблокирована.":Number(e.confidence)>=.85&&!e.warnings.length?"Документ распознан уверенно. Всё равно проверьте итог и позиции перед сохранением.":(e.warnings&&e.warnings.length?e.warnings.join(" "):"Есть неуверенно распознанные поля — проверьте их вручную.")',
    "purchase review note",
  );
  section = replaceOnce(
    section,
    'children:"Не сохранять"',
    'children:e.status==="confirmed"?"Закрыть":"Не сохранять"',
    "purchase review cancel",
  );
  section = replaceOnce(
    section,
    'children:s?"Сохраняю…":e.documentType==="price_list"?"Сохранить прайс":"Учесть закупку"',
    'children:s?"Сохраняю…":e.status==="confirmed"?"Сохранить изменения":e.documentType==="price_list"?"Сохранить прайс":"Учесть закупку"',
    "purchase review submit",
  );
  return section;
}, "purchase review");

bundle = replaceInSection(bundle, "function BAe(){", "function Ge(", (section) => {
  section = replaceOnce(
    section,
    '[z,L]=S.useState(void 0);S.useEffect',
    '[z,L]=S.useState(void 0),[bdFinanceView,bdSetFinanceView]=S.useState(null),bdPurchaseDocuments=bdProcArray("bd_purchase_documents");S.useEffect',
    "finance detail state",
  );
  section = replaceOnce(
    section,
    'onClick:()=>{A(ve),_("revenue")}',
    'onClick:()=>bdSetFinanceView({type:"revenue",record:ve})',
    "revenue opens viewer",
  );
  section = replaceOnce(
    section,
    'ce.map(ve=>{const Re=ve.category==="repairs"&&ve.equipmentId?g.find(ot=>ot.id===ve.equipmentId):void 0;return',
    'ce.map(ve=>{const Re=ve.category==="repairs"&&ve.equipmentId?g.find(ot=>ot.id===ve.equipmentId):void 0,bdLinkedDocument=ve.sourceDocumentId?bdPurchaseDocuments.find(ot=>ot.id===ve.sourceDocumentId):void 0;return',
    "linked purchase lookup",
  );
  section = replaceOnce(
    section,
    'onClick:()=>{O(ve),L(void 0),_("expense")}',
    'onClick:()=>bdSetFinanceView({type:"expense",record:ve})',
    "expense opens viewer",
  );
  section = replaceOnce(
    section,
    've.description&&i.jsx("p",{className:"text-[12px] text-muted-foreground/80 mt-0.5",children:ve.description})',
    'bdLinkedDocument&&i.jsxs("p",{className:"text-[12px] font-semibold text-primary/80 mt-0.5",children:[bdProcDocLabel(bdLinkedDocument.documentType)," · ",bdLinkedDocument.items?.length||0," позиций · открыть для просмотра"]}),ve.description&&i.jsx("p",{className:"text-[12px] text-muted-foreground/80 mt-0.5",children:ve.description})',
    "expense document summary",
  );
  section = replaceOnce(
    section,
    'i.jsxs(qe,{children:[E==="revenue"',
    'bdFinanceView&&i.jsx(bdDocumentDetailSheet,{expense:bdFinanceView.type==="expense"?bdFinanceView.record:null,revenue:bdFinanceView.type==="revenue"?bdFinanceView.record:null,document:bdFinanceView.type==="expense"&&bdFinanceView.record?.sourceDocumentId?bdPurchaseDocuments.find(ve=>ve.id===bdFinanceView.record.sourceDocumentId):null,equipment:g,onClose:()=>bdSetFinanceView(null),onEdit:()=>{const ve=bdFinanceView.record,Re=bdFinanceView.type==="expense"&&ve?.sourceDocumentId?bdPurchaseDocuments.find(ot=>ot.id===ve.sourceDocumentId):null;bdSetFinanceView(null),Re?e(`/suppliers?documentId=${encodeURIComponent(Re.id)}&edit=1`):bdFinanceView.type==="expense"?(O(ve),L(void 0),_("expense")):(A(ve),_("revenue"))}}),i.jsxs(qe,{children:[E==="revenue"',
    "finance detail render",
  );
  return section;
}, "finance page");

bundle = replaceInSection(bundle, "function bdSuppliersPage(){", "const bdPhotoGalleryVersion", (section) => {
  section = replaceOnce(
    section,
    'function bdSuppliersPage(){const[,e]=bt(),{isReady:t}=Ai()',
    'function bdSuppliersPage(){const[,e]=bt(),bdSupplierQuery=ste(),{isReady:t}=Ai()',
    "supplier query",
  );
  section = replaceOnce(
    section,
    '[C,x]=S.useState([]),_=S.useRef(null)',
    '[C,x]=S.useState([]),[bdViewedPurchase,bdSetViewedPurchase]=S.useState(null),_=S.useRef(null)',
    "supplier document viewer state",
  );
  section = replaceOnce(
    section,
    'S.useEffect(()=>{t&&(l(bdProcArray(bdSupplierStoreKey)),d(bdProcArray(bdPurchaseStoreKey)))},[t]);',
    'S.useEffect(()=>{t&&(l(bdProcArray(bdSupplierStoreKey)),d(bdProcArray(bdPurchaseStoreKey)))},[t]);S.useEffect(()=>{if(!t)return;const p=new URLSearchParams(bdSupplierQuery),c=p.get("documentId");if(!c)return;const I=bdProcArray(bdPurchaseStoreKey).find(R=>R.id===c);I&&(p.get("edit")==="1"?m({...I}):bdSetViewedPurchase(I))},[t,bdSupplierQuery]);',
    "supplier deep link",
  );
  section = replaceOnce(
    section,
    'async function Z(){const p=f;m(null);const c=',
    'async function Z(){const p=f;m(null);if(p?.status==="confirmed"){e("/suppliers");return}const c=',
    "safe edit cancel",
  );
  section = replaceOnce(
    section,
    'const p=await fetch("/api/purchases/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({document:f})})',
    'const bdEditingConfirmed=f.status==="confirmed",p=await fetch(bdEditingConfirmed?"/api/purchases/update":"/api/purchases/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({document:f})})',
    "purchase update endpoint",
  );
  section = replaceOnce(
    section,
    'm(null),n({variant:"success",title:f.documentType==="price_list"?"Прайс сохранён":"Закупка и расход учтены",description:f.documentType==="price_list"?"Цены доступны для сравнения.":`${bdProcMoney(Number(c.expense?.amount)||Number(f.total)||0,f.currency)} добавлено в расходы. ${Number(c.inventorySummary?.postedLines)||f.items?.length||0} позиций поставлено на приход.`})',
    'm(null),bdEditingConfirmed&&e("/suppliers"),n({variant:"success",title:bdEditingConfirmed?"Накладная обновлена":f.documentType==="price_list"?"Прайс сохранён":"Закупка и расход учтены",description:f.documentType==="price_list"?"Цены доступны для сравнения.":bdEditingConfirmed?"Документ, связанный расход и склад синхронизированы.":`${bdProcMoney(Number(c.expense?.amount)||Number(f.total)||0,f.currency)} добавлено в расходы. ${Number(c.inventorySummary?.postedLines)||f.items?.length||0} позиций поставлено на приход.`})',
    "purchase update success",
  );
  section = replaceOnce(
    section,
    'q.map(p=>i.jsxs("article",{className:"bd-procurement-card",children:',
    'q.map(p=>i.jsxs("article",{className:"bd-procurement-card",onClick:()=>bdSetViewedPurchase(p),style:{cursor:"pointer"},children:',
    "document card viewer",
  );
  section = replaceOnce(
    section,
    'i.jsx("a",{className:"bd-procurement-link",href:p.sourceUrl,target:"_blank",rel:"noreferrer",children:"Открыть оригинал →"})',
    'i.jsx("a",{className:"bd-procurement-link",href:p.sourceUrl,target:"_blank",rel:"noreferrer",onClick:c=>c.stopPropagation(),children:"Открыть оригинал →"})',
    "source link propagation",
  );
  section = replaceOnce(
    section,
    'f&&i.jsx(bdPurchaseReview,{draft:f',
    'bdViewedPurchase&&i.jsx(bdDocumentDetailSheet,{document:bdViewedPurchase,onClose:()=>{bdSetViewedPurchase(null),bdSupplierQuery&&e("/suppliers")},onEdit:A?()=>{const p=bdViewedPurchase;bdSetViewedPurchase(null),m({...p})}:null}),f&&i.jsx(bdPurchaseReview,{draft:f',
    "supplier document detail render",
  );
  return section;
}, "supplier page");

bundle = replaceOnce(
  bundle,
  'bdSupplierWorkspaceVersion="procurement-v34"',
  'bdSupplierWorkspaceVersion="procurement-v35"',
  "supplier workspace version",
);
bundle = replaceOnce(
  bundle,
  'const bdReleaseCandidateVersion="rc-v74"',
  'const bdReleaseCandidateVersion="rc-v75"',
  "release version",
);

await writeFile(bundlePath, bundle);
