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

    else if (url.pathname.startsWith("/equipment/") || ["/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 runtime.setNow('2026-10-25T12:00:00Z');
 const owner=runtime.user,venueId=runtime.venueId,initial={id:'test-machine',name:'Тестовый холодильник',category:'kitchen',zone:'Кухня',status:'working',venueId,createdAt:'2026-10-01T10:00:00Z',updatedAt:'2026-10-01T10:00:00Z',model:'Модель 1',installationDate:'2026-10-01',maintenancePolicy:{mode:'interval_days',interval:7}};
 runtime.seed('bd_equipment',[initial,{...initial,id:'other-machine',name:'Другая техника'}]);runtime.seed('bd_equipment_history',[]);runtime.seed('bd_equipment_work_orders',[{id:'maintenance-1',equipmentId:initial.id,venueId,kind:'maintenance',status:'fixed',title:'Плановое ТО',result:'Обслуживание выполнено',createdAt:'2026-10-25T10:00:00Z',updatedAt:'2026-10-25T10:00:00Z'}]);
 const read=(key='bd_equipment')=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(runtime.account,key)!.data_json));
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>console.log('PAGEERROR',e.message));page.on('response',r=>{if(r.status()>=400)console.log('HTTPERROR',r.status(),r.url())});const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(new URL(r.url()).pathname)});const out=resolve('outputs/equipment-maintenance-preserve');mkdirSync(out,{recursive:true});
 try{
 await page.goto(base+'/equipment/test-machine?venue='+venueId);await page.getByRole('button',{name:'Проверить результат',exact:true}).click();const work=page.getByRole('dialog',{name:'Работа с оборудованием'});await work.getByLabel('Проверка результата *',{exact:true}).fill('Проверено после обслуживания');const verified=page.waitForResponse(r=>r.url().includes('/api/equipment/work-orders')&&r.request().method()==='POST');await work.getByRole('button',{name:'Сохранить этап',exact:true}).click();assert.equal((await verified).status(),200);await work.waitFor({state:'hidden'});
 const maintained=read()[0],history=read('bd_equipment_history'),orders=read('bd_equipment_work_orders');assert.equal(maintained.lastMaintenance,'2026-10-25');assert.equal(maintained.nextMaintenance,'2026-11-01');console.log('MAINTAINED',JSON.stringify({last:maintained.lastMaintenance,next:maintained.nextMaintenance,history:history.length}));
 await page.locator('button[aria-label="Редактировать"]:visible').last().click();const dialog=page.getByRole('dialog',{name:'Редактировать оборудование'});await dialog.getByLabel('Модель',{exact:true}).fill('Модель 2');await dialog.getByLabel('Дата установки / покупки').fill('2026-09-20');const saved=page.waitForResponse(r=>r.url().includes('/api/store/bd_equipment')&&r.request().method()==='PUT');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();assert.equal((await saved).status(),200);await dialog.waitFor({state:'hidden'});
 assert.equal(read()[0].lastMaintenance,maintained.lastMaintenance);assert.equal(read()[0].nextMaintenance,maintained.nextMaintenance);assert.deepEqual(read('bd_equipment_history'),history);assert.deepEqual(read('bd_equipment_work_orders'),orders);
 const untouched=read()[1];const assertMaintenance=()=>{assert.equal(read()[0].lastMaintenance,'2026-10-25');assert.equal(read()[0].nextMaintenance,'2026-11-01');assert.deepEqual(read()[0].maintenancePolicy,maintained.maintenancePolicy);assert.deepEqual(read()[1],untouched);assert.deepEqual(read('bd_equipment_history'),history);assert.deepEqual(read('bd_equipment_work_orders'),orders)};
 for(const width of [390,820,1280]){
  await page.setViewportSize({width,height:900});await page.reload();await page.locator('button[aria-label="Редактировать"]:visible').last().click();await dialog.getByLabel('Модель',{exact:true}).fill('Модель '+width);await dialog.getByLabel('Модель',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/editor-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const response=page.waitForResponse(r=>r.url().includes('/api/store/bd_equipment')&&r.request().method()==='PUT');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();assert.equal((await response).status(),200);await dialog.waitFor({state:'hidden'});assertMaintenance();await page.reload();await page.locator('button[aria-label="Редактировать"]:visible').last().waitFor();await page.locator('.bd-eq-detail-card-v167').filter({hasText:'Последнее ТО'}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/maintained-'+width+'.png'});
 }
 await page.locator('button[aria-label="Редактировать"]:visible').last().click();await dialog.getByLabel('Дата установки / покупки').fill('2026-09-15');const dateSaved=page.waitForResponse(r=>r.url().includes('/api/store/bd_equipment')&&r.request().method()==='PUT');await dialog.getByRole('button',{name:'Сохранить',exact:true}).dblclick();assert.equal((await dateSaved).status(),200);await dialog.waitFor({state:'hidden'});assertMaintenance();
 await page.locator('button[aria-label="Редактировать"]:visible').last().click();await dialog.getByLabel('Модель',{exact:true}).fill('Не сохранять');await dialog.getByLabel('Дата установки / покупки').fill('2026-11-15');await dialog.getByText('Дата установки позже последнего ТО. Проверьте дату.',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.notEqual(read()[0].model,'Не сохранять');assertMaintenance();
 await page.locator('button[aria-label="Редактировать"]:visible').last().click();await dialog.getByLabel('Модель',{exact:true}).fill('');await dialog.getByLabel('Дата установки / покупки').fill('');const emptySaved=page.waitForResponse(r=>r.url().includes('/api/store/bd_equipment')&&r.request().method()==='PUT');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();assert.equal((await emptySaved).status(),200);await dialog.waitFor({state:'hidden'});assertMaintenance();assert.equal(read()[0].model,undefined);assert.equal(read()[0].installationDate,undefined);
 await page.goto(base+'/equipment/other-machine?venue='+venueId);await page.locator('.bd-eq-passport-hero-v167 strong').filter({hasText:'Другая техника'}).waitFor();await page.waitForTimeout(400);await page.goBack();await page.waitForTimeout(400);console.log('BROWSER_BACK_PATH',new URL(page.url()).pathname);assertMaintenance();await page.goto(base+'/equipment/test-machine?venue='+venueId);await page.locator('button[aria-label="Редактировать"]:visible').last().waitFor();await page.reload();await page.locator('button[aria-label="Редактировать"]:visible').last().waitFor();assertMaintenance();
 const outsider=await runtime.register('equipment-maintenance-other@local.test');const denied=await runtime.api.equipmentWork.POST(runtime.request(outsider,'/api/equipment/work-orders','POST',{workOrder:{id:'maintenance-1',equipmentId:'test-machine',kind:'maintenance',status:'verified',title:'Wrong venue',verificationNote:'No'}}));assert.equal(denied.status,404);assertMaintenance();
 assert.ok(writes.every(path=>['/api/store/bd_equipment','/api/equipment/work-orders'].includes(path)),JSON.stringify(writes));console.log(JSON.stringify({pass:true,widths:[390,820,1280],last:'2026-10-25',next:'2026-11-01',checks:['verified maintenance→edit model+installation','model separately','installation separately/doubleclick','empty optional fields','reload/Back/other equipment','cancel','history/work orders untouched','foreign venue cannot modify']}));
 }catch(e){console.log(await page.locator('body').innerText());await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close()}
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
