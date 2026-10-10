import { posPane, posPay, posNewQuick, posReceiptList } from "../tests/helpers/pos-browser-driver";
import { waitForSalesHostReads } from '../tests/helpers/sales-navigation-settled';
import { salesSurfacePage } from '../tests/helpers/sales-surface-page';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync,existsSync,mkdirSync,writeFileSync } from 'node:fs';
import { resolve,extname } from 'node:path';
import { createRequire } from 'node:module';
import { chromium, webkit } from 'playwright-core';
import { lifecycleRuntime } from '../tests/helpers/lifecycle-runtime';
import { salesEventFixture } from '../tests/helpers/sales-event-fixture';
import { GET as cashier } from '../app/cashier/route';
import { GET as manual } from '../app/sales-entry/route';
import { GET as journal } from '../app/sales-import/route';
import { barDoctorResponse } from '../app/bar-doctor-response';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const label=process.env.BD_PERF_LABEL||'baseline';const out='outputs/sales-navigation-performance/'+label;mkdirSync(out,{recursive:true});
const runtime=await lifecycleRuntime({orders:"./app/api/pos-orders/route",health:'./app/api/business-health/route',products:'./app/api/inventory/products/route',events:'./app/api/sales-events/route',batches:'./app/api/sales-batches/route',usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route',overview:'./app/api/assortment/overview/route'});
const requests:{path:string;status:number;method:string}[]=[];let failure=false;let latency=0,apiDelay=0;
let demo: {email:string;token:string;activeVenueId:number}|null=null;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://localhost');const wait=url.pathname.startsWith('/api/')?Math.max(latency,apiDelay):latency;if(wait)await new Promise(r=>setTimeout(r,wait));let response:Response;
 if(url.pathname==='/__qa/start' && demo){ const target=url.searchParams.get('to')||'/sales-import?embedded=1'; response=new Response('<!doctype html><script>localStorage.setItem("bd_session",'+JSON.stringify(demo.email)+');localStorage.setItem("bd_session_token",'+JSON.stringify(demo.token)+');localStorage.setItem("bd_active_venue_id",'+JSON.stringify(String(demo.activeVenueId))+');location.replace('+JSON.stringify(target)+');</script>',{headers:{'Content-Type':'text/html'}}); }
 else if(url.pathname.startsWith('/api/')){
  const routes:Record<string,string>={"/api/pos-orders":"orders",'/api/business-health':'health','/api/inventory/products':'products','/api/sales-events':'events','/api/sales-batches':'batches','/api/auth/bootstrap':'bootstrap','/api/auth/login':'login','/api/users/me':'usersMe','/api/restaurants/me':'restaurantMe','/api/venues':'venues','/api/store':'store','/api/assortment/overview':'overview'};
  const key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1],name=key?'storeKey':routes[url.pathname];
  const handlerStart=performance.now();const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));const body=Buffer.concat(chunks);
  response=failure&&name==='events'?Response.json({ok:false,error:'QA server unavailable'},{status:503}):name?await runtime.api[name][req.method||'GET'](new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})}),{params:Promise.resolve({key})} as never):Response.json({ok:false},{status:404});
  response.headers.set('Server-Timing','qa-handler;dur='+(performance.now()-handlerStart).toFixed(2));requests.push({path:url.pathname,status:response.status,method:req.method||'GET'});
 }else if(url.pathname==='/cashier')response=cashier();
 else if(url.pathname==='/sales-entry')response=manual();
 else if(url.pathname==='/sales-import')response=journal(new Request(url));
 else if(['/login','/home','/warehouse','/finance','/profile/venue'].includes(url.pathname))response=barDoctorResponse();
 else{const file=resolve('public','.'+url.pathname);response=file.startsWith(resolve('public')+'/')||file.startsWith(resolve('public')+'\\')?existsSync(file)?new Response(readFileSync(file),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'} as Record<string,string>)[extname(file)]||'application/octet-stream'}}):new Response(null,{status:404}):new Response(null,{status:404});}
 if(!url.pathname.startsWith('/api/')&&/\.(js|css|svg|png)$/.test(url.pathname))response.headers.set('Cache-Control','public, max-age=3600');res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Fixture failure');}});
await new Promise<void>(done=>server.listen(Number(process.env.BD_SALES_UX_PORT||0),'127.0.0.1',done));const base='http://127.0.0.1:'+((server.address() as {port:number}).port);

const user=await runtime.register('sales-ux2@isolated.test'),venue=user.activeVenueId;demo=user;
runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Atelier · Wine & Kitchen',currency:'MDL',timezone:'Europe/Chisinau'}),user.userId);
const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value),new Date().toISOString());
const assortment=JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venue));
const names=['Бокал Pinot Noir','Лимонад с маракуйей','Эспрессо','Капучино на овсяном молоке','Тартар из говядины','Брускетта с томатами','Салат с печёной свёклой','Сырная тарелка','Паста с белыми грибами','Стейк с овощами гриль','Шоколадный фондан','Чизкейк с ягодами'];
assortment.menuItems.push(...names.map((name,i)=>({...assortment.menuItems[0],id:'menu-'+i,name,salePrice:45+i*15,sectionId:i<4?'bar':'kitchen',taxonomyCategoryId:i<4?'drinks':'food',subcategoryId:i<4?'wine':'dishes'})));
assortment.nomenclatureStructure={sections:[{id:'bar',name:'Бар'},{id:'kitchen',name:'Кухня'}],categories:[{id:'drinks',name:'Напитки',parentId:'bar'},{id:'food',name:'Основное меню',parentId:'kitchen'}],subcategories:[{id:'wine',name:'Вино и кофе',parentId:'drinks'},{id:'dishes',name:'Блюда',parentId:'food'}]};
assortment.stockBalances.forEach((b:{current:number})=>b.current=1000);
put('bd_assortment_v1',assortment);
const send=(body:object)=>runtime.api.events.POST(runtime.request(user,'/api/sales-events','POST',{venueId:venue,...body}));
assert.equal((await send({action:'open_shift',shiftId:'ux2-open',name:'Вечер · основной зал'})).status,201);
for(const [i,source] of ['POS_API','MANUAL_GRID','POS_API'].entries()){
 const command={id:'seed-'+i,source,shiftId:'ux2-open',lines:[{id:'line',menuItemId:'menu-'+i,quantity:i+1}],...(source==='POS_API'?{payments:[{id:'p',method:i?'CARD_EXTERNAL':'CASH',amount:(45+i*15)*(i+1)}]}:{})};
 const preview=await send({action:'preview',command});const q=await preview.json() as {previewHash:string};assert.equal(preview.status,200,JSON.stringify(q));const posted=await send({action:'post',command,previewHash:q.previewHash});assert.equal(posted.status,201);
}
const imported=await runtime.api.batches.POST(runtime.request(user,'/api/sales-batches','POST',{venueId:venue,action:'import_text',text:'Неизвестный коктейль 3\nБокал Pinot Noir 2',businessDate:'2026-09-27'}));assert.equal(imported.status,201);

