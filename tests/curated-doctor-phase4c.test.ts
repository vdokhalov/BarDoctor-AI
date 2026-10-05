import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curatedDoctorFixture } from './helpers/curated-doctor-fixture';
import { CURATED_QUESTIONS } from '../lib/bardoctor/curated-doctor-contracts';
import { curatedQuestionContext } from '../lib/bardoctor/client/curated-doctor';

test('seven real-handler answers are deterministic, read-only, scoped and use one canonical queue',async()=>{
 const r=await curatedDoctorFixture();try{
 const before=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all();
 const health=await r.readHealth(),ids=health.data.businessHealthSnapshot.managementQueue.slice(0,3).map(item=>item.managementId??item.recommendationId);
 for(const question of CURATED_QUESTIONS){const a=await r.ask(question.id),b=await r.ask(question.id);assert.deepEqual(a,b);assert.equal(a.question.id,question.id);assert.equal(a.scope.venueId,r.venueId);assert.equal(a.authority,'DETERMINISTIC_CANONICAL_SERVER');assert.equal(a.causalClaim,'NONE');assert.deepEqual(a.canonicalPriorityIds,ids);assert.ok(a.sources.length);for(const f of a.facts){assert.ok(['FACT','DERIVED_FACT','UNKNOWN'].includes(f.kind));if(f.kind==='UNKNOWN')assert.equal(f.value,null);for(const e of f.evidence)assert.equal(e.venueId,r.venueId);}for(const action of a.nextActions){assert.ok(action.path.startsWith('/'));assert.equal(new URL(action.path,'https://qa.invalid').searchParams.get('venueId'),String(r.venueId));}}
 assert.deepEqual((await r.ask('attention')).facts.map(f=>f.id),ids);assert.equal((await r.ask('next')).facts[0].id,ids[0]);
 assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),before);
 }finally{r.close()}
});
test('cost remains PRICE_UNKNOWN until confirmed authoritative purchase; catalogue price cannot certify cost',async()=>{
 const r=await curatedDoctorFixture();try{
 const a=r.read('bd_assortment_v1');a.nomenclature.find((x:{id:string})=>x.id==='qa-tea-leaf').price=1;r.seed('bd_assortment_v1',a);
 let cost=(await r.ask('cost')).facts.find(f=>f.id==='qa-tea')!;assert.equal(cost.kind,'UNKNOWN');assert.equal(cost.value,null);assert.match(cost.detail,/цен|стоим/i);assert.ok(cost.action?.path.startsWith('/health?'));
 r.seed('bd_purchase_documents',[{id:'qa-tea-purchase',venueId:r.venueId,status:'confirmed',documentType:'invoice',date:'2026-10-02',currency:'MDL',confirmedAt:'2026-10-02T12:00:00Z',items:[{id:'qa-tea-line',quantity:1,unit:'шт.',lineTotal:5,unitPrice:5,purchaseProductKey:'product:tea',nomenclatureItemId:'qa-tea-leaf'}]}]);
 cost=(await r.ask('cost')).facts.find(f=>f.id==='qa-tea')!;assert.equal(cost.kind,'DERIVED_FACT');assert.equal(cost.value,5);assert.equal(cost.currency,'MDL');
 }finally{r.close()}
});
test('stock does not invent a buy recommendation; opening the editor never clears evidence',async()=>{
 const r=await curatedDoctorFixture();try{
 const a=await r.ask('stock');assert.equal(a.facts[0].value,2);assert.match(a.limitations.join(' '),/не означает «нужно купить»/);assert.equal(a.nextActions[0].label,'Проверить эту позицию');assert.ok(a.nextActions[0].path.includes('product=product%3Astock'));assert.equal((await r.verifyAction(a.facts[0].id)).verification.result,'ACTIVE');assert.deepEqual((await r.ask('stock')).facts,a.facts);
 r.seed('bd_opening_stock_v1',[]);const unknown=await r.ask('stock');assert.equal(unknown.facts[0].kind,'UNKNOWN');assert.equal(unknown.facts[0].value,null);assert.equal(unknown.nextActions.length,0);
 }finally{r.close()}
});
test('incomplete day and recorded expenses never imply complete profit or all business expenses',async()=>{
 const r=await curatedDoctorFixture();try{
 const shifts=await r.ask('shifts');assert.equal(shifts.facts[0].status,'AWAITING_OPERATIONAL_DATA');assert.ok(shifts.nextActions[0].path.includes('businessDate=2026-10-02'));
 const a=await r.ask('expenses');assert.equal(a.facts[0].value,42);assert.equal(a.facts[1].kind,'UNKNOWN');assert.equal(a.facts[2].value,25);assert.equal(a.period.startDate,'2026-10-01');assert.equal(a.period.endDate,'2026-10-03');assert.match(a.answer,/только зарегистрированные/);assert.match(a.limitations.join(' '),/Прибыль.*не выводится/);
 r.sqlite.prepare('DELETE FROM domain_data WHERE account_id=? AND store_key=?').run(r.account,'bd_finance_expenses');assert.equal((await r.ask('expenses')).facts[0].value,null);
 r.seed('bd_finance_expenses',[]);assert.equal((await r.ask('expenses')).facts[0].value,0);
 }finally{r.close()}
});
test('overdue critical task is retained with recorded status and deadline, no AI ranking',async()=>{
 const r=await curatedDoctorFixture();try{const tasks=await r.ask('tasks');assert.equal(tasks.facts[0].priority,'critical');assert.equal(tasks.facts[0].deadline,'2026-10-02');assert.equal(tasks.facts[0].status,'in_progress');assert.equal(tasks.facts[0].id,(await r.ask('attention')).facts[0].id);}finally{r.close()}
});
test('native absence, stale declarations, corrupt expense dates and duplicate records cannot prove known zero',async()=>{
 const r=await curatedDoctorFixture();try{
 r.seed('bd_assortment_v1',{...r.read('bd_assortment_v1'),stale:true});assert.equal((await r.ask('cost')).facts[0].kind,'UNKNOWN');assert.equal((await r.ask('stock')).facts[0].kind,'UNKNOWN');
 r.seed('bd_finance_expenses',[{id:'bad-date',date:'garbage',amount:20,category:'rent'}]);assert.equal((await r.ask('expenses')).facts[0].value,null);
 r.seed('bd_finance_expenses',[{id:'duplicate',date:'2026-10-01',amount:10},{id:'duplicate',date:'2026-10-01',amount:10}]);assert.equal((await r.ask('expenses')).facts[0].value,null);
 for(const key of ['bd_tasks','bd_action_tasks'])r.sqlite.prepare('DELETE FROM domain_data WHERE account_id=? AND store_key=?').run(r.account,key);
 const tasks=await r.ask('tasks');assert.equal(tasks.availability,'UNAVAILABLE');assert.match(tasks.answer,/Недостаточно/);
 }finally{r.close()}
});
test('forged question/action/context, other venue, logged-out and restricted accounts are denied',async()=>{
 const r=await curatedDoctorFixture();try{
 const get=async(path:string,user=r.user,venue=r.venueId)=>r.api.curated.GET(r.requestAction(path,'GET',undefined,user,venue),{params:Promise.resolve({action:'curated'})} as never);
 for(const q of ['revenue','profit','buy','changes','<script>','attention&question=next','attention&actionId=forged','attention&signalId=foreign'])assert.equal((await get('/api/ai/curated?question='+q)).status,400);
 assert.equal((await get('/api/ai/curated?question=attention&venueId=999999')).status,404);
 const other=await r.register('curated-other@isolated.test');assert.equal((await get('/api/ai/curated?question=attention',other,r.venueId)).status,401);
 const req=r.requestAction('/api/ai/curated?question=attention');req.headers.delete('X-Session-Token');assert.equal((await r.api.curated.GET(req,{params:Promise.resolve({action:'curated'})} as never)).status,401);
 r.sqlite.prepare("UPDATE venue_memberships SET role='manager',permissions_json=? WHERE venue_id=?").run(JSON.stringify({deny:['analysis.run']}),r.venueId);assert.equal((await get('/api/ai/curated?question=attention')).status,403);
 }finally{r.close()}
});
test('nested foreign rows and names cannot enter Doctor facts',async()=>{
 const r=await curatedDoctorFixture();try{
 // Seed raw because the reusable fixture deliberately maps its own venue ids.
 const a=r.read('bd_assortment_v1');a.menuItems.push({id:'secret',name:'FOREIGN_SECRET',venueId:999,active:true,consumptionMode:'RECIPE'});
 r.sqlite.prepare('UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key=?').run(JSON.stringify(a),r.account,'bd_assortment_v1');
 for(const q of CURATED_QUESTIONS)assert.ok(!JSON.stringify(await r.ask(q.id)).includes('FOREIGN_SECRET'));
 }finally{r.close()}
});
test('return context rejects duplicate ids, foreign venue and unsupported prompts',()=>{
 assert.equal(curatedQuestionContext('?doctorQuestion=cost&venueId=1',1),'cost');
 for(const q of ['?doctorQuestion=profit&venueId=1','?doctorQuestion=cost&venueId=2','?doctorQuestion=cost&doctorQuestion=next&venueId=1','?doctorQuestion=cost&venueId=1&venueId=1'])assert.equal(curatedQuestionContext(q,1),null);
});
test('missing nomenclature, absent recipe and unapproved receipt have different honest cost states',async()=>{
 const r=await curatedDoctorFixture();try{
 const original=r.read('bd_assortment_v1');const a=structuredClone(original);a.nomenclature=a.nomenclature.filter((x:{id:string})=>x.id!=='qa-tea-leaf');r.seed('bd_assortment_v1',a);const missing=(await r.ask('cost')).facts[0];assert.equal(missing.value,null);assert.ok(missing.reasonCodes?.includes('NOMENCLATURE_MISSING'));assert.match(missing.detail,/нет номенклатуры/);
 a.recipes=[];r.seed('bd_assortment_v1',a);assert.ok((await r.ask('cost')).facts[0].reasonCodes?.includes('RECIPE_MISSING'));
 r.seed('bd_assortment_v1',original);r.seed('bd_purchase_documents',[{id:'draft',venueId:r.venueId,status:'draft',currency:'MDL',date:'2026-10-02',items:[{id:'draft-line',quantity:1,unit:'pcs',unitPrice:10,lineTotal:10,purchaseProductKey:'product:tea',nomenclatureItemId:'qa-tea-leaf'}]}]);assert.equal((await r.ask('cost')).facts[0].value,null);
 }finally{r.close()}
});
test('authoritative task and incident correction changes both Doctor questions and Health together',async()=>{
 const r=await curatedDoctorFixture();try{
 const first=await r.ask('next');assert.equal(first.facts[0].priority,'critical');
 r.seed('bd_tasks',r.read('bd_tasks').map((task:object)=>({...task,status:'completed',actualResult:{status:'helped'}})));
 let next=await r.ask('next');assert.notEqual(next.facts[0].id,first.facts[0].id);assert.equal(next.facts[0].id,'health:'+r.venueId+':case:qa-critical');
 r.seed('bd_cases',r.read('bd_cases').map((row:object)=>({...row,status:'resolved'})));next=await r.ask('next');const attention=await r.ask('attention'),health=await r.readHealth();assert.equal(next.facts[0].id,attention.facts[0].id);assert.equal(next.facts[0].id,String(health.data.businessHealthSnapshot.managementQueue[0].managementId??health.data.businessHealthSnapshot.managementQueue[0].recommendationId));assert.equal((await r.ask('tasks')).facts.length,0);
 }finally{r.close()}
});
test('open cash session is declared operating and not invented as a final profit or failure',async()=>{
 const r=await curatedDoctorFixture();try{const values=r.read('bd_finance_revenue');values[0].closingStatus='open';r.seed('bd_finance_revenue',values);const a=await r.ask('shifts');assert.equal(a.facts[0].status,'OPERATING');assert.match(a.facts[0].detail,/открыта/);assert.match(a.limitations.join(' '),/не считается нарушением/);}finally{r.close()}
});
test('invalid menu identity and stale stock do not produce fabricated correction targets',async()=>{
 const r=await curatedDoctorFixture();try{
 const a=r.read('bd_assortment_v1');a.menuItems[1].id=null;r.seed('bd_assortment_v1',a);const cost=await r.ask('cost');assert.equal(cost.facts[0].value,null);assert.equal(cost.nextActions.length,0);
 const valid=r.read('bd_assortment_v1');valid.stale=true;r.seed('bd_assortment_v1',valid);const stock=await r.ask('stock');assert.equal(stock.facts[0].kind,'UNKNOWN');assert.equal(stock.nextActions.length,0);
 }finally{r.close()}
});
test('two authorized venues of the same owner remain separate and stale question venue is rejected',async()=>{
 const r=await curatedDoctorFixture();try{
 const created=await r.api.venues.POST(r.requestAction('/api/venues','POST',{name:'SECOND_QA_ONLY',businessType:'cafe',country:'Test',city:'Isolated',currency:'MDL',timezone:'UTC'}));assert.equal(created.status,201,await created.clone().text());
 const body=await created.json() as {activeVenueId:number};const venue=body.activeVenueId;const row=r.sqlite.prepare('SELECT data_account_id FROM venues WHERE id=?').get(venue)!;
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?)').run(row.data_account_id,'bd_cases',JSON.stringify([{id:'second-critical',venueId:venue,title:'SECOND_QA_SECRET',priority:'critical',status:'open'}]),'2026-10-03T12:00:00Z');
 const get=(queryVenue:number)=>r.api.curated.GET(r.requestAction('/api/ai/curated?question=attention&venueId='+queryVenue,'GET',undefined,r.user,venue),{params:Promise.resolve({action:'curated'})} as never);
 assert.equal((await get(r.venueId)).status,404);const second=await get(venue);assert.equal(second.status,200);const a=await second.json() as {data:{scope:{venueId:number}}};assert.equal(a.data.scope.venueId,venue);assert.match(JSON.stringify(a),/SECOND_QA_SECRET/);assert.ok(!JSON.stringify(a).includes('qa-overdue-task'));
 for(const question of CURATED_QUESTIONS)assert.ok(!JSON.stringify(await r.ask(question.id)).includes('SECOND_QA_SECRET'));
 }finally{r.close()}
});
test('bounded cost coverage never claims to have checked an entire large menu',async()=>{
 const r=await curatedDoctorFixture();try{const a=r.read('bd_assortment_v1');for(let i=0;i<30;i++)a.menuItems.push({id:'qa-large-'+i,name:'QA large '+i,venueId:r.venueId,active:true,consumptionMode:'RECIPE'});r.seed('bd_assortment_v1',a);const answer=await r.ask('cost');assert.equal(answer.coverage.shown,25);assert.equal(answer.coverage.total,31);assert.equal(answer.coverage.complete,false);assert.match(answer.limitations.join(' '),/25 из 31/);assert.ok(answer.facts.every(f=>f.kind==='UNKNOWN'));}finally{r.close()}
});
test('cost without an existing correction episode offers supported catalogue search, not a fabricated signal or editor link',async()=>{
 const r=await curatedDoctorFixture();try{
 r.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key LIKE '__bd_p4a_cost_%'").run(r.account);
 const answer=await r.ask('cost');assert.equal(answer.facts[0].kind,'UNKNOWN');assert.equal(answer.nextActions[0].label,'Найти позицию в техкартах');const target=new URL(answer.nextActions[0].path,'https://qa.test');assert.equal(target.pathname,'/catalog');assert.equal(target.searchParams.get('q'),'QA Чай');assert.equal(target.searchParams.has('signalId'),false);assert.equal(target.searchParams.has('menuItemId'),false);
 }finally{r.close()}
});
