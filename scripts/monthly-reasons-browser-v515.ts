import assert from "node:assert/strict";
import { closingFixture } from "../tests/helpers/month-close-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const apiDelay = 0;
const runtime = await closingFixture({storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
const engine = process.env.BD_QA_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = engine === "webkit" ? await webkit.launch({ headless: true }) : await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
try {
 const owner=runtime.user,venueId=runtime.venueId;
 const storedProfile=runtime.sqlite.prepare('SELECT restaurant_json FROM accounts WHERE id=?').get(runtime.account)!;
 const profile=JSON.parse(String(storedProfile.restaurant_json));profile.name='Isolated legacy payroll venue';
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),runtime.account);
 runtime.seed('bd_payroll_entries',[{id:'bonus-legacy',venueId:profile.name,date:'2026-09-02',type:'bonus',amount:100,currency:'MDL'}]);
 // Seed preserves this legacy alias explicitly; closingFixture normally canonicalizes fixture venue markers.
 runtime.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_payroll_entries'").run(JSON.stringify([{id:'bonus-legacy',venueId:profile.name,date:'2026-09-02',type:'bonus',amount:100,currency:'MDL'}]),runtime.account);
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const preview=await(await runtime.get()).json();assert.equal(preview.report.payrollBase,90);assert.equal(preview.report.payrollBonuses,100);assert.equal(preview.report.payroll,190);
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const errors:string[]=[];const newPage=async()=>{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return page;};let page=await newPage();
 await page.goto(base+'/reports?venue='+venueId+'&month=2026-09');
 await page.locator('[data-bd-monthly-report]').waitFor();
 await page.getByText('В том числе премии',{exact:true}).waitFor();assert.equal(await page.locator('[data-bd-monthly-blockers]').count(),0);
 assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 runtime.seed('bd_finance_expenses',[{id:'private-review-reference',venueId,date:'2026-09-02',amount:30,currency:'MDL',category:'rent',evidence:{workspaceId:999999}}]);
 const blockedBefore=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 // Keep earlier pages alive until assertions finish: navigating aborts background reads in WebKit.
 page=await newPage();await page.goto(base+'/reports?venue='+venueId+'&month=2026-09');const reasons=page.locator('[data-bd-monthly-blockers]');await reasons.waitFor();
 assert.match(await reasons.innerText(),/несовместимые ссылки/);assert.doesNotMatch(await reasons.innerText(),/private-review-reference|999999|требуют проверки исходные документы и их связи/);
 const links=await reasons.locator('a').evaluateAll(elements=>elements.map(e=>(e as HTMLAnchorElement).href));assert(links.length>0);for(const href of links){const url=new URL(href);assert.equal(url.searchParams.get('month'),'2026-09');assert.equal(url.searchParams.get('venue'),String(venueId));}
 page=await newPage();await page.goto(base+'/reports?venue='+venueId+'&month=2026-09&closeMonth=1');
 const wizard=page.getByRole('dialog',{name:'Мастер закрытия месяца'});await wizard.waitFor();await wizard.locator('[data-bd-monthly-blockers]').waitFor();
 assert.match(await wizard.locator('[data-bd-monthly-blockers]').innerText(),/несовместимые ссылки/);
 const blocked=await(await runtime.get()).json();assert.equal(blocked.report.finalProfit,null);assert.equal(blocked.report.payroll,190);assert.equal(blocked.report.costOfGoods,720);
 assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),blockedBefore);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({engine,width:390,fullSpa:true,realApi:true,legacyBonusIncluded:true,knownReasonVisiblePageAndWizard:true,scopedLinks:true,noForeignDetails:true,unknownProfitRemainsNull:true,noWrites:true}));
 await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}