type Trace={kind:string;at:number;[key:string]:unknown};
const browserType=process.env.BD_PERF_BROWSER==='webkit'?webkit:chromium;
const browser=await browserType.launch(browserType===chromium?{executablePath:process.env.BD_QA_BROWSER||await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:chromiumArgs}:{headless:true,...(process.env.BD_WEBKIT_EXECUTABLE?{executablePath:process.env.BD_WEBKIT_EXECUTABLE}:{})});
const results:unknown[]=[];let diagnosticPage:import('playwright-core').Page|undefined;
try{
for(const delay of (process.env.BD_PERF_DELAYS||'0,300').split(',').map(Number)){
 latency=delay===1200?0:delay;apiDelay=delay===1200?1200:0;
 const width=Number(process.env.BD_PERF_WIDTH||390),height=width===390?844:width===820?1000:800;
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width===390,timezoneId:'America/Los_Angeles'});
 let trace:Trace[]=[];
 await context.exposeBinding('__bdPerfObserve',(_source,event:Trace)=>{trace.push(event)});
 await context.addInitScript({path:resolve('scripts/qa/sales-navigation-probe.js')});
 await context.addInitScript(({email,token,venue})=>{if(sessionStorage.qa_init)return;sessionStorage.qa_init='1';localStorage.bd_session=email;localStorage.bd_session_token=token;localStorage.bd_active_venue_id=String(venue);},{email:user.email,token:user.token,venue});
 const hostPage=await context.newPage();diagnosticPage=hostPage;const page=salesSurfacePage(hostPage);page.setDefaultTimeout(30000);
 page.on('request',request=>trace.push({kind:'request',at:Date.now(),path:new URL(request.url()).pathname,method:request.method(),type:request.resourceType(),top:request.frame()===page.mainFrame()}));
 page.on('response',response=>trace.push({kind:'response',at:Date.now(),path:new URL(response.url()).pathname,status:response.status(),type:response.request().resourceType(),top:response.frame()===page.mainFrame()}));
 const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);writeFileSync(out+'/'+browserType.name()+'-'+width+'-'+delay+'-error-context.json',JSON.stringify({errors,url:page.url(),stack:e.stack,trace:trace.slice(-30)},null,2));});
 const frame=()=>page.frameLocator('iframe[title="Продажи и склад"]');
 const journalReady=async()=>{await frame().locator('#journal-venue').filter({hasText:'Atelier'}).waitFor();await frame().locator('#journal-count').filter({hasText:'документов'}).waitFor();};
 const cashReady=async()=>{await page.locator('#work:not([hidden]) #cashier-view:not([hidden])').waitFor();await page.locator('[data-add="menu-0"]').waitFor({state:'attached'});};
 async function measure(name:string,action:()=>Promise<unknown>,ready:()=>Promise<unknown>){
  trace=[];const start=Date.now();await action();await ready();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));trace.push({kind:'T8:interactive',at:Date.now()});
  const tap=trace.find(e=>e.kind==='T0:pointer'&&e.at>=start)?.at||start;trace=trace.filter(e=>e.at>=tap);const offset=(event:Trace|undefined)=>event?Math.round(event.at-tap):null;
  const api=trace.filter(e=>e.kind==='T5:fetch'&&String(e.path).startsWith('/api/'));
  const stage=name[0];const critical=(event:Trace)=>stage==='O'||['/api/sales-events','/api/sales-batches','/api/pos-orders'].includes(String(event.path));const readyTrace=trace.find(e=>e.kind==='ui:state'&&({A:e.venue==='Atelier · Wine & Kitchen'&&String(e.journal).includes('документов'),B:e.cashier,C:e.venue==='Atelier · Wine & Kitchen'&&String(e.journal).includes('документов'),D:e.cashier,E:e.shift,F:e.venue==='Atelier · Wine & Kitchen'&&String(e.journal).includes('документов'),G:e.manual,H:e.venue==='Atelier · Wine & Kitchen'&&String(e.journal).includes('документов'),I:e.view==='import',J:e.view==='journal',K:e.cashier&&e.pane==='order',L:e.cashier&&e.pane==='menu',M:e.document,N:!e.document&&String(e.journal).includes('документов'),O:e.warehouse,P:e.document,Q:e.cashier&&Number(e.lines)>0,R:e.cashier&&!e.receipt&&(width!==390||e.pane==='menu'),S:e.document} as Record<string,unknown>)[stage]);const navigation=trace.filter(e=>e.kind==='T4:dom'&&e.navigation).map(e=>e.navigation as {start:number;response:number;committed:number});const feedback=trace.find(e=>e.kind==='ui:feedback'||e.kind==='ui:state'&&(e.pending||String(e.notice).includes('Выполняем')||e===readyTrace));const data={name,delay,width,browser:browserType.name(),duration:Date.now()-tap,T0:trace.some(e=>e.kind==='T0:pointer')?0:null,feedbackMs:offset(feedback),T1:offset(trace.find(e=>e.kind==='T1:click')),T2:(()=>{const marks=[offset(trace.find(e=>e.kind.startsWith('T2:'))),navigation[0]?Math.round(navigation[0].start-tap):null].filter((v):v is number=>v!==null&&v>=0);return marks.length?Math.min(...marks):null})(),T3:navigation[0]?Math.round(navigation[0].response-tap):null,T4:navigation[0]?Math.round(navigation[0].committed-tap):offset(readyTrace),T5:offset(api.find(critical)),T6:offset(trace.filter(e=>e.kind==='T6:fetch'&&critical(e)).at(-1)),T7:offset(readyTrace),T8:stage==='O'?offset(trace.at(-1)):offset(readyTrace)||offset(trace.at(-1)),automationWaitMs:offset(trace.at(-1)),api:api.map(e=>e.path),documents:trace.filter(e=>e.kind==='request'&&e.type==='document').map(e=>({path:e.path,top:e.top})),trace:[...trace]};if(label!=='baseline'&&['C','E','F','H'].includes(stage)&&delay>=100){const reads=api.filter(e=>['/api/sales-events','/api/sales-batches'].includes(String(e.path)));const firstResponse=trace.find(e=>e.kind==='T6:fetch'&&['/api/sales-events','/api/sales-batches'].includes(String(e.path)));assert.equal(reads.length,2);assert.ok(firstResponse&&reads.every(e=>e.at<firstResponse.at),name+' parallel critical reads');}if(label!=='baseline'&&['B','C','D','E','F','G','H','Q','S'].includes(stage)){assert.equal(data.documents.filter(d=>d.top).length,0,name+' retains SPA host');assert.equal(api.filter(e=>e.path==='/api/auth/bootstrap').length,0,name+' no repeated auth bootstrap');}results.push(data);writeFileSync(out+'/'+browserType.name()+'-'+width+'.json',JSON.stringify(results,null,2));console.log(JSON.stringify({...data,trace:undefined}));
 }
 // Home's canonical navigation control is discovered rather than replaced by a synthetic link.
 await page.goto(base+'/home?venue='+venue);await page.waitForFunction(()=>typeof (window as unknown as {bdNavigate:unknown}).bdNavigate==='function');
 const homeSales=page.getByText('Продажи',{exact:true});
 if(await homeSales.count())await measure('A Home → Sales',()=>homeSales.first().tap(),journalReady);
 else {writeFileSync(out+'/home-controls.json',JSON.stringify(await page.locator('a,button').allTextContents()));await measure('A Home → Sales (canonical bridge; no direct Home control)',()=>page.evaluate(()=>{(window as unknown as {bdNavigate:(path:string)=>void}).bdNavigate('/sales-import')}),journalReady);}
 await measure('B Sales → Cashier',()=>frame().locator('#open-cashier').tap(),cashReady);
 if(browserType===webkit&&width===390){await page.evaluate(()=>{document.documentElement.style.setProperty('--bd-safe-top','59px');document.documentElement.style.setProperty('--bd-safe-bottom','34px')});const back=await page.locator('#sales-journal').boundingBox();assert.ok(back&&back.y>=59&&back.height>=44&&back.width>=44);assert.equal(await page.locator('#sales-journal').evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}),true);await page.screenshot({path:out+'/webkit-'+width+'-'+delay+'-safe-area.png'});await page.evaluate(()=>{document.documentElement.style.removeProperty('--bd-safe-top');document.documentElement.style.removeProperty('--bd-safe-bottom')});}
 if(width===390){await posPane(page,false);await measure('K Menu → Order',()=>page.locator('.mobile-tabs [data-pane=order]').tap(),()=>page.locator('.mobile-tabs [data-pane=order][aria-pressed=true]').waitFor());
 await measure('L Order → Menu',()=>page.locator('.mobile-tabs [data-pane=menu]').tap(),()=>page.locator('.mobile-tabs [data-pane=menu][aria-pressed=true]').waitFor());}else{await page.locator('.menu-panel').waitFor();await page.locator('.cart').waitFor();console.log(JSON.stringify({menuAndOrderTogether:true,width}));}
 await measure('C Cashier Back → Sales',()=>page.locator('#sales-journal').tap(),journalReady);
 await measure('D Journal → Cashier',()=>frame().locator('.sales-navigation a[href="/cashier"]').tap(),cashReady);
 await page.locator('#sales-journal').tap();await journalReady();
 await measure('E Journal → Shifts',()=>frame().locator('a[href="/sales-entry?view=shifts"]').tap(),()=>page.locator('.cash-shift[data-state=open]').first().waitFor());
 await measure('F Shifts → Journal',()=>page.locator('header>a').tap(),journalReady);
 await frame().locator('[data-sales-view=manual]').tap();
 await measure('G Journal/manual entry → Manual Sale',()=>frame().locator('#manual-sale-link').tap(),()=>page.locator('#sale:not([hidden]) [data-menu] option[value="menu-0"]').waitFor({state:'attached'}));
 assert.ok(await page.locator('#shift option[value="ux2-open"]').count());
 await measure('H Manual Sale → Journal',()=>page.locator('header>a').tap(),journalReady);
 await measure('I Journal → Import',()=>frame().locator('[data-sales-view=import]').tap(),()=>frame().locator('#import-entry:not([hidden])').waitFor());
 await measure('J Import → Journal',()=>frame().locator('[data-sales-view=journal]').tap(),()=>frame().locator('#journal-layout:not([hidden])').waitFor());
 const documentButton=frame().locator('.journal-row').filter({hasText:'POS'}).first();
 await measure('M Journal → Document',()=>documentButton.tap(),()=>frame().locator('.pos-event-summary').waitFor());
 await measure('N Document → Journal',()=>frame().locator('#editor-dialog [data-close-editor],#editor-close').first().tap(),()=>frame().locator('#editor-dialog:not([open])').waitFor({state:'attached'}));
 await documentButton.tap();await frame().locator('.pos-event-summary').waitFor();
 await measure('O Document → Warehouse',()=>frame().locator('.journal-link').tap(),()=>page.getByText('Документ продаж',{exact:true}).first().waitFor());
 await measure('P Warehouse → Document',()=>page.getByText('Документ продаж',{exact:true}).first().tap(),()=>frame().locator('.pos-event-summary').waitFor());
 await waitForSalesHostReads(hostPage);await page.goto(base+'/cashier?venue='+venue);await cashReady();await posPane(page,false);await page.locator('[data-add="menu-0"]').tap();await waitForSalesHostReads(hostPage);await page.reload();await posPane(page);await page.locator('.cart .line').waitFor();
 await page.locator('#sales-journal').tap();await frame().locator('[data-resume-shift="ux2-open"]').waitFor();
 await measure('Q Resume → Cashier',()=>frame().locator('[data-resume-shift="ux2-open"]').tap(),()=>page.locator('.cart .line').waitFor());
 await posPay(page);await posReceiptList(page);
 await measure('R Success → New order',()=>posNewQuick(page),async()=>{await cashReady();assert.equal(await page.locator('.cart .line').count(),0);if(width===390)await page.locator('.mobile-tabs [data-pane=menu][aria-pressed=true]').waitFor();else{await page.locator('.menu-panel').waitFor();await page.locator('.cart').waitFor();}});
 await page.locator('[data-add="menu-0"]').tap();if(width===390)await page.locator('.mobile-tabs [data-pane=order]').tap();await posPay(page);await posReceiptList(page);
 await page.locator('#receipts-view .receipt-row').first().tap();
 await measure('S Success → Document',()=>page.locator('#receipt-sale').tap(),()=>frame().locator('.pos-event-summary').waitFor());

 if(label!=='baseline'){
  await frame().locator('#editor-close').tap();await journalReady();
  await measure('B2 rapid/double tap → Cashier',async()=>{const box=await frame().locator('#open-cashier').boundingBox();assert.ok(box);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);},cashReady);
  assert.equal(trace.filter(e=>e.kind==='request'&&e.type==='document'&&e.path==='/cashier').length,1,'one iframe navigation for two taps');
  if(width===390){await page.locator('.mobile-tabs [data-pane=order]').tap();await page.locator('.mobile-tabs [data-pane=menu]').tap();}
  assert.equal(await page.locator('#sales-navigation-status').count(),0,'no stale pending on destination');
 }
 if(label!=='baseline'&&delay===0){
  await waitForSalesHostReads(hostPage);await page.goto(base+'/sales-import?venue='+venue);await journalReady();failure=true;await frame().locator('#open-cashier').tap();await page.locator('#notice').filter({hasText:'QA server unavailable'}).waitFor();assert.equal(new URL(page.url()).pathname,'/cashier');assert.doesNotMatch(await page.locator('#connection').innerText(),/Нет соединения/);failure=false;
  await waitForSalesHostReads(hostPage);await page.goto(base+'/sales-import?venue='+venue);await journalReady();await page.route('**/api/sales-events*',route=>route.abort('internetdisconnected'));await frame().locator('#open-cashier').tap();await page.locator('#notice').filter({hasText:'Нет связи.'}).waitFor();assert.equal(await page.locator('#connection').textContent(),'Нет соединения');assert.equal(new URL(page.url()).pathname,'/cashier');await page.unroute('**/api/sales-events*');
  await waitForSalesHostReads(hostPage);await page.goto(base+'/sales-import?venue='+venue);await journalReady();runtime.sqlite.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z' WHERE account_id=?").run(user.userId);await frame().locator('#open-cashier').tap();await page.waitForURL(url=>url.pathname==='/login');await page.locator('input[type=email]').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('bd_session_token')),null);runtime.sqlite.prepare('UPDATE sessions SET expires_at=? WHERE account_id=?').run(new Date(Date.now()+86400000).toISOString(),user.userId);
  console.log(JSON.stringify({embeddedAuth401:true,embedded503NotLogin:true,embeddedNetworkNotLogin:true,browser:browserType.name(),width}));
 }
 assert.deepEqual(errors,[]);await page.screenshot({path:out+'/'+browserType.name()+'-'+width+'-'+delay+'.png'});writeFileSync(out+'/'+browserType.name()+'-errors.json',JSON.stringify(errors));writeFileSync(out+'/'+browserType.name()+'-server-requests.json',JSON.stringify(requests));await context.close();
}
}catch(error){writeFileSync(out+'/'+browserType.name()+'-'+(process.env.BD_PERF_WIDTH||390)+'-failure.json',JSON.stringify({error:String(error),requests,url:diagnosticPage?.url()},null,2));await diagnosticPage?.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));runtime.close();}
