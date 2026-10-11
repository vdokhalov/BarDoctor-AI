import assert from "node:assert/strict";
import { patchFinanceCanonicalV515 } from "./patch-finance-canonical-v515.mjs";
import { closingFixture } from "../tests/helpers/month-close-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
let apiDelay = 0, denyMonth = false;
const runtime = await closingFixture({storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (url.pathname === "/api/month-close" && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (url.pathname === "/api/month-close" && denyMonth) response = Response.json({ok:false,code:"ACCESS_DENIED"},{status:403});
    else if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve("public", "." + url.pathname);
      response = file.startsWith(resolve("public")) && existsSync(file) ? new Response(/index-BQGspy0I.*\.js$/.test(file) ? patchFinanceCanonicalV515(readFileSync(file,"utf8")) : readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
const width = Number(process.env.BD_QA_WIDTH || 390);
const engine = process.env.BD_QA_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = engine === "webkit" ? await webkit.launch({ headless: true }) : await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
try {
 const owner=runtime.user,venueId=runtime.venueId;
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const preview=await(await runtime.get()).json();assert.equal(preview.report.finalProfit,314);assert.equal(preview.report.payroll,100);assert.equal(preview.report.costOfGoods,720);
 const context=await browser.newContext({viewport:{width,height:844}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const errors:string[]=[];const newPage=async()=>{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return page;};let page=await newPage();
 apiDelay=1000;
 await page.goto(base+'/finance?venue='+venueId+'&month=2026-09');
 await page.locator('[data-bd-finance-canonical-status]').waitFor();
 assert.equal(await page.locator('[data-bd-finance-result-level="final"]').count(),0);
 await page.locator('[data-bd-finance-result-level="final"]').waitFor();apiDelay=0;
 assert.match(await page.locator('[data-bd-finance-result-level="final"]').innerText(),/314/);
 assert.match(await page.locator('.bd-finance-kpis-v160 .payroll').innerText(),/100/);
 assert.doesNotMatch(await page.locator('[data-bd-finance-dashboard]').innerText(),/Остатки не сходятся/);
 await page.getByRole('button',{name:'Месячный отчёт',exact:true}).click();
 await page.locator('[data-bd-monthly-report]').waitFor();
 assert.equal(new URL(page.url()).searchParams.get('month'),'2026-09');
 assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 runtime.seed('bd_finance_expenses',[{id:'private-review-reference',venueId,date:'2026-09-02',amount:30,currency:'MDL',category:'rent',evidence:{workspaceId:999999}}]);
 const blockedBefore=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 page=await newPage();await page.goto(base+'/finance?venue='+venueId+'&month=2026-09');
 const reasons=page.locator('[data-bd-monthly-blockers]');await reasons.waitFor();assert.match(await reasons.innerText(),/несовместимые ссылки/);
 assert.doesNotMatch(await reasons.innerText(),/private-review-reference|999999/);
 assert.doesNotMatch(await page.locator('[data-bd-finance-result-level="final"]').innerText(),/314/);
 denyMonth=true;page=await newPage();await page.goto(base+'/finance?venue='+venueId+'&month=2026-09');
 const denied=page.locator('[data-bd-finance-canonical-status][role="alert"]');await denied.waitFor();assert.equal(await page.locator('[data-bd-finance-result-level="final"]').count(),0);
 assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),blockedBefore);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({engine,width,fullSpa:true,realApi:true,financeMatchesServerProfit314:true,monthlyReportMonthPreserved:true,pendingNoFallback:true,blockedReasonsVisible:true,deniedNoFallback:true,noWrites:true}));
 await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}
