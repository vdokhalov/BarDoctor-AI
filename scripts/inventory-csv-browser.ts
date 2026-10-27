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
const runtime = await emptyMonthFixture({scan:"./app/api/inventory/scan/route",counts:"./app/api/inventory/counts/route",archive:"./app/api/assortment/archive/route",overview:"./app/api/assortment/overview/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/inventory/scan":"scan","/api/inventory/counts":"counts","/api/assortment/archive":"archive", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
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
 const f=await enrichmentFixture(),venueId=runtime.venueId,owner=runtime.user;
 const remap=(v:any):any=>Array.isArray(v)?v.map(remap):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='venueId'?venueId:remap(x)])):v;
 runtime.seed('bd_assortment_v1',remap(f.sale.assortment));
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())&&!r.url().includes('/api/auth/bootstrap'))writes.push(new URL(r.url()).pathname)});
 const output=resolve('outputs/bd07-inventory-csv');mkdirSync(output,{recursive:true});
 await page.goto(base+'/warehouse?venue='+venueId+'&tab=counts');await page.waitForTimeout(800);
 const upload=page.locator('input[type=file][accept*=".csv"]').first();
 await upload.setInputFiles({name:'inventory.csv',mimeType:'text/csv',buffer:Buffer.from('name;quantity;unit\nВода;8;шт\nЛимон — тест;bad;кг')});
 await page.getByText('Исправьте строки в файле и загрузите его снова',{exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Начать подсчёт',exact:true}).last().isDisabled());await page.screenshot({path:resolve(output,'invalid-390.png'),fullPage:true});await page.getByRole('button',{name:'Закрыть',exact:true}).last().click();
 await upload.setInputFiles({name:'inventory.csv',mimeType:'text/csv',buffer:Buffer.from('name;quantity;unit\nВода;8;шт\nЛимон — тест;0,8;кг')});await page.getByText('Распознано из ведомости: 2 поз.',{exact:true}).last().waitFor();
 const start=page.getByRole('button',{name:'Начать подсчёт',exact:true}).last();if(await start.isDisabled())await page.getByRole('option').first().click();await start.click();
 const lemon=page.getByRole('spinbutton',{name:'Фактический остаток Лимон — тест',exact:true}).last();await lemon.waitFor();assert.equal(await lemon.inputValue(),'0.8');assert.equal(await page.getByRole('spinbutton',{name:'Фактический остаток Вода',exact:true}).last().inputValue(),'8');
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:resolve(output,'count-'+width+'.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.reload();await page.waitForTimeout(1500);await page.getByText('Продолжить',{exact:true}).click();await page.getByRole('spinbutton',{name:'Фактический остаток Лимон — тест',exact:true}).last().waitFor();assert.equal(await page.getByRole('spinbutton',{name:'Фактический остаток Лимон — тест',exact:true}).last().inputValue(),'0.8');assert.ok(writes.every(p=>['/api/inventory/scan','/api/inventory/counts'].includes(p)));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,widths:[390,820,1280],unresolvedVisible:true,invalidBlocked:true,counts:[8,.8],noAI:true,output}));await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close();}
