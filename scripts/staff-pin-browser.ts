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
const runtime = await lifecycleRuntime({ pinSession:'./app/api/staff-pin/session/route',pinDevice:'./app/api/staff-pin/device/route',pinMembers:'./app/api/staff-pin/members/route',pinService:'./lib/bardoctor/staff-pin-credentials',memberService:'./lib/bardoctor/staff-pin-members',posSession:'./lib/bardoctor/staff-pin-session',gateway:'./lib/bardoctor/staff-pin-gateway', batches:"./app/api/sales-batches/route",workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime,bindings:{STAFF_PIN_LOOKUP_KEY:"synthetic-browser-fixture-only-key"} });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", base), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/staff-pin/session":"pinSession","/api/staff-pin/device":"pinDevice","/api/staff-pin/members":"pinMembers", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    const request=new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})});
    const gate=await (runtime.api.gateway as unknown as typeof import('../lib/bardoctor/staff-pin-gateway')).staffPinGateway(request);
    if(gate)response=gate;
    else if(url.pathname==='/staff-login')response=staffLoginPage();
    else if(url.pathname==='/staff-access')response=staffAccessPage();
    else if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
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
 const a=await members.createPinStaff(actor,'Anna','waiter'),b=await members.createPinStaff(actor,'Boris','barista');
 const pinA=await pins.issueStaffPin(actor,a.membershipId),pinB=await pins.issueStaffPin(actor,b.membershipId);
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"name":"Synthetic PIN venue","currency":"MDL","timezone":"UTC"}',owner.userId);
 seedOpenWorkday(runtime.sqlite,owner.userId,owner.activeVenueId,new Date().toISOString().slice(0,10));
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}});
 await context.addInitScript({content:'window.__name=(value)=>value;'});
 const page=await context.newPage();await page.goto(base+'/staff-access');
 await page.evaluate(({owner})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(owner.activeVenueId));},{owner});
 await page.reload();await page.locator('#controls').waitFor({state:'visible'});
 page.on('dialog',dialog=>dialog.accept());await page.locator('#authorize').click();await page.waitForURL('**/staff-login');
 const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name==='bd_pos_device'&&c.httpOnly));assert.equal(await page.evaluate(()=>localStorage.getItem('bd_session_token')),null);
 await page.locator('#pin').fill(pinA.pin);await page.getByRole('button',{name:'Войти',exact:true}).click();await page.waitForURL('**/cashier?embedded=1');await page.locator('#employee-name').filter({hasText:'Anna'}).waitFor();
 assert.equal(await page.locator('#management-link').isVisible(),false);assert.equal(await page.locator('#sales-journal').isVisible(),false);assert.equal(await page.locator('#navigation').innerText().then(x=>x.includes('Отчёт')),false);
 await page.goto(base+'/');await page.waitForURL('**/cashier?embedded=1');await page.locator('#employee-name').filter({hasText:'Anna'}).waitFor();
 const forbidden=await page.evaluate(async()=>({api:(await fetch('/api/access')).status}));assert.equal(forbidden.api,403);
 await page.goto(base+'/finance');await page.waitForURL('**/cashier?embedded=1');
 // Distinct durable workspaces are preserved through a real browser switch.
 const keyA='bd_pos_workspace_v2:'+a.actorId+':'+owner.activeVenueId,keyB='bd_pos_workspace_v2:'+b.actorId+':'+owner.activeVenueId;
 await page.evaluate(({keyA,keyB})=>{localStorage.setItem(keyA,JSON.stringify({quick:{id:'anna-draft',lines:[],comment:'Anna only'},pending:null,byShift:{}}));localStorage.setItem(keyB,JSON.stringify({quick:{id:'boris-draft',lines:[],comment:'Boris only'},pending:null,byShift:{}}));},{keyA,keyB});
 await page.reload();await page.locator('#employee-name').filter({hasText:'Anna'}).waitFor();
 await page.locator('#identity-button').click();await page.getByRole('button',{name:'Выйти / сменить сотрудника',exact:true}).click();await page.waitForURL('**/staff-login');
 await page.locator('#pin').fill(pinB.pin);await page.getByRole('button',{name:'Войти',exact:true}).click();await page.waitForURL('**/cashier?embedded=1');await page.locator('#employee-name').filter({hasText:'Boris'}).waitFor();
 const saved=await page.evaluate(({keyA,keyB})=>[JSON.parse(localStorage.getItem(keyA)!),JSON.parse(localStorage.getItem(keyB)!)],{keyA,keyB});assert.equal(saved[0].quick.comment,'Anna only');assert.equal(saved[1].quick.comment,'Boris only');
 await pins.revokeStaffPin(actor,b.membershipId);await page.reload();await page.waitForURL('**/staff-login');
 await page.getByRole('button',{name:'Вход руководителя',exact:true}).click();await page.waitForURL('**/login');
 writeFileSync(out+'/result.json',JSON.stringify({status:'PASS',activation:'owner ordinary session -> venue device',login:'PIN only, cookie HttpOnly',reopen:'Anna restored',directApi:403,directPage:'cashier redirect',switch:'Anna -> Boris',drafts:'separate preserved comments',revoke:'login required',managerExit:'ordinary login available'},null,2));
 await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
