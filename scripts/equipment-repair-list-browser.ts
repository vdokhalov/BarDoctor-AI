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
 const owner=runtime.user,venueId=runtime.venueId,createdAt='2026-10-01T10:00:00Z';
 runtime.seed('bd_events',[]);runtime.seed('bd_equipment_history',[]);runtime.seed('bd_equipment_work_orders',[{id:'to',equipmentId:'to',kind:'maintenance',status:'detected',dueDate:'2026-10-24',createdAt,updatedAt:createdAt}]);
 runtime.seed('bd_equipment',[{id:'working',name:'Исправный холодильник',status:'working'},{id:'fridge',name:'Барный холодильник',status:'working',zone:'Бар'},{id:'coffee',name:'Кофемашина',status:'working',zone:'Зал'},{id:'done',name:'Отремонтированная плита',status:'working'},{id:'to',name:'Плановое обслуживание',status:'needs_maintenance'}].map(e=>({...e,category:'bar',venueId,createdAt,updatedAt:createdAt})));
 for(const equipmentId of ['fridge','coffee','done']){const result=await runtime.api.equipmentWork.POST(runtime.request(owner,'/api/equipment/work-orders','POST',{breakdownAction:'create',incident:{id:'incident-'+equipmentId,equipmentId,eventDate:'2026-10-23T10:00:00Z'},plan:{responsibleName:equipmentId==='fridge'?'Сервис холодильного оборудования':'Сервис',dueDate:'2026-10-24'}}));assert.equal(result.status,201)}
 assert.equal((await runtime.api.equipmentWork.POST(runtime.request(owner,'/api/equipment/work-orders','POST',{breakdownAction:'restore',incident:{id:'incident-done'}}))).status,200);
 const context=await browser.newContext({viewport:{width:390,height:1000}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);const errors:string[]=[],ai:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/api\/(priority|ai|smart)/.test(r.url()))ai.push(r.url())});page.on('dialog',d=>d.accept());
 const out=resolve('outputs/equipment-repair-list');mkdirSync(out,{recursive:true});
 await page.goto(base+'/equipment?venue='+venueId);await page.getByRole('button',{name:'Требует ремонта: 2',exact:true}).waitFor();
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:1000});await page.screenshot({path:out+'/entry-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 await page.getByRole('button',{name:'Требует ремонта: 2',exact:true}).click();await page.waitForURL('**maintenance=repair*');await page.getByPlaceholder('Название, зона или ответственный').waitFor();
 const repairList=page.locator('.bd-eq-maintenance-list-v167');assert.equal(await repairList.getByRole('button').count(),2);assert.equal(await repairList.getByText('Исправный холодильник',{exact:true}).count(),0);assert.equal(await repairList.getByText('Плановое обслуживание',{exact:true}).count(),0);assert.equal(await repairList.getByText('Отремонтированная плита',{exact:true}).count(),0);
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:1000});await page.screenshot({path:out+'/list-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 await page.getByRole('button',{name:'Все работы и ТО',exact:true}).click();await page.getByRole('combobox',{name:'Фильтр обслуживания',exact:true}).waitFor();await page.getByRole('button',{name:'Требует ремонта: 2',exact:true}).click();await page.getByPlaceholder('Название, зона или ответственный').fill('кофе');assert.equal(await repairList.getByRole('button').count(),1);await page.getByPlaceholder('Название, зона или ответственный').fill('');await page.reload();await page.getByPlaceholder('Название, зона или ответственный').waitFor();assert.equal(await repairList.getByRole('button').count(),2);
 await repairList.getByRole('button').filter({hasText:'Барный холодильник'}).click();await page.waitForURL('**/events/incident-fridge*');await page.getByRole('button',{name:'Отремонтировано',exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'Отремонтировано',exact:true}).waitFor();await page.getByRole('button',{name:'Назад',exact:true}).first().click();await page.waitForURL('**maintenance=repair*');assert.equal(await repairList.getByRole('button').count(),2);
 await repairList.getByRole('button').filter({hasText:'Барный холодильник'}).click();await page.getByRole('button',{name:'Отремонтировано',exact:true}).click();await page.getByRole('heading',{name:'Работа восстановлена',exact:true}).waitFor();await page.goBack();await page.waitForURL('**maintenance=repair*');await page.getByRole('button',{name:'Требует ремонта: 1',exact:true}).waitFor();assert.equal(await repairList.getByRole('button').count(),1);await page.reload();await page.getByRole('button',{name:'Требует ремонта: 1',exact:true}).waitFor();assert.equal(await repairList.getByRole('button').count(),1);
 const read=(key:string)=>JSON.parse((runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(runtime.account,key) as {data_json:string}).data_json);assert.equal(read('bd_equipment_work_orders').find((r:{id:string})=>r.id==='incident:incident-fridge').status,'verified');assert.ok(read('bd_equipment_history').some((r:{id:string})=>r.id==='incident:incident-fridge:verified'));assert.equal(read('bd_events').length,3);assert.deepEqual(errors,[]);assert.deepEqual(ai,[]);
 console.log(JSON.stringify({pass:true,checks:['existing maintenance filter reused','mixed equipment/TO/completed excluded','count 2 to 1 after restore','reload retains filter and count','search','direct repair card','upper Back after reload','browser Back after repair','history retained','390/820/1280','no AI']}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
