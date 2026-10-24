import assert from "node:assert/strict";
import {reviewLayerSummary} from "../lib/bardoctor/review-model";
import {groundedReviewSummary,reviewEvidenceCatalog} from "../lib/bardoctor/review-evidence";
import {GET as reviewsPage} from "../app/reviews/route";
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
const runtime = await emptyMonthFixture({equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/reviews")response=reviewsPage(new Request(url));
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 const review={id:'local-review-1',venueId,source:'other',authorName:'Тестовый гость',text:'Кухня вкусная, но заказ ждали час',date:'2026-10-24',publishedAt:'2026-10-24T12:00:00Z',createdAt:'2026-10-24T12:00:00Z',updatedAt:'2026-10-24T12:00:00Z',ingestionMethod:'manual',aiStatus:'done',rating:3,sentiment:'negative',topics:['kitchen','wait_time'],topicEvidence:[{reviewId:'local-review-1',topic:'kitchen',sentiment:'positive',quote:'Кухня вкусная'},{reviewId:'local-review-1',topic:'wait_time',sentiment:'negative',quote:'заказ ждали час'}]};
 const evidence=reviewEvidenceCatalog([review]);
 const summary=groundedReviewSummary({recommendations:[{title:'Wait',topic:'wait_time',evidenceIds:[evidence[1].id]}]},[review]);
 let layer:any={reviews:[review],summary:reviewLayerSummary([review] as any),sourceEvents:[],updatedAt:'2026-10-24',doctorSnapshot:{status:'current',generatedAt:'2026-10-24',data:summary}},writes=0;
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));localStorage.setItem('bd_active_role','owner')},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(20000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/review-layer',route=>{if(route.request().method()!=='GET'){writes++;return route.fulfill({status:403,body:'No writes'});}return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,data:layer})});});
 await page.route('**/api/reviews/sources',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,data:{providers:[{id:'google',status:'connected',locationName:'Локальный тест',lastSyncedAt:'2026-10-24T12:00:00Z'}]}})}));
 await page.route('**/api/reviews/*',route=>{if(route.request().url().endsWith('/sources'))return route.fallback();writes++;return route.fulfill({status:403,body:'No paid calls'});});
 await page.goto(base+'/reviews?embedded=1&venue='+venueId);await page.getByText('Проверьте ожидание заказов',{exact:false}).waitFor();
 assert.equal(await page.locator('#reviews-topics .negative').count(),1);assert.ok((await page.locator('#reviews-topics .negative').innerText()).includes('Скорость'));await page.locator('#reviews-topics .negative summary').click();assert.equal(await page.locator('#reviews-topics .negative a').count(),1);await page.locator('#reviews-topics .negative summary').click();
 await page.locator('#reviews-doctor a').click();assert.ok(page.url().includes('#review-local-review-1'));assert.equal(await page.locator('#review-local-review-1').count(),1);
 await page.reload();await page.getByText('Проверьте ожидание заказов',{exact:false}).waitFor();
 const out=resolve('outputs/review-evidence');mkdirSync(out,{recursive:true});await page.locator('#reviews-topics details').filter({hasText:'Кухня'}).locator('summary').click();await page.locator('#reviews-analysis-state').scrollIntoViewIfNeeded();await page.locator('#reviews-analysis-state').locator('..').screenshot({path:out+'/mixed-390.png'});
 for(const width of [820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:out+'/mixed-'+width+'.png'});}
 layer.doctorSnapshot.status='stale';await page.reload();await page.getByText('Отзывы изменились. Анализ устарел.',{exact:true}).waitFor();assert.equal(await page.getByText('Проверьте ожидание заказов',{exact:false}).count(),0);
 layer.doctorSnapshot={status:'absent'};await page.reload();await page.getByText('Сохранённого анализа пока нет.',{exact:true}).waitFor();
 const legacy={...review,topicEvidence:undefined};layer.summary=reviewLayerSummary([legacy] as any);await page.reload();await page.getByText('Тональность не подтверждена',{exact:false}).first().waitFor();
 assert.equal(writes,0);assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,checks:['mixed aspect sentiment','exact review anchor','reload saved summary','stale versus absent','legacy unknown','390/820/1280 overflow','no writes or paid calls'],out}));await context.close();

}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}
