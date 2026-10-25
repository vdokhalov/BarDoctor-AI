import { marketEvidenceWords, marketAddressMatches, type MarketLocation } from './market-source-relevance';
import type { OpenAIWebSource } from './openai';
type Row=Record<string,unknown>;
const object=(v:unknown):Row|null=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Row:null;
const str=(v:unknown,max=256)=>typeof v==='string'&&v.trim().length<=max?v.trim():'';
const hosts=new Set(['www.tripadvisor.com','tripadvisor.com','www.tripadvisor.co.uk','tripadvisor.co.uk']);
const MAX_BYTES=1_048_576, MAX_PAGES=4, PAGE_MS=2500;
export type PageReason='VERIFIED'|'UNSUPPORTED_URL'|'BLOCKED'|'HTTP_ERROR'|'REDIRECT_REJECTED'|'TIMEOUT'|'NETWORK_ERROR'|'TOO_LARGE'|'UNSUPPORTED_CONTENT'|'MALFORMED'|'NO_STRUCTURED_ADDRESS'|'IDENTITY_MISMATCH'|'ADDRESS_CONFLICT'|'AMBIGUOUS'|'LIMIT';
type Address={name:string;streetAddress:string;city:string;country:string;region:string};
export type PageEvidence={status:'verified'|'unverified';reason:PageReason;sourceUrl?:string;checkedAt:string;kind?:'schema_org';address?:Address};
/** Deliberately closed public-origin/path allowlist. No arbitrary DNS, IPs,
 * query endpoints, credentials, ports or redirects to unreviewed origins. */
