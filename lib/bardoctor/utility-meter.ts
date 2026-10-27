/** Utility meter preview only. No writes, payment inference or historical report changes. */
export type UtilityKind = 'water' | 'gas' | 'electricity';
export type UtilityScope = { venueId: number; dataAccountId: number };
export type UtilityMeter = UtilityScope & { id: string; name: string; kind: UtilityKind; unit: 'm3' | 'kWh'; included: boolean; parentId?: string; revision: number };
export type UtilityReading = { id: string; meterId: string; date: string; value: number };
export type UtilityTariff = { id: string; effectiveDate: string; amount: number; currency: string; startsAfterReadingId?: string };
export type UtilityInterval = { fromReadingId: string; toReadingId: string; from: string; to: string; month: string; consumption: number; amount: number | null; currency: string | null; tariffId: string | null; issue: string | null };
export class UtilityInputError extends Error {}
const fail = (code: string): never => { throw new UtilityInputError(code); };
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value;
const finite = (value: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e12;
const round = (n: number, digits: number) => Math.round((n + Number.EPSILON) * 10 ** digits) / 10 ** digits;
export function validateUtilityMeter(meter: UtilityMeter, scope: UtilityScope) {
 if (meter.venueId !== scope.venueId || meter.dataAccountId !== scope.dataAccountId) fail('FOREIGN_METER');
 if (!meter.id || !['water','gas','electricity'].includes(meter.kind) || meter.unit !== (meter.kind === 'electricity' ? 'kWh' : 'm3') || typeof meter.included !== 'boolean' || !Number.isSafeInteger(meter.revision) || meter.revision < 0) fail('INVALID_METER');
}
export function utilityMeterName(kind: UtilityKind, name: string, ordinal: number): string {
 const value = name.trim();
 if (value.length > 100 || !Number.isSafeInteger(ordinal) || ordinal < 1) fail('INVALID_METER_NAME');
 return value || `${({ water:'Вода', gas:'Газ', electricity:'Электричество' })[kind]} · ${ordinal}`;
}
export function renameUtilityMeter(meter: UtilityMeter, scope: UtilityScope, name: string, ordinal: number): UtilityMeter {
 validateUtilityMeter(meter, scope); const next = utilityMeterName(meter.kind, name, ordinal);
 return next === meter.name ? meter : { ...meter, name: next, revision: meter.revision + 1 };
}
export function utilityIntervals(meter: UtilityMeter, scope: UtilityScope, readings: UtilityReading[], tariffs: UtilityTariff[]): UtilityInterval[] {
 validateUtilityMeter(meter, scope);
 if (readings.length > 10000 || tariffs.length > 1000) fail('UTILITY_INPUT_LIMIT');
 const ids = new Set<string>(), dates = new Set<string>();
 for (const r of readings) {
  if (!r.id || ids.has(r.id) || !date(r.date) || dates.has(r.date) || r.meterId !== meter.id || !finite(r.value)) fail('INVALID_READING');
  ids.add(r.id); dates.add(r.date);
 }
 const tariffIds = new Set<string>(), tariffDates = new Set<string>();
 for (const t of tariffs) {
  if (!t.id || tariffIds.has(t.id) || !date(t.effectiveDate) || tariffDates.has(t.effectiveDate) || !finite(t.amount) || !/^(?:[A-Z]{3}|PMR_RUB)$/.test(t.currency)) fail('INVALID_TARIFF');
  if(t.startsAfterReadingId&&!readings.some(r=>r.id===t.startsAfterReadingId&&r.date===t.effectiveDate))fail('TARIFF_BOUNDARY_MISSING');
  tariffIds.add(t.id);tariffDates.add(t.effectiveDate);
 }
 const ordered = [...readings].sort((a,b)=>a.date.localeCompare(b.date)), rates = [...tariffs].sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate));
 return ordered.slice(1).map((current,index)=>{
  const previous = ordered[index]; if (current.value < previous.value) fail('READING_DECREASED');
  const consumption = round(current.value - previous.value,6);
  // A rate effective at the ending boundary may have applied during that day.
  // Without a boundary reading/time we cannot price that interval exactly.
  const rate = rates.filter(t=>t.effectiveDate <= previous.date).at(-1);
  const changed = rates.some(t=>t.effectiveDate > previous.date && (t.effectiveDate < current.date || t.effectiveDate === current.date && t.startsAfterReadingId !== current.id));
  const issue = !rate ? 'TARIFF_MISSING' : changed ? 'TARIFF_CHANGED_WITHIN_INTERVAL' : null;
  return {fromReadingId:previous.id,toReadingId:current.id,from:previous.date,to:current.date,month:current.date.slice(0,7),consumption,amount:issue?null:round(consumption*rate!.amount,2),currency:issue?null:rate!.currency,tariffId:issue?null:rate!.id,issue};
 });
}
export function previewUtilityReading(input: {meter: UtilityMeter;scope:UtilityScope;readings:UtilityReading[];tariffs:UtilityTariff[];next:UtilityReading;closedMonths:readonly string[]}) {
 const {meter,scope,readings,tariffs,next,closedMonths} = input;
 const existing = readings.find(r=>r.id===next.id);
 if (existing && JSON.stringify(existing) === JSON.stringify(next)) return {unchanged:true,readings,affectedMonths:[],intervals:utilityIntervals(meter,scope,readings,tariffs)};
 const before=utilityIntervals(meter,scope,readings,tariffs), updated=readings.filter(r=>r.id!==next.id).concat(next), after=utilityIntervals(meter,scope,updated,tariffs);
 const prior=new Map(before.map(i=>[i.toReadingId,JSON.stringify(i)])),future=new Map(after.map(i=>[i.toReadingId,JSON.stringify(i)]));
 const affectedMonths=[...new Set([...before.filter(i=>future.get(i.toReadingId)!==JSON.stringify(i)),...after.filter(i=>prior.get(i.toReadingId)!==JSON.stringify(i))].map(i=>i.month).concat(next.date.slice(0,7),existing?[existing.date.slice(0,7)]:[]))].sort();
 if (affectedMonths.some(month=>closedMonths.includes(month))) fail('MONTH_LOCKED');
 return {unchanged:false,readings:updated,affectedMonths,intervals:after};
}
/** Measurement comparison is separate from the month where an interval is charged. */
export function compareUtilityMonths(intervals: UtilityInterval[], month: string, previousMonth: string) {
 const period=(key:string)=>{
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) fail('INVALID_MONTH');
  const start=key+'-01',end=new Date(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5)),1)).toISOString().slice(0,10);
  const rows=intervals.filter(i=>i.to>start&&i.from<end);
  const complete=rows.length>0&&rows[0].from===start&&rows.at(-1)!.to===end&&rows.every((r,i)=>r.from>=start&&r.to<=end&&(i===0||rows[i-1].to===r.from));
  const currencies=new Set(rows.map(r=>r.currency));
  const costKnown=complete&&rows.every(r=>r.amount!==null)&&currencies.size===1;
  return {complete,consumption:complete?round(rows.reduce((n,r)=>n+r.consumption,0),6):null,amount:costKnown?round(rows.reduce((n,r)=>n+r.amount!,0),2):null,currency:costKnown?rows[0].currency:null};
 };
 const current=period(month),previous=period(previousMonth);
 return {current,previous,consumptionChange:current.consumption!==null&&previous.consumption!==null?round(current.consumption-previous.consumption,6):null,costChange:current.amount!==null&&previous.amount!==null&&current.currency===previous.currency?round(current.amount-previous.amount,2):null};
}
/** Only explicitly included meters enter totals. A parent/child pair cannot both contribute. */
export function utilityMonthTotal(scope:UtilityScope, meters:UtilityMeter[], intervals:Record<string,UtilityInterval[]>, month:string, currency:string) {
 if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail('INVALID_MONTH');
 const ids=new Set<string>();
 for(const m of meters){validateUtilityMeter(m,scope);if(ids.has(m.id))fail('DUPLICATE_METER');ids.add(m.id)}
 const byId=new Map(meters.map(m=>[m.id,m]));
 for(const m of meters){const chain=new Set([m.id]);let parent=m.parentId;while(parent){if(chain.has(parent))fail('METER_PARENT_CYCLE');chain.add(parent);const p=byId.get(parent)??fail('INVALID_METER_PARENT');if(p.kind!==m.kind||p.unit!==m.unit)fail('INVALID_METER_PARENT');if(m.included&&p.included)fail('PARENT_AND_CHILD_INCLUDED');parent=p.parentId}}
 let knownAmount=0,unknownMeters=0;const included=meters.filter(m=>m.included);
 for(const m of included){const rows=(intervals[m.id]??[]).filter(r=>r.month===month);if(!rows.length||rows.some(r=>r.amount===null||r.currency!==currency)){unknownMeters++;continue}knownAmount+=rows.reduce((n,r)=>n+r.amount!,0)}
 return {knownAmount:round(knownAmount,2),amount:included.length>0&&unknownMeters===0?round(knownAmount,2):null,includedMeters:included.length,unknownMeters,scope:'INTERVALS_ENDING_IN_MONTH' as const};
}
