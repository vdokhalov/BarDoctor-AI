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
const runtime = await emptyMonthFixture({workdays:"./app/api/workdays/route",procurement:"./app/api/procurement/overview/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
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
 const date='2026-10-23';
 runtime.seed('bd_operational_reports_v1',[{id:'closed-local',venueId,date,workdayStatus:'CLOSED',workdayRevision:1,workdayClosedAt:'2026-10-23T10:00:00Z',staffing:[],payrollBreakdown:{total:0},workdayPayrollDraft:{status:'COMPLETE',payrollBreakdown:{total:0}}}]);
 const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.method()+' '+new URL(r.url()).pathname)});
 await page.goto(base+'/home?venue='+venueId);await page.getByRole('button',{name:'Добавить',exact:true}).last().click();await page.getByRole('button',{name:/Закрыть смену/}).last().click();
 if(process.env.BASELINE){await page.getByText('Шаг 1 из 5 · Выручка',{exact:true}).waitFor();console.log(JSON.stringify({baseline:true,url:page.url(),legacyEditor:await page.getByText('Операционные данные дня',{exact:true}).count()}));}
 else{
 const flow=page.locator('[data-workday-state]');await flow.waitFor();assert.equal(await flow.getAttribute('data-workday-state'),'CLOSED');assert.equal(await page.getByText('Операционные данные дня',{exact:true}).count(),0);assert.equal(await flow.getByRole('button',{name:'Закрыть смену',exact:true}).count(),0);
 mkdirSync('outputs/close-shift-entry',{recursive:true});await page.screenshot({path:'outputs/close-shift-entry/closed-390.png'});
 await page.reload();await page.locator('[data-workday-state="CLOSED"]').waitFor();
 await page.getByRole('button',{name:'Добавить',exact:true}).last().click();await page.getByRole('button',{name:/Закрыть смену/}).last().click();await page.waitForTimeout(200);assert.equal(await flow.getAttribute('data-workday-state'),'CLOSED');
 await page.goBack();await page.goForward();await flow.waitFor();assert.equal(await flow.getAttribute('data-workday-state'),'CLOSED');
 runtime.seed('bd_operational_reports_v1',[{id:'open-local',venueId,date,workdayStatus:'OPEN',workdayRevision:1,workdayOpenedAt:'2026-10-23T10:00:00Z',staffing:[]}]);
 await page.goto(base+'/shifts?venue='+venueId+'&closeShift=1');await page.locator('[data-workday-state="OPEN"]').waitFor();await flow.getByRole('button',{name:'Вернуться к работе',exact:true}).click();await flow.getByRole('button',{name:'Перейти к закрытию',exact:true}).waitFor();
 runtime.seed('bd_operational_reports_v1',[]);await page.goto(base+'/shifts?venue='+venueId+'&closeShift=1');await page.locator('[data-workday-state="NEW"]').waitFor();assert.equal(await flow.getByRole('button',{name:'Закрыть смену',exact:true}).count(),0);await flow.getByRole('button',{name:'Открыть смену',exact:true}).waitFor();
 const other=await runtime.register('close-other@local.test');const account=runtime.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(other.activeVenueId)!.id;runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другое тестовое заведение',currency:'MDL',timezone:'UTC'}),account);
 await page.evaluate(other=>{localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId))},other);
 await page.goto(base+'/shifts?venue='+other.activeVenueId+'&closeShift=1');await page.locator('[data-workday-state="NEW"]').waitFor();assert.equal(new URL(page.url()).searchParams.get('venue'),String(other.activeVenueId));
 assert.deepEqual(writes,[]);console.log(JSON.stringify({pass:true,checks:['closed shortcut','reload/repeat/back/forward','open enters canonical close review','cancel returns to work','absent shift does not close/create','no writes']}));
 }
 await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
