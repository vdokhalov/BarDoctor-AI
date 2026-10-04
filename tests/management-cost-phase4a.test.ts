import assert from 'node:assert/strict';
import test from 'node:test';
import type { CostEpisodeV1, CostVerificationV1 } from '../lib/bardoctor/management-cost-contracts';
import { costFixture } from './helpers/management-cost-fixture';

type Payload = {ok:boolean;episode:CostEpisodeV1 & {why:string[];verificationResult:CostVerificationV1};items:CostEpisodeV1[];entries:Record<string,unknown>};
const body=async(response:{json():Promise<unknown>})=>await response.json() as Payload;

test('canonical UNKNOWN → approved server save → persisted result → idempotency → recurrence; historical/neighbor isolation',async()=>{
 const r=await costFixture();try{
 const historic=[{id:'historic',costStatus:'UNKNOWN',cost:null}];r.seed('bd_sales_events_v1',historic);
 const first=await body(await r.evaluate());assert.equal(first.ok,true,JSON.stringify(first));const e=first.episode;assert.equal(e.before.value,null);assert.equal(e.before.status,'UNKNOWN');assert.equal(e.condition,'ACTIVE');assert.match(e.why.join(' '),/ингредиентов/);assert.equal(e.scope.venueId,r.venueId);
 const duplicate=await body(await r.evaluate());assert.equal(duplicate.episode.signalId,e.signalId);
 const ev=e.latest.evidence[0];assert.equal(ev.partId,'water');const resolved=await r.api.evidence.GET(r.request('/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(ev))));assert.equal(resolved.status,200);
 const neighbor=structuredClone(r.read('bd_assortment_v1').menuItems[1]);const save=await r.api.store.PUT(r.request('/api/store/bd_assortment_v1','PUT',{data:r.correct()}),{params:Promise.resolve({key:'bd_assortment_v1'})} as never);assert.equal(save.status,200,JSON.stringify(await save.clone().json()));
 const verified=await body(await r.verify(e.signalId,'ACCEPTED_SAVE'));assert.equal(verified.episode.condition,'VERIFIED_RESOLVED',JSON.stringify(verified));assert.equal(verified.episode.verificationResult.before.value,null);assert.equal(verified.episode.verificationResult.after.value,5);assert.equal(verified.episode.verificationResult.trigger,'OWNER_CHECK');assert.equal(verified.episode.verificationResult.causalClaim,'NONE');
 assert.deepEqual(verified.episode.why,e.why,'Resolved history retains the deterministic original reason');
 const id=verified.episode.verificationResult.verificationId;assert.equal((await body(await r.verify(e.signalId))).episode.verificationResult.verificationId,id);assert.equal((await body(await r.detail(e.signalId))).episode.verificationResult.after.value,5);
 assert.deepEqual(r.read('bd_sales_events_v1'),historic);assert.deepEqual(r.read('bd_assortment_v1').menuItems[1],neighbor);
 r.seed('bd_assortment_v1',r.assortment);const next=await body(await r.evaluate());assert.equal(next.episode.generation,2);assert.equal(next.episode.previousEpisodeId,e.signalId);assert.equal((await body(await r.detail(e.signalId))).episode.condition,'VERIFIED_RESOLVED');
 const history=await body(await r.api.costs.GET(r.request('/api/management/cost-signals?menuItemId=water&state=all')));assert.equal(history.items.length,2);
 const bulk=await body(await r.api.bulkStore.GET(r.request('/api/store')));assert.ok(Object.keys(bulk.entries).every(k=>!k.startsWith('__bd_p4a')));
 }finally{r.close()}
});
for(const problem of ['missing','invalid','price','unit','currency','ambiguous','scope','save','read','auth','race','profile-race','revocation-race'] as const)test(`cannot resolve on ${problem}`,async()=>{
 const r=await costFixture();try{
 const e=(await body(await r.evaluate())).episode;
 if(problem==='save')r.failDatabase();else r.seed('bd_assortment_v1',r.correct());
 if(problem==='missing')r.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").run(r.accountId);
 if(problem==='invalid')r.sqlite.prepare("UPDATE domain_data SET data_json='invalid' WHERE account_id=? AND store_key='bd_purchase_documents'").run(r.accountId);
 if(problem==='price')r.seed('bd_purchase_documents',[]);
 if(problem==='unit'){const a=r.correct();a.recipes[0].ingredients[0].unit='invalid';r.seed('bd_assortment_v1',a)}
 if(problem==='currency')r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL"}',r.accountId);
 if(problem==='ambiguous'){const a=r.correct();a.recipes.push({...a.recipes[0],id:'another'});r.seed('bd_assortment_v1',a)}
 if(problem==='scope'){const a=r.correct();a.recipes[0].ingredients[0].venueId=9999;r.seed('bd_assortment_v1',a)}
 if(problem==='read')r.failDatabaseRead();
 if(problem==='auth')r.sqlite.prepare("UPDATE venue_memberships SET status='removed' WHERE venue_id=?").run(r.venueId);
 if(problem==='race')r.beforeNextDomainWrite(()=>{r.seed('bd_purchase_documents',[])});
 if(problem==='profile-race')r.beforeNextDomainWrite(()=>{r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL"}',r.accountId);});
 if(problem==='revocation-race')r.beforeNextDomainWrite(()=>{r.sqlite.prepare("UPDATE venue_memberships SET status='removed' WHERE venue_id=?").run(r.venueId);});
 const response=await r.verify(e.signalId);const data=await body(response);assert.notEqual(data.episode?.condition,'VERIFIED_RESOLVED',JSON.stringify(data));
 const stored=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key>=? AND store_key<?").get(r.accountId,`__bd_p4a_cost_episode_v1__:${r.venueId}:`,`__bd_p4a_cost_episode_v1__:${r.venueId}:\uffff`)!.data_json));assert.equal(stored.condition,'ACTIVE');assert.equal(stored.verificationResult,null);
 }finally{r.close()}
});

test('GET read-only, guessed foreign signal and forged before/after rejected; decision is not truth; archive is not cost resolution',async()=>{
 const r=await costFixture();try{
 const before=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all();await r.api.costs.GET(r.request('/api/management/cost-signals'));assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all(),before);
 const e=(await body(await r.evaluate())).episode;
 const other=await r.register('other@phase4a.isolated.test');const foreign=r.request('/api/management/cost-signals/'+e.signalId,'GET',undefined,other,other.activeVenueId);assert.equal((await r.api.detail.GET(foreign,{params:Promise.resolve({id:e.signalId})})).status,404);
 assert.equal((await r.api.verify.POST(r.request('/api/management/cost-signals/'+e.signalId+'/verify','POST',{resolved:true,value:5}),{params:Promise.resolve({id:e.signalId})})).status,400);
 r.seed('bd_decisions',[{status:'approved',signalId:e.signalId}]);r.seed('bd_action_tasks',[{status:'done',signalId:e.signalId}]);assert.equal((await body(await r.verify(e.signalId))).episode.condition,'ACTIVE');
 const a=r.read('bd_assortment_v1');a.menuItems[0].active=false;r.seed('bd_assortment_v1',a);const archived=await body(await r.evaluate());assert.equal(archived.episode.condition,'NOT_APPLICABLE');assert.equal(archived.episode.verificationResult,null);
 }finally{r.close()}
});

test('confirmed canonical zero is known zero, NONE is not a recipe correction, and other UNKNOWN does not create episodes',async()=>{
 const r=await costFixture();try{
 const e=(await body(await r.evaluate())).episode;r.seed('bd_assortment_v1',r.correct());
 r.seed('bd_stock_movements',[{id:'free-receipt',venueId:r.venueId,type:'receipt',date:'2026-10-01',productKey:'product:water',productName:'QA вода',amount:1,unit:'pcs',costAmount:0,costStatus:'KNOWN_ZERO',currency:'RUB',sourceDocumentId:'purchase-free',sourceLineId:'line-free',createdAt:'2026-10-01T10:00:00Z',status:'active'}]);
 const verified=await body(await r.verify(e.signalId));assert.equal(verified.episode.verificationResult.after.status,'KNOWN_ZERO');assert.equal(verified.episode.verificationResult.after.value,0);
 r.seed('bd_assortment_v1',r.assortment);const recurrence=await body(await r.evaluate());const changed=r.correct();changed.menuItems[0].consumptionMode='NONE';r.seed('bd_assortment_v1',changed);const none=await body(await r.verify(recurrence.episode.signalId));assert.equal(none.episode.condition,'NOT_APPLICABLE');assert.equal(none.episode.verificationResult,null);
 r.seed('bd_stock_movements',[]);r.seed('bd_purchase_documents',[]);r.seed('bd_assortment_v1',r.correct());const priceUnknown=await body(await r.evaluate());assert.equal(priceUnknown.episode.generation,2);assert.equal(priceUnknown.episode.condition,'NOT_APPLICABLE');
 }finally{r.close()}
});

test('concurrent evaluation and verification create one episode/result; source content CAS with unchanged timestamp',async()=>{
 const r=await costFixture();try{
 const evaluations=await Promise.all([r.evaluate(),r.evaluate()]);const episodes=await Promise.all(evaluations.map(body));assert.equal(episodes[0].episode.signalId,episodes[1].episode.signalId);const id=episodes[0].episode.signalId;
 r.seed('bd_assortment_v1',r.correct());const results=await Promise.all([r.verify(id),r.verify(id)]);const verified=await Promise.all(results.map(body));assert.deepEqual(verified[0].episode.verificationResult,verified[1].episode.verificationResult);
 r.seed('bd_assortment_v1',r.assortment);const next=await body(await r.evaluate());r.seed('bd_assortment_v1',r.correct());r.beforeNextDomainWrite(()=>{const purchases=r.read('bd_purchase_documents');purchases[0].items[0].unitPrice=7;purchases[0].items[0].lineTotal=7;r.seed('bd_purchase_documents',purchases)});const fresh=await body(await r.verify(next.episode.signalId));assert.equal(fresh.episode.verificationResult.after.value,7);assert.equal(fresh.episode.verificationResult.before.value,null);
 }finally{r.close()}
});

test('missing, ambiguous and stale inputs cannot create false certainty; private keys cannot be written through generic store',async()=>{
 const r=await costFixture();try{
 const stateKey='__bd_p4a_cost_state_v1__:'+r.venueId+':d2F0ZXI';const denied=await r.api.store.PUT(r.request('/api/store/'+stateKey,'PUT',{data:{condition:'VERIFIED_RESOLVED'}}),{params:Promise.resolve({key:stateKey})} as never);assert.ok(denied.status>=400);
 const a=r.assortment;a.recipes.push({...a.recipes[0],id:'competing'});r.seed('bd_assortment_v1',a);assert.equal((await body(await r.evaluate())).episode,null);a.recipes.pop();
 r.seed('bd_assortment_v1',{...a,sourceState:'STALE'});assert.equal((await body(await r.evaluate())).episode,null);
 r.seed('bd_assortment_v1',a);const e=(await body(await r.evaluate())).episode;r.seed('bd_assortment_v1',{...r.correct(),sourceState:'STALE'});const result=await body(await r.verify(e.signalId));assert.equal(result.episode.condition,'ACTIVE');assert.equal(result.episode.latest.quality.freshness,'STALE');
 }finally{r.close()}
});

test('actual Tech Card save rejection and inventory permission failure never close the episode',async()=>{
 const r=await costFixture();try{
 const e=(await body(await r.evaluate())).episode;const before=r.read('bd_assortment_v1');r.failDatabase();
 await assert.rejects(r.api.store.PUT(r.request('/api/store/bd_assortment_v1','PUT',{data:r.correct()}),{params:Promise.resolve({key:'bd_assortment_v1'})} as never),/injected database failure/);assert.deepEqual(r.read('bd_assortment_v1'),before);assert.equal((await body(await r.verify(e.signalId))).episode.condition,'ACTIVE');
 const manager=await r.register('cost-manager@phase4a.isolated.test');r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES(?,?,'member','active')").run(r.workspaceId,manager.userId);r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,permissions_json,status) VALUES(?,?,'shift_manager',?,'active')").run(r.venueId,manager.userId,JSON.stringify({allow:['analysis.run','inventory.view'],deny:['inventory.manage']}));const forbidden=await r.api.store.PUT(r.request('/api/store/bd_assortment_v1','PUT',{data:r.correct()},manager),{params:Promise.resolve({key:'bd_assortment_v1'})} as never);assert.equal(forbidden.status,403);assert.equal((await body(await r.detail(e.signalId))).episode.condition,'ACTIVE');
 }finally{r.close()}
});

test('same actor, two real venues: matching item IDs and venue switch during authoritative check remain isolated',async()=>{
 const r=await costFixture();try{
 const create=await r.api.venues.POST(r.request('/api/venues','POST',{name:'Phase4A Isolated B',businessType:'bar',country:'Россия',city:'Москва',currency:'RUB',timezone:'UTC'}));assert.equal(create.status,201);const b=(await create.json() as {venue:{id:number}}).venue.id;
 const dataAccount=Number(r.sqlite.prepare('SELECT data_account_id FROM venues WHERE id=?').get(b)!.data_account_id);
 const seedB=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(dataAccount,key,JSON.stringify(value),'2026-10-04T12:00:00Z');
 const bMenu=structuredClone(r.assortment);for(const item of bMenu.menuItems)item.venueId=b;for(const recipe of bMenu.recipes)recipe.venueId=b;for(const item of bMenu.nomenclature)item.venueId=b;seedB('bd_assortment_v1',bMenu);seedB('bd_purchase_documents',[]);seedB('bd_stock_movements',[]);
 const a=(await body(await r.evaluate())).episode;const other=await body(await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{menuItemId:'water'},r.owner,b)));assert.notEqual(a.signalId,other.episode.signalId);
 assert.equal((await r.api.detail.GET(r.request('/api/management/cost-signals/'+a.signalId,'GET',undefined,r.owner,b),{params:Promise.resolve({id:a.signalId})})).status,404);
 r.seed('bd_assortment_v1',r.correct());r.beforeNextDomainWrite(async()=>{const foreign=await r.api.verify.POST(r.request('/api/management/cost-signals/'+a.signalId+'/verify','POST',{},r.owner,b),{params:Promise.resolve({id:a.signalId})});assert.equal(foreign.status,404)});const done=await body(await r.verify(a.signalId));assert.equal(done.episode.scope.venueId,r.venueId);assert.equal(done.episode.verificationResult.after.value,5);
 const unchanged=await body(await r.api.detail.GET(r.request('/api/management/cost-signals/'+other.episode.signalId,'GET',undefined,r.owner,b),{params:Promise.resolve({id:other.episode.signalId})}));assert.equal(unchanged.episode.condition,'ACTIVE');assert.equal(unchanged.episode.verificationResult,null);
 }finally{r.close()}
});

