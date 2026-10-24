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
const irrelevant=/\b(?:dating|znakomstva|znakomstv|znakomst v|tinder|software|download|prilozhenie|igra|video game)\b/;
const marketTopic=/\b(?:population|naselenie|tourism|turizm|tourist|travel|traffic|transport|economy|economic|ekonomika|income|dohod|statistics|statistika|municipality|municipal|primaria|council|events|festival|festivali)\b/;
function metadata(source:OpenAIWebSource){
 try{const u=new URL(source.url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;
 return {title:marketEvidenceWords(source.title),path:marketEvidenceWords(decodeURIComponent(u.pathname)),host:u.hostname.toLowerCase(),text:marketEvidenceWords(source.title+' '+decodeURIComponent(u.pathname))};}catch{return null;}
}
/** A relevance gate, not verification of prices, ratings or the page contents.
 * Provider source metadata is all this flow retains. Insufficient metadata must
 * fail closed; no model-supplied city/category is treated as independent proof. */
export function marketSourceRelevant(source:OpenAIWebSource,location:MarketLocation,name?:string):boolean{
 const m=metadata(source),city=marketEvidenceWords(location.city),region=marketEvidenceWords(location.region??''),country=countryInfo(location.country);
 if(!m||!city||!string(location.country)||irrelevant.test(m.text))return false;
 // A city appearing only inside the business name is not location evidence.
 const entity=marketEvidenceWords(name??'');
 const geoText=entity?m.text.split(entity).join(' '):m.text;
 if(!contains(geoText,city))return false;
 if(region&&region!==city&&!contains(geoText,region))return false;
 // A national domain may describe any country. It is not an address.
 const countryPresent=country.aliases.some(alias=>contains(geoText,alias));
 if(!countryPresent)return false;
 // Explicit country conflicts override a matching city.
 if(countryGroups.some(g=>g[0]!==country.code&&g.slice(1).some(v=>contains(m.title,marketEvidenceWords(v)))))return false;
 // Explicit address city supplied by the source, unlike loose word overlap.
 const explicit=source.title.match(/(?:^|[\s,;|])(?:city|город|г\.|oraș|oras|localitate)\s*[:=]\s*([^,;|—–]+)/iu);
 if(explicit&&!contains(marketEvidenceWords(explicit[1]),city))return false;
 const located=source.title.match(/(?:restaurant|restoran|ресторан|cafe|café|кафе|pub|bar|бар)\b.{0,40}?\s(?:in|в|din)\s+([^,;|—–]+)/iu);
 if(located&&!contains(marketEvidenceWords(located[1]),city))return false;
 if(name){if(!entity||!contains(m.text,entity)||!horeca.test(m.text))return false;}
 else if(!horeca.test(m.text)&&!marketTopic.test(m.text))return false;
 return true;
}

export function filterMarketEvidence(raw:unknown,sources:OpenAIWebSource[],location:MarketLocation){
 const input=row(raw)??{},byUrl=new Map(sources.map(s=>[s.url,s]));
 const links=(value:unknown,name?:string)=>[...new Set(strings(value))].filter(url=>{const source=byUrl.get(url);return source&&marketSourceRelevant(source,location,name)});
 const competitors=(Array.isArray(input.competitors)?input.competitors:[]).map(row).filter((v):v is Row=>!!v&&!!string(v.name)).flatMap(v=>{
  const claimedCity=string(v.city),claimedCountry=string(v.country);
  if(claimedCity&&marketEvidenceWords(claimedCity)!==marketEvidenceWords(location.city))return [];
  if(claimedCountry){const expected=countryInfo(location.country),claimed=countryInfo(claimedCountry);if(expected.code&&claimed.code?expected.code!==claimed.code:!expected.aliases.some(a=>claimed.aliases.includes(a)))return [];}
  const sourceUrls=links(v.sourceUrls,string(v.name));
  return sourceUrls.length?[{...v,key:undefined,sourceUrls,confirmed:false}]:[];
 });
 const result:Row={assumptions:input.assumptions,competitors,competitorSummary:competitors.length?'Найдены заведения для проверки.':'Недостаточно источников о заведениях в этом городе.'};
 for(const key of ['location','audience','economy','positioning']){
  const section=row(input[key])??{},sourceUrls=links(section.sourceUrls);
  result[key]=sourceUrls.length?{...section,sourceUrls}:{summary:'Недостаточно местных источников.',signals:[],segments:[],sourceUrls:[]};
 }
 for(const key of ['opportunities','risks','pricing','marketing','actions'])result[key]=(Array.isArray(input[key])?input[key]:[]).map(row).filter((v):v is Row=>!!v).flatMap(v=>{
  const sourceUrls=links(v.sourceUrls);return sourceUrls.length?[{...v,sourceUrls}]:[];
 });
 return {result,sources:linkedMarketSources(result,sources)};
}

export function linkedMarketSources(result:unknown,sources:OpenAIWebSource[]){
 const used=new Set<string>();
 const collect=(v:unknown)=>{if(Array.isArray(v))v.forEach(collect);else if(row(v))for(const [key,value]of Object.entries(v as Row))key==='sourceUrls'?strings(value).forEach(url=>used.add(url)):collect(value)};
 collect(result);
 return sources.filter((source,index)=>used.has(source.url)&&sources.findIndex(s=>s.url===source.url)===index);
}
