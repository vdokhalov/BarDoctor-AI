import {GET as integrationsPage} from "../app/integrations/route";
import {GET as notificationsPage} from "../app/notifications/route";
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
const runtime = await emptyMonthFixture({activeVenue:"./app/api/access/active-venue/route",notifications:"./app/api/notifications/route",hub:"./app/api/integration-hub/route",reviewSources:"./app/api/reviews/sources/route",archive:"./app/api/assortment/archive/route",overview:"./app/api/assortment/overview/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/access/active-venue":"activeVenue","/api/notifications":"notifications","/api/integration-hub":"hub","/api/reviews/sources":"reviewSources","/api/assortment/archive":"archive", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/integrations")response=integrationsPage(new Request(url));
    else if(url.pathname==="/notifications")response=notificationsPage(new Request(url));
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/about", "/terms", "/privacy", "/catalog", "/nomenclature", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login", "/register"].includes(url.pathname)) response = barDoctorResponse();
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
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);
 const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});
 const privacy=()=>page.getByRole('heading',{name:'Конфиденциальность',exact:true});
 await page.goto(base+'/about?venue='+venueId);await page.getByRole('link',{name:'Конфиденциальность →'}).click();await privacy().waitFor();
 if(process.env.BD04_BASELINE){assert.equal(await page.getByRole('link',{name:'Назад',exact:true}).getAttribute('href'),'/login');await page.getByRole('link',{name:'Назад',exact:true}).click();await page.waitForURL('**/login');assert.equal(await page.evaluate(()=>localStorage.getItem('bd_session_token')),owner.token);console.log('BASELINE reproduced: privacy returns /login, session token retained');}
 else {
 for(let pass=0;pass<2;pass++){
  if(pass){await page.goto(base+'/about?venue='+venueId);await page.getByRole('link',{name:'Конфиденциальность →'}).click();await privacy().waitFor();}
  await page.goBack();await page.getByRole('link',{name:'Конфиденциальность →'}).waitFor();await page.goForward();await privacy().waitFor();await page.reload();await privacy().waitFor();await page.getByRole('link',{name:'Назад',exact:true}).click();await page.getByRole('link',{name:'Конфиденциальность →'}).waitFor();assert.equal(new URL(page.url()).pathname,'/about');assert.equal(new URL(page.url()).searchParams.get('venue'),String(venueId));
 }
 for(const route of ['privacy','terms']){await page.goto(base+'/'+route+'?venue='+venueId+'&returnTo=https://outside.invalid&from=https://outside.invalid');await page.getByRole('link',{name:'Назад',exact:true}).click();await page.waitForURL('**/about?venue='+venueId);}
 const anonContext=await browser.newContext(),anon=await anonContext.newPage();
 for(const [entry,target] of [['login','/login'],['register','/register']]){
  await anon.goto(base+'/'+entry);await anon.getByRole('link',{name:'Политику конфиденциальности',exact:true}).click();await anon.getByRole('heading',{name:'Конфиденциальность',exact:true}).waitFor();await anon.reload();assert.equal(await anon.getByRole('link',{name:'Назад',exact:true}).getAttribute('href'),target);await anon.getByRole('link',{name:'Назад',exact:true}).click();await anon.waitForURL('**'+target);
 }
 await anon.goto(base+'/privacy?from=//outside.invalid&venue=evil');assert.equal(await anon.getByRole('link',{name:'Назад',exact:true}).getAttribute('href'),'/login');await anonContext.close();assert.deepEqual(writes,[]);console.log(JSON.stringify({pass:true,checks:['owner About/privacy/Back','repeat','reload','browser Back/Forward','direct owner fallback','anonymous login and registration entries','external redirect rejected','terms regression','no writes']}));
 }
 await context.close();

}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
