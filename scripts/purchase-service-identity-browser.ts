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
const runtime = await emptyMonthFixture({confirm:"./app/api/purchases/confirm/route",mappings:"./app/api/purchases/mappings/route",nomenclature:"./app/api/tech-cards/nomenclature/route",overview:"./app/api/assortment/overview/route",procurement:"./app/api/procurement/overview/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/purchases/confirm":"confirm","/api/purchases/mappings":"mappings","/api/tech-cards/nomenclature":"nomenclature","/api/procurement/overview":"procurement","/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(key==='bd_suppliers'&&req.method==='PUT'){await new Promise(r=>setTimeout(r,700));if(failSave){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Тестовая ошибка'}));return}}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/nomenclature", "/catalog", "/suppliers", "/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 const owner=runtime.user,venueId=runtime.venueId;
 const svc={id:'service:учебная уборка тест',key:'service:учебная уборка тест',productKey:'service:учебная уборка тест',name:'Учебная уборка — тест',kind:'service',category:'other',unit:'unknown',packageSize:'1 усл.',venueId,active:true};
 runtime.seed('bd_assortment_v1',{nomenclature:[svc],stockBalances:[]});runtime.seed('bd_suppliers',[{id:'supplier',name:'Тестовый поставщик',venueId,status:'active',currency:'MDL'}]);runtime.seed('bd_purchase_documents',[]);runtime.seed('bd_finance_expenses',[]);
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);
 const out=resolve('outputs/purchase-service-identity');mkdirSync(out,{recursive:true});
 const writes:{path:string;body:any}[]=[];page.on('request',request=>{if(request.method()!=='GET'&&!request.url().includes('/api/auth/bootstrap'))writes.push({path:new URL(request.url()).pathname,body:request.postDataJSON()})});
 try{
 await page.goto(base+'/suppliers?venue='+venueId);await page.getByRole('button',{name:'Добавить',exact:true}).click();await page.getByRole('button',{name:'Добавить покупку Товары, услуги или другие затраты'}).click();await page.getByRole('button',{name:'Вручную Без чека и накладной',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.locator('select').filter({has:page.locator('option[value="auto"]')}).selectOption('other');
 await page.getByRole('searchbox',{name:'Поиск поставщика'}).fill('Тестовый');await page.getByRole('button',{name:'Тестовый поставщик',exact:false}).last().click();
 await page.getByPlaceholder('Название товара',{exact:true}).fill(svc.name);
 const nums=dialog.locator('input[type=number]');await nums.nth(1).fill('15');await nums.nth(2).fill('15');await page.getByRole('spinbutton',{name:'Итог документа',exact:true}).fill('15');
 await page.getByRole('button',{name:'Сопоставить',exact:true}).click();await page.locator('.bd-invoice-mapping-results-v356 button').filter({hasText:svc.name}).click();
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.locator('.bd-invoice-mapping-v356.is-linked').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mapped-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 const save=page.getByRole('button',{name:'Провести приход',exact:true});const response=page.waitForResponse(r=>r.url().includes('/api/purchases/confirm'));await save.click();const confirmed=await response;assert.equal(confirmed.status(),201,await confirmed.text());const result=await confirmed.json();assert.equal(result.assortment.nomenclature.length,1);assert.equal(result.document.items[0].nomenclatureId,svc.id);assert.equal(result.stockMovements.length,0);
 const read=()=>JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_purchase_documents'").get(runtime.account)!.data_json));
 await page.goto(base+'/nomenclature?venue='+venueId+'&view=all');
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.getByText(svc.name,{exact:true}).waitFor();assert.equal(await page.getByText(svc.name,{exact:true}).count(),1);await page.screenshot({path:out+'/list-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.reload();await page.getByText(svc.name,{exact:true}).waitFor();assert.equal(await page.getByText(svc.name,{exact:true}).count(),1)}
 await page.goto(base+'/suppliers?venue='+venueId+'&tab=purchases&documentId='+result.document.id);await page.getByRole('dialog').getByText('Приход не требуется',{exact:true}).waitFor();await page.reload();await page.getByRole('dialog').getByText('Приход не требуется',{exact:true}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).last().click();await page.goBack();await page.goForward();
 await page.goto(base+'/suppliers?venue='+venueId);await page.getByRole('button',{name:'Добавить',exact:true}).click();await page.getByRole('button',{name:'Добавить покупку Товары, услуги или другие затраты'}).click();await page.getByRole('button',{name:'Вручную Без чека и накладной',exact:true}).click();await page.getByRole('button',{name:'Не сохранять',exact:true}).click();
 assert.equal(read().length,1);assert.equal(read()[0].balanceDue,15);assert.equal(writes.filter(w=>w.path==='/api/purchases/confirm').length,1);assert.ok(writes.every(w=>['/api/purchases/confirm','/api/purchases/mappings'].includes(w.path)),JSON.stringify(writes.map(w=>w.path)));const payload=writes.find(w=>w.path==='/api/purchases/confirm')!.body;assert.equal(payload.document.items[0].nomenclatureId,svc.id);assert.equal(payload.document.items[0].purchaseProductKey,svc.key);
 const stranger=await runtime.register('service-stranger@local.test');const foreign=await runtime.api.nomenclature.GET(runtime.request(stranger,'/api/tech-cards/nomenclature?q='+encodeURIComponent(svc.name)));const foreignResult=await foreign.json() as {items:unknown[]};assert.equal(foreignResult.items.length,0);
 console.log(JSON.stringify({pass:true,widths:[390,820,1280],checks:['real UI mapping and confirm','one selected service ID, no stock','list/reload one card','document direct/reload/Close/Back/Forward','cancel/reopen no extra document','one confirm request; no AI','second account cannot read service']}));
 }catch(e){console.log(await page.locator('body').innerText());await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close()}
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
