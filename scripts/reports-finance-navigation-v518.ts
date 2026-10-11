import assert from "node:assert/strict";
import { closingFixture } from "../tests/helpers/month-close-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import vm from "node:vm";
const emittedSource=readFileSync('dist/server/index.js','utf8');
const htmlMatch=emittedSource.match(/var BAR_DOCTOR_HTML = (`(?:\\.|[^`])*`);/s);
const htmlStart=emittedSource.indexOf('var BARDOCTOR_BUILD_ID =');
assert(htmlMatch&&htmlStart>=0&&htmlMatch.index!>htmlStart,'Emitted HTML and its shell declarations required');
const emittedHtml=vm.runInNewContext(emittedSource.slice(htmlStart,htmlMatch.index!+htmlMatch[0].length)+';BAR_DOCTOR_HTML;') as string;
const barDoctorResponse=()=>new Response(emittedHtml,{headers:{'Content-Type':'text/html; charset=utf-8'}});
const emittedBootstrap=readFileSync('dist/client/bardoctor-preview-v397.js','utf8');
assert(emittedBootstrap.includes('reportParentV516')&&emittedBootstrap.includes('reportScopeV518'),'Published bootstrap must include both navigation fixes');
assert(readFileSync('dist/client/navigation-contract-v247.js','utf8').includes('finance.searchParams.set(key'),'Published navigation contract must preserve report scope');
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
      const file = resolve("dist/client", "." + url.pathname);
      response = file.startsWith(resolve("dist/client")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 for(const width of [390,1440])for(const control of ['back','related','global','expenses','shifts','empty']) {
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
  const month=control==='empty'?'2026-08':'2026-09';const page=await context.newPage();await page.goto(base+'/reports?month='+month+'&venue='+venueId);await page.locator('[data-bd-monthly-report]').waitFor();if(control!=='empty')await page.getByText('В том числе премии',{exact:true}).waitFor();
  if(control==='back') {const previous=await page.evaluate(()=>history.state?.bdPreviousUrl);assert.equal(previous,'/finance?month=2026-09&venue='+venueId);await page.getByRole('button',{name:'Вернуться назад',exact:true}).click();}
  else if(control==='related')await page.getByRole('button',{name:'Финансы',exact:true}).click();
  else if(control==='global')await page.locator('[data-bd-nav-key="finance"]:visible').first().click();
  else if(control==='expenses')await page.getByRole('button',{name:'Все категории',exact:true}).click();
  else if(control==='shifts')await page.getByRole('button',{name:'Открыть смены',exact:true}).click();else await page.getByRole('button',{name:'Открыть финансы',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/finance'&&url.searchParams.get('month')===month&&url.searchParams.get('venue')===String(venueId));
  if(control==='expenses')assert.equal(new URL(page.url()).searchParams.get('view'),'expenses');
  if(control==='shifts')assert.equal(new URL(page.url()).searchParams.get('view'),'revenue');
  assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
  console.log(JSON.stringify({engine,width,control,emittedArtifact:true,freshContext:true,monthPreserved:true,venuePreserved:true,noWrites:true}));await context.close();
 }
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}
