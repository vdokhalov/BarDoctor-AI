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
const runtime = await emptyMonthFixture({importFile:"./app/api/integration-hub/import/route",mappings:"./app/api/purchases/mappings/route",nomenclature:"./app/api/tech-cards/nomenclature/route",overview:"./app/api/assortment/overview/route",procurement:"./app/api/procurement/overview/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/purchases/mappings":"mappings","/api/tech-cards/nomenclature":"nomenclature","/api/procurement/overview":"procurement","/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
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
 const form=new FormData();form.set('file',new File(['external_id,name,position,department\nteam-import-test-2610,Вера Импорт Тест,Бариста,Бар'],'team-import-employees.csv',{type:'text/csv'}));form.set('entityType','employee');form.set('externalSystem','Isolated CSV');form.set('fieldMapping',JSON.stringify({externalId:'external_id',name:'name',role:'position'}));const req=runtime.request(owner,'/api/integration-hub/import','POST');req.headers.delete('content-type');const imported=await runtime.api.importFile.POST(new Request(req,{body:form}));assert.equal(imported.status,201,await imported.clone().text());
 const get=()=>JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_employees'").get(runtime.account)!.data_json));const employee=get()[0];assert.equal(employee.customPositionLabel,'Бариста');
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);const out=resolve('outputs/employee-import-position');mkdirSync(out,{recursive:true});
 try {
 const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(new URL(r.url()).pathname)});
 for(const width of [390,820,1280]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/employees/'+employee.id+'?venue='+venueId);await page.getByText('Бариста',{exact:true}).first().waitFor();await page.screenshot({path:out+'/card-'+width+'.png'});
  await page.goto(base+'/employees/'+employee.id+'/edit?venue='+venueId);const title=page.getByLabel('Название должности *',{exact:true});await title.waitFor();assert.equal(await title.inputValue(),'Бариста');assert.equal(await page.locator('select').filter({has:page.locator('option[value="bartender"]')}).inputValue(),'other');await page.screenshot({path:out+'/editor-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.reload();await title.waitFor();assert.equal(await title.inputValue(),'Бариста');await page.goBack();
 }
 assert.deepEqual(writes,[]);
 await page.goto(base+'/employees/'+employee.id+'/edit?venue='+venueId);const title=page.getByLabel('Название должности *',{exact:true});await title.waitFor();await title.fill('');await page.getByRole('button',{name:'Сохранить профиль',exact:true}).click();assert.equal(get()[0].customPositionLabel,'Бариста');assert.deepEqual(writes,[]);
 await title.fill('Бариста');await page.getByLabel('Имя *',{exact:true}).fill('Вера Импорт Тест — проверено');const saved=page.waitForResponse(r=>r.url().includes('/api/store/bd_employees')&&r.request().method()==='PUT');await page.getByRole('button',{name:'Сохранить профиль',exact:true}).click();assert.equal((await saved).status(),200);assert.equal(get()[0].customPositionLabel,'Бариста');assert.equal(get()[0].position,'other');assert.equal(get().length,1);
 assert.ok(writes.every(path=>path==='/api/store/bd_employees'),JSON.stringify(writes));
 await page.goto(base+'/employees?venue='+venueId);await page.getByRole('tabpanel',{name:'Обзор команды'}).getByRole('button',{name:'Добавить сотрудника',exact:true}).click();await page.getByPlaceholder('Имя Фамилия',{exact:true}).waitFor();await page.getByRole('button',{name:'Закрыть форму',exact:true}).click();assert.equal(get().length,1);
 await page.getByRole('tabpanel',{name:'Обзор команды'}).getByRole('button',{name:'Добавить сотрудника',exact:true}).click();await page.getByPlaceholder('Имя Фамилия',{exact:true}).fill('Ручной сотрудник');await page.getByLabel('Должность сотрудника',{exact:true}).selectOption('waiter');const created=page.waitForResponse(r=>r.url().includes('/api/store/bd_employees')&&r.request().method()==='PUT');await page.getByRole('button',{name:'Добавить сотрудника',exact:true}).last().click();assert.equal((await created).status(),200);assert.equal(get().length,2);assert.equal(get().find((x:any)=>x.name==='Ручной сотрудник').position,'waiter');await page.reload();assert.equal(get().length,2);assert.ok(writes.every(path=>path==='/api/store/bd_employees'),JSON.stringify(writes));
 console.log(JSON.stringify({pass:true,widths:[390,820,1280],checks:['import→card→editor','custom title reload','empty custom title cannot save','manual edit retains imported position','manual creation/cancel/reload','no AI or PIN requests']}));
 }catch(e){console.log(await page.locator('body').innerText());await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close()}
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
