import test from 'node:test';import assert from 'node:assert/strict';
import {filterMarketEvidence} from '../lib/bardoctor/market-source-relevance';
const location={city:'Бендеры',country:'Молдова'};
const sum=(v:Record<string,number>)=>Object.values(v).reduce((a,b)=>a+b,0);
const s=(id:string,title:string)=>({url:`https://fixture.test/${id}`,title});
test('each candidate has exactly one first outcome, including kept unknowns and malformed rows',()=>{
 const sources=[s('local','Cafe Local Бендеры Moldova'),s('unknown','Cafe Unknown'),s('country','Cafe Country Бендеры Russia'),s('city','Cafe City — Balti, Moldova'),s('app','App dating application')];
 const candidates=[null,{}, {name:'Claim city',city:'Balti',country:'Russia'},{name:'Claim country',country:'Russia'}, {name:'Dating',category:'dating application'}, ...[['Country',2],['City',3],['App',4],['Local',0],['Unknown',1]].map(([name,i])=>({name,sourceUrls:[sources[Number(i)].url]})),{name:'Missing venue',sourceUrls:[]}];
 const out=filterMarketEvidence({competitors:candidates},sources,location),d=out.diagnostics;
 assert.deepEqual(d.candidates,{INVALID_CANDIDATE:2,CLAIMED_CITY_CONFLICT:1,CLAIMED_COUNTRY_CONFLICT:1,IRRELEVANT_TYPE:1,SOURCE_COUNTRY_CONFLICT:1,SOURCE_CITY_CONFLICT:1,IRRELEVANT_SOURCE:1,KEPT_LOCAL:1,KEPT_CITY_UNVERIFIED:1,KEPT_VENUE_UNVERIFIED:1});
 assert.equal(sum(d.candidates),candidates.length);assert.equal((out.result.competitors as unknown[]).length,3);
 assert.equal(sum(d.sources),sources.length);assert.equal(d.sources.RETAINED,out.sources.length);
});
test('all provider source categories partition the input; missing references are counted separately',()=>{
 const sources=[s('local','Cafe Luna Бендеры Moldova'),s('local','Duplicate'),{url:'not-a-url',title:'PRIVATE_SECRET'},s('ru','Cafe X Бендеры Russia'),s('balti','Cafe Y — Balti, Moldova'),s('app','Dating application'),s('unknown','Cafe Z'),s('weather','Weather Бендеры Moldova'),s('unused','Cafe Other Бендеры Moldova')];
 const out=filterMarketEvidence({competitors:[{name:'Luna',sourceUrls:[sources[0].url]}],actions:[{title:'PRIVATE_SECRET',sourceUrls:['https://missing.test/private',null,'',sources[0].url]}]},sources,location),d=out.diagnostics;
 // The duplicate's last metadata is used by the existing byUrl map, so it cannot establish locality.
 assert.equal(sum(d.sources),sources.length);assert.equal(d.sources.DUPLICATE,1);assert.equal(d.sources.INVALID_SOURCE,1);assert.equal(d.sources.COUNTRY_CONFLICT,1);assert.equal(d.sources.CITY_CONFLICT,1);assert.equal(d.sources.IRRELEVANT_SOURCE,1);assert.equal(d.sources.LOCATION_UNVERIFIED,1);assert.equal(d.sources.TOPIC_UNVERIFIED,1);assert.equal(d.sources.UNUSED_LOCAL_SOURCE,2);
 assert.deepEqual(d.references,{AVAILABLE:2,MISSING_SOURCE:1,INVALID_REFERENCE:2});assert.doesNotMatch(JSON.stringify(d),/PRIVATE|https|fixture|Luna|Бендеры/);
});
test('claim outcomes distinguish missing references, lack of local sources, missing entity links and unconfirmed entities',()=>{
 const local=s('luna','Cafe Luna Бендеры Moldova'),broad=s('tourism','Tourism Бендеры Moldova'),other=s('other','Cafe Other Бендеры Moldova');
 const out=filterMarketEvidence({competitors:[{name:'Luna',sourceUrls:[local.url]},{name:'Other',city:'Balti',sourceUrls:[other.url]}],actions:[{title:'No references'}, {title:'Missing source',sourceUrls:['https://missing.test/']},{title:'Luna',sourceUrls:[broad.url]},{title:'Other',sourceUrls:[other.url]},{title:'Luna',sourceUrls:[local.url]}]},[local,broad,other],location);
 assert.deepEqual(out.diagnostics.claims,{INVALID_CLAIM:0,NO_REFERENCES:1,NO_LOCAL_SOURCE:1,ENTITY_UNLINKED:1,UNCONFIRMED_ENTITY:1,RETAINED:1});
 assert.equal((out.result.actions as unknown[]).length,1);assert.equal(sum(out.diagnostics.claims),5);
});
test('empty runs and repeated or unrelated venue runs have independent numeric-only diagnostics',()=>{
 const raw={competitors:[{name:'PRIVATE_SECRET',city:'Balti'}]};
 const first=filterMarketEvidence(raw,[],location);assert.deepEqual(filterMarketEvidence(raw,[],location).diagnostics,first.diagnostics);
 const empty=filterMarketEvidence({},[],{city:'Lyon',country:'France'}).diagnostics;
 assert.equal(sum(empty.candidates)+sum(empty.sources)+sum(empty.claims)+sum(empty.references),0);
 assert.doesNotMatch(JSON.stringify(first.diagnostics),/PRIVATE|Balti|Бендеры/);
});

test('invalid claim entries count as invalid without generating statements',()=>{
 const out=filterMarketEvidence({location:null,actions:[null,42,{}, {title:'Valid shape'}]},[],location);
 assert.equal(out.diagnostics.claims.INVALID_CLAIM,3);assert.equal(out.diagnostics.claims.NO_REFERENCES,2);assert.equal(sum(out.diagnostics.claims),5);assert.deepEqual(out.result.actions,[]);
});
