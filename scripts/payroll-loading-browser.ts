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
let apiDelay = 800, failDays=false, failStore=false;
const runtime = await emptyMonthFixture({days:'./app/api/operational-days/route',storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
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
    if((name==="days"&&failDays)||(name==="store"&&failStore)) response=new Response(null,{status:503});
    else if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/salaries") || ["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 runtime.seed('bd_employees',[{id:'anna',name:'Анна',status:'active',venueId}]);
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 context.setDefaultTimeout(12000);const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url());});
 const url=base+'/salaries?venue='+venueId+'&month=2026-10';
 const loading=page.locator('[data-bd-payroll-load="loading"]'),error=page.locator('[data-bd-payroll-load="error"]');
 await page.goto(url);await loading.waitFor();assert.doesNotMatch(await loading.innerText(),/Закрыто|Неизвестно|долг погашен/);mkdirSync('outputs/payroll-loading',{recursive:true});await page.screenshot({path:'outputs/payroll-loading/loading-390.png'});await loading.waitFor({state:'hidden'});await page.getByText('Анна',{exact:true}).waitFor();
 console.log('READY', (await page.locator('.bd-payroll-main-v164').innerText()).slice(0,1600));
 console.log("RELOAD");await page.reload();await loading.waitFor();await loading.waitFor({state:'hidden'});await page.getByText('Анна',{exact:true}).waitFor();
 console.log("FAIL DAYS");failDays=true;await page.reload();await error.waitFor();assert.doesNotMatch(await error.innerText(),/Закрыто|Нет сотрудников|долг погашен/);failDays=false;await error.getByRole('button',{name:'Повторить'}).click();await loading.waitFor();await loading.waitFor({state:'hidden'});await page.getByText('Анна',{exact:true}).waitFor();
 console.log("FAIL STORE");failStore=true;await page.reload();await error.waitFor();failStore=false;await error.getByRole('button',{name:'Повторить'}).click();await loading.waitFor();await loading.waitFor({state:'hidden'});await page.getByText('Анна',{exact:true}).waitFor();
 await page.goto(base+'/salaries/anna?venue='+venueId+'&month=2026-09');await loading.waitFor();await loading.waitFor({state:'hidden'});console.log('DETAIL', (await page.locator('body').innerText()).slice(0,2200));assert.match(await page.locator('body').innerText(),/НАЧИСЛЕНИЯ ПО СМЕНАМ/);assert.match(await page.locator('body').innerText(),/0,00/);assert.doesNotMatch(await page.locator('body').innerText(),/Сотрудник не найден/);
 await page.evaluate(url=>(window as any).bdNavigate(url),'/salaries?venue='+venueId+'&month=2026-09');await page.getByText('Анна',{exact:true}).waitFor();assert.doesNotMatch(await page.locator('.bd-payroll-main-v164').innerText(),/10,00/);assert.match(await page.locator('.bd-payroll-main-v164').innerText(),/Сентябрь 2026/);
 await page.getByLabel('Выбрать другой месяц',{exact:true}).selectOption('2026-10');await page.waitForFunction(()=>document.querySelector('.bd-payroll-main-v164')?.textContent?.includes('10,00'));await page.reload();await loading.waitFor();await page.goto(base+'/salaries?venue='+venueId+'&month=2026-09');await loading.waitFor({state:'hidden'});assert.doesNotMatch(await page.locator('.bd-payroll-main-v164').innerText(),/10,00/);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 await page.reload();await loading.waitFor();
 const created=await runtime.api.venues.POST(runtime.request(owner,'/api/venues','POST',{name:'Второе тестовое заведение',businessType:'cafe',country:'Test',city:'Local',currency:'MDL',timezone:'UTC'}));assert.equal(created.status,201);const second=(await created.json() as any).activeVenueId;
 await page.evaluate(v=>localStorage.setItem('bd_active_venue_id',String(v)),second);await page.goto(base+'/salaries?venue='+second+'&month=2026-10');await loading.waitFor();await loading.waitFor({state:'hidden'});assert.equal(await page.getByText('Анна',{exact:true}).count(),0);assert.doesNotMatch(await page.locator('.bd-payroll-main-v164').innerText(),/10,00/);
 const other=await runtime.register('payroll-loading-other@local.test');runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другой тестовый аккаунт',currency:'MDL',timezone:'UTC'}),other.userId);await page.evaluate(other=>{localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId));},other);await page.goto(base+'/salaries?venue='+other.activeVenueId+'&month=2026-10');await loading.waitFor();await loading.waitFor({state:'hidden'});assert.equal(await page.getByText('Анна',{exact:true}).count(),0);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 console.log('PASS compiled cold/reload/operational failure/store failure/retry/detail loading and no writes');await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
