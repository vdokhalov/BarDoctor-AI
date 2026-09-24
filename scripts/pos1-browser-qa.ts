import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { openingRuntime } from "../tests/helpers/opening-runtime";
import * as sales from "../lib/bardoctor/sales-events";
import { GET as cashierPage } from "../app/cashier/route";
const require=createRequire(import.meta.url);
const {resolveBrowserExecutable,chromiumArgs}=require("./browser-runtime.cjs");
const fixture=openingRuntime(new URL("../app/api/sales-events/route.ts",import.meta.url),sales);
fixture.setCurrency("PMR_RUB");
fixture.put("bd_assortment_v1",{
  menuItems:[
    {id:"vodka40",name:"TEST VODKA 40",venueId:1,active:true,department:"bar",category:"Vodka",type:"composite",consumptionMode:"RECIPE",salePrice:30,currency:"PMR_RUB"},
    {id:"ticket",name:"Тестовая услуга",venueId:1,active:true,department:"other",category:"Услуги",type:"service",consumptionMode:"NONE",salePrice:5,currency:"PMR_RUB"}],
  nomenclature:[{id:"vodka",productKey:"vodka-stock",name:"TEST VODKA",unit:"l",venueId:1,active:true}],
  stockBalances:[{productKey:"vodka-stock",name:"TEST VODKA",unit:"l",current:1,venueId:1,currency:"PMR_RUB"}],
  recipes:[{id:"vodka-recipe",menuItemId:"vodka40",ownerId:"vodka40",venueId:1,version:1,current:true,status:"confirmed",reviewStatus:"approved",ingredients:[{id:"vodka-line",nomenclatureItemId:"vodka",purchaseProductKey:"vodka-stock",name:"TEST VODKA",quantity:0.04,unit:"l",normalizedQuantity:0.04,normalizedUnit:"l",venueId:1}]}]
});
fixture.put("bd_stock_movements",[{id:"vodka-receipt",type:"receipt",venueId:1,productKey:"vodka-stock",productName:"TEST VODKA",amount:1,unit:"l",costAmount:300,costStatus:"KNOWN",currency:"PMR_RUB",date:"2026-09-01",sourceDocumentId:"confirmed-purchase",sourceLineId:"line",createdAt:"2026-09-01T10:00:00Z"}]);
let dropNextPost=false;
const server=createServer(async (req,res)=>{
  try{
    const url=new URL(req.url||"/","http://127.0.0.1");
    if(url.pathname==="/cashier"){
      const response=cashierPage();res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    if(url.pathname==="/api/sales-events"){
      const parts=[];for await(const part of req)parts.push(part);
      const input=Buffer.concat(parts);
      const request=new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(["GET","HEAD"].includes(req.method||"GET")?{}:{body:input})});
      const response=req.method==="POST"?await fixture.api.POST(request):await fixture.api.GET(request);
      if(dropNextPost && req.method==="POST" && JSON.parse(input.toString("utf8")).action==="post"){dropNextPost=false;res.destroy();return;}
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    // The tested cashier route uses the real HTML/CSS/JS. Ancillary app-shell scripts are unrelated to POS.
    if(url.pathname==="/venue-switcher.js"||url.pathname.endsWith("app-shell.js")){res.writeHead(200,{"Content-Type":"text/javascript"});res.end("");return;}
    const path=resolve("public","."+url.pathname);const root=resolve("public");
    if(!path.startsWith(root+"\\")&&!path.startsWith(root+"/")){res.writeHead(404);res.end();return;}
    if(!existsSync(path)){res.writeHead(404);res.end();return;}
    const mime={".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png"} as Record<string,string>;
    res.writeHead(200,{"Content-Type":mime[extname(path)]||"application/octet-stream"});res.end(readFileSync(path));
  }catch(error){console.error(error);res.writeHead(500);res.end("server error");}
});
await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const winChrome="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
let browser;
try{
  const executablePath=existsSync(winChrome)?winChrome:await resolveBrowserExecutable(chromium.executablePath());
  browser=await chromium.launch({executablePath,headless:true,args:[...chromiumArgs,"--no-proxy-server","--disable-dev-shm-usage"]});
  mkdirSync("outputs/pos1",{recursive:true});
  for(const profile of [{name:"desktop",width:1280,height:800},{name:"mobile-390",width:390,height:844},{name:"tablet",width:820,height:1000}]){
    if(profile.name==="tablet"){
      const response=await fixture.api.POST(new Request("http://localhost/api/sales-events",{method:"POST",headers:{"Content-Type":"application/json","X-Venue-Id":"1"},body:JSON.stringify({venueId:1,action:"open_shift",shiftId:"second-shift",name:"SECOND SHIFT"})}));
      assert.equal(response.status,201);
    }
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height}});
    await context.addInitScript(()=>{localStorage.setItem("bd_session","pos1@isolated.test");localStorage.setItem("bd_session_token","test-session");localStorage.setItem("bd_active_venue_id","1");});
    const page=await context.newPage();
    const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
    await page.goto(base+"/cashier",{waitUntil:"networkidle"});
    if(await page.locator("#open-shift").isVisible()){await page.locator("#shift-name").fill("TEST SHIFT");await page.getByRole("button",{name:"Открыть смену"}).click();}
    if(profile.name==="tablet"){
      await page.locator("#shift-picker-label").waitFor();
      await page.locator("#shift-picker").selectOption((await page.locator("#shift-picker option").nth(1).getAttribute("value")) || "");
    }
    await page.locator('[data-add="vodka40"]').waitFor();
    await page.screenshot({path:`outputs/pos1/${profile.name}-cashier.png`,fullPage:true});
    assert.equal(await page.locator("body").evaluate(node=>node.scrollWidth<=window.innerWidth+2),true,`${profile.name}: no horizontal overflow`);
    assert.deepEqual(errors,[],`${profile.name}: no JavaScript errors`);
    if(profile.name==="mobile-390"){
      await page.locator("#search").fill("TEST VODKA");assert.equal(await page.locator(".pos-item").count(),1);await page.locator("#search").fill("");
      await page.locator("[data-department=bar]").click();assert.equal(await page.locator(".pos-item").count(),1);await page.locator("[data-department=all]").click();
      await page.locator('[data-add="vodka40"]').click();
      await page.locator('[data-add="vodka40"]').click();
      assert.match(await page.locator("#cart-lines").innerText(),/× 2/);
      await page.getByRole("button",{name:"Уменьшить TEST VODKA 40"}).click();
      assert.match(await page.locator("#cart-lines").innerText(),/× 1/);
      await page.getByRole("button",{name:"Убрать TEST VODKA 40"}).click();
      assert.match(await page.locator("#cart-lines").innerText(),/Нажмите на позицию/);
      await page.locator('[data-add="vodka40"]').click();
      assert.match(await page.locator("#total").innerText(),/30,00/);
      await page.screenshot({path:"outputs/pos1/mobile-390-order.png",fullPage:true});
      await page.getByRole("button",{name:"Оплатить"}).click();
      await page.getByRole("heading",{name:"Продажа проведена"}).waitFor();
      await page.screenshot({path:"outputs/pos1/mobile-390-receipt.png",fullPage:true});
      await page.reload({waitUntil:"networkidle"});
      const result=await page.evaluate(async()=>{const response=await fetch("/api/sales-events",{headers:{"X-Venue-Id":"1"}});return response.json();}) as {events:sales.SalesEvent[];shifts:{id:string}[]};
      assert.equal(result.events.length,1);assert.equal(result.events[0].revenue,30);assert.equal(result.events[0].batch.totalTheoreticalCost,12);assert.equal(result.events[0].shiftId,result.shifts[0].id);
      assert.equal((fixture.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[0].current,0.96);
      assert.equal((fixture.get("bd_finance_revenue") as {revenue:number}[])[0].revenue,30);
    }
    if(profile.name==="tablet"){
      await page.locator('[data-add="ticket"]').click();
      await page.locator('input[name="payment"][value="CARD_EXTERNAL"]').check();
      await page.screenshot({path:"outputs/pos1/tablet-card-order.png",fullPage:true});
      await page.getByRole("button",{name:"Оплатить"}).click();
      await page.getByRole("heading",{name:"Продажа проведена"}).waitFor();
      const reread=await page.evaluate(async()=>{const response=await fetch("/api/sales-events",{headers:{"X-Venue-Id":"1"}});return response.json();}) as {events:sales.SalesEvent[]};
      assert.equal(reread.events.length,2);assert.equal(reread.events[0].payments?.[0].method,"CARD_EXTERNAL");
      assert.equal((fixture.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[0].current,0.96);
      await page.locator("#new-order").click();await page.locator('[data-add="ticket"]').waitFor();
      await page.locator('[data-add="ticket"]').click();dropNextPost=true;
      await page.getByRole("button",{name:"Оплатить"}).click();
      await page.locator("#notice").filter({hasText:/Продажа уже проведена|Заказ сохранён для безопасного повтора/}).waitFor();
      await page.reload({waitUntil:"networkidle"});
      const afterLoss=await page.evaluate(async()=>{const response=await fetch("/api/sales-events",{headers:{"X-Venue-Id":"1"}});return response.json();}) as {events:sales.SalesEvent[]};
      assert.equal(afterLoss.events.length,3,"lost response must not duplicate sale");
      assert.equal((fixture.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[0].current,0.96);
    }
    await context.close();
  }
  console.log("POS-1 browser QA: desktop 1280, mobile 390, tablet 820 PASS; screenshots outputs/pos1");
}finally{await browser?.close();await new Promise<void>(resolve=>server.close(()=>resolve()));fixture.close();}
