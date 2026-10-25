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
 const dialogs:string[]=[];let accept=false;page.on('dialog',async d=>{dialogs.push(d.type());if(accept)await d.accept();else await d.dismiss()});
 const dirty=()=>form().locator('.bd-dirty-state');
 await page.waitForTimeout(300);assert.equal(await dirty().isVisible(),false);
 await form().getByRole('link',{name:'Отмена',exact:true}).click();await page.waitForTimeout(300);assert.equal(dialogs.length,0);assert.equal(new URL(page.url()).pathname,'/more');
 async function open(){await page.getByRole('button',{name:/Добавить заведение/}).last().click();await form().locator('input[name=name]').waitFor();}
 await open();await form().locator('input[name=name]').fill('Локальное изменение');assert.equal(await dirty().isVisible(),true);
 await form().getByRole('link',{name:'Отмена',exact:true}).click();assert.equal(dialogs.length,1);assert.equal(await form().locator('input[name=name]').inputValue(),'Локальное изменение');
 await page.locator('bd-app-header button').first().click();assert.equal(dialogs.length,2);assert.equal(await dirty().isVisible(),true);
 await form().locator('input[name=name]').fill('');assert.equal(await dirty().isVisible(),false);
 await form().getByRole('button',{name:'Понедельник',exact:true}).click();assert.equal(await dirty().isVisible(),true);
 await form().getByRole('button',{name:'Понедельник',exact:true}).click();assert.equal(await dirty().isVisible(),false);
 await page.reload();await form().locator('input[name=name]').waitFor();assert.equal(await dirty().isVisible(),false);assert.equal(dialogs.length,2);
 await form().locator('input[name=name]').fill('Несохранённое');accept=true;
 await form().getByRole('link',{name:'Отмена',exact:true}).click();await page.waitForTimeout(300);assert.equal(dialogs.length,3);assert.equal(new URL(page.url()).pathname,'/more');
 await open();assert.equal(await dirty().isVisible(),false);
 mkdirSync('outputs/venue-create-dirty',{recursive:true});await form().locator('#create-venue-button').scrollIntoViewIfNeeded();await page.screenshot({path:'outputs/venue-create-dirty/clean-390.png'});
 assert.equal(runtime.sqlite.prepare('SELECT count(*) n FROM venues').get()!.n,total);assert.deepEqual(writes,[]);
 // A delayed/failed location directory must not absorb edits into the baseline.
 const delayed=await context.newPage();let directoryCalls=0;let delayedDialogs=0;
 delayed.on('dialog',async d=>{delayedDialogs++;await d.dismiss()});
 await delayed.route('**/venue-location-data.js*',async route=>{if(++directoryCalls===1)await route.fulfill({contentType:'application/javascript',body:''});else await route.continue()});
 await delayed.goto(base+'/venues/new?venue='+venueId);const df=delayed.frameLocator('iframe[src*="/venues/new"]');
 await df.locator('#venue-directory-retry').waitFor();assert.equal(await df.locator('.bd-dirty-state').isVisible(),false);
 await df.locator('input[name=name]').fill('До загрузки справочника');await df.locator('#venue-directory-retry').click();
 await df.locator('#venue-country option[data-code="MD"]').waitFor({state:'attached'});assert.equal(await df.locator('.bd-dirty-state').isVisible(),true);
 await df.getByRole('link',{name:'Отмена',exact:true}).click();assert.equal(delayedDialogs,1);
 await df.locator('input[name=name]').fill('');assert.equal(await df.locator('.bd-dirty-state').isVisible(),false);await delayed.close();
 // Local-only save failure then success; no production connection exists in this harness.
 await form().locator('input[name=name]').fill('Локальная проверка');await form().locator('label').filter({has:form().locator('input[value="Бар"]')}).click();
 await form().locator('#venue-country').selectOption({label:'🇲🇩 Молдова'});await form().locator('#venue-city').selectOption({label:'Тирасполь'});await form().locator('select[name=currency]').selectOption('MDL');
 await page.route('**/api/venues',async route=>{if(route.request().method()==='POST')await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Локальный сбой'})});else await route.continue()});
 await form().locator('#create-venue-button').click();await form().getByText('Локальный сбой',{exact:true}).waitFor();assert.equal(await dirty().isVisible(),true);
 accept=false;await form().getByRole('link',{name:'Отмена',exact:true}).click();assert.equal(dialogs.length,4);
 await page.unroute('**/api/venues');accept=true;await form().locator('#create-venue-button').click();await page.waitForURL(/\/home\?venue=/);assert.equal(dialogs.length,4);
 assert.equal(Number(runtime.sqlite.prepare('SELECT count(*) n FROM venues').get()!.n),Number(total)+1);
 console.log(JSON.stringify({pass:true,checks:['untouched label/exit','edited cancel/header guard','revert fields/days','reload','accept discard/reopen','no production writes','failed save retains guard','local success clears guard']}));
 }await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
