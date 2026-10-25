import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';

test('authenticated saved-source diagnostic uses the real validator, returns safe outcomes and never writes or calls AI',async()=>{
 const url='https://www.tripadvisor.com/Restaurant_Review-g777897-d28012962-Reviews-Street_Food-Bender_Transnistria.html';
 const entity={'@context':'https://schema.org','@type':'FoodEstablishment',name:'Street Food',address:{streetAddress:'Kalinina St., 23',addressLocality:'Bender',addressCountry:{'@type':'Country',name:'MD'}}};
 const fixture={calls:0,mode:'ok',async fetch(input:unknown,init:any){this.calls++;assert.equal(input,url);assert.deepEqual(init.headers,{Accept:'text/html'});assert.equal(init.credentials,'omit');if(this.mode==='network')throw Error('secret private response');if(this.mode==='blocked')return new Response('private block body',{status:403});return new Response('<script type="application/ld+json">'+JSON.stringify(entity)+'</script>',{headers:{'content-type':'text/html'}})}};
 const r=await lifecycleRuntime({market:'./app/api/market/route'},{modules:{'source-check-fixture':fixture},plugins:[{name:'source-check-local-only',setup(build){
 build.onLoad({filter:/\/lib\/bardoctor\/market-page-evidence\.ts$/},args=>({contents:"const fetch=(...args)=>require('source-check-fixture').fetch(...args);\n"+readFileSync(args.path,'utf8'),loader:'ts',resolveDir:args.path.slice(0,args.path.lastIndexOf('/'))}));
 build.onResolve({filter:/^source-check-fixture$/},()=>({path:'source-check-fixture',external:true}));
 build.onResolve({filter:/\/bardoctor\/openai$/},args=>args.importer.endsWith('/app/api/market/route.ts')?{path:'never-ai',namespace:'never-ai'}:null);
 build.onLoad({filter:/.*/,namespace:'never-ai'},()=>({contents:"export async function openAIWebSearch(){throw Error('AI MUST NOT RUN')}"}));
 }}]});
 try{
 const owner=await r.register('source-check-owner@isolated.test'),other=await r.register('source-check-other@isolated.test');
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Fixture',city:'Бендеры',country:'Молдова'}),owner.userId);
 const saved={generatedAt:'2026-10-25T08:16:38.867Z',competitors:[{key:'saved-key',name:'Street Food',sourceUrls:[url]}],sources:[{url,title:'tripadvisor.com'}]};
 const write=(value:any)=>r.sqlite.prepare("INSERT OR REPLACE INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,'bd_market_analysis_v1',?,'2026-10-25')").run(owner.userId,JSON.stringify(value));write(saved);
 const payload={action:'check-source-page',competitorKey:'saved-key',sourceIndex:0,generatedAt:saved.generatedAt};
 const check=(body:any=payload,user=owner)=>r.api.market.PATCH(r.request(user,'/api/market','PATCH',body));
 const snapshot=()=>JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());const before=snapshot();
 const good=await check();assert.equal(good.status,200);const result=await good.json() as any;assert.equal(result.reason,'VERIFIED');assert.equal(result.pagesRequested,1);assert.deepEqual(Object.keys(result).sort(),['durationMs','ok','pagesRequested','reason','status']);assert.ok(!JSON.stringify(result).includes('Kalinina'));
 fixture.mode='blocked';assert.equal((await (await check()).json() as any).reason,'BLOCKED');fixture.mode='network';assert.equal((await (await check()).json() as any).reason,'NETWORK_ERROR');
 const count=fixture.calls;
 for(const bad of [{...payload,url:'http://127.0.0.1'},{...payload,sourceIndex:-1},{...payload,sourceIndex:1.2},{...payload,sourceIndex:'0'}])assert.equal((await check(bad)).status,400);
 assert.equal((await check({...payload,generatedAt:'old'})).status,409);assert.equal((await check({...payload,competitorKey:'other'})).status,404);assert.equal((await check({...payload,sourceIndex:1})).status,404);assert.equal((await check(payload,other)).status,409);
 assert.equal((await r.api.market.PATCH(new Request('http://localhost/api/market',{method:'PATCH',body:JSON.stringify(payload),headers:{'content-type':'application/json'}}))).status,401);
 const foreign=r.request(owner,'/api/market','PATCH',payload);foreign.headers.set('x-venue-id',String(other.activeVenueId));
 assert.equal((await r.api.market.PATCH(foreign)).status,401,'foreign venue cannot select saved source');
 assert.equal(fixture.calls,count);assert.equal(snapshot(),before,'all checks are read-only, including failures and repeats');
 write({...saved,competitors:[{key:'saved-key',name:'Street Food',sourceUrls:['http://127.0.0.1']}],sources:[{url:'http://127.0.0.1',title:'bad'}]});
 assert.equal((await (await check()).json() as any).reason,'UNSUPPORTED_URL');assert.equal(fixture.calls,count,'saved untrusted URL still cannot bypass allowlist');
 }finally{await r.close()}
});
