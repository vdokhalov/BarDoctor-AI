import assert from 'node:assert/strict';
import {mock} from 'node:test';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-09-30T21:30:00Z')});
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
const out='outputs/venue-timezone-browser';mkdirSync(out,{recursive:true});
const runtime=await lifecycleRuntime({profile:'./app/api/restaurants/route',confirm:'./app/api/sales/confirm/route',events:'./app/api/sales-events/route',batches:'./app/api/sales-batches/route',usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route',overview:'./app/api/assortment/overview/route'});
const requests:{path:string;status:number;method:string}[]=[];const failure=false;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://localhost');let response:Response;
 if(url.pathname.startsWith('/api/')){
  const routes:Record<string,string>={'/api/sales/confirm':'confirm','/api/sales-events':'events','/api/sales-batches':'batches','/api/auth/bootstrap':'bootstrap','/api/auth/login':'login','/api/users/me':'usersMe','/api/restaurants':'profile','/api/restaurants/me':'restaurantMe','/api/venues':'venues','/api/store':'store','/api/assortment/overview':'overview'};
  const key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1],name=key?'storeKey':routes[url.pathname.replace(/\/$/,'')];
  const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));const body=Buffer.concat(chunks);
  response=failure&&name==='events'?Response.json({ok:false,error:'QA server unavailable'},{status:503}):name?await runtime.api[name][req.method||'GET'](new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})}),{params:Promise.resolve({key})} as never):Response.json({ok:false},{status:404});
  requests.push({path:url.pathname,status:response.status,method:req.method||'GET'});
 }else if(url.pathname==='/cashier')response=cashier();
 else if(url.pathname==='/sales-entry')response=manual();
 else if(url.pathname==='/sales-import')response=journal(new Request(url));
 else if(['/login','/home','/warehouse','/finance','/profile','/profile/venue'].includes(url.pathname))response=barDoctorResponse();
 else{const file=resolve('public','.'+url.pathname);response=file.startsWith(resolve('public')+'/')||file.startsWith(resolve('public')+'\\')?existsSync(file)?new Response(readFileSync(file),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'} as Record<string,string>)[extname(file)]||'application/octet-stream'}}):new Response(null,{status:404}):new Response(null,{status:404});}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Fixture failure');}});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+((server.address() as {port:number}).port);
const executablePath=process.env.BD_QA_BROWSER||await resolveBrowserExecutable(chromium.executablePath());
const browser=await chromium.launch({executablePath,headless:true,args:chromiumArgs}),report:unknown[]=[];

try {
for(const width of [390,820,1280]){
 const user=await runtime.register('timezone-browser-'+width+'@isolated.test'),venue=user.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Timezone QA',currency:'MDL',businessType:'bar',country:'Молдова',city:'Кишинёв',timezone:'Europe/Chisinau',areas:[]}),user.userId);
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,'bd_assortment_v1',JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venue),new Date().toISOString());
 const c=await browser.newContext({viewport:{width,height:844},timezoneId:'America/Los_Angeles'}),p=await c.newPage(),errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 await c.addInitScript(({email,token,venue})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venue));},{email:user.email,token:user.token,venue});
 try{
  await p.goto(base+'/sales-import?embedded=1&venue='+venue);await p.locator('#venue-timezone-label').waitFor();assert.match(await p.locator('#venue-timezone-label').innerText(),/Europe\/Chisinau/);
  await p.locator('[data-sales-view=import]').click();await p.locator('#add-sales').click();await p.locator('[data-source=text]').click();await p.locator('#text-date').waitFor();assert.equal(await p.locator('#text-date').inputValue(),'2026-10-01');
  await p.screenshot({path:out+'/'+width+'-import-venue-date.png',fullPage:true});
  const journal=await p.evaluate(()=>{const w=window as unknown as {bdSalesJournal:{date:(v:string)=>string}};return w.bdSalesJournal.date('2026-09-30T21:30:00Z');});assert.match(journal,/01 окт/);assert.match(journal,/00:30/);
  await p.goto(base+'/profile/venue');const select=p.getByRole('combobox',{name:'Часовой пояс заведения'});await select.waitFor();assert.equal(await select.inputValue(),'Europe/Chisinau');await select.selectOption('America/New_York');
  await select.scrollIntoViewIfNeeded();const box=await select.boundingBox();assert.ok(box&&box.width<=width);await p.screenshot({path:out+'/'+width+'-timezone-setting.png',fullPage:true});
  const saved=p.waitForResponse(r=>new URL(r.url()).pathname.replace(/\/$/,'')==='/api/restaurants'&&r.request().method()==='POST');await p.getByRole('button',{name:'Сохранить',exact:true}).click();const response=await saved;assert.equal(response.status(),200);assert.equal((await response.json()).restaurant.timezone,'America/New_York');
  await p.goto(base+'/profile/venue');await select.waitFor();assert.equal(await select.inputValue(),'America/New_York');
  await p.goto(base+'/sales-entry?venue='+venue);await p.locator('#work:not([hidden])').waitFor();assert.match(await p.locator('#venue-timezone-label').innerText(),/America\/New_York/);
  await p.locator('[data-menu]').first().selectOption('beer');await p.locator('#sale button[type=submit]').click();await p.locator('#preview:not([hidden])').waitFor();const post=p.waitForResponse(r=>r.url().endsWith('/api/sales-events')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='post');await p.locator('#post').click();const posted=await post;assert.equal(posted.status(),201);const event=(await posted.json()).event;assert.equal(event.businessDate,'2026-09-30');
  await p.goto(base+'/sales-import?embedded=1&venue='+venue+'&batch='+encodeURIComponent(event.id));await p.locator('#editor-dialog[open]').waitFor();assert.match(await p.locator('#editor-body').innerText(),/17:30/);await p.screenshot({path:out+'/'+width+'-journal-new-york.png',fullPage:true});
  assert.deepEqual(errors,[]);report.push({width,deviceTimezone:'America/Los_Angeles',venueDateChisinau:'2026-10-01',persistedVenueTimezone:'America/New_York',saleDate:'2026-09-30',journalTime:'17:30',errors});
 }catch(error){writeFileSync(out+'/failure.json',JSON.stringify({width,url:p.url(),body:await p.locator('body').innerText(),requests:requests.slice(-20),invalid:await p.locator(':invalid').evaluateAll(xs=>xs.map(x=>({tag:x.tagName,name:(x as HTMLInputElement).name,message:(x as HTMLInputElement).validationMessage})))},null,2));await p.screenshot({path:out+'/failure.png',fullPage:true});throw error;}finally{await c.close();}
}
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));runtime.close();mock.timers.reset();writeFileSync(out+'/results.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
