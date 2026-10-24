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
const horeca=/\b(?:restaurant|restoran|restaurante|restaurantele|cafe|caffe|cafenea|cafeneaua|kafe|pub|bar|bistro|pizzeria|pizzeriya|hotel|otel|gostinitsa|nightclub|club|klub|coffee|coffeeshop|bakery|pekarnya|stolovaya)\b/;
const irrelevant=/\b(?:dating app|dating application|dating service|tinder|software|download|prilozhenie|video game)\b/;
const marketTopic=/\b(?:population|naselenie|tourism|turizm|tourist|travel|traffic|transport|economy|economic|ekonomika|income|dohod|statistics|statistika|municipality|municipal|primaria|council|events|festival|festivali)\b/;
function metadata(source:OpenAIWebSource){
 try{const u=new URL(source.url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;
 return {title:marketEvidenceWords(source.title),path:marketEvidenceWords(decodeURIComponent(u.pathname)),host:u.hostname.toLowerCase(),text:marketEvidenceWords(source.title+' '+decodeURIComponent(u.pathname))};}catch{return null;}
}
export type MarketEvidenceStatus='local'|'city_unverified'|'venue_unverified';
export function marketCandidateEligible(value:unknown){const item=row(value);return !!item&&(!item.evidenceStatus||item.evidenceStatus==='local');}
function sourceAssessment(source:OpenAIWebSource,location:MarketLocation,name?:string){
 const m=metadata(source),city=marketEvidenceWords(location.city),region=marketEvidenceWords(location.region??''),country=countryInfo(location.country),entity=marketEvidenceWords(name??'');
 if(!m)return {status:'unknown' as const,entity:false,named:false};
 const named=Boolean(entity&&contains(m.text,entity)),venue=named&&horeca.test(m.text);
 if(irrelevant.test(m.text))return {status:'irrelevant' as const,entity:named,named};
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
 const conflictCity=Boolean(city&&statedCity&&!contains(marketEvidenceWords(statedCity),city));
 if(conflictCountry||conflictCity)return {status:'conflict' as const,entity:named,named};
 const geographic=Boolean(city&&location.country&&contains(geoText,city)&&(!region||region===city||contains(geoText,region))&&country.aliases.some(alias=>contains(geoText,alias)));
 const topical=name?venue:horeca.test(m.text)||marketTopic.test(m.text);
 return {status:geographic&&topical?'local' as const:'unknown' as const,entity:venue,named};
}
/** Source metadata is evidence of relevance, not verification of page contents.
 * Missing location and contradictory location are deliberately different states. */
export function marketSourceRelevant(source:OpenAIWebSource,location:MarketLocation,name?:string){return sourceAssessment(source,location,name).status==='local';}

export function filterMarketEvidence(raw:unknown,sources:OpenAIWebSource[],location:MarketLocation){
 const input=row(raw)??{},byUrl=new Map(sources.map(s=>[s.url,s]));
 const links=(value:unknown)=>[...new Set(strings(value))].filter(url=>{const source=byUrl.get(url);return source&&marketSourceRelevant(source,location)});
 const candidates=(Array.isArray(input.competitors)?input.competitors:[]).map(row).filter((v):v is Row=>!!v&&!!string(v.name));
 const competitors=candidates.flatMap(v=>{
  const claimedCity=string(v.city),claimedCountry=string(v.country);
  if(location.city&&claimedCity&&marketEvidenceWords(claimedCity)!==marketEvidenceWords(location.city))return [];
  if(location.country&&claimedCountry){const expected=countryInfo(location.country),claimed=countryInfo(claimedCountry);if(expected.code&&claimed.code?expected.code!==claimed.code:!expected.aliases.some(a=>claimed.aliases.includes(a)))return [];}
  if(irrelevant.test(marketEvidenceWords(string(v.name)+' '+string(v.category))))return [];
  const cited=[...new Set(strings(v.sourceUrls))].flatMap(url=>{const source=byUrl.get(url);return source&&metadata(source)?[{source,...sourceAssessment(source,location,string(v.name))}]:[]});
  if(cited.some(s=>s.entity&&(s.status==='conflict'||s.status==='irrelevant')))return [];
  const local=cited.filter(s=>s.status==='local'),venue=cited.filter(s=>s.entity&&s.status==='unknown');
  const evidenceStatus:MarketEvidenceStatus=local.length?'local':venue.length?'city_unverified':'venue_unverified';
  const retained=local.length?local:venue.length?venue:cited.filter(s=>s.status==='unknown'&&s.named);
  return [{...v,name:v.name,key:undefined,evidenceStatus,sourceUrls:retained.map(s=>s.source.url),confirmed:false,...(evidenceStatus==='local'?{}:{evidence:evidenceStatus==='city_unverified'?'Город не подтверждён':'Заведение не подтверждено',distance:'',rating:'',strengths:[],gaps:[],score:null,relevanceScore:null})}];
 });
 const blockedNames=candidates.filter(v=>!competitors.some(c=>c.name===v.name&&c.evidenceStatus==='local')).map(v=>marketEvidenceWords(string(v.name)));
 const mentionsUnproven=(v:Row)=>{const text=marketEvidenceWords(Object.entries(v).filter(([k])=>k!=='sourceUrls').map(([,value])=>JSON.stringify(value)).join(' '));return blockedNames.some(name=>contains(text,name));};
 // A city-wide source cannot substantiate a claim about a named business.
 const claimLinks=(value:Row)=>{
  const text=marketEvidenceWords(Object.entries(value).filter(([key])=>key!=='sourceUrls').map(([,v])=>JSON.stringify(v)).join(' '));
  const names=candidates.filter(v=>contains(text,marketEvidenceWords(string(v.name)))).map(v=>string(v.name));
  const urls=links(value.sourceUrls);
  if(!names.every(name=>urls.some(url=>marketSourceRelevant(byUrl.get(url)!,location,name))))return [];
  return urls.filter(url=>names.length===0||names.some(name=>marketSourceRelevant(byUrl.get(url)!,location,name)));
 };
 const localCount=competitors.filter(c=>c.evidenceStatus==='local').length;
 const result:Row={assumptions:['Сопоставлены названия и ссылки. Содержание страниц не проверено.'],competitors,competitorSummary:localCount?'Найдены местные заведения для проверки.':competitors.length?'Город кандидатов требует проверки.':'Недостаточно источников о заведениях в этом городе.'};
 for(const key of ['location','audience','economy','positioning']){
  const section=row(input[key])??{},sourceUrls=claimLinks(section);
  result[key]=sourceUrls.length&&!mentionsUnproven(section)?{...section,sourceUrls}:{summary:'Недостаточно местных источников.',signals:[],segments:[],sourceUrls:[]};
 }
 for(const key of ['opportunities','risks','pricing','marketing','actions'])result[key]=(Array.isArray(input[key])?input[key]:[]).map(row).filter((v):v is Row=>!!v).flatMap(v=>{
  const sourceUrls=claimLinks(v);return sourceUrls.length&&!mentionsUnproven(v)?[{...v,sourceUrls}]:[];
 });
 return {result,sources:linkedMarketSources(result,sources)};
}

export function linkedMarketSources(result:unknown,sources:OpenAIWebSource[]){
 const used=new Set<string>();
 const collect=(v:unknown)=>{if(Array.isArray(v))v.forEach(collect);else if(row(v))for(const [key,value]of Object.entries(v as Row))key==='sourceUrls'?strings(value).forEach(url=>used.add(url)):collect(value)};
 collect(result);
 return sources.filter((source,index)=>used.has(source.url)&&sources.findIndex(s=>s.url===source.url)===index);
}
