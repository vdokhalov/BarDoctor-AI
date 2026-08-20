import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const monthlyFragmentPath = new URL("./fragments/monthly-report-v165.fragment.txt", import.meta.url);
const procurementFragmentPath = new URL("./fragments/procurement-command-v168.fragment.txt", import.meta.url);

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Could not patch ${label}`);
  }
  return source.replace(before, after);
}

let bundle = await readFile(bundlePath, "utf8");
if (!bundle.includes('const bdUnifiedPurchaseReportingV188="v188"')) {
  bundle = replaceRequired(
    bundle,
    'const bdUnifiedPurchaseLedgerV186="v186";',
    'const bdUnifiedPurchaseLedgerV186="v186";const bdUnifiedPurchaseReportingV188="v188";',
    "reporting marker",
  );
  bundle = replaceRequired(
    bundle,
    ',bdLegacyPurchases=f.filter(q=>Gm(q.category)==="inventory"&&!q?.sourceDocumentId&&!q?.purchaseId).map(q=>({...q,amount:Number(q.amount)||0})),v=[...bdCanonicalPurchases,...bdLegacyPurchases],bdPurchaseCashRows=',
    ',bdLegacyPurchaseExpenses=f.filter(q=>Gm(q.category)==="inventory"&&!q?.sourceDocumentId&&!q?.purchaseId).map(q=>({...q,amount:Number(q.amount)||0})),v=bdCanonicalPurchases,bdPurchaseCashRows=',
    "legacy expenses outside inventory purchases",
  );
  bundle = replaceRequired(
    bundle,
    'purchases:A,purchasePayments:bdPurchasePayments,periodExpenses:',
    'purchases:A,purchasePayments:bdPurchasePayments,legacyPurchaseExpenses:bdLegacyPurchaseExpenses.reduce((q,B)=>q+(Number(B.amount)||0),0),periodExpenses:',
    "legacy expense report field",
  );
  bundle = replaceRequired(
    bundle,
    'purchases:m("purchases",u.purchases),periodExpenses:',
    'purchases:m("purchases",u.purchases),purchasePayments:m("purchasePayments",m("purchases",u.purchasePayments)),legacyPurchaseExpenses:m("legacyPurchaseExpenses",u.legacyPurchaseExpenses),periodExpenses:',
    "closed report payment snapshot",
  );
  bundle = replaceRequired(
    bundle,
    'purchases:e.purchases,purchasePayments:e.purchasePayments,periodExpenses:',
    'purchases:e.purchases,purchasePayments:e.purchasePayments,legacyPurchaseExpenses:e.legacyPurchaseExpenses,periodExpenses:',
    "month closing snapshot legacy field",
  );

  bundle = bundle
    .replaceAll(
      'e.resultBeforeCost-(Number(e.purchases)||0)',
      'e.resultBeforeCost-(Number(e.purchasePayments??e.purchases)||0)',
    )
    .replaceAll('subtitle:"после закупок и начисленных расходов"', 'subtitle:"после оплат поставщикам и начисленных расходов"')
    .replaceAll(
      'description:"Вычтены закупки бара, кухни и кальянов, начисленный ФОТ, списания, остальные расходы, налоги и коммунальные услуги."',
      'description:"Вычтены фактические оплаты поставщикам, начисленный ФОТ, списания, остальные расходы, налоги и коммунальные услуги."',
    )
    .replaceAll(
      'help:"Показывает управленческий результат после закупок и начисленных расходов. Это не банковский денежный поток: даты фактической оплаты ФОТ, налогов и коммунальных услуг могут отличаться."',
      'help:"Показывает управленческий результат после фактических оплат поставщикам и начисленных расходов. Это не банковский денежный поток: даты выплаты ФОТ, налогов и коммунальных услуг могут отличаться."',
    )
    .replaceAll(
      'children:"В одной сумме собраны закупки запасов и остальные накопительные расходы. ФОТ, налоги, коммунальные услуги и списания показываются отдельно."',
      'children:"В одной сумме собраны фактические оплаты поставщикам и остальные денежные расходы. Товарные накладные влияют на склад и себестоимость отдельно."',
    )
    .replaceAll(
      'bdMonthClosingSteps=["Проверка всех смен","Закупки и остальные расходы"',
      'bdMonthClosingSteps=["Проверка всех смен","Оплаты и остальные расходы"',
    )
    .replaceAll(
      'title:"Расходы месяца",subtitle:"Закупки формируют запас. Остальные расходы уменьшают результат периода."',
      'title:"Денежные расходы месяца",subtitle:"Накладные формируют запас и себестоимость. Здесь проверяются фактические оплаты поставщикам и остальные денежные расходы."',
    )
    .replaceAll(
      'label:"Закупки",value:bdMonthClosingMoney(t.purchases)',
      'label:"Оплаты поставщикам",value:bdMonthClosingMoney(t.purchasePayments)',
    )
    .replaceAll('title:"Все операции"', 'title:"Все финансовые операции"')
    .replaceAll('empty:"Закупки и остальные расходы не внесены"', 'empty:"Оплаты поставщикам и остальные расходы не внесены"')
    .replaceAll('label:"Я проверил закупки и остальные расходы"', 'label:"Я проверил оплаты поставщикам и остальные расходы"')
    .replaceAll('formula:"Выручка − оплаты закупок', 'formula:"Выручка − оплаты поставщикам')
    .replaceAll(
      'text:"Денежный ориентир после фактических оплат закупок и начисленных расходов.',
      'text:"Денежный ориентир после фактических оплат поставщикам и начисленных расходов.',
    )
    .replaceAll(
      'onEdit:ue&&(O.documentType==="price_list"||de)?',
      'onEdit:ue&&(O.documentType==="price_list"||O.status==="draft"||de)?',
    )
    .replaceAll(
      'canEdit:ue&&(O.documentType==="price_list"||de),',
      'canEdit:ue&&(O.documentType==="price_list"||O.status==="draft"||de),',
    );

  if (bundle.includes('bdLegacyPurchases=') || bundle.includes('v=[...bdCanonicalPurchases')) {
    throw new Error("Legacy amount-only expenses still affect goods purchases");
  }
  if (!bundle.includes('purchasePayments:m("purchasePayments",m("purchases",u.purchasePayments))')) {
    throw new Error("Closed month payment fallback was not applied");
  }
  await writeFile(bundlePath, bundle);
}

bundle = await readFile(bundlePath, "utf8");
bundle = bundle
  .replaceAll(
    '!z&&M&&y&&u&&i.jsx("button"',
    '!z&&M&&y&&(!T.length||j)&&u&&i.jsx("button"',
  )
  .replaceAll(
    'D&&y&&d&&i.jsx("button"',
    'D&&y&&(!T.length||j)&&d&&i.jsx("button"',
  )
  .replaceAll(
    'inventoryPurchases:N,otherExpenses:E',
    'supplierPayments:N,otherExpenses:E',
  )
  .replaceAll(
    'Закупки запасов за месяц: ${GM(u.inventoryPurchases)}${h?` (больше всего — ${h.label.toLowerCase()})`:""}. Это пополнение склада, не расход одной смены.',
    'Оплаты поставщикам за месяц: ${GM(u.supplierPayments)}${h?` (больше всего — ${h.label.toLowerCase()})`:""}. Это движение денег; товарные накладные и склад учитываются отдельно.',
  )
  .replaceAll(
    'inventoryPurchasesByCategory:ye',
    'supplierPaymentsByCategory:ye',
  )
  .replaceAll(
    'o?.periodExpenses??((t.inventoryPurchases??0)+(t.otherExpenses??0))',
    'o?.periodExpenses??((t.supplierPayments??0)+(t.otherExpenses??0))',
  )
  .replaceAll(
    'o?.periodExpenses??((t.supplierPayments??0)+(t.otherExpenses??0))',
    'o?.periodExpenses??((t.supplierPayments??0)+(t.legacyPurchaseExpenses??0)+(t.otherExpenses??0))',
  );

if (bundle.includes('inventoryPurchases')) {
  throw new Error("Financial payment summary still exposes supplier payments as inventory purchases");
}
bundle = bundle.replaceAll(
  'function bdExpenseArea(e){return e.area||(e.category==="hookah"?"Кальяны":"Не распределено")}',
  'function bdExpenseArea(e){return e.area||(e.category==="hookah"?"Кальяны":e.category==="household"?"Хоз.товары":"Не распределено")}',
);

const financeSummaryStart = bundle.includes("function bdIsLinkedPurchasePaymentV188(")
  ? bundle.indexOf("function bdIsLinkedPurchasePaymentV188(")
  : bundle.indexOf("function wn(");
const financeSummaryEnd = bundle.indexOf("function Rz(", financeSummaryStart);
if (financeSummaryStart < 0 || financeSummaryEnd <= financeSummaryStart) {
  throw new Error("Financial summary markers were not found");
}
const financeSummary = String.raw`function bdIsLinkedPurchasePaymentV188(e){return Boolean(e?.sourceDocumentId||e?.purchaseId)&&(e?.source==="purchase_payment"||e?.paymentKind==="supplier_payment"||e?.source==="purchase_document")&&e?.status!=="voided"&&!e?.reversedAt}
function wn(e,t,n,r){const a=e.filter(A=>BS(A.date,n,r)),s=t.filter(A=>BS(A.date,n,r)&&A?.status!=="voided"&&!A?.reversedAt),l=a.map(A=>ql(A.revenue)).filter(A=>A!==null),u=a.map(A=>ql(A.receipts)).filter(A=>A!==null),d=a.map(A=>ql(A.guests)).filter(A=>A!==null),f=s.filter(A=>bdIsLinkedPurchasePaymentV188(A)),m=s.filter(A=>!bdIsLinkedPurchasePaymentV188(A)&&Gm(A.category)==="operating"&&A.category!=="writeoff"),h=s.filter(A=>A.category==="writeoff"),g=s.filter(A=>!bdIsLinkedPurchasePaymentV188(A)&&Gm(A.category)==="inventory"),y=f.map(A=>ql(A.amount)).filter(A=>A!==null),j=g.map(A=>ql(A.amount)).filter(A=>A!==null),v=m.map(A=>ql(A.amount)).filter(A=>A!==null),b=h.map(A=>ql(A.amount)).filter(A=>A!==null),N=l.reduce((A,k)=>A+k,0),E=u.reduce((A,k)=>A+k,0),_=y.reduce((A,k)=>A+k,0),T=j.reduce((A,k)=>A+k,0),A=v.reduce((k,O)=>k+O,0),k=b.reduce((O,M)=>O+M,0),O=_+T+A+k,M=d.reduce((D,z)=>D+z,0),D=N-O;return{revenue:N,expenses:O,supplierPayments:_,legacyPurchaseExpenses:T,otherExpenses:A,writeoffs:k,cashMovement:D,operatingDiff:D,receipts:E,avgReceipt:E>0?Math.round(N/E):null,guests:d.length>0?M:null,daysWithData:a.length,hasRevenueData:a.length>0}}
`;
bundle = bundle.slice(0, financeSummaryStart) + financeSummary + bundle.slice(financeSummaryEnd);
bundle = bundle.replaceAll(
  'function Rz(e,t,n){const r=e.filter(s=>BS(s.date,t,n)&&Gm(s.category)==="inventory")',
  'function Rz(e,t,n){const r=e.filter(s=>BS(s.date,t,n)&&bdIsLinkedPurchasePaymentV188(s))',
);

const homeSummaryStart = bundle.indexOf("function Nce()");
const homeSummaryEnd = bundle.indexOf("function ", homeSummaryStart + 12);
if (homeSummaryStart < 0 || homeSummaryEnd <= homeSummaryStart) {
  throw new Error("Home financial summary markers were not found");
}
const homeSummary = String.raw`function Nce(){const{profile:e}=Un(),{revenue:t,expenses:n,gapReasons:r}=Ur();return S.useMemo(()=>{if(!e)return null;const a=new Date,s=wo(e,a);if(!s.periodEnd)return null;const l=s.periodEnd,u=wn(t,n,s.monthStart,l),d=Rz(n,s.monthStart,l),f=kC(e,t,r,a,s);if(!u.hasRevenueData&&u.supplierPayments<=0&&u.legacyPurchaseExpenses<=0)return null;const m=[];if(u.hasRevenueData&&m.push(Выручка за __BD_EXPR__Jl(s.year,s.month)}: __BD_EXPR__GM(u.revenue)}__BD_EXPR__u.receipts>0?, чеков __BD_EXPR__u.receipts}:}.),u.supplierPayments>0){const h=d[0];m.push(Оплаты поставщикам за месяц: __BD_EXPR__GM(u.supplierPayments)}__BD_EXPR__h? (больше всего — __BD_EXPR__h.label.toLowerCase()}):}. Это движение денег; товарные накладные и склад учитываются отдельно.)}return u.legacyPurchaseExpenses>0&&m.push(Исторические расходы на закупки без надёжной связи с накладной: __BD_EXPR__GM(u.legacyPurchaseExpenses)}. Они сохранены отдельно и не превращены в товарные позиции.),f&&f.scheduledCompletedShifts>0&&m.push(Данные внесены за __BD_EXPR__f.coveragePercent}% завершённых смен месяца.),u.hasRevenueData&&(u.supplierPayments>0||u.legacyPurchaseExpenses>0)&&m.push("Точная маржинальность недоступна без учёта остатков и списаний."),m.length===0?null:{monthLabel:Jl(s.year,s.month),points:m.slice(0,4)}},[e,t,n,r])}
`.replaceAll("__BD_EXPR__", "${").replaceAll("\u001d", "`");
bundle = bundle.slice(0, homeSummaryStart) + homeSummary + bundle.slice(homeSummaryEnd);

