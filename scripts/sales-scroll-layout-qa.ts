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
const label=process.env.BD_SCROLL_LABEL||'before';const out='outputs/scroll-stability/'+label;mkdirSync(out,{recursive:true});
const runtime=await lifecycleRuntime({health:'./app/api/business-health/route',products:'./app/api/inventory/products/route',events:'./app/api/sales-events/route',batches:'./app/api/sales-batches/route',usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route',overview:'./app/api/assortment/overview/route'});
const requests:{path:string;status:number;method:string}[]=[];const failure=false;let latency=0,apiDelay=0;let readGate:Promise<void>|null=null;let releaseReads=()=>{};
function holdSalesReads(){readGate=new Promise<void>(resolve=>{releaseReads=()=>{readGate=null;resolve();};});}
let demo: {email:string;token:string;activeVenueId:number}|null=null;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://localhost');const wait=url.pathname.startsWith('/api/')?Math.max(latency,apiDelay):latency;const gate=/^\/api\/sales-(events|batches)$/.test(url.pathname)?readGate:null;if(wait)await new Promise(r=>setTimeout(r,wait));if(gate)await gate;let response:Response;
 if(url.pathname==='/__qa/start' && demo){ const target=url.searchParams.get('to')||'/sales-import?embedded=1'; response=new Response('<!doctype html><script>localStorage.setItem("bd_session",'+JSON.stringify(demo.email)+');localStorage.setItem("bd_session_token",'+JSON.stringify(demo.token)+');localStorage.setItem("bd_active_venue_id",'+JSON.stringify(String(demo.activeVenueId))+');location.replace('+JSON.stringify(target)+');</script>',{headers:{'Content-Type':'text/html'}}); }
 else if(url.pathname.startsWith('/api/')){
  const routes:Record<string,string>={'/api/business-health':'health','/api/inventory/products':'products','/api/sales-events':'events','/api/sales-batches':'batches','/api/auth/bootstrap':'bootstrap','/api/auth/login':'login','/api/users/me':'usersMe','/api/restaurants/me':'restaurantMe','/api/venues':'venues','/api/store':'store','/api/assortment/overview':'overview'};
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
const names=['Бокал Pinot Noir','Лимонад с маракуйей','Эспрессо','Капучино на овсяном молоке','Тартар из говядины','Брускетта с томатами','Салат с печёной свёклой','Сырная тарелка','Паста с белыми грибами','Стейк с овощами гриль','Шоколадный фондан','Чизкейк с ягодами','Длинное название позиции для проверки переноса в корзине'];
assortment.menuItems.push(...names.map((name,i)=>({...assortment.menuItems[0],id:'menu-'+i,name,salePrice:45+i*15,sectionId:i<4?'bar':'kitchen',taxonomyCategoryId:i<4?'drinks':'food',subcategoryId:i<4?'wine':'dishes'})));
assortment.nomenclatureStructure={sections:[{id:'bar',name:'Бар'},{id:'kitchen',name:'Кухня'}],categories:[{id:'drinks',name:'Напитки',parentId:'bar'},{id:'food',name:'Основное меню',parentId:'kitchen'}],subcategories:[{id:'wine',name:'Вино и кофе',parentId:'drinks'},{id:'dishes',name:'Блюда',parentId:'food'}]};
assortment.stockBalances.forEach((b:{current:number})=>b.current=1000);
put('bd_assortment_v1',assortment);
const send=(body:object)=>runtime.api.events.POST(runtime.request(user,'/api/sales-events','POST',{venueId:venue,...body}));
assert.equal((await send({action:'open_shift',shiftId:'ux2-open',name:'Вечер · основной зал'})).status,201);
for(const [i,source] of Array.from({length:30},()=> 'POS_API').entries()){
 const command={id:'seed-'+i,source,shiftId:'ux2-open',lines:[{id:'line',menuItemId:'menu-'+(i%12),quantity:i+1}],...(source==='POS_API'?{payments:[{id:'p',method:i?'CARD_EXTERNAL':'CASH',amount:(45+(i%12)*15)*(i+1)}]}:{})};
 if(i===0){command.lines=names.map((_,n)=>({id:'line-'+n,menuItemId:'menu-'+n,quantity:1}));if(command.payments)command.payments[0].amount=names.reduce((sum,_,n)=>sum+45+n*15,0);}
 const preview=await send({action:'preview',command});const q=await preview.json() as {previewHash:string};assert.equal(preview.status,200,JSON.stringify(q));const posted=await send({action:'post',command,previewHash:q.previewHash});assert.equal(posted.status,201);
}
const imported=await runtime.api.batches.POST(runtime.request(user,'/api/sales-batches','POST',{venueId:venue,action:'import_text',text:process.env.BD_SCROLL_CLEAN_IMPORT==='1'?'Бокал Pinot Noir 2':Array.from({length:15},(_,i)=>'Неизвестный коктейль '+String.fromCharCode(65+i)+' 3').join('\n'),businessDate:'2026-09-27'}));assert.equal(imported.status,201);



const engine=process.env.BD_SCROLL_BROWSER==='chromium'?chromium:webkit;
const browser=await engine.launch(engine===chromium?{executablePath:process.env.BD_QA_BROWSER||await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:chromiumArgs}:{headless:true});
const results:unknown[]=[];
const profiles=[{width:390,height:844,top:59,bottom:34,name:'safe'},{width:390,height:844,top:0,bottom:0,name:'plain'},{width:820,height:1000,top:0,bottom:0,name:'tablet'},{width:1280,height:800,top:0,bottom:0,name:'desktop'}].filter(p=>!process.env.BD_SCROLL_PROFILE||p.name===process.env.BD_SCROLL_PROFILE);
try {
for(const profile of profiles)for(const delay of (process.env.BD_SCROLL_DELAYS||'0,300,600,1200').split(',').map(Number)) {
 latency=delay===1200?0:delay;apiDelay=delay===1200?1200:0;
 const {width,height,top,bottom,name}=profile,id=engine.name()+'-'+name+'-'+delay;
 // WebKit exposes native taps but no swipe API; mobile WebKit rejects mouse.wheel.
 // Use responsive touch-enabled WebKit with native wheel, and label it accurately.
 const c=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:engine===chromium&&width===390});
 await c.addInitScript({content:'window.__name=(value)=>value;'});await c.addInitScript({path:resolve('scripts/qa/sales-scroll-probe.js')});
 await c.addInitScript(({email,token,venue,top,bottom})=>{
  localStorage.bd_session=email;localStorage.bd_session_token=token;localStorage.bd_active_venue_id=String(venue);
  localStorage.setItem('bd_venue_context__'+email,JSON.stringify({activeVenueId:venue,venues:[{id:venue,name:'Atelier',role:'owner'},{id:999999,name:'QA other',role:'owner'}]}));
  const original=CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty=function(key,value,priority){
    if(this===document.documentElement?.style&&key==='--bd-safe-top')return original.call(this,key,top+'px','important');
    if(this===document.documentElement?.style&&key==='--bd-safe-bottom')return original.call(this,key,bottom+'px','important');
    return original.call(this,key,value,priority);
  };
  document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--bd-safe-top',top+'px','important');document.documentElement.style.setProperty('--bd-safe-bottom',bottom+'px','important')},{once:true});
 },{email:user.email,token:user.token,venue,top,bottom});
 const p=await c.newPage();const cdp=engine===chromium&&process.env.BD_SCROLL_TOUCH==='1'?await c.newCDPSession(p):null;p.setDefaultTimeout(20000);const errors:string[]=[];const trace:unknown[]=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/api/'))trace.push({url:r.url(),type:r.resourceType(),t:Date.now()})});
 const f=()=>p.frames().find(f=>f.parentFrame())||p.mainFrame();const l=(selector:string)=>p.frameLocator('iframe').locator(selector);
 const metrics=()=>f().evaluate(()=>{
  const owner=(window as unknown as {__scrollQAOwner?:Element}).__scrollQAOwner||document.querySelector('dialog[open] .editor-body')||document.scrollingElement!;
  const describe=(e:Element|null)=>{if(!e)return null;const s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,id:e.id,class:e.className,rect:{x:r.x,y:r.y,width:r.width,height:r.height},font:{size:s.fontSize,line:s.lineHeight,family:s.fontFamily,padding:s.padding,box:s.boxSizing,display:s.display,clamp:s.webkitLineClamp},overflowAnchor:s.overflowAnchor,overflow:[s.overflowX,s.overflowY],pointer:s.pointerEvents,touch:s.touchAction,position:s.position,scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}};
  return {blocks:[...document.querySelectorAll('.journal-command,.journal-primary,#pos-drafts,.journal-resume,.primary-action,.sales-navigation,#import-entry,#import-quality,.quality-impact,.section-heading,#notice,#venue-timezone-label')].map(describe),safe:{top:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bd-safe-top')),bottom:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bd-safe-bottom'))},url:location.href,scrollTop:owner.scrollTop,range:owner.scrollHeight-owner.clientHeight,owner:describe(owner),active:describe(document.activeElement),hit:describe(document.elementFromPoint(innerWidth/2,innerHeight*.5)),viewport:visualViewport?.height,documentHeight:document.documentElement.scrollHeight,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,iframeHeight:frameElement?.getBoundingClientRect().height,header:describe(document.querySelector('.pos-top,.sales-topbar,header')),checkout:describe(document.querySelector('.pos-cart-foot')),nested:[...document.querySelectorAll('#quality-list,.pos-cart-lines,.editor-body')].map(describe),pending:document.getElementById('sales-navigation-status')?.textContent,overlays:[...document.querySelectorAll('dialog[open],[aria-modal=true],.bd-venue-sheet')].map(describe),fixed:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed'&&e.getBoundingClientRect().height>0).map(describe),probe:(window as unknown as {__scrollQA:unknown}).__scrollQA};
 });
 const checks:unknown[]=[];
 async function gesture(label:string,delta=240){
  const initial=await metrics();const y=Math.max(top+120,Math.min(height*.52,(initial.checkout?.rect.height?initial.checkout.rect.y:height)-35));
  await f().evaluate(({x,y})=>{
    let node:Element|null=document.elementFromPoint(x,y);let owner:Element=document.scrollingElement!;
    while(node&&node!==document.documentElement){const style=getComputedStyle(node);if(/auto|scroll/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+1){owner=node;break;}node=node.parentElement;}
    // Mobile overview requires the page as its owner, including issue-list gestures.
    if(innerWidth<768&&owner.id==='quality-list')owner=document.scrollingElement!;
    (window as unknown as {__scrollQAOwner:Element}).__scrollQAOwner=owner;
  },{x:width/2,y});
  const before=await metrics();assert.ok(before.documentWidth<=before.viewportWidth+2,'horizontal overflow '+label);if(before.range<2){checks.push({label,result:'NO_SCROLL_RANGE',before});await f().evaluate(()=>delete (window as unknown as {__scrollQAOwner?:Element}).__scrollQAOwner);return;}
  if(delta>0&&before.scrollTop>=before.range-2)delta=-Math.min(240,before.scrollTop);
  const started=Date.now();if(cdp){const x=Math.round(width/2),startY=Math.round(y),distance=Math.max(-180,Math.min(180,delta));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:startY}]});for(let step=1;step<=12;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:Math.round(startY-distance*step/12)}]});await p.waitForTimeout(16);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse.move(width/2,y);await p.mouse.wheel(0,delta);}
  // One gesture only. Wait for its compositor result, never issue a retry gesture.
  await f().waitForFunction(start=>Math.abs(((window as unknown as {__scrollQAOwner:Element}).__scrollQAOwner.scrollTop)-start)>1,before.scrollTop,{timeout:1500}).catch(()=>{});
  const responseMs=Date.now()-started;await p.waitForTimeout(250);const after=await metrics();const pass=Math.abs(after.scrollTop-before.scrollTop)>1;
  await f().evaluate(()=>delete (window as unknown as {__scrollQAOwner?:Element}).__scrollQAOwner);
  checks.push({label,result:pass?'PASS':'FAIL',responseMs,delta:after.scrollTop-before.scrollTop,before,after});
  writeFileSync(out+'/'+id+'.json',JSON.stringify({profile,delay,engine:engine.name(),gesture:cdp?'CDP touch swipe':'native wheel; touch taps',checks,errors},null,2));
  assert.ok(pass,'FIRST GESTURE '+label+' '+id);assert.deepEqual(errors,[]);
 }
 async function stable(label:string){const before=await metrics();await p.waitForTimeout(300);const after=await metrics();checks.push({label,unexpectedScroll:after.scrollTop-before.scrollTop,heightDelta:after.documentHeight-before.documentHeight,observerDelta:((after.probe as {observerCallbacks:number}).observerCallbacks-(before.probe as {observerCallbacks:number}).observerCallbacks)});assert.ok(Math.abs(after.scrollTop-before.scrollTop)<=1,'unexpected scroll '+label);assert.ok(Math.abs(after.documentHeight-before.documentHeight)<=1,'idle layout oscillation '+label);assert.ok((after.probe as {observerCallbacks:number}).observerCallbacks-(before.probe as {observerCallbacks:number}).observerCallbacks<=1,'idle observer loop '+label);}
 async function toTop(){await f().evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));}
 async function readyJournal(){await l('#journal-venue').filter({hasText:'Atelier'}).waitFor();await l('.journal-row').first().waitFor();}
 try {
 if(process.env.BD_SCROLL_CLEAN_IMPORT==='1'){
  apiDelay=1200;holdSalesReads();await p.goto(base+'/sales-import?venue='+venue+'&view=import');await l('#import-entry').waitFor();await gesture('clean Import during load',120);
  const before=await l('#import-metrics').boundingBox(),start=await metrics();releaseReads();await l('#journal-venue').filter({hasText:'Atelier'}).waitFor();const after=await l('#import-metrics').boundingBox(),end=await metrics();
  assert.ok(before&&after&&Math.abs(after.y-before.y)<=1,'clean Import metrics must not jump after data');assert.equal(end.scrollTop,start.scrollTop);assert.equal(end.documentHeight,start.documentHeight,'loading completion must not shrink scroll range');
  checks.push({label:'clean Import completion',before,after,start,end});await gesture('clean Import after data');await p.screenshot({path:out+'/'+id+'-clean-import.png'});results.push({id,cleanImport:true,pass:true,checks:checks.length});assert.deepEqual(errors,[]);console.log(id+' CLEAN PASS');continue;
 }
 await p.goto(base+'/sales-import?venue='+venue);await readyJournal();assert.deepEqual((await metrics()).safe,{top,bottom},'simulated insets actually applied');await gesture('A journal first');await gesture('A journal repeated');await stable('journal idle');await p.screenshot({path:out+'/'+id+'-journal.png'});
 await toTop();await l('#open-cashier').tap();await l('#cashier:not([hidden])').waitFor();await gesture('B cashier menu first');await toTop();if(width===390)assert.ok(await l('#search').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));await l('#search').focus();await p.setViewportSize({width,height:Math.max(440,height-300)});await l('#search').blur();await p.setViewportSize({width,height});await gesture('keyboard search restored');if(width===390){await p.setViewportSize({width:height,height:width});await p.setViewportSize({width,height});await gesture('orientation restored');}await toTop();
 for(const count of [0,1,5,13]){
  const current=await l('.pos-line').count();for(let i=current;i<count;i++)await l('[data-add="menu-'+i+'"]').tap();
  if(width===390)await l('#show-cart').tap();
  const first=await metrics();await p.waitForTimeout(180);const settled=await metrics();checks.push({label:'cart-'+count,heightDelta:settled.documentHeight-first.documentHeight});assert.ok(Math.abs(settled.documentHeight-first.documentHeight)<=1,'checkout reservation changes after first frame');
  await gesture('C/D order '+count);await stable('order '+count);
  if(width===390){await toTop();await l('#show-menu').tap();await gesture('E menu '+count);await toTop();}
 }
 if(width===390)await l('#show-cart').tap();await l('.pos-line').last().scrollIntoViewIfNeeded();const last=await l('.pos-line').last().boundingBox(),foot=await l('.pos-cart-foot').boundingBox();assert.ok(last&&foot&&last.y+last.height<=foot.y+1,'last item uncovered');await p.screenshot({path:out+'/'+id+'-checkout.png'});
 await l('#comment-panel summary').tap();if(width===390)assert.ok(await l('#comment').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));await l('#comment').fill('QA comment');await p.setViewportSize({width,height:Math.max(440,height-300)});await l('#comment').blur();await p.setViewportSize({width,height});await gesture('keyboard comment restored');
 await toTop();await l('[data-bd-venue-trigger]').tap();await l('[data-bd-venue-sheet]').waitFor();await l('[data-bd-venue-sheet] [data-close]').tap();assert.equal(await f().evaluate(()=>document.body.classList.contains('bd-transient-layer-open-v247')),false,'closed dropdown releases scroll lock before first gesture');await gesture('dropdown closed');
 await toTop();await l('.pos-back').tap();await readyJournal();await gesture('F cashier journal');
 await toTop();await l('a[href="/sales-entry?view=shifts"]').tap();await l('.cash-shift').first().waitFor();await gesture('G shifts');
 await toTop();await l('#manual-nav').tap();await l('#sale:not([hidden])').waitFor();await gesture('H manual first');for(let i=0;i<8;i++)await l('#add-line').tap();await gesture('H manual long');
 await l('[data-menu]').first().selectOption('menu-0');await l('[data-quantity]').first().focus();await p.setViewportSize({width,height:Math.max(440,height-300)});await l('[data-quantity]').first().blur();await p.setViewportSize({width,height});await gesture('keyboard manual restored');
 await toTop();await l('header>a').tap();await readyJournal();await gesture('I manual journal');
 await toTop();await l('[data-sales-view="import"]').tap();if(process.env.BD_SCROLL_BASELINE_IMPORT==='1')await f().evaluate(()=>{const list=document.getElementById('quality-list')!;list.style.maxHeight='420px';list.style.overflowY='auto';});await gesture('J import first');await gesture('J import repeated');await stable('import idle');await p.screenshot({path:out+'/'+id+'-import.png'});
 await toTop();await l('#quality-list [data-batch]').first().tap();await l('.mapping-select select').first().waitFor();if(width===390)assert.ok(await l('.mapping-select select').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));await l('.mapping-select select').first().focus();await p.setViewportSize({width,height:Math.max(440,height-300)});await l('.mapping-select select').first().blur();await p.setViewportSize({width,height});await gesture('keyboard import mapping restored');await l('#editor-close').tap();await toTop();await l('[data-sales-view="journal"]').tap();await l('.journal-row').filter({hasText:'POS'}).last().tap();await l('.pos-event-summary').waitFor();await gesture('K document');await p.screenshot({path:out+'/'+id+'-document.png'});await l('#editor-close').tap();await gesture('K close first');
 await toTop();await l('a[href="/sales-entry?view=shifts"]').tap();await l('.cash-shift').first().waitFor();await p.goBack();await readyJournal();await gesture('L history back');await p.goForward();await l('.cash-shift').first().waitFor();await gesture('L history forward');
 // Delay read completion while a user has already started scrolling Import.
 apiDelay=1200;holdSalesReads();await p.goto(base+'/sales-import?venue='+venue+'&view=import');await l('#import-entry').waitFor();await gesture('late data first',120);const lateBefore=await metrics();releaseReads();await l('#journal-venue').filter({hasText:'Atelier'}).waitFor();const lateAfter=await metrics();checks.push({label:'late-data',before:lateBefore,after:lateAfter,unexpectedScroll:lateAfter.scrollTop-lateBefore.scrollTop});assert.ok(Math.abs(lateAfter.scrollTop-lateBefore.scrollTop)<=1,'late API must preserve user scroll position');if(width===390){const beforeAction=lateBefore.blocks.find(b=>b?.class==='journal-primary')!,afterAction=lateAfter.blocks.find(b=>b?.class==='journal-primary')!;assert.ok(Math.abs(afterAction.rect.height-beforeAction.rect.height)<=1,'draft action footprint must stay stable');assert.equal(await l('.journal-resume-label').first().evaluate(e=>getComputedStyle(e).webkitLineClamp),'2');}await gesture('late data next');
 assert.deepEqual(errors,[]);results.push({id,pass:true,checks:checks.length});console.log(id+' PASS '+checks.length);
 }catch(error){await p.screenshot({path:out+'/'+id+'-FAIL.png'}).catch(()=>{});writeFileSync(out+'/'+id+'-failure.json',JSON.stringify({error:String(error),metrics:await metrics().catch(()=>null),checks,trace,errors},null,2));throw error;}
 finally{releaseReads();writeFileSync(out+'/'+id+'.json',JSON.stringify({profile,delay,engine:engine.name(),gesture:cdp?'CDP touch swipe':'native wheel; touch taps',checks,errors},null,2));await c.close();}
}
writeFileSync(out+'/'+engine.name()+'-'+(process.env.BD_SCROLL_PROFILE||'all')+'-summary.json',JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));runtime.close();}
