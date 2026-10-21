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
    else if (url.pathname.startsWith("/cases") || ["/catalog", "/assortment", "/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = new Response(readFileSync("dist/client/app.html"),{headers:{"Content-Type":"text/html"}});
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
const out='outputs/shift-cases-artifact';mkdirSync(out,{recursive:true});
try {
 const user=await runtime.register('shift-cases-ui@isolated.test'),accountId=user.userId,venueId=user.activeVenueId,date='2026-10-20';
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local shift incidents',currency:'MDL',timezone:'UTC'}),accountId);
 const entry=(id:string,title:string,day=date,venue=venueId)=>({id,title,description:'Подробности '+title,type:'equipment',priority:'medium',status:'open',responsible:'Тестовый сотрудник',businessDate:day,venueId:venue,createdAt:day+'T14:00:00Z',updatedAt:day+'T14:00:00Z',comments:[],photos:[],files:[],timeline:[]});
 const selected:any=entry('selected','Сломалась кофемолка');selected.category='operations';delete selected.type;delete selected.files;delete selected.comments;delete selected.timeline;
 const cases=[selected,entry('another','Другая смена','2026-10-19'),entry('foreign','Чужое заведение',date,venueId+100)];
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)').run(accountId,'bd_cases',JSON.stringify(cases));
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)').run(accountId,'bd_operational_reports_v1',JSON.stringify([date,'2026-10-18'].map(day=>({id:'operational-report:'+venueId+':'+day,venueId,date:day,workdayStatus:'CLOSED',workdayRevision:1,workdayStartTime:'09:00',closingStatus:'closed',staffing:[],payrollBreakdown:{total:0}}))));
 const business=()=>JSON.stringify(runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before=business();
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId});
 const page=await context.newPage(),errors:string[]=[],assets:string[]=[];
 page.setDefaultTimeout(12000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});page.on('response',r=>{if(/index-BQGspy0I.*\.js/.test(r.url()))assets.push(r.url());});
 const shiftUrl=base+`/shifts?venue=${venueId}&workday=${date}&month=2026-10`;
 try {
  await page.goto(shiftUrl);
  await page.getByRole('button',{name:`Происшествия смены ${date} · 1`,exact:true}).click();
  await page.getByText('Происшествия смены · '+date,{exact:true}).first().waitFor();
  await page.getByText('Сломалась кофемолка',{exact:true}).click();
  await page.getByText('Подробности Сломалась кофемолка',{exact:true}).waitFor();
  assert.ok(page.url().includes('/cases/selected?'));await page.reload();await page.getByText('Подробности Сломалась кофемолка',{exact:true}).waitFor();
  await page.screenshot({path:out+'/detail.png',fullPage:true});
  await page.getByRole('button',{name:/^(Назад|Вернуться назад)$/}).click();
  await page.getByText('Происшествия смены · '+date,{exact:true}).first().waitFor();
  assert.equal(await page.getByText('Другая смена',{exact:true}).count(),0);assert.equal(await page.getByText('Чужое заведение',{exact:true}).count(),0);
  await page.reload();await page.getByText('Происшествия смены · '+date,{exact:true}).first().waitFor();
  await page.getByRole('button',{name:/^(Назад|Вернуться назад)$/}).click();
  await page.getByRole('button',{name:`Происшествия смены ${date} · 1`,exact:true}).waitFor();assert.ok(page.url().includes('workday='+date));
  await page.goto(base+`/shifts?venue=${venueId}&workday=2026-10-18&month=2026-10`);
  await page.getByRole('button',{name:'Происшествия смены 2026-10-18 · 0',exact:true}).click();
  await page.getByText('За эту смену происшествий нет.',{exact:true}).waitFor();await page.screenshot({path:out+'/empty.png',fullPage:true});
  await page.goto(base+`/cases/another?venue=${venueId}&workdayVenue=${venueId}&workday=${date}`);await page.getByText('Дело не найдено',{exact:true}).waitFor();assert.equal(await page.getByText('Подробности Другая смена',{exact:true}).count(),0);
  rejectSave=true;await page.goto(base+`/cases?venue=${venueId}&workdayVenue=${venueId}&workday=${date}`);await page.getByText('Проверочная ошибка чтения',{exact:true}).waitFor();rejectSave=false;await page.getByRole('button',{name:'Повторить',exact:true}).click();await page.getByText('Сломалась кофемолка',{exact:true}).waitFor();
  await page.goto(base+`/cases?venue=${venueId+100}&workdayVenue=${venueId+100}&workday=${date}`);await page.getByText('Выберите заведение этой смены, затем откройте происшествия снова.',{exact:true}).waitFor();assert.equal(await page.getByText('Сломалась кофемолка',{exact:true}).count(),0);
  assert.deepEqual(errors,[]);assert.equal(business(),before,'read-only navigation preserves all business stores');
  const asset=new URL(assets.at(-1)!).pathname,artifactHash=createHash('sha256').update(readFileSync(resolve('dist/client','.'+asset))).digest('hex');
  writeFileSync(out+'/results.json',JSON.stringify({pass:true,checks:['count-to-list','same date/venue only','existing detail','detail reload','back to filtered list','list reload','back to exact workday','empty count','wrong-day detail rejected','read error retry','wrong venue rejected','no writes'],asset,artifactHash,errors},null,2));console.log('PASS shift cases artifact',artifactHash);
 }catch(error){console.log('URL',page.url(),'ERRORS',errors);await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('body').innerText()).slice(-4500));throw error;}finally{await context.close();}
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.sqlite.close();}
