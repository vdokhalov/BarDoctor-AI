import {execFileSync} from 'node:child_process';
import path from 'node:path';
import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {marketLocationSignature} from '../lib/bardoctor/market-analysis-state';

test('native market route gates a fresh search, retains exact decisions, reads history unchanged and isolates accounts',async()=>{
 const good={title:'Cafe Luna — Бендеры Moldova',url:'https://guide.md/luna'},bad={title:'Drive Pub — Bălți Moldova',url:'https://guide.md/balti/drive-pub'};
 const provider={calls:0,response:{model:'local-fixture',sources:[good,bad],text:JSON.stringify({competitors:[{name:'Luna',city:'Бендеры',country:'MD',sourceUrls:[good.url]},{name:'Drive Pub',city:'Бельцы',country:'MD',sourceUrls:[bad.url]}],competitorSummary:'Drive Pub is a local competitor',opportunities:[{title:'Unsupported claim',sourceUrls:[bad.url]}]})}};
 const r=await lifecycleRuntime({market:'./app/api/market/route'},{modules:{'market-fixture':provider},plugins:[{name:'fixed-local-search',setup(build){
  if(process.env.EX12_BASELINE)build.onLoad({filter:/\/app\/api\/market\/route\.ts$/},args=>({contents:execFileSync('git',['show','f58d95bcacadb3468ed6539be0adca8822f904b8:app/api/market/route.ts']).toString(),loader:'ts',resolveDir:path.dirname(args.path)}));
  build.onResolve({filter:/\/bardoctor\/openai$/},args=>args.importer.endsWith('/app/api/market/route.ts')?{path:'provider',namespace:'market-test'}:null);
  build.onResolve({filter:/^market-fixture$/},args=>({path:args.path,external:true}));
  build.onLoad({filter:/.*/,namespace:'market-test'},()=>({contents:`const fixture=require('market-fixture');export async function openAIWebSearch(){fixture.calls++;return fixture.response;}`}));
 }}]});
 try{
  const owner=await r.register('market-source@isolated.test'),other=await r.register('market-other@isolated.test');
  const profile={name:'Local fixture',city:'Бендеры',country:'Молдова',currency:'MDL'};
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),owner.userId);
  const saved={locationSignature:marketLocationSignature({address:'',city:profile.city,country:profile.country,region:'',latitude:0,longitude:0,focus:''}),generatedAt:'2026-10-01',competitors:[{key:'luna|'+good.url,name:'Luna',confirmed:true,confirmedAt:'2026-10-01',sourceUrls:[good.url]},{key:'drive pub|'+bad.url,name:'Drive Pub',confirmed:false,sourceUrls:[bad.url]}]};
  r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,'bd_market_analysis_v1',?,'2026-10-01')").run(owner.userId,JSON.stringify(saved));
  const read=async(user=owner)=>(await(await r.api.market.GET(r.request(user,'/api/market'))).json()) as any;
  assert.deepEqual((await read()).analysis,saved,'GET never silently filters old saved analysis');assert.equal(provider.calls,0);
  const response=await r.api.market.POST(r.request(owner,'/api/market','POST',{}));const body=await response.json() as any;assert.equal(response.status,200,JSON.stringify(body));
  const current=(await read()).analysis;if(process.env.EX12_BASELINE){assert.equal(current.competitors.length,2);assert.equal(current.sources.length,2);assert.match(current.competitorSummary,/Drive/);return;}assert.equal(current.competitors.length,1);assert.equal(current.competitors[0].name,'Luna');assert.equal(current.competitors[0].confirmed,true);assert.deepEqual(current.sources,[good]);assert.deepEqual(current.opportunities,[]);assert.doesNotMatch(current.competitorSummary,/Drive/);
  assert.deepEqual((await read()).analysis,current);assert.equal((await read(other)).analysis,null);assert.equal(provider.calls,1);
  const unknown={title:'Rosa restaurant official site',url:'https://rosa.md/'};
  provider.response={model:'local-fixture',sources:[good,unknown],text:JSON.stringify({competitors:[{name:'Luna',sourceUrls:[good.url]},{name:'Rosa',city:'Бендеры',country:'MD',sourceUrls:[unknown.url],rating:'5'}],pricing:[{item:'Lunch',range:'50',sourceUrls:[unknown.url]}]})};
  assert.equal((await r.api.market.POST(r.request(owner,'/api/market','POST',{}))).status,200);
  const mixed=(await read()).analysis,unverified=mixed.competitors.find((x:any)=>x.name==='Rosa');
  assert.equal(unverified.evidenceStatus,'city_unverified');assert.equal(unverified.confirmed,false);assert.equal(unverified.rating,'');assert.deepEqual(mixed.pricing,[]);
  const refused=await r.api.market.PATCH(r.request(owner,'/api/market','PATCH',{action:'set-competitor-confirmed',competitorKey:unverified.key,confirmed:true}));
  assert.equal(refused.status,400);assert.match((await refused.json() as any).error,/Город не подтверждён/);assert.deepEqual((await read()).analysis,mixed,'rejected confirmation makes no write');
  // A changed geographic scope cannot inherit an old owner confirmation by name.
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({...profile,city:'Lyon',country:'France'}),owner.userId);
  provider.response={model:'local-fixture',sources:[{title:'Cafe Luna Lyon France',url:good.url.replace('.md','.fr')}],text:JSON.stringify({competitors:[{name:'Luna',key:'luna|'+good.url,sourceUrls:[good.url.replace('.md','.fr')]}]})};
  assert.equal((await r.api.market.POST(r.request(owner,'/api/market','POST',{}))).status,200);const changed=(await read()).analysis;assert.equal(changed.competitors.length,1);assert.equal(changed.competitors[0].confirmed,false);
 }finally{await r.close()}
});
