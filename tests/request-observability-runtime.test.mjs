import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

// No production bindings, credentials, network, cron or data. Real route handlers,
// Drizzle, RPC D1 and AsyncLocalStorage must work together, not mocked bootstrap.
test("observability survives real Worker/D1 concurrent bootstrap, store and selector", {timeout:120000}, async () => {
  const entry = `
    import {POST} from './app/api/auth/bootstrap/route';
    import {GET as store} from './app/api/store/route';
    import {GET as selector} from './app/api/tech-cards/nomenclature/route';
    import {observeRequest} from './lib/bardoctor/request-observability';
    const events=[]; console.info=(line)=>events.push(JSON.parse(line));
    export default {fetch(request){
      const path=new URL(request.url).pathname;
      if(path==='/__test_events')return Response.json(events);
      return observeRequest(request,()=>path==='/api/auth/bootstrap'?POST(request):path==='/api/store'?store(request):selector(request));
    }};`;
  const bundle = await build({stdin:{contents:entry,loader:"ts",resolveDir:process.cwd()},
    absWorkingDir:process.cwd(), tsconfigRaw:{}, bundle:true,write:false,format:"esm",platform:"neutral",
    conditions:["workerd","worker","browser"],external:["cloudflare:workers","node:*"]});
  let outbound=0;
  const mf = new Miniflare({modules:true,script:bundle.outputFiles[0].text,
    compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:{DB:"observability-test"},
    outboundService:()=>{outbound++;return new Response("forbidden",{status:502});}});
  try {
    console.info("observability QA: isolated Worker setup");
    const db=await mf.getD1Database("DB");
    for(const name of ["0000_skinny_nightshade","0008_misty_gorilla_man","0010_furry_squadron_sinister","0014_graceful_caretaker","0024_add_user_avatar"]){
      for(const sql of readFileSync(`drizzle/${name}.sql`,"utf8").split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean)) await db.prepare(sql).run();
    }
    await db.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,restaurant_json) VALUES(1,'private@example.invalid','private@example.invalid',?)").bind('{"name":"Private venue"}').run();
    await db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Private venue',1)").run();
    await db.prepare("INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES(1,1,1,1)").run();
    const token="private-test-token";
    await db.prepare("INSERT INTO sessions(token_hash,account_id,active_venue_id,expires_at) VALUES(?,1,1,?)")
      .bind(createHash("sha256").update(token).digest("hex"),new Date(Date.now()+3600000).toISOString()).run();
    const fixture=JSON.parse(readFileSync("tests/fixtures/purchase-stock-other-production.json","utf8"));
    const assortment=JSON.stringify({nomenclature:[fixture],stockBalances:[]});
    await db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES(1,'bd_assortment_v1',?)").bind(assortment).run();
    const routes=["/api/auth/bootstrap","/api/store","/api/tech-cards/nomenclature"];
    const correlations=[];
    for(let wave=0;wave<3;wave++) await Promise.all(Array.from({length:6},async(_,i)=>{
      const id=crypto.randomUUID();correlations.push(id);const path=routes[i%3];
      const response=await mf.dispatchFetch(`http://localhost${path}`,{method:path.endsWith("bootstrap")?"POST":"GET",
        headers:{"x-session-email":"private@example.invalid","x-session-token":token,"x-venue-id":"1","X-BD-Correlation-Id":id},signal:AbortSignal.timeout(30000)});
      assert.equal(response.status,200);assert.equal(response.headers.get("X-BD-Correlation-Id"),id);
      const body=await response.json();assert.equal(body.ok,true);
      if(path.endsWith("nomenclature")){assert.equal(body.items[0].key,fixture.key);assert.equal(body.items[0].purchaseCategory,"products");}
    }));
    const events=await (await mf.dispatchFetch("http://localhost/__test_events")).json();
    for(const id of correlations){
      const rows=events.filter(e=>e.correlationId===id);
      assert.equal(rows[0].event,"request.start");assert.equal(rows.at(-1).event,"request.end");
      assert.equal(new Set(rows.map(e=>e.requestId)).size,1);
      assert.ok(rows.some(e=>e.stage?.startsWith("d1.")&&e.event==="await.end"));
      const starts=rows.filter(e=>e.event==="await.start");
      for(const start of starts)assert.equal(rows.filter(e=>e.event==="await.end"&&e.span===start.span).length,1);
    }
    for(const stage of ["auth.schema","auth.identity","auth.result","store.load","selector.load","d1.batch","d1.raw"])assert.ok(events.some(e=>e.stage===stage),stage);
    assert.doesNotMatch(JSON.stringify(events),/private|Спрайт|stock:|token_hash|SELECT |INSERT |cookie/i);
    assert.equal((await db.prepare("SELECT data_json FROM domain_data WHERE account_id=1 AND store_key='bd_assortment_v1'").first()).data_json,assortment);
    assert.equal(outbound,0);
    console.info("observability QA: real auth/D1 fan-out and privacy assertions PASS");
    // Desktop and mobile execute exactly the shipped browser wrapper against real Worker auth.
    if(process.env.BD_OBSERVABILITY_BROWSER_QA==="1"){
      const require=createRequire(import.meta.url);
      const {chromium}=require("playwright-core");
      const {chromiumArgs,resolveBrowserExecutable}=require("../scripts/browser-runtime.cjs");
      const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
      try{for(const viewport of [{width:390,height:844},{width:1280,height:720}]){
        console.info(`observability QA: browser ${viewport.width}x${viewport.height}`);
        const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];const clientEvents=[];
        page.on("pageerror",e=>errors.push(e.message));
        page.on("console",message=>{if(message.type()==="info"){try{clientEvents.push(JSON.parse(message.text()));}catch{/* unrelated browser output */}}});
        await page.route("**/*",async route=>{
          const req=route.request();const url=new URL(req.url());
          if(url.pathname==="/")return route.fulfill({contentType:"text/html",body:"<!doctype html><title>Isolated observability QA</title>"});
          assert.equal(url.origin,"http://localhost");
          const response=await mf.dispatchFetch("http://localhost"+url.pathname,{method:req.method(),headers:req.headers()});
          await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
        });
        await page.goto("http://localhost/");await page.addScriptTag({content:readFileSync("public/bd-request-observability.js","utf8")});
        const result=await page.evaluate(async()=>{const response=await fetch("/api/auth/bootstrap",{method:"POST",headers:{"x-session-email":"private@example.invalid","x-session-token":"private-test-token"}});return{status:response.status,id:response.headers.get("X-BD-Correlation-Id"),body:await response.json()};});
        assert.equal(result.status,200);assert.equal(result.body.ok,true);assert.ok(result.id);assert.deepEqual(errors,[]);
        assert.ok(clientEvents.some(e=>e.event==="client.request.start"&&e.correlationId===result.id));
        assert.ok(clientEvents.some(e=>e.event==="client.request.end"&&e.correlationId===result.id&&e.requestId));
        await context.close();
      }}finally{await browser.close();}
    }
  } finally {await mf.dispose();}
});
