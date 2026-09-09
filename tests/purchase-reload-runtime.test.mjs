import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";

test("purchase direct load and reload never throw observer lifecycle errors", {timeout:120000}, async()=>{
  const require=createRequire(import.meta.url);
  const {chromium}=require("playwright-core");
  const {resolveBrowserExecutable,chromiumArgs}=require("../scripts/browser-runtime.cjs");
  const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(process.env.BD_QA_BROWSER||chromium.executablePath()),args:chromiumArgs,headless:true});
  try{for(const viewport of [{width:390,height:844},{width:1280,height:720}]){
    for(const entry of ["/suppliers?create=1&venue=901"]){
      const context=await browser.newContext({viewport});
      try{
        const errors=[];let documents=0;
        await context.addInitScript(()=>{
          localStorage.setItem("bd_session","test@example.invalid");
          localStorage.setItem("bd_session_token","isolated-test-token");
          localStorage.setItem("bd_session_userid","901");
          localStorage.setItem("bd_active_venue_id","901");
          localStorage.setItem("bd_active_role","owner");
          localStorage.setItem("bd_venue_context__test@example.invalid",JSON.stringify({venues:[{id:901,name:"Test venue",status:"active",hasProfile:true}]}));
        });
        await context.route("**/*",async route=>{
          const url=new URL(route.request().url());
          assert.equal(url.origin,"http://offline.test","no production requests");
          if(route.request().resourceType()==="document")documents++;
          if(url.pathname.startsWith("/api/")){
            let body={ok:true};
            if(url.pathname==="/api/auth/bootstrap"){
              await new Promise(resolve=>setTimeout(resolve,1000));
              body={ok:true,email:"test@example.invalid",token:"isolated-test-token",userId:901,role:"owner",permissions:["finance.view"],activeVenueId:901,venues:[{id:901,workspaceId:"isolated",name:"Test venue",role:"owner",status:"active",isPrimary:true}],bootstrap:{state:"ready",reason:"active_venue_ready"}};
            }else if(url.pathname==="/api/restaurants/me")body={ok:true,restaurant:{id:"isolated",name:"Test venue",businessType:"Бар",currency:"RUB"}};
            else if(url.pathname==="/api/store")body={ok:true,entries:{}};
            else if(url.pathname.startsWith("/api/store/"))body={ok:true,data:[]};
            else if(url.pathname==="/api/business-health")body={ok:true,snapshot:null,state:"insufficient_data"};
            return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(body)});
          }
          const file=/\.[a-z0-9]+$/i.test(url.pathname)?"public"+url.pathname:"public/app.html";
          assert.ok(!file.includes(".."));
          return route.fulfill({body:readFileSync(new URL("../"+file,import.meta.url)),contentType:file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":file.endsWith(".html")?"text/html":"application/octet-stream"});
        });
        const page=await context.newPage();page.on("pageerror",e=>errors.push(e.stack||e.message));
        await page.goto("http://offline.test"+entry,{waitUntil:"domcontentloaded"});
        for(let attempt=0;attempt<3;attempt++){
          if(attempt>0)await page.getByRole('button',{name:/^Добавить покупку/}).click();
          try{await page.getByRole('heading',{name:'Как внести данные?',exact:true}).waitFor({state:'visible',timeout:15000});}
          catch(error){console.error(JSON.stringify({errors,attempt,...await page.evaluate(()=>({path:location.href,text:document.getElementById('root')?.textContent?.slice(0,500)}))}));throw error;}
          await page.getByRole('button',{name:'Вручную Без чека и накладной',exact:true}).click();
          await page.getByRole('button',{name:'Не сохранять',exact:true}).click();
          assert.equal(await page.getByRole('heading',{name:'Проверка прихода',exact:true}).count(),0);
          await page.waitForTimeout(1000);
          assert.deepEqual(errors,[]);
          if(attempt<2)await page.reload({waitUntil:'domcontentloaded'});
        }
        assert.equal(documents,3);
        assert.equal(await page.evaluate(()=>localStorage.getItem("bd_active_venue_id")),"901");
        assert.deepEqual(errors,[]);
      }finally{await context.close();}
    }
  }}finally{await browser.close();}
});
