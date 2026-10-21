import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
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
const fixedTime = "2026-10-21T12:00:00Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ monthClose:"./app/api/month-close/route", workdays:"./app/api/workdays/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route" }, { now: fixedTime });
const replies:any[]=[];const failures:any[]=[];const excludedRoutes=['/api/management/cost-signals','/api/opportunities','/api/competitors/me','/api/reviews/home'];
let rejectSave = false, saveCount = 0, delaySave = false;
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"monthClose", "/api/workdays":"workdays", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(excludedRoutes.includes(url.pathname)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,success:false,code:'LOCAL_SCOPE_EXCLUDED'}));return;}
    if(url.pathname==='/api/workdays'&&url.searchParams.get('view')==='incidents'&&rejectSave){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:'Проверочная ошибка чтения'}));return;}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (url.pathname.startsWith("/employees") || ["/catalog", "/assortment", "/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = new Response(readFileSync("dist/client/app.html"),{headers:{"Content-Type":"text/html"}});
    else {
      const emitted=resolve("dist/client", "." + url.pathname);
      const file = existsSync(emitted)?emitted:resolve("public", "." + url.pathname);
      response = (file.startsWith(resolve("public")) || file.startsWith(resolve("dist/client"))) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    if(url.pathname==="/api/month-close"){const data=await response.clone().json();replies.push({status:response.status,url:url.href,data});}
    if(response.status>=400)failures.push({url:url.pathname,status:response.status,body:(await response.clone().text()).slice(0,500)});
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
const out='outputs/team-department-artifact';mkdirSync(out,{recursive:true});
try {
 const user=await runtime.register('team-department@isolated.test'),venueId=user.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local team',currency:'MDL',timezone:'UTC'}),user.userId);
 const employee=(id:string,name:string,department:string,status='active')=>({id,name,department,status,position:'cook',employmentType:'full_time',salaryType:'fixed',salaryAmount:100,hireDate:'2026-01-01',phone:'',email:'',schedule:{type:'fixed',days:[]},createdAt:fixedTime,updatedAt:fixedTime});
 const employees=[employee('k1','Анна Кухня','Кухня'),employee('k2','Борис Кухня','Кухня'),employee('k3','Вера Кухня','Кухня','on_leave'),employee('left','Уволенный','Кухня','dismissed'),employee('bar','Глеб Бар','Бар'),employee('similar','Дина другая кухня','Кухня 2')];
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)').run(user.userId,'bd_employees',JSON.stringify(employees));
 const before=JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId});
 const page=await context.newPage(),errors:string[]=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(base+'/employees');await page.locator('.bd-team-department-list-v163 button').filter({hasText:'Кухня'}).filter({hasText:'3 человека'}).click();
 const list=page.locator('.bd-team-directory-body');await list.getByText('Анна Кухня',{exact:true}).waitFor();assert.equal(await list.getByText('Глеб Бар',{exact:true}).count(),0);assert.equal(await list.getByText('Дина другая кухня',{exact:true}).count(),0);assert.equal(await list.getByText('Уволенный',{exact:true}).count(),0);
 assert.match(await list.innerText(),/Борис Кухня/);assert.match(await list.innerText(),/Вера Кухня/);assert.ok(page.url().includes('department='));
 await page.screenshot({path:out+'/department.png'});await list.getByText('Анна Кухня',{exact:true}).click();await page.locator('.bd-employee-detail-page').waitFor();await page.reload();await page.locator('.bd-employee-detail-page').waitFor();await page.getByRole('button',{name:/^(Назад|Вернуться назад)$/}).click();await page.getByText('Отдел: Кухня',{exact:true}).waitFor();await list.getByText('Анна Кухня',{exact:true}).waitFor();
 await page.reload();await page.getByText('Отдел: Кухня',{exact:true}).waitFor();await page.getByRole('searchbox',{name:'Поиск сотрудников'}).fill('Борис');await list.getByText('Борис Кухня',{exact:true}).waitFor();await list.getByText('Анна Кухня',{exact:true}).waitFor({state:'detached'});await page.reload();await list.getByText('Борис Кухня',{exact:true}).waitFor();await list.getByText('Анна Кухня',{exact:true}).waitFor({state:'detached'});
 await page.goto(base+'/employees?view=employees&department='+encodeURIComponent('Пустой отдел')+'&departmentVenue='+venueId);await page.getByText('В этом отделе нет сотрудников по выбранным условиям.',{exact:true}).waitFor();await page.screenshot({path:out+'/empty.png'});
 await page.goto(base+'/employees?view=employees&department='+encodeURIComponent('Кухня')+'&departmentVenue='+(venueId+100));await page.getByText('Список отдела недоступен для выбранного заведения.',{exact:true}).waitFor();await list.getByText('Анна Кухня',{exact:true}).waitFor({state:'detached'});await page.getByRole('button',{name:'Все отделы',exact:true}).click();await list.getByText('Глеб Бар',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);assert.equal(JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 writeFileSync(out+'/results.json',JSON.stringify({pass:true,checks:['exact department 3','exclude dismissed','exclude similarly named department','detail/reload/Back context','list reload','search intersects department and reload','empty department','foreign department scope blocked','clear filter','no business writes'],errors},null,2));console.log('PASS team department compiled artifact');
 }catch(error){console.log('URL',page.url(),'ERRORS',errors);console.log((await page.locator('body').innerText()).slice(-4500));await page.screenshot({path:out+'/failure.png',fullPage:true});throw error;}finally{await context.close();}
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.sqlite.close();}