test('25-item evaluation continuation, state/history keyset pagination and tracked deletion',async()=>{
 const r=await costFixture();try{
 const menu=structuredClone(r.assortment);menu.menuItems=Array.from({length:30},(_,i)=>({...menu.menuItems[0],id:'item-'+String(i).padStart(2,'0')}));menu.recipes=[];r.seed('bd_assortment_v1',menu);
 type Page={items:{signalId:string;condition:string}[];nextCursor:string|null};
 const first=await(await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{}))).json() as Page;assert.equal(first.items.length,25);assert.ok(first.nextCursor);
 const second=await(await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{cursor:first.nextCursor}))).json() as Page;assert.equal(second.items.length,5);
 const page=await(await r.api.costs.GET(r.request('/api/management/cost-signals?state=all&limit=2'))).json() as Page;assert.equal(page.items.length,2);const next=await(await r.api.costs.GET(r.request('/api/management/cost-signals?state=all&limit=2&cursor='+encodeURIComponent(page.nextCursor!)))).json() as Page;assert.notEqual(page.items[0].signalId,next.items[0].signalId);
 menu.menuItems=[];r.seed('bd_assortment_v1',menu);let cursor:string|null=second.nextCursor;while(cursor){const checked=await(await r.api.evaluate.POST(r.request('/api/management/cost-signals/evaluate','POST',{cursor}))).json() as Page;cursor=checked.nextCursor;}const old=await body(await r.detail(first.items[0].signalId));assert.equal(old.episode.condition,'NOT_APPLICABLE');
 }finally{r.close()}
});

