import {archiveFixture} from "../tests/helpers/archive-fixture";
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
const runtime = await emptyMonthFixture({archive:"./app/api/assortment/archive/route",overview:"./app/api/assortment/overview/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/assortment/archive":"archive", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/catalog", "/nomenclature", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
try {
 const owner=runtime.user,venueId=runtime.venueId;runtime.seed('bd_assortment_v1',archiveFixture(venueId));
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{if(localStorage.getItem('bd_session_token'))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method())&&!r.url().includes('/api/auth/bootstrap'))writes.push(new URL(r.url()).pathname)});page.on('pageerror',e=>errors.push(e.message));const output=resolve('outputs/assortment-archive');mkdirSync(output,{recursive:true});

 if(process.env.CHECK_ARCHIVE_BASELINE==='1'){
  for(const route of ['/catalog?tab=menu','/nomenclature?view=all']){await page.goto(base+route+'&venue='+venueId);await page.waitForTimeout(1200);const input=page.getByRole('textbox',{name:route.startsWith('/catalog')?'Поиск по меню…':'Поиск по номенклатуре'});if(route.startsWith('/catalog'))await page.getByPlaceholder('Поиск по меню…').fill('Тестовый лимонад');else await input.fill('Тестовые салфетки');assert.equal(await page.getByRole('button',{name:'Архив',exact:true}).count(),0);assert.equal(await page.getByText(route.startsWith('/catalog')?'Тестовый лимонад':'Тестовые салфетки',{exact:true}).count(),0);}
  console.log('BASELINE REPRODUCED: archived records remain stored, absent from active search, no archive entry in menu/nomenclature');
 }else{
 // Server error is not an empty archive, retry remains read-only.
 let fail=true;await page.route('**/api/assortment/archive?kind=*',async route=>{if(fail){fail=false;await route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'});}else await route.continue();});
 await page.goto(base+'/catalog?tab=menu&view=archive&venue='+venueId);await page.getByRole('button',{name:'Повторить',exact:true}).waitFor();assert.equal(await page.getByText('Архив пуст',{exact:true}).count(),0);await page.getByRole('button',{name:'Повторить',exact:true}).click();await page.getByRole('button',{name:'Восстановить',exact:true}).waitFor();await page.unroute('**/api/assortment/archive?kind=*');
 // Delayed response from menu must not enter the inventory archive after navigation.
 let release!:()=>void,seen!:()=>void;const gate=new Promise<void>(done=>release=done),arrived=new Promise<void>(done=>seen=done);
 await page.route('**/api/assortment/archive?kind=menu',async route=>{const response=await route.fetch();seen();await gate;await route.fulfill({response}).catch(()=>{});});
 await page.reload({waitUntil:'domcontentloaded'});await arrived;await page.evaluate(url=>(window as any).bdNavigate(url),'/nomenclature?view=archive&venue='+venueId);await page.getByText('Тестовые салфетки',{exact:true}).waitFor();release();await page.waitForTimeout(150);assert.equal(await page.getByText('Тестовый лимонад',{exact:true}).count(),0);await page.unroute('**/api/assortment/archive?kind=menu');
 // A failed restore keeps the original row available for retry.
 await page.route('**/api/assortment/archive',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"Не удалось восстановить. Попробуйте ещё раз."}'}));await page.getByRole('button',{name:'Восстановить',exact:true}).click();await page.getByText('Не удалось восстановить. Попробуйте ещё раз.',{exact:true}).waitFor();assert.equal(await page.getByText('Тестовые салфетки',{exact:true}).count(),1);await page.unroute('**/api/assortment/archive');
 for(const kind of ['menu','inventory']){
  const route=kind==='menu'?'/catalog?tab=menu':'/nomenclature?view=all',name=kind==='menu'?'Тестовый лимонад':'Тестовые салфетки';
  await page.goto(base+route+'&venue='+venueId);await page.getByRole('button',{name:'Архив',exact:true}).waitFor();assert.equal(await page.getByText(name,{exact:true}).count(),0);await page.getByRole('button',{name:'Архив',exact:true}).click();await page.getByRole('button',{name:'Восстановить',exact:true}).waitFor();assert.ok(page.url().includes('view=archive'));assert.equal(await page.getByText(name,{exact:true}).count(),1);
  await page.getByRole('textbox',{name:'Поиск в архиве'}).fill('Нет такого');await page.getByText('Ничего не найдено',{exact:true}).waitFor();await page.reload();await page.getByText('Ничего не найдено',{exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Поиск в архиве'}).inputValue(),'Нет такого');await page.getByRole('textbox',{name:'Поиск в архиве'}).fill('');await page.getByRole('button',{name:'Восстановить',exact:true}).waitFor();
  for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:resolve(output,kind+'-'+width+'.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+kind+width)}
  await page.goBack();await page.goForward();await page.getByRole('button',{name:'Восстановить',exact:true}).waitFor();
  await page.getByRole('button',{name:'Восстановить',exact:true}).click();await page.getByText('«'+name+'» восстановлена',{exact:true}).waitFor();await page.getByText('Архив пуст',{exact:true}).waitFor();await page.reload();await page.getByText('Архив пуст',{exact:true}).waitFor();await page.getByRole('button',{name:'К активным позициям'}).click();await page.getByRole('button',{name:'Архив',exact:true}).waitFor();
  if(kind==='inventory'){await page.getByRole('textbox',{name:'Поиск по номенклатуре'}).fill(name);await page.getByText(name,{exact:true}).first().waitFor();}
  else {await page.getByPlaceholder('Поиск по меню…').fill(name);await page.getByText(name,{exact:true}).first().waitFor();}
 }
 const data=JSON.parse((runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(runtime.account) as any).data_json),original=archiveFixture(venueId);assert.equal(data.menuItems.length,original.menuItems.length);assert.equal(data.nomenclature.length,original.nomenclature.length);assert.deepEqual(data.recipes,original.recipes);assert.deepEqual(data.history,original.history);assert.deepEqual(data.stockBalances.map((v:any)=>[v.productKey,v.current,v.averageUnitCost,v.inventoryValue]),original.stockBalances.map(v=>[v.productKey,v.current,v.averageUnitCost,v.inventoryValue]));
 const other=await runtime.register('archive-browser-other@local.test');const otherAccount=Number((runtime.sqlite.prepare('SELECT data_account_id id FROM venues WHERE id=?').get(other.activeVenueId) as any).id);runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Другой тест',currency:'MDL',timezone:'UTC',trackingStartDate:'2026-10-01'}),otherAccount);await page.evaluate(({other})=>{localStorage.setItem('bd_session_token',other.token);localStorage.setItem('bd_session',other.email);localStorage.setItem('bd_active_venue_id',String(other.activeVenueId));},{other});await page.goto(base+'/nomenclature?view=archive&venue='+other.activeVenueId);await page.getByText('Архив пуст',{exact:true}).waitFor();assert.equal(await page.getByText('Тестовые салфетки',{exact:true}).count(),0);
 assert.deepEqual([...new Set(writes)],['/api/assortment/archive']);assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,widths:[390,820,1280],checks:['active excludes archived','archive entry for both','search reload direct links','Back Forward','restore same IDs','repeat reload empty','active search after restoration','recipes history and quantities unchanged'],output}));}
 await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close();}
