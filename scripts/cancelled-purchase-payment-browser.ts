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
 const out=resolve('outputs/cancelled-purchase-payment');mkdirSync(out,{recursive:true});
 const supplier={id:'supplier',venueId,name:'Тестовый поставщик',currency:'MDL'};
 const doc={venueId,supplierId:supplier.id,supplierName:supplier.name,documentType:'invoice',status:'cancelled',date:'2026-10-25',total:7,paidAmount:7,currency:'MDL',expenseCategory:'repairs',items:[{id:'line',name:'Обслуживание оборудования',category:'repairs',quantity:1,unit:'усл.',unitPrice:7,lineTotal:7}]};
 const documents=['voided','active','none'].map(id=>({...doc,id,documentNumber:id}));
 const goods={...doc,expenseCategory:'products',status:'confirmed',items:[]};
 runtime.seed('bd_suppliers',[supplier]);runtime.seed('bd_purchase_documents',[...documents,{...goods,id:'goods290',documentNumber:'goods290',total:290,paidAmount:100},{...goods,id:'goods30',documentNumber:'goods30',total:30,paidAmount:0}]);
 const payment={venueId,source:'purchase_payment',paymentKind:'supplier_payment',amount:7,currency:'MDL',date:'2026-10-25',paymentMethod:'transfer',status:'posted'};
 runtime.seed('bd_finance_expenses',[{...payment,id:'voided-payment',sourceDocumentId:'voided',status:'voided',reversedAt:'2026-10-25T15:00:00Z'},{...payment,id:'active-payment',sourceDocumentId:'active'},{...payment,id:'goods-payment',sourceDocumentId:'goods290',amount:100}]);
 const original=JSON.stringify(runtime.sqlite.prepare('SELECT store_key,data_json FROM domain_data WHERE account_id=? ORDER BY store_key').all(runtime.account));
 const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.method()+' '+new URL(r.url()).pathname)});
 const open=async(id:string)=>{await page.goto(base+'/suppliers?venue='+venueId+'&tab=purchases&documentId='+id);await page.getByRole('dialog').getByText('К оплате',{exact:true}).waitFor();};
 for(const id of ['voided','active','none']){
  await open(id);const dialog=page.getByRole('dialog');assert.ok((await dialog.innerText()).includes('Документ отменён'));await dialog.getByText('Не требуется',{exact:true}).waitFor();assert.equal(await dialog.getByText('Осталось',{exact:true}).count(),0);assert.equal(await dialog.getByText('Не оплачено',{exact:true}).count(),0);assert.equal(await dialog.getByRole('button',{name:/^Оплатить/}).count(),0);
  const fact=dialog.locator('.bd-proc-fact-v168').filter({hasText:'Платежи без сторно'});assert.match(await fact.innerText(),id==='active'?/7,00/:id==='none'?/Нет записей/:/0,00/);
  if(id==='voided')await dialog.getByText('Сторнирован',{exact:false}).waitFor();
  if(id==='active')await dialog.getByText('Есть платежи без сторно. Нужна сверка.',{exact:true}).waitFor();
 }
 await open('voided');
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.getByText('Платежи без сторно',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/voided-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 await page.reload();await page.getByRole('dialog').getByText('Не требуется',{exact:true}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Закрыть',exact:true}).last().click();
 await page.goto(base+'/suppliers?venue='+venueId+'&tab=suppliers&supplierId='+supplier.id);await page.getByRole('dialog').getByText('К оплате поставщику',{exact:true}).waitFor();const debt=page.getByRole('dialog').locator('.bd-proc-fact-v168').filter({hasText:'К оплате поставщику'});assert.match(await debt.innerText(),/220,00/);
 await page.getByRole('dialog').getByRole('button').filter({hasText:'voided'}).click();await page.getByRole('dialog').getByText('Не требуется',{exact:true}).waitFor();await page.goBack();await debt.waitFor();assert.match(await debt.innerText(),/220,00/);await page.goForward();await page.getByRole('dialog').getByText('Не требуется',{exact:true}).waitFor();
 assert.deepEqual(writes,[]);assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT store_key,data_json FROM domain_data WHERE account_id=? ORDER BY store_key').all(runtime.account)),original);
 console.log(JSON.stringify({pass:true,checks:['cancelled voided/active/no payments','history retained','supplier debt 220 unchanged','direct/reload/Close/Back/Forward','390/820/1280','no writes']}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
