import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium, type Route} from 'playwright-core';
import {storeRuntime} from '../tests/helpers/store-runtime';
process.env.BD_QA_EXPORT_ONLY='1';
const publicRoot=path.resolve('public');
const frontend=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url||'/', 'http://127.0.0.1').pathname);
 const file=path.resolve(publicRoot,'.'+(pathname.includes('.')?pathname:'/app.html'));
 if(!file.startsWith(publicRoot+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
 const mime:Record<string,string>={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise<void>(resolve=>frontend.listen(0,'127.0.0.1',resolve));
process.env.BD_QA_BASE_URL='http://127.0.0.1:'+(frontend.address() as {port:number}).port;
const qa=await import('./menu-consumption-browser-qa-v418.cjs');
const output=path.resolve('outputs/general-tech-card-v440');fs.mkdirSync(output,{recursive:true});
const server=await qa.startQaServer();
const browserRuntime=await import('./browser-runtime.cjs');
const browserPath=process.env.BD_QA_BROWSER||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':await browserRuntime.resolveBrowserExecutable(chromium.executablePath()));
const browser=await chromium.launch({executablePath:browserPath,headless:true});
const results=[];
try{
 for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:412,height:915}]){
  const state=qa.createMutableState();
  const fixture=qa.catalogFor(state);
  const template=fixture.nomenclature.find((row:{id:string})=>row.id==='nom-coffee-801');
  const target={...template,id:'nom-volk-qa',nomenclatureItemId:'nom-volk-qa',key:'stock:volk:qa',productKey:'stock:volk:qa',name:'Водка Volk QA',unit:'ml',baseUnit:'ml',packageSize:'1 л',current:1000,quantity:1000};
  const wrong={...target,id:'nom-other-vodka-qa',nomenclatureItemId:'nom-other-vodka-qa',key:'stock:other-vodka:qa',productKey:'stock:other-vodka:qa',name:'Другая водка QA'};
  fixture.nomenclature.push(target,wrong);fixture.stockBalances.push({...target},{...wrong});
  const menuCopy={...fixture.menuItems.find((row:{id:string})=>row.id==='menu-espresso-801'),id:'menu-volk-qa',name:'Водка Volk 0,04л. · QA',subcategoryId:''};
  const recipeCopy={...fixture.recipes[0],id:'recipe-volk-qa',menuItemId:menuCopy.id,ownerId:menuCopy.id,ingredients:[{...fixture.recipes[0].ingredients[0],id:'line-volk-qa',name:'Volk',quantity:0.04,unit:'л',normalizedQuantity:40,normalizedUnit:'ml',matchedBaseUnit:'ml',nomenclatureItemId:target.id,productKey:wrong.key,purchaseProductKey:wrong.key}]};
  fixture.menuItems.push(menuCopy);fixture.recipes.push(recipeCopy);
  const runtimes=new Map();
  for(const [venueId,stores] of state.stores){const runtime=await storeRuntime(venueId);for(const [key,data]of stores)runtime.seed(key,data);runtimes.set(venueId,runtime)}
  let requestCount=0,writeCount=0;
  const api=http.createServer(async(req,res)=>{try{
   const runtime=runtimes.get(Number(req.headers['x-venue-id']));
   if(!runtime){res.writeHead(403);res.end(JSON.stringify({ok:false}));return}
   const url=new URL(req.url||'/', 'http://127.0.0.1');let reply;
   if(url.pathname==='/api/nomenclature/taxonomy')reply=await runtime.taxonomyGet();
   else {const key=decodeURIComponent(url.pathname.slice('/api/store/'.length));if(req.method==='GET')reply=await runtime.get(key);else{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString());reply=await runtime.put(key,body.data,body.reason||'QA editor save',body.baseData);writeCount++}}
   requestCount++;res.writeHead(reply.status,{'Content-Type':'application/json'});res.end(JSON.stringify(reply.body));
  }catch(error){res.writeHead(500);res.end(JSON.stringify({ok:false,error:String(error)}))}});
  await new Promise<void>(resolve=>api.listen(0,'127.0.0.1',resolve));
  const address=api.address() as {port:number};
  const context=await browser.newContext({viewport,isMobile:viewport.width<600,hasTouch:viewport.width<600,locale:'ru-RU'});
  await qa.configureContext(context,state,server.baseUrl);
  let failTaxonomy=false;
  await context.route('**/api/**',async(route:Route)=>{
   const request=route.request(),url=new URL(request.url());
   if(url.pathname!=='/api/nomenclature/taxonomy'&&!url.pathname.startsWith('/api/store/'))return route.fallback();
   if(failTaxonomy&&url.pathname==='/api/nomenclature/taxonomy'){failTaxonomy=false;return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'})}
   const headers=await request.allHeaders();
   const response=await fetch('http://127.0.0.1:'+address.port+url.pathname,{method:request.method(),headers:{'X-Venue-Id':headers['x-venue-id']||'801','Content-Type':'application/json'},...(request.method()==='GET'?{}:{body:request.postData()})});
   const body=await response.text();
   if(response.ok&&url.pathname.startsWith('/api/store/')){const stores=state.stores.get(Number(headers['x-venue-id']||801));assert.ok(stores,'authorized QA venue store');stores.set(decodeURIComponent(url.pathname.slice('/api/store/'.length)),JSON.parse(body).data);}
   return route.fulfill({status:response.status,contentType:'application/json',body});
  });
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',(error:Error)=>errors.push(error.message));
  try{
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');
   const beforeWrites=writeCount;
   await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();
   const recipe=page.locator('.bd-tech-card-editor-v354');await recipe.waitFor();
   assert.equal(writeCount,beforeWrites,'opening must not write');
   await page.screenshot({path:path.join(output,viewport.width+'-recipe.png')});
   const quantity=recipe.getByLabel('Количество на порцию').first();
   await quantity.fill('9');
   if(viewport.width<600){
    await page.setViewportSize({width:viewport.width,height:430});await quantity.focus();
    await page.waitForTimeout(250);
    const field=await quantity.boundingBox();assert.ok(field&&field.y>=60&&field.y+field.height<=430,'active quantity remains editable in reduced viewport');
    await page.screenshot({path:path.join(output,viewport.width+'-recipe-reduced-viewport.png')});
    await page.setViewportSize(viewport);
   }
   await recipe.getByRole('button',{name:'Сохранить',exact:true}).filter({visible:true}).click();
   await recipe.waitFor({state:'hidden'});
   const recipeRead=await runtimes.get(801).get('bd_assortment_v1');
   assert.equal(recipeRead.body.data.recipes.find((row:{id:string})=>row.id==='recipe-espresso-801').ingredients[0].quantity,9);
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');
   await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await recipe.waitFor();
   assert.equal(await quantity.inputValue(),'9');
   await quantity.fill('11');
   page.once('dialog',dialog=>dialog.dismiss());
   await recipe.getByRole('button',{name:'Отмена',exact:true}).filter({visible:true}).click();
   assert.equal(await quantity.inputValue(),'11');
   page.once('dialog',dialog=>dialog.accept());
   await recipe.getByRole('button',{name:'Отмена',exact:true}).filter({visible:true}).click();
   assert.equal((await runtimes.get(801).get('bd_assortment_v1')).body.data.recipes.find((row:{id:string})=>row.id==='recipe-espresso-801').ingredients[0].quantity,9);
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');
   failTaxonomy=true;const editor=await qa.openMenuEditor(page);
   await editor.getByRole('button',{name:'Повторить загрузку'}).waitFor();
   const name=editor.locator('input').first();await name.fill('Espresso QA saved '+viewport.width);
   await page.screenshot({path:path.join(output,viewport.width+'-menu-error.png')});
   await editor.getByRole('button',{name:'Повторить загрузку'}).click();
   await editor.locator('.bd-tax-selectors-v336').waitFor();
   assert.equal(await name.inputValue(),'Espresso QA saved '+viewport.width);
   const selectors=editor.locator('.bd-tax-selectors-v336 select');
   assert.equal(await selectors.nth(0).inputValue(),'stock-bar');assert.equal(await selectors.nth(1).inputValue(),'drinks');
   await page.screenshot({path:path.join(output,viewport.width+'-menu.png')});
   await editor.getByRole('button',{name:'Сохранить',exact:true}).filter({visible:true}).click();
   await editor.waitFor({state:'hidden'});
   const read=await runtimes.get(801).get('bd_assortment_v1');
   const item=read.body.data.menuItems.find((row:{id:string})=>row.id==='menu-espresso-801');
   assert.equal(item.name,'Espresso QA saved '+viewport.width);assert.equal(item.taxonomyCategoryId,'drinks');
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');
   const reopened=await qa.openMenuEditor(page);
   assert.equal(await reopened.locator('input').first().inputValue(),'Espresso QA saved '+viewport.width);
   await reopened.locator('input').first().fill('Unsaved transition');
   page.once('dialog',dialog=>dialog.dismiss());
   await reopened.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();
   assert.equal(await reopened.isVisible(),true);
   page.once('dialog',dialog=>dialog.accept());
   await reopened.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();
   await recipe.waitFor();assert.equal(await reopened.count(),0);
   assert.equal((await runtimes.get(801).get('bd_assortment_v1')).body.data.menuItems.find((row:{id:string})=>row.id==='menu-espresso-801').name,'Espresso QA saved '+viewport.width);
   await recipe.getByRole('button',{name:'Отмена',exact:true}).filter({visible:true}).click();
   await qa.openItem(page,server.baseUrl,'menu','menu-volk-qa');
   await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await recipe.waitFor();
   await recipe.getByText('ID и складской ключ ингредиента указывают на разные товары.',{exact:false}).waitFor();
   await page.screenshot({path:path.join(output,viewport.width+'-conflict.png')});
   await recipe.locator('button').filter({hasText:/Изменить товар|Найти в номенклатуре/}).first().click();
   await recipe.getByLabel('Поиск по всей номенклатуре').fill('Водка Volk QA');
   await recipe.locator('.bd-tech-card-groups-v375 button').filter({hasText:'Водка Volk QA'}).click();
   await recipe.getByRole('button',{name:'Сохранить',exact:true}).filter({visible:true}).click();await recipe.waitFor({state:'hidden'});
   const repaired=(await runtimes.get(801).get('bd_assortment_v1')).body.data.recipes.find((row:{id:string})=>row.id==='recipe-volk-qa');
   assert.equal(repaired.ingredients[0].nomenclatureItemId,target.id);assert.equal(repaired.ingredients[0].productKey,target.key);assert.equal(repaired.ingredients[0].purchaseProductKey,target.key);
   await qa.openItem(page,server.baseUrl,'menu','menu-volk-qa');await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await recipe.waitFor();
   assert.equal(await recipe.getByLabel('Количество на порцию').first().inputValue(),'0.04');
   await page.screenshot({path:path.join(output,viewport.width+'-conflict-repaired.png')});
   assert.deepEqual(errors,[]);
   results.push({viewport,requestCount,writeCount,menuSaved:true,taxonomyRetry:true,recipeOpenWithoutWrite:true,recipeSaveReopen:true,unsavedCancel:true,menuTransition:true,conflictRepairReopen:true,physicalDevice:false,keyboard:viewport.width<600?'reduced viewport only':'not tested'});
  }catch(error){await page.screenshot({path:path.join(output,viewport.width+'-failure.png')});throw error}
  finally{await context.close();await new Promise<void>(resolve=>api.close(()=>resolve()));for(const runtime of runtimes.values())runtime.close()}
 }
 fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();await server.stop();await new Promise<void>(resolve=>frontend.close(()=>resolve()))}
