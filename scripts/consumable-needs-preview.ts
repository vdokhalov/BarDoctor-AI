import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-21T12:00:00Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ monthClose:"./app/api/month-close/route", workdays:"./app/api/workdays/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route" }, { now: fixedTime });
const replies:any[]=[];const failures:any[]=[];const excludedRoutes=['/api/management/cost-signals','/api/opportunities','/api/competitors/me','/api/reviews/home'];
let rejectSave = false, saveCount = 0, delaySave = false;
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"monthClose", "/api/workdays":"workdays", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(excludedRoutes.includes(url.pathname)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,success:false,code:'LOCAL_SCOPE_EXCLUDED'}));return;}
    if (key === 'bd_assortment_v1' && req.method === 'PUT') {
      saveCount++;
      if (delaySave) await new Promise(done => setTimeout(done, 700));
      if (rejectSave) {res.writeHead(503, {'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:'Проверочная ошибка сохранения'}));return;}
    }
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/catalog", "/assortment", "/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = new Response(readFileSync("dist/client/app.html"),{headers:{"Content-Type":"text/html"}});
    else {
      const emitted=resolve("dist/client", "." + url.pathname);
      const file = existsSync(emitted)?emitted:resolve("public", "." + url.pathname);
      response = (file.startsWith(resolve("public")) || file.startsWith(resolve("dist/client"))) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    if(url.pathname==="/api/month-close"){const data=await response.clone().json();replies.push({status:response.status,url:url.href,data});}
    if(response.status>=400)failures.push({url:url.pathname,status:response.status,body:(await response.clone().text()).slice(0,500)});
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture failure"); }
}
const server = createServer((req, res) => {
  const task = handleRequest(req, res); pendingHandlers.add(task);
  void task.finally(() => pendingHandlers.delete(task));
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const out='outputs/consumable-needs-artifact';mkdirSync(out,{recursive:true});
try {
 const user=await runtime.register('consumable-owner@isolated.test'), accountId=user.userId, venueId=user.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local consumable owner',currency:'MDL',timezone:'UTC'}),accountId);
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId});
 const page=await context.newPage(), errors:string[]=[], assets:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/index-BQGspy0I.*\.js/.test(r.url()))assets.push(r.url());});
 const stored=()=>JSON.parse((runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(accountId) as any)?.data_json||'{}');
 const supplies={internalItems:[{id:'napkins',name:'Салфетки',unit:'pcs',minimumStock:10,currentStock:2,onOrder:3,packageAmount:0,active:true}]};
 runtime.sqlite.prepare("INSERT OR REPLACE INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,'bd_assortment_v1',?,'2026-10-25')").run(accountId,JSON.stringify(supplies));
 const before=JSON.stringify(stored());
 try {
  const response=await runtime.api.overview.GET(runtime.request(user,'/api/assortment/overview'));assert.equal(response.status,200);const payload=await response.json() as any;assert.equal(payload.analytics.needs.rows[0].shortage,5);
  const other=await runtime.register('consumable-other@isolated.test');const isolated=await runtime.api.overview.GET(runtime.request(other,'/api/assortment/overview'));assert.equal((await isolated.json() as any).analytics.needs.rows.length,0);
  await page.goto(base+'/catalog?tab=needs');await page.locator('.bd-assortment-need-card-v170').waitFor();assert.match(await page.locator('.bd-assortment-need-card-v170').innerText(),/Салфетки/);assert.match(await page.locator('.bd-assortment-need-card-v170').innerText(),/5/);
  for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:out+'/needs-'+width+'.png',fullPage:true});}
  await page.reload();await page.locator('.bd-assortment-need-card-v170').waitFor();assert.equal(JSON.stringify(stored()),before);assert.equal(saveCount,0);assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,widths:[390,820,1280],shortage:5,minimum:10,stock:2,onOrder:3,checks:['native GET','account isolation','no menu or sales','reload'],writes:saveCount,errors}));
 } catch(error) {await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('body').innerText()).slice(-6000));throw error;}
 finally {await context.close();}
} finally {await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.sqlite.close();}
