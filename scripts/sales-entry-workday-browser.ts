import assert from "node:assert/strict";
import { salesSurfacePage } from "../tests/helpers/sales-surface-page";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = process.env.BD_OPERATIONAL_TEST_INSTANT;
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ batches:"./app/api/sales-batches/route",workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));
    else if (["/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
const browser = await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
const out="outputs/sales-entry-workday";mkdirSync(out,{recursive:true});const results:unknown[]=[];
try{for(const role of ['owner','shift_manager','cashier']){
 const owner=await runtime.register(role+'-nav-owner@isolated.test'),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тестовое заведение',currency:'MDL',timezone:'Europe/Chisinau',workingDays:{1:true,2:true,3:true,4:true,5:true,6:true,7:true},openTime:'18:00',closeTime:'04:00'}),owner.userId);
 let actor=owner;if(role!=='owner'){actor=await runtime.register(role+'-nav-user@isolated.test');const workspace=runtime.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id!;runtime.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,actor.userId);runtime.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,? ,?,'active')").run(venueId,actor.userId,role);}
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:actor.email,token:actor.token,venueId});
 const rawPage=await context.newPage(),page=salesSurfacePage(rawPage),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(base+'/more?venue='+venueId);const sales=page.getByRole('button',{name:'Продажи',exact:true});await sales.waitFor();assert.equal(await page.getByRole('button',{name:'Касса',exact:true}).count(),0);
 if(role==='owner')await page.screenshot({path:out+'/more-sales-390.png',fullPage:false});
 await sales.click();await page.waitForURL(url=>url.pathname===(role==='cashier'?'/cashier':'/sales-import'));assert.equal(new URL(page.url()).searchParams.get('venue'),String(venueId));
 if(role!=='cashier'){assert.ok(await page.locator('[data-bd-nav-key=home]').count());const iframe=page.locator('iframe');await iframe.waitFor();const frame=await(await iframe.elementHandle())!.contentFrame();assert.ok(frame);await frame!.locator('#open-cashier').waitFor();if(role==='owner')await page.screenshot({path:out+'/sales-workspace-390.png',fullPage:true});assert.ok((await frame!.locator('#open-cashier').getAttribute('href'))?.startsWith('/shifts'));await frame!.locator('.sales-navigation a[href="/cashier"]').click();}
 await page.locator('[data-workday-required]').waitFor();if(role==='cashier'){assert.equal(await rawPage.locator('[data-bd-nav-key=sales]').count(),1);assert.equal(await rawPage.locator('[data-bd-nav-key=finance]').count(),0);assert.equal(await rawPage.locator('[data-bd-nav-key=team]').count(),0);}assert.equal(await page.locator('[data-action="open-shift"]').count(),0);
 if(role==='cashier'){assert.match(await page.locator('[data-workday-required]').innerText(),/Попросите руководителя/);assert.equal(await page.locator('[data-workday-required] a').count(),0);}else{
 await page.locator('[data-workday-required] a').click();await page.locator('[data-workday-state]').waitFor();await page.locator('[data-bd-cashier-entry]').click();await page.locator('[data-workday-required]').waitFor();
 await page.goto(base+'/home?venue='+venueId);await page.locator('[data-bd-home-today]').waitFor();assert.equal(await page.locator('[data-bd-cashier-entry]').count(),0);const expected=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Chisinau',day:'numeric',month:'long',weekday:'long'}).format(new Date());assert.ok((await page.locator('.bd-home-section-title').allTextContents()).some(text=>text.includes(expected)));
 await page.goto(base+'/warehouse?venue='+venueId);await page.locator('.bd-warehouse-tabs').waitFor();assert.equal(await page.locator('.bd-warehouse-tabs').getByText('Продажи',{exact:true}).count(),0);assert.equal(await page.locator('[data-bd-warehouse-sales-entry]').count(),0);assert.ok(await page.locator('.bd-warehouse-tabs').getByText('Движения',{exact:true}).count());
 await page.goto(base+'/warehouse?venue='+venueId+'&tab=sales&batch=legacy-test');await page.waitForURL(url=>url.pathname==='/sales-import');assert.equal(new URL(page.url()).searchParams.get('batch'),'legacy-test');assert.equal(new URL(page.url()).searchParams.get('venue'),String(venueId));
 }
 assert.deepEqual(errors,[]);results.push({role,status:'PASS',venuePreserved:true,workdayRequired:true,staffCannotOpen:true,homeNoCashier:true,warehouseNoSalesEntry:true});
 }catch(error){writeFileSync(out+'/'+role+'-failure.json',JSON.stringify({errors,url:page.url(),text:await page.evaluate(()=>document.body.innerText)},null,2));await page.screenshot({path:out+'/'+role+'-failure.png',fullPage:true});throw error}finally{await context.close()}
}console.log(JSON.stringify(results));writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}
