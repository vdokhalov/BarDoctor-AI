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

    else if (["/about", "/terms", "/privacy", "/catalog", "/nomenclature", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 const owner=runtime.user,venueId=runtime.venueId;runtime.seed('bd_assortment_v1',{nomenclature:[{id:'nom-napkin',productKey:'napkin',name:'Тестовые салфетки',active:true,venueId,unit:'pcs'}],menuItems:[],recipes:[]});
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('dialog',async d=>{console.log('PROMPT',d.message());await d.dismiss()});page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});
 const terms=()=>page.getByRole('heading',{name:'Условия тестирования',exact:true});
 for(let pass=0;pass<2;pass++){
 await page.goto(base+'/about?venue='+venueId);await page.getByRole('link',{name:'Условия тестирования →'}).click();await terms().waitFor();await page.goBack();await page.getByRole('link',{name:'Условия тестирования →'}).waitFor();await page.goForward();await terms().waitFor();await page.reload();await terms().waitFor();await page.getByRole('link',{name:'Назад',exact:true}).click();await page.getByRole('link',{name:'Условия тестирования →'}).waitFor();assert.equal(new URL(page.url()).pathname,'/about');assert.equal(new URL(page.url()).searchParams.get('venue'),String(venueId));
 }
 await page.goto(base+'/terms?venue='+venueId+'&returnTo=https://outside.invalid');await terms().waitFor();await page.getByRole('link',{name:'Назад',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/about');
 for(let pass=0;pass<2;pass++){
 await page.goto(base+'/nomenclature?venue='+venueId+'&view=all');await page.getByText('Тестовые салфетки',{exact:true}).click();await page.getByRole('button',{name:'Открыть связанные позиции меню: 0'}).click();await page.locator('bd-app-header').getByText('Ассортимент и техкарты',{exact:true}).waitFor();
 assert.equal(new URL(page.url()).searchParams.get('returnItem'),'napkin');await page.goBack();await page.getByRole('button',{name:'Открыть связанные позиции меню: 0'}).waitFor();assert.equal(new URL(page.url()).searchParams.get('item'),'napkin');await page.goForward();await page.locator('bd-app-header').getByText('Ассортимент и техкарты',{exact:true}).waitFor();await page.reload();await page.locator('bd-app-header').getByText('Ассортимент и техкарты',{exact:true}).waitFor();await page.locator('bd-app-header button').first().click();await page.getByRole('button',{name:'Открыть связанные позиции меню: 0'}).waitFor();assert.equal(new URL(page.url()).searchParams.get('item'),'napkin');assert.equal(new URL(page.url()).searchParams.get('venue'),String(venueId));await page.reload();await page.getByRole('button',{name:'Открыть связанные позиции меню: 0'}).waitFor();
 }
 const direct=await context.newPage();await direct.goto(base+'/catalog?venue='+venueId+'&returnTo=nomenclature&returnItem=napkin');await direct.locator('bd-app-header').getByText('Ассортимент и техкарты',{exact:true}).waitFor();await direct.locator('bd-app-header button').first().click();await direct.getByRole('button',{name:'Открыть связанные позиции меню: 0'}).waitFor();await direct.close();
 await page.goto(base+'/catalog?venue='+venueId+'&returnTo=nomenclature&returnItem=foreign');await page.locator('bd-app-header').getByText('Ассортимент и техкарты',{exact:true}).waitFor();await page.locator('bd-app-header button').first().click();await page.waitForTimeout(300);assert.equal(await page.getByRole('button',{name:'Открыть связанные позиции меню: 0'}).count(),0);
 const other=await runtime.register('legal-other@local.test');const otherAccount=runtime.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(other.activeVenueId)!.id;runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другой тестовый аккаунт',currency:'MDL',timezone:'UTC'}),otherAccount);
 const isolated=await browser.newContext();await isolated.addInitScript(other=>{localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId))},other);const otherPage=await isolated.newPage();await otherPage.goto(base+'/catalog?venue='+other.activeVenueId+'&returnTo=nomenclature&returnItem=napkin');await otherPage.locator('bd-app-header').getByText('Ассортимент и техкарты',{exact:true}).waitFor();await otherPage.locator('bd-app-header button').first().click();await otherPage.waitForTimeout(500);assert.equal(await otherPage.getByText('Тестовые салфетки',{exact:true}).count(),0);assert.equal(new URL(otherPage.url()).searchParams.get('venue'),String(other.activeVenueId));await isolated.close();
 const anonymous=await browser.newContext(),anon=await anonymous.newPage();await anon.goto(base+'/terms?returnTo=https://outside.invalid');await anon.getByRole('link',{name:'Назад',exact:true}).waitFor();assert.equal(await anon.getByRole('link',{name:'Назад',exact:true}).getAttribute('href'),'/login');await anonymous.close();assert.deepEqual(writes,[]);console.log(JSON.stringify({pass:true,checks:['terms owner back','repeat','browser back/forward','reload','catalog exact item and venue','direct entry','unknown item not substituted','anonymous safe fallback','no writes']}));
 await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
