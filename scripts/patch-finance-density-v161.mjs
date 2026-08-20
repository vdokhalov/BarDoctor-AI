import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (
  source.includes('"data-bd-finance-density":"v161"') &&
  source.includes("!bdLinkedDocument&&bdCanManageFinance")
) {
  console.log("Finance density v161 is already applied.");
  process.exit(0);
}

const replaceFunction = (name, nextName, replacement) => {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  if (start === -1 || end === -1) {
    throw new Error(`Could not locate ${name} for Finance density v161.`);
  }
  source = source.slice(0, start) + replacement + "\n" + source.slice(end);
};

const monthResult = String.raw`function bdFinanceMonthResultV160({report:e,hasData:t,onContinue:n}){if(!e)return null;const r=e.cashResult??(e.resultBeforeCost==null?null:e.resultBeforeCost-(Number(e.purchases)||0)),a=e.resultBeforeCost??null,s=e.operatingResult??null,l=[{key:"cash",label:"После закупок",fullLabel:"Результат после закупок",caption:"закупки и начисленные расходы",value:t?r:null},{key:"before-cost",label:"До себестоимости",fullLabel:"Операционный результат до себестоимости",caption:"операционный результат",value:t?a:null},{key:"final",label:"Чистая прибыль",fullLabel:"Финальный финансовый результат / чистая прибыль",caption:e.isClosed?"месяц закрыт":s!==null?"по внесённым остаткам":"ещё не рассчитана",value:t?s:null}],u=bdFinanceFinalReasonV160(e,t),d=e.isClosed?"closed":s!==null?"ready":"pending";return i.jsxs("section",{"data-bd-finance-result-month":"v160",className:"bd-finance-result-v160",children:[i.jsxs("header",{children:[i.jsx("p",{children:"Финансовый результат месяца"}),i.jsx("span",{className:"bd-finance-result-state "+d,children:e.isClosed?"Месяц закрыт":s!==null?"Расчёт готов":"Не завершён"})]}),i.jsx("div",{className:"bd-finance-result-flow",children:l.map((f,m)=>i.jsxs("div",{className:"bd-finance-result-level-wrap",children:[i.jsxs("article",{"data-bd-finance-result-level":f.key,"aria-label":f.fullLabel,className:"bd-finance-result-level "+(f.value===null?"muted":f.value>=0?"positive":"negative"),children:[i.jsx("span",{title:f.fullLabel,children:f.label}),i.jsx("strong",{children:f.value===null?"—":bdMoney2(f.value)}),i.jsx("small",{children:f.caption})]}),m<l.length-1&&i.jsx(Br,{size:16,className:"bd-finance-result-arrow","aria-hidden":!0})]},f.key))}),i.jsxs("div",{className:"bd-finance-result-footer "+d,children:[i.jsxs("div",{children:[i.jsx(Pn,{size:16,"aria-hidden":!0}),i.jsx("span",{children:u})]}),!e.isClosed&&i.jsxs("button",{type:"button",onClick:n,children:["Продолжить закрытие",i.jsx(Br,{size:15,"aria-hidden":!0})]})]})]})}`;

const kpis = String.raw`function bdFinanceKpisV160({report:e,hasData:t,period:n,previous:r,onRevenue:a,onExpenses:s,onPayroll:l}){if(!e)return null;const u=t&&e.receipts>0?Math.round(e.revenue/e.receipts):null,d=t&&e.revenue>0?Math.round(e.payroll/e.revenue*1e3)/10:null,f=e.expenseBreakdown?.find(h=>h.label==="Не распределено")?.amount??0,m=n?.hasRevenueData&&r?.hasRevenueData?yd(n.revenue,r.revenue):null,g=n?.avgReceipt!==null&&r?.avgReceipt!==null&&r?.hasRevenueData?yd(n.avgReceipt,r.avgReceipt):null;return i.jsx("section",{"aria-label":"Ключевые финансовые показатели",className:"bd-finance-kpis-v160",children:[{key:"revenue",label:"Выручка",value:t?bdMoney2(e.revenue):"—",meta:e.receipts>0?e.receipts+" "+bdFinancePluralV160(e.receipts,"чек","чека","чеков"):"Нет чеков",trend:m,onClick:a},{key:"expenses",label:"Расходы",value:t?bdMoney2(e.periodExpenses):"—",meta:f>0?"Не распределено "+bdMoney2(f):(e.expenseBreakdown?.length||0)+" "+bdFinancePluralV160(e.expenseBreakdown?.length||0,"категория","категории","категорий"),warning:f>0,onClick:s},{key:"payroll",label:"ФОТ",value:t?bdMoney2(e.payroll):"—",meta:d!==null?String(d).replace(".",",")+"% от выручки":"Доля не рассчитана",onClick:l},{key:"receipt",label:"Средний чек",value:u!==null?bdMoney2(u):"—",meta:e.receipts>0?"По "+e.receipts+" чекам":"Нет данных",trend:g}].map(h=>i.jsxs("button",{type:"button",className:"bd-finance-kpi "+h.key,onClick:h.onClick,disabled:!h.onClick,children:[i.jsx("span",{children:h.label}),i.jsx("strong",{children:h.value}),i.jsx("small",{className:h.warning?"warning":"",children:h.meta}),h.trend!==null&&h.trend!==void 0&&i.jsx("em",{className:"bd-finance-kpi-trend",title:"Сравнение с прошлым периодом",children:i.jsx(rm,{percent:h.trend})})]},h.key))})}`;