test('feature rollback disables commands/reads without touching canonical data or retained history',async()=>{
 const r=await costFixture({BD_DISABLE_COST_MANAGEMENT_PHASE4A:'1'});try{
 r.seed('__bd_p4a_cost_episode_v1__:retained-history',{verificationId:'retained'});const before=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all();const response=await r.evaluate();assert.equal(response.status,503);assert.equal((await response.json() as {code:string}).code,'FEATURE_DISABLED');assert.equal((await r.api.costs.GET(r.request('/api/management/cost-signals'))).status,503);assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all(),before);
 }finally{r.close()}
});

test('retained episode cannot be overwritten when its state row is missing; superseded cards are not competing current cards',async()=>{
 const r=await costFixture();try{
 const e=(await body(await r.evaluate())).episode;r.seed('bd_assortment_v1',r.correct());const result=await body(await r.verify(e.signalId));const immutable=structuredClone(result.episode.verificationResult);
 r.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key>=? AND store_key<?").run(r.accountId,'__bd_p4a_cost_state_v1__:','__bd_p4a_cost_state_v1__:\uffff');r.seed('bd_assortment_v1',r.assortment);const failed=await r.evaluate();assert.equal(failed.status,422);const row=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key>=? AND store_key<?").get(r.accountId,'__bd_p4a_cost_episode_v1__:','__bd_p4a_cost_episode_v1__:\uffff')!;assert.deepEqual(JSON.parse(String(row.data_json)).verificationResult,immutable);
 }finally{r.close()}
 const second=await costFixture();try{const a=second.assortment;a.recipes.push({...a.recipes[0],id:'old-recipe',lifecycleStatus:'superseded'});second.seed('bd_assortment_v1',a);const e=await body(await second.evaluate());assert.equal(e.episode.condition,'ACTIVE');assert.equal(e.episode.before.recipeId,'recipe-water')}finally{second.close()}
});

