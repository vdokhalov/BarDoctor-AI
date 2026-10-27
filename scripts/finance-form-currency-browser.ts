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
let apiDelay = 0, failDays=false, failStore=false;
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

    else if (url.pathname.startsWith("/finance/settings") || url.pathname.startsWith("/salaries") || ["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 runtime.seed('bd_employees',[{id:'anna',name:'Анна',status:'active',venueId}]);
 mkdirSync('outputs/bd09-currency',{recursive:true});
 for(const currency of ['MDL','PMR_RUB','EUR']){
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тест валюты',currency,timezone:'Europe/Chisinau'}),runtime.account);
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors:string[]=[],writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 const label=currency==='PMR_RUB'?'руб. ПМР':currency;
 await page.goto(base+'/finance/settings?venue='+venueId);await page.getByLabel('Налоги — способ внесения',{exact:true}).waitFor();await page.waitForTimeout(1800);await page.getByLabel('Налоги — способ внесения',{exact:true}).selectOption('fixed');await page.getByLabel('Коммунальные услуги — способ внесения',{exact:true}).selectOption('fixed');
 console.log('settings inputs',await page.locator('input').evaluateAll(xs=>xs.map(x=>({label:x.getAttribute('aria-label'),value:(x as HTMLInputElement).value}))));await page.getByLabel('Налоги — сумма за месяц, '+label,{exact:true}).waitFor();await page.getByLabel('Коммунальные услуги — сумма за месяц, '+label,{exact:true}).waitFor();
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});await page.getByLabel('Налоги — сумма за месяц, '+label,{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'outputs/bd09-currency/settings-'+currency+'-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.goto(base+'/salaries?venue='+venueId+'&month=2026-10');await page.waitForTimeout(1600);await page.getByRole('button',{name:'Добавить операцию',exact:true}).click();const amount=page.getByLabel('Сумма зарплатной операции, '+label,{exact:true});await amount.waitFor();assert.equal(await amount.inputValue(),'');await amount.fill('12.50');assert.equal(await amount.inputValue(),'12.50');for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});await page.screenshot({path:'outputs/bd09-currency/payroll-'+currency+'-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}await page.getByRole('button',{name:'Закрыть форму',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Добавить операцию',exact:true}).click();assert.equal(await page.getByLabel('Сумма зарплатной операции, '+label,{exact:true}).inputValue(),'');await page.goto(base+'/finance?venue='+venueId+'&repairEquipmentId=local-equipment');await page.getByLabel('Сумма расхода, '+label,{exact:true}).waitFor();assert.equal(await page.getByLabel('Сумма расхода, '+label,{exact:true}).inputValue(),'');for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});await page.screenshot({path:'outputs/bd09-currency/expense-'+currency+'-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}console.log('PASS settings, payroll, expense '+currency+' 390/820/1280, blank, reopen/reload'); 
 await context.close();assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 }
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