const expenseRecords = String.raw`function bdFinanceExpenseRecordsV160({records:e,equipment:t,documents:n,canManage:r,onView:a,onDelete:s}){return e.length===0?i.jsx("div",{className:"bd-finance-detail-empty",children:"Нет записей о расходах за этот месяц."}):i.jsx(qe,{mode:"popLayout",children:e.map(l=>{const u=l.category==="repairs"&&l.equipmentId?t.find(v=>v.id===l.equipmentId):void 0,bdLinkedDocument=l.sourceDocumentId?n.find(v=>v.id===l.sourceDocumentId):void 0,bdCanManageFinance=r,f=l.category==="other"?l.customCategoryLabel||"Прочее":Lg[l.category],m=bdLinkedDocument?.supplierName||l.description||f,g=[sg(l.date),f,bdLinkedDocument?.supplierName&&m!==bdLinkedDocument.supplierName?bdLinkedDocument.supplierName:null,l.area].filter(Boolean).join(" · ");return i.jsxs(W.div,{layout:!0,initial:{opacity:0,y:4},animate:{opacity:1,y:0},exit:{opacity:0},className:"bd-finance-record-v160 expense",children:[i.jsxs("button",{type:"button",className:"bd-finance-record-main",onClick:()=>a({type:"expense",record:l}),children:[i.jsxs("span",{className:"bd-finance-record-copy",children:[i.jsx("strong",{children:m}),i.jsx("span",{children:g}),l.category==="repairs"&&i.jsx("small",{className:u?"":"warning",children:u?u.name:"Оборудование не выбрано"}),bdLinkedDocument&&i.jsx("small",{children:bdProcDocLabel(bdLinkedDocument.documentType)+" · "+(bdLinkedDocument.items?.length||0)+" позиций"})]}),i.jsx("b",{children:Mn(l.amount)}),i.jsx(Br,{size:16,"aria-hidden":!0})]}),!bdLinkedDocument&&bdCanManageFinance&&i.jsx("button",{type:"button",className:"bd-finance-record-delete",onClick:()=>s({type:"expense",id:l.id}),"aria-label":"Удалить расход",children:i.jsx(Ra,{size:16,"aria-hidden":!0})})]},l.id)})})}`;

replaceFunction("bdFinanceMonthResultV160", "bdFinanceKpisV160", monthResult);
replaceFunction("bdFinanceKpisV160", "bdFinanceReadinessV160", kpis);
replaceFunction("bdFinanceExpenseRecordsV160", "bdFinanceDetailV160", expenseRecords);

source = source
  .replace(
    '"data-bd-finance-dashboard":"v160",className:"bd-finance-page-v160"',
    '"data-bd-finance-dashboard":"v160","data-bd-finance-density":"v161",className:"bd-finance-page-v160"',
  )
  .replace(
    'bdFinanceKpisV160,{report:monthlyReport,hasData:hasFinancialData,onRevenue:',
    'bdFinanceKpisV160,{report:monthlyReport,hasData:hasFinancialData,period:periodContext.month,previous:periodContext.prevMonth,onRevenue:',
  );

if (!source.includes('"data-bd-finance-density":"v161"')) {
  throw new Error("Finance density v161 marker was not applied.");
}
if (!source.includes("period:periodContext.month,previous:periodContext.prevMonth")) {
  throw new Error("Finance KPI period comparison contract was not applied.");
}

await writeFile(bundlePath, source);
console.log("Finance density v161 applied.");
