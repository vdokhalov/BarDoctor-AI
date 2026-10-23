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
const apiDelay = 80;
const runtime = await emptyMonthFixture({equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
try{
 const owner=runtime.user,venueId=runtime.venueId;
 for(const key of ['bd_tasks','bd_action_tasks','bd_action_plans'])runtime.seed(key,[]);
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(20000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 let calls=0;let actions:any[]=[];
 await page.route('**/api/ai/diagnosis',route=>{calls++;return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,generatedAt:'2026-10-23T19:45:00Z',data:{summary:'Подтверждённых действий нет',topPriority:{title:'Нет подтверждённых управленческих действий',category:'management',urgency:'low'},actions,areas:[],analysis:{},attention:{priorities:[],opportunities:[],history:[],diagnosticSentence:'Подтверждённых действий нет',dataQuality:{items:[]}},intelligence:{briefing:{todayActions:actions}}}})})});
 await page.goto(base+'/analysis?venue='+venueId);await page.getByRole('button',{name:'Запустить диагностику',exact:true}).click();await page.locator('[data-bd-ai-result]').waitFor();await page.waitForTimeout(600);
 const readTasks=()=>JSON.parse((runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_tasks'").get(runtime.account) as any).data_json);assert.equal(readTasks().length,0);
 const out=resolve('outputs/doctor-empty-actions');mkdirSync(out,{recursive:true});await page.locator('.bd-ai-management-today').screenshot({path:out+'/empty-actions-390.png'});await page.screenshot({path:out+'/empty-390.png',fullPage:true});await page.reload();await page.locator('[data-bd-ai-result]').waitFor();assert.equal(calls,1);assert.equal(readTasks().length,0);
 actions=[{title:'Проверить температуру холодильника',action:'Измерить температуру',steps:['Измерить температуру'],responsibleRole:'Управляющий',deadline:'2026-10-24',recommendationId:'cold',expectedResult:'Температура проверена',priority:'medium',evidence:[]}];await page.getByRole('button',{name:'Обновить анализ',exact:true}).first().click();await page.waitForTimeout(1000);assert.equal(readTasks().length,1);assert.equal(readTasks()[0].title,actions[0].title);
 await page.getByRole('button',{name:'Обновить анализ',exact:true}).first().click();await page.waitForTimeout(700);assert.equal(readTasks().length,1);
 await page.goto(base+'/tasks?venue='+venueId);await page.getByText(actions[0].title,{exact:true}).first().waitFor();await page.reload();await page.getByText(actions[0].title,{exact:true}).first().waitFor();await page.goBack();assert.equal(readTasks().length,1);assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,calls,checks:['empty response no writes','saved analysis reload no request','valid action persisted','same run no duplicate','task navigation and reload'],out}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
