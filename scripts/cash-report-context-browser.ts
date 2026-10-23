import {salesSurfacePage} from '../tests/helpers/sales-surface-page';
import {salesEventFixture} from '../tests/helpers/sales-event-fixture';
import {seedOpenWorkday} from '../tests/helpers/pos-workday-fixture';
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit, devices } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-22T12:00:00.000Z";
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
      const assets=process.env.ARTIFACT_ROOT||"public",file = resolve(assets, "." + url.pathname);
      response = file.startsWith(resolve(assets)+"/") && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const out='outputs/cash-report-context';mkdirSync(out,{recursive:true});
try{
 const owner=await runtime.register('cash-history@isolated.test'),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тестовая касса',currency:'PMR_RUB',timezone:'UTC'}),owner.userId);
 seedOpenWorkday(runtime.sqlite,owner.userId,venueId,'2026-10-22');
 const assortment=JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('MDL','PMR_RUB'));
 for(const rows of Object.values(assortment) as any[][])for(const row of rows){row.venueId=venueId;if(row.id==='beer'){row.name='Лимонад';row.salePrice=50;}}
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_assortment_v1',JSON.stringify(assortment));
 const post=async(name:string,body:any)=>{const response=await runtime.api[name].POST(new Request(base+'/api',{method:'POST',headers:runtime.request(owner,'/api').headers,body:JSON.stringify({venueId,...body})}));const value:any=await response.json();assert(response.ok,JSON.stringify(value));return value;};
 await post('sales',{action:'open_shift',shiftId:'test-shift',name:'Тестовая смена'});
 await post('sales',{action:'close_shift',shiftId:'test-shift',actualCash:0});
 await post('sales',{action:'open_shift',shiftId:'second-shift',name:'Вторая тестовая смена'});
 await post('sales',{action:'close_shift',shiftId:'second-shift',actualCash:0});
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[];let posts=0;const postPaths:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'){posts++;postPaths.push(new URL(r.url()).pathname);}});
 const url=base+'/cashier?embedded=1&venue='+venueId;
 await page.goto(url);await page.locator('[data-view="report"]').waitFor();await page.locator('[data-view="report"]').click();await page.locator('#report-picker').waitFor();
 await page.locator('#report-picker').selectOption('test-shift');await page.waitForFunction(()=>document.querySelector('#report-picker') instanceof HTMLSelectElement&&(document.querySelector('#report-picker') as unknown as HTMLSelectElement).value==='test-shift');
 await page.reload();await page.locator('[data-view="report"]').waitFor();
 if(process.env.BASELINE==='1'){assert.equal(await page.locator('[data-view="cashier"]').getAttribute('aria-pressed'),'true');writeFileSync(out+'/baseline.json',JSON.stringify({reloadLostReportTab:true,selectedReport:'test-shift'}));console.log('BASELINE report context reset reproduced');}
 else{
 await page.locator('#report-picker').waitFor();assert.equal(await page.locator('#report-picker').inputValue(),'test-shift');await page.locator('.report-fresh').waitFor();
 await page.locator('#report-picker').selectOption('second-shift');await page.locator('.report-fresh').waitFor();assert.equal(new URL(page.url()).searchParams.get('reportShift'),'second-shift');
 await page.goBack();await page.locator('.report-fresh').waitFor();assert.equal(await page.locator('#report-picker').inputValue(),'test-shift');
 await page.goForward();await page.locator('.report-fresh').waitFor();assert.equal(await page.locator('#report-picker').inputValue(),'second-shift');
 await page.locator('[data-view="receipts"]').click();await page.goBack();await page.locator('.report-fresh').waitFor();assert.equal(await page.locator('#report-picker').inputValue(),'second-shift');
 await page.goto(url+'&view=report&reportShift=test-shift');await page.locator('.report-fresh').waitFor();assert.equal(await page.locator('#report-picker').inputValue(),'test-shift');
 await page.screenshot({path:out+'/report-390.png'});
 let releaseRace!:()=>void;const raceGate=new Promise<void>(done=>releaseRace=done);let seenRace!:()=>void;const raceSeen=new Promise<void>(done=>seenRace=done);
 await page.route('**/api/sales-events?reportShiftId=second-shift',async route=>{const response=await route.fetch();seenRace();await raceGate;await route.fulfill({response});});
 await page.locator('#report-picker').selectOption('second-shift');await raceSeen;await page.locator('#report-picker').selectOption('test-shift');await page.locator('.report-fresh').waitFor();releaseRace();await page.waitForTimeout(150);assert.equal(await page.locator('#report-picker').inputValue(),'test-shift');assert.match(await page.locator('#report-view .section-head').innerText(),/Тестовая смена/);await page.unroute('**/api/sales-events?reportShiftId=second-shift');

 await page.goto(url+'&view=report&reportShift=foreign-missing');await page.locator('#report-picker').waitFor();assert.equal(await page.locator('.report-fresh').count(),0);
 let release!:()=>void;const gate=new Promise<void>(done=>release=done);let arrived!:()=>void;const seen=new Promise<void>(done=>arrived=done);
 await page.route('**/api/sales-events?reportShiftId=test-shift',async route=>{const response=await route.fetch();arrived();await gate;await route.fulfill({response});});
 await page.goto(url+'&view=report&reportShift=test-shift',{waitUntil:'domcontentloaded'});await seen;
 await page.evaluate(()=>{localStorage.setItem('bd_active_venue_id','9999');window.dispatchEvent(new StorageEvent('storage',{key:'bd_active_venue_id'}));});release();await page.waitForTimeout(150);assert.equal(await page.locator('.report-fresh').count(),0);assert.equal(await page.locator('#report-picker').count(),0);
 await page.close();const hostRaw=await context.newPage(),host=salesSurfacePage(hostRaw);hostRaw.on('pageerror',e=>errors.push(e.message));hostRaw.on('request',r=>{if(r.method()==='POST'){posts++;postPaths.push(new URL(r.url()).pathname);}});
 await host.goto(base+'/cashier?venue='+venueId+'&view=report&reportShift=test-shift');await host.locator('.report-fresh').waitFor({timeout:15000});assert.equal(await host.locator('#report-picker').inputValue(),'test-shift');await host.locator('#report-picker').selectOption('second-shift');await host.locator('.report-fresh').waitFor();assert.equal(new URL(hostRaw.url()).searchParams.get('reportShift'),'second-shift');await hostRaw.reload();await host.locator('.report-fresh').waitFor();assert.equal(await host.locator('#report-picker').inputValue(),'second-shift');await hostRaw.close();
 writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',scenarios:['reload selected report','direct URL','selection Back/Forward','return from other tab','missing report never substitutes another','venue change discards pending report','late previous selection does not replace new report','authenticated SPA host selection and full reload'],errors,posts,postPaths,businessPosts:postPaths.filter(path=>path!=='/api/auth/bootstrap').length},null,2));console.log('PASS cash report context');}

 assert.deepEqual(postPaths.filter(path=>path!=='/api/auth/bootstrap'),[]);assert.deepEqual(errors,[]);assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
