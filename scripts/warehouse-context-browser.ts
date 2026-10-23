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
      const file = resolve(process.env.ARTIFACT_ROOT||"public", "." + url.pathname);
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
 const user=await runtime.register('stock-context@local.test'),primary=user.activeVenueId;
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value));
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тестовый склад',currency:'MDL',timezone:'UTC'}),user.userId);
 const stock={key:'milk',productKey:'milk',name:'Молоко',unit:'l',current:5,venueId:primary};put('bd_assortment_v1',{unitModelVersion:4,stockBalances:[stock],nomenclature:[{...stock,id:'nom-milk',active:true,unitModelVersion:4}],recipes:[],menuItems:[]});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({user,primary})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(primary));},{user,primary});
 const page=await context.newPage();const errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url());});
 await page.goto(base+'/warehouse?venue='+primary);
 const search=page.getByLabel('Найти товар на складе',{exact:true}),group=page.getByLabel('Группировка остатков',{exact:true});
 await search.fill('Молоко');await group.selectOption('list');await page.reload();await search.waitFor();assert.equal(await search.inputValue(),'Молоко');console.log('search reload PASS');assert.equal(await group.inputValue(),'list');console.log('group reload PASS');
 await page.goto(base+'/warehouse?venue='+primary+'&q=Кофе&group=categories');await search.waitFor();assert.equal(await search.inputValue(),'Кофе');assert.equal(await group.inputValue(),'categories');
 await group.selectOption('subcategories');await page.goBack();await group.waitFor();assert.equal(await group.inputValue(),'categories');await page.goForward();await group.waitFor();assert.equal(await group.inputValue(),'subcategories');
 await page.goto(base+'/warehouse?venue='+primary+'&group=invalid');await group.waitFor();assert.equal(await group.inputValue(),'sections');assert.equal(await search.inputValue(),'');
 await page.goto(base+'/warehouse?venue='+primary+'&q=Молоко&group=list');await search.waitFor();
 await page.getByText('Движения',{exact:true}).click();await page.getByText('Остатки',{exact:true}).click();await group.waitFor();assert.equal(await group.inputValue(),'list');assert.equal(await search.inputValue(),'Молоко');
 const other=await runtime.register('stock-context-other@local.test');runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другой склад',currency:'MDL',timezone:'UTC'}),other.userId);
 const otherContext=await browser.newContext();await otherContext.addInitScript(other=>{localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId));},other);
 const otherPage=await otherContext.newPage();await otherPage.goto(base+'/warehouse?venue='+other.activeVenueId);await otherPage.getByLabel('Группировка остатков',{exact:true}).waitFor();assert.equal(await otherPage.getByLabel('Группировка остатков',{exact:true}).inputValue(),'sections');assert.equal(await otherPage.getByLabel('Найти товар на складе',{exact:true}).inputValue(),'');assert.equal(await otherPage.getByText('Молоко',{exact:true}).count(),0);await otherContext.close();
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS warehouse context');await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