if (!bundle.includes("bdPurchasePaymentRows=")) {
  bundle = replaceRequired(
    bundle,
    ',bdLegacyPurchaseExpenses=f.filter(q=>Gm(q.category)==="inventory"&&!q?.sourceDocumentId&&!q?.purchaseId).map(q=>({...q,amount:Number(q.amount)||0})),v=bdCanonicalPurchases,bdPurchaseCashRows=f.filter(q=>Gm(q.category)==="inventory"),b=',
    ',bdIsPurchasePaymentRow=q=>Boolean(q?.sourceDocumentId||q?.purchaseId)&&(q?.source==="purchase_payment"||q?.paymentKind==="supplier_payment"||q?.source==="purchase_document"),bdPurchasePaymentRows=f.filter(bdIsPurchasePaymentRow),bdLegacyPurchaseExpenses=f.filter(q=>Gm(q.category)==="inventory"&&!bdIsPurchasePaymentRow(q)).map(q=>({...q,amount:Number(q.amount)||0})),v=bdCanonicalPurchases,bdPurchaseCashRows=[...bdPurchasePaymentRows,...bdLegacyPurchaseExpenses],b=',
    "linked and legacy purchase cash rows",
  );
  bundle = replaceRequired(
    bundle,
    'T=f.filter(q=>Gm(q.category)!=="inventory"&&!(["writeoff","taxes","utilities","payroll"].includes(q.category)))',
    'T=f.filter(q=>!bdIsPurchasePaymentRow(q)&&Gm(q.category)!=="inventory"&&!(["writeoff","taxes","utilities","payroll"].includes(q.category)))',
    "supplier payments outside ordinary expenses",
  );
  bundle = replaceRequired(
    bundle,
    'bdPurchasePayments=bdPurchaseCashRows.reduce((q,B)=>q+(Number(B.amount)||0),0),k=',
    'bdPurchasePayments=bdPurchasePaymentRows.reduce((q,B)=>q+(Number(B.amount)||0),0),bdLegacyPurchaseExpenseTotal=bdLegacyPurchaseExpenses.reduce((q,B)=>q+(Number(B.amount)||0),0),bdPurchaseCashOutflow=bdPurchasePayments+bdLegacyPurchaseExpenseTotal,k=',
    "separate linked payment total",
  );
}
bundle = bundle
  .replaceAll(
    'legacyPurchaseExpenses:bdLegacyPurchaseExpenses.reduce((q,B)=>q+(Number(B.amount)||0),0),periodExpenses:bdPurchasePayments+O',
    'legacyPurchaseExpenses:bdLegacyPurchaseExpenseTotal,periodExpenses:bdPurchaseCashOutflow+O',
  )
  .replaceAll('cashResult:tt-bdPurchasePayments,', 'cashResult:tt-bdPurchaseCashOutflow,')
  .replaceAll(
    'e.resultBeforeCost-(Number(e.purchasePayments??e.purchases)||0)',
    'e.resultBeforeCost-(Number(e.purchasePayments??e.purchases)||0)-(Number(e.legacyPurchaseExpenses)||0)',
  );

