import assert from "node:assert/strict";
import { closingFixture } from "../tests/helpers/month-close-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const apiDelay = 0;
const runtime = await closingFixture({storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
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
      const file = resolve("public", "." + url.pathname);
      response = file.startsWith(resolve("public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
 runtime.seed('bd_inventory_snapshots',[]);
 const otherStores=()=>JSON.stringify(runtime.sqlite.prepare("SELECT * FROM domain_data WHERE store_key <> 'bd_inventory_snapshots' ORDER BY account_id,store_key").all());
 const before=otherStores();
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/reports?venue='+venueId+'&month=2026-09&closeMonth=1');
 await page.getByRole('dialog',{name:'Мастер закрытия месяца'}).waitFor();
 const wizard=page.getByRole('dialog',{name:'Мастер закрытия месяца'});
 const saveBoundary=async(step:string,date:string,total:string)=>{
  await wizard.getByRole('button',{name:new RegExp(step)}).click();
  await wizard.getByRole('button',{name:'Внести учётные остатки',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'Учётные остатки',exact:true});await editor.waitFor();
  assert.equal(await editor.getByLabel('Дата границы').inputValue(),date);
  const amounts=editor.locator('input[inputmode="decimal"]');await amounts.first().waitFor();
  for(let index=0;index<await amounts.count();index++)await amounts.nth(index).fill(index===0?total:'0');
  await editor.getByLabel('Источник и причина подтверждения').fill('Isolated synthetic boundary regression, documented historical valuation');
  await editor.getByRole('checkbox').check();
  await editor.getByRole('button',{name:'Сохранить',exact:true}).click();await editor.waitFor({state:'hidden'});
  await wizard.getByText('Сохранённый документ от '+date+':', {exact:false}).waitFor();
 };
 await saveBoundary('Начальные остатки','2026-09-01','0');
 await saveBoundary('Конечные остатки','2026-10-01','3483');
 const preview=await(await runtime.get()).json();assert.equal(preview.report.openingInventory,0);assert.equal(preview.report.closingInventory,3483);assert.equal(preview.report.costOfGoods,720);assert.equal(preview.report.finalProfit,314);
 assert.equal(runtime.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE store_key='bd_inventory_snapshots'").get()!.n,2);
 const documents=JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE store_key='bd_inventory_snapshots'").get()!.data_json));assert.equal(documents.length,2);
 console.log(JSON.stringify({engine,width:390,fullSpa:true,realApi:true,opening:0,closing:3483,capturedCOGS:720,unchangedFinalProfit:314,audits:2,stockAndOtherStoresUnchanged:otherStores()===before}));
 await context.close();
 assert.deepEqual(errors,[]);assert.equal(otherStores(),before);
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}
