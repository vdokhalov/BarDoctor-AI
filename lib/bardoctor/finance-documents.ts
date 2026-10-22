import {existingMonthlyCalculation} from './month-report-calculation.js';
import {derivedInputBelongs} from './derived-input-scope';
import {scopedBusinessRows} from './business-day-rows';
export const FINANCE_DOCUMENT_KEYS=['bd_finance_expenses','bd_stock_movements'] as const;
type Row=Record<string,any>;
export function financeDocumentScope(report:Row,manifest:Row){
 return {venueId:manifest.scope.venueId,workspaceId:manifest.scope.workspaceId,month:manifest.monthKey,through:report.asOfDate??manifest.endDate,currency:manifest.currency,revisions:FINANCE_DOCUMENT_KEYS.map(key=>({key,revision:manifest.sources.find((s:Row)=>s.key===key)?.revision??null})),profileRevision:manifest.profileRevision};
}
export function financialContributors(values:Row[],kind:string,context:Row){
 const scope={venueId:context.venueId,workspaceId:context.workspaceId,dataAccountId:context.dataAccountId};
 return values.flatMap((value,index)=>{
  if(!derivedInputBelongs(value,scope))return [];
  if(!scopedBusinessRows([value.venueId==='primary'?{...value,venueId:scope.venueId}:value],scope).length)return [];
  const date=String(kind==='writeoffs'?value.date:value.businessDate??value.date).slice(0,10);
  if(!date.startsWith(context.month+'-')||date>context.through)return [];
  if(kind==='writeoffs'){
   if(value.category!=='writeoff'||value.status==='voided'||value.reversedAt)return [];
   const result=existingMonthlyCalculation({},context.month,[],[value],[],{},[],{},context.through+'T12:00:00Z',context.currency);
   if(result.excludedForeignCurrencyEntries.length)return [];
   return [{key:String(value.id??index),date,amount:result.writeoffs,documentId:typeof value.sourceDocumentId==='string'?value.sourceDocumentId:null,description:String(value.description??'Списание'),kind}];
  }
  if(value.type!=='inventory_adjustment'||value.status==='cancelled'||value.reversedAt)return [];
  const known=typeof value.costAmount==='number'&&Number.isFinite(value.costAmount)&&value.valuationStatus!=='unvalued'&&value.costStatus!=='UNKNOWN'&&(value.costAmount!==0||['KNOWN_ZERO','KNOWN'].includes(value.costStatus))&&value.currency===context.currency;
  if(!known)throw Error('UNKNOWN_CONTRIBUTION');
  return [{key:String(value.id??index),date,amount:-value.costAmount,documentId:typeof value.sourceDocumentId==='string'?value.sourceDocumentId:null,description:value.costAmount>0?'Излишек':'Недостача',kind}];
 });
}
