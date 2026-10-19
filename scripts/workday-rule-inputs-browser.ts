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
type WorkdayPayload={ok:boolean;venueId:number;date:string;employees:Array<Record<string,unknown>&{requirements:Record<string,unknown>}>;workday:{staffing:Array<{employeeId:string;hours?:number;personalSales?:number}>;workdayRevision:number};payroll:{status:string;payrollBreakdown:unknown;missing:{field:string}[]}};
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
const out="outputs/workday-rule-inputs";mkdirSync(out,{recursive:true});const results:unknown[]=[];
try {
 for(const width of [390,1280]){
 const owner=await runtime.register(`flow-${width}@isolated.test`),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Workday QA',currency:'MDL',timezone:'Europe/Chisinau',workingDays:{},openTime:'18:00',closeTime:'02:00',areas:['Бар']}),owner.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(owner.userId,key,JSON.stringify(value),new Date().toISOString());
 const get=(key:string)=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json||'[]'));
 const employees=[['fixed','Анна · фикс за смену'],['percent','Борис · процент продаж'],['hourly','Виктор · почасовая'],['mixed','Глеб · фикс + почасовая']].map(([id,name])=>({id,name,position:'waiter',status:'active',payrollRuleId:id,venueId}));
 const rules=[{id:'fixed',blocks:[{type:'shift_rate',amount:500,enabled:true},{type:'hourly_rate',amount:100,enabled:false}]},{id:'percent',blocks:[{type:'personal_sales_percent',percent:10,enabled:true}]},{id:'hourly',blocks:[{type:'hourly_rate',amount:100,enabled:true}]},{id:'mixed',blocks:[{type:'shift_rate',amount:200,enabled:true},{type:'hourly_rate',amount:50,enabled:true}]}];
 put('bd_employees',employees);put('bd_payroll_rules',rules.map(r=>({...r,name:r.id,createdAt:'2026-10-10T12:00:00Z',updatedAt:'2026-10-10T12:00:00Z'})));
 put('bd_assortment_v1',JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venueId)));
 let browserUser=owner;
 if(width===1280){browserUser=await runtime.register('flow-admin@isolated.test');const workspace=runtime.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id!;runtime.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,browserUser.userId);runtime.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'shift_manager','active')").run(venueId,browserUser.userId);}
 const context=await browser.newContext({viewport:{width,height:844},timezoneId:'Europe/Chisinau'});
 await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:browserUser.email,token:browserUser.token,venueId});
 const page=salesSurfacePage(await context.newPage()),errors:string[]=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
 await page.goto(base+'/shifts?venue='+venueId);const flow=page.locator('[data-workday-state]');await flow.waitFor();
 await flow.locator('[data-workday-group] summary').click();
 for(const e of employees)await flow.getByRole('checkbox',{name:e.name,exact:true}).check();
 await flow.getByRole('button',{name:'Открыть смену',exact:true}).click();await page.locator('[data-workday-state="OPEN"]').waitFor();
 assert.deepEqual(get('bd_operational_reports_v1')[0].workdayPayrollDraft.missing.filter((m:{field:string})=>m.field==='hours').map((m:{employeeId:string})=>m.employeeId).sort(),['hourly','mixed']);
 const person=(id:string)=>flow.locator(`[data-workday-employee="${id}"]`);
 for(const id of ['fixed','percent'])assert.equal(await person(id).getByLabel('Часы',{exact:false}).count(),0);
 for(const id of ['hourly','mixed'])await person(id).getByLabel('Часы · обязательно',{exact:true}).fill('8');
 await person('percent').getByLabel('Личные продажи · ручная корректировка',{exact:true}).fill('1000');
 await flow.getByRole('button',{name:'Сохранить данные команды',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-workday-state]')?.textContent?.includes('2 000'));
 const report=get('bd_operational_reports_v1')[0];assert.equal(report.workdayPayrollDraft.status,'COMPLETE');assert.deepEqual(report.workdayPayrollDraft.payrollBreakdown.perEmployee,{fixed:500,percent:100,hourly:800,mixed:600});
 assert.equal(report.staffing.find((e:{employeeId:string})=>e.employeeId==='fixed').hours,undefined);assert.equal(report.staffing.find((e:{employeeId:string})=>e.employeeId==='percent').hours,undefined);
 const projection=await page.evaluate(async()=>{const response=await fetch('/api/workdays',{headers:{'x-session-email':localStorage.getItem('bd_session')!,'x-session-token':localStorage.getItem('bd_session_token')!,'x-venue-id':localStorage.getItem('bd_active_venue_id')!}});return response.json() as Promise<WorkdayPayload>});
 assert.ok(!JSON.stringify(projection).includes('\"blocks\"'));
 assert.equal(projection.ok,true);for(const e of projection.employees){assert.equal('payrollRuleId' in e,false);assert.equal('blocks' in e,false);assert.equal('amount' in e,false);assert.deepEqual(Object.keys(e.requirements).sort(),['departments','hours','personalSales','rulePresent','units','venueSales'].sort())}
 await flow.getByRole('button',{name:'Перейти к закрытию',exact:true}).click();
 for(const id of ['fixed','percent'])assert.ok(!(await person(id).innerText()).includes('Часы'));
 for(const id of ['hourly','mixed'])assert.ok((await person(id).innerText()).includes('8 ч'));
 await page.reload();await flow.waitFor();
 if(width===390){await page.evaluate(()=>{const target=document.querySelector('[data-workday-state]')!;document.querySelectorAll('body *').forEach(node=>{if(['fixed','sticky'].includes(getComputedStyle(node).position)&&!target.contains(node)&&!node.contains(target))node.setAttribute('data-screenshot-overlay','true')})});await flow.locator('h2').evaluate(el=>{el.textContent='Тестовые данные · разные правила оплаты'});await flow.screenshot({path:out+'/payment-types-390.png',style:'[data-screenshot-overlay]{visibility:hidden!important}'});}
 // Existing rule diagnostics remain authoritative: a missing or unknown rule
 // must not become a zero/ready payroll merely because its hour input is hidden.
 for(const variant of ['missing','unknown']){
 put('bd_employees',[...employees,{id:'unconfigured',name:'Дарья · правило требует проверки',position:'waiter',status:'active',payrollRuleId:variant,venueId}]);
 put('bd_payroll_rules',(variant==='unknown'?[...rules,{id:'unknown',blocks:[{type:'unsupported_test_type',enabled:true}]}]:rules).map(r=>({...r,name:r.id,createdAt:'2026-10-10T12:00:00Z',updatedAt:'2026-10-10T12:00:00Z'})));
 const response=await page.evaluate(async()=>{const headers={'content-type':'application/json','x-session-email':localStorage.getItem('bd_session')!,'x-session-token':localStorage.getItem('bd_session_token')!,'x-venue-id':localStorage.getItem('bd_active_venue_id')!};const current=await (await fetch('/api/workdays',{headers})).json() as WorkdayPayload;const staffing=current.workday.staffing.filter((e:{employeeId:string})=>e.employeeId!=='unconfigured');staffing.push({employeeId:'unconfigured'});const r=await fetch('/api/workdays',{method:'POST',headers,body:JSON.stringify({action:'team',venueId:current.venueId,date:current.date,expectedRevision:current.workday.workdayRevision,operationId:crypto.randomUUID(),staffing})});return {status:r.status,body:await r.json() as WorkdayPayload}});
 assert.equal(response.status,201);assert.equal(response.body.payroll.status,'INCOMPLETE');assert.equal(response.body.payroll.payrollBreakdown,null);assert.ok(response.body.payroll.missing.some((m:{field:string})=>m.field==='rule'));
 await page.reload();await person('unconfigured').waitFor();assert.equal(await person('unconfigured').locator('input').count(),0);assert.ok((await person('unconfigured').innerText()).includes('Не заполнено'));assert.ok((await flow.innerText()).includes(variant==='missing'?'Правило оплаты не задано':'Неизвестный тип правила оплаты'));
 }
 assert.deepEqual(errors,[]);results.push({width,role:width===390?'owner':'admin',status:'PASS',fixedWithoutHours:500,percentWithoutHours:100,hourly:800,mixed:600,disabledHourlyHidden:true,closingHoursConditional:true,missingAndUnknownRuleIncomplete:true,requirementsOnlyNoRules:true});
 }catch(error){writeFileSync(`${out}/${width}-failure.json`,JSON.stringify({url:page.url(),errors,text:await page.evaluate(()=>document.body.innerText)},null,2));await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});throw error}finally{await context.close()}
 }
 console.log(JSON.stringify(results));writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));await Promise.allSettled(pendingHandlers);runtime.close()}
