import test from 'node:test';
import assert from 'node:assert/strict';
import {curatedDoctorFixture} from './helpers/curated-doctor-fixture';
import {homeFinancialResult,managementTaskContext,managementActionContext} from '../lib/bardoctor/client/management-actions';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
type Row=Record<string,unknown>;

test('G2/G5 prepared Home uses shared queue and real money-card never fabricates percentage trends',()=>{
 const source=readFileSync(new URL('../public/assets/index-BQGspy0I.js',import.meta.url),'utf8');
 assert.ok(source.includes('i.jsx(bdManagementHomePhase4,{onNavigate:g})'));
 assert.ok(!source.includes('i.jsx(bdHomeAttention,{profile:e,report:E'));
 const functions=['bdHomeResultV151','bdHomeMoneyCard'].map(name=>source.split('\n').find(line=>line.startsWith('function '+name+'('))!).join('\n');
 const ctx=vm.createContext({bdManagementModulePhase4b:{homeFinancialResult},i:{jsx:(_tag:unknown,props:Row)=>props,jsxs:(_tag:unknown,props:Row)=>props},W:{button:'button'},Br:'arrow',GM:(n:number)=>String(n),bdMonthDisplay:()=>'',bdHomeComparisonV151:()=> '100% comparison'});
 vm.runInContext(functions,ctx);
 const render=vm.runInContext('bdHomeMoneyCard',ctx) as (props:Row)=>Row;
 const text=(value:unknown):string=>typeof value==='object'&&value!==null?Object.values(value).map(text).join(' '):typeof value==='string'?value:'';
 const known={meta:{key:'2026-09'},operatingResult:0,isClosed:true,revenue:200},unknown={...known,operatingResult:null,cashResult:null},partial={...known,financeInputsKnown:false};
 for(const [a,b] of [[known,unknown],[unknown,known],[unknown,unknown],[partial,known],[{...known,isClosed:false},known],[{...known,operatingResult:null,cashResult:0},known]]){
  const out=text(render({report:a,previousReport:b,onNavigate:()=>{}}));assert.ok(!out.includes('%'),out);
 }
 assert.ok(text(render({report:known,previousReport:{...known,operatingResult:-10},onNavigate:()=>{}})).includes('100% comparison'));
 for(const current of [unknown,{...unknown,cashResult:0},partial])assert.ok(text(render({report:current,previousReport:known,onNavigate:()=>{}})).includes('Нет расчёта'));
});

test('G5 Home financial UNKNOWN, partial inputs and authoritative real zero remain distinct',()=>{
 for(const report of [null,{}, {revenue:200,operatingResult:null,cashResult:null},{operatingResult:undefined,cashResult:''},{operatingResult:0,cashResult:0,financeInputsKnown:false},{operatingResult:false},{operatingResult:[]},{operatingResult:' '}])assert.deepEqual(homeFinancialResult(report),{value:null,final:false});
 for(const amount of [0,-656,42])assert.deepEqual(homeFinancialResult({operatingResult:amount}),{value:amount,final:true});
 assert.deepEqual(homeFinancialResult({operatingResult:null,cashResult:0,revenue:200}),{value:null,final:false});
 assert.deepEqual(homeFinancialResult({operatingResult:null,cashResult:-20,revenue:200}),{value:null,final:false});
});

test('G3 action context accepts only one venue-scoped task identity; stock return remains scoped',()=>{
 assert.equal(managementTaskContext('?venueId=3&taskId=other-day',3),'other-day');
 assert.equal(managementTaskContext('?venueId=3&taskId=task%252F1',3),'task%2F1','task identity is decoded once from the raw URL');
 for(const query of ['?venueId=4&taskId=foreign','?venueId=3&venueId=4&taskId=x','?venueId=3&taskId=x&taskId=y','?taskId=x'])assert.equal(managementTaskContext(query,3),null);
 assert.equal(managementActionContext('?venueId=3&healthAction=health:4:stock:x',3).active,false);
});

test('G3 canonical task target has exact identity and relevant bucket, all questions use same target',async()=>{
 const r=await curatedDoctorFixture();try{
  for(const [deadline,tab] of [['2026-10-02','overdue'],['2026-10-03','today'],['2026-11-10','week']]){
   r.seed('bd_tasks',[{id:'real-critical',issueKey:'safety',title:'Проверить безопасность',priority:'critical',approvalStatus:'approved',status:'in_progress',deadline}]);
   const top=(await r.readHealth()).data.businessHealthSnapshot.managementQueue.find((q:Row)=>q.linkedTaskId==='real-critical')!;
   const path=(top.target as {path:string}).path,u=new URL(path,'https://qa.test');
   assert.equal(u.searchParams.get('venueId'),String(r.venueId));assert.equal(u.searchParams.get('taskId'),'real-critical');assert.equal(u.searchParams.get('tab'),tab);assert.equal(u.searchParams.get('returnTo'),'health');
   assert.equal((await r.ask('tasks')).nextActions[0].path,path);
  }
  r.seed('bd_tasks',[{id:'real-critical',priority:'critical',approvalStatus:'approved',status:'completed',deadline:'2026-10-02',actualResult:{status:'helped'}}]);
  assert.ok(!(await r.readHealth()).data.businessHealthSnapshot.managementQueue.some((q:Row)=>q.linkedTaskId==='real-critical'));
 }finally{r.close()}
});

