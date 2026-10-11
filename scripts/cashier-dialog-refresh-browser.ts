import assert from "node:assert/strict";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = process.env.BD_OPERATIONAL_TEST_INSTANT;
const apiDelay = 0;
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
try{
 const owner=await runtime.register('perf-owner@isolated.test'),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"UTC"}',owner.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));put('bd_operational_reports_v1',[{venueId,date:new Date().toISOString().slice(0,10),workdayStatus:'OPEN',staffing:[{employeeId:'a'}]}]);put('bd_assortment_v1',salesEventFixture().assortment);
 const req=runtime.request(owner,'/api/sales-events','POST',{venueId,action:'open_shift',shiftId:'perf',name:'Perf'});req.headers.set('X-Venue-Id',String(venueId));assert.equal((await runtime.api.sales.POST(req)).status,201);
 const results=[];
 for(const width of [390,412,1440]){
 const context=await browser.newContext({viewport:{width,height:915}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let embeddedNavigations=0,salesWrites=0;
 page.on('framenavigated',f=>{if(f.url().includes('embedded=1'))embeddedNavigations++});page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/sales-events')salesWrites++});
 await page.goto(base+'/cashier?venue='+venueId);const frame=page.frameLocator('iframe[data-bd-sales-surface]');await frame.locator('#work').waitFor({state:'visible'});
 const remount=async()=>{const before=embeddedNavigations;await page.evaluate(()=>window.dispatchEvent(new CustomEvent('bd:bootstrap-complete')));await frame.locator('#work').waitFor({state:'visible'});for(let n=0;embeddedNavigations===before&&n<30;n++)await page.waitForTimeout(50);assert(embeddedNavigations>before);await frame.locator('#work').waitFor({state:'visible'});};
 if(width<600)await frame.locator('[data-pane="menu"]').first().click();await frame.locator('[data-add]').first().click();await frame.locator('dialog[open]').waitFor();await frame.locator('[name="quantity"]').fill('17');
 // A profile refresh remounts the authenticated iframe. Recover input, never submit it.
 await remount();await frame.locator('dialog[open]').waitFor();assert.equal(await frame.locator('[name="quantity"]').inputValue(),'17');assert.equal(salesWrites,0);
 await frame.locator('#dialog-submit').click();await frame.locator('dialog[open]').waitFor({state:'hidden'});
 if(width<600)await frame.locator('[data-pane="order"]').first().click();assert.match(await frame.locator('.lines').innerText(),/17/);
 await frame.locator('[data-edit-quantity]').first().click();await frame.locator('[name="quantity"]').fill('12');await remount();await frame.locator('dialog[open]').waitFor();assert.equal(await frame.locator('[name="quantity"]').inputValue(),'12');await frame.locator('#dialog-submit').click();await frame.locator('dialog[open]').waitFor({state:'hidden'});
 await frame.locator('[data-action="payment"]').click();await frame.locator('[name="method"][value="CARD_EXTERNAL"]').check();await remount();await frame.locator('dialog[open]').waitFor();assert(await frame.locator('[name="method"][value="CARD_EXTERNAL"]').isChecked());assert.equal(salesWrites,0);
 await frame.locator('dialog [data-action="dismiss"]').first().click();await frame.locator('dialog[open]').waitFor({state:'hidden'});await remount();assert.equal(await frame.locator('dialog[open]').count(),0);
 // Changed authoritative price rejects recovery rather than silently paying a new total.
 await frame.locator('[data-action="payment"]').click();const assortment=salesEventFixture().assortment;(assortment.menuItems as {salePrice:number}[])[0].salePrice+=1;put('bd_assortment_v1',assortment);await remount();assert.equal(await frame.locator('dialog[open]').count(),0);put('bd_assortment_v1',salesEventFixture().assortment);
 // Cancelling a selected saved table returns to the preserved quick cart.
 await frame.locator('[data-action="create-order"]').click();await frame.locator('[name="table"]').fill('94');await frame.locator('#dialog-submit').click();await frame.locator('dialog[open]').waitFor({state:'hidden'});assert.equal(await frame.locator('.cart h2').innerText(),'Стол 94');
 await frame.locator('details.admin-actions summary').click();await frame.locator('[data-action="cancel-order"]').click();await frame.locator('[name="reason"]').fill('Isolated cancellation regression');await frame.locator('#dialog-submit').click();await frame.locator('dialog[open]').waitFor({state:'hidden'});assert.equal(await frame.locator('.cart h2').innerText(),'Быстрая продажа');assert.equal(await frame.locator('[data-action="cancel-order"]').count(),0);assert.match(await frame.locator('.lines').innerText(),/12/);
 assert.equal(salesWrites,0);assert.deepEqual(errors,[]);results.push({width,addRecovery:true,editRecovery:true,paymentRecovery:true,cancelDoesNotRestore:true,changedPriceDoesNotRestore:true,noAutomaticPayment:true,cancelledSelectionCleared:true,quickDraftPreserved:true,embeddedNavigations});await context.close();
 }
 console.log(JSON.stringify({fixture:'isolated real API / same-context bootstrap refresh',results}));

}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}
