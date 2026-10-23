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
 const owner=runtime.user,venueId=runtime.venueId,context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);const errors:string[]=[],writes:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(new URL(r.url()).pathname)});
 for(const [path,query,selector,overview] of [['/integrations','flow=onec','[data-integration-view="onec"]','[data-integration-view="overview"]'],['/notifications','view=category&category=incident','[data-notification-view="category"]','[data-notification-view="overview"]']]){
  await page.goto(base+path+'?venue='+venueId+'&'+query);const frame=page.frameLocator('iframe');await frame.locator(selector).waitFor({state:'visible'});const before=await page.evaluate(()=>({url:location.href,title:document.querySelector('bd-app-header')?.textContent,buttons:[...document.querySelectorAll('bd-app-header button')].map(b=>({text:b.textContent,label:b.getAttribute('aria-label')}))}));console.log('BEFORE',JSON.stringify(before));await frame.locator('body').evaluate(body=>(body as any).probe='same-document');await page.locator('bd-app-header button[aria-label^="Назад"]').click();await page.waitForTimeout(400);console.log('AFTER',JSON.stringify({url:page.url(),bodyVisible:await frame.locator(selector).isVisible(),overview:await frame.locator(overview).isVisible()}));if(!process.env.CHECK_BACK_BASELINE){
   assert.equal(await frame.locator(overview).isVisible(),true);assert.equal(await frame.locator('body').evaluate(body=>(body as any).probe),'same-document');assert.match(await page.locator('bd-app-header').innerText(),path==='/integrations'?/Интеграции/:/Уведомления/);assert.equal(await frame.locator(selector).isVisible(),false);assert.ok(!page.url().includes('flow=')&&!page.url().includes('view='));
   await frame.locator('body').evaluate(body=>(body as any).probe='same-document');
   for(let pass=0;pass<2;pass++){
    if(path==='/integrations'){await frame.locator('#open-catalog').click();await frame.locator('[data-system="onec"]').click();}else await frame.locator('a[href*="category=incident"]').click();
    await frame.locator(selector).waitFor({state:'visible'});await page.locator('bd-app-header button[aria-label^="Назад"]').click();await frame.locator(overview).waitFor({state:'visible'});assert.equal(await frame.locator('body').evaluate(body=>(body as any).probe),'same-document');
   }
   await page.evaluate(url=>(window as any).bdNavigate(url),path+'?venue='+venueId+'&'+query);await frame.locator(selector).waitFor({state:'visible'});await page.goBack();await frame.locator(overview).waitFor({state:'visible'});await page.goForward();await frame.locator(selector).waitFor({state:'visible'});assert.equal(await frame.locator('body').evaluate(body=>(body as any).probe),'same-document');
  }else assert.equal(await frame.locator(selector).isVisible(),true);
 }

 if(!process.env.CHECK_BACK_BASELINE){
 const createdResponse=await runtime.api.venues.POST(runtime.request(owner,'/api/venues','POST',{name:'Второе тестовое',businessType:'cafe',country:'Молдова',city:'Тирасполь',currency:'MDL',timezone:'UTC'}));assert.equal(createdResponse.status,201);const created=await createdResponse.json() as {activeVenueId:number};
 for(const newVenue of [created.activeVenueId,venueId]){await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(id=>(window as any).bdVenueSwitcher.switchVenue({id}),newVenue)]);await page.goto(base+'/integrations?venue='+newVenue+'&flow=onec',{waitUntil:'domcontentloaded'});console.log('VENUE',newVenue,page.url());const f=page.frameLocator('iframe');await f.locator('[data-integration-view="onec"]').waitFor({state:'visible'});assert.equal(await f.locator('body').evaluate(()=>new URL(location.href).searchParams.get('venue')),String(newVenue));await page.locator('bd-app-header button[aria-label^="Назад"]').click();await f.locator('[data-integration-view="overview"]').waitFor({state:'visible'});assert.equal(new URL(page.url()).searchParams.get('venue'),String(newVenue));}
 const other=await runtime.register('subview-other@local.test'),otherAccount=Number((runtime.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(other.activeVenueId) as any).id);runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другой аккаунт',currency:'MDL',timezone:'UTC',trackingStartDate:'2026-10-01'}),otherAccount);
 const isolated=await browser.newContext({viewport:{width:390,height:844}});await isolated.addInitScript(({other})=>{localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId))},{other});
 for(const route of ['/integrations?flow=onec','/notifications?view=category&category=incident']){const fresh=await isolated.newPage();await fresh.goto(base+route+'&venue='+other.activeVenueId);const f=fresh.frameLocator('iframe'),kind=route.startsWith('/integrations')?'integration':'notification';await f.locator('[data-'+kind+'-view="'+(kind==='integration'?'onec':'category')+'"]').waitFor({state:'visible'});await fresh.locator('bd-app-header button[aria-label^="Назад"]').click();await f.locator('[data-'+kind+'-view="overview"]').waitFor({state:'visible'});assert.equal(new URL(fresh.url()).searchParams.get('venue'),String(other.activeVenueId));await fresh.close();}await isolated.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes.filter(path=>path!=='/api/access/active-venue'),[]);console.log(JSON.stringify({pass:true,errors,writes}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
