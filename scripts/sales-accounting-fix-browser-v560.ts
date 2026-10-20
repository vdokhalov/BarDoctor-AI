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
const output = resolve("outputs/sales-accounting-fix-v560");
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
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(),args:chromiumArgs,headless:true});
 const results:object[]=[];
 try{for(const width of [390,1280]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},locale:'ru-RU'});
 await context.addInitScript(()=>{localStorage.setItem('bd_active_venue_id','1');localStorage.setItem('bd_session','isolated');localStorage.setItem('bd_session_token','isolated');});
 const page=await context.newPage();page.setDefaultTimeout(10000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const setting:accounting.SalesAccounting={version:1,venueId:1,changes:[{id:'manual-enabled',mode:'MANUAL',effectiveDate:'2020-01-01',createdAt:'2020-01-01T12:00:00Z',actorId:7}]};
 fixture.put(accounting.SALES_ACCOUNTING_KEY,setting);
 const date=new Date().toISOString().slice(0,10),previous=new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);
 const totals=accounting.planManualTotals({setting,venueId:1,actorId:7,role:'owner',currency:'MDL',date,now:new Date().toISOString(),timezone:'UTC',operationId:'fixture-seed-'+width,expectedRevision:0,cash:100,card:200,cogs:60,receipts:3,revenues:[],closedMonths:new Set<string>()}).revenues;
 fixture.put('bd_finance_revenue',totals);fixture.put('bd_stock_movements',[{id:'sentinel'}]);
 const persisted=JSON.stringify(fixture.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all());
 async function journalReady(){await page.waitForFunction(()=>document.querySelector('#journal-count')?.textContent?.includes('документ'));assert.doesNotMatch(await page.locator('#notice').innerText(),/null|недоступен/i);await page.getByText('Продаж пока нет',{exact:true}).waitFor();}
 await page.goto(base+'/sales-import?venue=1');await journalReady();await page.reload();await journalReady();await page.locator('#refresh').click();await journalReady();
 await page.goto(base+'/sales-totals');await page.waitForFunction(()=>(document.querySelector('#totals-cash') as HTMLInputElement).value==='100');
 await page.locator('[data-bd-back]').click();await page.waitForURL('**/sales-import*');await journalReady();
 await page.goto(base+'/sales-totals');await page.waitForFunction(()=>(document.querySelector('#totals-cash') as HTMLInputElement).value==='100');
 await page.locator('#totals-cash').fill('999');await page.locator('#totals-card').fill('222');await page.locator('#totals-cogs').fill('');await page.locator('#totals-receipts').fill('0');await page.locator('#totals-reason').fill('Несохранённая правка');
 const values=()=>page.locator('#accounting-totals input:not([type=date]),#accounting-totals textarea').evaluateAll(nodes=>nodes.map(n=>(n as HTMLInputElement).value));
 const draft=await values();
 await page.locator('#totals-date').fill(previous);await page.locator('#accounting-date-confirm').waitFor({state:'visible'});
 assert.equal(await page.locator('#totals-date').inputValue(),date);await page.locator('#accounting-date-cancel').click();assert.deepEqual(await values(),draft);
 await page.locator('#totals-date').fill(previous);await page.locator('#accounting-date-confirm').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.deepEqual(await values(),draft);assert.equal(await page.locator('#totals-date').inputValue(),date);
 await page.locator('#totals-date').fill(previous);await page.locator('#accounting-date-confirm').waitFor({state:'visible'});await page.screenshot({path:`${output}/date-confirm-${width}.png`});
 const layout=await page.locator('#accounting-date-discard').boundingBox();assert.ok(layout&&layout.x>=0&&layout.x+layout.width<=width&&layout.y+layout.height<=(width===390?844:900));
 await page.locator('#accounting-date-discard').click();assert.equal(await page.locator('#totals-date').inputValue(),previous);assert.equal(await page.locator('#totals-cash').inputValue(),'');
 await page.locator('#totals-date').fill(date);assert.equal(await page.locator('#totals-cash').inputValue(),'100');assert.equal(await page.locator('#accounting-date-confirm').evaluate((d:HTMLDialogElement)=>d.open),false);
 // Restoring the original input is not dirty and must not show a confirmation.
 await page.locator('#totals-cash').fill('101');await page.locator('#totals-cash').fill('100');await page.locator('#totals-date').fill(previous);assert.equal(await page.locator('#accounting-date-confirm').evaluate((d:HTMLDialogElement)=>d.open),false);
 await page.reload();await page.waitForFunction(()=>(document.querySelector('#totals-cash') as HTMLInputElement).value==='100');
 assert.equal(JSON.stringify(fixture.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all()),persisted);assert.deepEqual(errors,[]);
 results.push({width,journalDirectBackReloadRefresh:'PASS',dateCancelEscapeKeepsAllFields:'PASS',dateDiscard:'PASS',cleanDateChange:'PASS',reloadPersistedData:'PASS',dialogButtonsInViewport:'PASS',pageErrors:errors});await context.close();
 }}finally{await browser.close();server.close();fixture.close();}
 writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
