import test from 'node:test';import assert from 'node:assert/strict';
import {filterMarketEvidence,marketSourceRelevant} from '../lib/bardoctor/market-source-relevance';
const aliases=['Бендеры','Бендер','Bender','Bendery','Tighina','Тигина'];
function run(expected:string,claimed:string,title:string,country='MD',claimedCountry='MD',region=''){
 const source={url:'https://fixture.test/luna',title};return filterMarketEvidence({competitors:[{name:'Luna',city:claimed,country:claimedCountry,sourceUrls:[source.url]}]},[source],{city:expected,country,region});
}
test('reviewed city names match symmetrically in candidate and source metadata within Moldova',()=>{
 for(const expected of aliases)for(const claimed of aliases){const out=run(expected,claimed,`Cafe Luna — ${claimed}, Moldova`);assert.equal((out.result.competitors as any[])[0]?.evidenceStatus,'local',expected+'/'+claimed);assert.equal(out.sources.length,1);assert.equal(out.diagnostics.candidates.CLAIMED_CITY_CONFLICT,0);assert.equal((out.result.competitors as any[])[0].confirmed,false);}
});
test('same mechanism supports another city and existing accent/case normalization',()=>{
 for(const expected of ['Chișinău','Chisinau','Кишинёв','Kishinev'])for(const claimed of ['CHIȘINĂU','Кишинев','Kishinev']){assert.equal(run(expected,claimed,`Cafe Luna — ${claimed}, Moldova`).sources.length,1);}
 assert.equal(run('Bendery','Tighina','Cafe Luna — Tighina, Moldova','Молдова','MD','Бендеры').sources.length,1);
});
test('neighbouring cities and similar strings still fail, even with a local borrowed source',()=>{
 for(const claimed of ['Balti','Бельцы','Tiraspol','Тирасполь','Ialoveni','Derbent','Benderville','New Bender']){const out=run('Bendery',claimed,'Cafe Luna — Bender, Moldova');assert.equal((out.result.competitors as any[]).length,0);assert.equal(out.diagnostics.candidates.CLAIMED_CITY_CONFLICT,1);}
});
test('matching alias cannot override a conflicting source country/city or a claimed country',()=>{
 for(const title of ['Cafe Luna — Balti, Moldova','Cafe Luna — Bender, Russia','Cafe Luna — Derbent, Russia'])assert.equal((run('Bendery','Tighina',title).result.competitors as any[]).length,0);
 assert.equal((run('Bendery','Tighina','Cafe Luna — Bender, Moldova','MD','RU').result.competitors as any[]).length,0);
 assert.equal((run('Bendery','Tighina','Cafe Luna — Tighina, France','FR','FR').result.competitors as any[]).length,0);
 assert.equal((run('Bendery','Tighina','Cafe Luna Tighina','','').result.competitors as any[]).length,0);
});
test('aliases alone do not manufacture local evidence or accept brand/query matches',()=>{
 const out=run('Bendery','Tighina','Cafe Luna official site');assert.equal((out.result.competitors as any[])[0].evidenceStatus,'city_unverified');
 assert.equal(marketSourceRelevant({url:'https://fixture.test/venue',title:'Tighina Pub Moldova'},{city:'Bendery',country:'MD'},'Tighina Pub'),false);
 assert.equal(marketSourceRelevant({url:'https://fixture.test/venue?city=Tighina',title:'Cafe Luna Moldova'},{city:'Bendery',country:'MD'},'Luna'),false);
 assert.equal((run('Bendery','Tighina','Luna dating application Tighina Moldova').result.competitors as any[]).length,0);
});
