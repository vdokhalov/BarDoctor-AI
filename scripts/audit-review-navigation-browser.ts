import {GET as reviewsPage} from '../app/reviews/route';
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
const runtime = await emptyMonthFixture({activeVenue:"./app/api/access/active-venue/route",audit:"./app/api/audit/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/access/active-venue":"activeVenue","/api/audit":"audit", "/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    if(url.pathname==="/api/audit"&&url.searchParams.get("q")==="slow") await new Promise(done=>setTimeout(done,700));
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/reviews")response=reviewsPage(new Request(url));
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
try {
 const owner=runtime.user,venueId=runtime.venueId;
 runtime.sqlite.prepare("INSERT INTO audit_log(account_id,store_key,action,entity_label,actor_name,actor_role,reason,created_at) VALUES(?,'bd_tasks','create','Тест события','QA','owner','Тест','2026-10-24T12:00:00Z')").run(runtime.account);
 const id=runtime.sqlite.prepare('SELECT max(id) id FROM audit_log').get()!.id;
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});
 const page=await context.newPage();page.setDefaultTimeout(15000);const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});
 await page.route('**/api/review-layer',route=>route.request().headers()['x-venue-id']!==String(venueId)?route.fulfill({json:{success:true,data:{reviews:[],summary:{}}}}):route.fulfill({json:{success:true,data:{reviews:[{id:'test-review',text:'Долго ждали заказ',source:'other',createdAt:'2026-10-24',rating:2}],summary:{},doctorSnapshot:{status:'current',data:{recommendationDetails:[{title:'Проверить ожидание',evidence:[{reviewId:'test-review',quote:'Долго ждали заказ'}]}]}}}}}));
 await page.route('**/api/reviews/sources*',route=>route.fulfill({json:{success:true,data:{sources:[]}}}));
 await page.goto(base+'/data-control?venue='+venueId+'&tab=journal&event='+id);
 let frame=page.frameLocator('iframe');await frame.locator('#event-detail').waitFor({state:'visible'});
 await frame.locator('#event-detail header button').click();await page.waitForTimeout(700);
 const audit={url:page.url(),open:await frame.locator('#event-detail').isVisible()};console.log('AUDIT',JSON.stringify(audit));
 if(!process.env.CHECK_BASELINE){
 assert.equal(new URL(audit.url).pathname,'/data-control');assert.equal(audit.open,false);
 await page.reload();await frame.locator('.journal-event').first().waitFor();assert.equal(await frame.locator('#event-detail').isVisible(),false);
 await frame.locator('#audit-search').fill('Тест');await page.waitForTimeout(500);
 for(let i=0;i<3;i++){await frame.locator('.journal-event').first().click();await frame.locator('#event-detail').waitFor({state:'visible'});await frame.locator('#event-detail header button').click();await page.waitForTimeout(250);assert.equal(await frame.locator('#event-detail').isVisible(),false);assert.equal(await frame.locator('#audit-search').inputValue(),'Тест');assert.ok(!new URL(page.url()).searchParams.has('event'));}
 await frame.locator('.journal-event').first().click();await frame.locator('#event-detail').waitFor({state:'visible'});await page.goBack();await frame.locator('#event-detail').waitFor({state:'hidden'});await page.goForward();await frame.locator('#event-detail').waitFor({state:'visible'});
 }
 await page.goto(base+'/reviews?venue='+venueId);frame=page.frameLocator('iframe');await frame.locator('.review-evidence-link').click();await page.waitForTimeout(700);
 console.log('REVIEW',page.url());
 if(process.env.CHECK_BASELINE){assert.equal(new URL(audit.url).pathname,'/home');assert.match(page.url(),/embedded=1/);}
 else {assert.equal(audit.open,false);assert.ok(!new URL(audit.url).searchParams.has('event'));assert.ok(!new URL(page.url()).searchParams.has('embedded'));await page.reload();frame=page.frameLocator('iframe');await frame.locator('#review-test-review').waitFor();assert.ok(await page.locator('bd-app-header').count());
 await page.waitForTimeout(700);const bounds=await frame.locator('#review-test-review').evaluate(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,height:innerHeight}));assert.ok(bounds.top>=0&&bounds.bottom<=bounds.height,JSON.stringify(bounds));
 await page.goto(base+'/reviews?venue='+venueId);frame=page.frameLocator('iframe');await frame.locator('#review-search').fill('no match');await frame.locator('.review-evidence-link').click();await frame.locator('#review-test-review').waitFor();assert.equal(await frame.locator('#review-search').inputValue(),'');await page.goBack();await page.goForward();await frame.locator('#review-test-review').waitFor();
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 mkdirSync('outputs/audit-review-navigation',{recursive:true});await page.setViewportSize({width:390,height:844});await frame.locator('.review-evidence-link').click();await page.waitForTimeout(700);await page.screenshot({path:'outputs/audit-review-navigation/review-390.png'});assert.deepEqual(writes,[]);
 const created=await runtime.api.venues.POST(runtime.request(owner,'/api/venues','POST',{name:'Локальное второе',businessType:'cafe',country:'Молдова',city:'Тирасполь',currency:'MDL',timezone:'UTC'}));assert.equal(created.status,201);const otherVenue=(await created.json() as {activeVenueId:number}).activeVenueId;
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(id=>(window as any).bdVenueSwitcher.switchVenue({id}),otherVenue)]);
 await page.frameLocator('iframe').locator('#reviews-content').waitFor();assert.equal(await page.frameLocator('iframe').locator('#review-test-review').count(),0);
 await page.goto(base+'/data-control?venue='+otherVenue+'&tab=journal&event='+id);await page.frameLocator('iframe').locator('#journal-list').waitFor();assert.equal(await page.frameLocator('iframe').locator('#event-detail').isVisible(),false);assert.equal(await page.frameLocator('iframe').locator('.journal-event').count(),0);
 console.log('PASS venue switch no foreign review/event');
 console.log('PASS direct/close/reopen/reload/filter/back/forward/quote/hash/shell/scroll/viewports');}
 await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
