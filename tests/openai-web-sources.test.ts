import test from 'node:test';
import assert from 'node:assert/strict';
import { responseWebSources } from '../lib/bardoctor/openai-web-sources';
import { filterMarketEvidence } from '../lib/bardoctor/market-source-relevance';
const local={url:'https://luna.example/cafe',title:'Cafe Luna — Бендеры, Moldova'};
const citation=(s:any)=>({type:'message',content:[{type:'output_text',annotations:[{type:'url_citation',...s}]}]});
const search=(sources:any[])=>({type:'web_search_call',action:{sources}});
test('answer citation survives 30 preceding background search sources and passes unchanged relevance checks',()=>{
 const sources=responseWebSources({output:[search(Array.from({length:30},(_,i)=>({url:`https://background.test/${i}`,title:'Background'}))),citation(local)]});
 assert.equal(sources.length,30);assert.deepEqual(sources[0],local);
 const result=filterMarketEvidence({competitors:[{name:'Luna',sourceUrls:[local.url]}]},sources,{city:'Бендеры',country:'Молдова'});
 assert.equal(result.sources.length,1);assert.equal((result.result.competitors as any[])[0].evidenceStatus,'local');
});
test('untitled search result cannot erase the cited title for the same URL',()=>{
 assert.deepEqual(responseWebSources({output:[search([{url:local.url}]),citation(local)]}),[local]);
});
test('untitled citation can use available search title without duplicating the URL',()=>{
 assert.deepEqual(responseWebSources({output:[citation({url:local.url}),search([local])]}),[local]);
});
test('wrong city and unrelated citations remain excluded, unknown stays unknown',()=>{
 for(const title of ['Cafe Luna — Balti, Moldova','Luna dating application']){
  const sources=responseWebSources({output:[citation({...local,title})]});
  const out=filterMarketEvidence({competitors:[{name:'Luna',sourceUrls:[local.url]}]},sources,{city:'Бендеры',country:'Молдова'});
  assert.equal(out.sources.length,0);assert.equal((out.result.competitors as any[]).length,0);
 }
 const sources=responseWebSources({output:[citation({url:local.url,title:'Luna official site'})]});
 const out=filterMarketEvidence({competitors:[{name:'Luna',sourceUrls:[local.url]}]},sources,{city:'Бендеры',country:'Молдова'});
 assert.equal((out.result.competitors as any[])[0].evidenceStatus,'city_unverified');
});
test('malformed links/shapes are ignored; nested citations and search-only sources remain supported',()=>{
 assert.deepEqual(responseWebSources({output:[null,search([null,{url:'https://'}, {url:'https://secret:secret@example.test'}, {url:'javascript:alert(1)'}]),{content:[{annotations:[{url_citation:local}]}]}]}),[local]);
 assert.deepEqual(responseWebSources({output:[search([local])]}),[local]);
 assert.deepEqual(responseWebSources({output:{}}),[]);
});

test('citation priority does not replace an already supplied conflicting title',()=>{
 const foreign={...local,title:'Cafe Luna — Balti, Moldova'};
 const sources=responseWebSources({output:[search([foreign]),citation(local)]});assert.deepEqual(sources,[foreign]);
 const result=filterMarketEvidence({competitors:[{name:'Luna',sourceUrls:[local.url]}]},sources,{city:'Бендеры',country:'Молдова'});assert.equal(result.sources.length,0);
});

test('real market route receives cited sources through the native web adapter with unchanged request budget',async()=>{
 const {readFileSync}=await import('node:fs');const {lifecycleRuntime}=await import('./helpers/lifecycle-runtime');
 const fixture={calls:0,request:null as any,fetch:async(_url:any,options:any)=>{
  fixture.calls++;fixture.request=JSON.parse(options.body);
  return Response.json({status:'completed',output:[search(Array.from({length:30},(_,i)=>({url:`https://background.test/${i}`,title:'Background'}))),{type:'message',content:[{type:'output_text',text:JSON.stringify({competitors:[{name:'Luna',sourceUrls:[local.url]}]}),annotations:[{type:'url_citation',...local}]}]}]});
 }};
 const runtime=await lifecycleRuntime({market:'./app/api/market/route'},{modules:{'web-source-fixture':fixture},plugins:[{name:'local-web-source',setup(build){
  build.onLoad({filter:/\/lib\/bardoctor\/openai\.ts$/},args=>({contents:"const fetch=require('web-source-fixture').fetch;\n"+readFileSync(args.path,'utf8'),loader:'ts',resolveDir:args.path.slice(0,args.path.lastIndexOf('/'))}));
  build.onResolve({filter:/^web-source-fixture$/},()=>({path:'web-source-fixture',external:true}));
  build.onResolve({filter:/^\.\/integration-secrets$/},args=>args.importer.endsWith('/openai.ts')?{path:'fixture-web-secret',namespace:'fixture-web-secret'}:null);
  build.onLoad({filter:/.*/,namespace:'fixture-web-secret'},()=>({contents:"export async function getIntegrationValue(_account,key){return key==='OPENAI_MODEL'?'local-fixture':'local-placeholder'}",loader:'js'}));
 }}]});
 try {
  const owner=await runtime.register('web-source@isolated.test');runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Fixture',city:'Бендеры',country:'Молдова'}),owner.userId);
  const response=await runtime.api.market.POST(runtime.request(owner,'/api/market','POST',{})),body:any=await response.json();
  assert.equal(response.status,200);assert.equal(body.data.lastAttempt.reason,'RESULT');assert.deepEqual(body.data.sources,[local]);assert.equal(body.data.competitors[0].evidenceStatus,'local');assert.equal(body.data.competitors[0].confirmed,false);
  assert.equal(fixture.calls,1);assert.equal(fixture.request.tools[0].type,'web_search');assert.equal(fixture.request.tool_choice,'auto');assert.equal(fixture.request.max_tool_calls,6);assert.equal(fixture.request.max_output_tokens,7500);assert.ok(fixture.request.include.includes('web_search_call.action.sources'));
  const saved:any=await (await runtime.api.market.GET(runtime.request(owner,'/api/market','GET'))).json();assert.deepEqual(saved.analysis.sources,[local]);
 }finally{runtime.close()}
});
