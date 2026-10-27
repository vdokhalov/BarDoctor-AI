import test from 'node:test';import assert from 'node:assert/strict';
import {supplierDebtSummary} from '../lib/bardoctor/purchases';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const scope={venueId:1,workspaceId:2,dataAccountId:3},date='2026-10-26',currency='MDL',profile={...scope,currency,timezone:'Europe/Chisinau'};
const goods={...scope,id:'goods',date,status:'confirmed',documentType:'receipt',expenseCategory:'products',currency,total:120,items:[{category:'products',lineTotal:120}]};
const service={...scope,id:'service',date,status:'confirmed',documentType:'receipt',expenseCategory:'other',currency,total:15,items:[{category:'other',lineTotal:15}]};
const payment=(id:string,amount:number,category:string)=>({...scope,id:'pay-'+id,date,amount,category,currency,source:'purchase_payment',paymentKind:'supplier_payment',sourceDocumentId:id,purchaseId:id,status:'posted'});
for(const [state,paid,cancelled,voided] of [['unpaid',false,false,false],['paid',true,false,false],['cancelled with active payment',true,true,false],['cancelled and payment voided',true,true,true]] as const)test('RV01 '+state+': categories match cash; service accrues once',async t=>{
 const r=await lifecycleRuntime({calc:'./lib/bardoctor/verified-month-close'});t.after(r.close);
 const stores={bd_purchase_documents:[goods,{...service,status:cancelled?'cancelled':'confirmed'}],bd_finance_expenses:[payment('goods',120,'products'),...(paid?[{...payment('service',15,'other'),...(voided?{status:'voided',reversedAt:'2026-10-26T10:00:00Z'}:{})}]:[])],bd_finance_revenue:[{...scope,id:'cash',date,revenue:240,receipts:2,currency,revenueSource:'MANUAL_SUMMARY',manualTotalsVersion:2,manualCostOfGoods:0,closingStatus:'closed'}],bd_operational_reports_v1:[{...scope,id:'shift',date,closingStatus:'closed',payrollBreakdown:{total:0}}]};
 const calc=r.api.calc.calculateVerifiedMonth as unknown as typeof import('../lib/bardoctor/verified-month-close').calculateVerifiedMonth;
 const before=JSON.stringify(stores);const input={profile,stores,...scope,monthKey:'2026-10',asOf:'2026-10-26T12:00:00Z'};const report=calc(input).snapshot as any;
 assert.equal(report.periodExpenses,120+(paid&&!voided?15:0));assert.equal(report.otherExpenses,cancelled?0:15);assert.equal(report.resultBeforeCost,cancelled?240:225);assert.equal(supplierDebtSummary(stores.bd_purchase_documents,stores.bd_finance_expenses,scope.venueId,currency).totalOutstanding,!cancelled&&!paid?15:0);assert.equal(report.cashResult,240-report.periodExpenses);
 assert.equal(report.expenseBreakdown.reduce((sum:number,row:any)=>sum+row.amount,0),report.periodExpenses,JSON.stringify({total:report.periodExpenses,categories:report.expenseBreakdown}));
 assert.equal(report.expenseBreakdown.find((r:any)=>r.label==='Прочее')?.amount??0,paid&&!voided?15:0);
 assert.deepEqual(calc(input).snapshot,report);assert.equal(JSON.stringify(stores),before);
});
