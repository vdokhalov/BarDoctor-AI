import assert from "node:assert/strict";
import { salesSurfacePage } from "../tests/helpers/sales-surface-page";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = process.env.BD_OPERATIONAL_TEST_INSTANT;
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));
    else if (["/more", "/shifts", "/finance", "/home", "/login"].includes(url.pathname)||url.pathname.startsWith("/finance/shift/")) response = barDoctorResponse();
    else {
      const assets=process.env.ARTIFACT_ROOT||"public",file = resolve(assets, "." + url.pathname);
      response = file.startsWith(resolve(assets)+"/") && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
const browser = await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
const out="outputs/workday-payroll-link";mkdirSync(out,{recursive:true});const results:unknown[]=[];
try{
 const owner=await runtime.register('payroll-link@local.test'),venueId=owner.activeVenueId,date='2026-10-22';
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тестовое заведение',currency:'PMR_RUB',timezone:'UTC'}),owner.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 put('bd_employees',[{id:'anna',name:'Анна',status:'active',venueId,payrollRuleId:'rule'}]);put('bd_payroll_rules',[{id:'rule',blocks:[{type:'shift_rate',amount:999,enabled:true}]}]);
 const shift=(id:string,total:number,sequence:number)=>({id,venueId,date,accountingMonth:'2026-10',workdayStatus:'CLOSED',closingStatus:'closed',workdaySequence:sequence,workdayRevision:3,workdayOpenedAt:date+'T08:00:00Z',workdayClosedAt:date+'T12:00:00Z',staffing:[{employeeId:'anna',hours:4}],payrollBreakdown:{total,perEmployee:{anna:total},perDepartment:{Бар:total}},workdaySummary:{team:[{employeeId:'anna',name:'Анна',hours:4}],asOf:date+'T12:00:00Z'}});
 put('bd_operational_reports_v1',[shift('first',10,1),shift('second',20,2)]);
 const outsider=await runtime.register('payroll-other@local.test');const denied=await runtime.api.workdays.GET(runtime.request(outsider,'/api/workdays?date='+date+'&workdayId=first'));assert.equal(denied.status,404);
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],posts:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(new URL(r.url()).pathname);});
 const back=base+'/shifts?venue='+venueId+'&month=2026-10&workday='+date+'&workdayId=first';
 await page.goto(back);await page.getByRole('button',{name:'Посмотреть зарплату за смену'}).waitFor({timeout:15000});await page.getByRole('button',{name:'Посмотреть зарплату за смену'}).click();
 const panel=page.locator('[data-workday-payroll="first"]');await panel.getByText('Анна',{exact:true}).waitFor();assert.match(await panel.innerText(),/10/);assert.doesNotMatch(await panel.innerText(),/999/);await page.screenshot({path:out+'/payroll-390.png'});
 await page.reload();await panel.getByText('Анна',{exact:true}).waitFor();await page.locator('bd-app-header .bd-app-back').click();await page.getByRole('button',{name:'Посмотреть зарплату за смену'}).waitFor();assert.equal(new URL(page.url()).searchParams.get('workdayId'),'first');assert.equal(new URL(page.url()).searchParams.get('month'),'2026-10');
 await page.goto(base+'/finance/shift/second/payroll?venue='+venueId+'&workdayDate='+date);await page.locator('[data-workday-payroll="second"]').getByText('Анна',{exact:true}).waitFor();assert.match(await page.locator('[data-workday-payroll="second"]').innerText(),/20/);
 await page.goto(base+'/finance/shift/missing/payroll?venue='+venueId+'&workdayDate='+date);await page.getByText('Сохранённый расчёт этой смены недоступен',{exact:true}).waitFor();
 await page.route('**/api/workdays?*',async route=>{const response=await route.fetch();const value=await response.json();if(value.workday?.id==='first')delete value.workday.payrollBreakdown.perEmployee;await route.fulfill({json:value,status:response.status()});});
 await page.goto(base+'/finance/shift/first/payroll?venue='+venueId+'&workdayDate='+date);await page.getByText('Сохранённый расчёт этой смены недоступен',{exact:true}).waitFor();await page.unroute('**/api/workdays?*');
 let release!:()=>void;const gate=new Promise<void>(done=>release=done);let arrived!:()=>void;const seen=new Promise<void>(done=>arrived=done);
 await page.route('**/api/workdays?*',async route=>{const response=await route.fetch();if(new URL(route.request().url()).searchParams.get('workdayId')==='first'){arrived();await gate;}await route.fulfill({response});});
 await page.goto(base+'/finance/shift/first/payroll?venue='+venueId+'&workdayDate='+date,{waitUntil:'domcontentloaded'});await seen;
 await page.goto(base+'/finance/shift/second/payroll?venue='+venueId+'&workdayDate='+date);await page.locator('[data-workday-payroll="second"]').getByText('Анна',{exact:true}).waitFor();release();await page.waitForTimeout(150);assert.equal(await page.locator('[data-workday-payroll="first"]').count(),0);assert.match(await page.locator('[data-workday-payroll="second"]').innerText(),/20/);
 assert.deepEqual(errors,[]);assert.deepEqual(posts.filter(p=>p!=='/api/auth/bootstrap'),[]);assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',errors,posts,unchanged:true},null,2));console.log('PASS workday payroll exact link');await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
