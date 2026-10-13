import assert from "node:assert/strict";
import { closingFixture } from "../tests/helpers/month-close-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import vm from "node:vm";
const emittedSource=readFileSync('dist/server/index.js','utf8');
const htmlMatch=emittedSource.match(/var BAR_DOCTOR_HTML = (`(?:\\.|[^`])*`);/s);
const htmlStart=emittedSource.indexOf('var BARDOCTOR_BUILD_ID =');
assert(htmlMatch&&htmlStart>=0&&htmlMatch.index!>htmlStart,'Emitted HTML and its shell declarations required');
const emittedHtml=vm.runInNewContext(emittedSource.slice(htmlStart,htmlMatch.index!+htmlMatch[0].length)+';BAR_DOCTOR_HTML;') as string;
const barDoctorResponse=()=>new Response(emittedHtml,{headers:{'Content-Type':'text/html; charset=utf-8'}});
const emittedBootstrap=readFileSync('dist/client/bardoctor-preview-v397.js','utf8');
assert(emittedBootstrap.includes('controller.abort(timeout)'),'Emitted bootstrap must identify timeout');
assert(emittedSource.includes('auth-schema-readonly-p0'),'Emitted server must use the read-only schema check');
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const apiDelay = 0;
let failure: "none" | "hang" | "reject" = "none";
const releases: Array<()=>void> = [];
const responses: Array<{path:string,status:number}> = [];
const runtime = await closingFixture({telemetry:"./lib/bardoctor/request-observability",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
runtime.onRead(sql=>{if(!sql.includes('auth-schema-readonly-p0'))return;if(failure==='reject')throw Error('isolated schema outage');if(failure==='hang')return new Promise<void>(resolve=>releases.push(resolve));});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/login": "login", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) {
      const request=new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) });
      const boundary=runtime.api.telemetry.withInfrastructureErrorBoundary as unknown as typeof import('../lib/bardoctor/request-observability').withInfrastructureErrorBoundary;
      response=await boundary(request,()=>runtime.api[name][req.method || "GET"](request, { params: Promise.resolve({ key }) } as never));
    }

    else if (["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve("dist/client", "." + url.pathname);
      response = file.startsWith(resolve("dist/client")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    responses.push({path:url.pathname,status:response.status});
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
 for(const width of [390,1440]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage();await page.goto(base+'/login');
  await page.locator('#bd-login-email').fill(runtime.user.email);await page.locator('#bd-login-password').fill('Isolated-Test-Password-123!');
  failure='reject';await page.getByRole('button',{name:'Войти',exact:true}).click();
  await page.getByText('Не удалось завершить вход. Попробуйте ещё раз.',{exact:true}).waitFor();
  assert(await page.getByRole('button',{name:'Войти',exact:true}).isEnabled());
  // Login can first update the SPA URL and then replace the document. Wait for
  // the completed navigation before reading state from its execution context.
  failure='none';await page.getByRole('button',{name:'Войти',exact:true}).click();await page.waitForURL('**/home',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>(window as unknown as {__bdAuthBootstrapV274?:{state:string}}).__bdAuthBootstrapV274?.state==='ready');
  const token=await page.evaluate(()=>localStorage.getItem('bd_session_token'));assert(token);
  await page.evaluate(()=>localStorage.setItem('p0-draft-sentinel','keep'));
  await page.reload();await page.waitForFunction(()=>(window as unknown as {__bdAuthBootstrapV274?:{state:string}}).__bdAuthBootstrapV274?.state==='ready');
  assert.equal(await page.evaluate(()=>localStorage.getItem('bd_session_token')),token);
  failure='hang';await page.reload();
  await page.getByRole('button',{name:'Повторить загрузку',exact:true}).waitFor({timeout:14000});
  assert.equal(await page.evaluate(()=>(window as unknown as {__bdAuthBootstrapV274?:{state:string}}).__bdAuthBootstrapV274?.state),'error');
  assert.equal(await page.evaluate(()=>localStorage.getItem('bd_session_token')),token);
  assert.equal(await page.evaluate(()=>localStorage.getItem('p0-draft-sentinel')),'keep');
  failure='none';await page.getByRole('button',{name:'Повторить загрузку',exact:true}).click();
  await page.waitForFunction(()=>(window as unknown as {__bdAuthBootstrapV274?:{state:string}}).__bdAuthBootstrapV274?.state==='ready');
  releases.splice(0).forEach(done=>done());
  assert.equal(await page.evaluate(()=>localStorage.getItem('p0-draft-sentinel')),'keep');
  console.log(JSON.stringify({engine,width,login:true,sessionReload:true,hung503:true,retryWhileOldPending:true,draftPreserved:true}));
  await context.close();
 }
 assert(responses.some(row=>row.path==='/api/auth/login'&&row.status===503));
 assert(responses.some(row=>row.path==='/api/auth/bootstrap'&&row.status===503));
} finally {
 releases.splice(0).forEach(done=>done());await browser.close();
 await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.close();
}