test('G4 independent stock facts/verification survive real unrelated purchase, changed own quantity and missing own anchor',async()=>{
 const r=await curatedDoctorFixture({confirm:'./app/api/purchases/confirm/route'});try{
  const id=(await r.ask('stock')).facts[0].id;
  const post=async(body:object)=>{const response=await r.api.counts.POST(r.requestAction('/api/inventory/counts','POST',{venueId:r.venueId,...body}));assert.ok(response.ok,await response.clone().text());return response.json() as Promise<{inventory:{id:string;items:Row[]}}>};
  const inventory=(await post({action:'create',date:'2026-10-03',scope:{type:'all'}})).inventory;
  await post({action:'save',id:inventory.id,items:inventory.items.map(row=>({...row,actual:8}))});
  assert.equal((await r.verifyAction(id)).verification.result,'ACTIVE');
  await post({action:'finalize',id:inventory.id});
  assert.equal((await r.verifyAction(id)).verification.result,'CONDITION_CLEARED');
  r.seed('bd_suppliers',[{id:'qa-supplier',venueId:r.venueId,name:'QA Поставщик',currency:'MDL',status:'active'}]);
  const confirmed=await r.api.confirm.POST(r.requestAction('/api/purchases/confirm','POST',{document:{id:'independent-purchase',venueId:r.venueId,supplierId:'qa-supplier',supplierName:'QA Поставщик',documentDate:'2026-10-03',currency:'MDL',status:'draft',items:[{id:'tea-line',name:'QA Чайный лист',productKey:'product:tea',nomenclatureItemId:'qa-tea-leaf',quantity:10,unit:'pcs',unitPrice:37,lineTotal:370,currency:'MDL',linkSource:'manual',linkConfirmedByUser:true,linkStatus:'linked'}]}}));
  assert.ok(confirmed.ok,await confirmed.clone().text());
  const stock=await r.ask('stock'),cups=stock.facts.find(f=>f.id===id)!;
  assert.equal(cups.value,8);assert.equal(cups.kind,'DERIVED_FACT');assert.equal(stock.facts.find(f=>f.label==='QA Чайный лист')?.kind,'UNKNOWN');
  assert.equal((await r.verifyAction(id)).verification.result,'CONDITION_CLEARED');assert.equal((await r.ask('stock')).facts.find(f=>f.id===id)?.value,8);
  const ownPurchase=await r.api.confirm.POST(r.requestAction('/api/purchases/confirm','POST',{document:{id:'own-purchase',venueId:r.venueId,supplierId:'qa-supplier',supplierName:'QA Поставщик',date:'2026-10-03',currency:'MDL',status:'draft',items:[{id:'cups-line',name:'QA Стаканы',purchaseProductKey:'product:stock',nomenclatureItemId:'qa-stock',quantity:2,unit:'pcs',matchedBaseUnit:'pcs',unitPrice:1,lineTotal:2,currency:'MDL',mappingSource:'manual'}]}}));
  assert.ok(ownPurchase.ok,await ownPurchase.clone().text());assert.equal((await r.ask('stock')).facts.find(f=>f.id===id)?.value,10,'a real own-item receipt updates the proven value');assert.equal((await r.verifyAction(id)).verification.result,'CONDITION_CLEARED');
  const a=r.read('bd_assortment_v1');a.stockBalances.find((f:Row)=>f.productKey==='product:stock').current=2;r.seed('bd_assortment_v1',a);
  assert.equal((await r.verifyAction(id)).verification.result,'CANNOT_VERIFY','unexplained own projection change must not certify 8');
  a.stockBalances.find((f:Row)=>f.productKey==='product:stock').current=10;r.seed('bd_assortment_v1',a);
  assert.equal((await r.verifyAction(id)).verification.result,'CONDITION_CLEARED');
  r.seed('bd_inventory_snapshots',[]);r.seed('bd_opening_stock_v1',[]);
  assert.equal((await r.verifyAction(id)).verification.result,'CANNOT_VERIFY');assert.equal((await r.ask('stock')).facts.find(f=>f.id===id)?.kind,'UNKNOWN');
 }finally{r.close()}
});

test('G4 stale own evidence and unavailable sources cannot certify a known per-item quantity',async()=>{
 const r=await curatedDoctorFixture();try{
  const id=(await r.ask('stock')).facts[0].id;
  const a=r.read('bd_assortment_v1');a.stockBalances[0].stale=true;r.seed('bd_assortment_v1',a);
  assert.equal((await r.verifyAction(id)).verification.result,'CANNOT_VERIFY');assert.equal((await r.ask('stock')).facts[0].kind,'UNKNOWN');
  delete a.stockBalances[0].stale;r.seed('bd_assortment_v1',a);
  r.sqlite.prepare('DELETE FROM domain_data WHERE account_id=? AND store_key=?').run(r.account,'bd_stock_movements');
  assert.equal((await r.verifyAction(id)).verification.result,'CANNOT_VERIFY');assert.equal((await r.ask('stock')).facts[0].kind,'UNKNOWN');
 }finally{r.close()}
});
