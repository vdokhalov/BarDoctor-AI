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
const out='outputs/sales-ux2';mkdirSync(out,{recursive:true});
const runtime=await lifecycleRuntime({events:'./app/api/sales-events/route',batches:'./app/api/sales-batches/route',usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route',overview:'./app/api/assortment/overview/route'});
const requests:{path:string;status:number;method:string}[]=[];let failure=false;
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
 else if(['/login','/home','/warehouse','/finance'].includes(url.pathname))response=barDoctorResponse();
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
console.log(JSON.stringify({preview:base+'/__qa/start',venue}));
if(process.env.BD_SALES_UX_PREVIEW==='1') await new Promise(()=>{});
else {
 const executablePath=process.env.BD_QA_BROWSER||await resolveBrowserExecutable(chromium.executablePath());
 const browser=await chromium.launch({executablePath,headless:true,args:chromiumArgs});
 const results:unknown[]=[];
 const get=(key:string)=>JSON.parse(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(user.userId,key)?.data_json as string || 'null');
 try {for(const width of [390,820,1280]){
  const height=width===390?844:width===820?1000:800;
  const c=await browser.newContext({viewport:{width,height}}),p=await c.newPage(),errors:string[]=[];
  p.on('pageerror',e=>errors.push(e.message));
  const snap=async(name:string,fullPage=false)=>{await p.screenshot({path:out+'/'+width+'-'+name+'.png',fullPage});};
  const fits=async(name:string)=>assert.equal(await p.evaluate(()=>document.body.scrollWidth<=innerWidth+1 && [...document.querySelectorAll<HTMLElement>('.editor-body,.editor-header,.pos-cart-foot')].filter(e=>e.getBoundingClientRect().width).every(e=>e.getBoundingClientRect().right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1)),true,name+' fits '+width);
  const pane=async(order:boolean)=>{if(width<768)await p.locator(order?'#show-cart':'#show-menu').click();};
  const before={events:get('bd_sales_events_v1').length,stock:get('bd_assortment_v1').stockBalances[0].current,revenue:get('bd_finance_revenue').find((v:{id:string})=>v.id==='ux2-open').revenue};
  try {
   await p.goto(base+'/__qa/start');await p.locator('.batch-row').first().waitFor();await fits('journal');await snap('journal',true);
   await p.locator('#journal-query').fill('нет-такой-продажи');await p.getByText('Ничего не найдено',{exact:true}).waitFor();await snap('empty-search');await p.locator('#journal-reset').click();
   await p.locator('.journal-filters summary').click();await p.locator('#journal-payment').selectOption('CARD_EXTERNAL');assert.equal(await p.locator('#journal-filter-count').innerText(),'1');await fits('filters');await snap('filters',true);await p.locator('#journal-reset').click();await p.locator('.journal-filters summary').click();
   await p.locator('.batch-row').filter({hasText:'225,00'}).first().click();await p.locator('#editor-dialog[open]').waitFor();await fits('document');await snap('document');assert.match(await p.locator('#editor-body').innerText(),/не рассчитана/);assert.ok((await p.locator('.journal-link').getAttribute('href'))?.includes('sourceDocumentId='));await p.locator('#editor-close').click();
   await p.locator('.batch-row').filter({hasText:'Требует внимания'}).click();await p.locator('#review-import-issues').waitFor();await fits('import problem');await snap('import-problem');
   assert.equal(await p.locator('#editor-body').evaluate(e=>e.firstElementChild?.className),'partial-warning');await p.locator('#review-import-issues').click();assert.equal(await p.locator('[data-map-line]').evaluate(e=>e===document.activeElement),true);await p.locator('#editor-close').click();
   await p.locator('[data-sales-view=import]').click();await p.locator('#import-quality').waitFor();await fits('import workspace');await snap('import-workspace',true);
   await p.goto(base+'/sales-entry?view=shifts');await p.locator('.cash-shift[data-state=open]').waitFor();await fits('shifts');await snap('shifts',true);
   await p.goto(base+'/sales-entry');await p.locator('#sale').waitFor();await fits('manual');assert.equal(await p.locator('bd-app-header').count(),0,'manual owns its correct header');await snap('manual',true);
   await p.goto(base+'/cashier');await p.locator('#cashier:not([hidden])').waitFor();assert.equal(await p.locator('bd-app-header').count(),0,'cashier owns one header');
   await p.locator('#search').fill('Тартар');assert.equal(await p.locator('.pos-item').count(),1);await p.locator('#search').fill('');
   for(let i=0;i<2;i++)await p.locator('[data-add="menu-'+i+'"]').click();await snap('cashier');await pane(true);await snap('small-cart');
   await p.locator('[data-increase="menu-0"]').click();await p.locator('[data-decrease="menu-0"]').click();
   await pane(false);for(let i=2;i<12;i++)await p.locator('[data-add="menu-'+i+'"]').click();await pane(true);assert.equal(await p.locator('.pos-line').count(),12);await fits('large cart');await p.evaluate(()=>window.scrollTo(0,0));await snap('large-cart');
   const button=await p.locator('#pay').boundingBox();assert.ok(button&&button.y>=0&&button.y+button.height<=height+1,'payment visible without scrolling');
   await p.locator('.pos-line').last().scrollIntoViewIfNeeded();
   const last=await p.locator('.pos-line').last().boundingBox(),foot=await p.locator('.pos-cart-foot').boundingBox();assert.ok(last&&foot&&last.y+last.height<=foot.y+1,'last line not covered by checkout');await snap('checkout');
   if(width===390){for(const selector of ['[data-increase="menu-11"]','[data-decrease="menu-11"]','[data-remove="menu-11"]']){const b=await p.locator(selector).boundingBox();assert.ok(b&&b.height>=44&&b.width>=44,'44 px quantity targets');}}
   if(width===1280){await p.setViewportSize({width:640,height:400});await p.locator('#show-cart').click();await p.locator('.pos-line').last().scrollIntoViewIfNeeded();await snap('zoom-reflow');const lastZoom=await p.locator('.pos-line').last().boundingBox(),footZoom=await p.locator('.pos-cart-foot').boundingBox();assert.ok(lastZoom&&footZoom&&lastZoom.y+lastZoom.height<=footZoom.y+1,'zoomed automatic scroll clears checkout');await p.setViewportSize({width,height});}
   await p.reload();await p.locator('.pos-line').last().waitFor();assert.equal(await p.locator('.pos-line').count(),12,'draft preserved after reload');await p.locator('#pay').click();await p.locator('#receipt:not([hidden])').waitFor();await snap('success');await fits('success');
   const next=await p.locator('#new-order').boundingBox();assert.ok(next&&next.y+next.height<=height,'new order visible on success');assert.ok((await p.locator('#receipt-sale').getAttribute('href'))?.includes('batch='));
   assert.equal(get('bd_sales_events_v1').length,before.events+1);assert.equal(get('bd_assortment_v1').stockBalances[0].current,before.stock-12);assert.equal(get('bd_finance_revenue').find((v:{id:string})=>v.id==='ux2-open').revenue,before.revenue+1530);assert.equal(get('bd_sales_events_v1').at(-1).shiftId,'ux2-open');
   await p.locator('#new-order').click();await p.locator('#cashier:not([hidden])').waitFor();assert.equal(await p.locator('.pos-line').count(),0);
   failure=true;await p.reload();await p.locator('#notice').filter({hasText:'QA server unavailable'}).waitFor();assert.equal(new URL(p.url()).pathname,'/cashier');await snap('server-error');failure=false;
   await p.route('**/api/sales-events*',r=>r.abort('internetdisconnected'));await p.reload();await p.locator('#connection').filter({hasText:'Нет соединения'}).waitFor();await snap('network-error');await p.unroute('**/api/sales-events*');
   await p.route('**/api/sales-batches*',async route=>{const response=await route.fetch(),body=await response.json();body.batches=[];await route.fulfill({response,json:body});});await p.goto(base+'/sales-import?embedded=1');await p.getByText('Продаж пока нет',{exact:true}).waitFor();await snap('empty-journal');await p.unroute('**/api/sales-batches*');
   // Read-model stress fixtures only: no mutations to production or authoritative records.
   await p.route('**/api/sales-batches*',async route=>{const response=await route.fetch(),body=await response.json();const sample=body.batches.find((b:{readOnly:boolean})=>b.readOnly);body.batches=Array.from({length:80},(_,i)=>({...sample,id:'stress-'+i,revenue:987654321.99,actor:{name:'Александра Константинопольская — старший администратор вечерней смены'},comment:'Длинный комментарий к продаже',shiftId:'long-shift'}));body.shifts=[{id:'long-shift',label:'Основной зал и летняя терраса — вечерняя кассовая смена'}];await route.fulfill({response,json:body});});
   await p.goto(base+'/sales-import?embedded=1');await p.locator('.batch-row').nth(79).waitFor();await fits('80 documents and long values');await snap('long-values');
   await p.locator('.journal-filters summary').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.journal-filters details').getAttribute('open'),'');assert.notEqual(await p.locator('.journal-filters summary').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
   await p.unroute('**/api/sales-batches*');
   await p.route('**/api/sales-events*',async route=>{const response=await route.fetch(),body=await response.json();body.shifts=[];await route.fulfill({response,json:body});});await p.goto(base+'/cashier');await p.locator('#open-shift').waitFor();await fits('no open shift');await snap('no-open-shift');await p.unroute('**/api/sales-events*');
   assert.deepEqual(errors,[]);results.push({width,height,passed:true,lines:12,postedRevenue:1530,stockDelta:-12,journal:true,filters:true,document:true,importPriority:true,shifts:true,manual:true,checkoutVisible:true,noOverlap:true,touchTargets:true,draftReload:true,success:true,serverError:true,networkError:true,empty:true,longNames:true,largeAmounts:true,manyDocuments:80,keyboardFocus:true,noOpenShift:true});
  }catch(error){await snap('failure').catch(()=>{});throw error;}finally{await c.close();}
 }}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));runtime.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
}
