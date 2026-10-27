import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { canonicalSnapshot, seedLegacy, object, objects, responseObject } from "../tests/helpers/warehouse-readonly-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
import { waitForSalesHostReads } from "../tests/helpers/sales-navigation-settled";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-02T12:00:00Z";
const runtimeClock = { now: fixedTime };
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ database:'./db',journal:'./lib/bardoctor/stock-journal', sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route", confirm:"./app/api/purchases/confirm/route", counts:"./app/api/inventory/counts/route", evidence:"./app/api/evidence/resolve/route", valuation:"./app/api/inventory/valuation/route", products:"./app/api/inventory/products/route", activeVenue:"./app/api/access/active-venue/route" }, runtimeClock);
let repairPosts=0;
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    if(url.pathname==="/api/inventory/products" && req.method==="POST")repairPosts++;
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses", "/api/purchases/confirm":"confirm", "/api/inventory/counts":"counts", "/api/evidence/resolve":"evidence", "/api/inventory/valuation":"valuation", "/api/inventory/products":"products", "/api/access/active-venue":"activeVenue" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/shifts", "/finance", "/reports", "/salaries", "/home", "/login", "/warehouse", "/procurement", "/suppliers", "/menu", "/assortment"].includes(url.pathname)) response = barDoctorResponse();
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
const engine=process.env.BD_STOCK_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch({...(engine===chromium?{executablePath:process.env.BD_QA_BROWSER||await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs}:{}),headless:true});
const out='outputs/warehouse-value-help';mkdirSync(out,{recursive:true});
const results:unknown[]=[];
try {
 const user=await runtime.register('value-help@local.test'),venue=user.activeVenueId;
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value));
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Локальная проверка',currency:'MDL',timezone:'UTC'}),user.userId);
 const item={id:'water',key:'water',productKey:'water',name:'Вода',unit:'pcs',current:11,averageUnitCost:12,inventoryValue:132,currency:'MDL',venueId:venue,active:true};
 const seed=(known:boolean)=>put('bd_assortment_v1',{stockBalances:[{...item,...(!known?{key:'unknown-water',productKey:'unknown-water'}:{}),costNeedsReview:!known,costReviewReason:known?undefined:'missing_cost_basis'}],nomenclature:[],recipes:[],menuItems:[]});seed(true);
 const api:any=runtime.api,db=api.database.getD1(),scope={accountId:user.userId,venueId:venue},j=await api.journal.journalState(db,scope);await db.batch(await api.journal.appendJournalStatements(db,scope,j.revision,[{id:'receipt-water',venueId:venue,productKey:'water',type:'receipt',amount:11,unit:'pcs',costAmount:132,costStatus:'KNOWN',currency:'MDL',date:'2026-10-01',createdAt:'2026-10-01T10:00:00Z',sourceDocumentId:'receipt',sourceLineId:'water',status:'active'}]));
 const ctx=await browser.newContext({viewport:{width:390,height:844}});await ctx.addInitScript(user=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(user.activeVenueId))},user);const page=await ctx.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url())});await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(base+'/warehouse?venue='+venue);const help=page.getByRole('button',{name:'Как рассчитана стоимость остатка',exact:true});await help.waitFor();const kpi=page.locator('.bd-warehouse-summary-grid article').first();await page.waitForFunction(()=>document.querySelector('.bd-warehouse-summary-grid article')?.textContent?.includes('132'));assert.match(await kpi.innerText(),/132/);
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});assert.ok((await kpi.locator(':scope > span > span').first().boundingBox())!.width>=55);const hb=(await help.boundingBox())!,vb=(await kpi.locator(':scope > strong').boundingBox())!;assert.ok(hb.height>=44&&hb.width>=44);assert.ok(hb.y>=vb.y+vb.height||hb.x>=vb.x+vb.width);await help.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Стоимость остатка',exact:true});await dialog.waitFor();assert.match(await dialog.innerText(),/Стоимость рассчитана по последней закупочной цене/);assert.ok(await dialog.getAttribute('aria-describedby'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/help-'+width+'.png'});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await help.evaluate(e=>e===document.activeElement),true);}
 await help.click();await page.getByRole('button',{name:'Понятно',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),0);await help.click();await page.reload();await help.waitFor();assert.equal(await page.locator('dialog[open]').count(),0);await page.waitForFunction(()=>document.querySelector('.bd-warehouse-summary-grid article')?.textContent?.includes('132'));assert.match(await kpi.innerText(),/132/);
 // Back changes the existing tab history and closes the help without trapping focus.
 await page.getByText('Движения',{exact:true}).click();await page.getByText('Остатки',{exact:true}).click();await help.click();await page.goBack();assert.equal(await page.locator('dialog[open]').count(),0);
 seed(false);await page.goto(base+'/warehouse?venue='+venue);await help.waitFor();await page.waitForFunction(()=>document.querySelector('.bd-warehouse-summary-grid article')?.textContent?.includes('не рассчитана'));await help.click();assert.match(await page.getByRole('dialog').innerText(),/недостаточно данных/);assert.doesNotMatch(await page.getByRole('dialog').innerText(),/Стоимость рассчитана/);await page.screenshot({path:out+'/unknown.png'});assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS known132/unknown, touch/click/Enter/Escape/focus return/accessibility name+description/Back/reload/390/820/1280; no business writes');await ctx.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}
