import {GET as venueCreatePage} from "../app/venues/new/route";
import {GET as integrationsPage} from "../app/integrations/route";
import {GET as notificationsPage} from "../app/notifications/route";
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
const runtime = await emptyMonthFixture({activeVenue:"./app/api/access/active-venue/route",notifications:"./app/api/notifications/route",hub:"./app/api/integration-hub/route",reviewSources:"./app/api/reviews/sources/route",archive:"./app/api/assortment/archive/route",overview:"./app/api/assortment/overview/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/access/active-venue":"activeVenue","/api/notifications":"notifications","/api/integration-hub":"hub","/api/reviews/sources":"reviewSources","/api/assortment/archive":"archive", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/venues/new")response=venueCreatePage(new Request(url));
    else if(url.pathname==="/integrations")response=integrationsPage(new Request(url));
    else if(url.pathname==="/notifications")response=notificationsPage(new Request(url));
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
try{
 const owner=runtime.user,venueId=runtime.venueId;const added=await runtime.api.venues.POST(runtime.request(owner,'/api/venues','POST',{name:'Второе локальное',businessType:'Бар',country:'Молдова',city:'Тирасполь',currency:'MDL'}));assert.equal(added.status,201);
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto(base+'/more?venue='+venueId);await page.locator('[data-bd-venue-trigger]').first().click();await page.locator('.bd-add-venue').waitFor();await page.waitForTimeout(100);await page.locator('.bd-add-venue').click();await page.waitForTimeout(600);console.log(JSON.stringify({url:page.url(),formFrames:await page.locator('iframe[src*="/venues/new"]').count(),sheet:await page.locator('[data-bd-venue-sheet]').count()}));
 if(!process.env.BASELINE){
 const form=()=>page.frameLocator('iframe[src*="/venues/new"]');await form().locator('input[name=name]').waitFor();const total=runtime.sqlite.prepare('SELECT count(*) n FROM venues').get()!.n;const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});
 await page.reload();await form().locator('input[name=name]').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('bd_active_venue_id')),String(venueId));await page.locator('bd-app-header button').first().click();await page.locator('[data-bd-venue-trigger]').first().waitFor();assert.equal(new URL(page.url()).pathname,'/more');
 for(let pass=0;pass<2;pass++){await page.locator('[data-bd-venue-trigger]').first().click();await page.locator('.bd-add-venue').waitFor();await page.waitForTimeout(50);await page.locator('.bd-add-venue').click();await form().locator('input[name=name]').waitFor();await page.goBack();await page.locator('[data-bd-venue-trigger]').first().waitFor();assert.equal(new URL(page.url()).pathname,'/more');await page.goForward();await form().locator('input[name=name]').waitFor();await page.locator('bd-app-header button').first().click();await page.locator('[data-bd-venue-trigger]').first().waitFor();}
 // The existing quick action remains a separate working entry.
 await page.getByRole('button',{name:/Добавить заведение/}).last().click();await form().locator('input[name=name]').waitFor();await page.locator('bd-app-header button').first().click();await page.locator('[data-bd-venue-trigger]').first().waitFor();
 await page.locator('[data-bd-venue-trigger]').first().click();await page.locator('[data-bd-venue-sheet] [data-close]').click();await page.waitForTimeout(150);assert.equal(await page.locator('iframe[src*="/venues/new"]').count(),0);
 const direct=await context.newPage();await direct.goto(base+'/venues/new');await direct.frameLocator('iframe').locator('input[name=name]').waitFor();await direct.close();
 assert.equal(runtime.sqlite.prepare('SELECT count(*) n FROM venues').get()!.n,total);assert.deepEqual(writes,[]);console.log(JSON.stringify({pass:true,checks:['switcher entry','quick entry','cancel/reopen','reload','back/forward','direct entry','venue unchanged','no create or other writes']}));
 }await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
