import type { OpenAIWebSource } from './openai';

type Row=Record<string,unknown>;
export type MarketLocation={city:string;country:string;region?:string};
const row=(v:unknown):Row|null=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Row:null;
const string=(v:unknown)=>typeof v==='string'?v.trim():'';
const strings=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];
// Orthographic normalization only. It does not equate neighbouring cities or
// infer an address from a brand, a query string, or the model's own assertions.
const transliteration:Record<string,string>={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',і:'i',ї:'yi',є:'ye'};
export function marketEvidenceWords(v:string){return v.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[а-яіїє]/g,c=>transliteration[c]??c).replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');}
const contains=(hay:string,needle:string)=>Boolean(needle&&(' '+hay+' ').includes(' '+needle+' '));
const countryGroups=[['MD','Moldova','Молдова','Молдавия'],['RO','Romania','Румыния'],['RU','Russia','Россия','Russian Federation'],['UA','Ukraine','Украина'],['DE','Germany','Deutschland','Германия'],['US','United States','USA','США'],['GB','United Kingdom','UK','Великобритания'],['FR','France','Франция']];
function countryInfo(country:string){
 const norm=marketEvidenceWords(country),group=countryGroups.find(g=>g.some(x=>marketEvidenceWords(x)===norm));
 const code=group?.[0]??(/^[a-z]{2}$/i.test(country)?country.toUpperCase():null);
 const names=[country,...(group?.slice(1)??[])];
 if(code)for(const locale of ['en','ru','ro','de','fr'])try{names.push(new Intl.DisplayNames([locale],{type:'region'}).of(code)??'')}catch{/* Unknown country stays unverified. */}
 return {code,aliases:[...new Set(names.map(marketEvidenceWords).filter(x=>x.length>2))]};
}
// Reviewed city names, scoped to the country, never venue IDs or model-provided aliases.
// Bender/Tighina: https://moldova.travel/en/transnistrian-region/
// Chisinau/Kishinev: https://visit.chisinau.md/en/topics/legende/
const cityNameGroups:Record<string,string[][]>={MD:[
 ['Bender','Bendery','Бендер','Бендеры','Tighina','Тигина'],
 ['Chișinău','Chisinau','Кишинёв','Кишинев','Кишинэу','Kishinev'],
]};
function cityForms(city:string,country:string){
 const normalized=marketEvidenceWords(city),code=countryInfo(country).code;
 const group=(code?cityNameGroups[code]:undefined)?.map(names=>names.map(marketEvidenceWords)).find(names=>names.includes(normalized));
 return group?[...new Set(group)]:[normalized];
}
function sameCity(a:string,b:string,country:string){return cityForms(a,country).includes(marketEvidenceWords(b));}
function containsCity(text:string,city:string,country:string){return cityForms(city,country).some(alias=>contains(text,alias));}
export function marketAddressMatches(city:string,country:string,location:MarketLocation,region=''){
 const expected=countryInfo(location.country),actual=countryInfo(country);
 return Boolean(expected.code&&actual.code&&expected.code===actual.code&&sameCity(city,location.city,location.country)&&(!location.region||sameCity(location.region,location.city,location.country)||marketEvidenceWords(region)===marketEvidenceWords(location.region)));
}
const horeca=/\b(?:restaurant|restoran|restaurante|restaurantele|cafe|caffe|cafenea|cafeneaua|kafe|pub|bar|bistro|pizzeria|pizzeriya|hotel|otel|gostinitsa|nightclub|club|klub|coffee|coffeeshop|bakery|pekarnya|stolovaya)\b/;
const irrelevant=/\b(?:dating app|dating application|dating service|tinder|software|download|prilozhenie|video game)\b/;
const marketTopic=/\b(?:population|naselenie|tourism|turizm|tourist|travel|traffic|transport|economy|economic|ekonomika|income|dohod|statistics|statistika|municipality|municipal|primaria|council|events|festival|festivali)\b/;
function metadata(source:OpenAIWebSource){
 try{const u=new URL(source.url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;
 return {title:marketEvidenceWords(source.title),path:marketEvidenceWords(decodeURIComponent(u.pathname)),host:u.hostname.toLowerCase(),text:marketEvidenceWords(source.title+' '+decodeURIComponent(u.pathname))};}catch{return null;}
}
export type MarketEvidenceStatus='local'|'city_unverified'|'venue_unverified';
export function marketCandidateEligible(value:unknown){const item=row(value);return !!item&&strings(item.sourceUrls).some(url=>{try{const u=new URL(url);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}})&&(!item.evidenceStatus||item.evidenceStatus==='local');}
function sourceAssessment(source:OpenAIWebSource,location:MarketLocation,name?:string){
 const m=metadata(source),city=marketEvidenceWords(location.city),region=marketEvidenceWords(location.region??''),country=countryInfo(location.country),entity=marketEvidenceWords(name??'');
 if(!m)return {status:'unknown' as const,entity:false,named:false,reason:'INVALID_SOURCE' as const};
 const named=Boolean(entity&&contains(m.text,entity)),venue=named&&horeca.test(m.text);
 if(irrelevant.test(m.text))return {status:'irrelevant' as const,entity:named,named,reason:'IRRELEVANT_SOURCE' as const};
 const geoText=entity?m.text.split(entity).join(' '):m.text;
 const conflictCountry=Boolean(location.country)&&countryGroups.some(g=>g[0]!==country.code&&g.slice(1).some(v=>contains(m.title,marketEvidenceWords(v))));
 const explicit=source.title.match(/(?:^|[\s,;|])(?:city|город|г\.|oraș|oras|localitate)\s*[:=]\s*([^,;|—–]+)/iu);
 const located=source.title.match(/(?:restaurant|restoran|ресторан|cafe|café|кафе|pub|bar|бар)\b.{0,40}?\s(?:in|в|din)\s+([^,;|—–]+)/iu);
 // Recognize a source's explicit "Name — City, Country" address, without a city dictionary.
 const address=source.title.split(/[|—–]/).map(x=>x.trim()).slice(1).map(x=>x.split(',').map(y=>y.trim())).find(parts=>parts.length>=2&&country.aliases.some(alias=>contains(marketEvidenceWords(parts.slice(1).join(' ')),alias)));
 const tail=marketEvidenceWords(source.title.split(/[|—–]/).slice(1).at(-1)??'');
 const tailCountry=country.aliases.find(alias=>tail.endsWith(' '+alias));
 const addressCity=tailCountry?tail.slice(0,-tailCountry.length).trim():undefined;
 const statedCity=explicit?.[1]??located?.[1]??address?.[0]??addressCity;
 const conflictCity=Boolean(city&&statedCity&&!containsCity(marketEvidenceWords(statedCity),city,location.country));
 if(conflictCountry||conflictCity)return {status:'conflict' as const,entity:named,named,reason:conflictCountry?'COUNTRY_CONFLICT' as const:'CITY_CONFLICT' as const};
 const geographic=Boolean(city&&location.country&&containsCity(geoText,city,location.country)&&(!region||sameCity(region,city,location.country)||contains(geoText,region))&&country.aliases.some(alias=>contains(geoText,alias)));
 const topical=name?venue:horeca.test(m.text)||marketTopic.test(m.text);
 return {status:geographic&&topical?'local' as const:'unknown' as const,entity:venue,named,reason:!geographic?'LOCATION_UNVERIFIED' as const:!topical?'TOPIC_UNVERIFIED' as const:'LOCAL_SOURCE' as const};
}
/** Source metadata is evidence of relevance, not verification of page contents.
 * Missing location and contradictory location are deliberately different states. */
export function marketSourceRelevant(source:OpenAIWebSource,location:MarketLocation,name?:string){return sourceAssessment(source,location,name).status==='local';}

export function filterMarketEvidence(raw:unknown,sources:OpenAIWebSource[],location:MarketLocation){
 const diagnostics = {
  version:1,
  candidates:{INVALID_CANDIDATE:0,CLAIMED_CITY_CONFLICT:0,CLAIMED_COUNTRY_CONFLICT:0,IRRELEVANT_TYPE:0,SOURCE_COUNTRY_CONFLICT:0,SOURCE_CITY_CONFLICT:0,IRRELEVANT_SOURCE:0,KEPT_LOCAL:0,KEPT_CITY_UNVERIFIED:0,KEPT_VENUE_UNVERIFIED:0},
  sources:{RETAINED:0,DUPLICATE:0,INVALID_SOURCE:0,COUNTRY_CONFLICT:0,CITY_CONFLICT:0,IRRELEVANT_SOURCE:0,LOCATION_UNVERIFIED:0,TOPIC_UNVERIFIED:0,UNUSED_LOCAL_SOURCE:0},
  claims:{INVALID_CLAIM:0,NO_REFERENCES:0,NO_LOCAL_SOURCE:0,ENTITY_UNLINKED:0,UNCONFIRMED_ENTITY:0,RETAINED:0},
  references:{AVAILABLE:0,MISSING_SOURCE:0,INVALID_REFERENCE:0}
 };
 const input=row(raw)??{},byUrl=new Map(sources.map(s=>[s.url,s]));
 const links=(value:unknown)=>[...new Set(strings(value))].filter(url=>{const source=byUrl.get(url);return source&&marketSourceRelevant(source,location)});
 const candidates=(Array.isArray(input.competitors)?input.competitors:[]).map(row).filter((v):v is Row=>!!v&&!!string(v.name));
 diagnostics.candidates.INVALID_CANDIDATE=(Array.isArray(input.competitors)?input.competitors.length:0)-candidates.length;
 const competitors=candidates.flatMap(v=>{
  const claimedCity=string(v.city),claimedCountry=string(v.country);
  if(location.city&&claimedCity&&!sameCity(claimedCity,location.city,location.country)){diagnostics.candidates.CLAIMED_CITY_CONFLICT++;return [];}
  if(location.country&&claimedCountry){const expected=countryInfo(location.country),claimed=countryInfo(claimedCountry);if(expected.code&&claimed.code?expected.code!==claimed.code:!expected.aliases.some(a=>claimed.aliases.includes(a))){diagnostics.candidates.CLAIMED_COUNTRY_CONFLICT++;return [];}}
  if(irrelevant.test(marketEvidenceWords(string(v.name)+' '+string(v.category)))){diagnostics.candidates.IRRELEVANT_TYPE++;return [];}
  const cited=[...new Set(strings(v.sourceUrls))].flatMap(url=>{const source=byUrl.get(url);return source&&metadata(source)?[{source,...sourceAssessment(source,location,string(v.name))}]:[]});
  const rejected=cited.find(s=>s.entity&&(s.status==='conflict'||s.status==='irrelevant'));
  if(rejected){diagnostics.candidates[rejected.reason==='COUNTRY_CONFLICT'?'SOURCE_COUNTRY_CONFLICT':rejected.reason==='CITY_CONFLICT'?'SOURCE_CITY_CONFLICT':'IRRELEVANT_SOURCE']++;return [];}

  const local=cited.filter(s=>s.status==='local'),venue=cited.filter(s=>s.entity&&s.status==='unknown');
  const evidenceStatus:MarketEvidenceStatus=local.length?'local':venue.length?'city_unverified':'venue_unverified';
  diagnostics.candidates[evidenceStatus==='local'?'KEPT_LOCAL':evidenceStatus==='city_unverified'?'KEPT_CITY_UNVERIFIED':'KEPT_VENUE_UNVERIFIED']++;
  const retained=local.length?local:venue.length?venue:cited.filter(s=>s.status==='unknown'&&s.named);
  return [{...v,name:v.name,key:undefined,evidenceStatus,sourceUrls:retained.map(s=>s.source.url),confirmed:false,...(evidenceStatus==='local'?{}:{evidence:evidenceStatus==='city_unverified'?'Город не подтверждён':'Заведение не подтверждено',distance:'',rating:'',strengths:[],gaps:[],score:null,relevanceScore:null})}];
 });
 const blockedNames=candidates.filter(v=>!competitors.some(c=>c.name===v.name&&c.evidenceStatus==='local')).map(v=>marketEvidenceWords(string(v.name)));
 const mentionsUnproven=(v:Row)=>{const text=marketEvidenceWords(Object.entries(v).filter(([k])=>k!=='sourceUrls').map(([,value])=>JSON.stringify(value)).join(' '));return blockedNames.some(name=>contains(text,name));};
 // A city-wide source cannot substantiate a claim about a named business.
 const claimLinks=(value:Row,track=true)=>{
  const text=marketEvidenceWords(Object.entries(value).filter(([key])=>key!=='sourceUrls').map(([,v])=>JSON.stringify(v)).join(' '));
  const names=candidates.filter(v=>contains(text,marketEvidenceWords(string(v.name)))).map(v=>string(v.name));
  const urls=links(value.sourceUrls);
  const linked=names.every(name=>urls.some(url=>marketSourceRelevant(byUrl.get(url)!,location,name)));
  if(track)diagnostics.claims[!strings(value.sourceUrls).length?'NO_REFERENCES':!urls.length?'NO_LOCAL_SOURCE':!linked?'ENTITY_UNLINKED':mentionsUnproven(value)?'UNCONFIRMED_ENTITY':'RETAINED']++;
  if(!linked)return [];
  return urls.filter(url=>names.length===0||names.some(name=>marketSourceRelevant(byUrl.get(url)!,location,name)));
 };
 diagnostics.claims.INVALID_CLAIM=['location','audience','economy','positioning'].filter(k=>Object.hasOwn(input,k)&&!row(input[k])).length+['opportunities','risks','pricing','marketing','actions'].reduce((count,k)=>count+(Array.isArray(input[k])?input[k].filter(v=>!row(v)).length:0),0);
 const localCount=competitors.filter(c=>c.evidenceStatus==='local').length;
 const result:Row={assumptions:['Сопоставлены названия и ссылки. Содержание страниц не проверено.'],competitors,competitorSummary:localCount?'Найдены местные заведения для проверки.':competitors.length?'Город кандидатов требует проверки.':'Недостаточно источников о заведениях в этом городе.'};
 for(const key of ['location','audience','economy','positioning']){
  const section=row(input[key])??{},sourceUrls=claimLinks(section,Boolean(row(input[key])));
  result[key]=sourceUrls.length&&!mentionsUnproven(section)?{...section,sourceUrls}:{summary:'Недостаточно местных источников.',signals:[],segments:[],sourceUrls:[]};
 }
 for(const key of ['opportunities','risks','pricing','marketing','actions'])result[key]=(Array.isArray(input[key])?input[key]:[]).map(row).filter((v):v is Row=>!!v).flatMap(v=>{
  const sourceUrls=claimLinks(v);return sourceUrls.length&&!mentionsUnproven(v)?[{...v,sourceUrls}]:[];
 });
 const retainedSources=linkedMarketSources(result,sources),retainedUrls=new Set(retainedSources.map(s=>s.url)),seen=new Set<string>();
 for(const source of sources){
  const reason=sourceAssessment(source,location).reason;
  if(seen.has(source.url))diagnostics.sources.DUPLICATE++;
  else if(retainedUrls.has(source.url))diagnostics.sources.RETAINED++;
  else diagnostics.sources[reason==='LOCAL_SOURCE'?'UNUSED_LOCAL_SOURCE':reason]++;
  seen.add(source.url);
 }
 // Count raw reference occurrences, including duplicates, independently of early candidate rejection.
 const referenceRows=[...(Array.isArray(input.competitors)?input.competitors:[]),...['location','audience','economy','positioning'].map(k=>input[k]),...['opportunities','risks','pricing','marketing','actions'].flatMap(k=>Array.isArray(input[k])?input[k]:[])];
 for(const value of referenceRows){const refs=row(value)?.sourceUrls;if(Array.isArray(refs))for(const ref of refs)diagnostics.references[typeof ref!=='string'||!ref.trim()?'INVALID_REFERENCE':byUrl.has(ref)?'AVAILABLE':'MISSING_SOURCE']++;}
 return {result,sources:retainedSources,diagnostics};
}

export function linkedMarketSources(result:unknown,sources:OpenAIWebSource[]){
 const used=new Set<string>();
 const collect=(v:unknown)=>{if(Array.isArray(v))v.forEach(collect);else if(row(v))for(const [key,value]of Object.entries(v as Row))key==='sourceUrls'?strings(value).forEach(url=>used.add(url)):collect(value)};
 collect(result);
 return sources.filter((source,index)=>used.has(source.url)&&sources.findIndex(s=>s.url===source.url)===index);
}
