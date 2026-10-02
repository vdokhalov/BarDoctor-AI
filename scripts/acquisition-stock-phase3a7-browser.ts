import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
import { waitForSalesHostReads } from "../tests/helpers/sales-navigation-settled";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-02T12:00:00Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route", confirm:"./app/api/purchases/confirm/route", counts:"./app/api/inventory/counts/route", evidence:"./app/api/evidence/resolve/route", valuation:"./app/api/inventory/valuation/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses", "/api/purchases/confirm":"confirm", "/api/inventory/counts":"counts", "/api/evidence/resolve":"evidence", "/api/inventory/valuation":"valuation" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/shifts", "/finance", "/reports", "/salaries", "/home", "/login", "/warehouse", "/procurement", "/suppliers", "/menu", "/assortment"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve("public", "." + url.pathname);
      response = file.startsWith(resolve("public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture failure"); }
}
const server = createServer((req, res) => {
  const task = handleRequest(req, res); pendingHandlers.add(task);
  void task.finally(() => pendingHandlers.delete(task));
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const engine = process.env.BD_STOCK_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({ ...(engine === chromium ? { executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), args: chromiumArgs } : {}), headless: true });
const out = "outputs/acquisition-stock-phase3a7/" + (engine === webkit ? "webkit" : "chromium"); mkdirSync(out, { recursive: true });
const results: unknown[] = [];
try {
 for (const viewport of [{name:'mobile',width:390,height:844},{name:'tablet',width:820,height:1000},{name:'desktop',width:1280,height:800}]) {
  const user=await runtime.register(viewport.name+'@phase3a7.isolated.test'),venueId=user.activeVenueId;
  const profile={name:'Phase3a7 isolated '+viewport.name,currency:'MDL',timezone:'UTC',workingDays:[0,1,2,3,4,5,6],openTime:'00:00',closeTime:'23:59',areas:['Бар']};
  runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),user.userId);
  const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value),fixedTime);
  const get=(key:string)=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(user.userId,key)?.data_json??'null'));
  put('bd_assortment_v1',JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venueId)));put('bd_suppliers',[{id:'qa-supplier',venueId,name:'QA supplier',status:'active'}]);
  const send=async(api:string,body:object)=>{const request=runtime.request(user,'/api/qa/'+api,'POST',{venueId,...body});request.headers.set('X-Venue-Id',String(venueId));const response=await runtime.api[api].POST(request);const result=await response.json() as Record<string,unknown>;assert.ok(response.ok,JSON.stringify(result));return result;};
  const receive=async(id:string,price:number,date:string)=>{const nom=get('bd_assortment_v1').nomenclature.find((n:{name:string})=>n.name==='Beer');return send('confirm',{document:{id,venueId,supplierId:'qa-supplier',supplierName:'QA supplier',documentType:'invoice',date,currency:'MDL',source:'manual',paymentMethod:'unknown',total:2*price,items:[{id:id+'-line',name:'Beer',nomenclatureId:nom.id,purchaseProductKey:nom.productKey,quantity:2,unit:'pcs',quantityMode:'measure',unitPrice:price,lineTotal:2*price,category:'products',mappingSource:'manual'}]}});};
  await receive('price-x',20,'2026-10-01');const key=String(get('bd_stock_movements')[0].productKey);
  const count=await send('counts',{action:'create',scope:{type:'all'}}),countId=String((count.inventory as {id:string}).id),items=(count.inventory as {items:{productKey:string;expected:number}[]}).items.map(line=>({productKey:line.productKey,actual:line.expected}));
  await send('counts',{action:'save',id:countId,items});await send('counts',{action:'review',id:countId});await send('counts',{action:'finalize',id:countId});
  await send('sales',{action:'open_shift',shiftId:'stock-qa',name:'QA'});
  const command={id:'historical-sale',source:'MANUAL_GRID',shiftId:'stock-qa',lines:[{id:'historical-line',menuItemId:'beer',quantity:1}]},preview=await send('sales',{action:'preview',command});const sale=await send('sales',{action:'post',command,previewHash:preview.previewHash});
  const historicalId=String((sale.event as {id:string}).id),recorded=JSON.stringify((sale.event as {batch:object}).batch);await receive('price-y',40,'2026-10-02');assert.equal(JSON.stringify(get('bd_sales_events_v1').find((e:{id:string})=>e.id===historicalId).batch),recorded);
  const workspaceId=Number(runtime.sqlite.prepare('SELECT workspace_id id FROM venues WHERE id=?').get(venueId)!.id);
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},timezoneId:'UTC'});
  await context.exposeBinding('__bdPerfObserve',()=>undefined);await context.addInitScript({path:resolve('scripts/qa/sales-navigation-probe.js')});
  await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.clock.setFixedTime(new Date(fixedTime));
  try {
   for(const path of ['/warehouse','/procurement','/suppliers','/menu','/finance']) {
    if(await page.locator('#root').count())await waitForSalesHostReads(page);await page.goto(base+path);await page.waitForLoadState('networkidle');await page.locator('#root').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow '+path);await page.screenshot({path:out+'/'+viewport.name+path.replace('/','-')+'.png',fullPage:true});
   }
   const proof=await page.evaluate(async ({venueId,workspaceId,key,email,token,historicalId})=>{
    const headers={'X-Venue-Id':String(venueId),'X-Session-Email':email,'X-Session-Token':token};
    const result: Record<string,{evidence:{projection:Record<string,unknown>}}> = {};
    for (const [name,kind,id,partId] of [['quantity','STOCK_QUANTITY',key],['price','COST_BASIS',key],['value','STOCK_VALUATION',key],['line','PURCHASE_DOCUMENT','price-y','price-y-line'],['historical','CAPTURED_COST',historicalId,'historical-line']]) {
      const response=await fetch('/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify({contractVersion:1,kind,id,venueId,workspaceId,...(partId?{partId}:{})})),{headers});result[name]=await response.json();
    }
    return result;
   },{venueId,workspaceId,key,email:user.email,token:user.token,historicalId});
   assert.equal(proof.quantity.evidence.projection.quantity,23);assert.equal(proof.quantity.evidence.projection.evidenceComplete,true);assert.equal(proof.price.evidence.projection.value,40);assert.equal(proof.value.evidence.projection.value,920);assert.equal(proof.line.evidence.projection.sourceUnitPrice,40);assert.equal(proof.historical.evidence.projection.capturedTotalCost,20);assert.deepEqual(errors,[]);
   results.push({...viewport,venueId,isolated:true,quantity:23,lastPrice:40,valuation:920,historicalCost:20,errors});
  }catch(error){writeFileSync(out+'/failure.txt',await page.locator('body').innerText());await page.screenshot({path:out+'/failure.png',fullPage:true});console.error(JSON.stringify({errors,url:page.url()}));throw error;}finally{await context.close();}
 }
 writeFileSync(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all(pendingHandlers);runtime.close();}