test('invalid IDs, duplicate entities, oversized sources and malformed/oversized commands fail closed',async()=>{
 const r=await costFixture();try{
 for(const kind of ['duplicate','oversize-id','empty-id','source-bytes','source-rows'] as const){const a=structuredClone(r.assortment);if(kind==='duplicate')a.menuItems.push({...a.menuItems[0]});if(kind==='oversize-id')a.menuItems[0].id='x'.repeat(121);if(kind==='empty-id')a.menuItems[0].id='';if(kind==='source-bytes')a.menuItems[0].name='x'.repeat(2_000_001);if(kind==='source-rows')a.nomenclature=Array.from({length:10001},()=>({...a.nomenclature[0]}));r.seed('bd_assortment_v1',a);const response=await r.evaluate();const payload=await body(response);assert.ok(response.status>=400||!payload.episode,kind);}
 r.seed('bd_assortment_v1',r.assortment);const malformed=r.request('/api/management/cost-signals/evaluate','POST',[]);assert.equal((await r.api.evaluate.POST(malformed)).status,400);const oversized=r.request('/api/management/cost-signals/evaluate','POST',{menuItemId:'x'.repeat(17000)});assert.equal((await r.api.evaluate.POST(oversized)).status,413);
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key>=? AND store_key<?").get('__bd_p4a_cost_','__bd_p4a_cost_\uffff')!.n,0);
 }finally{r.close()}
});
