import {compareUtilityMonths,utilityIntervals,previewUtilityReading,renameUtilityMeter,utilityMeterName,utilityMonthTotal,UtilityInputError,type UtilityMeter,type UtilityReading,type UtilityTariff,type UtilityScope} from './utility-meter';
export const UTILITY_KEY='bd_utility_meters_v1';
export type MeterRecord=UtilityMeter & {readings:UtilityReading[];tariffs:UtilityTariff[]};
export type UtilityState=UtilityScope & {version:1;revision:number;startMonth:string|null;meters:MeterRecord[];payments:{id:string;meterId:string;readingId:string;date:string;amount:number;currency:string}[];operations:{id:string;hash:string}[]};
export function emptyUtilities(scope:UtilityScope):UtilityState{return {...scope,version:1,revision:0,startMonth:null,meters:[],payments:[],operations:[]}}
export function parseUtilities(raw:string|null,scope:UtilityScope):UtilityState{
 if(!raw)return emptyUtilities(scope);const data=JSON.parse(raw);const s=Array.isArray(data)&&data.length===1?data[0]:null;
 if(!s||s.version!==1||s.venueId!==scope.venueId||s.dataAccountId!==scope.dataAccountId||!Array.isArray(s.meters)||!Array.isArray(s.payments)||!Array.isArray(s.operations)||!Number.isSafeInteger(s.revision))throw new UtilityInputError('UTILITY_STORE_INVALID');
 return s;
}
const str=(x:unknown)=>typeof x==='string'?x:'';
const validDate=(x:string)=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
export function changeUtilities(state:UtilityState,command:Record<string,unknown>,currency:string,closed:string[],today:string){
 const s=structuredClone(state),scope={venueId:s.venueId,dataAccountId:s.dataAccountId},id=str(command.meterId);
 const m=s.meters.find(m=>m.id===id);const requireMeter=()=>{if(!m)throw new UtilityInputError('METER_NOT_FOUND');return m};
 if(command.action==='create'){
  if(s.meters.length>=100||!id||id.length>100||m)throw new UtilityInputError('INVALID_METER');
  const kind=command.kind;if(!['water','gas','electricity'].includes(String(kind)))throw new UtilityInputError('INVALID_METER');
  const startMonth=str(command.startMonth);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)||closed.includes(startMonth))throw new UtilityInputError('MONTH_LOCKED');
  if(s.startMonth&&startMonth!==s.startMonth)throw new UtilityInputError('START_MONTH_CHANGED');
  s.startMonth=startMonth;
  s.meters.push({...scope,id,kind:kind as UtilityMeter['kind'],unit:kind==='electricity'?'kWh':'m3',included:command.included===true,parentId:str(command.parentId)||undefined,name:utilityMeterName(kind as UtilityMeter['kind'],str(command.name),s.meters.length+1),revision:0,readings:[],tariffs:[]});
 }else if(command.action==='rename'){
  const meter=requireMeter();Object.assign(meter,renameUtilityMeter(meter,scope,str(command.name),s.meters.indexOf(meter)+1));
 }else if(command.action==='reading'){
  const meter=requireMeter(),next={id:str(command.readingId),meterId:id,date:str(command.date),value:command.value as number};
  if(!validDate(next.date)||next.date>today||next.date.slice(0,7)<s.startMonth!)throw new UtilityInputError('INVALID_READING_DATE');
  const preview=previewUtilityReading({meter,scope,readings:meter.readings,tariffs:meter.tariffs,next,closedMonths:closed});
  const existing=utilityIntervals(meter,scope,meter.readings,meter.tariffs);
  const changed=existing.filter(i=>JSON.stringify(i)!==JSON.stringify(preview.intervals.find(n=>n.toReadingId===i.toReadingId)));
  if(changed.some(i=>s.payments.some(p=>p.meterId===id&&p.readingId===i.toReadingId)))throw new UtilityInputError('PAID_INTERVAL_LOCKED');
  meter.readings=preview.readings;meter.revision++;
 }else if(command.action==='tariff'){
  const meter=requireMeter(),rate={id:str(command.tariffId),effectiveDate:str(command.date),amount:command.amount as number,currency,startsAfterReadingId:str(command.startsAfterReadingId)||undefined};
  if(!validDate(rate.effectiveDate)||rate.effectiveDate>today||closed.includes(rate.effectiveDate.slice(0,7)))throw new UtilityInputError('MONTH_LOCKED');
  // Tariffs are append-only; no silent rewrite of previously valued intervals.
  if(meter.tariffs.some(t=>t.id===rate.id||t.effectiveDate===rate.effectiveDate))throw new UtilityInputError('TARIFF_ALREADY_EXISTS');
  const old=utilityIntervals(meter,scope,meter.readings,meter.tariffs),rates=[...meter.tariffs,rate],next=utilityIntervals(meter,scope,meter.readings,rates);
  for(const i of old)if(JSON.stringify(i)!==JSON.stringify(next.find(n=>n.toReadingId===i.toReadingId))&&(closed.includes(i.month)||s.payments.some(p=>p.meterId===id&&p.readingId===i.toReadingId)))throw new UtilityInputError('VALUED_INTERVAL_LOCKED');
  meter.tariffs=rates;meter.revision++;
 }else if(command.action==='inclusion'){
  const meter=requireMeter();if(typeof command.included!=='boolean')throw new UtilityInputError('INVALID_METER');
  if(meter.readings.length>1)throw new UtilityInputError('INCLUSION_HAS_HISTORY');
  meter.included=command.included;meter.parentId=str(command.parentId)||undefined;meter.revision++;
 }else if(command.action==='payment'){
  const meter=requireMeter(),readingId=str(command.readingId),date=str(command.date),amount=command.amount;
  if(!meter.included||!validDate(date)||date>today||closed.includes(date.slice(0,7))||typeof amount!=='number'||!Number.isFinite(amount)||amount<=0)throw new UtilityInputError('INVALID_PAYMENT');
  const interval=utilityIntervals(meter,scope,meter.readings,meter.tariffs).find(i=>i.toReadingId===readingId);
  if(!interval||interval.amount===null||interval.currency!==currency)throw new UtilityInputError('INTERVAL_UNVALUED');
  const paid=s.payments.filter(p=>p.meterId===id&&p.readingId===readingId).reduce((n,p)=>n+p.amount,0);
  if(amount>Math.round((interval.amount-paid)*100)/100)throw new UtilityInputError('PAYMENT_EXCEEDS_BALANCE');
  const paymentId=str(command.paymentId);if(!paymentId||s.payments.some(p=>p.id===paymentId))throw new UtilityInputError('INVALID_PAYMENT');
  s.payments.push({id:paymentId,meterId:id,readingId,date,amount:Math.round(amount*100)/100,currency});
 }else throw new UtilityInputError('INVALID_ACTION');
 const intervals=Object.fromEntries(s.meters.map(m=>[m.id,utilityIntervals(m,scope,m.readings,m.tariffs)]));
 utilityMonthTotal(scope,s.meters,intervals,today.slice(0,7),currency);
 s.revision++;
 return s;
}
export function utilityView(state:UtilityState,month:string,currency:string){
 const intervals=Object.fromEntries(state.meters.map(m=>[m.id,utilityIntervals(m,state,m.readings,m.tariffs)]));
 const previousMonth=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5))-2,1)).toISOString().slice(0,7);
 const comparisons=Object.fromEntries(state.meters.map(m=>[m.id,compareUtilityMonths(intervals[m.id],month,previousMonth)]));
 return {...state,operations:undefined,intervals,comparisons,total:utilityMonthTotal(state,state.meters,intervals,month,currency),currency,month};
}
