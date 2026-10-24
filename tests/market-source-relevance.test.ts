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
 const s=source('Luna official website','https://luna.example/');const rows=filterMarketEvidence({competitors:[candidate('Luna',s,{city:'Бендеры',country:'Молдова',evidence:'Ресторан в Бендерах'})]},[s],target).result.competitors as any[];assert.equal(rows[0].evidenceStatus,'venue_unverified');assert.equal(rows[0].confirmed,false);assert.equal(rows[0].evidence,'Заведение не подтверждено');
});
test('explicit conflicting country beats a matching city and local ccTLD',()=>{assert.equal(marketSourceRelevant(source('Cafe Luna Бендеры Russia'),target,'Luna'),false);});
test('contradictory candidate city cannot borrow a valid source',()=>{const s=source('Cafe Luna Бендеры Moldova');assert.deepEqual(filterMarketEvidence({competitors:[candidate('Luna',s,{city:'Бельцы'})]},[s],target).result.competitors,[]);});
test('source about another establishment cannot be attached by name-independent URL allowlist',()=>{const s=source('Cafe Luna Бендеры Moldova');const rows=filterMarketEvidence({competitors:[candidate('Other',s)]},[s],target).result.competitors as any[];assert.equal(rows[0].evidenceStatus,'venue_unverified');assert.deepEqual(rows[0].sourceUrls,[]);});
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
test('missing city stays a candidate, distinct from a conflicting address',()=>{
 const unknown=source('Luna restaurant — official website','https://luna.md/'),foreign=source('Other Cafe — Balti, Moldova','https://other.md/');
 const result=filterMarketEvidence({competitors:[candidate('Luna',unknown,{city:'Бендеры',country:'MD',evidence:'Модель утверждает адрес',rating:'5',strengths:['Лидер рынка']}),candidate('Other',foreign)]},[unknown,foreign],target);
 const rows=result.result.competitors as any[];assert.equal(rows.length,1);assert.equal(rows[0].evidenceStatus,'city_unverified');assert.equal(rows[0].evidence,'Город не подтверждён');assert.equal(rows[0].rating,'');assert.deepEqual(rows[0].strengths,[]);assert.equal(rows[0].confirmed,false);
});
test('mixed output preserves useful candidates but only local linked sources support conclusions',()=>{
 const good=source('Cafe Luna Бендеры Moldova'),unknown=source('Rosa restaurant','https://rosa.md/'),foreign=source('Drive Pub — Balti, Moldova','https://drive.md/');
 const out=filterMarketEvidence({competitors:[candidate('Luna',good),candidate('Rosa',unknown),candidate('Drive Pub',foreign)],opportunities:[{title:'Местный рынок',sourceUrls:[good.url]},{title:'Rosa лидер',sourceUrls:[unknown.url]},{title:'Drive Pub дешевле',sourceUrls:[good.url]}]},[good,unknown,foreign],target);
 assert.deepEqual((out.result.competitors as any[]).map(x=>x.evidenceStatus),['local','city_unverified']);assert.deepEqual((out.result.opportunities as any[]).map(x=>x.title),['Местный рынок']);assert.equal(out.sources.length,2);
});
test('all unknown preserves candidate names, without local conclusions or scores',()=>{
 const s=source('Luna restaurant','https://luna.md/');const out=filterMarketEvidence({competitors:[candidate('Luna',s)],pricing:[{item:'Lunch',range:'50',sourceUrls:[s.url]}]},[s],target);
 assert.equal((out.result.competitors as any[]).length,1);assert.deepEqual(out.result.pricing,[]);assert.equal((out.result.competitors as any[])[0].score,null);
});
test('same names in different cities cannot merge geography or borrowing sources',()=>{
 const a=source('Cafe Luna — Бендеры, Moldova'),b=source('Cafe Luna — Balti, Moldova','https://guide.md/balti/luna');
 assert.equal((filterMarketEvidence({competitors:[candidate('Luna',a),candidate('Luna',b)]},[a,b],target).result.competitors as any[]).length,1);
 assert.deepEqual(filterMarketEvidence({competitors:[{name:'Luna',sourceUrls:[a.url,b.url]}]},[a,b],target).result.competitors,[]);
});
test('unverified entries remain in candidate count but never count as confirmed, including forged flags',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');const sandbox:any={window:{},localStorage:{getItem:()=>null},Date,Set};
 runInNewContext(readFileSync('public/competitor-market-client-v329.js','utf8'),sandbox);
 const result=sandbox.window.bdCompetitorMarketClientV329.summary({competitors:[{key:'a',confirmed:true,evidenceStatus:'local'},{key:'b',confirmed:true,evidenceStatus:'city_unverified'},{key:'c',confirmed:false,evidenceStatus:'venue_unverified'}]});
 assert.equal(result.foundCount,3);assert.equal(result.confirmedCount,1);assert.equal(result.candidateCount,2);
});
test('a dating event at a restaurant is not confused with a dating application',()=>{assert.ok(marketSourceRelevant(source('Rosa restaurant: speed dating, Бендеры Moldova','https://rosa.example/event'),target,'Rosa'));});
test('unverified candidates cannot enter downstream confirmed market context',async()=>{
 const {buildVenueAIContextFromSources}=await import('../lib/bardoctor/venue-ai-context');
 const unknown={name:'Unknown',confirmed:true,evidenceStatus:'city_unverified'},known={name:'Local',confirmed:true,evidenceStatus:'local'};
 const build=(external?:any)=>buildVenueAIContextFromSources('diagnosis',{accountProfile:{name:'Local fixture'},stores:new Map([['bd_market_analysis_v1',{data:{competitors:[unknown,known]},updatedAt:'2026-10-24'}]]),external,now:new Date('2026-10-24T12:00:00Z')});
 const stored=build();assert.deepEqual((stored.promptData.market as any).confirmedCompetitors.map((x:any)=>x.name),['Local']);
 const supplied=build({confirmedCompetitors:[unknown,known]});assert.deepEqual((supplied.promptData.market as any).confirmedCompetitors.map((x:any)=>x.name),['Local']);
});

