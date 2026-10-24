import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import path from 'node:path';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
test('fixed provider: authoritative review input, aspect extraction, strict summary and reload without calls',async()=>{
 const fixture={response:'{}',calls:[] as any[]};
 const r=await lifecycleRuntime({ai:'./app/api/reviews/[action]/route',layer:'./app/api/review-layer/route',analysis:'./app/api/review-layer/analysis/route'},{modules:{'review-fixture':fixture},plugins:[{name:'no-external-ai',setup(build){
 build.onResolve({filter:/^review-fixture$/},()=>({path:'review-fixture',external:true}));
 build.onLoad({filter:/\/ai-provider\.ts$/},args=>({contents:readFileSync(args.path,'utf8').replace('export async function aiText(input: AIInput): Promise<string> {','export async function aiText(input: AIInput): Promise<string> { const fixture = require("review-fixture"); fixture.calls.push(input); return fixture.response;') ,loader:'ts',resolveDir:path.dirname(args.path)}));
 }}]});
 try{
 const owner=await r.register('review-ai@test.invalid');const account=await r.api.auth.authenticateRequest(r.request(owner,'/api/review-layer'));assert.ok(account);
 const text='Кухня вкусная, но заказ ждали час';const review={id:'r1',venueId:account.venueId,text,source:'other',date:'2026-10-24',rating:3,aiStatus:'pending'};
 r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,'bd_guest_reviews',?)").run(account.id,JSON.stringify([review]));
 const call=async(action:string,body:any)=>r.api.ai.POST(r.request(owner,'/api/reviews/'+action,'POST',body),{params:Promise.resolve({action})} as any);
 fixture.response=JSON.stringify({results:[{id:'r1',sentiment:'negative',topicEvidence:[{reviewId:'r1',topic:'kitchen',sentiment:'positive',quote:'Кухня вкусная'},{reviewId:'r1',topic:'wait_time',sentiment:'negative',quote:'заказ ждали час'}]},{id:'foreign',sentiment:'negative'}]});
 const analyzed=await call('analyze',{reviews:[{id:'r1',text:'forged'},{id:'foreign'}]});assert.equal(analyzed.status,200);const data=await analyzed.json() as any;assert.equal(data.data.results.length,1);assert.equal(data.data.results[0].analysisText,text);assert.doesNotMatch(JSON.stringify(fixture.calls[0].messages),/forged/);
 assert.equal((await r.api.analysis.POST(r.request(owner,'/api/review-layer/analysis','POST',{updates:data.data.results}))).status,200);
 fixture.response=JSON.stringify({recommendations:[{title:'made-up kitchen complaint',topic:'kitchen',evidenceIds:['review:r1:0']},{title:'Check waiting',topic:'wait_time',evidenceIds:['review:r1:1']},{title:'fake',topic:'wait_time',evidenceIds:['reviews:aggregate']}]});
 const summary=await call('doctor-summary',{insights:{topComplaints:[{topic:'kitchen',negative:100}]}});assert.equal(summary.status,200);const saved=await summary.json() as any;assert.deepEqual(saved.data.recommendations,['Проверьте ожидание заказов']);assert.equal(fixture.calls.length,2);
 for(let i=0;i<2;i++){const get=await r.api.layer.GET(r.request(owner,'/api/review-layer'));assert.deepEqual((await get.json() as any).data.doctorSnapshot.data,saved.data);}assert.equal(fixture.calls.length,2);
 }finally{r.close()}
});
