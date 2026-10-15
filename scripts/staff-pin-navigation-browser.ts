import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
import { GET as staffAccessPage } from '../app/staff-access/route';
import { GET as teamPage } from "../app/team-access/route";
// Isolated real handlers and real shell assets; no PIN issuance or remote calls.
const runtime = await lifecycleRuntime({access:"./app/api/access/route",pinMembers:"./app/api/staff-pin/members/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route",store:"./app/api/store/route",storeKey:"./app/api/store/[key]/route",overview:"./app/api/assortment/overview/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", base), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string,string> = {"/api/access":"access","/api/staff-pin/members":"pinMembers","/api/auth/bootstrap":"bootstrap","/api/users/me":"usersMe","/api/restaurants/me":"restaurantMe","/api/venues":"venues","/api/store":"store","/api/assortment/overview":"overview"};
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) for (const item of value) headers.append(name, item);
      else if (value !== undefined) headers.set(name, value);
    }
    headers.set('cf-connecting-ip', '127.0.0.1');
    const request=new Request(url,{method:req.method,headers,...(body.length?{body}:{})});
    if(url.pathname==='/team-access')response=teamPage(request);
    else if(url.pathname==='/staff-access')response=staffAccessPage();
    else if (name) response = await runtime.api[name][req.method || "GET"](request, { params: Promise.resolve({ key }) } as never);
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
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:[...chromiumArgs,"--no-proxy-server","--disable-dev-shm-usage"]});
const out="outputs/staff-pin-navigation";mkdirSync(out,{recursive:true});
try {
 const owner=await runtime.register("navigation-owner@isolated.test");
 runtime.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({name:"Synthetic navigation venue",currency:"MDL",timezone:"UTC"}),owner.userId);
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.goto(base+"/staff-access");
 await page.evaluate(user=>{
  localStorage.setItem("bd_session",user.email);localStorage.setItem("bd_session_token",user.token);localStorage.setItem("bd_active_venue_id",String(user.activeVenueId));
 },owner);
 const teamUrl=base+"/team-access?venue="+owner.activeVenueId;
 await page.goto(teamUrl);
 const frame=page.frameLocator("iframe").first();
 await frame.locator("#access-content").waitFor({state:"visible"});
 const documents:string[]=[];
 page.on("request",request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents.push(request.url());});
 const identity=()=>page.evaluate(()=>["bd_session","bd_session_token","bd_active_venue_id"].map(key=>localStorage.getItem(key)));
 const before=await identity();
 await frame.getByRole("link",{name:"Персональные PIN сотрудников"}).click();
 await page.locator("#create").waitFor({state:"visible",timeout:10000});
 assert.equal(new URL(page.url()).pathname,"/staff-access");assert.equal(new URL(page.url()).searchParams.get("venue"),String(owner.activeVenueId));
 assert.ok(documents.some(url=>new URL(url).pathname==="/staff-access"),"PIN link must request the server document");
 assert.equal(await page.locator("iframe").count(),0);assert.deepEqual(await identity(),before);
 await page.reload();await page.locator("#create").waitFor({state:"visible"});assert.deepEqual(await identity(),before);
 await page.goBack();await frame.locator("#access-content").waitFor({state:"visible"});assert.equal(page.url(),teamUrl);
 await frame.getByRole("link",{name:"Персональные PIN сотрудников"}).click();await page.locator("#create").waitFor({state:"visible"});assert.deepEqual(await identity(),before);
 await page.screenshot({path:out+"/staff-access-390.png",fullPage:true});
 writeFileSync(out+"/result.json",JSON.stringify({status:"PASS",width:390,shell:"real SPA and embedded team page with real local API handlers",checks:["full-document PIN navigation","venue preserved","reload","browser Back","repeat transition","owner session unchanged"],documents:documents.map(url=>new URL(url).pathname+new URL(url).search)},null,2));
 await context.close();console.log("staff PIN real-shell navigation, reload and Back: PASS");
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}