test('a local source for another venue cannot support a named claim, even if both candidates are local',()=>{
 const luna=source('Cafe Luna Бендеры Moldova','https://guide.md/luna'),rosa=source('Cafe Rosa Бендеры Moldova','https://guide.md/rosa');
 const out=filterMarketEvidence({competitors:[candidate('Luna',luna),candidate('Rosa',rosa)],actions:[{title:'Luna дешевле',sourceUrls:[rosa.url]},{title:'Rosa: проверить меню',sourceUrls:[rosa.url]}],location:{summary:'Luna лидер',sourceUrls:[rosa.url]}},[luna,rosa],target);
 assert.deepEqual((out.result.actions as any[]).map(x=>x.title),['Rosa: проверить меню']);
 assert.equal((out.result.location as any).sourceUrls.length,0);
});
test('a shared source must name every business in a comparative claim',()=>{
 const shared=source('Cafe Luna and Cafe Rosa Бендеры Moldova','https://guide.md/both'),single=source('Cafe Luna Бендеры Moldova','https://guide.md/luna');
 const out=filterMarketEvidence({competitors:[candidate('Luna',shared),candidate('Rosa',shared)],pricing:[{item:'Luna и Rosa',sourceUrls:[single.url,shared.url]}]},[shared,single],target);
 assert.deepEqual((out.result.pricing as any[])[0].sourceUrls,[single.url,shared.url]);
});
test('provider source-verification claims never pass through as verified assumptions',()=>{
 const s=source('Luna official site');const raw={assumptions:['Выбраны только подтверждённые местные страницы; меню прочитано'],competitors:[candidate('Luna',s)]};
 const before=JSON.stringify(raw),out=filterMarketEvidence(raw,[s],target);
 assert.deepEqual(out.result.assumptions,['Сопоставлены названия и ссылки. Содержание страниц не проверено.']);
 assert.equal((out.result.competitors as any[])[0].evidenceStatus,'venue_unverified');
 assert.equal(JSON.stringify(raw),before);
});

test('separate sources may jointly support the identities in a comparison',()=>{
 const a=source('Cafe Luna Бендеры Moldova','https://guide.md/a'),b=source('Cafe Rosa Бендеры Moldova','https://guide.md/b');
 const result=filterMarketEvidence({competitors:[candidate('Luna',a),candidate('Rosa',b)],actions:[{title:'Luna и Rosa: сравнить меню',sourceUrls:[a.url,b.url]}]},[a,b],target);
 assert.deepEqual((result.result.actions as any[])[0].sourceUrls,[a.url,b.url]);
});
