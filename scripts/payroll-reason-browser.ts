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
const runtime = await emptyMonthFixture({workdays:'./app/api/workdays/route',days:'./app/api/operational-days/route',storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
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
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(process.env.BASELINE_JS&&/index-BQGspy0I[^/]*\.js$/.test(file)?process.env.BASELINE_JS:file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
 runtime.seed('bd_employees',[{id:'anna',name:'Анна',status:'active',venueId,payrollRuleId:'rate'}]);runtime.seed('bd_payroll_rules',[{id:'rate',blocks:[{type:'shift_rate',amount:10,enabled:true}]}]);
 const closed=(date:string,id:string)=>({id,date,venueId,workdayStatus:'CLOSED',closingStatus:'closed',workdaySequence:1,workdayRevision:1,staffing:[{employeeId:'anna',hours:4}],payrollBreakdown:{total:10,perEmployee:{anna:10}},workdaySummary:{team:[{employeeId:'anna',name:'Анна',hours:4}]}});
 runtime.seed('bd_operational_reports_v1',[closed('2026-10-21','closed21'),closed('2026-10-22','closed22'),{id:'next22',date:'2026-10-22',venueId,workdayStatus:'OPEN',workdaySequence:2,workdayRevision:1,staffing:[{employeeId:'anna',hours:4}]}]);runtime.seed('bd_finance_revenue',[{id:'sale21',date:'2026-10-21',venueId,revenue:100,currency:'MDL',manualTotalsVersion:2,manualCostOfGoods:20},{id:'sale22',date:'2026-10-22',venueId,revenue:0,currency:'MDL',manualTotalsVersion:2,manualCostOfGoods:0}]);
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const context=await browser.newContext({viewport:{width:390,height:844}});context.setDefaultTimeout(15000);await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url());});
 if(process.env.BASELINE_JS){await page.setViewportSize({width:820,height:844});await page.goto(base+'/salaries?venue='+venueId+'&month=2026-10');await page.getByText('Анна',{exact:true}).waitFor();await page.screenshot({path:'outputs/payroll-reason/baseline-820.png'});console.log('BASELINE screenshot captured');await context.close();}else{
 const url=base+'/salaries?venue='+venueId+'&month=2026-10',problem=page.locator('[data-payroll-problem]');await page.goto(url);await problem.getByText('Смена 22.10 ещё открыта.',{exact:true}).waitFor();await page.waitForTimeout(1200);assert.match(await problem.innerText(),/Смена 22.10 ещё открыта/);assert.doesNotMatch(await page.locator('.bd-payroll-main-v164').innerText(),/Неизвестно|ФОТ требует данных/);assert.match(await page.locator('.bd-payroll-directory-body-v164').innerText(),/20,00/);
 mkdirSync('outputs/payroll-reason',{recursive:true});for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});await page.waitForTimeout(350);await page.screenshot({path:'outputs/payroll-reason/payroll-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}await page.setViewportSize({width:390,height:844});
 await problem.getByRole('link',{name:'Посмотреть смену'}).click();await page.locator('[data-workday-state="OPEN"]').waitFor();assert.equal(new URL(page.url()).searchParams.get('workdayId'),'next22');await page.reload();await page.locator('[data-workday-state="OPEN"]').waitFor();await page.getByRole('link',{name:'К зарплатам'}).click();await problem.waitFor();assert.equal(new URL(page.url()).searchParams.get('month'),'2026-10');assert.equal(new URL(page.url()).searchParams.get('venue'),String(venueId));
 await page.getByLabel('Выбрать другой месяц',{exact:true}).selectOption('2026-09');assert.equal(await problem.getByRole('link').count(),0);await page.getByLabel('Выбрать другой месяц',{exact:true}).selectOption('2026-10');await problem.getByRole('link').waitFor();await page.reload();await problem.getByRole('link').waitFor();
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);runtime.seed('bd_payroll_rules',[]);await page.reload();await problem.getByText('Проверьте оплату сотрудника.',{exact:true}).waitFor();runtime.seed('bd_employees',[]);await page.reload();await problem.getByText('Сотрудник смены не найден.',{exact:true}).waitFor();assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);console.log('PASS actual source, preserved employee20, exact next shift same date, reload/back/month and captures390/820/1280; existing baseline820 clipping documented; no writes/errors');await context.close();}
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
