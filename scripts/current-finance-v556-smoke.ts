import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-20T05:00:00Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ monthClose:"./app/api/month-close/route", workdays:"./app/api/workdays/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"monthClose", "/api/workdays":"workdays", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const emitted=resolve("dist/client", "." + url.pathname);
      const file = existsSync(emitted)?emitted:resolve("public", "." + url.pathname);
      response = (file.startsWith(resolve("public")) || file.startsWith(resolve("dist/client"))) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const out=process.env.BD_FINANCE_CONTRAST_ONLY?'outputs/current-finance-contrast':'outputs/current-finance-v556';mkdirSync(out,{recursive:true});const results:unknown[]=[];
try{
 const user=await runtime.register('current-smoke@isolated.test'),venueId=user.activeVenueId;
 const profile={name:'Current finance local QA',currency:'MDL',timezone:'Europe/Chisinau',workingDays:[1,2,3,4,5,6,7],openTime:'09:00',closeTime:'23:00',areas:['Бар']};
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),user.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value),fixedTime);
 const revenues=[{id:'s',venueId,date:'2026-10-19',currency:'MDL',revenue:300,receipts:1,revenueSource:'sales_events_v1',closingStatus:'closed'},{id:'future',venueId,date:'2026-10-22',currency:'MDL',revenue:0,receipts:0,revenueSource:'sales_events_v1',closingStatus:'open'}];
 put('bd_finance_revenue',revenues);put('bd_sales_events_v1',[{id:'e',venueId,businessDate:'2026-10-19',revenueRowId:'s',status:'POSTED',currency:'MDL',revenue:300,source:'POS_API'}]);
 for(const key of ['bd_finance_expenses','bd_payroll_entries','bd_stock_movements','bd_sales_documents','bd_sales_batches','bd_employees'])put(key,[]);
 put('bd_assortment_v1',salesEventFixture().assortment);
 const scenarios=process.env.BD_FINANCE_CONTRAST_ONLY?['missing-cost']:process.env.BD_FINANCE_UI_CORRECTION_ONLY?['missing-payroll']:['missing-cost','missing-payroll','zero'];
 for(const width of [390,1280])for(const scenario of scenarios){
  put('bd_operational_reports_v1',[{id:'r',venueId,date:'2026-10-19',closingStatus:'closed',...(scenario==='missing-payroll'?{}:{payrollBreakdown:{total:scenario==='zero'?300:90}})}]);
  const snapshot=()=>JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());const before=snapshot();
  const reply=await runtime.api.monthClose.GET(runtime.request(user,'/api/month-close?monthKey=current&view=current'));assert.equal(reply.status,200);const expected=await reply.json() as {report:{resultBeforeCost:number|null;payroll:number|null;revenue:number;asOfDate:string;financeAssessmentInformation:string[]}};
  assert.equal(expected.report.revenue,300);assert.equal(expected.report.resultBeforeCost,scenario==='missing-payroll'?null:scenario==='zero'?0:210);
  const context=await browser.newContext({viewport:{width,height:844},timezoneId:profile.timezone});
  await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId});
  const page=await context.newPage();await page.clock.setFixedTime(new Date(fixedTime));const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const loadedAssets:string[]=[];page.on('response',res=>{if(/index-BQGspy0I.*\.js/.test(res.url()))loadedAssets.push(res.url())});
  try{
   await page.goto(base+'/home');const home=page.locator('[data-bd-home-money="current-v556"]');await home.waitFor({timeout:30000});await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-bd-static-startup], [data-bd-splash], [data-bd-root-splash]')).every(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return !r.width||!r.height||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0;}));
   const homeText=await home.innerText();assert.match(homeText,/Финансы на 2026-10-20/);assert.match(homeText,/Результат до себестоимости/);assert.match(homeText,/Не подтверждена себестоимость/);
   assert.equal((await home.locator('.bd-home-money-value').innerText()).replace(/\s/g,''),scenario==='missing-payroll'?'Недостаточноданных':new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(expected.report.resultBeforeCost!).replace(/\s/g,'')+'MDL');
   assert.doesNotMatch(homeText,/Предварительная оценка|2026-10-22/);if(scenario==='missing-payroll')assert.match(homeText,/ФОТ: Неизвестно/);
   await home.scrollIntoViewIfNeeded();
   if(scenario==='missing-payroll')assert.equal(await home.locator('.bd-home-money-value').evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().right<=el.parentElement!.getBoundingClientRect().right),true,'missing-data text fits card');
   await home.screenshot({path:`${out}/${width}-${scenario}-home-card.png`});
   await page.screenshot({path:`${out}/${width}-${scenario}-home.png`,fullPage:true});
   if(process.env.BD_FINANCE_CONTRAST_ONLY){
    const contrast=await home.locator('h2').evaluate(`(()=>{const el=document.querySelector('[data-bd-home-money] h2');
     const heading=getComputedStyle(el),card=getComputedStyle(el.parentElement),overlay=getComputedStyle(el.parentElement,'::after');
     const rgb=(s)=>s.match(/[\\d.]+/g).map(Number);
     const fg=rgb(heading.color),stops=Array.from(card.backgroundImage.matchAll(/rgba?\\([^)]+\\)/g),m=>rgb(m[0])),over=rgb(overlay.backgroundColor);
     const lum=(c)=>c.slice(0,3).map(v=>{const n=v/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
     const blend=c=>c.map((v,i)=>i<3?v*(1-(over[3]??1))+over[i]*(over[3]??1):v);
     const backgrounds=stops.flatMap(c=>[{fg,bg:c},{fg:blend(fg),bg:blend(c)}]);
     const ratios=backgrounds.map(c=>(Math.max(lum(c.fg),lum(c.bg))+.05)/(Math.min(lum(c.fg),lum(c.bg))+.05));
     return {color:heading.color,background:card.backgroundImage,overlay:overlay.backgroundColor,minContrast:Math.min(...ratios),samples:ratios.length};
    })()`);
    assert.equal(contrast.color,'rgb(255, 255, 255)');assert.ok(contrast.samples>=3&&contrast.minContrast>=4.5,JSON.stringify(contrast));assert.deepEqual(errors,[]);assert.equal(snapshot(),before);
    results.push({width,scenario,status:'PASS',contrast,loadedAssets});continue;
   }
   await home.getByRole('button',{name:'Открыть отчёт'}).click();const report=page.locator('[data-bd-monthly-report]');await report.waitFor({timeout:30000});const hero=report.locator('[data-bd-monthly-hero]');await hero.getByText('На 2026-10-20',{exact:true}).waitFor();
   const reportText=await hero.innerText();assert.match(reportText,/Результат до себестоимости/i);assert.match(reportText,/Не подтверждена себестоимость/);
   assert.equal((await hero.locator('.bd-monthly-hero-value-v165').innerText()).replace(/\s/g,''),scenario==='missing-payroll'?'Поканерассчитан':new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(expected.report.resultBeforeCost!).replace(/\s/g,'')+'MDL');
   const shiftSummary=report.locator('.bd-monthly-shift-summary-v165');const summaryText=await shiftSummary.innerText();assert.doesNotMatch(summaryText,/Прибыльных|Убыточных/);assert.match(summaryText,/До себестоимости ≥ 0/);if(scenario==='missing-payroll'){assert.equal(await shiftSummary.locator('.is-profit strong').innerText(),'0');assert.equal(await shiftSummary.locator('.is-unknown strong').innerText(),'1');}
   await shiftSummary.screenshot({path:`${out}/${width}-${scenario}-shift-summary.png`});
   assert.doesNotMatch(reportText,/2026-10-22/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'horizontal overflow');
   await page.screenshot({path:`${out}/${width}-${scenario}-report.png`,fullPage:true});assert.deepEqual(errors,[]);assert.equal(snapshot(),before,'UI must not write financial data');
   results.push({width,scenario,status:'PASS',resultBeforeCost:expected.report.resultBeforeCost,payroll:expected.report.payroll,homeText,reportText,loadedAssets});
  }catch(error){await page.screenshot({path:`${out}/${width}-${scenario}-failure.png`,fullPage:true});writeFileSync(`${out}/failure.txt`,await page.locator('body').innerText());throw error}finally{await context.close()}
 }
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify({status:'PASS',checks:results.length,widths:[390,1280],realApi:true,syntheticOnly:true}));
