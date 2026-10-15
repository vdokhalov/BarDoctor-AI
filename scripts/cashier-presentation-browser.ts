import {seedOpenWorkday} from '../tests/helpers/pos-workday-fixture';
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit, devices } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = process.env.BD_OPERATIONAL_TEST_INSTANT;
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ batches:"./app/api/sales-batches/route",workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));
    else if (["/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
const browser=await webkit.launch({headless:true,...(process.env.BD_QA_WEBKIT?{executablePath:process.env.BD_QA_WEBKIT}:{})});
const out=process.env.BD_CASHIER_EVIDENCE||'outputs/cashier-presentation';mkdirSync(out,{recursive:true});
try{
const owner=await runtime.register('gap@isolated.test'),venueId=owner.activeVenueId;
runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"name":"Synthetic geometry","currency":"MDL","timezone":"UTC"}',owner.userId);
seedOpenWorkday(runtime.sqlite,owner.userId,venueId,new Date().toISOString().slice(0,10));
const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}});
await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));const original=CSSStyleDeclaration.prototype.setProperty;CSSStyleDeclaration.prototype.setProperty=function(k,v,p){if(this===document.documentElement?.style&&k==='--bd-safe-top')return original.call(this,k,'59px','important');if(this===document.documentElement?.style&&k==='--bd-safe-bottom')return original.call(this,k,'34px','important');return original.call(this,k,v,p);};document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--bd-safe-top','59px','important');document.documentElement.style.setProperty('--bd-safe-bottom','34px','important')});},{owner,venueId});
await context.addInitScript({content:'window.__name=(value)=>value;'});const page=await context.newPage();const results=[];
for(const [width,height] of [[390,844],[600,844],[601,844],[820,1000],[1280,800]]){
 await page.setViewportSize({width,height});await page.goto(base+'/cashier?venue='+venueId);await page.waitForLoadState('networkidle');const frame=await(await page.locator('iframe[data-bd-sales-surface]').elementHandle())!.contentFrame();assert.ok(frame);await frame.getByText('Кассовая смена закрыта',{exact:true}).waitFor();
 const child=await frame.evaluate(()=>({embedded:document.documentElement.dataset.bdEmbedded,padding:getComputedStyle(document.body).paddingTop,sidebarTop:document.querySelector('.sidebar').getBoundingClientRect().top}));assert.equal(child.embedded,'true');assert.equal(child.padding,'0px');
 const geometry=await page.evaluate(()=>{const f=document.querySelector('iframe[data-bd-sales-surface]').getBoundingClientRect(),n=document.querySelector('nav[data-bd-bottom-nav]').getBoundingClientRect(),h=document.querySelector('body>bd-app-header').getBoundingClientRect();return{iframeTop:f.top,headerBottom:h.bottom,gap:n.top-f.bottom}});assert.ok(Math.abs(geometry.iframeTop-geometry.headerBottom)<=1,'top edge '+width);if(width<900)assert.ok(Math.abs(geometry.gap)<=1,'bottom seam '+width);if(width<=600)assert.equal(child.sidebarTop,0);if(width===390)await page.screenshot({path:out+'/mobile-after.png'});
 results.push({mode:'embedded',width,height,child,geometry});
 if(width===390){await page.setViewportSize({width:390,height:500});await frame.evaluate(()=>window.scrollTo(0,9999));await frame.waitForFunction(()=>scrollY>0);const scrollY=await frame.evaluate(()=>window.scrollY);await page.setViewportSize({width:390,height:844});await frame.locator('#sales-journal').tap();await page.waitForURL(u=>u.pathname==='/sales-import');await page.frameLocator('iframe[data-bd-sales-surface]').locator('.sales-navigation').waitFor();results.push({scrollY,back:'PASS'});}
}
for(const width of [390,600,601,820,1280]){await page.setViewportSize({width,height:844});await page.goto(base+'/cashier?embedded=1&venue='+venueId);await page.waitForLoadState('networkidle');await page.locator('#work').waitFor();const standalone=await page.evaluate(()=>({embedded:document.documentElement.dataset.bdEmbedded||null,padding:getComputedStyle(document.body).paddingTop}));assert.notEqual(standalone.embedded,'true');assert.equal(standalone.padding,width<=600?'59px':'0px');results.push({mode:'standalone',width,standalone});}writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
