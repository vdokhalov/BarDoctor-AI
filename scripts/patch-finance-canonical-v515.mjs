import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const marker = '/* finance-canonical-v515 */';
const status = `${marker}
function bdFinanceCanonicalStatusV515({verified,monthKey,venueId}){
  if(!verified.report)return i.jsxs("section",{"data-bd-finance-canonical-status":"v515",role:verified.error?"alert":"status",children:[i.jsx("p",{children:verified.error||"Проверяем данные месяца…"}),verified.error&&i.jsx("button",{type:"button",onClick:verified.retry,children:"Повторить"})]});
  return i.jsxs(i.Fragment,{children:[["LEGACY_PARTIAL","INVALID"].includes(verified.evidenceStatus)&&i.jsx("p",{role:"status",children:"Показан сохранённый исторический отчёт. Полнота и происхождение исходных данных не подтверждены; суммы не пересчитаны."}),i.jsx(bdMonthlyPendingReasonsV513,{reasons:verified.reasons,reasonDetails:verified.reasonDetails,reasonDetailsTruncated:verified.reasonDetailsTruncated,monthKey,venueId})]});
}
`;
function replaceOne(source, before, after) {
  if(source.includes(after))return source;
  if(source.split(before).length!==2)throw new Error('Finance canonical v515 anchor absent or ambiguous: '+before.slice(0,90));
  return source.replace(before,after);
}
export function patchFinanceCanonicalV515(source) {
  source=replaceOne(source,
    'monthlyReport=S.useMemo(()=>profile?bdBuildMonthlyReport(profile,monthKey,revenue,expenses,financeSnapshots,financeSettings,gapReasons):null,[profile,monthKey,revenue,expenses,financeSnapshots,financeSettings,gapReasons])',
    'bdFinanceRevisionV515=S.useMemo(()=>({}),[profile,revenue,expenses,financeSnapshots,financeSettings,gapReasons]),bdFinanceVerifiedV515=bdUseMonthlyReportV513(bdMonthlyVenueIdPhase7(profile,financeSettings),monthKey,bdFinanceRevisionV515),monthlyReport=bdFinanceVerifiedV515.report');
  source=replaceOne(source,
    'monthlyReport&&i.jsx(bdFinanceMonthResultV160,',
    'i.jsx(bdFinanceCanonicalStatusV515,{verified:bdFinanceVerifiedV515,monthKey,venueId:bdMonthlyVenueIdPhase7(profile,financeSettings)}),monthlyReport&&i.jsx(bdFinanceMonthResultV160,');
  const finalReason='function bdFinanceFinalReasonV160(e,t){if(!t)return"Нет финансовых данных за выбранный месяц";if(e.isClosed)return"Показан сохранённый итог закрытого месяца";if(e.operatingResult!=null)return"Расчёт готов по проверенным данным — завершите закрытие месяца";return"Итог не подтверждён — причины проверки показаны ниже"}';
  if(!source.includes(finalReason)){
    const matches=source.match(/function bdFinanceFinalReasonV160\([^\n]+/g);
    if(matches?.length!==1)throw new Error('Unique Finance final reason helper required');
    source=source.replace(matches[0],finalReason);
  }
  source=replaceOne(source,
    'hasFinancialData=!!(monthlyReport&&(monthRevenue.length>0||monthExpenses.length>0||monthlyReport.openingInventory!==null||monthlyReport.closingInventory!==null))',
    'hasFinancialData=!!(monthlyReport&&(monthlyReport.isClosed||monthlyReport.revenue>0||monthlyReport.periodExpenses>0||monthlyReport.payroll>0||monthlyReport.receipts>0||monthlyReport.dataShiftCount>0||monthlyReport.accountedShifts>0||monthlyReport.openingInventory!=null||monthlyReport.closingInventory!=null))');
  source=replaceOne(source,
    'e.inventoryMismatch&&d.push({key:"mismatch",label:"Есть расхождение остатков",action:a});',
    '/* Canonical month-close reasons are rendered separately; inventoryMismatch is not proof of a physical difference. */');
  source=replaceOne(source,
    'i.jsx(bdFinanceQuickActionsV160,{navigate,monthKey,onCloseMonth:bdFinanceOpenMonthCloseV160})',
    'i.jsx(bdFinanceQuickActionsV160,{navigate,monthKey,onCloseMonth:()=>navigate("/reports?month="+encodeURIComponent(monthKey)+"&closeMonth=1")})');
  source=replaceOne(source,
    'i.jsx(bdMonthClosingLauncher,{settings:financeSettings,report:monthlyReport,revenues:monthRevenue,expenses:monthExpenses,monthKey,navigate})',
    'monthlyReport&&i.jsx(bdMonthClosingLauncher,{settings:financeSettings,report:monthlyReport,revenues:monthRevenue,expenses:monthExpenses,monthKey,navigate},monthKey)');
  if(!source.includes(marker))source=replaceOne(source,'function BAe(){',status+'function BAe(){');
  return source;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const file=path.join(root,'public/assets/index-BQGspy0I.js'),source=fs.readFileSync(file,'utf8'),output=patchFinanceCanonicalV515(source);
  if(patchFinanceCanonicalV515(output)!==output)throw new Error('Finance canonical v515 is not replay stable');
  if(source!==output)fs.writeFileSync(file,output);
  console.log('Finance canonical v515 server report applied');
}