if (!bundle.includes("legacyPurchaseExpenses:T") || !bundle.includes("bdPurchaseCashOutflow=")) {
  throw new Error("Legacy purchase cash was not separated from linked supplier payments");
}
await writeFile(bundlePath, bundle);

let monthly = await readFile(monthlyFragmentPath, "utf8");
monthly = monthly
  .replaceAll('{ key: "cash", label: "После закупок", value: report.cashResult }', '{ key: "cash", label: "После оплат", value: report.cashResult }')
  .replaceAll(
    'После закупок: выручка минус закупки, ФОТ, списания, прочие расходы, налоги и коммунальные услуги.',
    'Денежный итог: выручка минус фактические оплаты поставщикам, ФОТ, списания, прочие расходы, налоги и коммунальные услуги.',
  )
  .replaceAll(
    'Закупки запасов и остальные накопительные категории',
    'Оплаты поставщикам и остальные денежные расходы',
  )
  .replaceAll(
    'Сумма расходов за период нужна для контроля закупок и платежей. В чистой прибыли товарные закупки заменяются рассчитанной себестоимостью проданного.',
    'Сумма расходов за период показывает фактические оплаты поставщикам и прочие денежные расходы. В чистой прибыли товарные накладные учитываются через рассчитанную себестоимость проданного.',
  );
