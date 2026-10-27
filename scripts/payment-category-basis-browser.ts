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
const apiDelay = 0;
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
 const owner=runtime.user,venueId=runtime.venueId,date='2026-09-02',currency='MDL';
 runtime.seed('bd_finance_revenue',[{id:'cash',venueId,date,revenueSource:'MANUAL_SUMMARY',manualTotalsVersion:2,revenue:240,receipts:2,currency,closingStatus:'closed',manualCostOfGoods:0}]);
 runtime.seed('bd_operational_reports_v1',[{id:'shift',venueId,date,closingStatus:'closed',payrollBreakdown:{total:0}}]);
 const goods={id:'goods',venueId,date,status:'confirmed',documentType:'receipt',expenseCategory:'products',currency,total:120,items:[{category:'products',lineTotal:120}]},service={id:'service',venueId,date,status:'confirmed',documentType:'receipt',expenseCategory:'other',currency,total:15,items:[{category:'other',lineTotal:15}]};
 const payment=(id:string,amount:number,category:string)=>({id:'pay-'+id,venueId,date,amount,category,currency,source:'purchase_payment',paymentKind:'supplier_payment',sourceDocumentId:id,purchaseId:id,status:'posted'});
 runtime.seed('bd_purchase_documents',[goods,service]);runtime.seed('bd_finance_expenses',[payment('goods',120,'products')]);
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});
 const page=await context.newPage();const writes:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(new URL(r.url()).pathname)});await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const route=base+'/reports?venue='+venueId+'&month=2026-09';const block=page.locator('.bd-monthly-expenses-v165');
 const load=async()=>{await page.goto(route);await block.getByText('Оплаты и прочие расходы',{exact:true}).waitFor();await page.waitForTimeout(500)};
 await load();const read=()=>block.innerText();console.log('UNPAID',await read());
 if(process.env.BASELINE){assert.match(await read(),/Прочее/);console.log('BASELINE reproduced unpaid service category');}
 else {
 assert.doesNotMatch(await read(),/Прочее/);assert.match(await read(),/120/);mkdirSync('outputs/rv01-payment-categories',{recursive:true});
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.waitForTimeout(500);await block.scrollIntoViewIfNeeded();await page.waitForTimeout(300);console.log('layout',width,await block.boundingBox());await page.screenshot({path:'outputs/rv01-payment-categories/unpaid-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 runtime.seed('bd_finance_expenses',[payment('goods',120,'products'),payment('service',15,'other')]);await load();assert.match(await read(),/135/);assert.match(await read(),/Прочее/);console.log('PAID',await read());
 runtime.seed('bd_purchase_documents',[goods,{...service,status:'cancelled'}]);await load();assert.match(await read(),/135/);
 runtime.seed('bd_finance_expenses',[payment('goods',120,'products'),{...payment('service',15,'other'),status:'voided',reversedAt:'2026-10-23T12:00:00Z'}]);await load();assert.match(await read(),/120/);assert.doesNotMatch(await read(),/Прочее/);
 await block.getByRole('button',{name:'Записи',exact:true}).click();await page.locator('[data-bd-expense-scope="payments"]').waitFor();assert.doesNotMatch(await page.locator('[data-bd-expense-scope="payments"]').innerText(),/Прочее/);await page.goBack();await block.waitFor();await page.reload();await block.waitFor();assert.doesNotMatch(await read(),/Прочее/);
 console.log('PASS: unpaid/paid/cancel/void, report bars/details/Back/reload, 390/820/1280');
 }
 assert.ok(writes.every(path=>path==="/api/auth/bootstrap"));assert.deepEqual(errors,[]);await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
