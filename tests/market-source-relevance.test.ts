import test from 'node:test';import assert from 'node:assert/strict';
import {filterMarketEvidence,marketSourceRelevant,linkedMarketSources} from '../lib/bardoctor/market-source-relevance';
const target={city:'Бендеры',country:'Молдова'};
const source=(title:string,url='https://guide.md/venue')=>({title,url});
const candidate=(name:string,s:any,extra={})=>({name,sourceUrls:[s.url],category:'Ресторан',...extra});
test('wrong cities and a non-HoReCa homonym do not become competitors',()=>{
 const sources=[source('Drive Pub — Bălți, Moldova','https://guide.md/balti/drive-pub'),source('Carul cu Bere restaurant — Ialoveni Moldova','https://guide.md/ialoveni/carul-cu-bere'),source('Bender dating app','https://app.example/bender'),source('Bosfor restaurant — Derbent Russia','https://guide.ru/derbent/bosfor')];
 const result=filterMarketEvidence({competitors:sources.map((s,i)=>candidate(['Drive Pub','Carul cu Bere','Bender','Bosfor'][i],s))},sources,target);assert.deepEqual(result.result.competitors,[]);assert.deepEqual(result.sources,[]);
});
test('correct name city country and category survive without claiming confirmation',()=>{
 const s=source('Cafe Luna — Бендеры, Молдова');const out=filterMarketEvidence({competitors:[candidate('Luna',s)]},[s],target);assert.equal((out.result.competitors as any[])[0].confirmed,false);assert.equal(out.sources.length,1);
});
test('same mechanism works outside audit cities and brands, accents and transliteration',()=>{
 for(const [location,title,url,name] of [[{city:'Лион',country:'Франция'},'Cafe Jardin Лион France','https://guide.fr/lyon','Jardin'],[{city:'Cluj-Napoca',country:'RO'},'Cafenea Zori Cluj Napoca Romania','https://guide.ro/cluj','Zori'] ] as const)assert.ok(marketSourceRelevant(source(title,url),location,name));
});
test('homonymous city requires matching country and specified region',()=>{
 const us={city:'Paris',country:'US',region:'Texas'};
 assert.equal(marketSourceRelevant(source('Cafe Rose Paris France Texas','https://guide.fr/paris'),us,'Rose'),false);
 assert.equal(marketSourceRelevant(source('Cafe Rose Paris Texas United States','https://guide.example/rose'),us,'Rose'),true);
 assert.equal(marketSourceRelevant(source('Cafe Rose Paris Ontario Canada','https://guide.example/rose'),us,'Rose'),false);
});
test('city in brand alone or query string is not an address',()=>{
 assert.equal(marketSourceRelevant(source('Bender Pub Moldova','https://guide.md/pub'),{city:'Bender',country:'MD'},'Bender Pub'),false);
 assert.equal(marketSourceRelevant(source('Cafe Luna Moldova','https://guide.md/luna?q=Бендеры'),target,'Luna'),false);
});
test('model-provided category or location cannot supply missing source evidence',()=>{
 const s=source('Luna official website','https://luna.example/');assert.deepEqual(filterMarketEvidence({competitors:[candidate('Luna',s,{city:'Бендеры',country:'Молдова',evidence:'Ресторан в Бендерах'})]},[s],target).result.competitors,[]);
});
test('explicit conflicting country beats a matching city and local ccTLD',()=>{assert.equal(marketSourceRelevant(source('Cafe Luna Бендеры Russia'),target,'Luna'),false);});
test('contradictory candidate city cannot borrow a valid source',()=>{const s=source('Cafe Luna Бендеры Moldova');assert.deepEqual(filterMarketEvidence({competitors:[candidate('Luna',s,{city:'Бельцы'})]},[s],target).result.competitors,[]);});
test('source about another establishment cannot be attached by name-independent URL allowlist',()=>{const s=source('Cafe Luna Бендеры Moldova');assert.deepEqual(filterMarketEvidence({competitors:[candidate('Other',s)]},[s],target).result.competitors,[]);});
test('no location or missing country cannot distinguish homonyms',()=>{const s=source('Cafe Luna Paris');assert.equal(marketSourceRelevant(s,{city:'Paris',country:''},'Luna'),false);assert.equal(marketSourceRelevant(s,{city:'',country:'MD'},'Luna'),false);});
test('unrelated or unused web search sources do not inflate evidence list',()=>{
 const good=source('Cafe Luna Бендеры Moldova'),bad=source('Bender dating application','https://app.example/'),unused=source('Cafe Other Бендеры Moldova','https://guide.md/other');const out=filterMarketEvidence({competitors:[candidate('Luna',good)],opportunities:[{title:'Fake market fact',sourceUrls:[bad.url]}],location:{summary:'Dating is market evidence',sourceUrls:[bad.url]}},[good,bad,unused],target);assert.deepEqual(out.sources,[good]);assert.deepEqual(out.result.opportunities,[]);assert.equal((out.result.location as any).summary,'Недостаточно местных источников.');
});
test('local market context and individually cited actions are retained',()=>{
 const s=source('Population Бендеры Moldova','https://stats.md/bendery');const out=filterMarketEvidence({audience:{summary:'Local population',sourceUrls:[s.url]},actions:[{title:'Assess local demand',sourceUrls:[s.url]},{title:'Unlinked assumption'}]},[s],target);assert.equal((out.result.actions as any[]).length,1);assert.equal((out.result.audience as any).summary,'Local population');
});
test('malformed response and invalid URLs yield honest empty evidence',()=>{assert.deepEqual(filterMarketEvidence(null,[],target).sources,[]);assert.equal(marketSourceRelevant(source('Cafe Luna Бендеры Moldova','javascript:alert(1)'),target,'Luna'),false);});
test('filter is pure: saved analyses and provider source arrays are not rewritten',()=>{const s=source('Cafe Luna Бендеры Moldova'),raw={competitors:[candidate('Luna',s)]},before=JSON.stringify({raw,s});filterMarketEvidence(raw,[s],target);assert.equal(JSON.stringify({raw,s}),before);});
test('explicit other-city address overrides incidental target-city mentions',()=>{
 assert.equal(marketSourceRelevant(source('Drive Pub in Balti, Moldova | Бендеры guide'),target,'Drive Pub'),false);
 assert.equal(marketSourceRelevant(source('Luna cafe | City: Derbent | Бендеры Moldova'),target,'Luna'),false);
});
test('unrecognized city aliases remain insufficient instead of guessed equivalence',()=>{assert.equal(marketSourceRelevant(source('Cafe Luna Lyon France','https://guide.fr/luna'),{city:'Лион',country:'Франция'},'Luna'),false);});

test('a country domain does not locate a business or override explicit valid country evidence',()=>{
 assert.equal(marketSourceRelevant(source('Cafe Luna Paris','https://guide.fr/luna'),{city:'Paris',country:'France'},'Luna'),false);
 assert.equal(marketSourceRelevant(source('Cafe Luna Бендеры Moldova','https://guide.de/luna'),target,'Luna'),true);
});
test('final source list follows retained normalized records, not pre-limit or deleted candidates',()=>{
 const one=source('Cafe One Бендеры Moldova'),two=source('Cafe Two Бендеры Moldova','https://guide.md/two');
 assert.deepEqual(linkedMarketSources({competitors:[{sourceUrls:[one.url]}]},[one,two]),[one]);
});
