import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {lifecycleRuntime} from '../tests/helpers/lifecycle-runtime';
import {unknownCostFixture} from '../tests/helpers/cost-enrichment-fixture';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const f=await unknownCostFixture(),r=await lifecycleRuntime({page:'./app/sales-import/route',batches:'./app/api/sales-batches/route',enrich:'./app/api/sales-cost-enrichment/route',sales:'./app/api/sales-events/route',usersMe:'./app/api/users/me/route',restaurantMe:'./app/api/restaurants/me/route'},{now:f.input.now});
const user=await r.register('browser-cost@isolated.test'),api=r.api as any;
r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Локальная проверка',currency:'MDL',timezone:'Europe/Chisinau'}),user.userId);
for(const table of ['stock_journals','sales_event_journals'])r.sqlite.prepare('DELETE FROM '+table+' WHERE account_id=?').run(user.userId);
const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value));
for(const[k,v]of Object.entries({bd_assortment_v1:f.sale.assortment,bd_sales_events_v1:[f.input.event],bd_stock_movements:f.input.movements,bd_purchase_documents:f.input.documents,bd_finance_revenue:f.sale.revenues,bd_sales_batches:[],bd_sales_documents:[]}))put(k,v);
const before=JSON.stringify(r.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE store_key IN ('bd_sales_events_v1','bd_stock_movements','bd_finance_revenue') ORDER BY store_key").all());
let commands=0,fail=false;const unexpectedPosts:string[]=[];
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url!,'http://localhost'),chunks=[];if(req.method==='POST'&&u.pathname!=='/api/sales-cost-enrichment')unexpectedPosts.push(u.pathname);for await(const c of req)chunks.push(Buffer.from(c));
 const routes:any={'/sales-import':'page','/api/sales-batches':'batches','/api/sales-cost-enrichment':'enrich','/api/sales-events':'sales','/api/auth/bootstrap':'bootstrap','/api/users/me':'usersMe','/api/restaurants/me':'restaurantMe','/api/venues':'venues'};
 let response:Response;
 if(u.pathname==='/api/sales-cost-enrichment'){commands++;await new Promise(resolve=>setTimeout(resolve,200));if(fail){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"ok":false,"error":"Не удалось сохранить. Повторите."}');return;}}
 const route=routes[u.pathname];if(route)response=await api[route][req.method||'GET'](new Request(u,{method:req.method,headers:req.headers as HeadersInit,...(chunks.length?{body:Buffer.concat(chunks)}:{})}));
 else {const p=resolve('dist/client','.'+u.pathname),fallback=resolve('public','.'+u.pathname),file=existsSync(p)?p:fallback;if(!file.startsWith(resolve('public')+'/')&&!file.startsWith(resolve('dist/client')+'/'))throw Error('path');if(!existsSync(file)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.html':'text/html'} as any)[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));return;}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const port=(server.address() as any).port;
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:chromiumArgs});
mkdirSync('outputs/cost-enrichment',{recursive:true});
try{
 for(const width of [390,820,1280]){
  put('bd_sales_cost_enrichments_v1',[]);
  const context=await browser.newContext({viewport:{width,height:900}});await context.addInitScript(({email,token})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id','1');},{email:user.email,token:user.token});
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(`http://127.0.0.1:${port}/sales-import?venue=1&embedded=1`);await page.locator('#enrich-cost').waitFor({state:'visible',timeout:10000}).catch(async e=>{console.log('UI ERROR',errors,await page.locator('body').innerText());await page.screenshot({path:'outputs/cost-enrichment/error.png'});throw e;});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.locator('#cost-enrichment').scrollIntoViewIfNeeded();await page.screenshot({path:`outputs/cost-enrichment/before-${width}.png`});
  if(width===390){fail=true;await page.locator('#enrich-cost').click();await page.getByText('Не удалось сохранить. Повторите.',{exact:true}).waitFor();fail=false;}
  const count=commands;await page.locator('#enrich-cost').dblclick();await page.getByText('Дорасчитано чеков: 1. Остальные без изменений.',{exact:true}).waitFor();assert.equal(commands,count+1);
  await page.locator('[data-batch]').first().click();await page.getByText(/Дорасчитано по приходам до продажи/).waitFor();assert.match(await page.locator('.document-cost').innerText(),/34/);
  await page.screenshot({path:`outputs/cost-enrichment/after-${width}.png`});
  await page.reload();await page.getByText(/Дорасчитано по приходам до продажи/).waitFor();assert.match(await page.locator('.document-cost').innerText(),/34/);assert.equal(commands,count+1);
  await page.goBack();await page.locator('#editor-dialog').waitFor({state:'hidden'});
  await page.evaluate(()=>{localStorage.setItem('bd_active_venue_id','2');window.dispatchEvent(new StorageEvent('storage',{key:'bd_active_venue_id',newValue:'2'}));});
  assert.equal(await page.locator('#cost-enrichment').count(),0);assert.equal(commands,count+1);
  assert.deepEqual(errors,[]);await context.close();
 }
 assert.equal(JSON.stringify(r.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE store_key IN ('bd_sales_events_v1','bd_stock_movements','bd_finance_revenue') ORDER BY store_key").all()),before);
 assert.deepEqual(unexpectedPosts,[]);
 console.log('PASS: 390/820/1280; failure/retry/doubleclick/reload; source data unchanged; no AI');
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));r.close();}
