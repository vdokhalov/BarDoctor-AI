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
const runtime = await emptyMonthFixture({equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 const owner=runtime.user,venueId=runtime.venueId,doc={id:'purchase-local',venueId,supplierName:'Тестовый поставщик',documentNumber:'12',documentType:'invoice',status:'confirmed',date:'2026-10-20',total:290,currency:'MDL',paymentMethod:'unknown',items:[]},payment={id:'payment-100',venueId,date:'2026-10-24',amount:100,currency:'MDL',description:'Оплата поставщику · Тестовый поставщик',supplierName:'Тестовый поставщик',source:'purchase_payment',paymentKind:'supplier_payment',sourceDocumentId:doc.id,purchaseId:doc.id,moneySourceName:'Банковский счёт · перевод',paymentMethod:'transfer',status:'posted',category:'products'};
 runtime.seed('bd_purchase_documents',[doc]);runtime.seed('bd_finance_expenses',[payment,{...payment,id:'payment-190',amount:190,date:'2026-10-25'},{...payment,id:'payment-unknown',amount:null,date:null,moneySourceName:null,paymentMethod:null,sourceDocumentId:'missing',purchaseId:'missing'}]);
 const original=JSON.stringify(runtime.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE account_id=? ORDER BY store_key").all(runtime.account));
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(20000);const errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});
 const path='/finance?venue='+venueId+'&month=2026-10&view=expenses&paymentId=payment-100',dialog=()=>page.getByRole('dialog',{name:'Платёж поставщику',exact:true});
 await page.goto(base+path);await dialog().getByText('Банковский счёт · перевод',{exact:true}).waitFor();assert.match(await dialog().innerText(),/100/);assert.ok(!(await dialog().innerText()).includes('290'));await dialog().getByText('24.10.2026',{exact:true}).waitFor();
 const out=resolve('outputs/supplier-payment-detail');mkdirSync(out,{recursive:true});for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:out+'/payment-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 await page.reload();await dialog().getByText('24.10.2026',{exact:true}).waitFor();await dialog().getByRole('button',{name:'Открыть закупку № 12'}).click();await page.getByRole('dialog').getByText('Итого по документу',{exact:true}).waitFor();assert.match(await page.getByRole('dialog').innerText(),/290/);await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).last().click();await dialog().getByText('24.10.2026',{exact:true}).waitFor();assert.ok(page.url().includes('month=2026-10'));await page.goBack();await page.getByRole('dialog').getByText('Итого по документу',{exact:true}).waitFor();await page.goForward();await dialog().getByText('24.10.2026',{exact:true}).waitFor();
 await page.goto(base+path.replace('payment-100','payment-190'));await dialog().getByText('25.10.2026',{exact:true}).waitFor();assert.match(await dialog().innerText(),/190/);await page.goto(base+path.replace('payment-100','payment-unknown'));await dialog().getByText('Связанная закупка недоступна',{exact:true}).waitFor();assert.match(await dialog().innerText(),/Не указана/);
 await page.goto(base+path.replace('payment-100','foreign'));await dialog().getByText('Платёж недоступен',{exact:true}).waitFor();await dialog().getByRole('button',{name:'Закрыть',exact:true}).last().click();await page.locator('.bd-finance-record-main').filter({hasText:'100'}).first().click();await dialog().getByText('24.10.2026',{exact:true}).waitFor();assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);assert.equal(JSON.stringify(runtime.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE account_id=? ORDER BY store_key").all(runtime.account)),original);console.log(JSON.stringify({pass:true,widths:[390,820,1280],checks:['own amount/date/source','source purchase separately','reload/back/forward','multiple payments','unknown fields','no writes'],out}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
