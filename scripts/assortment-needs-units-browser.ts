import {enrichmentFixture} from "../tests/helpers/cost-enrichment-fixture";
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
 const f=await enrichmentFixture('g',100),venueId=runtime.venueId,owner=runtime.user;
 const remap=(v:any):any=>Array.isArray(v)?v.map(remap):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='venueId'?venueId:remap(x)])):v;
 const assortment:any=remap(f.sale.assortment);assortment.menuItems[0].plannedSales=20;runtime.seed('bd_assortment_v1',assortment);runtime.seed('bd_purchase_documents',remap(f.documents));
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())&&!r.url().includes('/api/auth/bootstrap'))writes.push(new URL(r.url()).pathname)});
 const output=resolve('outputs/bd06-needs-units');mkdirSync(output,{recursive:true});
 const result=await runtime.api.overview.GET(runtime.request(owner,'/api/assortment/overview?period=2026-10'));const data:any=await result.json();assert.equal(result.status,200);const row=data.analytics.needs.rows.find((x:any)=>x.productKey==='lemon-key');assert.deepEqual([row.unit,row.currentStock,row.projectedNeed,row.shortage],['kg',.8,2,1.2]);
 const url=base+'/catalog?tab=needs&venue='+venueId+'&period=2026-10';await page.goto(url);const card=page.locator('article.bd-assortment-need-card-v170').filter({hasText:'Лимон — тест'});await card.getByText('0,8 кг',{exact:true}).waitFor();assert.equal(await card.getByText('1,2 кг',{exact:true}).count(),1);assert.equal(await card.getByText('2 кг',{exact:true}).count(),2);
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:resolve(output,'needs-'+width+'.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);assert.ok(await card.locator('.metrics strong').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)),'clipped units '+width);}
 await page.reload();await card.getByText('0,8 кг',{exact:true}).waitFor();await page.getByText('Обзор',{exact:true}).click();await page.getByText('К закупке',{exact:true}).first().click();await card.getByText('1,2 кг',{exact:true}).waitFor();
 const before=structuredClone(assortment);before.stockBalances.find((x:any)=>x.key==='lemon-key').current=1;runtime.seed('bd_assortment_v1',before);await page.reload();await card.getByText('1 кг',{exact:true}).first().waitFor();assert.equal(await card.getByText('1 кг',{exact:true}).count(),3);
 const volume=(value:any)=>JSON.parse(JSON.stringify(value).replaceAll('"kg"','"l"').replaceAll('"g"','"ml"'));runtime.seed('bd_assortment_v1',volume(assortment));runtime.seed('bd_purchase_documents',volume(remap(f.documents)));await page.reload();await card.getByText('0,8 л',{exact:true}).waitFor();assert.equal(await card.getByText('1,2 л',{exact:true}).count(),1);assert.equal(await page.locator('article.bd-assortment-need-card-v170').filter({hasText:'Вода'}).getByText('8 шт.',{exact:true}).count(),1);
 const other=await runtime.register('needs-unit-other@local.test');const isolated=await runtime.api.overview.GET(runtime.request(other,'/api/assortment/overview?period=2026-10'));assert.equal((await isolated.json() as any).analytics.needs.rows.length,0);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({pass:true,widths:[390,820,1280],handler:true,quantities:[.8,2,1.2],before:[1,2,1],reload:true,navigation:true,noWrites:true,output}));await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close();}
