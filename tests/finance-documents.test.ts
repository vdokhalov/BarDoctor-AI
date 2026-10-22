import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {financialContributors} from '../lib/bardoctor/finance-documents';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('contributors use finance dates, signed adjustments, and ownership without inventing missing documents',()=>{
 const scope={venueId:1,workspaceId:2,dataAccountId:3,month:'2026-10',through:'2026-10-22',currency:'PMR_RUB'};
 const base={venueId:1,date:'2026-10-21',category:'writeoff',amount:10,currency:'PMR_RUB'};
 const rows=financialContributors([{...base,id:'a'},{...base,id:'b',amount:4,sourceDocumentId:'doc'},{...base,date:'2026-09-30'},{...base,date:'2026-10-23'},{...base,status:'voided'},{...base,venueId:9},{...base,nested:{workspaceId:99}}],'writeoffs',scope);
 assert.deepEqual(rows.map(x=>[x.key,x.amount,x.documentId]),[['a',10,null],['b',4,'doc']]);
 const movement={venueId:1,businessDate:'2026-10-21',type:'inventory_adjustment',costStatus:'KNOWN_VALUE',currency:'PMR_RUB'};
 assert.deepEqual(financialContributors([{...movement,id:'loss',costAmount:-15},{...movement,id:'gain',costAmount:5}],'stock',scope).map(x=>x.amount),[15,-5]);
 assert.throws(()=>financialContributors([{...movement,costAmount:null}],'stock',scope),/UNKNOWN/);
});
test('real read-only handler pages all records, scopes links and rejects source revisions and wrong venues',async()=>{
 const r=await lifecycleRuntime({documents:'./app/api/finance/documents/route'});
 try{
 const owner=await r.register('finance-docs@isolated.test'),foreign=await r.register('foreign-docs@isolated.test');
 const venue=owner.activeVenueId,account=owner.userId;
 const workspace=Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)?.workspace_id);
 const profile=JSON.stringify({name:'Finance test',currency:'PMR_RUB'});
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(profile,account);
 const rows=Array.from({length:53},(_,n)=>({id:'e'+n,venueId:venue,date:'2026-10-21',category:'writeoff',amount:1,currency:'PMR_RUB',sourceDocumentId:n===0?'doc':n===1?'foreign':'missing'}));
 const raw=JSON.stringify(rows);const put=(key:string,data:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(account,key,JSON.stringify(data));
 put('bd_finance_expenses',rows);put('bd_inventory_writeoffs',[{id:'doc',venueId:venue},{id:'foreign',venueId:foreign.activeVenueId}]);
 const stock=r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(account,'bd_stock_movements')?.data_json??null;
 const context={venueId:venue,workspaceId:workspace,month:'2026-10',through:'2026-10-22',currency:'PMR_RUB',profileRevision:hash(profile),revisions:[{key:'bd_finance_expenses',revision:hash(raw)},{key:'bd_stock_movements',revision:hash(stock)}]};
 const get=(ctx:any=context,cursor?:number)=>r.api.documents.GET(r.request(owner,'/api/finance/documents?'+new URLSearchParams({kind:'writeoffs',context:JSON.stringify(ctx),...(cursor==null?{}:{cursor:String(cursor)})})));
 const first=await get();const body:any=await first.json();assert.equal(first.status,200,JSON.stringify(body));assert.equal(body.entries.length,50);assert.equal(body.next,50);assert.match(body.entries[0].href,/writeoff=doc/);assert.equal(body.entries[1].href,null);
 const last:any=await (await get(context,50)).json();assert.equal(last.entries.length,3);assert.equal(last.next,null);assert.equal(body.entries.concat(last.entries).reduce((n:number,x:any)=>n+x.amount,0),53);
 assert.equal((await get({...context,venueId:foreign.activeVenueId})).status,403);
 assert.equal((await get({...context,through:'2026-10-32'})).status,422);
 put('bd_finance_expenses',[...rows,{...rows[0],id:'new'}]);assert.equal((await get()).status,409);
 }finally{r.close();}
});
test('normalized inventory pages retain negative cursors and signed totals; changed revision fails closed',async()=>{
 const r=await lifecycleRuntime({documents:'./app/api/finance/documents/route'});
 try{
 const owner=await r.register('stock-docs@isolated.test'),venue=owner.activeVenueId,account=owner.userId;
 const workspace=Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)?.workspace_id);
 
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Stock docs',currency:'PMR_RUB'}),account);
 const insert=r.sqlite.prepare('INSERT INTO stock_journal_movements(account_id,position,movement_id,product_key,kind,effective_date,payload_json) VALUES(?,?,?,?,?,?,?)');
 for(let n=0;n<53;n++){const row={id:'m'+n,venueId:venue,productKey:'p',type:'inventory_adjustment',businessDate:'2026-10-21',costAmount:n===0?2:-1,costStatus:'KNOWN_VALUE',currency:'PMR_RUB'};insert.run(account,-100+n,row.id,'p',row.type,row.businessDate,JSON.stringify(row));}
 const source=()=>r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(account,'bd_stock_movements')?.data_json??null;
 const ctx={venueId:venue,workspaceId:workspace,month:'2026-10',through:'2026-10-22',currency:'PMR_RUB',profileRevision:hash(JSON.stringify({name:'Stock docs',currency:'PMR_RUB'})),revisions:[{key:'bd_finance_expenses',revision:hash(null)},{key:'bd_stock_movements',revision:hash(source())}]};
 const get=(cursor?:number)=>r.api.documents.GET(r.request(owner,'/api/finance/documents?'+new URLSearchParams({kind:'stock',context:JSON.stringify(ctx),...(cursor==null?{}:{cursor:String(cursor)})})));
 const first=await get(),a:any=await first.json();assert.equal(first.status,200,JSON.stringify(a));assert.equal(a.next,-51);assert.equal(a.entries.length,50);
 const b:any=await (await get(a.next)).json();assert.equal(b.next,null);assert.equal(a.entries.concat(b.entries).reduce((sum:number,x:any)=>sum+x.amount,0),50);
 const before=JSON.stringify(r.sqlite.prepare('SELECT * FROM stock_journal_movements').all());await get();assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM stock_journal_movements').all()),before);
 let reads=0;r.onRead(sql=>{if(sql.startsWith('SELECT store_key,data_json FROM domain_data')&&++reads===2)r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Changed',currency:'PMR_RUB'}),account);});
 assert.equal((await get()).status,409);
 }finally{r.close();}
});
