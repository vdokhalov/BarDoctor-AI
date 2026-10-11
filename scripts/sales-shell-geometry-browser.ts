import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
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
const browser = await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
const out='outputs/sales-shell-geometry';mkdirSync(out,{recursive:true});const results:unknown[]=[];
try{
 const owner=await runtime.register('shell-geometry@isolated.test'),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"name":"Synthetic geometry","currency":"MDL","timezone":"UTC"}',owner.userId);
 for(const width of (process.env.BD_GEOMETRY_BASELINE?[1280]:[390,820,1280])){
 const context=await browser.newContext({viewport:{width,height:900}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{for(const route of ['/sales-import','/cashier']){
 if(route==='/sales-import'){await page.goto(base+'/more?venue='+venueId);await page.waitForLoadState('networkidle');await page.getByRole('button',{name:'Продажи',exact:true}).click();await page.waitForURL(url=>url.pathname==='/sales-import');}else if(process.env.BD_GEOMETRY_BASELINE){await page.goto(base+'/cashier?venue='+venueId);}else{await page.goto(base+'/sales-import?venue='+venueId);await page.waitForLoadState('networkidle');await page.frameLocator('iframe[data-bd-sales-surface]').locator('.sales-navigation a[href="/cashier"]').click();await page.waitForURL(url=>url.pathname==='/cashier');}const frameElement=page.locator('iframe[data-bd-sales-surface]');await frameElement.waitFor();let frame=await(await frameElement.elementHandle())!.contentFrame();assert.ok(frame);await frame!.locator(route==='/cashier'?'#work':'.sales-navigation').waitFor({state:'visible'});await page.waitForLoadState('networkidle');
 const geometry=await page.evaluate(()=>{const iframe=document.querySelector('iframe[data-bd-sales-surface]')!,nav=document.querySelector('nav[data-bd-bottom-nav]'),header=document.querySelector('body>bd-app-header');const boxes=[iframe,nav,header].map(e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}});const r=iframe.getBoundingClientRect();return {iframe:boxes[0]!,nav:boxes[1],header:boxes[2],frameHit:document.elementFromPoint(r.x+20,r.y+20)===iframe,position:getComputedStyle(iframe).position,viewport:{width:innerWidth,height:innerHeight}};});
 results.push({route,width,geometry});await page.screenshot({path:`${out}/${process.env.BD_GEOMETRY_BASELINE?'before':'after'}-${route.slice(1)}-${width}.png`,fullPage:false});
 if(process.env.BD_GEOMETRY_BASELINE){if(route==='/sales-import'){assert.equal(geometry.position,'fixed');assert.equal(geometry.frameHit,false);}else assert.equal(geometry.frameHit,true);continue;}
 assert.equal(geometry.frameHit,true,'top-left iframe content must receive a real pointer hit');assert.ok(geometry.iframe.y>=geometry.header!.bottom-1,'iframe below shared header');assert.ok(geometry.iframe.right<=width+1);assert.ok(geometry.iframe.bottom<=900+1);
 if(width>=900){assert.ok(geometry.iframe.x>=geometry.nav!.right-1,'iframe to right of desktop sidebar');}else{assert.ok(geometry.iframe.bottom<=geometry.nav!.y+1,'iframe clear of mobile bottom nav');}
 await page.reload();await frameElement.waitFor();frame=await(await frameElement.elementHandle())!.contentFrame();assert.ok(frame);await frame!.locator(route==='/cashier'?'#work':'.sales-navigation').waitFor({state:'visible'});await page.waitForLoadState('networkidle');const reloaded=await frameElement.boundingBox();assert.ok(reloaded);assert.equal(reloaded.x,geometry.iframe.x);assert.equal(reloaded.y,geometry.iframe.y);
 const target=frame!.locator(route==='/sales-import'?'a[aria-label="Вернуться в Ещё"]':'#sales-journal');await target.scrollIntoViewIfNeeded();const box=await target.boundingBox();assert.ok(box);const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.matches('iframe[data-bd-sales-surface]'),{x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(hit,true,'back link center must not be covered by shared shell');
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.waitForURL(url=>url.pathname===(route==='/sales-import'?'/more':'/sales-import'));await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).searchParams.get('venue'),String(venueId));if(route==='/cashier'){await page.frameLocator('iframe[data-bd-sales-surface]').locator('.sales-navigation').waitFor();const returned=await page.locator('iframe[data-bd-sales-surface]').boundingBox();assert.ok(returned);assert.equal(returned.x,geometry.iframe.x);assert.equal(returned.y,geometry.iframe.y);}
 }
 assert.deepEqual(errors,[]);
 }finally{await context.close();}
 }
 writeFileSync(out+'/'+(process.env.BD_GEOMETRY_BASELINE?'baseline':'result')+'.json',JSON.stringify(results,null,2));console.log(JSON.stringify({status:'PASS',baseline:!!process.env.BD_GEOMETRY_BASELINE,results}));
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
