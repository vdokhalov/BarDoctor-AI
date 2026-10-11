import assert from "node:assert/strict";
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
const apiDelay = 0;
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
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
const engine = process.env.BD_QA_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = engine === "webkit" ? await webkit.launch({ headless: true }) : await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
try {
 const owner=runtime.user,venueId=runtime.venueId;
 const existingExpenses=JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_finance_expenses'").get(runtime.account)!.data_json));
 runtime.seed('bd_finance_expenses',[...existingExpenses,{id:'october-qa',venueId,date:'2026-10-01',amount:10,category:'rent',currency:'MDL'}]);
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 for(const width of [390,1165,1440]) {
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage();page.on('pageerror',error=>console.error('PAGEERROR',error.message));await page.goto(base+'/warehouse?tab=counts&venue='+venueId);
 const card=page.locator('.bd-inventory-accounting-boundary-v515').filter({hasText:'2026-09-01'});await card.waitFor();
 const geometry=await card.evaluate(card=>{const [outer,heading,link]=[card,card.querySelector('h3')!,card.querySelector('a')!].map(e=>{const r=e.getBoundingClientRect();return{width:r.width,height:r.height}});return{card:outer,heading,link}});
 assert(geometry.heading.width>150&&geometry.heading.height<50,JSON.stringify(geometry));assert(geometry.link.width>150&&geometry.link.height>=44,JSON.stringify(geometry));assert(geometry.card.height<350,JSON.stringify(geometry));
 await page.screenshot({path:'/workspace/ci-evidence/inventory-full-spa-layout-'+width+'.png',fullPage:true});
 await card.getByRole('link',{name:'Открыть месячный отчёт'}).click();
 await page.waitForURL('**/reports?month=2026-09&venue='+venueId+'&closeMonth=1');await page.getByRole('dialog',{name:'Мастер закрытия месяца'}).waitFor();
 const entered=await page.evaluate(()=>({url:location.pathname+location.search,previous:history.state?.bdPreviousUrl}));
 assert.match(entered.previous,/warehouse\?tab=counts&venue=/);
 await page.getByRole('button',{name:'Закрыть мастер',exact:true}).click();assert.equal(new URL(page.url()).searchParams.has('closeMonth'),false);
 await page.getByRole('button',{name:'Вернуться назад',exact:true}).first().click();await page.waitForURL('**/warehouse?tab=counts&venue='+venueId);
 const october=page.locator('.bd-inventory-accounting-boundary-v515').filter({hasText:'2026-10-01'});await october.getByRole('link',{name:'Открыть месячный отчёт'}).click();await page.getByRole('dialog',{name:'Мастер закрытия месяца'}).waitFor();
 assert.equal(new URL(page.url()).searchParams.get('month'),'2026-10');
 await page.getByRole('button',{name:'Закрыть мастер',exact:true}).click();await page.goBack();await page.waitForURL('**/warehouse?tab=counts&venue='+venueId);
 await page.goto(base+'/reports?month=2026-09&venue='+venueId);await page.locator('[data-bd-monthly-report]').waitFor();await page.getByRole('button',{name:'Вернуться назад',exact:true}).first().click();await page.waitForURL(url=>url.pathname==='/finance'&&url.searchParams.get('month')==='2026-09'&&url.searchParams.get('venue')===String(venueId));

 assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 console.log(JSON.stringify({width,fullSpa:true,realApi:true,cardCloseHeaderBack:true,octoberCloseBrowserBack:true,directReportScopedFinanceBack:true,noWrites:true,geometry}));await context.close();
 }
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}