await writeFile(monthlyFragmentPath, monthly);

bundle = await readFile(bundlePath, "utf8");
const monthlyStartMarker = "/* bd-monthly-report-v165:start */";
const monthlyEndMarker = "/* bd-monthly-report-v165:end */";
const monthlyStart = bundle.indexOf(monthlyStartMarker);
const monthlyEnd = bundle.indexOf(monthlyEndMarker, monthlyStart);
if (monthlyStart < 0 || monthlyEnd <= monthlyStart) {
  throw new Error("Monthly report presentation markers were not found");
}
bundle =
  bundle.slice(0, monthlyStart) +
  monthly.trim() +
  bundle.slice(monthlyEnd + monthlyEndMarker.length);
await writeFile(bundlePath, bundle);

let procurement = await readFile(procurementFragmentPath, "utf8");
procurement = procurement
  .replaceAll(
    'onEdit:ue&&(O.documentType==="price_list"||de)?',
    'onEdit:ue&&(O.documentType==="price_list"||O.status==="draft"||de)?',
  )
  .replaceAll(
    'canEdit:ue&&(O.documentType==="price_list"||de),',
    'canEdit:ue&&(O.documentType==="price_list"||O.status==="draft"||de),',
  )
  .replaceAll(
    '!z&&M&&y&&u&&i.jsx("button"',
    '!z&&M&&y&&(!T.length||j)&&u&&i.jsx("button"',
  )
  .replaceAll(
    'D&&y&&d&&i.jsx("button"',
    'D&&y&&(!T.length||j)&&d&&i.jsx("button"',
  );
await writeFile(procurementFragmentPath, procurement);

console.log("Unified purchase reporting v188 applied.");
