import {signedSourceEnabled,readSignedSource} from './holiday-signed-source';
import cis from './data/cis-holidays.json';
import sourceNames from './data/cis-source-names.json';
type Row={id:string;date:string;sourceName:string;category:string;needsReview:true;language?:string};
type Feed={schemaVersion:1;provider:string;version:string;license:string;years:number[];countries:Record<string,{events:Row[]}>};
export function holidayFeedEnabled(){return signedSourceEnabled();}
export async function sha256(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function validateHolidayFeed(value:unknown):Promise<Feed>{
 const f=value as Feed;const countries=['AM','AZ','BY','KG','KZ','MD','RU','TJ','TM','UZ'];
 if(!f||f.schemaVersion!==1||f.provider!=='python-holidays'||f.license!=='MIT'||!/^\d+\.\d+(?:\.\d+)?$/.test(f.version)||!Array.isArray(f.years)||f.years.length!==2||f.years[1]!==f.years[0]+1||!f.years.every(y=>Number.isInteger(y)&&y>=2026&&y<=2101)||Object.keys(f.countries??{}).sort().join(',')!==countries.join(','))throw Error('FEED_SCHEMA');
 for(const code of countries){const rows=f.countries[code].events;if(!Array.isArray(rows)||!rows.length||rows.length>3000)throw Error('FEED_ROWS');const seen=new Set<string>();for(const r of rows){
  if(!r||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date||!f.years.includes(Number(r.date.slice(0,4)))||!['public','workday'].includes(r.category)||r.needsReview!==true||typeof r.sourceName!=='string'||!r.sourceName.trim()||r.sourceName.length>500)throw Error('FEED_ROW');
  const id=await sha256([code,r.date,r.category,r.sourceName].join('|'));if(id!==r.id||seen.has(id))throw Error('FEED_ID');seen.add(id);
 }}return f;
}
export async function readHolidayFeed(){return signedSourceEnabled()?readSignedSource():null;}
/** Exact reviewed fixed-date rules and explicit country-scoped aliases only. No fuzzy translation or inferred move. */
export async function reviewedFeedRows(country:string,start:string,end:string){
 const data=await readHolidayFeed();if(!data||!(country in cis.countries))return null;
 const policy=cis.countries[country as keyof typeof cis.countries].dates as Record<string,string>;
 const rows=data.feed.countries[country]?.events??[];
 const aliases=(sourceNames as Record<string,Record<string,string[]>>)[country]??{};
 const accepted=rows.filter(r=>r.date>=start&&r.date<=end&&Boolean(policy[r.date.slice(5)])&&(policy[r.date.slice(5)]===r.sourceName||aliases[r.sourceName]?.includes(policy[r.date.slice(5)]))&&!(country==='AM'&&r.date==='2026-01-27')).map(r=>({date:r.date,name:policy[r.date.slice(5)],source:'https://github.com/vacanza/holidays',kind:r.category==='workday'?'observance':'holiday'}));
 // Flag an existing reviewed rule only when the exact country-scoped name/alias
 // identifies one rule and one conflicting date. Never move or merge identities.
 const conflicts: Array<{name:string;year:string}> = [];
 const candidates = rows.filter(r=>r.date>=start&&r.date<=end&&!accepted.some(a=>a.date===r.date&&(a.name===r.sourceName||aliases[r.sourceName]?.includes(a.name)))).flatMap(r=>{
  const rules=Object.entries(policy).filter(([,name])=>name===r.sourceName||aliases[r.sourceName]?.includes(name));
  return rules.length===1 && rules[0][0]!==r.date.slice(5)?[{name:rules[0][1],year:r.date.slice(0,4)}]:[];
 });
 for(const c of candidates)if(candidates.filter(x=>x.name===c.name&&x.year===c.year).length===1)conflicts.push(c);
 return {rows:accepted,conflicts,years:data.feed.years,revision:data.revision,checkedAt:data.checkedAt,pending:rows.filter(r=>r.date>=start&&r.date<=end).length-accepted.length};
}
