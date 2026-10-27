import {GET as integrationsPage} from '../app/integrations/route';
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
const apiDelay = 30;let failImport=false;
const runtime = await emptyMonthFixture({hub:"./app/api/integration-hub/route",preview:"./app/api/integration-hub/import/preview/route",sources:"./app/api/reviews/sources/route",importFile:"./app/api/integration-hub/import/route",mappings:"./app/api/purchases/mappings/route",nomenclature:"./app/api/tech-cards/nomenclature/route",overview:"./app/api/assortment/overview/route",procurement:"./app/api/procurement/overview/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/integration-hub":"hub","/api/integration-hub/import/preview":"preview","/api/integration-hub/import":"importFile","/api/reviews/sources":"sources","/api/purchases/mappings":"mappings","/api/tech-cards/nomenclature":"nomenclature","/api/procurement/overview":"procurement","/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if(name==="importFile"&&failImport)response=Response.json({ok:false,error:"Локальная ошибка импорта"},{status:503});
    else if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/integrations")response=integrationsPage(new Request(url));
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/employees/") || url.pathname.startsWith("/equipment/") || ["/employees", "/nomenclature", "/catalog", "/suppliers", "/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 runtime.seed('bd_employees',[{id:'one',name:'Анна',position:'waiter',status:'active',venueId},{id:'two',name:'Борис',position:'cook',status:'active',venueId}]);
 const get=()=>JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_employees'").get(runtime.account)!.data_json));
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));localStorage.setItem('bd_active_role','owner');},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(new URL(r.url()).pathname);});
 await page.goto(base+'/employees?venue='+venueId);await page.waitForTimeout(1500);assert.match(await page.locator('body').innerText(),/2 сотрудника/);await page.getByRole('tab',{name:'Сотрудники',exact:true}).click();await page.getByText('Анна',{exact:true}).first().waitFor();
 await page.evaluate(v=>(window as any).bdNavigate('/integrations?venue='+v),venueId);
 const frame=page.frameLocator('iframe');await frame.locator('#file-import-card').getByRole('button',{name:'Импортировать',exact:true}).click();await frame.locator('[name=entityType]').selectOption('employee');await frame.locator('[name=externalSystem]').fill('Local BD12');await frame.locator('input[name=file]').setInputFiles({name:'team.csv',mimeType:'text/csv',buffer:Buffer.from('external_id,name,position\nthird,Вера,Бариста')});await frame.locator('#hub-preview-button').click();await frame.locator('#hub-field-mapping').waitFor({state:'visible'});await frame.locator('#hub-import-form button[type=submit]').click();await frame.locator('#hub-import-result').filter({hasText:'Создано: 1'}).waitFor();assert.equal(get().length,3);
 await page.evaluate(v=>(window as any).bdNavigate('/employees?venue='+v),venueId);await page.getByRole('tab',{name:'Сотрудники',exact:true}).click();await page.getByText('Анна',{exact:true}).first().waitFor();await page.waitForTimeout(600);console.log('server employees',get().length);
 if(process.env.BASELINE){assert.equal(await page.getByText('Вера',{exact:true}).count(),0);await page.reload();await page.getByRole('tab',{name:'Сотрудники',exact:true}).click();await page.getByText('Вера',{exact:true}).first().waitFor();console.log('BASELINE confirmed: server3/UI2 until reload');}
 else{
 await page.getByText('Вера',{exact:true}).first().waitFor();assert.match(await page.locator('body').innerText(),/3 сотрудника/);assert.match(await page.locator('body').innerText(),/Бариста/);
 mkdirSync('outputs/bd12-employee-refresh',{recursive:true});for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});await page.screenshot({path:'outputs/bd12-employee-refresh/team-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 async function importAgain(name:string,fail=false){await page.evaluate(v=>(window as any).bdNavigate('/integrations?venue='+v),venueId);const frame=page.frameLocator('iframe');await frame.locator('#file-import-card').getByRole('button',{name:'Импортировать',exact:true}).click();await frame.locator('[name=entityType]').selectOption('employee');await frame.locator('[name=externalSystem]').fill('Local BD12');await frame.locator('input[name=file]').setInputFiles({name:'team.csv',mimeType:'text/csv',buffer:Buffer.from('external_id,name,position\nthird,'+name+',Бариста')});await frame.locator('#hub-preview-button').click();await frame.locator('#hub-field-mapping').waitFor({state:'visible'});failImport=fail;await frame.locator('#hub-import-form button[type=submit]').click();await frame.locator('#hub-import-result').filter({hasText:fail?'Локальная ошибка':'Создано: 0'}).waitFor();failImport=false;await page.evaluate(v=>(window as any).bdNavigate('/employees?venue='+v),venueId);await page.getByRole('tab',{name:'Сотрудники',exact:true}).click();}
 await importAgain('Вера обновлена');await page.getByText('Вера обновлена',{exact:true}).first().waitFor();assert.equal(get().length,3);assert.equal(get().find((r:any)=>r.externalId==='third').customPositionLabel,'Бариста');
 await importAgain('Вера обновлена');await page.getByText('Вера обновлена',{exact:true}).first().waitFor();assert.equal(get().length,3);assert.match(await page.locator('body').innerText(),/3 сотрудника/);
 await importAgain('Не должна сохраниться',true);await page.getByText('Вера обновлена',{exact:true}).first().waitFor();assert.equal(get().length,3);assert.equal(get().some((r:any)=>r.name==='Не должна сохраниться'),false);
 await page.reload();await page.getByRole('tab',{name:'Сотрудники',exact:true}).click();await page.getByText('Вера обновлена',{exact:true}).first().waitFor();assert.match(await page.locator('body').innerText(),/3 сотрудника/);console.log('PASS create/update/repeat/error: list+count without reload, position retained, final reload, 390/820/1280');
 }
 assert.deepEqual(errors,[]);assert.ok(writes.every(p=>['/api/auth/bootstrap','/api/integration-hub/import','/api/integration-hub/import/preview'].includes(p)),JSON.stringify(writes));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
