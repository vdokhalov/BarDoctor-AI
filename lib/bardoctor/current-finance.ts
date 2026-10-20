import { historicalPeriodCost } from "./financial-reconciliation";
import { readFinanceInputs, type FinanceReadInput, financeAmount } from './finance-inputs';
import { businessRecord as row, scopedBusinessRows, activeBusinessRow } from './business-day-rows';
import { venueDate, venueTimeFromJson } from './venue-time';

export type CurrentCostSourceStates = Partial<Record<"bd_sales_events_v1" | "bd_stock_movements" | "bd_sales_documents" | "bd_sales_batches", "AVAILABLE" | "ABSENT" | "UNAVAILABLE">>;

/** Recorded current-period result, never purchases-as-COGS or a closed-month profit. */
export function currentFinance(input: FinanceReadInput & { profile: Record<string, unknown>; movements?: unknown[]; batches?: unknown[]; costInputsAvailable?: boolean; costSourceStates?: CurrentCostSourceStates }) {
 const endDate = venueDate(input.asOf, venueTimeFromJson(JSON.stringify(input.profile)).timezone);
 const startDate = endDate.slice(0,7)+'-01';
 const purchasePayment = (x:Record<string,unknown>) => x.category==='inventory' || x.source==='purchase_payment' || x.source==='purchase_document' || x.paymentKind==='supplier_payment';
 const expenses=(input.expenses??[]).map(row);
 const value=readFinanceInputs({...input,startDate,endDate,expenses:expenses.filter(x=>!purchasePayment(x))});
 const missing=[...value.missing];
 if(!value.days.length)missing.push('NO_CURRENT_ACTIVITY');
 const missingPayrollDates=value.payrollByDay.filter(x=>x.amount==null).map(x=>x.businessDate);
 const knownDays=value.payrollByDay.filter(x=>x.amount!=null);
 const knownPayrollSubtotal=knownDays.length?Math.round(knownDays.reduce((sum,x)=>sum+x.amount!,0)*100)/100:null;
 const paymentRows=scopedBusinessRows(expenses,{venueId:input.venueId,workspaceId:input.workspaceId,dataAccountId:input.dataAccountId}).filter(x=>activeBusinessRow(x)&&purchasePayment(x)&&String(x.date)>=startDate&&String(x.date)<=endDate);
 const paymentAmounts=paymentRows.map(x=>financeAmount(x,'amount',input.currency));
 const purchasePayments=input.expensesAvailable===false||paymentAmounts.some(x=>x==null)?null:paymentAmounts.reduce<number>((sum,x)=>sum+x!,0);
 const resultBeforeCost=missing.length?null:value.preliminaryResult;
 const throughDate = (values:unknown[] = []) => scopedBusinessRows(values,{venueId:input.venueId,workspaceId:input.workspaceId,dataAccountId:input.dataAccountId}).filter(x=>{
  const date=String(x.businessDate??x.date??'').slice(0,10);return date>=startDate&&date<=endDate;
 });
 const history=historicalPeriodCost({venueId:input.venueId,monthKey:endDate.slice(0,7),accountingCurrency:input.currency??'',revenues:value.revenueRows,events:throughDate(input.events),documents:throughDate(input.documents),movements:throughDate(input.movements),batches:throughDate(input.batches)});
 // A confirmed absent unused channel is empty, not a failed/truncated read.
 // Stock history remains required to establish whether adjustments exist.
 const required = new Set<string>(["bd_stock_movements"]);
 if(value.revenueRows.some(x=>x.revenueSource==='sales_events_v1'))required.add('bd_sales_events_v1');
 if(value.revenueRows.some(x=>x.revenueSource==='sales_documents')){required.add('bd_sales_documents');required.add('bd_sales_batches');}
 const sourceKeys = ['bd_sales_events_v1','bd_stock_movements','bd_sales_documents','bd_sales_batches'] as const;
 const sourcesKnown = input.costSourceStates ? sourceKeys.every(key=>input.costSourceStates![key]==='AVAILABLE'||input.costSourceStates![key]==='ABSENT'&&!required.has(key)) : input.costInputsAvailable===true;
 const costKnown=sourcesKnown&&history.salesCostKnown;
 const adjustmentsKnown=sourcesKnown&&history.adjustmentsKnown;
 const assessmentKnown=costKnown&&adjustmentsKnown;
 const resultAfterCost=resultBeforeCost!=null&&assessmentKnown?Math.round((resultBeforeCost-history.cost+history.adjustment)*100)/100:null;
 const financeAssessmentMissing=[...missing,...(!assessmentKnown?['CAPTURED_COST_INCOMPLETE']:[])];
 const labels:Record<string,string>={REVENUE_OR_CURRENCY:'Не подтверждена выручка или её валюта',PAYROLL:'Не полностью известен начисленный ФОТ',EXPENSES_OR_CURRENCY:'Не полностью известны расходы или их валюта',NO_CURRENT_ACTIVITY:'Нет учтённых рабочих дней за текущий период'};
 return {...value,startDate,endDate,missing,missingPayrollDates,knownPayrollSubtotal,resultBeforeCost,
  result:resultBeforeCost,preliminaryResult:resultBeforeCost,financeInputsKnown:missing.length===0,
  currentFinance:true,asOfDate:endDate,operatingResult:null,isClosed:false,
  resultAfterCost,costBasis:value.revenueRows.some(x=>[1,2].includes(Number(x.manualTotalsVersion)))?value.revenueRows.every(x=>[1,2].includes(Number(x.manualTotalsVersion)))?"OWNER_DECLARED":"MIXED":"CAPTURED",costOfGoods:costKnown?history.cost:null,inventoryAdjustmentNet:adjustmentsKnown?history.adjustment:null,financeAssessmentMissing,costReasons:[...history.reasons,...(!sourcesKnown?["COST_SOURCE_UNAVAILABLE"]:[])],
  financeAssessmentInformation:[...missing.map(code=>labels[code]??code),...(!assessmentKnown?["Не подтверждена себестоимость всех продаж и складских корректировок; текущая рентабельность не оценена."]:[])],
  purchasePayments,cashResult:resultBeforeCost!=null&&purchasePayments!=null?Math.round((resultBeforeCost-purchasePayments)*100)/100:null,
  missingInformation:missing.map(code=>labels[code]??code),
  resultExplanation:'Выручка − учтённые расходы − начисленный ФОТ. Без себестоимости товара и ещё не внесённых начислений; это не чистая прибыль.',
 };
}
