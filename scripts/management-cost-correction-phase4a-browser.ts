import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {costFixture} from '../tests/helpers/management-cost-fixture';
import type {CostEpisodeV1} from '../lib/bardoctor/management-cost-contracts';
import {barDoctorResponse} from '../app/bar-doctor-response';
const require=createRequire(import.meta.url);
const {resolveBrowserExecutable}=require('./browser-runtime.cjs');
const out='outputs/management-cost-correction-phase4a';mkdirSync(out,{recursive:true});const results:unknown[]=[];for(const width of process.env.BD_COST_WIDTH?[Number(process.env.BD_COST_WIDTH)]:[390,820,1280]){
const r=await costFixture();
const {seedCorrectionFixture}=await import('./qa/phase4a-correction-fixture.mjs');const fixture=seedCorrectionFixture(r,width===820?'mint-missing':'citrus-empty');const historical=r.read('bd_sales_documents');
let secondVenue=0;
if(width===1280){
 const created=await r.api.venues.POST(r.request('/api/venues','POST',{name:'Correction QA B',businessType:'bar',country:'Россия',city:'Москва',currency:'RUB',timezone:'UTC'}));assert.ok(created.ok);secondVenue=((await created.json()) as {venue:{id:number}}).venue.id;
 const secondAccount=Number(r.sqlite.prepare('SELECT data_account_id FROM venues WHERE id=?').get(secondVenue)!.data_account_id);
 const remap=(value:unknown):unknown=>Array.isArray(value)?value.map(remap):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[key,key==='venueId'?secondVenue:remap(v)])):value;
 const secondMenu=structuredClone(r.read('bd_assortment_v1'));secondMenu.menuItems.find((row:Record<string,unknown>)=>row.id===fixture.itemId).name='Только venue B';for(const key of ['bd_assortment_v1','bd_purchase_documents','bd_stock_movements'])r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(secondAccount,key,JSON.stringify(remap(key==='bd_assortment_v1'?secondMenu:[])),'2026-10-04T12:00:00Z');
}
const routes:Record<string,string>={'/api/access/active-venue':'activeVenue','/api/auth/bootstrap':'bootstrap','/api/restaurants/me':'restaurant','/api/users/me':'users','/api/venues':'venues','/api/store':'bulkStore','/api/business-health':'health','/api/assortment/overview':'overview','/api/management/cost-signals':'costs','/api/management/cost-signals/evaluate':'evaluate','/api/evidence/resolve':'evidence','/api/nomenclature/taxonomy':'taxonomy','/api/nomenclature/quick-create':'quickCreate','/api/inventory/products':'products','/api/purchases/confirm':'confirm','/api/inventory/opening':'opening','/api/procurement/overview':'procurement','/api/purchases/mappings':'mappings','/api/purchases/update':'updatePurchase'};
const events:{path:string;method:string|undefined;status:number}[]=[];let holdPurchaseResponse=false,releasePurchaseResponse:(()=>void)|null=null;
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/',`http://${req.headers.host}`),parts:Buffer[]=[];for await(const c of req)parts.push(Buffer.from(c));const body=Buffer.concat(parts);
  const key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1],signal=decodeURIComponent(url.pathname).match(/^\/api\/management\/cost-signals\/(cost-v1:[^/]+)(\/verify)?$/);
  const name=key?'store':signal?(signal[2]?'verify':'detail'):routes[url.pathname];
  let response:Response;
  if(name)response=await r.api[name][req.method||'GET'](new Request(url,{method:req.method,headers:req.headers as HeadersInit,...body.length?{body}:{}}),{params:Promise.resolve({key,id:signal?.[1]})} as never);
  else if(!url.pathname.startsWith('/api/')&&!extname(url.pathname))response=barDoctorResponse();
  else{const file=resolve('public','.'+url.pathname);response=file.startsWith(resolve('public')+'/')&&existsSync(file)?new Response(readFileSync(file),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'} as Record<string,string>)[extname(file)]||'application/octet-stream'}}):new Response(null,{status:404});}
  if(url.pathname.startsWith('/api/nomenclature/')||name==='products'||name==='verify'||name==='confirm'||name==='updatePurchase'||key==='bd_assortment_v1'&&req.method==='PUT')events.push({path:url.pathname,method:req.method,status:response.status});
  if(name==='confirm'&&holdPurchaseResponse)await new Promise<void>(done=>{releasePurchaseResponse=done});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('isolated QA probe failure');}
});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const browser=await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:['--no-sandbox','--disable-setuid-sandbox']});
const context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1024:900},isMobile:width===390,hasTouch:width!==1280,locale:'ru-RU'});
await context.addInitScript(({owner,venueId}:{owner:{email:string;token:string};venueId:number})=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);if(!localStorage.getItem('bd_active_venue_id'))localStorage.setItem('bd_active_venue_id',String(venueId));},{owner:r.owner,venueId:r.venueId});
const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const capture=async(label:string)=>{const dimensions=await page.evaluate(()=>({innerWidth,innerHeight,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));assert.equal(dimensions.innerWidth,width);assert.ok(dimensions.scrollWidth<=dimensions.clientWidth+1,JSON.stringify({label,...dimensions}));await page.screenshot({path:out+'/'+width+'-'+label+'.png',fullPage:true});writeFileSync(out+'/'+width+'-'+label+'.json',JSON.stringify(dimensions));};
try{
 await page.clock.setFixedTime(new Date('2026-10-04T12:00:00Z'));await page.goto(base+'/health');const home=page.locator('[data-cost-surface]');await home.locator('.bd-cost-signal').first().waitFor({timeout:30000});
 const id=await home.locator('[data-signal-id]').first().getAttribute('data-signal-id');assert.ok(id);const readEpisode=async()=>((await(await r.detail(id)).json()) as {episode:CostEpisodeV1}).episode;
 await home.locator('.bd-cost-signal').first().click();await page.getByRole('button',{name:'Открыть техкарту',exact:true}).click();
 const dialog=page.locator('[role="dialog"]').last();await dialog.waitFor();
 await dialog.getByRole('button',{name:/Добавить ингредиент/}).click();
 await dialog.getByPlaceholder('Ингредиент или готовый товар').fill(fixture.ingredientName);
 await dialog.locator('select').first().selectOption({label:'шт.'});
 await dialog.locator('button').filter({hasText:/Изменить товар|Найти в номенклатуре/}).first().click();
 await dialog.getByLabel('Поиск по всей номенклатуре').fill(fixture.ingredientName);
 await capture('search-create-entry');
 await dialog.getByRole('button',{name:/Создать новую позицию/}).click();
 const quick=page.getByRole('dialog',{name:'Быстрое создание номенклатуры'});await quick.waitFor();
 await quick.getByRole('button',{name:'Создать и добавить',exact:true}).waitFor();
 await page.waitForFunction(()=>{const q=document.querySelector('.bd-quick-create-sheet-v336');return !!q&&!(q.querySelector('footer button.primary') as HTMLButtonElement)?.disabled;});
 await capture('in-place-create');
 await quick.getByRole('button',{name:'Создать и добавить',exact:true}).click();await quick.waitFor({state:'hidden'});
 assert.equal(r.read('bd_assortment_v1').nomenclature.length,2);
 const product=r.read('bd_assortment_v1').nomenclature.find((row:Record<string,unknown>)=>row.name===fixture.ingredientName);assert.equal(product.name,fixture.ingredientName);assert.equal(product.costStatus,'UNKNOWN');
 await dialog.locator('input[type="number"]').first().fill('1');
 await capture('linked-without-price');
 const save=dialog.getByRole('button',{name:'Сохранить',exact:true}).filter({visible:true});await save.click();await dialog.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Вернуться к сигналу',exact:true}).click();
 await page.getByText('Не подтверждена стоимость всех ингредиентов.',{exact:true}).first().waitFor();
 await capture('price-unknown-action');
 const stored=await readEpisode();
 assert.equal(stored.condition,'ACTIVE');assert.equal(stored.latest.value,null);assert.equal(stored.verificationResult,null);assert.deepEqual(stored.latest.reasonCodes,['PRICE_UNKNOWN']);
 assert.ok(events.some(e=>e.path==='/api/nomenclature/quick-create'&&e.status===200));assert.ok(events.some(e=>e.path==='/api/inventory/products'&&e.method==='POST'&&e.status===200));
 assert.ok(stored.latest.blockingIngredients?.[0]);assert.equal(stored.latest.blockingIngredients[0].name,fixture.ingredientName);
 await page.getByRole('button',{name:'Добавить закупку',exact:true}).click();await page.waitForURL(url=>url.pathname==='/suppliers');
 assert.equal(new URL(page.url()).searchParams.get('signalId'),id);assert.equal(new URL(page.url()).searchParams.get('productKey'),product.key);
 if(width===1280){
  const correctionUrl=page.url(),wrong=new URL(correctionUrl);wrong.searchParams.set('productKey','product:unrelated');await page.goto(wrong.href);await page.getByText('Причина изменилась или стоимость уже доступна. Вернитесь к сигналу и проверьте результат.',{exact:true}).waitFor();assert.equal(await page.getByRole('dialog',{name:'Проверка прихода'}).count(),0);await page.getByRole('button',{name:'Вернуться к сигналу',exact:true}).click();await page.waitForURL(url=>url.pathname==='/health'&&url.searchParams.get('signalId')===id);
  await page.goto(base+'/suppliers?create=1');await page.getByRole('button',{name:/Вручную/}).click();const ordinary=page.getByRole('dialog',{name:'Проверка прихода'});await ordinary.waitFor();assert.equal(await ordinary.getByPlaceholder('Название товара').inputValue(),'');assert.equal(await page.locator('[data-cost-purchase-context]').count(),0);await page.goto(correctionUrl);
 }
 await page.getByRole('button',{name:/Вручную/}).click();const purchase=page.getByRole('dialog',{name:'Проверка прихода'});await purchase.waitFor();
 assert.equal(await purchase.getByPlaceholder('Название товара').inputValue(),fixture.ingredientName);
 const price=purchase.locator('label').filter({hasText:'Цена за единицу'}).locator('input');assert.equal(await price.inputValue(),'');
 await capture('purchase-prefill');
 // Cancel and browser Back keep the episode; a reload restores the validated purchase context.
 await purchase.getByRole('button',{name:'Не сохранять',exact:true}).click();await page.waitForURL(url=>url.pathname==='/health');
 await page.getByRole('button',{name:'Добавить закупку',exact:true}).click();await page.waitForURL(url=>url.pathname==='/suppliers');
 await page.goBack();await page.waitForURL(url=>url.pathname==='/health');await page.getByRole('button',{name:'Добавить закупку',exact:true}).click();await page.waitForURL(url=>url.pathname==='/suppliers');
 await page.reload();await page.getByRole('button',{name:/Вручную/}).click();await purchase.waitFor();
 await purchase.getByPlaceholder('Найти существующего поставщика').fill(fixture.supplierName);await purchase.locator('.bd-purchase-supplier-v356 button').filter({hasText:fixture.supplierName}).first().click();
 await purchase.locator('label').filter({hasText:'Цена за единицу'}).locator('input').fill(String(fixture.purchaseUnitPrice));
 const quantity=purchase.getByLabel('Количество',{exact:true});await quantity.fill(String(fixture.purchaseQuantity));
 if(width===390){await page.setViewportSize({width,height:430});await price.focus();await price.scrollIntoViewIfNeeded();await capture('purchase-keyboard-reduced');await purchase.getByRole('button',{name:'Провести приход',exact:true}).scrollIntoViewIfNeeded();const box=await purchase.getByRole('button',{name:'Провести приход',exact:true}).boundingBox();assert.ok(box&&box.height>=40&&box.width>=40);await page.setViewportSize({width,height:844});}
 await capture('purchase-ready');
 const post=purchase.getByRole('button',{name:'Провести приход',exact:true});assert.equal(await post.isEnabled(),true);
 if(width===390){
  await page.route('**/api/purchases/confirm',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'QA: подтверждение закупки отклонено'})}));
  await post.click();await page.getByText('QA: подтверждение закупки отклонено',{exact:true}).waitFor();assert.equal((await readEpisode()).condition,'ACTIVE');assert.equal((await readEpisode()).verificationResult,null);assert.equal(await purchase.isVisible(),true);await page.unroute('**/api/purchases/confirm');
 }
 if(width===820)await page.route('**/api/management/cost-signals/**',route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'QA: серверная проверка временно недоступна'})}):route.continue());
 if(width===1280)holdPurchaseResponse=true;
 await post.click();
 if(width===1280){
  for(let attempt=0;attempt<100&&!releasePurchaseResponse;attempt++)await new Promise(done=>setTimeout(done,20));assert.ok(releasePurchaseResponse);
  await page.goBack();await page.waitForURL(url=>url.pathname==='/health');await page.locator('[data-bd-venue-trigger]').click();await page.locator('.bd-venue-row').filter({hasText:'Correction QA B'}).click();await page.waitForFunction(id=>Number(localStorage.getItem('bd_active_venue_id'))===id,secondVenue);
  holdPurchaseResponse=false;(releasePurchaseResponse as (()=>void)|null)?.();await page.waitForLoadState('networkidle');await page.goto(base+'/health');await page.locator('[data-cost-surface][data-cost-venue="'+secondVenue+'"] .bd-cost-signal').first().waitFor();assert.equal(await page.locator('.bd-cost-result').count(),0);assert.equal(await page.getByText(fixture.ingredientName,{exact:true}).count(),0);await capture('purchase-response-venue-race');
  await page.locator('[data-bd-venue-trigger]').click();await page.locator('.bd-venue-row').filter({hasText:'Isolated QA — работающее заведение'}).click();await page.waitForFunction(id=>Number(localStorage.getItem('bd_active_venue_id'))===id,r.venueId);await page.waitForURL(url=>url.pathname==='/home');await page.waitForLoadState('networkidle');await page.goto(base+'/health?venueId='+r.venueId+'&signalId='+encodeURIComponent(id)+'&section=management');
 }
 if(width===820){
  await page.waitForURL(url=>url.pathname==='/health');await page.getByRole('alert').filter({hasText:'QA: серверная проверка временно недоступна'}).waitFor();assert.equal((await readEpisode()).condition,'ACTIVE');assert.equal((await readEpisode()).verificationResult,null);assert.equal(await page.locator('.bd-cost-result').count(),0);
  await capture('verification-unavailable');await page.unroute('**/api/management/cost-signals/**');await page.locator('[data-cost-surface=health]').getByRole('button',{name:'Обновить',exact:true}).click();
 }
 await page.waitForURL(url=>url.pathname==='/health');await page.getByRole('heading',{name:'Проверено: себестоимость рассчитана',exact:true}).first().waitFor({timeout:30000});
 const verified=await readEpisode();assert.ok(verified.verificationResult);assert.equal(verified.verificationResult.after.value,fixture.expectedCost);assert.equal(verified.verificationResult.before.value,null);
 await page.reload();await page.getByRole('heading',{name:'Проверено: себестоимость рассчитана',exact:true}).first().waitFor();
 assert.deepEqual(((await(await r.verify(id!)).json()) as {episode:CostEpisodeV1}).episode.verificationResult,verified.verificationResult);
 await page.getByRole('button',{name:'История проверки',exact:true}).click();await page.locator('[data-history-signal]').waitFor();
 await capture('verified-reload-history');
 assert.deepEqual(r.read('bd_sales_documents'),historical);
 const dimensions=await page.evaluate(()=>({innerWidth,innerHeight,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));assert.equal(dimensions.innerWidth,width);assert.ok(dimensions.scrollWidth<=dimensions.clientWidth+1);
 assert.deepEqual(errors,[]);results.push({result:'PASS',saveFailure:width===390,failedVerificationRetry:width===820,purchaseResponseVenueRace:width===1280,viewport:dimensions,scenario:fixture.scenario,inPlaceCreation:true,priceUnknown:true,purchaseActualUi:true,authoritativeReread:true,after:fixture.expectedCost,reload:true,retry:true,history:true,context:true,events});
 console.log(JSON.stringify({width,result:'PASS',after:fixture.expectedCost}));
}catch(error){await page.screenshot({path:out+'/'+width+'-failure.png',fullPage:true});writeFileSync(out+'/'+width+'-failure.html',await page.content());writeFileSync(out+'/'+width+'-failure-sources.json',JSON.stringify({events,purchases:r.read('bd_purchase_documents'),movements:r.read('bd_stock_movements')},null,2));throw error;}finally{holdPurchaseResponse=false;(releasePurchaseResponse as (()=>void)|null)?.();await browser.close();await new Promise<void>(done=>server.close(()=>done()));r.close();}

}writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
