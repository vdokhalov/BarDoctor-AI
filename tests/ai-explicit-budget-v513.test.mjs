import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
import {patchDiagnosisBudget} from '../scripts/patch-ai-explicit-budget-v513.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function fn(source,start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}
test('calendar automatic invocation and cancelled consent perform no POST',async()=>{
 const calls=[]; const context={state:{refreshing:false},window:{confirm:()=>false},api:()=>calls.push(1)};
 vm.createContext(context);vm.runInContext(fn(read('public/opportunities.js'),'  async function refreshCalendar(', '  function ',),context);
 await context.refreshCalendar(true); await context.refreshCalendar(false); assert.equal(calls.length,0);
});
test('saved review loads never invoke paid analysis; reload after imports also stays read-only',()=>{
 const load=fn(read('public/reviews.js'),'  async function loadData()', '  var aiButton');
 assert.doesNotMatch(load,/analyzePending\(|loadDoctorSummary\(/);
 assert.match(load,/api\("\/api\/review-layer", \{ method: "GET" \}/);
});
test('supplier global action chooses a group without fan-out',async()=>{
 const calls=[];const c={searchRunning:false,searchPlan:[{id:1},{id:2}],setView:()=>{},setProgress:()=>{},document:{getElementById:()=>null,createElement:()=>({setAttribute(){},append(){}})},element:()=>({append(){}}),Option:function(){},$:()=>({prepend(){}}),api:()=>calls.push(1)};
 vm.createContext(c);vm.runInContext(fn(read('public/supplier-alternatives.js'),'  async function runFullSearch()', '  function configureRefresh'),c);
 await c.runFullSearch();assert.equal(calls.length,0);
});
for (const status of [200,400,422,500]) test('web search request/tool/output budgets; provider status '+status,async()=>{
 const calls=[];
 let s=fn(read('lib/bardoctor/openai.ts'),'export async function openAIWebSearch','export async function openAIText').replace('export async','async');
 s=ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const c={getIntegrationValue:async(_id,key)=>key==='OPENAI_API_KEY'?'fixture-key':'fixture-model',reserveOpenAIRequest:async()=>true,crypto:{randomUUID:()=> 'fixture'},runtimeEnv:()=>null,Date,Object,Math,JSON,AbortSignal,AIServiceError:Error,responsesEndpoint:()=>'/mock',observeOpenAI:async()=>{},providerErrorCode:async()=> 'mock',providerErrorMessage:()=> 'mock',responseText:()=> 'result',responseWebSources:()=>[],fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:status===200,status,json:async()=>({})}}};
 vm.createContext(c);vm.runInContext(s,c);
 const pending=c.openAIWebSearch({accountId:1,system:'fixture',prompt:'fixture',maxTokens:15000});
 if(status===200)await pending;else await assert.rejects(pending);
 assert.equal(calls.length,1);assert.equal(calls[0].max_tool_calls,6);assert.equal(calls[0].max_output_tokens,9000);assert.equal(calls[0].store,false);
});
test('diagnosis budget patch is replay safe and disables retries',()=>{
 const source=read('public/assets/index-BQGspy0I.js'); const patched=patchDiagnosisBudget(source);
 assert.equal(patchDiagnosisBudget(patched),patched);assert.match(patched,/AI explicit budget v513[\s\S]{0,400}const k=0/);
});
test('explicit reviews analyzes at most25 and one summary, repeated handler is guarded',async()=>{
 const requests=[]; const c={state:{layer:{updatedAt:'fixture'}},canManageReviews:()=>true,currentVenueId:()=>3389,reviews:()=>Array.from({length:60},(_,i)=>({id:String(i),aiStatus:'pending'})),summary:()=>({total:60,analyzed:25}),api:async(path,opts)=>{requests.push({path,body:JSON.parse(opts.body)});return path.endsWith('/analyze')?{data:{results:[]}}:{data:null};},renderAll:()=>{},renderDoctor:()=>{},sessionStorage:{getItem:()=>null,setItem:()=>{}},showMessage:()=>{}};
 vm.createContext(c);vm.runInContext(fn(read('public/reviews.js'),'  async function analyzePending()', '  async function prepareReply'),c);
 await c.analyzePending();await c.analyzePending();
 assert.deepEqual(requests.map(x=>x.path),['/api/reviews/analyze','/api/review-layer/analysis','/api/reviews/doctor-summary']);
 assert.equal(requests[0].body.reviews.length,25);
});
test('review result from previous venue cannot be persisted into newly selected venue',async()=>{
 let venue=3389; const paths=[];const c={state:{},canManageReviews:()=>true,currentVenueId:()=>venue,reviews:()=>[{id:'fixture',aiStatus:'pending'}],api:async path=>{paths.push(path);venue=9999;return {data:{results:[]}};},showMessage:()=>{}};
 vm.createContext(c);vm.runInContext(fn(read('public/reviews.js'),'  async function analyzePending()', '  async function loadDoctorSummary'),c);
 await c.analyzePending();assert.deepEqual(paths,['/api/reviews/analyze']);
});
test('all Home bootstrap variants only read saved AI data',()=>{
 for(const file of ['public/bardoctor-preview.js','public/bardoctor-preview-v396.js','public/bardoctor-preview-v397.js']) {
  const s=read(file); assert.doesNotMatch(s,/automatic: true|refreshInBackground\(|backgroundRefresh\(/);
  assert.match(s,/fetch\("\/api\/market"\)/); assert.match(s,/fetch\("\/api\/opportunities", \{ headers:/);
 }
});
test('market ignores automatic and declined paid requests; saving location does not launch AI',async()=>{
 const c={state:{refreshing:false},window:{confirm:()=>false},api:()=>{throw Error('unexpected paid request')}};
 vm.createContext(c);vm.runInContext(fn(read('public/market.js'),'async function refresh(', 'async function load('),c);
 await c.refresh(true);await c.refresh(false);
 assert.doesNotMatch(fn(read('public/market.js'),'async function saveLocation(', 'async function patchCompetitor('),/refresh\(/);
});
test('supplier picker can launch any group without saved results',async()=>{
 const nodes=[];const selected=[];const make=()=>{const n={children:[],append(...items){this.children.push(...items)},setAttribute(){}};nodes.push(n);return n};
 const c={searchRunning:false,searchPlan:[{id:'first',label:'Coffee'},{id:'second',label:'Milk'}],setView:()=>{},setProgress:()=>{},document:{getElementById:()=>null,createElement:make},element:make,Option:function(label,value){this.label=label;this.value=value},$:()=>({prepend(){}}),runTargetSearch:(label,id)=>selected.push([label,id])};
 vm.createContext(c);vm.runInContext(fn(read('public/supplier-alternatives.js'),'  async function runFullSearch()', '  function configureRefresh'),c);
 await c.runFullSearch();assert.equal(nodes[1].children.length,2);nodes[1].value='second';nodes[2].onclick();assert.deepEqual(selected,[['Milk','second']]);
});
