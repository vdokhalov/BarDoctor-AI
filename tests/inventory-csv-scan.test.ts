import test from 'node:test';import assert from 'node:assert/strict';
import {parseInventoryCsv} from '../lib/bardoctor/inventory-csv';
import {emptyMonthFixture} from './helpers/empty-month-fixture';
import {enrichmentFixture} from './helpers/cost-enrichment-fixture';
for(const csv of ['name,quantity,unit\nВода,8,шт\nЛимон — тест,0.8,кг','name;quantity;unit\nВода;8;шт\nЛимон — тест;0,8;кг','name,quantity,unit\nВода,8,шт\nЛимон — тест,"0,8",кг','Наименование\tКоличество\tЕд. изм.\nВода\t8\tшт\nЛимон — тест\t0,8\tкг'])test('CSV separators '+JSON.stringify(csv.slice(0,25)),()=>assert.equal(parseInventoryCsv(csv).items.length,2));
test('malformed CSV and missing headers are rejected, not truncated',()=>{for(const csv of ['name,quantity,unit\nЛимон,0,8,кг','name,quantity\nВода,8','name,quantity,unit\nВода,"8,шт'])assert.throws(()=>parseInventoryCsv(csv));});
test('actual CSV scan → counts preview → finalize/retry and another import have no repeated stock changes',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('External/AI request forbidden in local CSV fixture');};
 const r=await emptyMonthFixture({scan:'./app/api/inventory/scan/route',counts:'./app/api/inventory/counts/route'});try{
 const f=await enrichmentFixture(),v=r.venueId;const remap=(x:any):any=>Array.isArray(x)?x.map(remap):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,y])=>[k,k==='venueId'?v:remap(y)])):x;
 r.seed('bd_assortment_v1',remap(f.sale.assortment));
 const scan=async(csv:string,user=r.user)=>{const form=new FormData();form.set('file',new File([csv],'inventory.csv',{type:'text/csv'}));const request=r.request(user,'/api/inventory/scan');return r.api.scan.POST(new Request(request,{method:'POST',headers:{'X-Session-Email':user.email,'X-Session-Token':user.token},body:form}));};
 const scoped=remap(f.sale.assortment);scoped.stockBalances.push({...scoped.stockBalances[0],key:'foreign',productKey:'foreign',name:'Чужой товар',venueId:999});r.seed('bd_assortment_v1',scoped);
 const original=r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(r.account,'bd_assortment_v1')!.data_json;
 for(const qty of ['0.8','0,8']){const res=await scan('name;quantity;unit\nВода;8;шт\nЛимон — тест;'+qty+';кг');assert.equal(res.status,200);const b:any=await res.json();assert.equal(b.draft.unresolved.length,0);assert.deepEqual(b.draft.items.map((x:any)=>[x.productKey,x.actual]),[['water-key',8],['lemon-key',.8]]);}
 assert.equal((await scan('name,quantity,unit\nЛимон,0,8,кг')).status,422);
 const foreign:any=await(await scan('name;quantity;unit\nЧужой товар;3;кг')).json();assert.equal(foreign.draft.items.length,0);assert.equal(foreign.draft.unresolved.length,1);
 const grams:any=await (await scan('name;quantity;unit\nЛимон — тест;800;г')).json();assert.equal(grams.draft.items[0].actual,.8);
 for(const [name,qty,unit,reason] of [['Лимон — тест','bad','кг','число'],['Лимон — тест','','кг','число'],['Лимон — тест','-1','кг','число'],['Лимон — тест','.8','','Единица'],['Лимон — тест','.8','л','Единица'],['Лимон — тест','0.0001','кг','точности'],['Неизвестный товар','3','шт','сопоставить']]){const b:any=await(await scan(`name;quantity;unit\nВода;8;шт\n${name};${qty};${unit}`)).json();assert.equal(b.draft.items.length,1);assert.equal(b.draft.unresolved.length,1);assert.match(b.draft.unresolved[0].reason,new RegExp(reason));}
 const duplicate:any=await(await scan('name;quantity;unit\nВода;8;шт\nВода;1;шт')).json();assert.equal(duplicate.draft.items.length,0);assert.equal(duplicate.draft.unresolved.length,2);
 assert.equal(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(r.account,'bd_assortment_v1')!.data_json,original,'scan is read only');
 const unknown=structuredClone(scoped);unknown.stockBalances[0].unit='unknown';r.seed('bd_assortment_v1',unknown);const unknownResult:any=await(await scan('name;quantity;unit\nЛимон — тест;1;?')).json();assert.equal(unknownResult.draft.items.length,0);assert.equal(unknownResult.draft.unresolved.length,1);r.seed('bd_assortment_v1',scoped);
 const ambiguous=structuredClone(scoped);ambiguous.stockBalances.push({...ambiguous.stockBalances[0],key:'other-lemon',productKey:'other-lemon'});r.seed('bd_assortment_v1',ambiguous);const tied:any=await(await scan('name;quantity;unit\nЛимон — тест;0,8;кг')).json();assert.equal(tied.draft.items.length,0);assert.equal(tied.draft.unresolved.length,1);r.seed('bd_assortment_v1',scoped);
 const send=async(body:any)=>{const res=await r.api.counts.POST(new Request(r.request(r.user,'/api/inventory/counts'),{method:'POST',headers:{...Object.fromEntries(r.request(r.user,'/').headers),'content-type':'application/json'},body:JSON.stringify(body)}));const b:any=await res.json();assert.ok(res.ok,JSON.stringify(b));return b;};
 const draft:any=await(await scan('name;quantity;unit\nВода;8;шт\nЛимон — тест;0,7;кг')).json();
 const initialMovements=r.sqlite.prepare('SELECT COUNT(*) n FROM stock_journal_movements WHERE account_id=?').get(r.account)!.n;
 for(let repeat=0;repeat<2;repeat++){const created=await send({action:'create',scope:{type:'all'},source:'scan',date:'2026-10-26',items:draft.draft.items});assert.equal(created.stockChanged,false);assert.equal(created.inventory.items.find((x:any)=>x.productKey==='lemon-key').entryUnit,'кг');assert.equal(created.inventory.items.find((x:any)=>x.productKey==='lemon-key').actual,.7);const id=created.inventory.id;await send({action:'review',id});await send({action:'finalize',id});const retry=await send({action:'finalize',id});assert.equal(retry.stockChanged,false);}
 assert.equal(r.sqlite.prepare('SELECT COUNT(*) n FROM stock_journal_movements WHERE account_id=?').get(r.account)!.n,Number(initialMovements)+1);
 const other=await r.register('csv-other@local.test');assert.equal((await scan('name;quantity;unit\nВода;8;шт',other)).status,422);
 }finally{globalThis.fetch=originalFetch;await r.close();}
});
