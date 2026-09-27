import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync,existsSync,mkdirSync,writeFileSync } from 'node:fs';
import { resolve,extname } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { lifecycleRuntime } from '../tests/helpers/lifecycle-runtime';
import { salesEventFixture } from '../tests/helpers/sales-event-fixture';
import { GET as cashier } from '../app/cashier/route';
import { GET as manual } from '../app/sales-entry/route';
import { GET as journal } from '../app/sales-import/route';
import { barDoctorResponse } from '../app/bar-doctor-response';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const out='outputs/sales-iphone-hardening';mkdirSync(out,{recursive:true});
const runtime=await lifecycleRuntime({events:'./app/api/sales-events/route',batches:'./app/api/sales-batches/route',usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route',overview:'./app/api/assortment/overview/route'});
const requests:{path:string;status:number;method:string}[]=[];const failure=false;
let demo: {email:string;token:string;activeVenueId:number}|null=null;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://localhost');let response:Response;
 if(url.pathname==='/__qa/start' && demo){ const target=url.searchParams.get('to')||'/sales-import?embedded=1'; response=new Response('<!doctype html><script>localStorage.setItem("bd_session",'+JSON.stringify(demo.email)+');localStorage.setItem("bd_session_token",'+JSON.stringify(demo.token)+');localStorage.setItem("bd_active_venue_id",'+JSON.stringify(String(demo.activeVenueId))+');location.replace('+JSON.stringify(target)+');</script>',{headers:{'Content-Type':'text/html'}}); }
 else if(url.pathname.startsWith('/api/')){
  const routes:Record<string,string>={'/api/sales-events':'events','/api/sales-batches':'batches','/api/auth/bootstrap':'bootstrap','/api/auth/login':'login','/api/users/me':'usersMe','/api/restaurants/me':'restaurantMe','/api/venues':'venues','/api/store':'store','/api/assortment/overview':'overview'};
  const key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1],name=key?'storeKey':routes[url.pathname];
  const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));const body=Buffer.concat(chunks);
  response=failure&&name==='events'?Response.json({ok:false,error:'QA server unavailable'},{status:503}):name?await runtime.api[name][req.method||'GET'](new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})}),{params:Promise.resolve({key})} as never):Response.json({ok:false},{status:404});
  requests.push({path:url.pathname,status:response.status,method:req.method||'GET'});
 }else if(url.pathname==='/cashier')response=cashier();
 else if(url.pathname==='/sales-entry')response=manual();
 else if(url.pathname==='/sales-import')response=journal(new Request(url));
 else if(['/login','/home','/warehouse','/finance','/profile/venue'].includes(url.pathname))response=barDoctorResponse();
 else{const file=resolve('public','.'+url.pathname);response=file.startsWith(resolve('public')+'/')||file.startsWith(resolve('public')+'\\')?existsSync(file)?new Response(readFileSync(file),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'} as Record<string,string>)[extname(file)]||'application/octet-stream'}}):new Response(null,{status:404}):new Response(null,{status:404});}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
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
const executablePath=process.env.BD_QA_BROWSER||await resolveBrowserExecutable(chromium.executablePath());
const browser=await chromium.launch({executablePath,headless:true,args:chromiumArgs});
const results:unknown[]=[];
const get=(key:string)=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(user.userId,key)?.data_json||'null'));
// Two pre-existing cash shifts exercise legacy selection, not permission to create new parallel shifts.
put('bd_finance_revenue',[...get('bd_finance_revenue'),{...get('bd_finance_revenue')[0],id:'legacy-other',shiftName:'Legacy other'}]);
try{
 for(const profile of [{width:390,height:844,top:59,bottom:34,name:'iphone'},{width:390,height:844,top:0,bottom:0,name:'android'},{width:820,height:1000,top:0,bottom:0,name:'tablet'},{width:1280,height:800,top:0,bottom:0,name:'desktop'}]){
 const {width,height,top,bottom,name}=profile;
 const c=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width===390,timezoneId:'America/Los_Angeles'}),p=await c.newPage(),errors:string[]=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',async d=>{errors.push('Unexpected dialog: '+d.type());await d.dismiss();});
 const devtools=await c.newCDPSession(p);await devtools.send('Emulation.setSafeAreaInsetsOverride',{insets:{top,bottom,left:0,right:0}});
 await c.addInitScript(({email,token,venue,account})=>{if(sessionStorage.qa_init)return;sessionStorage.qa_init='1';localStorage.bd_session=email;localStorage.bd_session_token=token;localStorage.bd_active_venue_id=String(venue);localStorage.setItem('bd_pos_shift_v1:'+account+':'+venue,'ux2-open');localStorage.setItem('bd_venue_context__'+email,JSON.stringify({activeVenueId:venue,venues:[{id:venue,name:'Atelier',role:'owner'},{id:999999,name:'Isolated unavailable venue',role:'owner'}]}));},{email:user.email,token:user.token,venue,account:user.userId});
 const snap=async(label:string)=>p.screenshot({path:out+'/'+name+'-'+label+'.png'});
 const fits=async()=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no overflow '+name);
 await p.goto(base+'/cashier?venue='+venue);await p.locator('#cashier:not([hidden])').waitFor().catch(async e=>{console.error('CASHIER FAILURE',await p.locator('body').innerText(),errors);await snap('failure');throw e;});await fits();
 const back=await p.locator('.pos-back').boundingBox();assert.ok(back&&back.y>=top&&back.height>=44&&back.width>=44);
 assert.equal(await p.locator('.pos-back').evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),true,'back not intercepted');await snap('header');
 const trigger=p.locator('[data-bd-venue-trigger]');await trigger.tap();await p.locator('[data-bd-venue-sheet]').waitFor();await p.locator('[data-bd-venue-sheet] [data-close]').tap();assert.equal(await p.locator('[data-bd-venue-sheet]').count(),0);
 // Slow document load proves immediate feedback and exactly one native request for repeated taps.
 let navigations=0;await p.route('**/sales-import?*',async route=>{if(route.request().isNavigationRequest()&&!route.request().url().includes('embedded=1')){navigations++;await new Promise(r=>setTimeout(r,1200));}await route.continue();});
 await p.evaluate(()=>new MutationObserver(()=>{const status=document.getElementById('sales-navigation-status');if(status)sessionStorage.qaNavigationFeedback=status.textContent||'';}).observe(document.body,{childList:true,subtree:true,characterData:true}));await p.touchscreen.tap(back!.x+back!.width/2,back!.y+back!.height/2);await p.touchscreen.tap(back!.x+back!.width/2,back!.y+back!.height/2);await p.waitForURL('**/sales-import?venue='+venue);assert.equal(navigations,1);assert.match(await p.evaluate(()=>sessionStorage.qaNavigationFeedback),/Открываем/);await p.unroute('**/sales-import?*');
 const f=p.frameLocator('iframe[title="Продажи и склад"]');await f.locator('#journal-venue').filter({hasText:'Atelier'}).waitFor();await snap('journal');
 await f.locator('.journal-filters summary').tap();await f.locator('#journal-source').selectOption('POS');assert.equal(await f.locator('#journal-filter-count').innerText(),'1');await f.locator('#journal-reset').tap();
 for(const view of ['manual','import','journal']){await f.locator('[data-sales-view='+view+']').tap();assert.equal(await f.locator('[data-sales-view='+view+']').getAttribute('aria-current'),'page');}
 await f.locator('a[href="/sales-entry?view=shifts"]').tap();await p.waitForURL('**/sales-entry?view=shifts&venue='+venue);await p.locator('.cash-shift[data-state=open]').first().waitFor();assert.equal(await p.locator('#open-shift').isVisible(),false);assert.ok((await p.locator('header>a').boundingBox())!.y>=top);
 await p.locator('#manual-nav').tap();await p.locator('#sale:not([hidden])').waitFor();await p.locator('#shift').selectOption('ux2-open');await p.locator('[data-menu]').selectOption('menu-0');await p.locator('#sale button[type=submit]').tap();await p.locator('#preview:not([hidden])').waitFor();await snap('manual');
 await p.locator('header>a').tap();await p.waitForURL('**/sales-import?venue='+venue);await f.locator('#open-cashier').waitFor();await f.locator('#open-cashier').tap();await p.waitForURL('**/cashier?venue='+venue);await p.locator('#work:not([hidden])').waitFor();if(await p.locator('#shift-picker').isVisible())await p.locator('#shift-picker').selectOption('ux2-open');await p.locator('#cashier:not([hidden])').waitFor().catch(async e=>{console.error('CASHIER FAILURE',await p.locator('body').innerText(),errors);await snap('failure');throw e;});
 for(let i=0;i<12;i++)await p.locator('[data-add="menu-'+i+'"]').tap();if(width===390)await p.locator('#show-cart').tap();assert.equal(await p.locator('.pos-line').count(),12);await p.locator('[data-increase="menu-0"]').tap();await p.locator('[data-decrease="menu-0"]').tap();
 await p.locator('.pos-line').last().scrollIntoViewIfNeeded();const last=await p.locator('.pos-line').last().boundingBox(),foot=await p.locator('.pos-cart-foot').boundingBox(),pay=await p.locator('#pay').boundingBox();assert.ok(last&&foot&&last.y+last.height<=foot.y+1);assert.ok(pay&&pay.y+pay.height<=height-bottom+1);await fits();await snap('checkout');
 if(width===390)assert.equal(await p.locator('#cart-lines').evaluate(e=>getComputedStyle(e).overflowY),'visible');
 await p.reload();await p.locator('.pos-line').last().waitFor();assert.equal(await p.locator('.pos-line').count(),12);
 // The draft's selected shift must be saved BEFORE the iframe navigation capture handler.
 await p.evaluate(({account,venue})=>localStorage.setItem('bd_pos_shift_v1:'+account+':'+venue,'legacy-other'),{account:user.userId,venue});
 await p.goto(base+'/sales-import?venue='+venue);await f.locator('[data-resume-shift="ux2-open"]').waitFor();await f.locator('[data-resume-shift="ux2-open"]').tap();await p.waitForURL('**/cashier?venue='+venue);await p.locator('.pos-line').last().waitFor();assert.equal(await p.locator('.pos-line').count(),12);assert.match(await p.locator('#shift-title').innerText(),/Вечер/);
 let posts=0;await p.route('**/api/sales-events*',async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON().action==='post'){posts++;await new Promise(r=>setTimeout(r,700));}await route.continue();});
 await p.locator('#pay').tap();await p.locator('#notice').filter({hasText:'Выполняем'}).waitFor();await p.locator('#receipt:not([hidden])').waitFor();assert.equal(posts,1);await p.unroute('**/api/sales-events*');await snap('success');
 await p.locator('#receipt-sale').tap();await p.waitForURL(/\/sales-import\?.*batch=/);await f.locator('.pos-event-summary').waitFor();await snap('document');await f.locator('.journal-link').tap();await p.waitForURL(/\/warehouse\?.*sourceDocumentId=/);await p.getByText('Документ продаж',{exact:true}).first().tap();await f.locator('.pos-event-summary').waitFor();
 // Canonical document modal owns the first Back; the next Back leaves the journal.
 await p.evaluate(()=>history.back());await f.locator('#editor-dialog:not([open])').waitFor({state:'attached'});await p.evaluate(()=>history.back());await p.waitForURL(/\/warehouse/);await p.evaluate(()=>history.forward());await f.locator('.pos-event-summary').waitFor();

 // Missing timezone shows an explicit warning and the canonical venue settings route.
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Atelier',currency:'MDL'}),user.userId);
 await p.goto(base+'/cashier?venue='+venue);await p.locator('#venue-timezone-label[data-configured=false]').waitFor();assert.match(await p.locator('#venue-timezone-label').innerText(),/около полуночи/);assert.equal(await p.locator('#venue-timezone-label a').getAttribute('href'),'/profile/venue?venue='+venue);await snap('timezone-missing');
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Atelier',currency:'MDL',timezone:'Europe/Chisinau'}),user.userId);
 await p.reload();await p.locator('#venue-timezone-label[data-configured=true]').waitFor();assert.match(await p.locator('#venue-timezone-label').innerText(),/Europe\/Chisinau/);
 assert.deepEqual(errors,[]);results.push({...profile,pass:true,safeAreaEnvironment:true,backHitTarget:true,oneNavigation:true,rapidTap:true,pendingFeedback:true,venuePropagation:true,legacyResume:true,largeCart:12,checkoutClear:true,draftReload:true,pos:true,manual:true,documentWarehouseRoundtrip:true,browserHistory:true,timezoneWarning:true,dropdown:true});writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await c.close();
 }
 console.log(JSON.stringify(results));
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));runtime.close();}
