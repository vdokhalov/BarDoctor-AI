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
const apiDelay = 30;
let failSave=false;
const runtime = await emptyMonthFixture({procurement:"./app/api/procurement/overview/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/procurement/overview":"procurement","/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(key==='bd_suppliers'&&req.method==='PUT'){await new Promise(r=>setTimeout(r,700));if(failSave){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Тестовая ошибка'}));return}}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/suppliers", "/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 const owner=runtime.user,venueId=runtime.venueId;
 runtime.seed('bd_suppliers',[]);
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);
 const supplier={id:'supplier-one',venueId,name:'Тестовый поставщик',currency:'MDL'},second={...supplier,id:'supplier-two',name:'Другой поставщик'};
 const doc={id:'purchase-one',venueId,supplierId:supplier.id,supplierName:supplier.name,documentNumber:'QA-30',documentType:'invoice',status:'confirmed',date:'2026-10-24',total:30,currency:'MDL',items:[]};
 runtime.seed('bd_suppliers',[supplier,second]);runtime.seed('bd_purchase_documents',[doc,{...doc,id:'purchase-two',documentNumber:'QA-290',total:290,paidAmount:100}]);
 const original=JSON.stringify(runtime.sqlite.prepare('SELECT store_key,data_json FROM domain_data WHERE account_id=? ORDER BY store_key').all(runtime.account));
 const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.method()+' '+new URL(r.url()).pathname)});
 await page.goto(base+'/suppliers?venue='+venueId+'&tab=suppliers');await page.locator('.bd-proc-supplier-row-v168').filter({hasText:supplier.name}).click();
 const toggle=()=>page.locator('.bd-proc-supplier-debt-toggle-v190');await toggle().click();assert.equal(await toggle().getAttribute('aria-expanded'),'true');
 await page.locator('.bd-proc-debt-list-v190 button').filter({hasText:'QA-30'}).click();await page.getByRole('dialog').getByText('QA-30',{exact:false}).first().waitFor();await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).last().click();await toggle().waitFor();
 console.log(JSON.stringify({afterClose:await toggle().getAttribute('aria-expanded'),url:page.url()}));
 if(!process.env.BASELINE){
 assert.equal(await toggle().getAttribute('aria-expanded'),'true');
 for(let pass=0;pass<2;pass++){await page.locator('.bd-proc-debt-list-v190 button').filter({hasText:'QA-30'}).click();await page.getByRole('dialog').getByText('QA-30',{exact:false}).first().waitFor();await page.goBack();await toggle().waitFor();assert.equal(await toggle().getAttribute('aria-expanded'),'true');await page.goForward();await page.getByRole('dialog').getByText('QA-30',{exact:false}).first().waitFor();await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).last().click();await toggle().waitFor();assert.equal(await toggle().getAttribute('aria-expanded'),'true');}
 await page.reload();await toggle().waitFor();assert.equal(await toggle().getAttribute('aria-expanded'),'true');
 await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).last().click();await page.locator('.bd-proc-supplier-row-v168').filter({hasText:second.name}).click();await toggle().waitFor();assert.equal(await toggle().getAttribute('aria-expanded'),'false');
 const other=await runtime.register('debt-other@local.test');const otherAccount=runtime.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(other.activeVenueId)!.id;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другое тестовое заведение',currency:'MDL',timezone:'UTC'}),otherAccount);
 for(const [key,value] of [['bd_suppliers',[{...supplier,venueId:other.activeVenueId}]],['bd_purchase_documents',[{...doc,venueId:other.activeVenueId}]]])runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(otherAccount,String(key),JSON.stringify(value));
 await page.evaluate(other=>{localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId))},other);
 await page.goto(base+'/suppliers?venue='+other.activeVenueId+'&tab=suppliers&supplierId='+supplier.id);await toggle().waitFor();assert.equal(await toggle().getAttribute('aria-expanded'),'false');
 assert.deepEqual(writes,[]);assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT store_key,data_json FROM domain_data WHERE account_id=? ORDER BY store_key').all(runtime.account)),original);console.log(JSON.stringify({pass:true,checks:['close restores expanded debt','repeat','back/forward','reload','other supplier collapsed','no writes']}));
 }
 await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
