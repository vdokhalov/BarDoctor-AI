import cis from './data/cis-holidays.json';
import fallback from './data/holiday-fallback.json';
import { buildOpportunityBaseline, type OpportunityVenueContext } from './opportunity-baseline';
export const HOLIDAY_COUNTRIES = ['MD','DE','RU','BY','KZ','AM','AZ','KG','TJ','TM','UZ'] as const;
export type HolidayCountry = typeof HOLIDAY_COUNTRIES[number];
type Row={date:string;name:string;source?:string;kind?:string;sourceIdentity?:string};
const aliases:Record<string,HolidayCountry>={md:'MD',moldova:'MD','молдова':'MD','молдавия':'MD',de:'DE',germany:'DE','германия':'DE',deutschland:'DE'};
Object.assign(aliases,{ru:'RU',russia:'RU','россия':'RU','российская федерация':'RU',by:'BY',belarus:'BY','беларусь':'BY','белоруссия':'BY',kz:'KZ',kazakhstan:'KZ','казахстан':'KZ',am:'AM',armenia:'AM','армения':'AM',az:'AZ',azerbaijan:'AZ','азербайджан':'AZ',kg:'KG',kyrgyzstan:'KG','кыргызстан':'KG','киргизия':'KG',tj:'TJ',tajikistan:'TJ','таджикистан':'TJ',tm:'TM',turkmenistan:'TM','туркменистан':'TM',uz:'UZ',uzbekistan:'UZ','узбекистан':'UZ'});
export function holidayCountry(value:string):HolidayCountry|null{return aliases[value.trim().toLowerCase()]??null;}
function validDate(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function nextDay(value:string){const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);}
export function parsePublicHolidays(value:unknown,start:string,end:string):Row[]{
 if(!Array.isArray(value)||value.length>500)throw new Error('Некорректный ответ справочника');
 const result:Row[]=[];const ids=new Set<string>();
 for(const raw of value){
  if(!raw||typeof raw!=='object')throw new Error('Некорректная дата справочника');
  const row=raw as Record<string,unknown>;
  if(row.nationwide!==true||row.type!=='Public')continue;
  if(!validDate(row.startDate)||!validDate(row.endDate)||row.endDate<row.startDate||(Date.parse(row.endDate)-Date.parse(row.startDate))/86400000>31)throw new Error('Некорректный интервал справочника');
  const names=Array.isArray(row.name)?row.name as Array<{language?:string;text?:string}>:[];
  const name=(names.find(name=>name.language==='EN')??names[0])?.text;
  if(typeof name!=='string'||!name.trim()||name.length>250)throw new Error('Нет названия праздника');
  const uuid=typeof row.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)?row.id.toLowerCase():undefined;
  if(uuid&&ids.has(uuid))throw new Error('Повторный идентификатор справочника');if(uuid)ids.add(uuid);
  // A range has no per-day IDs: do not guess which day survived a changed range.
  for(let date=row.startDate;date<=row.endDate;date=nextDay(date))if(date>=start&&date<=end)result.push({date,name:name.trim(),...(uuid?{sourceIdentity:uuid+(row.startDate===row.endDate?'':':'+date)}:{})});
 }
 if(!result.length)throw new Error('Справочник не вернул национальные праздники');
 return result;
}
const moldovaObservances:Row[]=[2026,2027].map(year=>({date:`${year}-06-24`,name:'День работника гражданской авиации',kind:'observance',source:'https://gov.md/index.php/ro/comunicate-de-presa/ziua-lucratorului-aviatiei-civile-va-fi-marcata-anual-la-data-de-24-iunie'}));
function withReviewedObservances(country:HolidayCountry,start:string,end:string,rows:Row[]):Row[]{
 const additions=country==='MD'?moldovaObservances.filter(row=>row.date>=start&&row.date<=end):[];
 return [...rows,...additions.filter(row=>!rows.some(existing=>existing.date===row.date&&existing.name===row.name))].sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
const moldovaCoverage='Список неполный: профессиональные и памятные даты сверены частично; местные события не включены.';
export async function loadFreeHolidays(country:HolidayCountry,start:string,end:string,fetcher:typeof fetch=fetch){
 if(country!=='MD'&&country!=='DE'){
  const entry=cis.countries[country];
  let feed:Awaited<ReturnType<typeof import('./holiday-feed').reviewedFeedRows>>=null;let feedEnabled=false;
  try{const source=await import('./holiday-feed');feedEnabled=source.holidayFeedEnabled();feed=await source.reviewedFeedRows(country,start,end);}catch{}
  if(!validDate(start)||!validDate(end)||end<start||start<'2026-01-01'||(end>'2027-12-31'&&(!feed||!feed.years.includes(Number(end.slice(0,4)))||!feed.rows.some(row=>row.date.slice(0,4)===end.slice(0,4)))))throw new Error('Проверенные даты доступны только на 2026–2027 годы. Сохранённый календарь не изменён.');
  const rows:Row[]=cis.years.flatMap(year=>Object.entries(entry.dates).map(([day,name])=>({date:`${year}-${day}`,name}))).filter(row=>row.date>=start&&row.date<=end&&!(country==='AM'&&row.date==='2026-01-27'));
  rows.push(...cis.additionalDates.filter(row=>row.country===country&&row.date>=start&&row.date<=end));
  if(feed)rows.push(...feed.rows.filter(row=>!rows.some(old=>old.date===row.date&&old.name===row.name)));
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
  return {rows,conflicts:feed?.conflicts??[],url:entry.source,source:'Основные праздники · проверено 28.10.2026',model:'verified-cis-2026-2027',reserve:feedEnabled&&!feed,warning:`${feed?`Обновляемый справочник проверен; применены только ранее проверенные правила. ${feed.pending?`Даты, требующие проверки: ${feed.pending}. Изменения не применены; сохранённые отметки не перенесены. `:''}`:feedEnabled?'Обновляемый справочник недоступен. Сохранены проверенные даты. ':''}Список неполный. ${entry.coverageNote} График работы заведения не меняется.` as string|null};
 }
 const url=new URL('https://openholidaysapi.org/PublicHolidays');url.search=new URLSearchParams({countryIsoCode:country,validFrom:start,validTo:end}).toString();
 try{
  const response=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!response.ok)throw new Error('Источник недоступен');
  const text=await response.text();if(text.length>250000)throw new Error('Ответ слишком большой');
  const rows=parsePublicHolidays(JSON.parse(text),start,end);
  // Do not silently publish English fallback names as a Russian calendar.
  if(country==='MD'&&rows.some(row=>!knownMoldovaTitle(row)))throw new Error('Русское название новой даты требует проверки');
  return {rows:withReviewedObservances(country,start,end,rows),url:url.toString(),source:'OpenHolidays · ODbL',model:'openholidays',reserve:false,warning:country==='MD'?moldovaCoverage:null as string|null};
 }catch{
  const years=fallback.countries[country] as Record<string,Row[]>;
  const rows=Object.values(years).flat().filter(row=>row.date>=start&&row.date<=end);
  if(!rows.length)throw new Error('Справочник недоступен; резервных дат для этого периода нет. Сохранённый календарь не изменён.');
  return {rows:withReviewedObservances(country,start,end,rows),url:'https://github.com/vacanza/holidays/tree/v0.107',source:'holidays 0.107 · MIT · резерв 28.10.2026',model:'holidays-0.107-reserve',reserve:true,warning:'Источник недоступен. Показан резервный справочник 2026–2027; даты за пределами этого периода не проверены.'+(country==='MD'?' '+moldovaCoverage:'')};
 }
}
function knownMoldovaTitle(row:Row):string|null{
 const n=row.name.toLowerCase(),md=row.date.slice(5);
 if(n.includes('new year')&&md==='01-01')return 'Новый год';
 if((n.includes('old style')||n.includes('christmas'))&&md==='01-07')return 'Православное Рождество';
 if((n.includes('old style')||n.includes('christmas'))&&md==='01-08')return 'Второй день православного Рождества';
 if(n.includes('women'))return 'Международный женский день';
 if(n.includes('labor')||n.includes('labour')||n.includes('workers'))return 'Праздник труда';
 if(n.includes('radonitsa')||n.includes('rejoicing'))return 'Пасха усопших';
 if(n.includes('easter'))return new Date(row.date+'T12:00:00Z').getUTCDay()===1?'Второй день Пасхи':'Пасха';
 if(n.includes('victory')||n.includes('europe day'))return 'День Победы и День Европы';
 if(n.includes('children'))return 'Международный день защиты детей';
 if(n.includes('independence'))return 'День независимости Республики Молдова';
 if(n.includes('language'))return 'День языка «Limba noastră»';
 if(n.includes('christmas')&&md==='12-25')return 'Рождество по новому стилю';
 return null;
}
export function freeHolidayRaw(context:OpportunityVenueContext,start:string,end:string,data:{rows:Row[];url:string;source:string;reserve:boolean;warning:string|null},country:HolidayCountry){
 const baseline=buildOpportunityBaseline({context,windowStart:start,windowEnd:end});
 const events:Record<string,unknown>[]=[];const seen=new Set<string>();
 for(const row of data.rows){
  const germanNames:Record<string,string>={'Labor Day':'Labour Day','German Unity Day':'Day of German Unity','Second Day of Christmas':'2nd Day of Christmas'};
  const title=country==='MD'?knownMoldovaTitle(row)??row.name:germanNames[row.name]??row.name;
  const key=row.sourceIdentity??(row.date+'|'+title);if(seen.has(key))continue;seen.add(key);
  const template=country==='MD'?baseline.raw.events.find(e=>e.title===title&&e.startDate===row.date):undefined;
  events.push({...template,...(row.sourceIdentity?{sourceIdentity:`openholidays:${country}:${row.sourceIdentity}`} : {}),title,startDate:row.date,endDate:null,activationDate:template?.activationDate??row.date,category:'holiday',calendarType:'official',origin:'baseline',locality:'national',location:context.country,
   assessmentAvailable:Boolean(template),summary:`${row.kind==='transfer'?'Перенос выходного по опубликованному решению. Применимость зависит от рабочего режима; график заведения не меняется.':row.kind==='observance'?'Праздничная или памятная дата; сама по себе не означает выходной.':row.kind==='religious'?'Религиозный праздник.':'Национальный праздник.'} Источник: ${row.source?'официальная публикация':data.source}.`,sourceUrls:[row.source??data.url],
   ...(template?{}:{scoreReason:'Оценка для этой даты пока не рассчитана.',scoreBreakdown:{},whyUseful:[],impact:{metric:'Не оценено',range:'Нет оценки',basis:'Справочник сообщает даты, а не прогноз спроса.'},recommendation:{format:'Не задан',offer:'Не задано',promotion:'Не задано',operations:'Не задано',decisionDeadline:null,leadDays:14}})});
 }
 // Only established annual seasonal occasions; never roll local event listings into a new year.
 if(country==='MD'||country==='DE') events.push(...baseline.raw.events.filter(e=>['Хэллоуин','Новогодняя ночь','Международный день студентов'].includes(String(e.title))));
 return {raw:{summary:`${data.warning??''} Праздники и памятные даты: ${data.source}. Местная афиша не обновлялась.`,events},sources:[...baseline.sources.filter(source=>events.some(event=>Array.isArray(event.sourceUrls)&&event.sourceUrls.includes(source.url))),{url:data.url,title:data.source},...Array.from(new Set(data.rows.map(row=>row.source).filter((url):url is string=>Boolean(url)))).map(url=>({url,title:'Официальный источник даты'})),...(country==='MD'||country==='DE'?[{url:'https://www.openholidaysapi.org/en/faq/',title:'OpenHolidays: источники и лицензия ODbL'}]:[])]};
}
