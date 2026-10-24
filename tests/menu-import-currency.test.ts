import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeMenuImport,mergeMenuImportParts} from '../lib/bardoctor/catalog';
import {menuDraft,validateMenuDraft} from '../lib/bardoctor/menu-ingestion';
import {defaultNomenclatureStructure} from '../lib/bardoctor/nomenclature';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const now='2026-10-24T12:00:00Z',root={menuItems:[],recipes:[],nomenclature:[],nomenclatureStructure:defaultNomenclatureStructure()};
const item=(currency?:string)=>({name:'Тест импорта',salePrice:15,...(currency===undefined?{}:{currency}),sectionId:'bar',taxonomyCategoryId:'alcohol',consumptionMode:'NONE',type:'service'});
for(const currency of ['PMR_RUB','MDL','EUR'])test(`preview retains source ${currency}, blocks mismatch without conversion`,()=>{
 const draft=menuDraft({id:'currency-test',source:'IMPORT',venueId:1,items:[item(currency)],assortment:root,now});draft.rows[0].reviewed=true;draft.rows[0].decision='apply';
 const ok=validateMenuDraft(draft,root,currency,now);assert.equal(ok.ok,true);assert.equal((ok.after.menuItems as Record<string,unknown>[])[0].currency,currency);assert.equal((ok.after.menuItems as Record<string,unknown>[])[0].salePrice,15);
 const wrong=validateMenuDraft(draft,root,currency==='EUR'?'MDL':'EUR',now);assert.equal(wrong.ok,false);assert.equal(wrong.diff[0].after.currency,currency);assert.equal(wrong.diff[0].changes.find(x=>x.field==='currency')?.after,currency);assert.equal((wrong.after.menuItems as unknown[]).length,0);assert.equal(draft.rows[0].sourceCurrency,currency);
});
test('parse/merge/reparse preserve per-row currency and absence instead of default RUB',()=>{
 const missing=normalizeMenuImport({menuItems:[item()]});assert.equal(missing.currency,'');assert.equal(missing.menuItems[0].currency,'');
 const stated=normalizeMenuImport({currency:'MDL',menuItems:[item()]});assert.equal(stated.menuItems[0].currency,'MDL');
 const mixed=mergeMenuImportParts([{currency:'MDL',menuItems:[{...item(),name:'MDL'}]},{menuItems:[{...item(),name:'Unknown'}]}]);const again=normalizeMenuImport(mixed);assert.equal(again.menuItems.find(x=>x.name==='Unknown')?.currency,'');
 const existing={...root,menuItems:[{...item('MDL'),id:'old',venueId:1}]};const same=menuDraft({id:'unknown-existing',source:'IMPORT',venueId:1,items:[item()],assortment:existing,now});assert.equal(same.rows[0].item.currency,'');assert.equal(validateMenuDraft(same,existing,'MDL',now).ok,false);
 const draft=menuDraft({id:'unknown',source:'IMPORT',venueId:1,items:missing.menuItems,assortment:root,now});assert.equal(draft.rows[0].sourceCurrency,null);const result=validateMenuDraft(draft,root,'PMR_RUB',now);assert.equal(result.ok,false);assert.ok(result.diff[0].issues.includes('Укажите валюту цены.'));assert.equal(result.diff[0].after.currency,'');
});
for(const targetCurrency of ['PMR_RUB','MDL','EUR'])test(`native ${targetCurrency}: update/reload/confirm, repeat and venue boundaries`,async()=>{
 const sourceCurrency=targetCurrency==='MDL'?'EUR':'MDL';
 const r=await lifecycleRuntime({ingestion:'./app/api/menu/ingestion/route'});try{
 const user=await r.register('currency@local.test'),venueId=user.activeVenueId,account=Number(r.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(venueId)!.id);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:targetCurrency}),account);
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(account,'bd_assortment_v1',JSON.stringify(root));
 const read=()=>JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(account)!.data_json));
 const send=async(body:object)=>{const response=await r.api.ingestion.POST(r.request(user,'/api/menu/ingestion','POST',{venueId,...body}));return {status:response.status,...await response.json() as any}};
 let result=await send({action:'create',draftId:'draft:currency',source:'IMPORT',items:[item(sourceCurrency)]});assert.equal(result.preview.currency,targetCurrency);assert.equal(result.preview.diff[0].after.currency,sourceCurrency);let draft=result.draft;
 result=await send({action:'update',draftId:draft.id,revision:draft.revision,rows:draft.rows.map((row:any)=>({...row,reviewed:true,decision:'apply'}))});draft=result.draft;
 assert.equal((await send({action:'validate',draftId:draft.id,revision:draft.revision})).status,422);assert.equal((await send({action:'confirm',draftId:draft.id,revision:draft.revision})).status,422);assert.deepEqual(read(),root);
 result=await send({action:'update',draftId:draft.id,revision:draft.revision,rows:draft.rows.map((row:any)=>({...row,item:{...row.item,currency:targetCurrency,salePrice:17},reviewed:true,decision:'apply',sourceCurrency:'FAKE'}))});draft=result.draft;assert.equal(draft.rows[0].sourceCurrency,sourceCurrency);
 result=await send({action:'get',draftId:draft.id});assert.equal(result.draft.rows[0].item.currency,targetCurrency);assert.equal(result.draft.rows[0].sourceCurrency,sourceCurrency);assert.equal(result.preview.diff[0].after.salePrice,17);
 draft=(await send({action:'validate',draftId:draft.id,revision:draft.revision})).draft;
 const command={action:'confirm',draftId:draft.id,revision:draft.revision,validationHash:draft.validationHash};assert.equal((await send(command)).status,201);assert.equal((await send(command)).idempotent,true);assert.equal(read().menuItems.length,1);assert.equal(read().menuItems[0].currency,targetCurrency);assert.equal(read().menuItems[0].salePrice,17);
 assert.equal((await send({action:'get',draftId:draft.id,venueId:venueId+999})).status,403);
 }finally{await r.close()}
});
