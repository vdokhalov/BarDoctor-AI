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
const runtime = await emptyMonthFixture({equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
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
 const owner=runtime.user,venueId=runtime.venueId,initial={id:'test-machine',name:'Тестовый холодильник',category:'other',zone:'Кухня',status:'working',venueId,maintenancePolicy:{mode:'date'}};runtime.seed('bd_equipment',[initial]);
 const read=()=>JSON.parse((runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_equipment'").get(runtime.account) as any).data_json)[0];
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(12000);const errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});
 await page.goto(base+'/equipment?venue='+venueId);await page.waitForTimeout(800);console.log('INITIAL',JSON.stringify({body:await page.locator('body').innerText(),errors}));await page.getByText('План не настроен',{exact:true}).waitFor();assert.match(await page.getByText('План не настроен',{exact:true}).locator('..').innerText(),/1/);assert.deepEqual(read(),initial);
 await page.goto(base+'/equipment/test-machine?venue='+venueId);await page.getByText('Нужна дата обслуживания',{exact:true}).first().waitFor();await page.getByRole('button',{name:'Редактировать',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Редактировать оборудование'}),save=dialog.getByRole('button',{name:'Сохранить',exact:true}),date=dialog.getByLabel('Следующее обслуживание');await save.click();await dialog.getByRole('alert').waitFor();assert.deepEqual(read(),initial);assert.deepEqual(writes,[]);
 const out=resolve('outputs/equipment-plan-date');mkdirSync(out,{recursive:true});
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await date.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'required-date-'+width+'.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const rect=await dialog.getByRole('alert').boundingBox();assert.ok(rect&&rect.width>100&&rect.x>=0&&rect.x+rect.width<=width);}
 await date.fill('2026-11-05');await save.click();await dialog.waitFor({state:'hidden'});await page.waitForTimeout(500);assert.equal(read().nextMaintenance,'2026-11-05');assert.equal(read().maintenancePolicy.nextDate,'2026-11-05');await page.reload();await page.getByRole('button',{name:'Редактировать',exact:true}).click();await date.waitFor();assert.equal(await date.inputValue(),'2026-11-05');await date.fill('2026-12-01');await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.equal(read().nextMaintenance,'2026-11-05');
 await page.getByRole('button',{name:'Редактировать',exact:true}).click();await dialog.getByLabel('План обслуживания').selectOption('as_needed');await save.click();await dialog.waitFor({state:'hidden'});await page.waitForTimeout(500);assert.equal(read().maintenancePolicy.mode,'as_needed');assert.equal(read().nextMaintenance,undefined);assert.equal(read().maintenancePolicy.nextDate,undefined);await page.reload();await page.getByText('По необходимости',{exact:true}).first().waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,widths:[390,820,1280],checks:['legacy incomplete plan counted and identified without writes','required date blocks save','valid save and reload','cancel preserves date','explicit as-needed clears hidden date'],out}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
