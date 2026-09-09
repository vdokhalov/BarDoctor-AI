import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { chromium } from "playwright-core";
import { openingRuntime } from "../tests/helpers/opening-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import * as sales from "../lib/bardoctor/sales-events";
import { canonicalUserShellAssets } from "../lib/bardoctor/app-shell";
const require = createRequire(import.meta.url);
const { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const source=readFileSync(new URL("../app/sales-entry/route.ts",import.meta.url),"utf8");
const compiled=stripTypeScriptTypes(source.replace(/^import[^\n]+\n/gm,"")).replace("export function GET","function GET");
const render=new Function("canonicalUserShellAssets",compiled+";return GET;")(canonicalUserShellAssets) as ()=>Response;
const bundle=readFileSync(new URL("../public/assets/index-BQGspy0I.js",import.meta.url),"utf8");
const bridge=bundle.slice(bundle.indexOf("const bdEmbeddedPagePaths="),bundle.indexOf("function bdEmbeddedPage({"));
assert.ok(bridge.includes("function bdPrepareEmbeddedPage"));
const importSource=readFileSync(new URL("../app/sales-import/route.ts",import.meta.url),"utf8");
const entryLink=importSource.match(/<a href="\/sales-entry">[^<]+<\/a>/)?.[0];
assert.ok(entryLink,"use the actual production sales link");
const assets=new Set(["/sales-entry.js","/inventory-onboarding.css","/venue-switcher.css","/venue-switcher.js","/app-shell-v185.css","/navigation-contract-v247.js","/app-shell-v185.js","/navigation-transient-v247.js","/catalog-accounting-v207.js"]);
const executablePath=await resolveBrowserExecutable(chromium.executablePath());
const browser=await chromium.launch({executablePath,headless:true,args:process.platform==="win32"?[]:chromiumArgs});
try {
  for(const viewport of [{width:390,height:844},{width:1280,height:720}]) {
    const runtime=openingRuntime(new URL("../app/api/sales-events/route.ts",import.meta.url),sales);
    runtime.put("bd_assortment_v1",salesEventFixture().assortment);
    const errors:string[]=[];
    let losePostResponse=false;
    const server=createServer(async(req,res)=>{
      try {
        const path=req.url?.split("?")[0];let response:Response;
        if(path==="/api/sales-events") {
          const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
          const request=new Request("http://127.0.0.1"+path,{method:req.method,headers:{"Content-Type":"application/json","X-Venue-Id":String(req.headers["x-venue-id"]||1)},...(body.length?{body}:{})});
          response=await(req.method==="POST"?runtime.api.POST(request):runtime.api.GET(request));
          if(losePostResponse&&req.method==="POST"&&JSON.parse(body.toString()).action==="post"&&response.status===201){
            losePostResponse=false;response=Response.json({ok:false,error:"Ответ подтверждения потерян. Повторите запрос."},{status:503});
          }
        } else if(path&&assets.has(path))response=new Response(readFileSync(new URL("../public"+path,import.meta.url)),{headers:{"Content-Type":path.endsWith("js")?"application/javascript":"text/css"}});
        else if(path==="/favicon.ico")response=new Response(null,{status:204});
        else if(path==="/sales-entry")response=render();
        else if(path==="/sales-import")response=new Response(`<!doctype html><html><body>${entryLink}</body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8"}});
        else if(path==="/embedded-host")response=new Response(`<!doctype html><html><body><iframe src="/sales-import?embedded=1" onload="bdPrepareEmbeddedPage(event,function(){document.body.textContent='SPA 404';})"></iframe><script>${bridge}</script></body></html>`,{headers:{"Content-Type":"text/html"}});
        else if(path==="/embedded-shell-v269.css")response=new Response(readFileSync(new URL("../public/embedded-shell-v269.css",import.meta.url)),{headers:{"Content-Type":"text/css"}});
        else if(path==="/home")response=new Response('<!doctype html><html><body><a href="/sales-entry">Sales entry</a></body></html>',{headers:{"Content-Type":"text/html"}});
        else response=new Response("Not found",{status:404});
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
      }catch(error){errors.push(String(error));res.writeHead(500);res.end("QA failure");}
    });
    await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
    const address=server.address();assert.ok(address&&typeof address!=="string");
    const context=await browser.newContext({viewport});const page=await context.newPage();
    page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
    try {
      await page.addInitScript(()=>{if(!localStorage.getItem("bd_active_venue_id"))localStorage.setItem("bd_active_venue_id","1");});
      await page.goto(`http://127.0.0.1:${address.port}/embedded-host?venue=1`);
      await page.frameLocator("iframe").getByRole("link",{name:"Ввести продажу с выручкой и складским расходом"}).click();
      await page.waitForURL(url=>url.pathname==="/sales-entry"&&url.searchParams.get("venue")==="1");
      assert.equal(new URL(page.url()).searchParams.has("embedded"),false);
      await page.locator("#work:not([hidden])").waitFor();
      await page.selectOption("[data-menu]","whisky");await page.fill("[data-quantity]","2");
      await page.getByRole("button",{name:"Проверить продажу",exact:true}).click();
      await page.locator("#preview:not([hidden])").waitFor();
      assert.match(await page.locator("#quote").innerText(),/0\.1 l/);
      assert.match(await page.locator("#quote").innerText(),/Стоимость неизвестна/);
      await page.screenshot({path:join(tmpdir(),`bardoctor-sales-${viewport.width}.png`),fullPage:true});
      await page.click("#discard");assert.equal(runtime.batches(),0);
      await page.getByRole("button",{name:"Проверить продажу",exact:true}).click();
      await page.locator("#preview:not([hidden])").waitFor();losePostResponse=true;await page.click("#post");
      await page.waitForFunction(()=>document.getElementById("notice")?.textContent?.includes("Ответ подтверждения потерян"));
      assert.equal(runtime.batches(),1);
      await page.reload();await page.getByRole("button",{name:"Проверить результат продажи"}).waitFor();await page.click("#post");
      await page.waitForFunction(()=>document.getElementById("notice")?.textContent?.includes("Повторного списания нет"));
      assert.equal(runtime.batches(),1);
      assert.equal((runtime.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[1].current,1.9);
      await page.reload();await page.locator("#work:not([hidden])").waitFor();
      await page.locator("#events > details > summary").first().click();
      await page.getByText("Вернуть всю продажу",{exact:true}).click();
      await page.getByRole("button",{name:"Подтвердить полный возврат"}).click();
      await page.waitForFunction(()=>document.getElementById("notice")?.textContent==="Продажа возвращена полностью.");
      assert.equal((runtime.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[1].current,2);
      assert.equal((runtime.get("bd_finance_revenue") as {revenue:number}[])[0].revenue,0);
      await page.fill("#shift-name","Day");await page.getByRole("button",{name:"Открыть смену",exact:true}).click();
      await page.waitForFunction(()=>document.getElementById("notice")?.textContent==="Смена открыта.");
      await page.locator("#shifts summary").first().click();await page.getByRole("button",{name:"Подтвердить закрытие смены"}).click();
      await page.waitForFunction(()=>document.getElementById("notice")?.textContent==="Смена закрыта.");
      assert.match(await page.locator("#shifts").innerText(),/Закрыта/);
      const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,body:document.body.scrollWidth,overflow:getComputedStyle(document.body).overflow}));
      assert.ok(layout.width<=viewport.width&&layout.body<=viewport.width,JSON.stringify(layout));assert.notEqual(layout.overflow,"hidden");
      const writes=runtime.batches();
      // The real switcher owns this navigation. Observe it before dispatching
      // storage; a second reload races location.replace in Chromium on CI.
      const [,frozen]=await Promise.all([
        page.waitForURL(url=>url.pathname==="/home"&&url.searchParams.get("venue")==="2"),
        page.evaluate(()=>{
          localStorage.setItem("bd_active_venue_id","2");
          window.dispatchEvent(new StorageEvent("storage",{key:"bd_active_venue_id",newValue:"2"}));
          return document.getElementById("work")?.hidden;
        }),
      ]);
      assert.equal(frozen,true);assert.equal(runtime.batches(),writes);
      await page.getByRole("link",{name:"Sales entry",exact:true}).click();
      await page.locator("#work:not([hidden])").waitFor();assert.match(await page.locator("#events").innerText(),/Продаж ещё нет/);
      assert.equal(await page.locator("[data-menu] option").count(),1,"foreign menu must not leak");
      assert.equal(runtime.batches(),writes,"venue transition must not write stock or revenue");
      assert.equal(errors.filter(e=>/503/.test(e)).length,1,"one deliberately lost success response");
      assert.deepEqual(errors.filter(e=>!/503/.test(e)),[]);
      console.log(`Phase 5 sales ${viewport.width}x${viewport.height}: HTTP/SQLite units/cancel/post/lost-response/reload/retry/reverse/shifts/venue PASS`);
    }finally{await context.close();await new Promise<void>(resolve=>server.close(()=>resolve()));runtime.close();}
  }
}finally{await browser.close();}
