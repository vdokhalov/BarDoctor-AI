import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {filterMarketEvidence,marketCandidateEligible} from '../lib/bardoctor/market-source-relevance';
import {verifyMarketPages} from '../lib/bardoctor/market-page-evidence';
import {marketResultAttempt,retainMarketResult} from '../lib/bardoctor/market-result-attempt';
const url='https://www.tripadvisor.com/Restaurant_Review-g1-d1-Reviews-Luna-Bender_Transnistria.html',guru='https://restaurantguru.com/Rosa-Bender',location={city:'Бендеры',country:'MD'};
test('partial result keeps blocked/unsupported/missing sources, excludes proven wrong geography and survives reload',async()=>{
 const sources=[{url,title:'Luna restaurant Bender Moldova'},{url:guru,title:'Rosa restaurant Bender Moldova'}];
 const raw={competitors:[{name:'Luna',sourceUrls:[url]},{name:'Rosa',sourceUrls:[guru]},{name:'Unknown'},{name:'Foreign',city:'Balti',country:'MD'},{name:'Other country',city:'Bender',country:'RU'}]};
 const filtered=filterMarketEvidence(raw,sources,location);let calls=0;
 const pages=await verifyMarketPages(filtered.result,filtered.sources,location,async()=>{calls++;return new Response('',{status:403})});
 const rows=pages.result.competitors as any[];assert.deepEqual(rows.map(x=>x.name),['Luna','Rosa','Unknown']);assert.equal(calls,1);
 assert.deepEqual(rows.map(x=>x.pageEvidence.reason),['BLOCKED','UNSUPPORTED_URL','NO_SOURCE_URL']);assert.deepEqual(rows[0].sourceUrls,[url]);assert.deepEqual(rows[1].sourceUrls,[guru]);assert.equal(marketCandidateEligible(rows[2]),false);
 const payload={...pages.result,sources:filtered.sources,generatedAt:'2026-10-25'};const saved=retainMarketResult(null,payload,marketResultAttempt(raw,sources,filtered.result,payload,'2026-10-25'));assert.equal((saved.lastAttempt as ReturnType<typeof marketResultAttempt>).reason,'RESULT');assert.deepEqual((JSON.parse(JSON.stringify(saved)).competitors as any[]).map(x=>x.name),rows.map(x=>x.name));
 const empty=filterMarketEvidence({competitors:[raw.competitors[3]]},sources,location);const retained=retainMarketResult(saved,{generatedAt:'2026-10-26'},marketResultAttempt({competitors:[raw.competitors[3]]},sources,empty.result,{},'2026-10-26'));assert.equal(retained.generatedAt,'2026-10-25');assert.deepEqual(retained.competitors,rows);
});
test('legacy confirmed records without a safe source are not confirmed in server/client projections; stored history untouched',()=>{
 const sandbox:any={window:{},URL,localStorage:{getItem(){return null}}};vm.runInNewContext(readFileSync('public/competitor-market-client-v329.js','utf8'),sandbox);const client=sandbox.window.bdCompetitorMarketClientV329;
 for(const sourceUrls of [undefined,[],['javascript:alert(1)'],['https://secret@example.test']]){const item={name:'Legacy',key:'legacy',confirmed:true,sourceUrls};const original=JSON.stringify(item);assert.equal(marketCandidateEligible(item),false);assert.equal(client.eligible(item),false);assert.equal(client.summary({competitors:[item]}).confirmedCount,0);assert.equal(JSON.stringify(item),original);}
 const valid={name:'Local',confirmed:true,evidenceStatus:'local',sourceUrls:[url]};assert.equal(client.summary({competitors:[valid]}).confirmedCount,1);assert.equal(marketCandidateEligible(valid),true);
});
