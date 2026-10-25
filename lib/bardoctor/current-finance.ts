import {serviceAccruals} from './service-accruals';
import {shiftRevenues} from "./work-shifts";
import { calculateWorkdayPayroll, workdayPayrollRequirements } from './workday-payroll';
import { derivedInputBelongs } from './derived-input-scope';
import { finiteBusinessNumber } from './business-day-rows';
import {periodCostProof} from './financial-period-proof';
import { historicalPeriodCost } from "./financial-reconciliation";
import { readFinanceInputs, type FinanceReadInput, financeAmount } from './finance-inputs';
import { businessRecord as row, scopedBusinessRows, activeBusinessRow } from './business-day-rows';
import { venueDate, venueTimeFromJson } from './venue-time';

export type CurrentCostSourceStates = Partial<Record<"bd_sales_events_v1" | "bd_stock_movements" | "bd_sales_documents" | "bd_sales_batches" | "bd_sales_reconciliations_v1", "AVAILABLE" | "ABSENT" | "UNAVAILABLE">>;

/** Recorded current-period result, never purchases-as-COGS or a closed-month profit. */
export function currentFinance(input: FinanceReadInput & { profile: Record<string, unknown>; purchases?: unknown[]; purchasesAvailable?: boolean; payrollEstimateSources?: {employees: unknown[]; rules: unknown[]; gaps: unknown[]}; movements?: unknown[]; batches?: unknown[]; reconciliations?: unknown[]; costProof?: object; costInputsAvailable?: boolean; costSourceStates?: CurrentCostSourceStates }) {
 const endDate = venueDate(input.asOf, venueTimeFromJson(JSON.stringify(input.profile)).timezone);
 const startDate = endDate.slice(0,7)+'-01';
 const purchasePayment = (x:Record<string,unknown>) => x.category==='inventory' || x.source==='purchase_payment' || x.source==='purchase_document' || x.paymentKind==='supplier_payment';
 const expenses=(input.expenses??[]).map(row);
 const accrual=serviceAccruals({...input,startDate,endDate});
 const value=readFinanceInputs({...input,startDate,endDate,expenses:accrual.expenses.filter(x=>!purchasePayment(x))});
 const missing=[...value.missing,...accrual.issues,...(input.purchasesAvailable===false?['SERVICE_SOURCE_UNAVAILABLE']:[])];
 if(!value.days.length)missing.push('NO_CURRENT_ACTIVITY');
 const missingPayrollDates=value.payrollByDay.filter(x=>x.amount==null).map(x=>x.businessDate);
 const knownDays=value.payrollByDay.filter(x=>x.recordedAmount!=null);
 const knownPayrollSubtotal=knownDays.length?Math.round(knownDays.reduce((sum,x)=>sum+x.recordedAmount!,0)*100)/100:null;
 const paymentRows=scopedBusinessRows(expenses,{venueId:input.venueId,workspaceId:input.workspaceId,dataAccountId:input.dataAccountId}).filter(x=>activeBusinessRow(x)&&purchasePayment(x)&&String(x.date)>=startDate&&String(x.date)<=endDate);
 const paymentAmounts=paymentRows.map(x=>financeAmount(x,'amount',input.currency));
 const purchasePayments=input.expensesAvailable===false||paymentAmounts.some(x=>x==null)?null:paymentAmounts.reduce<number>((sum,x)=>sum+x!,0);
 const resultBeforeCost=missing.length?null:value.preliminaryResult;
 const throughDate = (values:unknown[] = []) => scopedBusinessRows(values,{venueId:input.venueId,workspaceId:input.workspaceId,dataAccountId:input.dataAccountId}).filter(x=>{
  const date=String(x.businessDate??x.date??'').slice(0,10);return date>=startDate&&date<=endDate;
 });
 const history=periodCostProof(input.costProof,endDate.slice(0,7))??historicalPeriodCost({venueId:input.venueId,monthKey:endDate.slice(0,7),accountingCurrency:input.currency??'',revenues:value.revenueRows,events:throughDate(input.events),documents:throughDate(input.documents),movements:throughDate(input.movements),batches:throughDate(input.batches),reconciliations:throughDate(input.reconciliations)});
 // A confirmed absent unused channel is empty, not a failed/truncated read.
 // Stock history remains required to establish whether adjustments exist.
 const required = new Set<string>(["bd_stock_movements"]);
 if(value.revenueRows.some(x=>x.revenueSource==='sales_events_v1'))required.add('bd_sales_events_v1');
 if(value.revenueRows.some(x=>x.revenueSource==='sales_documents')){required.add('bd_sales_documents');required.add('bd_sales_batches');}
 const sourceKeys = ['bd_sales_events_v1','bd_stock_movements','bd_sales_documents','bd_sales_batches','bd_sales_reconciliations_v1'] as const;
 const sourcesKnown = input.costSourceStates ? sourceKeys.every(key=>(key==='bd_sales_reconciliations_v1'&&input.costSourceStates![key]==null&&input.reconciliations==null)||input.costSourceStates![key]==='AVAILABLE'||input.costSourceStates![key]==='ABSENT'&&!required.has(key)) : input.costInputsAvailable===true;
 const costKnown=sourcesKnown&&history.salesCostKnown;
 const adjustmentsKnown=sourcesKnown&&history.adjustmentsKnown;
 const assessmentKnown=costKnown&&adjustmentsKnown;
 const resultAfterCost=resultBeforeCost!=null&&assessmentKnown?Math.round((resultBeforeCost-history.cost+history.adjustment)*100)/100:null;
 // Recalculate an OPEN workday from the current authorized rule snapshot, never recorded payroll.
 // Saved staffing is required; the saved total is never reused. Closing,
 // missing facts, malformed drafts and unavailable rules still fail closed.
 const estimateScope={venueId:input.venueId,workspaceId:input.workspaceId,dataAccountId:input.dataAccountId};
 const estimateSources=input.payrollEstimateSources;
 const employees=scopedBusinessRows(estimateSources?.employees??[],estimateScope);
 const rules=scopedBusinessRows(estimateSources?.rules??[],estimateScope);
 const estimatedPayrollDays=value.payrollByDay.filter(day=>day.amount==null).map(day=>{
  const reports=scopedBusinessRows(input.reports??[],estimateScope).filter(x=>x.date===day.businessDate);
  const openReports=reports.filter(r=>r.workdayStatus==="OPEN");
  const report=openReports.length===1&&reports.every(r=>["OPEN","CLOSED"].includes(String(r.workdayStatus)))?openReports[0]:null;
  const draft=row(report?.workdayPayrollDraft);
  const wholeDay=value.days.find(x=>x.businessDate===day.businessDate);
  const selected=report?shiftRevenues(scopedBusinessRows(input.revenues,estimateScope),reports,report):[];
  const amounts=selected.map(r=>financeAmount(r,'revenue',input.currency));
  const shiftAmount=amounts.every(n=>n!=null)?Math.round(amounts.reduce<number>((sum,n)=>sum+n!,0)*100)/100:null;
  const operation=wholeDay?{...wholeDay,revenue:{...wholeDay.revenue,amount:shiftAmount}}:undefined;
  const staffing=Array.isArray(report?.staffing)?report.staffing.map(row):[];
  const ids=staffing.map(x=>String(x.employeeId??''));
  const base=finiteBusinessNumber(report?.shiftVenueSales);
  const salesUnchanged=operation?.revenue.amount!=null && (base===operation.revenue.amount || base==null&&operation.revenue.amount===0);
  // Automatic personal-sales attribution needs membership/payment facts outside
  // this financial snapshot. Never substitute a stale saved personal-sales sum.
  const factsKnown=staffing.every(staff=>{
   const employee=employees.find(e=>e.id===staff.employeeId);
   if(!employee)return false;
   const needs=workdayPayrollRequirements(employee,rules);
   return !(needs.personalSales&&(staff.personalSalesSource==='AUTO'||finiteBusinessNumber(staff.personalSales)==null))
    && (!needs.departments.length||salesUnchanged);
  });
  const valid=report?.workdayStatus==='OPEN'&&derivedInputBelongs(report,estimateScope)&&draft.status==='COMPLETE'
   &&Array.isArray(draft.missing)&&draft.missing.length===0&&operation?.revenue.consistency!=='MISMATCH'
   &&ids.length>0&&ids.every(Boolean)&&new Set(ids).size===ids.length&&estimateSources!=null
   &&derivedInputBelongs(estimateSources,estimateScope)&&factsKnown;
  const estimate=valid?calculateWorkdayPayroll({date:day.businessDate,staffing,employees,rules,profile:input.profile,
   revenues:scopedBusinessRows(input.revenues,estimateScope),gaps:scopedBusinessRows(estimateSources!.gaps,estimateScope),venueId:input.venueId,
   shiftVenueSales:operation?.revenue.amount,shiftDepartmentSales:report?.shiftDepartmentSales,priorReports:reports.filter(r=>r.workdayStatus==="CLOSED")}):null;
  const amount=estimate?.status==='COMPLETE'?finiteBusinessNumber(row(estimate.payrollBreakdown).total):null;
  return {businessDate:day.businessDate,amount:amount==null?null:financeAmount({...report,amount,accountingAmount:undefined},'amount',input.currency),basis:'CURRENT_RULE_ESTIMATE' as const};
 });
 const estimatesKnown=estimatedPayrollDays.length>0&&estimatedPayrollDays.every(x=>x.amount!=null);
 const estimatedPayrollSubtotal=estimatesKnown?Math.round(estimatedPayrollDays.reduce((sum,x)=>sum+x.amount!,0)*100)/100:null;
 const provisionalPayroll=estimatesKnown&&value.payrollBonuses!=null&&input.payrollEntriesAvailable!==false
  ?Math.round(((knownPayrollSubtotal??0)+estimatedPayrollSubtotal!+value.payrollBonuses)*100)/100:null;
 const provisionalResultBeforeCost=provisionalPayroll!=null&&value.revenue!=null&&value.operatingExpenses!=null&&missing.every(x=>x==='PAYROLL')
  ?Math.round((value.revenue-provisionalPayroll-value.operatingExpenses)*100)/100:null;
 const provisionalResultAfterCost=provisionalResultBeforeCost!=null&&assessmentKnown?Math.round((provisionalResultBeforeCost-history.cost+history.adjustment)*100)/100:null;
 const provisionalExplanation=provisionalPayroll!=null?'Предварительно: зарплата открытых смен рассчитана по текущим ставкам, внесённым часам и доступным данным о продажах. Она ещё не подтверждена и может измениться.':null;
 const financeAssessmentMissing=[...missing,...(!assessmentKnown?['CAPTURED_COST_INCOMPLETE']:[])];
 const labels:Record<string,string>={SERVICE_SCOPE_UNKNOWN:'Проверьте принадлежность документа услуги',SERVICE_ID_UNKNOWN:'Не удалось определить документ услуги',SERVICE_DATE_UNKNOWN:'Проверьте дату услуги',SERVICE_AMOUNT_UNKNOWN:'Проверьте сумму и валюту услуги',SERVICE_ALLOCATION_UNKNOWN:'Проверьте состав документа услуги',SERVICE_SOURCE_UNAVAILABLE:'Не удалось загрузить документы услуг',REVENUE_OR_CURRENCY:'Не подтверждена выручка или её валюта',PAYROLL:'Нет полного актуального расчёта ФОТ: проверьте ставки, часы и данные продаж открытых смен',EXPENSES_OR_CURRENCY:'Не полностью известны расходы или их валюта',NO_CURRENT_ACTIVITY:'Нет учтённых рабочих дней за текущий период'};
 return {...value,startDate,endDate,missing,missingPayrollDates,knownPayrollSubtotal,resultBeforeCost,
  provisionalPayroll,estimatedPayrollSubtotal,estimatedPayrollDays,provisionalResultBeforeCost,provisionalResultAfterCost,provisionalExplanation,
  result:resultBeforeCost,preliminaryResult:resultBeforeCost,financeInputsKnown:missing.length===0,
  currentFinance:true,asOfDate:endDate,operatingResult:null,isClosed:false,
  resultAfterCost,costBasis:value.revenueRows.some(x=>[1,2].includes(Number(x.manualTotalsVersion)))?value.revenueRows.every(x=>[1,2].includes(Number(x.manualTotalsVersion)))?"OWNER_DECLARED":"MIXED":"CAPTURED",costOfGoods:costKnown?history.cost:null,inventoryAdjustmentNet:adjustmentsKnown?history.adjustment:null,financeAssessmentMissing,costReasons:[...history.reasons,...(!sourcesKnown?["COST_SOURCE_UNAVAILABLE"]:[])],
  financeAssessmentInformation:[...missing.map(code=>code==='PAYROLL'&&provisionalExplanation?provisionalExplanation:labels[code]??code),...(!assessmentKnown?["Не подтверждена себестоимость всех продаж и складских корректировок; текущая рентабельность не оценена."]:[])],
  serviceAccruals:accrual.accruals, serviceAccrualIssues:accrual.issues, purchasePayments,cashResult:resultBeforeCost!=null&&purchasePayments!=null&&accrual.nonCashDelta!=null?Math.round((resultBeforeCost+accrual.nonCashDelta-purchasePayments)*100)/100:null,
  missingInformation:missing.map(code=>code==='PAYROLL'&&provisionalExplanation?provisionalExplanation:labels[code]??code),
  resultExplanation:'Выручка − учтённые расходы − начисленный ФОТ. Без себестоимости товара и ещё не внесённых начислений; это не чистая прибыль.',
 };
}
