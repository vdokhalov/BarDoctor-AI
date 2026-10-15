import { salesEventFixture } from '../tests/helpers/sales-event-fixture';
import {seedOpenWorkday} from '../tests/helpers/pos-workday-fixture';
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit, devices } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
import { GET as staffLoginPage } from '../app/staff-login/route';
import { GET as staffAccessPage } from '../app/staff-access/route';
const fixedTime = process.env.BD_OPERATIONAL_TEST_INSTANT;
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ pinSession:'./app/api/staff-pin/session/route',pinMembers:'./app/api/staff-pin/members/route',pinService:'./lib/bardoctor/staff-pin-credentials',memberService:'./lib/bardoctor/staff-pin-members',posSession:'./lib/bardoctor/staff-pin-session',gateway:'./lib/bardoctor/staff-pin-gateway', batches:"./app/api/sales-batches/route",workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime,bindings:{STAFF_PIN_LOOKUP_KEY:"synthetic-browser-fixture-only-key"} });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", base), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/staff-pin/session":"pinSession","/api/staff-pin/members":"pinMembers", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    const request=new Request(url,{method:req.method,headers:{...req.headers,'cf-connecting-ip':'127.0.0.1'} as HeadersInit,...(body.length?{body}:{})});
    const gate=await (runtime.api.gateway as unknown as typeof import('../lib/bardoctor/staff-pin-gateway')).staffPinGateway(request);
    if(gate)response=gate;
    else if(url.pathname==='/staff-login'||url.pathname==='/login'&&!url.searchParams.has('management'))response=staffLoginPage();
    else if(url.pathname==='/staff-access')response=staffAccessPage();
    else if (name) response = await runtime.api[name][req.method || "GET"](request, { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(request);
    else if (["/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve("public", "." + url.pathname);
      response = file.startsWith(resolve("public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    res.writeHead(response.status, {...Object.fromEntries(response.headers),...(response.headers.getSetCookie().length?{"set-cookie":response.headers.getSetCookie()}:{})}); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture failure"); }
}
const server = createServer((req, res) => {
  const task = handleRequest(req, res); pendingHandlers.add(task);
  void task.finally(() => pendingHandlers.delete(task));
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const browser=await webkit.launch({headless:true,...(process.env.BD_QA_WEBKIT?{executablePath:process.env.BD_QA_WEBKIT}:{})});
const out='outputs/staff-pin';mkdirSync(out,{recursive:true});
try{
 const owner=await runtime.register('browser-owner@isolated.test');
 const actor=await runtime.api.auth.authenticateRequest(runtime.request(owner,'/api/access'));assert.ok(actor);
 const members=runtime.api.memberService as unknown as typeof import('../lib/bardoctor/staff-pin-members');
 const pins=runtime.api.pinService as unknown as typeof import('../lib/bardoctor/staff-pin-credentials');
 const a=await members.createPinStaff(actor,'Anna','waiter','anna'),b=await members.createPinStaff(actor,'Boris','barista','boris');
 const pinA=await pins.issueStaffPin(actor,a.membershipId),pinB=await pins.issueStaffPin(actor,b.membershipId);
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"name":"Synthetic PIN venue","currency":"MDL","timezone":"UTC"}',owner.userId);
 seedOpenWorkday(runtime.sqlite,owner.userId,owner.activeVenueId,new Date().toISOString().slice(0,10));
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_assortment_v1',JSON.stringify(salesEventFixture().assortment));
 const opened=await runtime.api.sales.POST(runtime.request(owner,'/api/sales-events','POST',{action:'open_shift',shiftId:'browser-pin-shift',name:'Synthetic PIN',venueId:owner.activeVenueId}));assert.equal(opened.status,201);
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}});
 await context.addInitScript({content:'window.__name=(value)=>value;'});
 const page=await context.newPage();await page.goto(base+'/login');
 await page.locator('#login').fill('ANNA');await page.locator('#pin').fill(pinA.pin);await page.getByRole('button',{name:'Войти',exact:true}).click();await page.waitForURL('**/cashier?embedded=1');await page.locator('#employee-name').filter({hasText:'Anna'}).waitFor();
 const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name==='bd_pos_session'&&c.httpOnly));assert.ok(!cookies.some(c=>c.name==='bd_pos_device'));
 assert.equal(await page.locator('#management-link').isVisible(),false);assert.equal(await page.locator('#sales-journal').isVisible(),false);assert.equal(await page.locator('#navigation').innerText().then(x=>x.includes('Отчёт')),false);
 await page.goto(base+'/');await page.waitForURL('**/cashier?embedded=1');await page.locator('#employee-name').filter({hasText:'Anna'}).waitFor();
 const forbidden=await page.evaluate(async()=>({api:(await fetch('/api/access')).status}));assert.equal(forbidden.api,403);
 await page.goto(base+'/finance');await page.waitForURL('**/cashier?embedded=1');
 const keyA='bd_pos_workspace_v2:'+a.actorId+':'+owner.activeVenueId,keyB='bd_pos_workspace_v2:'+b.actorId+':'+owner.activeVenueId;
 async function addItem(id:string){await page.locator('[data-pane="menu"]').first().click();await page.locator('[data-add="'+id+'"]').click();await page.locator('#dialog-submit').click();await page.locator('#dialog').waitFor({state:'hidden'});await page.locator('[data-pane="order"]').click();}
 async function logout(){await page.locator('#identity-button').click();await page.getByRole('button',{name:'Выйти / сменить сотрудника',exact:true}).click();await page.waitForURL('**/login');}
 async function login(pin:string,name:string){await page.locator('#login').fill(name.toLowerCase());await page.locator('#pin').fill(pin);await page.getByRole('button',{name:'Войти',exact:true}).click();await page.waitForURL('**/cashier?embedded=1');await page.locator('#employee-name').filter({hasText:name}).waitFor();}
 await addItem('beer');
 let lost=false;
 await page.route('**/api/sales-events',async route=>{const request=route.request();const body=request.method()==='POST'?request.postDataJSON():null;if(!lost&&body?.action==='post'){const response=await route.fetch();assert.equal(response.status(),201);lost=true;await route.abort('failed');}else await route.continue();});
 await page.locator('#pay').click();await page.locator('#dialog-submit').click();await page.waitForFunction(()=>!!document.querySelector('#dialog-error')?.textContent);assert.equal(lost,true);
 await page.locator('#dialog [data-action="dismiss"]').first().click();
 const pendingA=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).pending,keyA);assert.ok(pendingA);assert.equal(pendingA.body.command.lines[0].menuItemId,'beer');
 const second=await context.newPage();await second.goto(base+'/cashier?embedded=1');await second.locator('#employee-name').filter({hasText:'Anna'}).waitFor();
 await logout();await second.locator('#work').waitFor({state:'hidden'});await login(pinB.pin,'Boris');assert.equal(await page.locator('#recovery').isVisible(),false);
 await addItem('whisky');
 const saved=await page.evaluate(({keyA,keyB})=>[JSON.parse(localStorage.getItem(keyA)!),JSON.parse(localStorage.getItem(keyB)!)],{keyA,keyB});assert.deepEqual(saved[0].pending,pendingA);assert.equal(saved[1].quick.lines[0].menuItemId,'whisky');assert.equal(saved[1].pending,null);
 await logout();await login(pinA.pin,'Anna');await page.locator('#retry').waitFor();
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).pending,keyA),pendingA);
 await page.locator('#retry').click();await page.locator('#recovery').waitFor({state:'hidden'});
 const events=JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_sales_events_v1'").get(owner.userId)!.data_json));
 assert.equal(events.length,1);assert.equal(events[0].actor.accountId,a.actorId);assert.equal(events[0].externalId,pendingA.body.command.id);
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).pending,keyA),null);
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).quick.lines[0].menuItemId,keyB),'whisky');
 await second.close();
 await pins.revokeStaffPin(actor,a.membershipId);await page.reload();await page.waitForURL('**/login');
 await page.getByRole('button',{name:'Вход руководителя',exact:true}).click();await page.waitForURL('**/login?management=1');
 writeFileSync(out+'/result.json',JSON.stringify({status:'PASS',activation:'none',login:'normalized username + six digit PIN, cookie HttpOnly',reopen:'Anna restored',directApi:403,directPage:'cashier redirect',switch:'Anna -> Boris -> Anna',drafts:'real Beer pending payment / Boris Whisky preserved',payment:'server committed, response lost, same ID retry, exactly one sale authored by Anna',secondTab:'old Anna tab frozen on switch',revoke:'login required',managerExit:'ordinary login available'},null,2));
 await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
