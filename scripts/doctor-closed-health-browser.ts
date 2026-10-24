import assert from "node:assert/strict";
import { BUSINESS_HEALTH_CALCULATION_VERSION } from "../lib/bardoctor/business-health-snapshot";
import {emptyMonthFixture} from "../tests/helpers/empty-month-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
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
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(process.env.BASELINE_EX04 && /\/assets\/index-.*\.js$/.test(url.pathname) ? process.env.BASELINE_EX04 : file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
try{await (async()=>{
 const owner=runtime.user,venueId=runtime.venueId;
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(20000);page.on('dialog',dialog=>dialog.accept());const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});page.on('console',msg=>{if(msg.type()==='error')console.error(msg.text())});
 let calls=0,healthCalls=0,mode='saved',score:number|null=null,day='23',delay=0;
 const health=()=>({success:true,generatedAt:`2026-10-${day}T12:00:00Z`,data:{intelligence:{version:'ai-doctor-intelligence-v3',businessHealth:{score,components:[],label:'insufficient_data'},dataQuality:{percent:83}},businessHealthSnapshot:{snapshotId:'closed-'+day,venueId,dataAccountId:runtime.account,closedWorkdayCapture:true,calculationVersion:BUSINESS_HEALTH_CALCULATION_VERSION,score,status:score===null?'insufficient_data':'healthy',generatedAt:`2026-10-${day}T12:00:00Z`,dataQualityPercent:83,livePeriod:{periodLabel:`1–${day} октября`},zones:[]}}});
 await page.route('**/api/business-health**',async route=>{healthCalls++;const body=mode==='empty'?{success:false,code:'HEALTH_NO_SNAPSHOT'}:mode==='error'?{success:false,error:'Fixture error'}:health();const status=mode==='error'?500:200;if(delay)await new Promise(done=>setTimeout(done,delay));await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});});
 await page.route('**/api/ai/diagnosis',route=>{calls++;return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,generatedAt:'2026-10-24T12:00:00Z',data:{summary:'Тестовый сохранённый анализ',actions:[],areas:[],analysis:{},attention:{priorities:[],opportunities:[],history:[],dataQuality:{items:[]}},intelligence:{businessHealth:{score:76,confidencePercent:91,components:[]},briefing:{businessHealthSummary:{score:76,label:'Хорошее состояние'},dataQualitySummary:{percent:91},todayActions:[]}}}})});});
 await page.goto(base+'/analysis?venue='+venueId);await page.getByRole('button',{name:'Запустить диагностику',exact:true}).click();await page.waitForTimeout(1000);writeFileSync(process.env.BASELINE_EX04?'/tmp/ex04-baseline-rendered.txt':'/tmp/ex04-rendered.txt',await page.locator('body').innerText());console.log(JSON.stringify({calls,healthCalls,errors}));const card=page.locator('[data-bd-doctor-closed-health]');if(process.env.BASELINE_EX04){await page.locator('.bd-ai-health-details').getByText('76 / 100 · Хорошее состояние',{exact:true}).waitFor();console.log(JSON.stringify({baselineReproduced:true,doctor:76,closedScore:null,closedPeriod:'1–23 октября',healthCalls}));await context.close();return;}await card.getByText('Недостаточно данных',{exact:true}).waitFor();await card.locator('summary').click();assert.ok((await card.innerText()).includes('83%'));assert.ok((await card.innerText()).includes('1–23 октября'));assert.ok(!(await card.innerText()).includes('76 / 100'));
 await page.reload();await card.getByText('Недостаточно данных',{exact:true}).waitFor();assert.equal(calls,1,'reload saved analysis must not run AI');
 const out=resolve('outputs/doctor-closed-health');mkdirSync(out,{recursive:true});await card.locator('summary').click();await card.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/closed-390.png'});
 // A later completed capture updates only the displayed Health. The saved analysis remains unchanged.
 score=64;day='24';await page.reload();await card.getByText(/64 \/ 100/).waitFor();await card.locator('summary').click();assert.ok((await card.innerText()).includes('1–24 октября'));assert.equal(calls,1);
 for(const width of [820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 mode='empty';await page.reload();await card.getByText('Оценка пока недоступна',{exact:true}).waitFor();assert.ok(!(await card.innerText()).includes('76 / 100'));
 mode='error';await page.reload();await card.getByText('Не удалось загрузить оценку',{exact:true}).waitFor();await card.locator('summary').click();score=0;await card.getByRole('button',{name:'Повторить',exact:true}).waitFor();mode='saved';await card.getByRole('button',{name:'Повторить',exact:true}).evaluate((button:HTMLButtonElement)=>button.click());await card.getByText(/0 \/ 100/).waitFor();assert.equal(calls,1);
 delay=1500;await page.reload();await card.getByText('Загрузка…',{exact:true}).waitFor();await card.getByText(/0 \/ 100/).waitFor();assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,calls,healthCalls,checks:['saved current analysis 76 cannot replace closed capture','closed coverage and period','reload no AI','next closed snapshot updates saved analysis card','390/820/1280','no snapshot','error/retry','confirmed zero','loading'],out}));await context.close();
})();}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
