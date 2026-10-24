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
import { GET as supplierPage } from "../app/supplier-alternatives/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-22T12:00:00.000Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ supplier:"./app/api/supplier-alternatives/route", batches:"./app/api/sales-batches/route",workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/supplier-alternatives":"supplier", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(name==="supplier"&&req.method!=="GET")throw Error("Paid search forbidden in this test");
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/supplier-alternatives")response=supplierPage(new Request(url));
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));
    else if (["/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const out='outputs/supplier-targets';mkdirSync(out,{recursive:true});
try{
 const owner=await runtime.register('supplier-targets@isolated.test'),other=await runtime.register('supplier-other@isolated.test'),venueId=owner.activeVenueId;
 const assortment:any=structuredClone(salesEventFixture().assortment);for(const rows of Object.values(assortment) as any[][])for(const row of rows)row.venueId=venueId;
 assortment.menuItems=assortment.menuItems.slice(0,1);assortment.menuItems[0].name='Borjomi 0,5 л, стекло';assortment.menuItems[0].category='category-id';assortment.nomenclature[0].name='Borjomi 0,5 л, стекло';assortment.nomenclature.push({id:'old',name:'Тест Вода',venueId,active:true,kind:'stock'});assortment.menuItems.push({id:'old',name:'Тест Вода',venueId,active:true});
 const save=()=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_assortment_v1',JSON.stringify(assortment));save();
 const get=async(user=owner)=>{const r=await runtime.api.supplier.GET(runtime.request(user,'/api/supplier-alternatives'));assert.equal(r.status,200);return await r.json() as any;};
 let result=await get();assert.match(JSON.stringify(result.searchPlan),/Borjomi 0,5 л, стекло/);assert.match(JSON.stringify(result.searchPlan),/Тест Вода/);assert.deepEqual((await get(other)).searchPlan,[]);
 const foreign=await runtime.api.supplier.GET(new Request(base+'/api/supplier-alternatives',{headers:{...Object.fromEntries(runtime.request(other,'/api').headers),'X-Venue-Id':String(venueId)}}));assert.notEqual(foreign.status,200);
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();let writes=0;page.on('request',r=>{if(r.url().includes('/api/supplier-alternatives')&&r.method()!=='GET')writes++;});const path=base+'/supplier-alternatives?embedded=1&venue='+venueId;
 const check=async()=>{assert.match(await page.locator('#supplier-search-group-picker select').innerText(),/Borjomi 0,5 л, стекло/);assert.match(await page.locator('#supplier-search-group-picker select').innerText(),/Тест Вода/);};
 await page.goto(path);await page.getByRole('button',{name:'Выбрать группу для поиска',exact:true}).click();await check();await page.screenshot({path:out+'/picker-390.png'});
 await page.getByRole('button',{name:'Выбрать группу для поиска',exact:true}).click();await check();assert.equal(await page.locator('#supplier-search-group-picker').count(),1);
 await page.reload();await page.getByRole('button',{name:'Запустить поиск',exact:true}).click();await check();assert.equal(writes,0);
 // A newly added canonical product without receipts or stock must be visible after reopening.
 assortment.stockBalances=[];assortment.menuItems=[];assortment.nomenclature.push(...['Мука пшеничная','Absolut','Салфетки','Fairy','Новая марка 0,33 л'].map((name,i)=>({id:'new-'+i,name,venueId,active:true,kind:'stock'})));save();await page.goto(path);await page.getByRole('button',{name:'Выбрать группу для поиска',exact:true}).click();for(const name of ['Мука пшеничная','Absolut','Салфетки','Fairy','Новая марка 0,33 л'])assert.ok((await page.locator('#supplier-search-group-picker select').innerText()).includes(name));assert.equal(writes,0);
 assert.deepEqual((await get(other)).searchPlan,[]);console.log('PASS native GET + compiled picker: two entry buttons, packaging, stock/no purchase, old/new, reopen/reload, account/venue isolation; zero paid calls');await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
