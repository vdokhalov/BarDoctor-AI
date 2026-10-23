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
const apiDelay = 30;
let failSave=false;
const runtime = await emptyMonthFixture({procurement:"./app/api/procurement/overview/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/procurement/overview":"procurement","/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(key==='bd_suppliers'&&req.method==='PUT'){await new Promise(r=>setTimeout(r,700));if(failSave){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Тестовая ошибка'}));return}}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/suppliers", "/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 runtime.seed('bd_suppliers',[]);
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto(base+'/suppliers?venue='+venueId+'&tab=suppliers');await page.getByText('Поставщиков пока нет',{exact:true}).waitFor();await page.waitForTimeout(300);
 await page.getByRole('button',{name:'Добавить поставщика',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Добавить поставщика',exact:true});await dialog.getByPlaceholder('Компания или магазин').fill('Тестовый новый поставщик');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.waitForTimeout(1000);
 const rows=page.locator('.bd-proc-supplier-row-v168');console.log(JSON.stringify({stage:'afterSave',rows:await rows.count(),text:await page.locator('.bd-proc-suppliers-v168').innerText()}));
 if(process.env.BASELINE){await page.reload();await rows.first().waitFor();console.log(JSON.stringify({stage:'reload',rows:await rows.count()}));}else{assert.equal(await rows.count(),1);await rows.first().click();await page.getByRole('dialog',{name:'Тестовый новый поставщик',exact:true}).waitFor();
 await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).last().click();await page.getByRole('textbox',{name:'Поиск поставщиков',exact:true}).fill('ничего');assert.equal(await rows.count(),0);await page.getByRole('textbox',{name:'Поиск поставщиков',exact:true}).fill('Тестовый');assert.equal(await rows.count(),1);await page.reload();await rows.first().waitFor();assert.equal(await rows.count(),1);await page.getByRole('textbox',{name:'Поиск поставщиков',exact:true}).fill('');
 failSave=true;await page.getByRole('button',{name:'Добавить поставщика',exact:true}).first().click();await dialog.getByPlaceholder('Компания или магазин').fill('Повтор сохранения');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByText('Поставщик не сохранён',{exact:true}).waitFor();assert.equal(await dialog.isVisible(),true);assert.equal(await rows.count(),1);failSave=false;await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.waitForTimeout(300);assert.equal(await rows.count(),2);await page.reload();await rows.first().waitFor();assert.equal(await rows.count(),2);
 const out=resolve('outputs/supplier-create');mkdirSync(out,{recursive:true});for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:out+'/saved-'+width+'.png'})}
 const other=await runtime.register('supplier-other@local.test');const otherAccount=runtime.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(other.activeVenueId)!.id;runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другое тестовое заведение',currency:'MDL',timezone:'UTC'}),otherAccount);
 await page.getByRole('button',{name:'Добавить поставщика',exact:true}).first().click();await dialog.getByPlaceholder('Компания или магазин').fill('Сохранён в прежнем заведении');const pending=page.waitForRequest(r=>r.method()==='PUT'&&r.url().includes('/api/store/bd_suppliers'));await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();await pending;
 await page.evaluate(other=>{localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId));window.dispatchEvent(new CustomEvent('bd:venue-context'))},other);await page.goto(base+'/suppliers?venue='+other.activeVenueId+'&tab=suppliers');await page.waitForTimeout(1500);console.log('SWITCH',page.url(),await page.locator('body').innerText());await page.getByText('Поставщиков пока нет',{exact:true}).waitFor();await page.waitForTimeout(1000);assert.equal(await rows.count(),0);assert.equal(await page.getByText('Поставщик сохранён',{exact:true}).count(),0);
 const saved=JSON.parse(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_suppliers'").get(runtime.account)!.data_json as string);assert.equal(saved.length,3);assert.equal(new Set(saved.map((x:any)=>x.id)).size,3);console.log(JSON.stringify({pass:true,checks:['native create immediately once','detail','search','reload','error and retry once','late save remains in captured account/venue'],out}));}
 await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
