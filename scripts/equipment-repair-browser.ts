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
let failSave=false,delaySave=0,eventWrites=0,lostAck=false;
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
    if((key==='bd_events'&&req.method==='PUT')||(url.pathname==='/api/equipment/work-orders'&&req.method==='POST')){eventWrites++;await new Promise(r=>setTimeout(r,delaySave));if(failSave){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Тестовая ошибка'}));return}}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if ((url.pathname.startsWith("/equipment/")||url.pathname.startsWith("/events/")) || ["/add", "/events", "/suppliers", "/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve(process.env.ARTIFACT_ROOT||"public", "." + url.pathname);
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    if(url.pathname==='/api/equipment/work-orders'&&req.method==='POST'&&lostAck){lostAck=false;res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false}));return;}
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
 const createdAt='2026-10-01T10:00:00.000Z';
 runtime.seed('bd_events',[]);runtime.seed('bd_equipment',[{id:'fridge',name:'Барный холодильник',status:'working',category:'bar',zone:'Бар',createdAt,updatedAt:createdAt},{id:'unknown',name:'Модель XR-100',status:'working',category:'other',createdAt,updatedAt:createdAt}]);runtime.seed('bd_equipment_work_orders',[]);runtime.seed('bd_equipment_history',[]);
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);await page.clock.setFixedTime(new Date('2026-10-23T11:00:00Z'));
 const ai:string[]=[],errors:string[]=[];page.on('request',r=>{if(/\/api\/(priority|ai|smart)/.test(r.url()))ai.push(r.url())});page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.stack)});page.on('response',async r=>{if(r.url().endsWith('/api/equipment/work-orders'))console.log('WORK',r.status(),(await r.json()).error||'ok')});
 const out=resolve('outputs/equipment-repair');mkdirSync(out,{recursive:true});let accept=false;let dialogs=0;page.on('dialog',async d=>{dialogs++;if(accept)await d.accept();else await d.dismiss()});
 const rows=(key:string)=>JSON.parse((runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(runtime.account,key) as {data_json:string}).data_json);
 async function open(id:string){await page.goto(base+'/add?venue='+venueId);await page.getByRole('button',{name:/^Поломка/}).click();await page.locator('select').first().selectOption(id);await page.getByText('Риск порчи товара, дополнительных списаний и появления позиций в стоп-листе',{exact:true}).waitFor({state:id==='fridge'?'visible':'hidden'});}
 await open('fridge');assert.equal(await page.getByText('Что произошло *',{exact:true}).count(),0);await page.locator('textarea').fill('Не работает с утра.');await page.getByPlaceholder('Имя или сервис').fill('Сервис холодильного оборудования');await page.locator('input[type=datetime-local]').fill('2026-10-22T09:00');await page.locator('input[type=date]').fill('2026-10-23');
 failSave=true;await page.getByRole('button',{name:'Зафиксировать поломку',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(rows('bd_events').length,0);assert.equal(await page.locator('textarea').inputValue(),'Не работает с утра.');await page.screenshot({path:out+'/save-error-390.png'});
 accept=true;await page.reload();accept=false;await page.getByRole('button',{name:/^Поломка/}).click();assert.equal(await page.locator('select').first().inputValue(),'fridge');assert.equal(await page.locator('input[type=date]').inputValue(),'2026-10-23');
 const before=eventWrites;failSave=false;lostAck=true;delaySave=250;await page.getByRole('button',{name:'Зафиксировать поломку',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(rows('bd_events').length,1);assert.equal(rows('bd_equipment_history').length,1);
 await page.getByRole('button',{name:'Зафиксировать поломку',exact:true}).dblclick();await page.waitForURL('**/events*').catch(async error=>{console.log('SAVE_STATE',page.url(),await page.locator('body').innerText());throw error});assert.equal(eventWrites,before+2);assert.equal(rows('bd_events').length,1);assert.equal(rows('bd_equipment_history').length,1);assert.equal(ai.length,0);
 const event=rows('bd_events')[0];await page.goto(base+'/events/'+event.id+'?venue='+venueId);await page.getByRole('button',{name:'Отремонтировано',exact:true}).waitFor();await page.getByText('Срок ремонта — сегодня',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/AI/}).count(),0);assert.equal(await page.getByText('Низкая',{exact:true}).count(),0);await page.reload();await page.getByRole('button',{name:'Отремонтировано',exact:true}).waitFor();
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:1000});await page.screenshot({path:out+'/open-'+width+'.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 await page.getByRole('button',{name:'Указать ответственного и срок',exact:true}).click();await page.getByPlaceholder('Имя или сервис, необязательно').fill('Другой сервис');await page.getByRole('button',{name:'Назад',exact:true}).first().click();assert.equal(await page.getByPlaceholder('Имя или сервис, необязательно').inputValue(),'Другой сервис');const previousDialogs=dialogs;await page.evaluate(()=>history.back());await page.waitForTimeout(100);assert.ok(dialogs>previousDialogs);assert.equal(await page.getByPlaceholder('Имя или сервис, необязательно').inputValue(),'Другой сервис');
 accept=true;await page.getByRole('button',{name:'Отмена',exact:true}).click();accept=false;await page.getByRole('button',{name:'Отремонтировано',exact:true}).waitFor();await page.getByRole('button',{name:'Указать ответственного и срок',exact:true}).click();await page.getByPlaceholder('Имя или сервис, необязательно').fill('Сервис 24');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByText('Сервис 24',{exact:true}).waitFor();await page.reload();await page.getByText('Сервис 24',{exact:true}).waitFor();
 failSave=true;accept=true;await page.getByRole('button',{name:'Отремонтировано',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(rows('bd_events')[0].status,'open');failSave=false;await page.getByRole('button',{name:'Отремонтировано',exact:true}).dblclick();await page.getByRole('heading',{name:'Работа восстановлена',exact:true}).waitFor();accept=false;assert.equal(rows('bd_events')[0].status,'resolved');assert.equal(rows('bd_equipment')[0].status,'working');assert.equal(rows('bd_equipment_history').length,2);assert.ok(rows('bd_events')[0].repair.verifiedBy);
 await page.reload();await page.getByRole('heading',{name:'Работа восстановлена',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Отремонтировано',exact:true}).count(),0);assert.equal(await page.getByText('Срок ремонта — сегодня',{exact:true}).count(),0);await page.setViewportSize({width:390,height:1000});await page.screenshot({path:out+'/restored-390.png',fullPage:true});
 await page.getByRole('button',{name:'Карточка оборудования и история',exact:true}).click();await page.waitForURL('**/equipment/fridge*');await page.getByRole('button',{name:'Зафиксировать проблему',exact:true}).waitFor();await page.screenshot({path:out+'/history-390.png',fullPage:true});await page.getByRole('button',{name:'Зафиксировать проблему',exact:true}).click();await page.waitForURL('**/add?equipment=fridge*');assert.equal(await page.locator('select').first().inputValue(),'fridge');assert.equal(await page.getByText('Что произошло *',{exact:true}).count(),0);
 await open('unknown');await page.getByText('Тип оборудования не определён. Возможные последствия не указаны.',{exact:true}).waitFor();await page.getByRole('button',{name:'Зафиксировать поломку',exact:true}).click();await page.waitForURL('**/events*');const unknown=rows('bd_events').find((e:{equipmentId:string})=>e.equipmentId==='unknown');assert.equal(unknown.priority,'unassessed');assert.equal(unknown.equipmentBusinessRisk.risk,null);await page.goto(base+'/events/'+unknown.id+'?venue='+venueId);await page.getByRole('button',{name:'Отремонтировано',exact:true}).waitFor();await page.screenshot({path:out+'/unknown-390.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(ai,[]);console.log(JSON.stringify({pass:true,checks:['local native atomic API','no required diagnosis','error preserves form','draft reload','lost ack and double click','repair plan','Back/Cancel guard','restoration error/retry','restore reload/actor/history','unknown no low priority','390/820/1280 fit','zero AI'],events:rows('bd_events').length}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
