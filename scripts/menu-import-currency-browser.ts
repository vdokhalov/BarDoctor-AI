import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { menuImportRuntime } from "../tests/helpers/menu-import-runtime";
import * as XLSX from "xlsx";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
import { defaultNomenclatureStructure } from "../lib/bardoctor/nomenclature";
import { normalizeMenuImport } from "../lib/bardoctor/catalog";
import { menuActionReadiness, waitForMenuCloudReady } from "../tests/helpers/menu-action-readiness";
import { menuChooserAnalyticsRegression, menuBackgroundReadPreserves } from "../tests/helpers/menu-analytics-state-qa";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const runtime = await menuImportRuntime({ ingestion: "./app/api/menu/ingestion/route", taxonomy: "./app/api/nomenclature/taxonomy/route", sales: "./app/api/sales-events/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", valuation: "./app/api/inventory/valuation/route" });
let recognitionName = "Scan service", lostConfirm = false;
let lastConfirm: Record<string, unknown> | null = null;
let profileHydrationRace = false;
const requests: { action: string; source?: string }[] = [];
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/menu/ingestion": "ingestion", "/api/nomenclature/taxonomy": "taxonomy", "/api/sales-events": "sales", "/api/auth/login": "login", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/inventory/valuation": "valuation" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name) {
      const command = name === "ingestion" ? JSON.parse(body.toString()) : null;
      if (command) requests.push({ action: command.action, source: command.source });
      if (command?.action === "confirm") lastConfirm = command;
      response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
      // On reload, force fresh profile identity to arrive while the cached
      // profile's authoritative store read is in flight (the production race).
      if (profileHydrationRace && name === "store") {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      // Delay authoritative bootstrap to exercise first-click readiness during hydration.
      if (name === "bootstrap") await new Promise(resolve => setTimeout(resolve, 200));
      if (command?.action === "confirm" && lostConfirm && response.ok) { lostConfirm = false; res.destroy(); return; }
    } else if (url.pathname === "/api/catalog/files") {
      response = Response.json({ ok: true, file: { id: "00000000-0000-4000-8000-000000000001", name: "scan.jpg", type: "image/jpeg" } });
    } else if (url.pathname === "/api/catalog/import") {
      // CSV uploads use the actual catalog route. Only the external model is
      // fixed; production preprocessing, normalization and canonical APIs run.
      const parsed = req.headers["content-type"]?.includes("application/json") ? JSON.parse(body.toString()) : {};
      if (!req.headers["content-type"]?.includes("application/json")) {
        response = await runtime.api.catalogImport.POST(new Request(url, { method: "POST", headers: req.headers as HeadersInit, body }));
      } else {
      const draft = normalizeMenuImport({ currency: "MDL", confidence: .65, warnings: ["Проверьте цену"], menuItems: [{ name: recognitionName, salePrice: 17, currency: "MDL", type: "service", confidence: .65 }], recipes: [] }, { source: parsed.source || "upload" });
      response = Response.json(parsed.action === "recognise-batch" ? { ok: true, part: draft } : { ok: true, draft });
      }
    } else if (["/assortment", "/catalog", "/warehouse", "/cashier", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve(process.env.ARTIFACT_ROOT||"public", "." + url.pathname);
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture failure"); }
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const browser = await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
const out='outputs/menu-import-currency';mkdirSync(out,{recursive:true});
try{
 const user=await runtime.register('menu-currency-ui@local.test'),venueId=user.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тест импорта',currency:'PMR_RUB',timezone:'UTC'}),user.userId);
 const root={menuItems:[],recipes:[],nomenclature:[],nomenclatureStructure:defaultNomenclatureStructure()};
 runtime.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId,'bd_assortment_v1',JSON.stringify(root));
 const get=()=>JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(user.userId)!.data_json));
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({user,venueId})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{user,venueId});const page=await context.newPage();page.setDefaultTimeout(15000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/catalog?venue='+venueId+'&tab=menu');await waitForMenuCloudReady(page);
 const review=page.locator('.bd-menu-ingestion-review'),line=review.locator('article').first();
 async function importFile(){await page.getByRole('button',{name:'Добавить позицию',exact:true}).click();const picker=page.waitForEvent('filechooser');await page.getByRole('button',{name:/Импорт · PDF/}).click();await(await picker).setFiles({name:'local-menu.csv',mimeType:'text/csv',buffer:Buffer.from('name,salePrice,currency,type\nТестовая услуга,15,MDL,service\n')});await review.waitFor();assert.equal(await line.getByLabel('Валюта цены',{exact:true}).inputValue(),'MDL');await line.getByText('В импорте: MDL · В заведении: руб. ПМР',{exact:true}).waitFor();}
 await importFile();assert.deepEqual(get(),root);await page.reload();await waitForMenuCloudReady(page);assert.deepEqual(get(),root);await importFile();
 await line.getByLabel('Раздел',{exact:true}).selectOption('bar');await line.getByLabel('Категория',{exact:true}).selectOption('alcohol');await line.getByLabel('Как списывать со склада?').selectOption('NONE');await line.getByLabel('Решение для строки').selectOption('apply');await line.getByRole('checkbox').check();await review.locator('[data-bd-menu-ingestion-action="validate"]').click();await line.getByText('Валюта цены отличается от валюты заведения. Проверьте цену и валюту.',{exact:true}).waitFor();assert.equal(await review.locator('[data-bd-menu-ingestion-action="confirm"]').count(),0);assert.deepEqual(get(),root);
 const currencyChange=line.locator('dt').filter({hasText:/^Валюта$/}).locator('xpath=following-sibling::dd[1]');assert.equal(await currencyChange.innerText(),'— → MDL');await line.evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:out+'/mismatch-390.png',fullPage:true});
 await line.getByLabel('Валюта цены',{exact:true}).fill('PMR_RUB');await line.getByLabel('Цена',{exact:true}).fill('17');assert.equal(await line.locator('details').count(),0);await line.getByRole('checkbox').check();await review.locator('[data-bd-menu-ingestion-action="validate"]').click();await review.locator('[data-bd-menu-ingestion-action="confirm"]').waitFor();assert.equal(await currencyChange.innerText(),'— → PMR_RUB');await line.getByText('В импорте: MDL · В заведении: руб. ПМР',{exact:true}).waitFor();await review.locator('[data-bd-menu-ingestion-action="confirm"]').click();await review.waitFor({state:'hidden'});assert.equal(get().menuItems.length,1);assert.equal(get().menuItems[0].salePrice,17);assert.equal(get().menuItems[0].currency,'PMR_RUB');await page.reload();await waitForMenuCloudReady(page);assert.equal(get().menuItems.length,1);assert.equal(get().menuItems[0].currency,'PMR_RUB');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,checks:['CSV source MDL/venue PMR','mismatch blocks confirm','diff preserves price currency','reload and repeated import no canonical writes','explicit currency and price edit','source retained','apply17 PMR and reload'],out}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await runtime.close()}
