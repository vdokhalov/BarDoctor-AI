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
const runtime = await emptyMonthFixture({storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 const makeDoc=(id:string,number:number)=>({id,number,venueId,date:'2026-10-02',status:'completed',accountingCurrency:'MDL',scope:{type:'all',label:'Все товары'},items:[{productKey:'milk',productName:'Молоко',unit:'pcs',entryUnit:'шт.',expected:1,actual:1,difference:0},{productKey:'coffee',productName:'Кофе',unit:'pcs',entryUnit:'шт.',expected:2,actual:2,difference:0}]});
 runtime.seed('bd_inventory_snapshots',[makeDoc('inventory-one',1),makeDoc('inventory-two',2)]);
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url());});
 const list='/warehouse?venue='+venueId+'&tab=counts',one=list+'&inventory=inventory-one',two=list+'&inventory=inventory-two';
 const search=page.getByPlaceholder('Найти позицию…',{exact:true}).last(),dialog=page.getByRole('dialog');
 await page.goto(base+one);await search.waitFor();await search.fill('Нет такой позиции');assert.match(page.url(),/inventoryQuery=/);await page.reload();await search.waitFor();await page.waitForTimeout(400);await page.waitForFunction(value=>{const fields=document.querySelectorAll<HTMLInputElement>('input[placeholder="Найти позицию…"]');return fields.length===1&&fields[0].value===value},'Нет такой позиции');assert.equal(await search.inputValue(),'Нет такой позиции');assert.equal(await dialog.getByText('Молоко',{exact:true}).count(),0);
 await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(new URL(page.url()).searchParams.has('inventory'),false);await page.reload();await page.getByRole('button',{name:/Инвентаризация № 1/}).waitFor();assert.equal(await dialog.count(),0);
 await page.getByRole('button',{name:/Инвентаризация № 1/}).click();await search.waitFor();await page.waitForTimeout(400);await page.waitForFunction(value=>{const fields=document.querySelectorAll<HTMLInputElement>('input[placeholder="Найти позицию…"]');return fields.length===1&&fields[0].value===value},'Нет такой позиции');assert.equal(await search.inputValue(),'Нет такой позиции');await search.fill('Молоко');
 await page.evaluate(url=>(window as any).bdNavigate(url),two);await search.waitFor();await page.waitForTimeout(400);await page.waitForFunction(value=>{const fields=document.querySelectorAll<HTMLInputElement>('input[placeholder="Найти позицию…"]');return fields.length===1&&fields[0].value===value},'');assert.equal(await search.inputValue(),'');await search.fill('Кофе');await page.goBack();await search.waitFor();await page.waitForTimeout(400);await page.waitForFunction(value=>{const fields=document.querySelectorAll<HTMLInputElement>('input[placeholder="Найти позицию…"]');return fields.length===1&&fields[0].value===value},'Молоко');assert.equal(await search.inputValue(),'Молоко');await page.goForward();await search.waitFor();await page.waitForTimeout(400);await page.waitForFunction(value=>{const fields=document.querySelectorAll<HTMLInputElement>('input[placeholder="Найти позицию…"]');return fields.length===1&&fields[0].value===value},'Кофе');assert.equal(await search.inputValue(),'Кофе');
 await search.fill('');await page.reload();await search.waitFor();await page.waitForTimeout(400);await page.waitForFunction(value=>{const fields=document.querySelectorAll<HTMLInputElement>('input[placeholder="Найти позицию…"]');return fields.length===1&&fields[0].value===value},'');assert.equal(await search.inputValue(),'');assert.equal(await dialog.getByText('Кофе',{exact:true}).count(),1);
 await page.goto(base+one+'&inventoryQueryFor=inventory-one&inventoryQueryVenue='+venueId+'&inventoryQuery=Кофе');await search.waitFor();await page.waitForTimeout(400);await page.waitForFunction(value=>{const fields=document.querySelectorAll<HTMLInputElement>('input[placeholder="Найти позицию…"]');return fields.length===1&&fields[0].value===value},'Кофе');assert.equal(await search.inputValue(),'Кофе');
 const created=await runtime.api.venues.POST(runtime.request(owner,'/api/venues','POST',{name:'Второе тестовое заведение',businessType:'cafe',country:'Test',city:'Local',currency:'MDL',timezone:'UTC'}));assert.equal(created.status,201);const second=(await created.json() as any).activeVenueId;
 await page.evaluate(venue=>localStorage.setItem('bd_active_venue_id',String(venue)),second);await page.goto(base+'/warehouse?venue='+second+'&tab=counts&inventory=inventory-one&inventoryQueryFor=inventory-one&inventoryQueryVenue='+venueId+'&inventoryQuery=Молоко');await page.getByRole('heading',{name:'Инвентаризации',exact:true}).waitFor();await page.waitForTimeout(500);assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByRole('button',{name:/Инвентаризация № 1/}).count(),0);
 const other=await runtime.register('inventory-search-other@local.test');runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другой тестовый склад',currency:'MDL',timezone:'UTC'}),other.userId);const otherContext=await browser.newContext();await otherContext.addInitScript(other=>{localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId));},other);const otherPage=await otherContext.newPage();await otherPage.goto(base+'/warehouse?venue='+other.activeVenueId+'&tab=counts');await otherPage.getByRole('heading',{name:'Инвентаризации',exact:true}).waitFor();assert.equal(await otherPage.getByRole('button',{name:/Инвентаризация № 1/}).count(),0);assert.equal(await otherPage.getByPlaceholder('Найти позицию…',{exact:true}).count(),0);await otherContext.close();
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS inventory search direct/reload/close/reopen/BackForward/clear/document switch/account separation, no writes');await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
