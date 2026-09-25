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
const diagnostic=process.env.BD_OBS_DIAGNOSTIC==='1',out='outputs/sales-observations-v454';mkdirSync(out,{recursive:true});
const runtime=await lifecycleRuntime({events:'./app/api/sales-events/route',batches:'./app/api/sales-batches/route',usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route',overview:'./app/api/assortment/overview/route'});
const requests:{path:string;status:number;method:string}[]=[];let failure=false;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://localhost');let response:Response;
 if(url.pathname.startsWith('/api/')){
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
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+((server.address() as {port:number}).port);
const executablePath=process.env.BD_QA_BROWSER||await resolveBrowserExecutable(chromium.executablePath());
const browser=await chromium.launch({executablePath,headless:true,args:chromiumArgs}),report:unknown[]=[];
try{for(const profile of [{name:'mobile',width:390,height:844},{name:'tablet',width:820,height:1000},{name:'desktop',width:1280,height:800}].filter((p,i)=>(!diagnostic||i===0)&&(!process.env.BD_OBS_PROFILE||p.name===process.env.BD_OBS_PROFILE))){
 const user=await runtime.register(profile.name+'@obs454.test'),venue=user.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'OBS QA '+profile.name,currency:'MDL'}),user.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value),new Date().toISOString());
 const get=(key:string)=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(user.userId,key)?.data_json||'null'));
 put('bd_assortment_v1',JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venue)));
 const send=(body:object)=>runtime.api.events.POST(runtime.request(user,'/api/sales-events','POST',{venueId:venue,...body}));
 await send({action:'open_shift',shiftId:'C',name:'C overnight'});await send({action:'open_shift',shiftId:'D',name:'D current'});
 const shifts=get('bd_finance_revenue');shifts[0].date=new Date(Date.now()-86400000).toISOString().slice(0,10);shifts[0].accountingMonth=shifts[0].date.slice(0,7);put('bd_finance_revenue',shifts);
 const setup=async(kind:string)=>{const context=await browser.newContext({viewport:{width:profile.width,height:profile.height}});if(kind!=='anonymous')await context.addInitScript(({email,token,venue})=>{if(sessionStorage.getItem('qa_initialized'))return;sessionStorage.setItem('qa_initialized','1');localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venue));},{email:user.email,token:kind==='invalid'?'invalid':user.token,venue});return context;};
 for(const kind of ['anonymous','invalid','expired']){
  if(kind==='expired')runtime.sqlite.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z' WHERE account_id=?").run(user.userId);
  const context=await setup(kind),page=await context.newPage();const start=requests.length;
  await page.goto(base+'/cashier');
  await page.waitForURL('**/login',{timeout:diagnostic?2000:15000}).catch(e=>{if(!diagnostic)throw e;});
  const result={profile:profile.name,case:kind,url:new URL(page.url()).pathname,firstDataStatus:requests.slice(start).find(r=>r.path==='/api/sales-events')?.status,...await page.evaluate(()=>({connection:document.querySelector('#connection')?.textContent||null,notice:document.querySelector('#notice')?.textContent||null}))};
  report.push(result);if(!diagnostic){assert.equal(result.url,'/login');assert.equal(result.firstDataStatus,401);await page.locator('input[type=email]').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('bd_session_token')),null);}await context.close();
  if(kind==='expired')runtime.sqlite.prepare('UPDATE sessions SET expires_at=? WHERE account_id=?').run(new Date(Date.now()+86400000).toISOString(),user.userId);
 }
 const context=await setup('authenticated'),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/cashier?venue='+venue);await page.locator('#work:not([hidden])').waitFor();assert.equal(await page.locator('#shift-picker option').count(),3);await page.locator('#shift-picker').selectOption('C');await page.locator('#cashier:not([hidden])').waitFor();
  await page.goto(base+'/sales-entry?view=shifts&venue='+venue);await page.locator('.cash-shift h3').filter({hasText:'C overnight · Открыта'}).waitFor();
  await page.goto(base+'/sales-entry?venue='+venue);await page.locator('#sale').waitFor();await page.locator('#shift').selectOption('C');await page.locator('[data-menu]').selectOption('beer');await page.locator('#sale').getByRole('button',{name:'Проверить продажу',exact:true}).click();
  if(diagnostic){await page.locator('#notice').filter({hasText:'Эта смена уже закрыта'}).waitFor();report.push({case:'manual-C',notice:await page.locator('#notice').innerText(),shiftId:await page.locator('#shift').inputValue(),openShifts:get('bd_finance_revenue').filter((s:{closingStatus:string})=>s.closingStatus==='open').map((s:{id:string;date:string})=>({id:s.id,date:s.date}))});continue;}
  await page.locator('#preview:not([hidden])').waitFor();await page.screenshot({path:out+'/'+profile.name+'-manual.png',fullPage:true});await page.locator('#post').click();await page.locator('#notice').filter({hasText:'Продажа сохранена'}).waitFor();
  assert.equal(get('bd_sales_events_v1')[0].shiftId,'C');assert.equal(get('bd_sales_events_v1')[0].businessDate,shifts[0].date);
  await page.goto(base+'/cashier?venue='+venue);await page.locator('#cashier:not([hidden])').waitFor();await page.locator('[data-add=beer]').click();await page.reload();await page.locator('.pos-line').waitFor();await page.screenshot({path:out+'/'+profile.name+'-cashier.png',fullPage:true});await page.locator('#pay').click();await page.locator('#receipt:not([hidden])').waitFor();
  assert.equal(get('bd_sales_events_v1').length,2);assert.equal(get('bd_stock_movements').length,2);assert.equal(get('bd_assortment_v1').stockBalances[0].current,18);assert.equal(get('bd_finance_revenue').find((s:{id:string})=>s.id==='C').revenue,40);
  await page.goto(base+'/sales-import?embedded=1&venue='+venue);await page.locator('#journal-receipts').filter({hasText:'2'}).waitFor();assert.equal(await page.locator('.batch-row').count(),2);assert.equal(await page.locator('body').evaluate(n=>n.scrollWidth<=innerWidth+2),true);await page.screenshot({path:out+'/'+profile.name+'-journal.png',fullPage:true});
  await page.goto(base+'/finance?venue='+venue);await page.getByRole('heading',{name:/Финанс/}).first().waitFor();assert.equal(await page.locator('body').evaluate(n=>n.scrollWidth<=innerWidth+2),true);await page.screenshot({path:out+'/'+profile.name+'-finance.png',fullPage:true});
  await send({action:'close_shift',shiftId:'C'});await page.goto(base+'/sales-entry?venue='+venue);await page.locator('#sale').waitFor();assert.equal(await page.locator('#shift option[value=C]').count(),0);assert.equal(await page.locator('#shift option[value=D]').count(),1);
  const closed=await send({action:'post',command:{id:'closed',source:'MANUAL_GRID',shiftId:'C',lines:[{id:'l',menuItemId:'beer',quantity:1}]},previewHash:'old'});assert.equal(closed.status,409);
  failure=true;await page.goto(base+'/cashier?venue='+venue);await page.locator('#notice').filter({hasText:'QA server unavailable'}).waitFor();assert.equal(new URL(page.url()).pathname,'/cashier');assert.doesNotMatch(await page.locator('#connection').innerText(),/Нет соединения/);failure=false;
  await page.route('**/api/sales-events*',route=>route.abort('internetdisconnected'));await page.reload();await page.locator('#connection').filter({hasText:'Нет соединения'}).waitFor();assert.equal(new URL(page.url()).pathname,'/cashier');await page.screenshot({path:out+'/'+profile.name+'-network.png'});await page.unroute('**/api/sales-events*');await page.reload();await page.locator('#work:not([hidden])').waitFor();assert.match(await page.locator('#connection').innerText(),/На связи/);
  // Expiration during payment must preserve the pending idempotency key and local order.
  await page.locator('#cashier:not([hidden])').waitFor();await page.locator('[data-add=beer]').click();
  const draftKey='bd_pos_draft_v1:'+user.userId+':'+venue+':D';
  const beforeAuth=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),draftKey);assert.equal(beforeAuth.lines.length,1);
  runtime.sqlite.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z' WHERE account_id=?").run(user.userId);
  await page.locator('#pay').click();await page.waitForURL('**/login');await page.locator('input[type=email]').waitFor();
  const afterAuth=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),draftKey);assert.equal(afterAuth.id,beforeAuth.id);assert.equal(afterAuth.pending.command.id,beforeAuth.id);assert.equal(get('bd_sales_events_v1').length,2);
  runtime.sqlite.prepare('UPDATE sessions SET expires_at=? WHERE account_id=?').run(new Date(Date.now()+86400000).toISOString(),user.userId);
  // Re-establish the authenticated browser fixture at document start, after the login handoff.
  await page.evaluate(()=>sessionStorage.removeItem('qa_initialized'));
  await page.goto(base+'/cashier?venue='+venue);await page.locator('#retry:not([hidden])').waitFor();await page.locator('#retry').click();await page.locator('#receipt:not([hidden])').waitFor();
  assert.equal(get('bd_sales_events_v1').length,3);assert.equal(get('bd_sales_events_v1').find((e:{externalId:string})=>e.externalId===beforeAuth.id).shiftId,'D');assert.equal(get('bd_stock_movements').length,3);
  assert.deepEqual(errors,[]);report.push({profile:profile.name,manualOvernight:true,posOvernight:true,closedShiftGuard:true,multipleShifts:true,draftRecovery:true,authExpiryPendingRecovery:true,journal:true,financeScreen:true,overnightShiftRevenue:40,finalStock:17,server503NotLogin:true,networkFailure:true,networkRecovery:true});
 }catch(error){console.error({profile:profile.name,url:new URL(page.url()).pathname,notice:await page.evaluate(()=>document.querySelector('#notice')?.textContent),errors,requests:requests.slice(-12)});await page.screenshot({path:out+'/'+profile.name+'-failure.png'}).catch(()=>{});throw error;}finally{await context.close();}
}}
finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));runtime.close();writeFileSync(out+'/'+(diagnostic?'baseline':'results')+'.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
