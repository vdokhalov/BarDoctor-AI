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
 const owner=runtime.user,venueId=runtime.venueId;
 const equipment=['machine-a','machine-b'].map((id,n)=>({id,name:n?'Тестовая кофемашина':'Тестовый холодильник',createdAt:'2026-10-20T12:00:00Z',updatedAt:'2026-10-20T12:00:00Z',category:'other',zone:'Кухня',status:'working',venueId,maintenancePolicy:{mode:'as_needed'}}));runtime.seed('bd_equipment',equipment);
 const created=await runtime.api.venues.POST(runtime.request(owner,'/api/venues','POST',{name:'Второе тестовое',businessType:'cafe',country:'Test',city:'Local',currency:'MDL',timezone:'UTC'}));assert.equal(created.status,201);const second=(await created.json() as any).activeVenueId;
 const before=runtime.sqlite.prepare('SELECT account_id,store_key,data_json FROM domain_data ORDER BY account_id,store_key').all();
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(12000);
 const errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});
 const action=page.locator('body > bd-app-header .bd-app-header-action'),dialog=page.getByRole('dialog',{name:'Редактировать оборудование'});
 async function checkCard(index:number){
   await page.waitForFunction(({id})=>location.pathname==='/equipment/'+id,{id:equipment[index].id});
   await page.locator('[data-bd-equipment-detail] h1').filter({hasText:equipment[index].name}).waitFor({state:'attached'});
   await page.waitForFunction(()=>document.querySelector('body > bd-app-header .bd-app-header-action')?.getAttribute('aria-label')==='Редактировать');
   await action.click();await dialog.waitFor();assert.equal(await dialog.getByLabel('Название *',{exact:true}).inputValue(),equipment[index].name);
   await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();await dialog.waitFor({state:'hidden'});
 }
 await page.goto(base+'/equipment?tab=catalog&venue='+venueId);
 await page.locator('.bd-eq-catalog-list-v167').getByText(equipment[0].name,{exact:true}).click();await checkCard(0);await checkCard(0);
 await page.locator('body > bd-app-header .bd-app-back').click();await page.locator('.bd-eq-catalog-list-v167').getByText(equipment[1].name,{exact:true}).click();await checkCard(1);
 await page.goBack();await page.locator('.bd-eq-catalog-list-v167').waitFor();await page.goForward();await checkCard(1);
 await page.reload();await checkCard(1);
 await page.goto(base+'/equipment/machine-a?venue='+venueId);await checkCard(0);
 await page.evaluate(({venueId})=>{const w=window as any;w.bdNavigate('/equipment/machine-b?venue='+venueId);w.bdNavigate('/equipment/machine-a?venue='+venueId);},{venueId});await checkCard(0);
 const out=resolve('outputs/equipment-action');mkdirSync(out,{recursive:true});await page.screenshot({path:resolve(out,'card-390.png'),fullPage:true});
 // An unavailable card must not inherit an old card's edit action.
 await page.evaluate(({venueId})=>(window as any).bdNavigate('/equipment/missing?venue='+venueId),{venueId});await page.getByText('Оборудование не найдено',{exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('body > bd-app-header .bd-app-header-action'));
 await page.evaluate(venue=>localStorage.setItem('bd_active_venue_id',String(venue)),second);await page.goto(base+'/equipment/machine-a?venue='+second);await page.getByText('Оборудование не найдено',{exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('body > bd-app-header .bd-app-header-action'));assert.equal(await page.getByRole('dialog').count(),0);
 await page.evaluate(venue=>localStorage.setItem('bd_active_venue_id',String(venue)),venueId);await page.goto(base+'/equipment/machine-a?venue='+venueId);await checkCard(0);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);assert.deepEqual(runtime.sqlite.prepare('SELECT account_id,store_key,data_json FROM domain_data ORDER BY account_id,store_key').all(),before);
 console.log(JSON.stringify({pass:true,checks:['two list entries','edit/reopen/close without save','Back/Forward','reload','direct entry','rapid A-B-A','missing card clears action','other venue excludes original card and return restores it','no writes'],out}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
