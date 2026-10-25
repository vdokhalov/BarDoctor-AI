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
    if(key==='bd_events'&&req.method==='PUT'){eventWrites++;await new Promise(r=>setTimeout(r,delaySave));if(failSave){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Тестовая ошибка'}));return}}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if ((url.pathname.startsWith("/equipment/")||url.pathname.startsWith("/events/")) || ["/add", "/events", "/suppliers", "/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve(process.env.ARTIFACT_ROOT||"public", "." + url.pathname);
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    if(key==='bd_events'&&req.method==='PUT'&&lostAck){lostAck=false;res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false}));return;}
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
 runtime.seed('bd_events',[]);runtime.seed('bd_equipment',[{id:'equipment',name:'Тестовый холодильник',status:'working',category:'refrigeration'}]);
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);
 const ai:string[]=[];page.on('request',r=>{if(/\/api\/(priority|ai|smart)/.test(r.url()))ai.push(r.url())});
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 const out=resolve('outputs/incident-save');mkdirSync(out,{recursive:true});
 let accept=false;const dialogs:string[]=[];page.on('dialog',async d=>{dialogs.push(d.type());if(accept)await d.accept();else await d.dismiss()});
 const cases=[['Поломка','Зафиксировать поломку'],['Жалоба гостя','Сохранить жалобу'],['Конфликт','Зафиксировать конфликт'],['Поставщик','Сохранить проблему'],['Проверка','Сохранить проверку'],['Идея','Сохранить идею']];
 async function open(label:string){await page.goto(base+'/add?venue='+venueId);await page.getByRole('button',{name:new RegExp('^'+label)}).click();await page.locator('input').first().waitFor();}
 const title=()=>page.locator('input:not([type=datetime-local]):not([type=file])').first();
 for(const [label,save] of cases){await open(label);await title().fill('Локально '+label);if(label==='Поломка')await page.locator('select').first().selectOption('equipment');delaySave=400;await page.getByRole('button',{name:save,exact:true}).click();assert.equal(await page.getByText('Событие добавлено',{exact:true}).count(),0);await page.getByText('Событие добавлено',{exact:true}).waitFor();await page.waitForURL('**/events*');assert.equal(ai.length,0)}
 assert.equal(eventWrites,6);await page.reload();assert.equal(ai.length,0);
 await open('Идея');await title().fill('Ошибка и повтор');failSave=true;delaySave=0;await page.getByRole('button',{name:'Сохранить идею',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await title().inputValue(),'Ошибка и повтор');assert.equal(await page.getByText('Событие добавлено',{exact:true}).count(),0);await page.screenshot({path:out+'/error-390.png'});
 // Reload restores the local form, with no automatic save or AI call.
 const before=eventWrites;accept=true;await page.reload();accept=false;await page.getByRole('button',{name:/^Идея/}).click();await title().waitFor();assert.equal(await title().inputValue(),'Ошибка и повтор');assert.equal(eventWrites,before);
 failSave=false;delaySave=500;await page.getByRole('button',{name:'Сохранить идею',exact:true}).dblclick();await page.getByText('Событие добавлено',{exact:true}).waitFor();await page.waitForURL('**/events*');assert.equal(eventWrites,before+1);
 await open('Идея');assert.equal(await title().inputValue(),'');await title().fill('Несохранённое');await page.getByRole('button',{name:'Назад',exact:true}).last().click();assert.equal(await title().inputValue(),'Несохранённое');assert.ok(dialogs.includes('confirm'));await title().fill('');const count=dialogs.length;await page.getByRole('button',{name:'Назад',exact:true}).last().click();await page.waitForTimeout(250);assert.equal(await title().count(),0);assert.equal(dialogs.length,count);
 // A server commit followed by lost acknowledgement must not create a second event.
 await open('Идея');await title().fill('Ответ потерян');lostAck=true;delaySave=0;await page.getByRole('button',{name:'Сохранить идею',exact:true}).click();await page.getByRole('alert').waitFor();const lostWrites=eventWrites;await page.getByRole('button',{name:'Сохранить идею',exact:true}).click();await page.getByText('Событие добавлено',{exact:true}).waitFor();await page.waitForURL('**/events*');assert.equal(eventWrites,lostWrites);
 // Browser Back is guarded too; cancellation keeps the edited form.
 await open('Идея');await title().fill('Browser Back');const backDialogs=dialogs.length;await page.evaluate(()=>history.back());await page.waitForTimeout(400);assert.equal(await title().inputValue(),'Browser Back');assert.ok(dialogs.length>backDialogs);accept=true;await page.getByRole('button',{name:'Назад',exact:true}).last().click();accept=false;await page.waitForTimeout(250);
 const rows=runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_events'").get(runtime.account) as {data_json:string};const events=JSON.parse(rows.data_json);assert.equal(events.length,8);assert.equal(new Set(events.map((e:{id:string})=>e.id)).size,8);assert.ok(events.every((e:{aiAssessment?:unknown})=>!e.aiAssessment));assert.equal(ai.length,0);
 await page.goto(base+'/events/'+events[0].id+'?venue='+venueId);await page.getByRole('button',{name:'Оценить с AI (платно)',exact:true}).waitFor();await page.getByRole('button',{name:'Оценить с AI (платно)',exact:true}).click();assert.equal(ai.length,0);await page.reload();await page.getByRole('button',{name:'Оценить с AI (платно)',exact:true}).waitFor();assert.equal(ai.length,0);
 await open('Идея');for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.getByRole('button',{name:'Сохранить идею',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/form-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 // Reverted values remove the draft; a date-only draft keeps the original dirty baseline across reload.
 await title().fill('Вернуть исходное');await title().fill('');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('bd_incident_draft_v1:')).length),0);
 const date=page.locator('input[type=datetime-local]');await date.fill('2026-10-24T10:00');accept=true;await page.reload();accept=false;await page.getByRole('button',{name:/^Идея/}).click();await date.waitFor();assert.equal(await date.inputValue(),'2026-10-24T10:00');const dateDialogs=dialogs.length;await page.getByRole('button',{name:'Назад',exact:true}).last().click();assert.equal(dialogs.length,dateDialogs+1);assert.equal(await date.inputValue(),'2026-10-24T10:00');
 const storeGet=runtime.api.storeKey.GET as unknown as (request:Request,context:{params:Promise<{key:string}>})=>Promise<Response>;
 const other=await runtime.register('incident-other@local.test');const otherRequest=runtime.request(other,'/api/store/bd_events');const isolated=await storeGet(otherRequest,{params:Promise.resolve({key:'bd_events'})});assert.equal(isolated.status,200);assert.equal((await isolated.json() as {data:unknown}).data,null);const foreign=new Request(otherRequest,{headers:{...Object.fromEntries(otherRequest.headers),'X-Venue-Id':String(venueId)}});assert.equal((await storeGet(foreign,{params:Promise.resolve({key:'bd_events'})})).status,401);
 console.log(JSON.stringify({pass:true,checks:['6 categories persisted to local API','ack before success','HTTP failure retains form','reload retains draft without calls','retry/double click single record','dirty and reverted Back','no provider requests','server saved/lost ack retry no second PUT','Browser Back cancel','manual AI confirmation dismissed','390/820/1280','foreign account/venue denied'],events:events.length}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
