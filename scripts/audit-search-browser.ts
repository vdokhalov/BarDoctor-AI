import {GET as dataControlPage} from "../app/data-control/route";
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
const runtime = await emptyMonthFixture({audit:"./app/api/audit/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/audit":"audit", "/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    if(url.pathname==="/api/audit"&&url.searchParams.get("q")==="slow") await new Promise(done=>setTimeout(done,700));
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/data-control")response=dataControlPage(new Request(url));
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
try{
 const owner=runtime.user,venueId=runtime.venueId,phrase='Нет подтверждённых управленческих действий';
 const insert=runtime.sqlite.prepare("INSERT INTO audit_log(account_id,store_key,action,entity_label,actor_name,actor_role,reason,created_at) VALUES(?,?,'create',?,'QA','owner','Тест','2026-10-24T12:00:00Z')");
 for(const [key,label] of [['bd_tasks',phrase],['bd_equipment','Coffee "100%_"'],['bd_tasks','slow previous result'],['bd_tasks','Длинная русская фраза '+ 'подготовка '.repeat(7)]])insert.run(runtime.account,key,label);
 const before=runtime.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all();
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});
 await page.goto(base+'/data-control?embedded=1&tab=journal&venue='+venueId);const search=page.locator('#audit-search'),list=page.locator('#journal-list');await list.getByText(phrase,{exact:false}).waitFor();
 async function find(q:string,expected:string){const response=page.waitForResponse(r=>r.url().includes('/api/audit?')&&new URL(r.url()).searchParams.get('q')===q);await search.fill(q);assert.equal((await response).status(),200);await list.getByText(expected,{exact:false}).waitFor();assert.ok(await page.locator('#journal-error').evaluate(e=>e.classList.contains('hidden')))}
 await find(phrase,phrase);await page.locator('#refresh-journal').click();await list.getByText(phrase,{exact:false}).waitFor();await page.reload();await list.getByText(phrase,{exact:false}).waitFor();assert.equal(await search.inputValue(),phrase);
 await find('coffee','Coffee');await find('"100%_"','Coffee');await find('Длинная русская фраза','Длинная русская фраза '+ 'подготовка '.repeat(7).trim());
 await search.fill('missing result');await list.locator('.journal-empty').waitFor();await page.locator('#clear-search').click();await list.getByText(phrase,{exact:false}).waitFor();
 await search.fill('slow');await page.waitForRequest(r=>r.url().includes('/api/audit?')&&new URL(r.url()).searchParams.get('q')==='slow');await find('coffee','Coffee');await page.waitForTimeout(800);assert.ok(!(await list.innerText()).includes('slow previous result'));
 await page.locator('#toggle-filters').click();await page.locator('#filter-actor').selectOption('QA');await list.getByText('Coffee',{exact:false}).waitFor();await page.locator('#reset-filters').click();
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(runtime.sqlite.prepare('SELECT * FROM audit_log ORDER BY id').all(),before);
 console.log(JSON.stringify({pass:true,checks:['exact Russian phrase/retry/reload','Latin case','literal quotes percent underscore','long Russian text','empty and clear','rapid delayed old response','actor filter/reset','no writes']}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
