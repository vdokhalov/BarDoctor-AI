import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const cssPath = new URL("../public/catalog.css", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const cacheToken = "20260828-calculation-audit-v320";
let source = fs.readFileSync(bundlePath, "utf8");

const marker = 'const bdCalculationAuditClientV320="calculation-audit-v320";';
if (!source.includes(marker)) {
  const financeAnchor = "function wn(e,t,n,r){";
  if (!source.includes(financeAnchor)) throw new Error("Finance summary anchor not found");
  const currencyHelpers = String.raw`${marker}
function bdMonthlyAccountingCurrencyV320(e,t){const n=String(e?.accountingCurrency||e?.currency||t?.accountingCurrency||t?.currency||(typeof bdCurrentAccountingCurrencyV243==="function"?bdCurrentAccountingCurrencyV243():"")||"RUB").trim().toUpperCase();return n||"RUB"}
function bdMonthlyCurrencyCodeV320(e,t){const n=String(e??"").trim().toUpperCase();return /^[A-Z]{3}$/.test(n)?n:t}
function bdMonthlyFiniteMoneyV320(e){const t=Number(e);return Number.isFinite(t)?t:null}
function bdMonthlyConvertedAmountV320(e,t,n){const r=t==="revenue"?"revenue":t==="purchase"?"total":t==="snapshot"?"total":"amount",a=bdMonthlyFiniteMoneyV320(e?.[r]??(t==="snapshot"?bdSnapshotTotal(e):null)),s=bdMonthlyCurrencyCodeV320(e?.currency??e?.transactionCurrency,n);if(a===null)return{included:!1,reason:"invalid_amount",sourceCurrency:s,sourceAmount:null};if(s===n)return{included:!0,amount:a,sourceCurrency:s,conversion:"same_currency"};const l=t==="revenue"?["accountingRevenue","normalizedRevenue"]:t==="purchase"||t==="snapshot"?["accountingTotal","normalizedTotal","accountingAmount","normalizedAmount"]:["accountingAmount","normalizedAmount","accountingTotal","normalizedTotal"],u=bdMonthlyCurrencyCodeV320(e?.accountingCurrency??e?.normalizedCurrency??e?.normalizedCostCurrency,"");for(const d of l){const f=bdMonthlyFiniteMoneyV320(e?.[d]);if(f!==null&&u===n)return{included:!0,amount:f,sourceCurrency:s,conversion:"stored_accounting_amount"}}const d=bdMonthlyFiniteMoneyV320(e?.exchangeRateToAccounting);return d!==null&&d>0?{included:!0,amount:a*d,sourceCurrency:s,conversion:"stored_historical_fx"}:{included:!1,reason:"missing_historical_fx",sourceCurrency:s,sourceAmount:a}}
function bdMonthlyCurrencyPartitionV320(e,t,n){const r=[],a=[];for(const s of Array.isArray(e)?e:[]){const l=bdMonthlyConvertedAmountV320(s,t,n);if(!l.included){a.push({id:String(s?.id??s?.sourceDocumentId??"unknown"),kind:t,sourceCurrency:l.sourceCurrency,amount:l.sourceAmount,reason:l.reason});continue}let u={...s,bdAccountingConversionV320:l.conversion};if(t==="revenue")u.revenue=l.amount;else if(t==="purchase")u.total=l.amount,u.amount=l.amount;else if(t==="expense")u.amount=l.amount;else if(t==="snapshot"){const d=bdMonthlyFiniteMoneyV320(s?.total??bdSnapshotTotal(s)),f=d&&l.amount/d;u.total=l.amount,Number.isFinite(f)&&(u.sections=Object.fromEntries(Object.entries(s?.sections||{}).map(([m,h])=>[m,(Number(h)||0)*f])))}r.push(u)}return{included:r,excluded:a}}
function bdMonthlyExcludedCurrencyTotalsV320(e){const t=new Map;for(const n of e){const r=n.kind+":"+n.sourceCurrency;t.set(r,(t.get(r)||0)+(Number(n.amount)||0))}return[...t.entries()].map(([n,r])=>{const[a,s]=n.split(":");return{kind:a,currency:s,amount:r}})}
`;
  source = source.replace(financeAnchor, currencyHelpers + financeAnchor);

  const oldFinance = 'function wn(e,t,n,r){const a=e.filter(A=>BS(A.date,n,r)),s=t.filter(A=>BS(A.date,n,r)&&A?.status!=="voided"&&!A?.reversedAt),l=a.map(A=>ql(A.revenue)).filter(A=>A!==null),u=a.map(A=>ql(A.receipts)).filter(A=>A!==null),d=a.map(A=>ql(A.guests)).filter(A=>A!==null),f=s.filter(A=>bdIsLinkedPurchasePaymentV188(A)),m=s.filter(A=>!bdIsLinkedPurchasePaymentV188(A)&&Gm(A.category)==="operating"&&A.category!=="writeoff"),h=s.filter(A=>A.category==="writeoff"),g=s.filter(A=>!bdIsLinkedPurchasePaymentV188(A)&&Gm(A.category)==="inventory"),y=f.map(A=>ql(A.amount)).filter(A=>A!==null),j=g.map(A=>ql(A.amount)).filter(A=>A!==null),v=m.map(A=>ql(A.amount)).filter(A=>A!==null),b=h.map(A=>ql(A.amount)).filter(A=>A!==null),N=l.reduce((A,k)=>A+k,0),E=u.reduce((A,k)=>A+k,0),_=y.reduce((A,k)=>A+k,0),T=j.reduce((A,k)=>A+k,0),A=v.reduce((k,O)=>k+O,0),k=b.reduce((O,M)=>O+M,0),O=_+T+A+k,M=d.reduce((D,z)=>D+z,0),D=N-O;return{revenue:N,expenses:O,supplierPayments:_,legacyPurchaseExpenses:T,otherExpenses:A,writeoffs:k,cashMovement:D,operatingDiff:D,receipts:E,avgReceipt:E>0?Math.round(N/E):null,guests:d.length>0?M:null,daysWithData:a.length,hasRevenueData:a.length>0}}';
  const newFinance = 'function wn(e,t,n,r,a=bdMonthlyAccountingCurrencyV320(null,null)){const bdRevenueCurrency=bdMonthlyCurrencyPartitionV320(e.filter(C=>BS(C.date,n,r)),"revenue",a),bdExpenseCurrency=bdMonthlyCurrencyPartitionV320(t.filter(C=>BS(C.date,n,r)&&C?.status!=="voided"&&!C?.reversedAt),"expense",a),s=bdRevenueCurrency.included,l=bdExpenseCurrency.included,u=s.map(C=>ql(C.revenue)).filter(C=>C!==null),d=s.map(C=>ql(C.receipts)).filter(C=>C!==null),f=s.map(C=>ql(C.guests)).filter(C=>C!==null),m=l.filter(C=>bdIsLinkedPurchasePaymentV188(C)),h=l.filter(C=>!bdIsLinkedPurchasePaymentV188(C)&&Gm(C.category)==="operating"&&C.category!=="writeoff"),g=l.filter(C=>C.category==="writeoff"),y=l.filter(C=>!bdIsLinkedPurchasePaymentV188(C)&&Gm(C.category)==="inventory"),j=m.map(C=>ql(C.amount)).filter(C=>C!==null),v=y.map(C=>ql(C.amount)).filter(C=>C!==null),b=h.map(C=>ql(C.amount)).filter(C=>C!==null),N=g.map(C=>ql(C.amount)).filter(C=>C!==null),E=u.reduce((C,D)=>C+D,0),_=d.reduce((C,D)=>C+D,0),T=j.reduce((C,D)=>C+D,0),A=v.reduce((C,D)=>C+D,0),k=b.reduce((C,D)=>C+D,0),O=N.reduce((C,D)=>C+D,0),M=T+A+k+O,D=f.reduce((C,z)=>C+z,0),z=E-M,L=[...bdRevenueCurrency.excluded,...bdExpenseCurrency.excluded];return{revenue:E,expenses:M,supplierPayments:T,legacyPurchaseExpenses:A,otherExpenses:k,writeoffs:O,cashMovement:z,operatingDiff:z,receipts:_,avgReceipt:_>0?Math.round(E/_):null,guests:f.length>0?D:null,daysWithData:s.length,hasRevenueData:s.length>0,accountingCurrency:a,excludedForeignCurrencyEntries:L,excludedForeignCurrencyTotals:bdMonthlyExcludedCurrencyTotalsV320(L),unconvertedForeignCurrencyCount:L.length}}';
  if (!source.includes(oldFinance)) throw new Error("Canonical Finance summary body not found");
  source = source.replace(oldFinance, newFinance);

  const reportPrefixOld = 'function bdBuildMonthlyReport(e,t,n,r,a,s,l=[]){const u=bdMonthMeta(t),d=n.filter(q=>q.date.slice(0,7)===t),f=r.filter(q=>q.date.slice(0,7)===t&&q?.status!=="voided"&&!q?.reversedAt),m=[...a].sort((q,B)=>q.date.localeCompare(B.date))';
  const reportPrefixNew = 'function bdBuildMonthlyReport(e,t,n,r,a,s,l=[]){const u=bdMonthMeta(t),bdAccountingCurrency=bdMonthlyAccountingCurrencyV320(e,s),bdRevenueCurrency=bdMonthlyCurrencyPartitionV320(n.filter(q=>q.date.slice(0,7)===t),"revenue",bdAccountingCurrency),d=bdRevenueCurrency.included,bdExpenseCurrency=bdMonthlyCurrencyPartitionV320(r.filter(q=>q.date.slice(0,7)===t&&q?.status!=="voided"&&!q?.reversedAt),"expense",bdAccountingCurrency),f=bdExpenseCurrency.included,bdSnapshotCurrency=bdMonthlyCurrencyPartitionV320(a,"snapshot",bdAccountingCurrency),m=[...bdSnapshotCurrency.included].sort((q,B)=>q.date.localeCompare(B.date))';
  if (!source.includes(reportPrefixOld)) throw new Error("Monthly report prefix not found");
  source = source.replace(reportPrefixOld, reportPrefixNew);

  const purchaseOld = 'bdCanonicalPurchases=bdProcArray("bd_purchase_documents").filter(q=>q?.status==="confirmed"&&q?.documentType!=="price_list"&&String(q?.date||"").slice(0,7)===t&&Gm(q?.expenseCategory)==="inventory").map(q=>({...q,amount:Number(q.total)||0,area:bdExpenseArea(q)}))';
  const purchaseNew = 'bdCanonicalPurchaseSource=bdProcArray("bd_purchase_documents").filter(q=>q?.status==="confirmed"&&q?.documentType!=="price_list"&&String(q?.date||"").slice(0,7)===t&&Gm(q?.expenseCategory)==="inventory"),bdPurchaseCurrency=bdMonthlyCurrencyPartitionV320(bdCanonicalPurchaseSource,"purchase",bdAccountingCurrency),bdCanonicalPurchases=bdPurchaseCurrency.included.map(q=>({...q,amount:Number(q.total)||0,area:bdExpenseArea(q)}))';
  if (!source.includes(purchaseOld)) throw new Error("Monthly purchase source not found");
  source = source.replace(purchaseOld, purchaseNew);

  const returnOld = 'return{meta:u,status:ce&&!bdInventoryMismatch?"closed":"preliminary"';
  const returnNew = 'const bdCurrencyExclusions=[...bdRevenueCurrency.excluded,...bdExpenseCurrency.excluded,...bdPurchaseCurrency.excluded,...bdSnapshotCurrency.excluded];return{meta:u,accountingCurrency:bdAccountingCurrency,excludedForeignCurrencyEntries:bdCurrencyExclusions,excludedForeignCurrencyTotals:bdMonthlyExcludedCurrencyTotalsV320(bdCurrencyExclusions),unconvertedForeignCurrencyCount:bdCurrencyExclusions.length,currencyBoundaryStatus:bdCurrencyExclusions.length?"unconverted_foreign_excluded":"accounting_currency_only",status:ce&&!bdInventoryMismatch?"closed":"preliminary"';
  if (!source.includes(returnOld)) throw new Error("Monthly report return anchor not found");
  source = source.replace(returnOld, returnNew);

  source = source.replace(
    'function Rz(e,t,n){const r=e.filter(s=>BS(s.date,t,n)&&bdIsLinkedPurchasePaymentV188(s)),a=new Map;',
    'function Rz(e,t,n){const r=bdMonthlyCurrencyPartitionV320(e.filter(s=>BS(s.date,t,n)&&bdIsLinkedPurchasePaymentV188(s)),"expense",bdMonthlyAccountingCurrencyV320(null,null)).included,a=new Map;',
  );

  source = source.replace(
    'const s=bdProcProductKey(r),l=String(n.supplierId||n.supplierName||"unknown"),u=s+"|"+l,d={productKey:s,',
    'const s=bdProcProductKey(r),l=String(n.supplierId||n.supplierName||"unknown"),bdOfferCurrency=bdMonthlyCurrencyCodeV320(n.currency,"RUB"),u=s+"|"+bdOfferCurrency+"|"+l,d={productKey:s,',
  );
  source = source.replace(
    'const a=n.get(r.productKey)||[];a.push(r),n.set(r.productKey,a)',
    'const bdComparisonKey=r.productKey+"|"+bdMonthlyCurrencyCodeV320(r.currency,"RUB"),a=n.get(bdComparisonKey)||[];a.push(r),n.set(bdComparisonKey,a)',
  );
  source = source.replace(
    'const s=String(n.supplierId||n.supplierName||"unknown")+"|"+bdProcProductKey(r),l=t.get(s)||[];',
    'const s=String(n.supplierId||n.supplierName||"unknown")+"|"+bdProcProductKey(r)+"|"+bdMonthlyCurrencyCodeV320(n.currency,"RUB"),l=t.get(s)||[];',
  );

  source = source.replace(
    'const f=d.snapshot&&typeof d.snapshot==="object"?d.snapshot:{},m=(h,g)=>bdClosedSnapshotValue(f,h,g)',
    'if(u.unconvertedForeignCurrencyCount>0)return{...u,closure:d,closedAt:d.closedAt||null,currencyBoundaryStatus:"unconverted_foreign_excluded"};const f=d.snapshot&&typeof d.snapshot==="object"?d.snapshot:{},m=(h,g)=>bdClosedSnapshotValue(f,h,g)',
  );

  source = source.replaceAll('label:"Закупки и расходы"', 'label:"Закупки + начисления"');
  source = source.replaceAll('r.final?"Чистая прибыль":"Предвар. результат"', 'r.final?"Чистая прибыль":"Результат до себестоимости"');

  const homeTail = 'i.jsx("div",{className:"bd-home-money-kpis",children:u.map(d=>i.jsxs("span",{className:"bd-home-money-kpi",children:[i.jsx("small",{children:d.label}),i.jsx("strong",{className:d.tone,children:d.value})]},d.label))})]})}';
  const homeTailNew = 'i.jsx("div",{className:"bd-home-money-kpis",children:u.map(d=>i.jsxs("span",{className:"bd-home-money-kpi",children:[i.jsx("small",{children:d.label}),i.jsx("strong",{className:d.tone,children:d.value})]},d.label))}),e.unconvertedForeignCurrencyCount>0&&i.jsx("p",{className:"bd-home-currency-boundary-v320",children:"Иностранная валюта без исторического курса показана отдельно и не включена в "+e.accountingCurrency})]})}';
  if (!source.includes(homeTail)) throw new Error("Home money card tail not found");
  source = source.replace(homeTail, homeTailNew);

  const financeArraysOld = 'monthRevenue=S.useMemo(()=>revenue.filter(e=>e.date.slice(0,7)===monthKey),[revenue,monthKey]),monthExpenses=S.useMemo(()=>expenses.filter(e=>e.date.slice(0,7)===monthKey&&e?.status!=="voided"&&!e?.reversedAt),[expenses,monthKey])';
  const financeArraysNew = 'bdFinanceAccountingCurrency=bdMonthlyAccountingCurrencyV320(profile,financeSettings),monthRevenue=S.useMemo(()=>bdMonthlyCurrencyPartitionV320(revenue.filter(e=>e.date.slice(0,7)===monthKey),"revenue",bdFinanceAccountingCurrency).included,[revenue,monthKey,bdFinanceAccountingCurrency]),monthExpenses=S.useMemo(()=>bdMonthlyCurrencyPartitionV320(expenses.filter(e=>e.date.slice(0,7)===monthKey&&e?.status!=="voided"&&!e?.reversedAt),"expense",bdFinanceAccountingCurrency).included,[expenses,monthKey,bdFinanceAccountingCurrency])';
  if (!source.includes(financeArraysOld)) throw new Error("Finance chart arrays anchor not found");
  source = source.replace(financeArraysOld, financeArraysNew);

  const supplierMonthlyOld = 'M=new Date().toISOString().slice(0,7),D=u.filter(p=>p.status==="confirmed"&&p.documentType!=="price_list"&&String(p.date||"").startsWith(M)).reduce((p,c)=>p+(Number(c.total)||0),0),z=s.filter';
  const supplierMonthlyNew = 'M=new Date().toISOString().slice(0,7),bdSupplierAccountingCurrency=bdMonthlyAccountingCurrencyV320(null,null),bdSupplierMonthCurrency=bdMonthlyCurrencyPartitionV320(u.filter(p=>p.status==="confirmed"&&p.documentType!=="price_list"&&String(p.date||"").startsWith(M)),"purchase",bdSupplierAccountingCurrency),D=bdSupplierMonthCurrency.included.reduce((p,c)=>p+(Number(c.total)||0),0),bdSupplierExcludedTotals=bdMonthlyExcludedCurrencyTotalsV320(bdSupplierMonthCurrency.excluded),z=s.filter';
  if (!source.includes(supplierMonthlyOld)) throw new Error("Supplier monthly total anchor not found");
  source = source.replace(supplierMonthlyOld, supplierMonthlyNew);
  source = source.replace(
    'i.jsxs("div",{className:"bd-procurement-stats",children:[',
    'i.jsxs("div",{className:"bd-procurement-stats",children:[',
  );
  const supplierStatsTail = 'i.jsxs("div",{className:"bd-procurement-stat",children:[i.jsx("strong",{children:L}),i.jsx("span",{children:"Выгодных замен"})]})]}),A&&';
  const supplierStatsTailNew = 'i.jsxs("div",{className:"bd-procurement-stat",children:[i.jsx("strong",{children:L}),i.jsx("span",{children:"Выгодных замен"})]})]}),bdSupplierMonthCurrency.excluded.length>0&&i.jsx(bdMonthlyCurrencyBoundaryNoticeV320,{report:{accountingCurrency:bdSupplierAccountingCurrency,excludedForeignCurrencyTotals:bdSupplierExcludedTotals}}),A&&';
  if (!source.includes(supplierStatsTail)) throw new Error("Supplier stats tail not found");
  source = source.replace(supplierStatsTail, supplierStatsTailNew);

  const freshnessAnchor = "function d7(e,t){";
  if (!source.includes(freshnessAnchor)) throw new Error("Action plan lifecycle anchor not found");
  const freshness = String.raw`const bdActionPlanFreshnessV320="evidence-window-v320";
function bdActionPlanEvidenceTimesV320(e,t){const n=[];function r(a){if(typeof a!=="string")return;for(const s of a.matchAll(/\d{4}-\d{2}-\d{2}(?:T[^\s,;]*)?/g)){const l=Date.parse(s[0]);Number.isFinite(l)&&n.push(l)}}r(e?.diagnosisDate),r(e?.createdAt);for(const a of t){r(a?.evidenceObservedAt),r(a?.observedAt),r(a?.factPeriod),r(a?.periodEnd);for(const s of Array.isArray(a?.evidence)?a.evidence:[])typeof s==="string"?r(s):(r(s?.observedAt),r(s?.date),r(s?.factPeriod),r(s?.periodEnd))}return n}
function bdActionPlanIsStaleV320(e,t,n=new Date){const r=bdActionPlanEvidenceTimesV320(e,t);if(r.length===0)return!1;const a=Math.max(...r),s=n instanceof Date?n.getTime():Date.parse(String(n));return Number.isFinite(s)&&(s-a)/(864e5)>Voe}
`;
  source = source.replace(freshnessAnchor, freshness + freshnessAnchor);
  source = source.replace(
    'if(s.status==="active"){const l=t.filter(d=>s.taskIds.includes(d.id));if(l.length>0&&l.every(d=>d.status==="completed"||d.status==="cancelled"))',
    'if(s.status==="active"){const l=t.filter(d=>s.taskIds.includes(d.id));if(bdActionPlanIsStaleV320(s,l,n))return{...s,status:"stale",freshnessStatus:"expired",staleReason:"evidence_window_expired",staleAt:n.toISOString()};if(l.length>0&&l.every(d=>d.status==="completed"||d.status==="cancelled"))',
  );

  const monthlyPageAnchor = "function bdMonthlyReportPage()";
  if (!source.includes(monthlyPageAnchor)) throw new Error("Monthly report page anchor not found");
  const notice = String.raw`function bdMonthlyCurrencyBoundaryNoticeV320({report:e}){const t=(e?.excludedForeignCurrencyTotals||[]).filter(n=>Number(n.amount)!==0),n={purchase:"Закупки",expense:"Платежи/расходы",revenue:"Выручка",snapshot:"Остатки"};return t.length?i.jsxs("section",{"data-bd-currency-boundary":"v320",className:"bd-monthly-currency-boundary-v320",role:"status",children:[i.jsx("strong",{children:"Иностранная валюта не включена в "+e.accountingCurrency}),i.jsx("p",{children:t.map(r=>(n[r.kind]||r.kind)+": "+new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(Number(r.amount))+" "+r.currency).join(" · ")+" — нет сохранённого исторического курса."})]}):null}
`;
  source = source.replace(monthlyPageAnchor, notice + monthlyPageAnchor);
  source = source.replace(
    'i.jsx(bdMonthlyHeroV165,{report,previous}),i.jsx(bdMonthlyReadinessV165',
    'i.jsx(bdMonthlyHeroV165,{report,previous}),i.jsx(bdMonthlyCurrencyBoundaryNoticeV320,{report}),i.jsx(bdMonthlyReadinessV165',
  );
  source = source.replace(
    'const hasFinancialData=report.revenue>0||report.periodExpenses>0||report.payroll>0;',
    'const hasFinancialData=report.revenue>0||report.periodExpenses>0||report.payroll>0||report.unconvertedForeignCurrencyCount>0;',
  );
}

source = source.replace(
  'function bdMonthlyExcludedCurrencyTotalsV320(e){const t={};for(const n of e)t[n.sourceCurrency]=(t[n.sourceCurrency]||0)+(Number(n.amount)||0);return t}',
  'function bdMonthlyExcludedCurrencyTotalsV320(e){const t=new Map;for(const n of e){const r=n.kind+":"+n.sourceCurrency;t.set(r,(t.get(r)||0)+(Number(n.amount)||0))}return[...t.entries()].map(([n,r])=>{const[a,s]=n.split(":");return{kind:a,currency:s,amount:r}})}',
);
source = source.replace(
  'const s=bdProcProductKey(r),l=String(n.supplierId||n.supplierName||"unknown"),u=s+"|"+l,d={productKey:s,',
  'const s=bdProcProductKey(r),l=String(n.supplierId||n.supplierName||"unknown"),bdOfferCurrency=bdMonthlyCurrencyCodeV320(n.currency,"RUB"),u=s+"|"+bdOfferCurrency+"|"+l,d={productKey:s,',
);
source = source.replace(
  'const a=n.get(r.productKey)||[];a.push(r),n.set(r.productKey,a)',
  'const bdComparisonKey=r.productKey+"|"+bdMonthlyCurrencyCodeV320(r.currency,"RUB"),a=n.get(bdComparisonKey)||[];a.push(r),n.set(bdComparisonKey,a)',
);
source = source.replace(
  'const s=String(n.supplierId||n.supplierName||"unknown")+"|"+bdProcProductKey(r),l=t.get(s)||[];',
  'const s=String(n.supplierId||n.supplierName||"unknown")+"|"+bdProcProductKey(r)+"|"+bdMonthlyCurrencyCodeV320(n.currency,"RUB"),l=t.get(s)||[];',
);
source = source.replace(
  'M=new Date().toISOString().slice(0,7),D=u.filter(p=>p.status==="confirmed"&&p.documentType!=="price_list"&&String(p.date||"").startsWith(M)).reduce((p,c)=>p+(Number(c.total)||0),0),z=s.filter',
  'M=new Date().toISOString().slice(0,7),bdSupplierAccountingCurrency=bdMonthlyAccountingCurrencyV320(null,null),bdSupplierMonthCurrency=bdMonthlyCurrencyPartitionV320(u.filter(p=>p.status==="confirmed"&&p.documentType!=="price_list"&&String(p.date||"").startsWith(M)),"purchase",bdSupplierAccountingCurrency),D=bdSupplierMonthCurrency.included.reduce((p,c)=>p+(Number(c.total)||0),0),bdSupplierExcludedTotals=bdMonthlyExcludedCurrencyTotalsV320(bdSupplierMonthCurrency.excluded),z=s.filter',
);
source = source.replace(
  'i.jsxs("div",{className:"bd-procurement-stat",children:[i.jsx("strong",{children:L}),i.jsx("span",{children:"Выгодных замен"})]})]}),A&&',
  'i.jsxs("div",{className:"bd-procurement-stat",children:[i.jsx("strong",{children:L}),i.jsx("span",{children:"Выгодных замен"})]})]}),bdSupplierMonthCurrency.excluded.length>0&&i.jsx(bdMonthlyCurrencyBoundaryNoticeV320,{report:{accountingCurrency:bdSupplierAccountingCurrency,excludedForeignCurrencyTotals:bdSupplierExcludedTotals}}),A&&',
);
source = source.replace(
  'function bdMonthlyCurrencyBoundaryNoticeV320({report:e}){const t=Object.entries(e?.excludedForeignCurrencyTotals||{}).filter(([,n])=>Number(n)!==0);return t.length?i.jsxs("section",{"data-bd-currency-boundary":"v320",className:"bd-monthly-currency-boundary-v320",role:"status",children:[i.jsx("strong",{children:"Иностранная валюта не включена в "+e.accountingCurrency}),i.jsx("p",{children:t.map(([n,r])=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(Number(r))+" "+n).join(" · ")+" — нет сохранённого исторического курса."})]}):null}',
  'function bdMonthlyCurrencyBoundaryNoticeV320({report:e}){const t=(e?.excludedForeignCurrencyTotals||[]).filter(n=>Number(n.amount)!==0),n={purchase:"Закупки",expense:"Платежи/расходы",revenue:"Выручка",snapshot:"Остатки"};return t.length?i.jsxs("section",{"data-bd-currency-boundary":"v320",className:"bd-monthly-currency-boundary-v320",role:"status",children:[i.jsx("strong",{children:"Иностранная валюта не включена в "+e.accountingCurrency}),i.jsx("p",{children:t.map(r=>(n[r.kind]||r.kind)+": "+new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(Number(r.amount))+" "+r.currency).join(" · ")+" — нет сохранённого исторического курса."})]}):null}',
);

let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes(".bd-monthly-currency-boundary-v320")) {
  css += '\n.bd-monthly-currency-boundary-v320{display:grid;gap:5px;padding:14px 16px;border:1px solid #e5bd69;border-radius:14px;background:#fff8e8;color:#5e4511}.bd-monthly-currency-boundary-v320 strong{font-size:14px}.bd-monthly-currency-boundary-v320 p{margin:0;font-size:13px;line-height:1.45}.bd-home-currency-boundary-v320{margin:10px 0 0;padding:9px 11px;border-radius:10px;background:#fff8e8;color:#765714;font-size:12px;line-height:1.4}\n';
}

let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!new RegExp(`index-BQGspy0I\\.js\\?v=[^\"]*${cacheToken}`).test(bootstrap)) {
  bootstrap = bootstrap.replace(/(script\.src = "\/assets\/index-BQGspy0I\.js\?v=[^"]+)";/, `$1-${cacheToken}";`);
}
let appHtml = fs.readFileSync(appHtmlPath, "utf8");
if (!new RegExp(`catalog\\.css\\?v=[^\"]*${cacheToken}`).test(appHtml)) {
  appHtml = appHtml.replace(/(href="\/catalog\.css\?v=[^"]+)"/, `$1-${cacheToken}"`);
}
if (!new RegExp(`bardoctor-preview\\.js\\?v=[^\"]*${cacheToken}`).test(appHtml)) {
  appHtml = appHtml.replace(/(src="\/bardoctor-preview\.js\?v=[^"]+)"/, `$1-${cacheToken}"`);
}

fs.writeFileSync(bundlePath, source);
fs.writeFileSync(cssPath, css);
fs.writeFileSync(bootstrapPath, bootstrap);
fs.writeFileSync(appHtmlPath, appHtml);
console.log("Calculation audit client safeguards v320 applied");
