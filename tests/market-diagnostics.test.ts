import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketFailureDiagnostic,markWebSearchFailure} from '../lib/bardoctor/market-diagnostics';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const uuid='12ab3456-1234-1234-1234-123456789abc';
test('diagnostics allow only fixed fields and codes, never error text or incoming identity',()=>{
 const secret='PRIVATE_TOKEN owner@example.test prompt response address stack';
 const e=Object.assign(new Error(secret),{code:secret,stack:secret});
 const result=marketFailureDiagnostic(e,'save',502,secret);
 assert.equal(result.requestId,'unavailable');assert.equal(result.code,'UNEXPECTED_ERROR');
 assert.ok(!JSON.stringify(result).includes(secret));assert.ok(!JSON.stringify(result).includes('owner@'));
 assert.deepEqual(Object.keys(result).sort(),['code','event','reason','requestId','stage','status']);
 const tagged=markWebSearchFailure(e,'PROVIDER_HTTP',422);
 assert.equal(marketFailureDiagnostic(tagged,'provider',422,uuid).providerStatus,422);
 assert.equal(marketFailureDiagnostic(tagged,'provider',422,uuid).reason,'PROVIDER_HTTP');
});

test('native market errors emit correlated safe metadata and retain old analysis without external calls',async()=>{
 const fixture={mode:'format',payload:'{}',calls:0,fetch:async()=>{
  fixture.calls++;
  if(fixture.mode==='network')throw Error('PRIVATE_TOKEN owner@example.test');
  if(fixture.mode==='timeout')throw new DOMException('PRIVATE_TOKEN','TimeoutError');
  if(fixture.mode.startsWith('provider'))return Response.json({error:{code:'PRIVATE_TOKEN',message:'owner@example.test'}},{status:fixture.mode==='provider422'?422:503});
  if(fixture.mode==='empty')return Response.json({output:[]});
  return Response.json({output_text:fixture.mode==='valid'?fixture.payload:'PRIVATE_TOKEN owner@example.test'});
 }};
 const runtime=await lifecycleRuntime({market:'./app/api/market/route'},{modules:{'market-diag-fixture':fixture},plugins:[{name:'local-provider-only',setup(build){
  build.onLoad({filter:/\/lib\/bardoctor\/openai\.ts$/},args=>({contents:"const fetch=require('market-diag-fixture').fetch;\n"+readFileSync(args.path,'utf8'),loader:'ts',resolveDir:args.path.slice(0,args.path.lastIndexOf('/'))}));
  build.onResolve({filter:/^market-diag-fixture$/},()=>({path:'market-diag-fixture',external:true}));
  build.onResolve({filter:/^\.\/integration-secrets$/},args=>args.importer.endsWith('/openai.ts')?{path:'fixture-secret',namespace:'fixture-secret'}:null);
  build.onLoad({filter:/.*/,namespace:'fixture-secret'},()=>({contents:"export async function getIntegrationValue(_account,key){return key==='OPENAI_MODEL'?'local-fixture':'PRIVATE_TOKEN'}",loader:'js'}));
 }}]});
 const results:string[]=[],info=console.info;console.info=(...args)=>results.push(args.join(' '));
 const logs:string[]=[],original=console.error;console.error=(...args)=>logs.push(args.join(' '));
 try{
  const owner=await runtime.register('market-diag@isolated.test');
  runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'PRIVATE_PROFILE',city:'Бендеры',country:'Молдова'}),owner.userId);
  const old=JSON.stringify({generatedAt:'2026-10-24T16:26:00Z',competitors:[{name:'Сохранённый кандидат'}]});
  runtime.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,'bd_market_analysis_v1',?)").run(owner.userId,old);
  for(const [mode,status,code,reason,stage] of [
   ['format',422,'AI_RESPONSE_FORMAT','INVALID_JSON','format'],
   ['provider422',422,'AI_SERVICE_ERROR','PROVIDER_HTTP','provider'],
   ['provider503',502,'AI_SERVICE_ERROR','PROVIDER_HTTP','provider'],
   ['empty',502,'AI_SERVICE_ERROR','PROVIDER_EMPTY','provider'],
   ['network',502,'AI_SERVICE_ERROR','PROVIDER_NETWORK','provider'],
   ['timeout',502,'AI_SERVICE_ERROR','PROVIDER_TIMEOUT','provider']
  ] as const){
   fixture.mode=mode;const before=logs.length,response=await runtime.api.market.POST(runtime.request(owner,'/api/market','POST',{focus:'PRIVATE_PROMPT'})),body:any=await response.json();
   assert.equal(response.status,status);assert.equal(body.code,code);assert.equal(logs.length,before+1);
   const log=JSON.parse(logs.at(-1)!);assert.equal(log.code,code);assert.equal(log.reason,reason);assert.equal(log.stage,stage);
   assert.equal(log.requestId,response.headers.get('X-BD-Market-Request-Id'));
   assert.equal(log.status,status);if(mode.startsWith('provider'))assert.equal(log.providerStatus,mode==='provider422'?422:503);
   assert.equal((runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_market_analysis_v1'").get(owner.userId) as any).data_json,old);
  }
  fixture.mode='valid';const before=logs.length;
  assert.equal((await runtime.api.market.POST(runtime.request(owner,'/api/market','POST',{}))).status,200);assert.equal(logs.length,before);
  const reloaded:any=await (await runtime.api.market.GET(runtime.request(owner,'/api/market','GET'))).json();
  assert.equal(reloaded.analysis.generatedAt,'2026-10-24T16:26:00Z');assert.equal(reloaded.analysis.competitors[0].name,'Сохранённый кандидат');assert.equal(reloaded.analysis.lastAttempt.reason,'MODEL_EMPTY');
  assert.equal(fixture.calls,7);
  fixture.payload=JSON.stringify({competitors:[{name:'Foreign',city:'Бельцы',category:'Кафе'}]});
  const filtered:any=await (await runtime.api.market.POST(runtime.request(owner,'/api/market','POST',{}))).json();assert.equal(filtered.data.lastAttempt.reason,'FILTER_EMPTY');assert.equal(filtered.data.generatedAt,reloaded.analysis.generatedAt);
  fixture.payload=JSON.stringify({competitors:[{name:'Unknown local candidate',category:'Кафе'}]});
  const useful:any=await (await runtime.api.market.POST(runtime.request(owner,'/api/market','POST',{}))).json();assert.equal(useful.data.lastAttempt.reason,'RESULT');assert.equal(useful.data.competitors.length,1);
  const other=await runtime.register('other-market@isolated.test');
  const isolated:any=await (await runtime.api.market.GET(runtime.request(other,'/api/market','GET'))).json();assert.equal(isolated.analysis,null);
  runtime.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key='bd_market_analysis_v1'").run(owner.userId);fixture.payload='{}';
  const absent:any=await (await runtime.api.market.POST(runtime.request(owner,'/api/market','POST',{}))).json();assert.equal(absent.data.generatedAt,undefined);assert.equal(absent.data.lastAttempt.reason,'MODEL_EMPTY');
  assert.equal(results.length,4);for(const line of results){const result=JSON.parse(line);assert.deepEqual(Object.keys(result).sort(),['counts','event','reason','requestId','status']);assert.equal(result.event,'market.result');assert.equal(result.status,200);}assert.doesNotMatch(results.join('\n'),/PRIVATE_|owner@|Unknown|Foreign|isolated/i);
  assert.doesNotMatch(logs.join('\n'),/PRIVATE_|owner@|market-diag@|authorization|prompt|stack/i);
 }finally{console.error=original;console.info=info;runtime.close()}
});
