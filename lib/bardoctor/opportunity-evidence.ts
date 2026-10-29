import type {operationalDays} from './operational-day';
import {canonicalVenueTimezone,venueClock,venueDate} from './venue-time';
import type {OpportunityVenueContext} from './opportunity-baseline';
type Day=ReturnType<typeof operationalDays>[number];
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const weekday=(s:string)=>(new Date(s+'T12:00:00Z').getUTCDay()+6)%7;
const clock=(s:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
/** Observations only. No score, predicted uplift, profit, or financial writes. */
export function opportunityEvidence(input:{date:string;context:OpportunityVenueContext;timezone?:string;currency:string|null;venueId:number;asOf:string;days:Day[]|null}) {
 const {context}=input, timezone=canonicalVenueTimezone(input.timezone);
 const dateValid=validDate(input.date);
 const configured=dateValid&&typeof context.workingDays?.[String(weekday(input.date))]==='boolean';
 const open=configured?context.workingDays![String(weekday(input.date))]===true:null;
 const hoursKnown=clock(context.openTime)&&clock(context.closeTime)&&context.openTime!==context.closeTime;
 const schedule=open===null?'Рабочий график на эту дату не указан.':open?`По текущему графику заведение открыто${hoursKnown?' с '+context.openTime+' до '+context.closeTime:''}.`:'По текущему графику заведение закрыто.';
 const base={label:'Предварительная оценка',schedule,comparableDays:null as number|null,history:'Сопоставимость прошлых смен пока не подтверждена.',conclusion:open===false?'Праздничная дата не означает, что заведение будет работать.':'Влияние события на спрос пока не подтверждено.',asOf:input.asOf};
 if(!dateValid||!timezone||!hoursKnown||!input.currency||input.days===null||open!==true)return base;
 const today=venueDate(input.asOf,timezone),cutoff=new Date(today+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-56);const start=cutoff.toISOString().slice(0,10);
 const dates=new Set<string>();
 for(const day of input.days){
  if(day.venueId!==input.venueId||!validDate(day.businessDate)||day.businessDate<start||day.businessDate>=today||weekday(day.businessDate)!==weekday(input.date))continue;
  if(day.status!=='COMPLETE'||day.closedWorkShiftCount!==1||day.revenue.status!=='FINAL'||day.revenue.consistency!=='MATCH'||day.revenue.currency!==input.currency||day.revenue.currencyStatus!=='KNOWN'||day.revenue.source==='LEGACY_UNKNOWN')continue;
  const shift=day.cashShift;if(!shift||shift.status!=='CLOSED'||typeof shift.openedAt!=='string'||typeof shift.closedAt!=='string')continue;
  const a=Date.parse(shift.openedAt),b=Date.parse(shift.closedAt);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b>Date.parse(input.asOf)||b-a>26*3600000)continue;
  if(venueClock(shift.openedAt,timezone)!==context.openTime||venueClock(shift.closedAt,timezone)!==context.closeTime||venueDate(shift.openedAt,timezone)!==day.businessDate)continue;
  dates.add(day.businessDate);
 }
 return {...base,comparableDays:dates.size,history:dates.size?`Закрытых дней с тем же днём недели и временем работы за последние 8 недель: ${dates.size}. Это не прогноз на праздник.`:'За последние 8 недель сопоставимых закрытых дней не найдено.'};
}
