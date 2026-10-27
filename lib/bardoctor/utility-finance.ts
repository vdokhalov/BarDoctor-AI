import {parseUtilities,utilityView,type UtilityState} from './utility-state';
type Row=Record<string,unknown>;
/** Read-only accrual projection; never write this projection back into the expense store. */
export function utilityFinance(input:{state?:unknown[];venueId:number;dataAccountId?:number;currency:string|null;month:string;throughDate?:string;expenses:Row[]}){
 const result={active:false,expenses:input.expenses,amount:0 as number|null,paid:0,issues:[] as string[]};
 if(!input.state?.length)return result;
 try{
  const state=parseUtilities(JSON.stringify(input.state),{venueId:input.venueId,dataAccountId:input.dataAccountId!});
  if(!state.startMonth||input.month<state.startMonth)return result;result.active=true;
  const view=utilityView(state,input.month,input.currency??'');result.amount=view.total.amount;
  if(result.amount===null)result.issues.push('UTILITY_READINGS_INCOMPLETE');
  // Unlinked legacy/manual entries cannot safely be guessed to be payments for these meters.
  if(input.expenses.some(e=>e.category==='utilities'&&String(e.accountingMonth??String(e.date).slice(0,7))===input.month&&!['cancelled','voided'].includes(String(e.status))))result.issues.push('UTILITY_UNLINKED_EXPENSE');
  const generated:Row[]=[];
  for(const m of state.meters.filter(m=>m.included))for(const i of view.intervals[m.id])if(i.month===input.month&&(!input.throughDate||i.to<=input.throughDate)&&i.amount!==null)generated.push({id:'utility:'+m.id+':'+i.toReadingId,venueId:input.venueId,dataAccountId:input.dataAccountId,date:i.to,accountingMonth:i.month,amount:i.amount,currency:i.currency,category:'utilities',source:'utility_accrual',status:'posted'});
  result.paid=state.payments.filter(p=>p.date.slice(0,7)===input.month&&(!input.throughDate||p.date<=input.throughDate)).reduce((n,p)=>n+p.amount,0);
  result.expenses=[...input.expenses,...generated];return result;
 }catch{result.active=true;result.amount=null;result.issues.push('UTILITY_SOURCE_INVALID');return result}
}
