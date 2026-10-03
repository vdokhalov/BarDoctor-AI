import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { canonicalSnapshot, seedLegacy, object, objects, responseObject } from "../tests/helpers/warehouse-readonly-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
import { waitForSalesHostReads } from "../tests/helpers/sales-navigation-settled";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-02T12:00:00Z";
const runtimeClock = { now: fixedTime };
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route", confirm:"./app/api/purchases/confirm/route", counts:"./app/api/inventory/counts/route", evidence:"./app/api/evidence/resolve/route", valuation:"./app/api/inventory/valuation/route", products:"./app/api/inventory/products/route", activeVenue:"./app/api/access/active-venue/route" }, runtimeClock);
let repairPosts=0;
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    if(url.pathname==="/api/inventory/products" && req.method==="POST")repairPosts++;
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses", "/api/purchases/confirm":"confirm", "/api/inventory/counts":"counts", "/api/evidence/resolve":"evidence", "/api/inventory/valuation":"valuation", "/api/inventory/products":"products", "/api/access/active-venue":"activeVenue" };
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
const engine=process.env.BD_STOCK_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch({...(engine===chromium?{executablePath:process.env.BD_QA_BROWSER||await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs}:{}),headless:true});
const out='outputs/warehouse-readonly-phase3a7/'+(engine===webkit?'webkit':'chromium');mkdirSync(out,{recursive:true});
const results:unknown[]=[];
try {
 for(const width of [390,820,1280]) {
  const user=await runtime.register('warehouse-'+width+'@isolated.test'),primary=user.activeVenueId;
  const scoped=(venue:number,path:string,method='GET',body?:unknown)=>{const req=runtime.request(user,path,method,body);req.headers.set('X-Venue-Id',String(venue));return req;};
  const created=await runtime.api.venues.POST(scoped(primary,'/api/venues','POST',{name:'Legacy isolated '+width,businessType:'bar',country:'Moldova',city:'Synthetic QA',currency:'MDL',timezone:'UTC'}));
  assert.equal(created.status,201);const secondary=Number((await responseObject(created)).activeVenueId);assert.ok(Number.isInteger(secondary)&&secondary!==primary);
  for(const venue of [primary,secondary]) assert.equal((await runtime.api.bootstrap.POST(scoped(venue,'/api/auth/bootstrap','POST',{}))).status,200);
  const dataAccount=(venue:number)=>Number(runtime.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(venue)?.id);
  runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Readonly isolated '+width,currency:'MDL',timezone:'UTC',areas:['Бар'],workingDays:[0,1,2,3,4,5,6],openTime:'00:00',closeTime:'23:59'}),dataAccount(primary));
  const put=(key:string,value:unknown):void=>{runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(dataAccount(primary),key,JSON.stringify(value),fixedTime);};
  const balances=[{key:'beer',productKey:'beer',name:'QA Beer',unit:'pcs',current:2,venueId:primary},{key:'liquid',productKey:'liquid',name:'QA Liquid',unit:'l',current:5,venueId:primary},{key:'zero',productKey:'zero',name:'QA Zero',unit:'kg',current:2,venueId:primary},{productKey:'unknown',name:'QA Unknown',unit:'kg',current:10,venueId:primary}];
  put('bd_assortment_v1',{unitModelVersion:4,stockBalances:balances.map(b=>b.productKey==='unknown'?{...b,openingDocumentId:'opening'}:b.productKey==='zero'?b:{...b,lastInventoryDocumentId:'count'}),nomenclature:balances.map(b=>({id:'nom-'+b.productKey,...b,active:true,unitModelVersion:4})),recipes:[],menuItems:[]});
  put('bd_warehouses',[{id:'qa-bar',venueId:primary,name:'QA bar',active:true},{id:'qa-kitchen',venueId:primary,name:'QA kitchen',active:true}]);
  const movements=balances.slice(0,3).map((b,i)=>({id:'receipt-'+i,venueId:primary,productKey:b.productKey,productName:b.name,type:'receipt',status:'active',amount:2,unit:b.unit,costAmount:i===2?0:80,costStatus:i===2?'KNOWN_ZERO':'KNOWN',currency:'MDL',date:'2026-10-01',createdAt:'2026-10-01T10:00:00Z',sourceDocumentId:'purchase-'+i,sourceLineId:'line-'+i}));
  put('bd_stock_movements',movements);put('bd_purchase_documents',balances.slice(0,3).map((b,i)=>({id:'purchase-'+i,venueId:primary,status:'confirmed',date:'2026-10-01',currency:'MDL',unitModelVersion:4,items:[{id:'line-'+i,name:b.name,purchaseProductKey:b.productKey,quantity:2,unit:b.unit,unitPrice:i===2?0:40,lineTotal:i===2?0:80,category:'products'}]})));
  put('bd_inventory_snapshots',[{id:'count',venueId:primary,status:'completed',completedAt:fixedTime,anchorBoundary:{movements:movements.map(m=>({id:m.id}))},items:balances.filter(b=>b.productKey==='beer'||b.productKey==='liquid').map(b=>({id:'count-'+b.productKey,productKey:b.productKey,actual:b.current,unit:b.unit}))}]);
  put('bd_opening_stock_v1',[{id:'opening',venueId:primary,status:'confirmed',createdAt:fixedTime,anchorBoundary:{movements:[]},items:[{rowId:'unknown-opening',productKey:'unknown',quantity:10,stockUnit:'kg'}]}]);seedLegacy(runtime,dataAccount(secondary),secondary);
  const context=await browser.newContext({viewport:{width,height:900},timezoneId:'UTC'});await context.exposeBinding('__bdPerfObserve',()=>undefined);await context.addInitScript({path:resolve('scripts/qa/sales-navigation-probe.js')});
  await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);if(!localStorage.getItem('bd_active_venue_id'))localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId:primary});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(fixedTime));
  const settled=async()=>{await page.waitForLoadState('networkidle');await waitForSalesHostReads(page);};
  const goto=async(path:string)=>{if(await page.locator('#root').count())await waitForSalesHostReads(page);await page.goto(base+path);await settled();};
  const switchVenue=async(id:number,name:string)=>{
    const current=new URL(page.url());assert.ok(['/home','/warehouse'].includes(current.pathname));
    const target=new URL(current.pathname,base);target.searchParams.set('venue',String(id));
    // An active-ID update precedes location.replace; old-document readiness cannot prove navigation complete.
    await page.evaluate(()=>document.documentElement.setAttribute('data-qa-previous-document','true'));
    await page.locator('[data-bd-venue-trigger]').click();
    await Promise.all([
      page.waitForURL(target.href,{waitUntil:'load'}),
      page.locator('.bd-venue-row').filter({hasText:name}).click(),
    ]);
    await page.waitForFunction(expected=>localStorage.getItem('bd_active_venue_id')===String(expected)
      && document.readyState==='complete' && !document.documentElement.hasAttribute('data-qa-previous-document'),id);
    assert.equal(page.url(),target.href);assert.equal(await page.locator('html').getAttribute('data-qa-previous-document'),null);
    await settled();
  };
  try {
    // Both venue/auth and Home calendar initialization precede the canonical baseline.
    await goto('/home');await switchVenue(secondary,'Legacy isolated '+width);await goto('/home');
    await switchVenue(primary,'Readonly isolated '+width);await goto('/home');
    const before=canonicalSnapshot(runtime),postsBefore=repairPosts;
    const valuation=await runtime.api.valuation.GET(scoped(primary,'/api/inventory/valuation'));assert.equal(valuation.status,200);
    const value=await responseObject(valuation);const summary=object(value.valuation??value);
    assert.equal(summary.total,null);assert.equal(summary.knownSubtotal,280);assert.equal(summary.valuedCount,3);assert.equal(summary.unvaluedCount,1);
    const lines=objects(summary.lines);assert.equal(lines.length,4);assert.equal(lines.find(l=>l.productKey==='unknown')?.value,null);assert.equal(lines.find(l=>l.productKey==='zero')?.value,0);
    const workspaceId=Number(runtime.sqlite.prepare('SELECT workspace_id id FROM venues WHERE id=?').get(primary)?.id);
    for(const key of ['beer','liquid','zero','unknown']) {
      const ref={contractVersion:1,kind:'STOCK_QUANTITY',id:key,venueId:primary,workspaceId};
      const read=await runtime.api.evidence.GET(scoped(primary,'/api/evidence/resolve?ref='+encodeURIComponent(JSON.stringify(ref))));assert.equal(read.status,200);
      const projection=object(object((await responseObject(read)).evidence).projection);assert.equal(projection.status,key==='zero'?'PARTIAL':'KNOWN');assert.equal(projection.evidenceComplete,key!=='zero');
    }
    for(const venue of [primary,secondary]) {
      if(venue===secondary)await switchVenue(secondary,'Legacy isolated '+width);
      await goto('/warehouse');await page.reload();await settled();await goto('/home');await goto('/warehouse');
      await page.setViewportSize({width:width===390?820:390,height:900});await settled();await page.setViewportSize({width,height:900});await settled();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(venue===primary){const ui=await page.locator('body').innerText();assert.match(ui,/Не рассчитано:\s*1 из 4 поз\./);assert.match(ui,/Стоимость рассчитанной части/);assert.match(ui,/280[,.]00/);}
      await page.screenshot({path:out+'/'+width+'-'+venue+'.png',fullPage:true});
      assert.deepEqual(canonicalSnapshot(runtime),before,'Navigation preserves all canonical bytes, timestamps and audit across both venue/dataAccount scopes');assert.equal(repairPosts-postsBefore,0);
    }
    await switchVenue(primary,'Readonly isolated '+width);await goto('/warehouse');assert.deepEqual(canonicalSnapshot(runtime),before);assert.equal(repairPosts-postsBefore,0);assert.deepEqual(errors,[]);
    results.push({width,currentV4:true,legacy:true,unknown:null,knownZero:0,denominator:4,valuedCount:3,unvaluedCount:1,knownSubtotal:280,total:null,repairPosts:0,canonicalUnchanged:true,reload:true,navigation:true,venueSwitch:true});
  } catch(error){await page.screenshot({path:out+'/failure-'+width+'.png',fullPage:true});writeFileSync(out+'/failure-'+width+'.txt',await page.locator('body').innerText());throw error;}
  finally{await context.close();}
 }
 writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
} finally {await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all(pendingHandlers);runtime.close();}