export function eligibleMarketPage(value:string):URL|null{
 try{if(value.length>2048)return null;const url=new URL(value);if(url.protocol!=='https:'||!hosts.has(url.hostname)||url.port||url.username||url.password||url.search||url.hash)return null;
 if(!/^\/Restaurant_Review-g\d+-d\d+-Reviews-[A-Za-z0-9_.~-]+\.html$/.test(url.pathname))return null;return url;
 }catch{return null;}
}
const venueTypes=new Set(['Restaurant','CafeOrCoffeeShop','BarOrPub','FoodEstablishment','NightClub','FastFoodRestaurant','Bakery']);
export function parseMarketPage(html:string,name:string,location:MarketLocation):{reason:PageReason;address?:Address}{
 if(html.length>MAX_BYTES)return{reason:'TOO_LARGE'};
 const entities:Row[]=[];let scripts=0,nodes=0,limited=false;
 function walk(value:unknown,depth:number){if(++nodes>2000||depth>10){limited=true;return;}if(Array.isArray(value)){for(const child of value){if(limited)break;walk(child,depth+1);}return;}const item=object(value);if(!item)return;
 const types=Array.isArray(item['@type'])?item['@type']:[item['@type']];if(types.some(t=>typeof t==='string'&&venueTypes.has(t.replace(/^https?:\/\/schema\.org\//,''))))entities.push(item);
 for(const child of Object.values(item)){if(limited)break;if(child&&typeof child==='object')walk(child,depth+1);}
 }
 const lower=html.toLowerCase();let cursor=0,tags=0;
 while(cursor<html.length){
  const start=lower.indexOf('<script',cursor),comment=lower.indexOf('<!--',cursor);
  if(comment>=0&&(start<0||comment<start)){const end=lower.indexOf('-->',comment+4);if(end<0)return{reason:'MALFORMED'};cursor=end+3;continue;}
  if(start<0)break;
  if(!/[\s>]/.test(lower[start+7]||'')){cursor=start+7;continue;}
  if(++tags>128)return{reason:'LIMIT'};
  const tagEnd=lower.indexOf('>',start+7);if(tagEnd<0||tagEnd-start>4096)return{reason:'LIMIT'};
  const close=lower.indexOf('</script',tagEnd+1),closeEnd=close<0?-1:lower.indexOf('>',close+8);if(close<0||closeEnd<0)return{reason:'MALFORMED'};
  cursor=closeEnd+1;
  if(!/\btype\s*=\s*["']application\/ld\+json["']/i.test(html.slice(start+7,tagEnd)))continue;
  const body=html.slice(tagEnd+1,close);
  if(++scripts>16||body.length>131072)return{reason:'LIMIT'};
  let parsed:unknown;try{parsed=JSON.parse(body)}catch{return{reason:'MALFORMED'}};
  const roots=Array.isArray(parsed)?parsed:[parsed];
  for(const root of roots){const context=object(root)?.['@context'];if(context==='https://schema.org'||context==='http://schema.org'||context==='https://schema.org/'||context==='http://schema.org/')walk(root,0);}
  if(limited)return{reason:'LIMIT'};
 }
 if(!entities.length)return{reason:'NO_STRUCTURED_ADDRESS'};
 const names=new Set(entities.map(e=>marketEvidenceWords(str(e.name))).filter(Boolean));
 if(names.size>1)return{reason:'AMBIGUOUS'};
 if(!names.has(marketEvidenceWords(name)))return{reason:'IDENTITY_MISMATCH'};
 const addresses:Address[]=[];
 for(const entity of entities){const a=object(entity.address);if(!a)return{reason:'NO_STRUCTURED_ADDRESS'};
 const address={name:str(entity.name),streetAddress:str(a.streetAddress),city:str(a.addressLocality,160),country:str(a.addressCountry,80)||str(object(a.addressCountry)?.name,80),region:str(a.addressRegion,160)};
 if(!address.name||!address.streetAddress||!address.city||!address.country)return{reason:'NO_STRUCTURED_ADDRESS'};
 if(!marketAddressMatches(address.city,address.country,location,address.region))return{reason:location.region&&!address.region?'NO_STRUCTURED_ADDRESS':'ADDRESS_CONFLICT'};
 addresses.push(address);
 }
 if(new Set(addresses.map(a=>marketEvidenceWords(a.streetAddress+' '+a.city+' '+a.country))).size!==1)return{reason:'AMBIGUOUS'};
 return{reason:'VERIFIED',address:addresses[0]};
}
async function readPage(url:URL,fetcher:typeof fetch):Promise<{html?:string;reason?:PageReason}>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,activeReader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const work=async()=>{
  let current=url;
  for(let hop=0;hop<2;hop++){
   const response=await fetcher(current.href,{method:'GET',redirect:'manual',credentials:'omit',referrerPolicy:'no-referrer',headers:{Accept:'text/html'},signal:controller.signal});
   if(response.status>=300&&response.status<400){await response.body?.cancel();const target=response.headers.get('location');if(!target)return{reason:'REDIRECT_REJECTED' as const};const next=eligibleMarketPage(new URL(target,current).href);
    if(hop||!next||next.hostname!==url.hostname||next.pathname!==url.pathname)return{reason:'REDIRECT_REJECTED' as const};current=next;continue;}
   if(!response.ok){await response.body?.cancel();return{reason:response.status===401||response.status===403||response.status===429?'BLOCKED' as const:'HTTP_ERROR' as const};}
   if(!/^(text\/html|application\/xhtml\+xml)\b/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();return{reason:'UNSUPPORTED_CONTENT' as const};}
   if(Number(response.headers.get('content-length'))>MAX_BYTES){await response.body?.cancel();return{reason:'TOO_LARGE' as const};}
   const reader=response.body?.getReader();if(!reader)return{reason:'NO_STRUCTURED_ADDRESS' as const};activeReader=reader;let bytes=0,html='';const decoder=new TextDecoder();
   try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>MAX_BYTES){await reader.cancel();return{reason:'TOO_LARGE' as const};}html+=decoder.decode(part.value,{stream:true});}return{html:html+decoder.decode()};}finally{reader.releaseLock();activeReader=undefined;}
  }return{reason:'REDIRECT_REJECTED' as const};
 };
 try{return await Promise.race([work(),new Promise<{reason:PageReason}>(resolve=>{timer=setTimeout(()=>{controller.abort();void activeReader?.cancel().catch(()=>{});resolve({reason:'TIMEOUT'})},PAGE_MS)})]);}
 catch{return{reason:controller.signal.aborted?'TIMEOUT':'NETWORK_ERROR'}}finally{if(timer)clearTimeout(timer);controller.abort();}
}
/** Request-local only: no shared cache, credentials, AI calls, or writes. */
export async function verifyMarketPages(result:Row,sources:OpenAIWebSource[],location:MarketLocation,fetcher:typeof fetch=fetch){
 const candidates=Array.isArray(result.competitors)?result.competitors.slice(0,12):[],available=new Set(sources.map(s=>s.url));
 const urls=[...new Set(candidates.flatMap(v=>Array.isArray(object(v)?.sourceUrls)?(object(v)!.sourceUrls as unknown[]).filter((u):u is string=>typeof u==='string'&&available.has(u)&&!!eligibleMarketPage(u)):[]))].slice(0,MAX_PAGES);
 const pages=new Map<string,Awaited<ReturnType<typeof readPage>>>();
 for(let start=0;start<urls.length;start+=2)await Promise.all(urls.slice(start,start+2).map(async url=>{pages.set(url,await readPage(eligibleMarketPage(url)!,fetcher))}));
 const counts:Record<PageReason,number>={VERIFIED:0,UNSUPPORTED_URL:0,BLOCKED:0,HTTP_ERROR:0,REDIRECT_REJECTED:0,TIMEOUT:0,NETWORK_ERROR:0,TOO_LARGE:0,UNSUPPORTED_CONTENT:0,MALFORMED:0,NO_STRUCTURED_ADDRESS:0,IDENTITY_MISMATCH:0,ADDRESS_CONFLICT:0,AMBIGUOUS:0,LIMIT:0};
 const checkedAt=new Date().toISOString(),rejectedUrls=new Set<string>(),rejectedNames=new Set<string>();let inspections=0;
 const competitors=candidates.map(value=>{const candidate=object(value)??{},references=Array.isArray(candidate.sourceUrls)?candidate.sourceUrls:[];
  const checks=references.filter((u):u is string=>typeof u==='string'&&available.has(u)).map(sourceUrl=>{
   const page=pages.get(sourceUrl),parsed=page?.html!==undefined?(inspections++<12?parseMarketPage(page.html,str(candidate.name),location):{reason:'LIMIT' as const}):{reason:page?.reason??(eligibleMarketPage(sourceUrl)?'LIMIT':'UNSUPPORTED_URL') as PageReason};
   return {status:parsed.reason==='VERIFIED'?'verified':'unverified',reason:parsed.reason,sourceUrl,checkedAt,...(parsed.address?{kind:'schema_org',address:parsed.address}:{})} as PageEvidence;
  });
  const evidence=checks.find(c=>['ADDRESS_CONFLICT','AMBIGUOUS','IDENTITY_MISMATCH'].includes(c.reason))??checks.find(c=>c.status==='verified')??checks[0]??{status:'unverified',reason:'UNSUPPORTED_URL',checkedAt} as PageEvidence;
  counts[evidence.reason]++;const conflict=['ADDRESS_CONFLICT','AMBIGUOUS','IDENTITY_MISMATCH'].includes(evidence.reason);if(conflict){rejectedNames.add(marketEvidenceWords(str(candidate.name)));for(const check of checks)if(check.sourceUrl)rejectedUrls.add(check.sourceUrl);}
  // Never resurrect model statements/prices/ratings discarded by metadata filtering.
  return {...candidate,pageEvidence:evidence,...(conflict?{evidenceStatus:'venue_unverified',sourceUrls:[],evidence:'Адрес источника требует проверки.',distance:'',rating:'',strengths:[],gaps:[]}:{}),...(evidence.status==='verified'?{evidenceStatus:'local',evidence:'Название и адрес найдены на странице источника.',distance:'',rating:'',strengths:[],gaps:[]}:{})};
 });
 const clean:Row={...result,competitors};
 for(const key of ['location','audience','economy','positioning','opportunities','risks','pricing','marketing','actions']){
  const value=clean[key],conflicted=(v:unknown)=>{const text=' '+marketEvidenceWords(JSON.stringify(v)??'')+' ';return [...rejectedNames].some(name=>name&&text.includes(' '+name+' '))||(Array.isArray(object(v)?.sourceUrls)&&(object(v)!.sourceUrls as unknown[]).some(url=>typeof url==='string'&&rejectedUrls.has(url)));};
  if(Array.isArray(value))clean[key]=value.filter(v=>!conflicted(v));else if(conflicted(value))clean[key]={summary:'Недостаточно местных источников.',sourceUrls:[]};
 }
 return{result:clean,counts,pagesRequested:urls.length};
}
