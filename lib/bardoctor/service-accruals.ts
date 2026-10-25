import {derivedInputBelongs} from './derived-input-scope';
import {activeBusinessRow, businessRecord, scopedBusinessRows, finiteBusinessNumber} from './business-day-rows';
import {financeAmount} from './finance-inputs';

type Row=Record<string,unknown>;
const categories=new Set(['repairs','marketing','other']);
export const supplierPayment=(x:Row)=>x.source==='purchase_payment'||x.source==='purchase_document'||x.paymentKind==='supplier_payment';
/** Read projection only. Explicit document identity deduplicates linked legacy
 * accruals; an unrelated manual expense is never matched by name or amount. */
export function serviceAccruals(input:{purchases?:unknown[];expenses?:unknown[];venueId?:number;workspaceId?:number;dataAccountId?:number;currency:string|null;startDate:string;endDate:string}){
 const scope={venueId:input.venueId,workspaceId:input.workspaceId,dataAccountId:input.dataAccountId};
 const expenses=scopedBusinessRows(input.expenses??[],scope);
 const documents=scopedBusinessRows(input.purchases??[],scope);
 const recognized=new Set<string>(); const accruals:Row[]=[];const issues:string[]=[];
 for(const doc of documents){
  if(doc.documentType==='price_list'||!['confirmed','cancelled'].includes(String(doc.status)))continue;
  const items=Array.isArray(doc.items)?doc.items.map(businessRecord):[];
  // Categories are stored accounting classifications, never inferred names.
  const serviceItems=items.filter(item=>categories.has(String(item.category)));
  if(!categories.has(String(doc.expenseCategory))&&!serviceItems.length)continue;
  if(doc.expenseCategory==='equipment')continue;
  if(!doc.id){if(doc.status==='confirmed')issues.push('SERVICE_ID_UNKNOWN');continue;}
  const id=String(doc.id);recognized.add(id);
  if(doc.status!=='confirmed')continue;
  if(input.venueId!=null&&!derivedInputBelongs(doc,{...scope,venueId:input.venueId})){issues.push('SERVICE_SCOPE_UNKNOWN');continue;}
  const date=String(doc.date??'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date){issues.push('SERVICE_DATE_UNKNOWN');continue;}
  if(date<input.startDate||date>input.endDate)continue;
  // A mixed document or inconsistent line categories require an allocation
  // contract. Do not silently expense equipment/stock or invent an allocation.
  if(items.length&&serviceItems.length!==items.length){issues.push('SERVICE_ALLOCATION_UNKNOWN');continue;}
  const total=finiteBusinessNumber(doc.total);
  const amount=doc.costStatus==='UNKNOWN'||total==null||total<0?null:financeAmount({...doc,amount:total},'amount',input.currency);
  if(amount==null){issues.push('SERVICE_AMOUNT_UNKNOWN');continue;}
  accruals.push({id:'service-accrual:'+id,venueId:doc.venueId,workspaceId:doc.workspaceId,dataAccountId:doc.dataAccountId,date,accountingMonth:date.slice(0,7),category:categories.has(String(doc.expenseCategory))?doc.expenseCategory:serviceItems[0]?.category,amount,currency:input.currency,source:'service_accrual',serviceDocumentId:id,status:'posted'});
 }
 const retained=expenses.filter(e=>e.source!=='service_accrual'&&(supplierPayment(e)||!recognized.has(String(e.sourceDocumentId??e.purchaseId??''))));
 const sum=(rows:Row[])=>{const values=rows.filter(e=>activeBusinessRow(e)&&String(e.date)>=input.startDate&&String(e.date)<=input.endDate&&!supplierPayment(e)&&e.category!=='inventory'&&e.category!=='payroll').map(e=>financeAmount(e,'amount',input.currency));return values.some(x=>x==null)?null:values.reduce<number>((s,x)=>s+x!,0);};
 const old=sum(expenses),next=sum([...retained,...accruals]);
 return {expenses:[...retained,...accruals],accruals,issues:[...new Set(issues)],nonCashDelta:old==null||next==null?null:Math.round((next-old)*100)/100};
}
