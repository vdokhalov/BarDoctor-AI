import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { barDoctorResponse } from "../app/bar-doctor-response";
import { GET as cashier } from "../app/cashier/route";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as entryPage } from "../app/sales-entry/route";
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require("./browser-runtime.cjs");
const executablePath=existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")?"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe":await resolveBrowserExecutable(chromium.executablePath());
const browser=await chromium.launch({executablePath,headless:true,args:[...chromiumArgs,"--no-proxy-server"]});
mkdirSync("outputs/pos1-hardening",{recursive:true});
mkdirSync("outputs/sales-ux1",{recursive:true});
const report:unknown[]=[];
try{for(const profile of [{name:"mobile",width:390,height:844},{name:"tablet",width:820,height:1000},{name:"desktop",width:1280,height:800}].filter(p=>!process.env.BD_POS_PROFILE||p.name===process.env.BD_POS_PROFILE)){
  const r=await lifecycleRuntime({overview:"./app/api/assortment/overview/route",events:"./app/api/sales-events/route",documents:"./app/api/sales-batches/route",restaurantMe:"./app/api/restaurants/me/route",store:"./app/api/store/route",storeKey:"./app/api/store/[key]/route",usersMe:"./app/api/users/me/route"});
  const user=await r.register(profile.name+"@pos-hardening.test"),other=await r.register(profile.name+"-other@pos-hardening.test");
  const venue=user.activeVenueId;
  const restaurant={name:"Isolated POS QA",currency:"PMR_RUB"};
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify(restaurant),user.userId);
  const put=(key:string,value:unknown)=>r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,'test') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId,key,JSON.stringify(value));
  const get=(key:string)=>JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(user.userId,key)?.data_json||"null"));
  const structure={sections:[{id:"bar",name:"Бар"},{id:"kitchen",name:"Кухня"},{id:"hookah",name:"Кальянная"}],categories:[{id:"water",name:"Безалкогольные напитки",parentId:"bar"},{id:"food",name:"Продукты",parentId:"kitchen"},{id:"tobacco",name:"Табак",parentId:"hookah"}],subcategories:[{id:"soda",name:"Вода и газировка",parentId:"water"},{id:"bread",name:"Хлеб и выпечка",parentId:"food"},...Array.from({length:12},(_,i)=>({id:"bread-"+i,name:"Очень длинное название подраздела "+i,parentId:"food"}))]};
  const menu=[{id:"water",name:"QA Вода",sectionId:"bar",taxonomyCategoryId:"water",subcategoryId:"soda"},{id:"service",name:"QA Сервис",sectionId:"kitchen",taxonomyCategoryId:"food",subcategoryId:"bread"},{id:"hookah",name:"QA Кальян",sectionId:"hookah",taxonomyCategoryId:"tobacco"},...Array.from({length:14},(_,i)=>({id:"long-"+i,name:"ОченьДлинноеНазваниеБезПробелов".repeat(3)+" "+i,sectionId:i%2?"kitchen":"bar",taxonomyCategoryId:i%2?"food":"water",subcategoryId:i%2?"bread-"+(i%12):"soda"}))].map(item=>({...item,venueId:venue,department:"bar",category:"Без подраздела",type:"service",consumptionMode:"NONE",salePrice:30,currency:"PMR_RUB",active:true}));
  const water=menu.find(item=>item.id==="water")!;
  Object.assign(water,{type:"ready",consumptionMode:"DIRECT_ITEM",readyProduct:{nomenclatureItemId:"water-nom",productKey:"water-stock",packagesPerSale:1}});
  put("bd_assortment_v1",{nomenclatureStructure:structure,menuItems:menu,nomenclature:[{id:"water-nom",productKey:"water-stock",name:"Вода",unit:"pcs",venueId:venue,active:true}],stockBalances:[{productKey:"water-stock",unit:"pcs",current:100,venueId:venue,currency:"PMR_RUB"}]});
  put("bd_stock_movements",[{id:"receipt",type:"receipt",productKey:"water-stock",amount:100,unit:"pcs",costAmount:100,costStatus:"KNOWN",venueId:venue,currency:"PMR_RUB",date:"2026-09-01",sourceDocumentId:"qa-receipt",sourceLineId:"qa-line"}]);
  let failure:"none"|"before"|"after"="none",postCalls=0,lastPost:Record<string,unknown>|undefined;
  const server=createServer(async(req,res)=>{try{
    const url=new URL(req.url||"/","http://localhost");let response:Response;
    if(url.pathname==="/api/sales-events"||url.pathname==="/api/sales-batches"){
      const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
      const request=new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(body.length?{body}:{})});
      const action=body.length?JSON.parse(body.toString()).action:null;
      if(action==="post"){lastPost=JSON.parse(body.toString());postCalls++;if(failure==="before"){failure="none";res.writeHead(200,{"Content-Type":"application/json","Content-Length":"9999"});res.write("{\"ok\":");setTimeout(()=>res.destroy(),30);return;}}
      const api=url.pathname==="/api/sales-events"?r.api.events:r.api.documents;
      response=await (req.method==="POST"?api.POST(request):api.GET(request));
      if(action==="post"&&failure==="after"){failure="none";res.writeHead(201,{"Content-Type":"application/json","Content-Length":"9999"});res.write("{\"ok\":");setTimeout(()=>res.destroy(),30);return;}
    }else if(["/catalog","/warehouse","/finance"].includes(url.pathname))response=barDoctorResponse();
    else if(url.pathname==="/cashier")response=cashier();
    else if(url.pathname==="/sales-entry")response=entryPage();
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname.startsWith("/api/")){const names:Record<string,string>={"/api/assortment/overview":"overview","/api/auth/bootstrap":"bootstrap","/api/users/me":"usersMe","/api/restaurants/me":"restaurantMe","/api/venues":"venues","/api/store":"store"};const key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];const name=key?"storeKey":names[url.pathname.replace(/\/$/,"")];if(name){const parts=[];for await(const part of req)parts.push(Buffer.from(part));const bytes=Buffer.concat(parts);const req2=new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(bytes.length?{body:bytes}:{})});response=await r.api[name][req.method||"GET"](req2,{params:Promise.resolve({key})} as never);}else response=Response.json({ok:false},{status:404});}
    // Only the unrelated venue-switcher transport is omitted; all sales/auth/CAS handlers are real.
    else if(url.pathname==="/venue-switcher.js")response=new Response("",{headers:{"Content-Type":"text/javascript"}});
    else{const root=resolve("public");let file=resolve("public","."+url.pathname);if(!existsSync(file)&&url.pathname.startsWith("/assets/"))file=resolve("dist/client","."+url.pathname);if(!file.startsWith(root+"/")&&!file.startsWith(root+"\\")&&!file.startsWith(resolve("dist/client")+"/")&&!file.startsWith(resolve("dist/client")+"\\"))response=new Response(null,{status:404});else if(existsSync(file))response=new Response(readFileSync(file),{headers:{"Content-Type":({".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml"} as Record<string,string>)[extname(file)]||"application/octet-stream"}});else response=new Response(null,{status:404});}
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error(error);res.writeHead(500);res.end("Isolated test failure");}});
  await new Promise<void>(done=>server.listen(0,"127.0.0.1",done));const base="http://127.0.0.1:"+(server.address() as {port:number}).port;
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height}});const page=await context.newPage();
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(({email,token,venue})=>{if(!localStorage.getItem("bd_session")){localStorage.setItem("bd_session",email);localStorage.setItem("bd_session_token",token);localStorage.setItem("bd_active_venue_id",String(venue));}},{...user,venue});
  const request=(body:unknown)=>{const req=r.request(user,"/api/sales-events","POST",body);req.headers.set("X-Venue-Id",String(venue));return r.api.events.POST(req);};
  try{
    await page.goto(base+"/cashier?venue="+venue);await page.locator("#open-shift").waitFor();assert.match(await page.locator("#shift-message").innerText(),/Открытых смен нет/);
    await page.locator("#shift-name").fill("Night");await page.getByRole("button",{name:"Открыть смену",exact:true}).click();await page.locator("#cashier").waitFor();
    const shiftId=get("bd_finance_revenue")[0].id;
    await page.goto(base+"/sales-import?embedded=1&venue="+venue);await page.getByText("Продаж пока нет",{exact:true}).waitFor();await page.screenshot({path:"outputs/sales-ux1/"+profile.name+"-empty-journal.png",fullPage:true});
    await page.goto(base+"/sales-import?venue="+venue);await page.frameLocator("iframe").getByRole("link",{name:/Открыть кассу|Продолжить заказ/}).first().click();await page.waitForURL("**/cashier?venue="+venue);await page.locator("#cashier").waitFor();
    assert.doesNotMatch(await page.locator("body").innerText(),/SPA 404/);
    for(const [dept,id,category] of [["bar","water","Безалкогольные напитки"],["kitchen","service","Продукты"],["hookah","hookah","Табак"]]){await page.locator('[data-department="'+dept+'"]').click();await page.locator('[data-add="'+id+'"]').waitFor();assert.match(await page.locator("#categories").innerText(),new RegExp(category));await page.locator('[data-category="'+(dept==="bar"?"water":dept==="kitchen"?"food":"tobacco")+'"]').click();}
    assert.equal(await page.locator('[data-department="hookah"]').count(),1);assert.equal(await page.locator('[data-department="hookah"]').innerText(),"Кальянная");
    await page.locator('[data-department="kitchen"]').click();await page.locator('[data-category="food"]').click();await page.locator('[data-subcategory="bread-11"]').scrollIntoViewIfNeeded();const lastSub=await page.locator('[data-subcategory="bread-11"]').boundingBox();assert.ok(lastSub&&lastSub.x>=0&&lastSub.x+lastSub.width<=profile.width&&lastSub.height>=44);await page.locator('[data-subcategory="bread"]').click();assert.equal(await page.locator('.pos-item').count(),1);
    await page.locator('#search').fill('вОдА');await page.locator('[data-add="water"]').waitFor();assert.equal(await page.locator('.pos-item').count(),1);assert.match(await page.locator('[data-add="water"]').innerText(),/Вода и газировка/);
    await page.locator('#search').fill('');assert.equal(await page.locator('[data-subcategory="bread"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.pos-item').count(),1);
    await page.screenshot({path:"outputs/pos1-hardening/"+profile.name+"-taxonomy.png",fullPage:true});
    await page.locator('[data-department="all"]').click();await page.locator("#search").fill("QA Вода");assert.equal(await page.locator(".pos-item").count(),1);await page.locator("#search").fill("");
    await page.locator('[data-add="water"]').dblclick();assert.equal(await page.locator('[data-increase="water"]').locator('..').locator("output").innerText(),"2");
    await page.locator('[data-decrease="water"]').click();await page.locator('[data-add="service"]').click();await page.locator('[data-remove="service"]').click();
    await page.locator("#comment").fill("Не потерять комментарий");await page.locator('[name="payment"][value="CARD_EXTERNAL"]').check();
    await page.reload();await page.locator('[data-remove="water"]').waitFor();assert.equal(await page.locator("#comment").inputValue(),"Не потерять комментарий");assert.equal(await page.locator('[value="CARD_EXTERNAL"]').isChecked(),true);
    await page.goBack();await page.waitForURL("**/sales-import?venue="+venue);await page.goForward();await page.locator('[data-remove="water"]').waitFor();
    await page.goto(base+"/sales-import?venue="+venue);await page.frameLocator("iframe").getByRole("link",{name:/^Продолжить заказ/}).click();await page.locator('[data-remove="water"]').waitFor();
    // Separate tabs share the draft, and another account cannot see it.
    const reopened=await context.newPage();await reopened.goto(base+"/cashier?venue="+venue);await reopened.locator('[data-remove="water"]').waitFor();await reopened.locator('[data-add="service"]').click();await page.bringToFront();await page.locator("#work").waitFor({state:"hidden"});await page.locator("#pay").evaluate((button:HTMLButtonElement)=>button.click());assert.equal(postCalls,0);await reopened.close();await page.reload();await page.locator('[data-remove="service"]').click();
    await page.evaluate(({email,token,venue})=>{localStorage.setItem("bd_session",email);localStorage.setItem("bd_session_token",token);localStorage.setItem("bd_active_venue_id",String(venue));},{...other,venue:other.activeVenueId});
    await page.goto(base+"/cashier?venue="+other.activeVenueId);await page.locator("#open-shift").waitFor();assert.equal(await page.locator(".pos-line").count(),0);
    await page.evaluate(({email,token,venue})=>{localStorage.setItem("bd_session",email);localStorage.setItem("bd_session_token",token);localStorage.setItem("bd_active_venue_id",String(venue));},{...user,venue});await page.goto(base+"/cashier?venue="+venue);await page.locator('[data-remove="water"]').waitFor();
    const additional=await r.api.venues.POST(r.request(user,"/api/venues","POST",{name:"Second QA venue",businessType:"bar",country:"Молдова",city:"Тирасполь",currency:"PMR_RUB"}));assert.equal(additional.status,201);const secondVenue=(await additional.json() as {activeVenueId:number}).activeVenueId;
    await page.goto(base+"/cashier?venue="+secondVenue);await page.locator("#open-shift").waitFor();assert.equal(await page.locator(".pos-line").count(),0);await page.goto(base+"/cashier?venue="+venue);await page.locator('[data-remove="water"]').waitFor();
    // Select a different open shift: its cart is empty. Return to the first draft.
    assert.equal((await request({action:"open_shift",venueId:venue,shiftId:"second",name:"Second"})).status,201);
    await page.evaluate(({account,venue})=>localStorage.removeItem("bd_pos_shift_v1:"+account+":"+venue),{account:user.userId,venue});await page.reload();await page.locator("#shift-picker").selectOption("second");assert.equal(await page.locator(".pos-line").count(),0);
    await page.evaluate(({account,venue})=>localStorage.removeItem("bd_pos_shift_v1:"+account+":"+venue),{account:user.userId,venue});await page.reload();await page.locator("#shift-picker").selectOption(shiftId);await page.locator('[data-remove="water"]').waitFor();
    for(let i=0;i<14;i++)await page.locator('[data-add="long-'+i+'"]').click();
    assert.equal(await page.locator("body").evaluate(node=>node.scrollWidth<=innerWidth+2),true,profile.name+" horizontal overflow");
    await page.screenshot({path:"outputs/pos1-hardening/"+profile.name+"-menu.png",fullPage:true});
    for(const selector of ["#comment",'#payment input[value="CASH"]',"#pay"]){await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();assert.ok(b&&b.x>=0&&b.x+b.width<=profile.width+1&&b.y>=0&&b.y<profile.height,selector+" reachable");}
    await page.screenshot({path:"outputs/pos1-hardening/"+profile.name+"-cart.png"});
    for(let i=0;i<14;i++)await page.locator('[data-remove="long-'+i+'"]').click();
    await context.setOffline(true);await page.locator("#pay").click();await page.locator("#notice").filter({hasText:/Заказ сохранён для безопасного повтора/}).waitFor();assert.equal((get("bd_sales_events_v1")||[]).length,0);
    await context.setOffline(false);await page.reload();await page.locator("#retry").waitFor();assert.equal(await page.locator("#comment").inputValue(),"Не потерять комментарий");await page.locator("#retry").click();await page.locator("#receipt").waitFor();assert.equal(get("bd_sales_events_v1").length,1);assert.equal(get("bd_sales_events_v1")[0].payments[0].method,"CARD_EXTERNAL");
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith("bd_pos_draft_v1:")&&JSON.parse(localStorage.getItem(key)||"{}").lines.length).length),0);
    await page.reload();await page.locator("#cashier").waitFor();assert.equal(await page.locator(".pos-line").count(),0);assert.equal(get("bd_sales_events_v1").length,1);
    await page.locator('[data-add="water"]').click();failure="before";await page.locator('#pay').click();await page.locator('#notice').filter({hasText:/Заказ сохранён для безопасного повтора/}).waitFor();assert.equal(get("bd_sales_events_v1").length,1);assert.equal(get("bd_assortment_v1").stockBalances[0].current,99);
    await page.locator('#retry').click();await page.locator('#receipt').waitFor();assert.equal(get("bd_sales_events_v1").length,2);await page.locator('#new-order').click();await page.locator('#cashier').waitFor();await page.locator('#pay').filter({hasText:'Оплатить'}).waitFor();
    await page.locator('[data-add="service"]').click();await page.locator('[data-add="water"]').click();assert.equal(await page.locator(".pos-line").count(),2,"new order accepts two lines");assert.equal(await page.locator("#pay").isEnabled(),true,"new order payment enabled");failure="after";await page.locator("#pay").evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await page.locator("#notice").filter({hasText:/Заказ сохранён для безопасного повтора/}).waitFor();await page.reload();await page.locator("#receipt").waitFor();assert.equal(get("bd_sales_events_v1").length,3);assert.equal(get("bd_sales_events_v1")[2].payments[0].method,"CASH");assert.equal(postCalls,4,"double click and lost response must not add another app POST");
    assert.equal(get("bd_stock_movements").filter((m:{type:string})=>m.type!=="receipt").length,3,"one stock movement per water sale, none for service");
    assert.equal(get("bd_assortment_v1").stockBalances[0].current,97);
    const before=JSON.stringify(get("bd_stock_movements"));for(const response of await Promise.all([request(lastPost),request(lastPost)])){assert.equal(response.status,200);assert.equal((await response.json() as {duplicate:boolean}).duplicate,true);}
    assert.equal(JSON.stringify(get("bd_stock_movements")),before);assert.equal(get("bd_sales_events_v1").length,3);
    const shift=get("bd_finance_revenue").find((s:{id:string})=>s.id===shiftId);assert.equal(shift.revenue,120);assert.equal(shift.receipts,3);
    assert.equal(get("bd_sales_events_v1")[0].batch.totalTheoreticalCost,1);assert.equal(get("bd_sales_events_v1")[1].batch.totalTheoreticalCost,1);
    const event=get("bd_sales_events_v1")[2];await page.goto(base+"/sales-import?embedded=1&venue="+venue+"&batch="+encodeURIComponent(event.id));await page.locator("#editor-dialog[open]").waitFor();assert.equal(await page.locator(".batch-row").count(),3);assert.match(await page.locator("#editor-body").innerText(),/QA Сервис/);assert.match(await page.locator("#editor-body").innerText(),/30.*руб. ПМР/);assert.equal(await page.locator("#editor-footer button").count(),0);assert.equal(await page.locator(".pos-event-summary strong").evaluate(node=>node.getBoundingClientRect().height < 55),true,"receipt revenue is readable on one line");await page.screenshot({path:"outputs/pos1-hardening/"+profile.name+"-document.png"});
    assert.match(await page.locator('#editor-body').innerText(),/Night/);
    assert.doesNotMatch(await page.locator('.sale-metadata').innerText(),new RegExp(shiftId));
    await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-document.png'});
    const warehouseTarget=await page.locator('.journal-link').getAttribute('href');assert.ok(warehouseTarget?.includes(encodeURIComponent(event.id)));

    await page.locator("#editor-close").click();
    await page.locator('#journal-receipts').filter({hasText:'3'}).waitFor();
    assert.match(await page.locator('#journal-revenue').innerText(),/120/);
    assert.equal(await page.locator('body').evaluate(node=>node.scrollWidth<=innerWidth+2),true);
    await page.locator('.journal-filters details').evaluate((node:HTMLDetailsElement)=>{node.open=false;});await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-journal.png',fullPage:true});
    await page.locator('#journal-query').fill('Сервис');assert.equal(await page.locator('.batch-row').count(),1);
    await page.locator('#journal-query').fill(event.id);assert.equal(await page.locator('.batch-row').count(),1);
    await page.locator('#journal-query').fill('несуществующий товар');await page.getByText('Ничего не найдено',{exact:true}).waitFor();
    await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-empty-search.png',fullPage:true});
    await page.locator('#journal-reset').click();
    await page.locator('.journal-filters summary').click();
    await page.locator('#journal-payment').selectOption('CARD_EXTERNAL');assert.equal(await page.locator('.batch-row').count(),1);
    await page.locator('#journal-reset').click();await page.locator('#journal-source').selectOption('MANUAL');assert.equal(await page.locator('.batch-row').count(),0);
    await page.locator('#journal-reset').click();await page.locator('#journal-status').selectOption('REVERSED');assert.equal(await page.locator('.batch-row').count(),0);
    await page.locator('#journal-reset').click();await page.locator('#journal-shift').selectOption(shiftId);assert.equal(await page.locator('.batch-row').count(),3);
    await page.locator('#journal-actor').selectOption(String(user.userId));assert.equal(await page.locator('.batch-row').count(),3);
    await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-filters.png',fullPage:true});
    await page.locator('#journal-reset').click();
    await page.locator('#journal-from').fill('2099-01-01');assert.equal(await page.locator('.batch-row').count(),0);assert.equal(await page.locator('#journal-receipts').innerText(),'0');await page.locator('#journal-reset').click();
    await page.locator('[data-sales-view=manual]').click();await page.locator('#manual-entry').waitFor();assert.equal(await page.locator('#journal-layout').isVisible(),false);
    await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-manual-entry.png',fullPage:true});
    await page.locator('[data-source=manual]').click();await page.locator('#editor-dialog[open]').waitFor();await page.locator('#editor-close').click();
    await page.locator("[data-sales-view=import]").click();
    await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-import.png',fullPage:true});await page.getByRole("button",{name:"Импортировать продажи",exact:true}).click();await page.locator("#source-dialog[open]").waitFor();assert.equal(await page.locator("body").evaluate(node=>node.scrollWidth<=innerWidth+2),true);await page.locator('[data-source=text]').click();await page.locator('#sales-text').fill('QA Сервис 2');await page.locator('#parse-text').click();await page.locator('#post-batch').waitFor();await page.locator('#post-batch').click();await page.locator('#confirm-action').click();await page.locator('#editor-status').filter({hasText:'Проведено'}).waitFor();assert.equal(get('bd_sales_events_v1').length,3);assert.equal(get('bd_finance_revenue').find((s:{id:string})=>s.id===shiftId).revenue,120);assert.equal(get('bd_stock_movements').filter((m:{type:string})=>m.type!=='receipt').length,3);await page.locator('#editor-close').click();await page.locator('[data-sales-view=journal]').click();assert.equal(await page.locator('.batch-row').count(),4);assert.equal(await page.locator('#journal-receipts').innerText(),'3');await page.locator('.journal-filters details').evaluate((node:HTMLDetailsElement)=>{node.open=false;});await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-journal.png',fullPage:true});
    await page.goto(base+"/sales-entry?venue="+venue+"&event="+encodeURIComponent(event.id));await page.locator("#events").filter({hasText:/QA Сервис/}).waitFor();assert.match(await page.locator("#events").innerText(),/руб. ПМР/);
    await page.goto(base+warehouseTarget+'&venue='+venue);await page.locator('.bd-warehouse-movement-list article').first().waitFor();assert.equal(await page.locator('.bd-warehouse-movement-list article').count(),1,'only this sale movement');await page.locator('.bd-warehouse-movement-list').getByRole('button',{name:'Документ продаж',exact:true}).click();await page.frameLocator('iframe').locator('#editor-dialog[open]').waitFor();assert.match(await page.frameLocator('iframe').locator('#editor-body').innerText(),/QA Сервис/);
    await page.goto(base+'/sales-entry?view=shifts&venue='+venue);await page.locator('.cash-shift').first().waitFor();assert.match(await page.locator('#shifts').innerText(),/Night/);assert.equal(await page.locator('#sale').isVisible(),false);await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-shifts.png',fullPage:true});
    await page.goto(base+'/sales-entry?venue='+venue);await page.locator('#sale').waitFor();assert.equal(await page.locator('#shift-actions').isVisible(),false);assert.equal(await page.locator('#event-actions').isVisible(),false);await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-manual-form.png',fullPage:true});
    await page.goto(base+"/catalog?venue="+venue);await page.locator(".bd-assortment-tabs-v170 button").filter({hasText:/^Меню$/}).click();
    for(const section of ["bar","kitchen","hookah"]){const node=page.locator('[data-assortment-section-id="'+section+'"]');await node.waitFor();const toggle=node.locator('.bd-assortment-section-toggle-v171');if(await toggle.getAttribute('aria-expanded')!=="true")await toggle.click();}
    await page.locator('[data-assortment-section-id="bar"]').getByRole('button',{name:/Безалкогольные напитки/}).click();
    await page.locator('[data-assortment-section-id="kitchen"]').getByRole('button',{name:/Продукты/}).click();
    assert.match(await page.locator('[data-assortment-section-id="bar"]').innerText(),/Вода и газировка/);
    assert.match(await page.locator('[data-assortment-section-id="kitchen"]').innerText(),/Хлеб и выпечка/);
    assert.match(await page.locator('[data-assortment-section-id="hookah"]').innerText(),/Кальянная/);
    assert.equal(await page.locator('body').evaluate(node=>node.scrollWidth<=innerWidth+2),true);
    await page.screenshot({path:"outputs/pos1-hardening/"+profile.name+"-menu-overview.png",fullPage:true});
    await page.route('**/api/sales-batches',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Журнал временно недоступен'})}));await page.goto(base+'/sales-import?embedded=1&venue='+venue);await page.locator('#notice').filter({hasText:'Журнал временно недоступен'}).waitFor();await page.screenshot({path:'outputs/sales-ux1/'+profile.name+'-error.png',fullPage:true});await page.unroute('**/api/sales-batches');await page.locator('#refresh').click();await page.locator('.batch-row').first().waitFor();assert.equal(get('bd_sales_events_v1').length,3);
    assert.deepEqual(errors,[]);report.push({profile:profile.name,viewport:profile.width,events:3,revenue:120,stockMovements:3,stockBefore:100,stockAfter:97,beforePostFailure:true,lostResponseReconciled:true,duplicateStableId:true,globalSearch:true,subcategoryRestore:true,postCalls,draftReload:true,accountIsolation:true,venueIsolation:true,shiftIsolation:true,crossTabConflict:true,navigation:true,retry:true,document:true,journalFilters:true,importPosted:true,warehouseRoundTrip:true,errorRecovery:true});
  }catch(error){console.error({profile:profile.name,errors,url:page.url(),notice:await page.locator("#notice").textContent().catch(()=>""),postCalls,events:(get("bd_sales_events_v1")||[]).length});await page.screenshot({path:"outputs/pos1-hardening/failure.png"}).catch(()=>{});throw error;}finally{await context.close();await new Promise<void>(done=>server.close(()=>done()));r.close();}
}}finally{await browser.close();}
writeFileSync("outputs/pos1-hardening/results.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
