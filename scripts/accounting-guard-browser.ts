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
const out='outputs/accounting-fix-browser';mkdirSync(out,{recursive:true});
const runtime=await lifecycleRuntime({confirm:'./app/api/sales/confirm/route',events:'./app/api/sales-events/route',batches:'./app/api/sales-batches/route',usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route',overview:'./app/api/assortment/overview/route'});
const requests:{path:string;status:number;method:string}[]=[];const failure=false;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://localhost');let response:Response;
 if(url.pathname.startsWith('/api/')){
  const routes:Record<string,string>={'/api/sales/confirm':'confirm','/api/sales-events':'events','/api/sales-batches':'batches','/api/auth/bootstrap':'bootstrap','/api/auth/login':'login','/api/users/me':'usersMe','/api/restaurants/me':'restaurantMe','/api/venues':'venues','/api/store':'store','/api/assortment/overview':'overview'};
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

try {
for (const width of [390,820,1280]) {
 const user=await runtime.register('guard-'+width+'@isolated.test'),venue=user.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Accounting guard QA '+width,currency:'MDL'}),user.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value),new Date().toISOString());
 put('bd_assortment_v1',JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venue)));
 const response=await runtime.api.confirm.POST(runtime.request(user,'/api/sales/confirm','POST',{document:{id:'browser-report',venueId:venue,date:new Date().toISOString().slice(0,10),sourceType:'file_import',sourceSystem:'QA',currency:'MDL',totalRevenue:20,checks:1,items:[{id:'beer',name:'Beer',menuItemId:'beer',quantity:1,grossSales:20}]}}));
 assert.equal(response.status,201);const posted=await response.json() as {salesBatch:{id:string}};
 const snapshot=()=>JSON.stringify({domain:runtime.sqlite.prepare('SELECT * FROM domain_data WHERE account_id=? ORDER BY store_key').all(user.userId),audit:runtime.sqlite.prepare('SELECT * FROM audit_log WHERE account_id=? ORDER BY id').all(user.userId)});
 const context=await browser.newContext({viewport:{width,height:width===390?844:1000}}),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({email,token,venue})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venue));},{email:user.email,token:user.token,venue});
 try{
  await page.goto(base+'/sales-import?embedded=1&venue='+venue+'&batch='+encodeURIComponent(posted.salesBatch.id));
  await page.locator('#editor-dialog[open]').waitFor();const before=snapshot();await page.locator('#reverse-batch').click();await page.locator('#confirm-dialog[open]').waitFor();
  const rejected=page.waitForResponse(r=>r.url().includes('/api/sales-batches')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='reverse');
  await page.locator('#confirm-action').click();assert.equal((await rejected).status(),409);
  await page.waitForFunction(()=>document.querySelector('#notice')?.textContent?.includes('подтверждённым дневным отчётом'));
  await page.locator('#editor-body [data-editor-notice][role=alert]').waitFor();
  assert.equal(await page.locator('#editor-body [data-editor-notice]').isVisible(),true);
  const box=await page.locator('#editor-body [data-editor-notice]').boundingBox();assert.ok(box && box.x>=0 && box.x+box.width<=width,'Error must fit the viewport');
  assert.equal(snapshot(),before);assert.deepEqual(errors,[]);
  await page.screenshot({path:out+'/'+width+'-linked-report-guard.png',fullPage:true});
  report.push({width,status:409,notice:await page.locator('#notice').innerText(),noWrites:true,errors});
 }finally{await context.close();}
}
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));runtime.close();writeFileSync(out+'/results.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
