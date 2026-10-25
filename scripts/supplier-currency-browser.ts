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
 const out=resolve('outputs/supplier-currency');mkdirSync(out,{recursive:true});
 runtime.seed('bd_suppliers',[{id:'one',name:'Поставщик с длинным названием хозяйственных товаров и упаковки',currency:'PMR_RUB'},{id:'two',name:'Второй поставщик',currency:'MDL'},{id:'three',name:'Европейский поставщик',currency:'EUR'}]);
 const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.method()+' '+new URL(r.url()).pathname)});
 await page.goto(base+'/suppliers?venue='+venueId+'&tab=suppliers');await page.locator('.bd-proc-supplier-row-v168').first().waitFor();
 for(const width of [390,820,1280]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(150);
  const geometry=await page.locator('.bd-proc-supplier-row-v168').evaluateAll(rows=>rows.map(row=>{const amount=row.querySelector('.bd-proc-supplier-spend-v168')!,list=row.parentElement!,r=amount.getBoundingClientRect(),p=list.getBoundingClientRect();return {text:amount.textContent,right:r.right,listRight:p.right,overflow:Math.max(0,r.right-p.right),columns:getComputedStyle(row).gridTemplateColumns}}));
  console.log(JSON.stringify({width,geometry}));await page.screenshot({path:out+'/'+(process.env.BASELINE?'before':'after')+'-'+width+'.png'});
  if(!process.env.BASELINE)for(const g of geometry)assert.ok(g.overflow<1,JSON.stringify(g));
  if(!process.env.BASELINE){
   // CSS stress case only: do not create purchase documents to obtain large amounts.
   await page.locator('.bd-proc-supplier-spend-v168 b').first().evaluate(el=>{el.textContent='123 456 789 012,34 PMR_RUB'});
   const fits=await page.locator('.bd-proc-supplier-row-v168').first().evaluate(row=>{const p=row.parentElement!.getBoundingClientRect(),r=row.getBoundingClientRect();return row.scrollWidth<=row.clientWidth+1&&r.right<=p.right+1});assert.ok(fits);
   await page.screenshot({path:out+'/large-'+width+'.png'});
   await page.locator('.bd-proc-supplier-row-v168').first().focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).last().click();
   await page.getByRole('button',{name:'Добавить поставщика',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Добавить поставщика',exact:true});
   const type=dialog.locator('select').first();await type.focus();await page.keyboard.press('End');await page.keyboard.press('Tab');assert.equal(await type.inputValue(),'retail');await type.selectOption('wholesale');
   const currency=dialog.locator('.bd-venue-currency-lock-v326');const visible=await currency.evaluate(el=>{const r=el.getBoundingClientRect(),d=el.closest('[role=dialog]')!.getBoundingClientRect();return r.left>=d.left&&r.right<=d.right&&el.scrollWidth<=el.clientWidth+1});assert.ok(visible);
   await dialog.getByRole('button',{name:'Отмена',exact:true}).click();await page.reload();await page.locator('.bd-proc-supplier-row-v168').first().waitFor();
  }

 }
 assert.deepEqual(writes,[]);console.log(JSON.stringify({pass:true,checks:["390/820/1280 amount bounds","long name and amount","keyboard row entry","type select keyboard/change","venue currency label","cancel/reload","no browser writes"]}));
 await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
