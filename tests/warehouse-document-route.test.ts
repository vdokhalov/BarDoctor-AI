import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {barDoctorResponse} from '../app/bar-doctor-response';
const {resolveBrowserExecutable,chromiumArgs}=createRequire(import.meta.url)('../scripts/browser-runtime.cjs');
const documentId='sales-event:6df041eec8a679228224ea57f4fb83e97a445b6472663e6249f5f42d0c48e01f';
test('actual warehouse client renders ordinary and document routes with its shipped React runtime', {timeout:60000},async()=>{
 const runtime=await lifecycleRuntime({usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route',overview:'./app/api/assortment/overview/route'});
 const user=await runtime.register('warehouse-route@isolated.test'),venue=user.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Warehouse fixture',currency:'MDL',timezone:'UTC'}),user.userId);
 const browser=await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(8000);const errors:string[]=[],calls:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({email,token,venue})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venue));},{email:user.email,token:user.token,venue});
 let mode='loading';let release:(()=>void)|undefined;
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());assert.equal(u.origin,'http://isolated.test');
  if(u.pathname==='/api/inventory/movements'){
   calls.push(u.search);assert.equal(route.request().method(),'GET');assert.equal(route.request().headers()['x-venue-id'],String(venue));assert.equal(u.searchParams.get('limit'),'100');
   const id=u.searchParams.get('sourceDocumentId');assert.ok([documentId,'old','empty'].includes(id!));
   if(mode==='loading')await new Promise<void>(resolve=>{release=resolve});
   if(mode==='error')return route.fulfill({status:503,json:{ok:false}});
   const count=id===documentId?12:id==='old'?10:0;
   return route.fulfill({json:{ok:true,venueId:venue,sourceDocumentId:id,revision:7,next:null,items:Array.from({length:count},(_,n)=>({id:id+'-'+n,venueId:venue,sourceDocumentId:id,type:'sale_consumption',productName:'Fixture '+n,date:'2026-10-09',amount:-1,unit:'kg'}))}});
  }
  if(u.pathname.startsWith('/api/')){
   const routes:Record<string,string>={'/api/auth/bootstrap':'bootstrap','/api/users/me':'usersMe','/api/restaurants/me':'restaurantMe','/api/venues':'venues','/api/store':'store','/api/assortment/overview':'overview'};
   const key=u.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1],name=key?'storeKey':routes[u.pathname];
   if(route.request().method()!=='GET'&&name!=='bootstrap')return route.fulfill({status:405,json:{ok:false}});
   const response=name?await runtime.api[name][route.request().method()](new Request(u,{method:route.request().method(),headers:route.request().headers(),...(route.request().postData()?{body:route.request().postData()!}:{})}),{params:Promise.resolve({key})} as never):Response.json({ok:false},{status:404});
   return route.fulfill({status:response.status,body:await response.text(),contentType:'application/json'});
  }
  if(u.pathname==='/warehouse')return route.fulfill({body:await barDoctorResponse().text(),contentType:'text/html'});
  const file=/\/assets\/index-BQGspy0I.*\.js$/.test(u.pathname)?resolve('public/assets/index-BQGspy0I.js'):resolve('public','.'+u.pathname);
  assert.ok(file.startsWith(resolve('public')+'/'));
  return route.fulfill({status:existsSync(file)?200:404,body:existsSync(file)?readFileSync(file):'',contentType:extname(file)==='.js'?'text/javascript':extname(file)==='.css'?'text/css':'application/octet-stream'});
 });
 await page.goto('http://isolated.test/warehouse?venue='+venue);await page.locator('.bd-warehouse-main').waitFor().catch(async e=>{console.log('BODY',page.url(),await page.locator('body').innerText());throw e});await page.getByRole('heading',{name:'Товары на складе',exact:true}).waitFor();assert.equal(calls.length,0);
 await page.goto('http://isolated.test/warehouse?tab=movements&sourceDocumentId='+encodeURIComponent(documentId)+'&venue='+venue);
 await page.getByText('Загружаем движения документа…',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 mode='ready';release!();await page.getByText('Загружено движений: 12',{exact:true}).waitFor();assert.equal(await page.locator('.bd-warehouse-movement-list article').count(),12);
 mode='error';await page.getByRole('button',{name:'Обновить движения',exact:true}).click();await page.getByRole('alert').filter({hasText:'Пустой склад не подтверждён'}).waitFor();assert.equal(await page.locator('.bd-warehouse-movement-list article').count(),0);
 mode='ready';await page.getByRole('button',{name:'Повторить загрузку'}).click();await page.getByText('Загружено движений: 12',{exact:true}).waitFor();
 for(const [id,count] of [['old',10],['empty',0]] as const){await page.goto('http://isolated.test/warehouse?tab=movements&sourceDocumentId='+id+'&venue='+venue);await page.getByText(count?'Загружено движений: '+count:'Для этого документа движений не найдено.',{exact:true}).waitFor();assert.equal(await page.locator('.bd-warehouse-movement-list article').count(),count);}
 assert.deepEqual(errors,[]);assert.ok(calls.length<=6);
 }finally{await browser.close();runtime.close();}
});
