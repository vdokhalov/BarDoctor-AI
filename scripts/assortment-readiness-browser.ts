import {mixedFixture} from "../tests/helpers/assortment-readiness-fixture";
import assert from "node:assert/strict";
import {emptyMonthFixture} from "../tests/helpers/empty-month-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const apiDelay = 80;
const runtime = await emptyMonthFixture({archive:"./app/api/assortment/archive/route",overview:"./app/api/assortment/overview/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/assortment/archive":"archive", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/catalog", "/nomenclature", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
const engine = process.env.BD_QA_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = engine === "webkit" ? await webkit.launch({ headless: true }) : await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
try {
 const f=mixedFixture(),venueId=runtime.venueId,owner=runtime.user;
 const remap=(v:any):any=>Array.isArray(v)?v.map(remap):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='venueId'?venueId:remap(x)])):v;
 runtime.seed('bd_assortment_v1',remap(f.assortment));runtime.seed('bd_purchase_documents',remap(f.purchaseDocuments));
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())&&!r.url().includes('/api/auth/bootstrap'))writes.push(new URL(r.url()).pathname)});
 const output=resolve('outputs/bd05-readiness');mkdirSync(output,{recursive:true});
 const result=await runtime.api.overview.GET(runtime.request(owner,'/api/assortment/overview?period=2026-08'));const data:any=await result.json();assert.equal(result.status,200);assert.equal(data.analytics.menuItems[0].recipeCost,null);assert.ok(data.analytics.readiness.score<100);
 await page.goto(base+'/catalog?venue='+venueId+'&period=2026-08');await page.getByText('Себестоимость рассчитана: 0 из 1',{exact:true}).waitFor();
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:resolve(output,'overview-'+width+'.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);}
 assert.equal(await page.getByText('Расчёты готовы',{exact:true}).count(),0);
 await page.getByText('Неполная себестоимость: 1 позиция',{exact:true}).click();await page.waitForTimeout(300);assert.ok(page.url().includes('tab=menu'));assert.ok(page.url().includes('itemId='));await page.screenshot({path:resolve(output,'problem-1280.png'),fullPage:true});
 await page.goBack();await page.waitForTimeout(250);console.log('BACK_PATH',new URL(page.url()).pathname+new URL(page.url()).search);assert.equal(await page.getByText('Виски-кола',{exact:true}).count(),1);await page.getByText('Обзор',{exact:true}).click();await page.getByText('Себестоимость рассчитана: 0 из 1',{exact:true}).waitFor();await page.reload();await page.getByText('Себестоимость рассчитана: 0 из 1',{exact:true}).waitFor();
 await page.route('**/api/assortment/overview?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));await page.reload();await page.waitForTimeout(1200);await page.getByText('Себестоимость не проверена',{exact:true}).waitFor();assert.equal(await page.getByText('Текущие данные меню проверены',{exact:true}).count(),0);await page.unroute('**/api/assortment/overview?*');
 runtime.seed('bd_purchase_documents',remap([f.purchaseDocuments[0],{...f.purchaseDocuments[1],currency:'RUB'}]));await page.reload();await page.getByText('Себестоимость рассчитана: 1 из 1',{exact:true}).waitFor();assert.equal(await page.getByText('Неполная себестоимость: 1 позиция',{exact:true}).count(),0);
 await page.route('**/api/assortment/overview?*',async route=>{await new Promise(done=>setTimeout(done,1500));await route.continue();});await page.reload({waitUntil:'domcontentloaded'});await page.getByText('Проверяем себестоимость…',{exact:true}).waitFor();assert.equal(await page.getByText('Текущие данные меню проверены',{exact:true}).count(),0);await page.getByText('Себестоимость рассчитана: 1 из 1',{exact:true}).waitFor();await page.unroute('**/api/assortment/overview?*');
 const other=await runtime.register('readiness-other@local.test');const isolated=await runtime.api.overview.GET(runtime.request(other,'/api/assortment/overview?period=2026-08'));assert.equal(isolated.status,200);assert.equal((await isolated.json() as any).analytics.menuItems.length,0);
 runtime.seed('bd_assortment_v1',{});await page.reload();await page.getByText('Первичная настройка',{exact:true}).waitFor();assert.equal(await page.getByText('Текущие данные меню проверены',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({pass:true,widths:[390,820,1280],handler:true,error:true,reload:true,navigation:true,noWrites:true,output}));await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close();}
