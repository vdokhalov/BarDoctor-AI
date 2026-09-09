import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";

// Real shipped HTML, bootstrap, module and CSS; no production host or data.
// API denial is deliberate: a fresh embedded context must expose login, not Home.
test("fresh mobile and desktop contexts expose interactive login after SPA startup", {timeout:120000}, async()=>{
  const require=createRequire(import.meta.url);
  const {chromium}=require("playwright-core");
  const {resolveBrowserExecutable,chromiumArgs}=require("../scripts/browser-runtime.cjs");
  const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(process.env.BD_QA_BROWSER||chromium.executablePath()),args:chromiumArgs,headless:true});
  try{for(const viewport of [{width:390,height:844},{width:1280,height:720}]){
    for(const entry of ["/","/home"]){
      const context=await browser.newContext({viewport});
      try{
        const errors=[],requests=[];
        await context.route("**/*",async route=>{
          const url=new URL(route.request().url());
          assert.equal(url.origin,"http://offline.test","no external network allowed");
          if(url.pathname.startsWith("/api/")){
            requests.push(url.pathname);
            return route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({ok:false,needsLogin:true})});
          }
          const file=/\.[a-z0-9]+$/i.test(url.pathname)?"public"+url.pathname:"public/app.html";
          assert.ok(!file.includes(".."));
          const body=readFileSync(new URL("../"+file,import.meta.url));
          return route.fulfill({body,contentType:file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":file.endsWith(".html")?"text/html":"application/octet-stream"});
        });
        const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
        await page.goto("http://offline.test"+entry,{waitUntil:"domcontentloaded"});
        await page.waitForURL("**/login",{timeout:10000});
        const email=page.locator('input[type="email"]');
        // click is intentionally required: visibility alone passes behind the overlay.
        await email.click({timeout:5000});
        await email.fill("anonymous-test@example.invalid");
        assert.equal(await email.inputValue(),"anonymous-test@example.invalid");
        assert.equal(await page.locator('[data-bd-static-startup="v201"]').count(),0);
        assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute("data-bd-startup-pending")),false);
        assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflow),"hidden");
        assert.equal(await page.locator('[data-bd-home-page]').count(),0,"anonymous user must not enter Home");
        assert.equal(await page.evaluate(()=>localStorage.getItem("bd_session_token")),null);
        assert.ok(requests.includes("/api/auth/bootstrap"));
        assert.deepEqual(errors,[]);
      }finally{await context.close();}
    }
  }}finally{await browser.close();}
});
