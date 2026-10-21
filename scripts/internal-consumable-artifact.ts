import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-21T12:00:00Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ monthClose:"./app/api/month-close/route", workdays:"./app/api/workdays/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route" }, { now: fixedTime });
const replies:any[]=[];const failures:any[]=[];const excludedRoutes=['/api/management/cost-signals','/api/opportunities','/api/competitors/me','/api/reviews/home'];
let rejectSave = false, saveCount = 0, delaySave = false;
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"monthClose", "/api/workdays":"workdays", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(excludedRoutes.includes(url.pathname)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,success:false,code:'LOCAL_SCOPE_EXCLUDED'}));return;}
    if (key === 'bd_assortment_v1' && req.method === 'PUT') {
      saveCount++;
      if (delaySave) await new Promise(done => setTimeout(done, 700));
      if (rejectSave) {res.writeHead(503, {'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:'Проверочная ошибка сохранения'}));return;}
    }
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/catalog", "/assortment", "/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = new Response(readFileSync("dist/client/app.html"),{headers:{"Content-Type":"text/html"}});
    else {
      const emitted=resolve("dist/client", "." + url.pathname);
      const file = existsSync(emitted)?emitted:resolve("public", "." + url.pathname);
      response = (file.startsWith(resolve("public")) || file.startsWith(resolve("dist/client"))) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    if(url.pathname==="/api/month-close"){const data=await response.clone().json();replies.push({status:response.status,url:url.href,data});}
    if(response.status>=400)failures.push({url:url.pathname,status:response.status,body:(await response.clone().text()).slice(0,500)});
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture failure"); }
}
const server = createServer((req, res) => {
  const task = handleRequest(req, res); pendingHandlers.add(task);
  void task.finally(() => pendingHandlers.delete(task));
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const out='outputs/internal-consumable-artifact';mkdirSync(out,{recursive:true});
try {
 const user=await runtime.register('consumable-owner@isolated.test'), accountId=user.userId, venueId=user.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local consumable owner',currency:'MDL',timezone:'UTC'}),accountId);
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId});
 const page=await context.newPage(), errors:string[]=[], assets:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/index-BQGspy0I.*\.js/.test(r.url()))assets.push(r.url());});
 const stored=()=>JSON.parse((runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(accountId) as any)?.data_json||'{}');
 try {
  await page.goto(base+'/catalog?tab=needs');
  
  await page.locator('.bd-assortment-internal-v170').getByRole('button',{name:'Добавить',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Редактор расходника'});
  await dialog.getByLabel('Название',{exact:true}).fill('Кофе расходник');
  await dialog.getByLabel('Единица',{exact:true}).selectOption('kg');
  await dialog.getByLabel('Сейчас',{exact:true}).fill('-1.25');
  await dialog.getByLabel('Минимальный остаток',{exact:true}).fill('2');
  await dialog.getByLabel('Уже заказано',{exact:true}).fill('0.5');
  await dialog.getByLabel('Фасовка',{exact:true}).fill('1');
  rejectSave=true;
  await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByLabel('Сейчас',{exact:true}).inputValue(),'-1.25');assert.equal(stored().internalItems?.length||0,0);
  await dialog.screenshot({path:out+'/save-error.png'});
  rejectSave=false;delaySave=true;const before=saveCount;
  await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();
  assert.equal(await dialog.getByRole('button',{name:'Сохраняем…'}).isDisabled(),true);
  // A second submit event while the request is pending must not issue another write.
  await dialog.locator('form').dispatchEvent('submit');
  assert.equal(await dialog.isVisible(),true);
  await dialog.waitFor({state:'hidden'});assert.equal(saveCount,before+1);
  const first=stored().internalItems[0];assert.equal(first.currentStock,-1250);assert.equal(first.minimumStock,2000);assert.equal(first.onOrder,500);assert.equal(first.packageAmount,1000);assert.equal(first.unit,'g');assert.equal(first.displayUnit,'kg');
  await page.reload();
  await page.getByRole('button',{name:/Редактировать/}).last().click();
  await dialog.waitFor();assert.equal(await dialog.getByLabel('Сейчас',{exact:true}).inputValue(),'-1.25');assert.equal(await dialog.getByLabel('Единица',{exact:true}).inputValue(),'kg');
  await dialog.getByLabel('Единица',{exact:true}).selectOption('g');assert.equal(await dialog.getByLabel('Сейчас',{exact:true}).inputValue(),'-1250');
  await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(stored().internalItems[0].currentStock,-1250);assert.equal(stored().internalItems[0].id,first.id);
  await page.locator('.bd-assortment-internal-v170').getByRole('button',{name:'Добавить',exact:true}).click();await dialog.getByLabel('Название',{exact:true}).fill('Жидкий расходник');await dialog.getByLabel('Единица',{exact:true}).selectOption('l');await dialog.getByLabel('Сейчас',{exact:true}).fill('-0.25');await dialog.getByLabel('Минимальный остаток',{exact:true}).fill('1');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.equal(stored().internalItems.find((r:any)=>r.name==='Жидкий расходник').currentStock,-250);
  await page.reload();await page.screenshot({path:out+'/saved-reload.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.equal(stored().internalItems.length,2);
  const asset=new URL(assets.at(-1)!).pathname; const artifactHash=createHash('sha256').update(readFileSync(resolve('dist/client','.'+asset))).digest('hex');
  writeFileSync(out+'/results.json',JSON.stringify({pass:true,checks:['negative kg persisted','server rejection preserves inputs','pending duplicate submit blocked','reload','g/kg conversion preserves quantities and id','litres normalized','runtime bootstrap'],asset,artifactHash,saveCount,errors,scope:'local real handlers / isolated SQLite fixture, no live requests'},null,2));
  console.log('PASS consumable compiled artifact',artifactHash);
 } catch(error) {await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('body').innerText()).slice(-6000));throw error;}
 finally {await context.close();}
} finally {await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.sqlite.close();}
