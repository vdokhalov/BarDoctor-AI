import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const NEW='sales-event:6df041eec8a679228224ea57f4fb83e97a445b6472663e6249f5f42d0c48e01f',OLD='control-42955B86';
async function setup(){
 const r=await lifecycleRuntime({route:'./app/api/inventory/movements/route',journal:'./lib/bardoctor/stock-journal',database:'./db'});
 const user=await r.register('document@isolated.test'),scope={accountId:user.userId,venueId:user.activeVenueId};
 const db=(r.api.database as unknown as typeof import('../db')).getD1(),journal=r.api.journal as unknown as typeof import('../lib/bardoctor/stock-journal');
 const put=(value:unknown)=>r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,'bd_stock_movements',?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId,JSON.stringify(value));
 const request=(id:string,extra='')=>r.api.route.GET(r.request(user,'/api/inventory/movements?sourceDocumentId='+encodeURIComponent(id)+extra));
 const row=(id:string,document:string,legacy=false)=>({id,venueId:scope.venueId,type:'sale_consumption',productKey:'test',amount:-1,...(legacy?{}:{sourceDocumentId:document}),salesBatchId:document,recipeSnapshot:{test:true}});
 return {r,user,scope,db,journal,put,request,row};
}
test('document selector finds 12 new negative-position rows and 10 migrated legacy links before pagination; scope and revision fail closed',async t=>{
 const s=await setup();t.after(s.r.close);
 const initial=Array.from({length:40},(_,i)=>s.row('old-'+i,i%4===0?OLD:'unrelated',true));s.put(initial);
 while((await s.journal.copyLegacyJournal(s.db,s.scope)).state!=='verified'){}await s.journal.activateJournal(s.db,s.scope);
 await s.db.batch(await s.journal.appendJournalStatements(s.db,s.scope,0,Array.from({length:12},(_,i)=>s.row('new-'+i,NEW))));
 const reads:string[]=[];s.r.onRead(sql=>{reads.push(sql);});
 let cursor:number|null=null,revision:number|undefined;const ids:string[]=[];
 do{const response=await s.request(NEW,'&limit=4'+(cursor===null?'':'&cursor='+cursor+'&revision='+revision));assert.equal(response.status,200);const p=await response.json() as {items:{id:string}[];next:number|null;revision:number;sourceDocumentId:string};assert.equal(p.sourceDocumentId,NEW);revision=p.revision;ids.push(...p.items.map(x=>x.id));cursor=p.next;}while(cursor!==null);
 s.r.onRead(null);assert.equal(new Set(ids).size,12);assert.equal(ids.length,12);assert.ok(reads.some(sql=>sql.includes('source_document_id=? OR m.sales_batch_id=?')&&sql.includes('LIMIT ?')));
 const old=await(await s.request(OLD)).json() as {items:unknown[]};assert.equal(old.items.length,10);
 const missing=await(await s.request('missing')).json() as {items:unknown[];next:null};assert.deepEqual(missing.items,[]);assert.equal(missing.next,null);
 for(const suffix of ['&limit=501','&cursor=1.5','&cursor=0','&revision=no','&sourceDocumentId=duplicate'])assert.equal((await s.request(NEW,suffix)).status,422,suffix);
 const first=await(await s.request(NEW,'&limit=4')).json() as {next:number;revision:number};assert.ok(first.next<0);
 await s.db.batch(await s.journal.appendJournalStatements(s.db,s.scope,1,[s.row('later','unrelated')]));const changed=await s.request(NEW,'&cursor='+first.next+'&revision='+first.revision);assert.equal(changed.status,409);assert.equal((await changed.json() as {code:string}).code,'STOCK_JOURNAL_PAGE_CHANGED');
 const other=await s.r.register('other-document@isolated.test');const otherResponse=await s.r.api.route.GET(s.r.request(other,'/api/inventory/movements?sourceDocumentId='+encodeURIComponent(NEW)));assert.equal((await otherResponse.json() as {items:unknown[]}).items.length,0);
 const cross=s.r.request(s.user,'/api/inventory/movements?sourceDocumentId='+encodeURIComponent(NEW));cross.headers.set('X-Venue-Id',String(other.activeVenueId));assert.equal((await s.r.api.route.GET(cross)).status,401);
 s.r.sqlite.prepare("UPDATE venue_memberships SET role='cashier' WHERE account_id=?").run(s.user.userId);assert.equal((await s.request(NEW)).status,403);
 assert.equal((await s.r.api.route.GET(new Request('https://isolated.test/api/inventory/movements'))).status,401);
});
test('unmigrated document view returns bounded pages with source hash revision, not browser cache',async t=>{
 const s=await setup();t.after(s.r.close);const rows=Array.from({length:10},(_,i)=>s.row('legacy-'+i,OLD,true));s.put(rows);
 const first=await(await s.request(OLD,'&limit=3')).json() as {items:unknown[];revision:string;next:number};assert.equal(first.items.length,3);assert.match(first.revision,/^legacy:/);
 const second=await(await s.request(OLD,'&limit=3&cursor='+first.next+'&revision='+first.revision)).json() as {items:{id:string}[]};assert.equal(second.items[0].id,'legacy-3');
 s.put([...rows,s.row('change','unrelated')]);assert.equal((await s.request(OLD,'&cursor='+first.next+'&revision='+first.revision)).status,409);
});
