import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMonthFixture} from './helpers/empty-month-fixture';
async function fixture(){const r=await emptyMonthFixture({market:'./app/api/market/route'});r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({address:'Кишинёв, Молдова',city:'Кишинёв',country:'MD'}),r.account);const get=async()=>await(await r.api.market.GET(r.request(r.user,'/api/market'))).json() as any;const save=(focus:string,address='Кишинёв, Молдова')=>r.api.market.PATCH(r.request(r.user,'/api/market','PATCH',{action:'set-location',address,focus}));return {...r,get,save};}
test('focus persists before any analysis, repeat is stable, explicit blank clears',async()=>{const r=await fixture();try{
 let response=await r.save('  Сравнить напитки  ');assert.equal(response.status,200);assert.equal((await r.get()).restaurant.marketFocus,'Сравнить напитки');assert.equal((await r.get()).analysis,null);
 response=await r.save('Сравнить напитки');assert.equal((await response.json() as any).changed,false);
 await r.save('');assert.equal((await r.get()).restaurant.marketFocus,'');
}finally{r.close()}});
test('existing analysis focus and address update, generated result retained, clear survives reload',async()=>{const r=await fixture();try{
 const old={focus:'Старое',generatedAt:'2026-10-25',competitors:[{name:'Local'}]};r.seed('bd_market_analysis_v1',old);
 assert.equal((await r.get()).analysis.focus,'Старое');assert.equal((await r.save('Новое')).status,200);
 let got=await r.get();assert.equal(got.restaurant.marketFocus,'Новое');assert.equal(got.analysis.focus,'Новое');assert.equal(got.analysis.generatedAt,old.generatedAt);assert.deepEqual(got.analysis.competitors,old.competitors);
 await r.save('','Новый адрес');got=await r.get();assert.equal(got.restaurant.marketFocus,'');assert.equal(got.analysis.focus,'');assert.equal(got.restaurant.address,'Новый адрес');
}finally{r.close()}});
test('save failure is atomic, retry works and other venue remains isolated',async()=>{const r=await fixture();try{
 r.seed('bd_market_analysis_v1',{focus:'Старое',generatedAt:'2026-10-25'});const before=await r.get();r.beforeNextDomainWrite(()=>r.failDatabase());const failed=await r.save('Новое','Новый адрес');assert.equal(failed.ok,false);assert.deepEqual(await r.get(),before);
 assert.equal((await r.save('Новое')).status,200);const other=await r.register('market-other@local.test');const otherBefore=await(await r.api.market.GET(r.request(other,'/api/market'))).json();await r.save('Ещё');assert.deepEqual(await(await r.api.market.GET(r.request(other,'/api/market'))).json(),otherBefore);
}finally{r.close()}});
test('legacy focus is retained by address-only save; missing coordinates stay missing on repeat',async()=>{const r=await fixture();try{
 r.seed('bd_market_analysis_v1',{focus:'Старое уточнение',generatedAt:'2026-10-25'});
 const response=await r.api.market.PATCH(r.request(r.user,'/api/market','PATCH',{action:'set-location',address:'Другой адрес'}));assert.equal(response.status,200);
 const got=await r.get();assert.equal(got.restaurant.marketFocus,'Старое уточнение');assert.equal(got.restaurant.lat,undefined);assert.equal(got.restaurant.lng,undefined);
 assert.equal((await(await r.save('Старое уточнение','Другой адрес')).json() as any).changed,false);
}finally{r.close()}});
test('foreign venue selection cannot change another venues focus',async()=>{const r=await fixture();try{
 await r.save('Мой текст');const before=await r.get(),other=await r.register('market-stranger@local.test');const request=r.request(other,'/api/market','PATCH',{action:'set-location',address:'Другой',focus:'Чужое'});request.headers.set('X-Venue-Id',String(r.venueId));const result=await r.api.market.PATCH(request);assert.ok([401,403].includes(result.status));assert.deepEqual(await r.get(),before);
}finally{r.close()}});
