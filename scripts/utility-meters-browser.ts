import assert from "node:assert/strict";
import {emptyMonthFixture} from "../tests/helpers/empty-month-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import {GET as utilitiesPage} from '../app/finance/utilities/route';
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const apiDelay = 0;
const runtime = await emptyMonthFixture({utilities:'./app/api/utilities/route',storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/utilities":"utilities", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/finance/utilities")response=utilitiesPage();
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU'});await ctx.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});
 const page=await ctx.newPage();const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.method()+' '+r.url()));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(base+'/finance/utilities?venue='+venueId+'&month=2026-10');await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();
 const confirm=async()=>{await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByRole('button',{name:'Подтвердить',exact:true}).click();await page.locator('dialog[open]').waitFor({state:'hidden'})};
 await page.getByRole('button',{name:'＋ Добавить счётчик'}).click();await page.locator('[name=name]').fill('Вода · кухня');await confirm();
 const water=page.locator('.service').first();await water.locator('summary').first().click();await water.getByRole('button',{name:'Тариф',exact:true}).click();await page.locator('[name=date]').fill('2026-10-01');await page.locator('[name=amount]').fill('2');await confirm();
 const openWater=async()=>{if(!await water.evaluate(e=>(e as HTMLDetailsElement).open))await water.locator('summary').first().click()};
 for(const [date,value] of [['2026-10-01','100'],['2026-10-20','108']]){await openWater();await water.getByRole('button',{name:'Внести показания',exact:true}).click();await page.locator('[name=date]').fill(date);await page.locator('[name=value]').fill(value);await confirm();}
 assert.match(await page.locator('.hero').innerText(),/16,00/);await page.reload();await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();assert.match(await page.locator('.hero').innerText(),/16,00/);
 await openWater();await water.locator('.history summary').click();await water.getByRole('button',{name:'Внести оплату',exact:true}).click();await page.locator('[name=amount]').fill('5');await confirm();await openWater();await water.locator('.history summary').click();assert.match(await water.innerText(),/Оплачено: 5,00/);assert.match(await page.locator('.hero').innerText(),/16,00/);
 await water.getByRole('button',{name:'Переименовать Вода · кухня'}).click();await page.locator('[name=name]').fill('Вода · бар');await confirm();await openWater();assert.match(await water.innerText(),/Вода · бар/);assert.match(await water.innerText(),/108/);
 mkdirSync('outputs/utilities-implementation',{recursive:true});for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'outputs/utilities-implementation/overview-'+width+'.png',fullPage:true});}
 await page.setViewportSize({width:390,height:844});await water.getByRole('button',{name:'Внести показания',exact:true}).click();await page.locator('[name=value]').fill('109');await page.screenshot({path:'outputs/utilities-implementation/input-390.png'});page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.locator('dialog[open]').waitFor({state:'hidden'});
 await water.getByRole('button',{name:'Внести показания',exact:true}).click();await page.locator('[name=value]').fill('109');await page.getByRole('button',{name:'Проверить',exact:true}).click();
 let dropped=false;await page.route('**/api/utilities?*',async route=>{const body=route.request().method()==='POST'?route.request().postDataJSON():null;if(!dropped&&body?.previewToken){dropped=true;await route.fetch();await route.abort('failed');}else await route.continue()});
 await page.getByRole('button',{name:'Подтвердить',exact:true}).click();await page.waitForFunction(()=>Boolean(document.getElementById('error')?.textContent));assert.equal(await page.locator('[name=value]').inputValue(),'109');assert.equal(dropped,true);
 await page.getByRole('button',{name:'Подтвердить',exact:true}).dblclick();await page.locator('dialog[open]').waitFor({state:'hidden'});await page.reload();await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();assert.match(await page.locator('.hero').innerText(),/18,00/);
 await page.getByRole('link',{name:'‹ Финансы'}).click();await page.getByRole('button',{name:/Коммунальные/}).first().click();await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();await page.goBack();await page.waitForURL('**/finance?*');await page.getByRole('button',{name:/Коммунальные/}).first().click();await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();await page.reload();await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();assert.match(await page.locator('.hero').innerText(),/18,00/);
 for(const path of ['/finance','/reports']){await page.goto(base+path+'?venue='+venueId+'&month=2026-10');await page.waitForTimeout(1800);const text=await page.locator('body').innerText();assert.match(text,/72,00/);assert.match(text,/18,00/);assert.match(text,/Себестоимость.*неизвестна|Себестоимость пока неизвестна/s);console.log('PASS report UI',path,'revenue 100, payroll 10, utility 18, result before COGS 72; COGS remains unknown');}
 await page.goto(base+'/finance/utilities?venue='+venueId+'&month=2026-10');await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();
 await openWater();await water.locator('.history summary').click();await water.getByRole('button',{name:'Отменить запись оплаты',exact:true}).click();await page.locator('[name=reason]').fill('Записали дважды');await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByRole('button',{name:'Подтвердить',exact:true}).waitFor();assert.match(await page.locator('#preview').innerText(),/5,00 → 0,00/);await page.screenshot({path:'outputs/utilities-implementation/cancel-payment-390.png'});
 let cancellationDropped=false;await page.route('**/api/utilities?*',async route=>{const body=route.request().method()==='POST'?route.request().postDataJSON():null;if(!cancellationDropped&&body?.previewToken&&body.command.action==='cancel-payment'){cancellationDropped=true;await route.fetch();await route.abort('failed');}else await route.continue()});
 await page.getByRole('button',{name:'Подтвердить',exact:true}).click();await page.waitForFunction(()=>Boolean(document.getElementById('error')?.textContent));assert.equal(await page.locator('[name=reason]').inputValue(),'Записали дважды');await page.getByRole('button',{name:'Подтвердить',exact:true}).dblclick();await page.locator('dialog[open]').waitFor({state:'hidden'});await page.reload();await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();await openWater();await water.locator('.history summary').click();assert.match(await water.innerText(),/Запись отменена/);assert.equal(await water.getByRole('button',{name:'Отменить запись оплаты',exact:true}).count(),0);
 await water.locator('[data-action="edit-reading"]').nth(1).click();await page.locator('[name=value]').fill('107');await confirm();await page.reload();await page.getByRole('button',{name:'＋ Добавить счётчик'}).waitFor();await openWater();await water.locator('.history summary').click();assert.match(await water.innerText(),/108 → 107/);assert.match(await water.innerText(),/Запись отменена/);assert.match(await page.locator('.hero').innerText(),/18,00/);await page.screenshot({path:'outputs/utilities-implementation/corrected-history-390.png',fullPage:true});console.log('PASS cancellation lost response/retry/doubleclick, corrected formerly paid reading, immutable payment and edit history after reload');
 await page.evaluate(()=>{localStorage.setItem('bd_active_venue_id','99999');window.dispatchEvent(new Event('storage'))});assert.match(await page.locator('#notice').innerText(),/Заведение изменилось/);assert.equal(await page.locator('#content').innerText(),'');
 assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(x=>/^(POST|PUT|PATCH) /.test(x)&&/priority|chat|market|openai|assess/.test(x)),[]);console.log('PASS actual UI create/tariff/readings/preview/payment/rename/reload/Back/Cancel/lost-response retry/doubleclick and 390/820/1280; no AI');await ctx.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
