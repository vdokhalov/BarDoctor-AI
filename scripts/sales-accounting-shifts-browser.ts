import { canonicalUserShellAssets } from "../lib/bardoctor/app-shell";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { salesAccountingPage } from "../lib/bardoctor/sales-accounting-page";
import { openingRuntime } from "../tests/helpers/opening-runtime";
import * as accounting from "../lib/bardoctor/sales-accounting";
import * as consumption from "../lib/bardoctor/sales-consumption";
import * as salesRevenue from "../lib/bardoctor/sales-revenue";
import { normalizeSalesDocument } from "../lib/bardoctor/sales";

const require = createRequire(import.meta.url);
const { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixture = openingRuntime(new URL("../app/api/sales-accounting/route.ts", import.meta.url), {
  ...accounting, confirmSalesImport: async (request: Request) => importApi.POST(request),
});
const importApi = fixture.loadRoute(new URL("../app/api/sales/confirm/route.ts", import.meta.url), {
  ...accounting, ...consumption, ...salesRevenue, normalizeSalesDocument,
});
const journalHtml = readFileSync("app/sales-import/route.ts", "utf8").split("const HTML = `")[1].split("`;\n")[0].replace("${canonicalUserShellAssets()}", canonicalUserShellAssets());
const output = resolve("outputs/sales-accounting-shifts");
mkdirSync(output, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, "http://localhost");
    if (url.pathname === "/api/sales-accounting") {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, { method: req.method, headers: { "Content-Type": "application/json" },
        ...(req.method === "POST" ? { body: Buffer.concat(chunks).toString() } : {}) });
      const response = req.method === "POST" ? await fixture.api.POST(request) : await fixture.api.GET(request);
      res.writeHead(response.status, { "Content-Type": "application/json" }); res.end(await response.text()); return;
    }
    if (url.pathname === "/sales-import") { res.writeHead(200, {"Content-Type":"text/html"});res.end(journalHtml);return; }
    if (url.pathname === "/api/sales-batches" || url.pathname === "/api/sales-events") {
      const data = url.pathname.endsWith("batches") ? { ok:true,venueId:1,currency:"MDL",timezone:"UTC",batches:[],shifts:[],kpis:{},dataQuality:{issues:[]},capabilities:{create:true} }
        : {ok:true,venueId:1,venueName:"Isolated",currency:"MDL",permissions:{post:true,managementDay:true},actor:{accountId:7},workday:{ok:false},shifts:[]};
      res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify(data));return;
    }
    if (url.pathname.startsWith("/api/")) { res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"ok":true,"venues":[]}'); return; }
    if (["/settings/sales-accounting", "/sales-totals"].includes(url.pathname)) {
      res.writeHead(200, { "Content-Type": "text/html" }); res.end(salesAccountingPage(url.pathname.includes("settings"))); return;
    }
    const path = resolve("public", "." + url.pathname);
    if (!path.startsWith(resolve("public") + "/")) { res.writeHead(404); res.end(); return; }
    const types: Record<string, string> = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
    res.writeHead(200, { "Content-Type": types[extname(path)] || "text/plain" }); res.end(readFileSync(path));
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});
async function main(){
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(),args:chromiumArgs,headless:true});const results:object[]=[];
 try{for(const width of [390,1280]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},locale:'ru-RU'});
 await context.addInitScript(()=>{localStorage.setItem('bd_active_venue_id','1');localStorage.setItem('bd_session','isolated');localStorage.setItem('bd_session_token','isolated');});
 const page=await context.newPage();page.setDefaultTimeout(10000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const date=new Date().toISOString().slice(0,10),tomorrow=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10),priorDate=new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);
 const legacy:accounting.SalesAccounting={version:1,venueId:1,changes:[{id:'initial-pos',mode:'POS',effectiveDate:'1970-01-01',createdAt:new Date().toISOString(),actorId:7},{id:'legacy-pending',mode:'MANUAL',effectiveDate:tomorrow,createdAt:new Date().toISOString(),actorId:7}]};
 fixture.put(accounting.SALES_ACCOUNTING_KEY,legacy);fixture.put('bd_operational_reports_v1',[{id:'day',venueId:1,date,workdayStatus:'OPEN',staffing:[{employeeId:'qa'}]}]);
 const pos={id:'pos-'+width,venueId:1,date,revenueSource:'sales_events_v1',currency:'MDL',revenue:300,receipts:1,closingStatus:'closed'};fixture.put('bd_finance_revenue',[pos]);fixture.put('bd_stock_movements',[{id:'stock-sentinel'}]);
 await page.goto(base+'/settings/sales-accounting');await page.waitForFunction(()=>!(document.querySelector('[data-mode="MANUAL"]') as HTMLButtonElement).disabled);
 await page.locator('[data-mode="MANUAL"]').click();assert.match(await page.locator('#accounting-confirm-copy').innerText(),/в том числе сегодня/);
 await page.locator('#accounting-confirm-save').click();await page.waitForFunction(()=>document.querySelector('#accounting-confirm-error')?.textContent?.includes('Подтвердите'));assert.deepEqual(fixture.get(accounting.SALES_ACCOUNTING_KEY),legacy);
 await page.locator('#legacy-schedule-accept').check();await page.locator('#accounting-confirm-save').click();await page.waitForFunction(()=>!(document.querySelector('#accounting-confirm') as HTMLDialogElement).open);
 assert.deepEqual((fixture.get(accounting.SALES_ACCOUNTING_KEY) as accounting.SalesAccounting).changes,legacy.changes);
 await page.goto(base+'/sales-totals');await page.waitForFunction(()=>!(document.querySelector('#manual-shift-open') as HTMLButtonElement).disabled);await page.locator('#manual-shift-open').click();await page.waitForFunction(()=>!(document.querySelector('#totals-save') as HTMLButtonElement).disabled);
 const firstId=await page.locator('#totals-shift').inputValue();assert.equal(await page.locator('#totals-date').inputValue(),date);assert.equal(await page.locator('#totals-cash').inputValue(),'');
 await page.locator('#totals-cash').fill('50');await page.locator('#totals-card').fill('150');await page.locator('#totals-cogs').fill('40');
 await page.locator('#totals-date').fill(priorDate);await page.locator('#accounting-date-confirm').waitFor({state:'visible'});await page.locator('#accounting-date-cancel').click();assert.equal(await page.locator('#totals-date').inputValue(),date);assert.equal(await page.locator('#totals-cash').inputValue(),'50');
 await page.locator('#totals-save').click();await page.waitForFunction(()=>document.querySelector('#accounting-status')?.textContent?.includes('Итоги смены сохранены'));
 let rows=fixture.get('bd_finance_revenue') as any[];assert.equal(rows.reduce((sum,r)=>sum+r.revenue,0),500);assert.deepEqual(rows[0],pos);assert.equal(rows[1].receipts,null);assert.equal(rows[1].manualTotalsVersion,2);
 await page.reload();await page.waitForFunction(()=>(document.querySelector('#totals-cash') as HTMLInputElement).value==='50');
 await page.locator('#manual-shift-open').click();await page.waitForFunction(()=>(document.querySelector('#totals-cash') as HTMLInputElement).value==='');const secondId=await page.locator('#totals-shift').inputValue();assert.notEqual(secondId,firstId);
 await page.locator('#totals-cash').fill('9');await page.locator('#totals-card').fill('1');await page.locator('#totals-shift').selectOption(firstId);await page.locator('#accounting-date-confirm').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await page.locator('#totals-shift').inputValue(),secondId);assert.equal(await page.locator('#totals-cash').inputValue(),'9');
 await page.locator('#totals-shift').selectOption(firstId);await page.locator('#accounting-date-confirm').waitFor({state:'visible'});await page.locator('#accounting-date-discard').click();assert.equal(await page.locator('#totals-shift').inputValue(),firstId);assert.equal(await page.locator('#totals-cash').inputValue(),'50');
 await page.locator('#totals-shift').selectOption(secondId);await page.locator('#totals-cash').fill('0');await page.locator('#totals-card').fill('0');await page.locator('#totals-cogs').fill('0');await page.locator('#totals-receipts').fill('0');await page.locator('#totals-save').click();await page.waitForFunction(()=>document.querySelector('#accounting-status')?.textContent?.includes('Итоги смены сохранены'));
 rows=fixture.get('bd_finance_revenue') as any[];assert.equal(rows.reduce((sum,r)=>sum+r.revenue,0),500);assert.deepEqual(fixture.get('bd_stock_movements'),[{id:'stock-sentinel'}]);
 await page.screenshot({path:`${output}/totals-${width}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.goto(base+'/settings/sales-accounting');await page.waitForFunction(()=>!(document.querySelector('[data-mode="POS"]') as HTMLButtonElement).disabled);await page.locator('[data-mode="POS"]').click();await page.locator('#accounting-confirm-save').click();await page.waitForFunction(()=>!(document.querySelector('#accounting-confirm') as HTMLDialogElement).open);
 assert.equal(accounting.nextSalesMode(fixture.get(accounting.SALES_ACCOUNTING_KEY) as accounting.SalesAccounting,date),'POS');assert.deepEqual(fixture.get('bd_finance_revenue'),rows);assert.deepEqual(errors,[]);
 results.push({width,legacyPendingExplicitAdoption:'PASS',manualTodayAfterPos300:'PASS',manual200Day500:'PASS',multipleManualSessions:'PASS',dateAndShiftUnsavedCancelEscapeDiscard:'PASS',unknownVersusZero:'PASS',reload:'PASS',switchBackWithoutHistoryMutation:'PASS',noStockWrites:'PASS',pageErrors:errors});await context.close();
 }}finally{await browser.close();server.close();fixture.close();}
 writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
