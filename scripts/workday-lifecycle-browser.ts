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
    else if(url.pathname==="/cashier") response=cashierPage();
    else if (["/more", "/shifts", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve("public", "." + url.pathname);
      response = file.startsWith(resolve("public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
const out="outputs/workday-lifecycle";mkdirSync(out,{recursive:true});const results:unknown[]=[];
try {
 for(const width of [390,1280]){
 const owner=await runtime.register(`flow-${width}@isolated.test`),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Workday QA',currency:'MDL',timezone:'Europe/Chisinau',workingDays:{},openTime:'18:00',closeTime:'02:00',areas:['Бар']}),owner.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(owner.userId,key,JSON.stringify(value),new Date().toISOString());
 const get=(key:string)=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json||'[]'));
 put('bd_employees',Array.from({length:12},(_,i)=>({id:'employee-'+i,name:['Анна','Борис','Виктор','Глеб','Дарья','Елена','Жанна','Зоя','Иван','Кирилл','Лев','Мария'][i],position:i<3?'waiter':i<6?'security_guard':i<9?'bartender':i<11?'other':'',customPositionLabel:i>=9?'Сомелье':'',status:'active',payrollRuleId:'hourly',venueId})));
 put('bd_payroll_rules',[{id:'hourly',blocks:[{type:'hourly_rate',amount:100,enabled:true}]}]);
 put('bd_assortment_v1',JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venueId)));
 let browserUser=owner;
 if(width===1280){browserUser=await runtime.register('flow-admin@isolated.test');const workspace=runtime.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id!;runtime.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,browserUser.userId);runtime.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'shift_manager','active')").run(venueId,browserUser.userId);}
 const context=await browser.newContext({viewport:{width,height:844},timezoneId:'Europe/Chisinau'});
 await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:browserUser.email,token:browserUser.token,venueId});
 const page=salesSurfacePage(await context.newPage()),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(base+'/shifts?venue='+venueId);const flow=page.locator('[data-workday-state]');await flow.waitFor();
 assert.equal(await flow.locator('[data-workday-group]').count(),5);assert.equal(await flow.locator('[data-workday-group][open]').count(),0);
 const waiter=flow.locator('[data-workday-group="Официант"]');await waiter.locator('summary').click();await waiter.getByRole('checkbox',{name:'Анна',exact:true}).check();await waiter.locator('summary').click();
 const security=flow.locator('[data-workday-group="Охранник"]');await security.locator('summary').click();await security.getByRole('checkbox',{name:'Глеб',exact:true}).check();await security.locator('summary').click();await waiter.locator('summary').click();assert.equal(await waiter.getByRole('checkbox',{name:'Анна',exact:true}).isChecked(),true);await waiter.locator('summary').click();
 await flow.getByLabel('Начало смены',{exact:true}).fill('18:00');await page.screenshot({path:`${out}/${width}-opening.png`,fullPage:true});
 await flow.getByRole('button',{name:'Открыть смену',exact:true}).click();await page.locator('[data-workday-state="OPEN"]').waitFor();assert.equal(get('bd_finance_revenue').length,0);assert.equal(get('bd_operational_reports_v1')[0].payrollBreakdown,undefined);
 for(const id of ['employee-0','employee-3'])await flow.locator(`[data-workday-employee="${id}"]`).getByLabel('Часы · обязательно',{exact:true}).fill('8');
 await flow.getByRole('button',{name:'Сохранить команду и часы',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-workday-state]')?.textContent?.includes('1 600'));assert.equal(get('bd_operational_reports_v1')[0].workdayPayrollDraft.payrollBreakdown.total,1600);
 await flow.getByRole('button',{name:'Открыть кассу',exact:true}).click();await page.locator('#work:not([hidden])').waitFor();
 await page.locator('[data-action="open-shift"]').click();await page.locator('#dialog input[name="name"]').fill('QA cash');await page.locator('#dialog input[name="float"]').fill('100');await page.locator('#dialog-submit').click();
 const cash=get('bd_finance_revenue')[0];assert.equal(cash.date,get('bd_operational_reports_v1')[0].date);
 // Real sales command, then verify the same day UI and existing cash close.
 const send=(body:object)=>runtime.api.sales.POST(runtime.request(owner,'/api/sales-events','POST',{venueId,...body}));
 const command={id:'sale',source:'POS_API',shiftId:cash.id,lines:[{id:'line',menuItemId:'beer',quantity:2}],payments:[{id:'cash',method:'CASH',amount:40}]};
 const preview=await(await send({action:'preview',command})).json() as {previewHash:string};assert.equal((await send({action:'post',command,previewHash:preview.previewHash})).status,201);
 await page.goto(base+'/shifts?venue='+venueId);await page.locator('[data-workday-state="OPEN"]').waitFor();assert.match(await flow.innerText(),/40/);await page.screenshot({path:`${out}/${width}-working.png`,fullPage:true});
 await flow.getByRole('button',{name:'Заполнить списания и происшествия',exact:true}).click();await page.getByRole('button',{name:'Далее',exact:true}).waitFor();await page.getByRole('button',{name:'Далее',exact:true}).click();if(width===390){await page.getByRole('button',{name:'+ Добавить происшествие',exact:true}).click();await page.getByPlaceholder('Кратко: что произошло? *',{exact:true}).fill('Синтетическая проверка рабочего дня');}await page.getByRole('button',{name:'Далее',exact:true}).click();
 await page.getByRole('button',{name:/Сохранить изменения|Закрыть смену/,exact:true}).last().click();await flow.getByRole('button',{name:'Перейти к закрытию',exact:true}).waitFor();
 assert.equal(get('bd_operational_reports_v1')[0].workdayStatus,'OPEN');assert.equal(get('bd_operational_reports_v1')[0].payrollBreakdown,undefined);
 assert.equal((await send({action:'close_shift',shiftId:cash.id,actualCash:140})).status,201);
 await page.reload();await page.locator('[data-workday-state="OPEN"]').waitFor();await flow.getByRole('button',{name:'Перейти к закрытию',exact:true}).click();
 const finish=flow.getByRole('button',{name:'Закрыть смену',exact:true});assert.equal(await finish.isDisabled(),true);
 await flow.getByRole('checkbox',{name:'Списания · не было',exact:true}).check();await flow.getByRole('checkbox',{name:width===390?'Происшествия · проверено (1)':'Происшествия · не было',exact:true}).check();await flow.getByRole('checkbox',{name:'Команда, часы и ФОТ · проверены',exact:true}).check();
 await page.screenshot({path:`${out}/${width}-closing.png`,fullPage:true});await finish.click();await page.locator('[data-workday-state="CLOSED"]').waitFor();
 assert.equal(get('bd_operational_reports_v1')[0].payrollBreakdown.total,1600);assert.equal(get('bd_finance_revenue')[0].revenue,40);assert.equal(get('bd_stock_movements').length,1);assert.equal(get('bd_payroll_entries').length,0);assert.equal(get('bd_cases').length,width===390?1:0);
 await page.reload();await page.locator('[data-workday-state="CLOSED"]').waitFor();assert.match(await flow.innerText(),/Итоговый отчёт/);assert.deepEqual(errors,[]);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 results.push({width,role:width===1280?'shift_manager':'owner',status:'PASS',employees:12,groups:5,selectionPreserved:true,workdayPayroll:1600,revenue:40,stockMovements:1,duplicatePayrollEntries:0});
 }catch(error){writeFileSync(`${out}/${width}-failure.json`,JSON.stringify({url:page.url(),errors,text:await page.evaluate(()=>document.body.innerText)},null,2));await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});throw error}finally{await context.close()}
 }
 console.log(JSON.stringify(results));writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));await Promise.allSettled(pendingHandlers);runtime.close()}
