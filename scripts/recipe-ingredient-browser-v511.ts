import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium, type Route} from 'playwright-core';
import browserRuntime from './browser-runtime.cjs';
import {storeRuntime} from '../tests/helpers/store-runtime';
process.env.BD_QA_EXPORT_ONLY='1';
const publicRoot=path.resolve('public');
const frontend=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url||'/', 'http://127.0.0.1').pathname);
 if(process.env.BD_QA_CLIENT_BASELINE&&/^\/assets\/index-BQGspy0I.*\.js$/.test(pathname)){
  res.writeHead(200,{'Content-Type':'text/javascript'});fs.createReadStream(process.env.BD_QA_CLIENT_BASELINE).pipe(res);return;
 }
 const file=path.resolve(publicRoot,'.'+(pathname.includes('.')?pathname:'/app.html'));
 if(!file.startsWith(publicRoot+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
 const mime:Record<string,string>={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise<void>(resolve=>frontend.listen(0,'127.0.0.1',resolve));
process.env.BD_QA_BASE_URL='http://127.0.0.1:'+(frontend.address() as {port:number}).port;
const qaModule=await import('./menu-consumption-browser-qa-v418.cjs');
const qa=qaModule.default || qaModule;
const output=path.resolve(process.env.BD_QA_CLIENT_BASELINE?'outputs/general-tech-card-v441-baseline':'outputs/recipe-ingredient-v511');fs.mkdirSync(output,{recursive:true});
const server=await qa.startQaServer();
assert.equal(typeof browserRuntime.resolveBrowserExecutable,'function');
const browserPath=process.env.BD_QA_BROWSER||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':await browserRuntime.resolveBrowserExecutable(chromium.executablePath()));
const browser=await chromium.launch({executablePath:browserPath,headless:true});
const results=[];
try{
 for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:412,height:915}].filter(v=>!process.env.BD_RECIPE_QA_WIDTH||v.width===Number(process.env.BD_RECIPE_QA_WIDTH))){
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
  for(const [venueId,stores] of state.stores){const assortment=stores.get('bd_assortment_v1');assert.ok(assortment,'QA canonical menu fixture');const runtime=await storeRuntime(venueId, assortment.menuItems[0].currency);for(const [key,data]of stores)runtime.seed(key,data);runtimes.set(venueId,runtime)}
  let requestCount=0,writeCount=0;
  const api=http.createServer(async(req,res)=>{try{
   const runtime=runtimes.get(Number(req.headers['x-venue-id']));
   if(!runtime){res.writeHead(403);res.end(JSON.stringify({ok:false}));return}
   const url=new URL(req.url||'/', 'http://127.0.0.1');let reply;
   if(url.pathname==='/api/menu/ingestion'){const chunks=[];for await(const chunk of req)chunks.push(chunk);reply=await runtime.ingestion(JSON.parse(Buffer.concat(chunks).toString()));if(reply.body.data)writeCount++;if(reply.status>=400)console.log(JSON.stringify({status:reply.status,code:reply.body.code,issues:(reply.body.preview as {diff:{issues:string[]}[]})?.diff.map(row=>row.issues)}))}
   else if(url.pathname==='/api/nomenclature/taxonomy')reply=await runtime.taxonomyGet();
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
   if(url.pathname!=='/api/menu/ingestion'&&url.pathname!=='/api/nomenclature/taxonomy'&&!url.pathname.startsWith('/api/store/'))return route.fallback();
   if(failTaxonomy&&url.pathname==='/api/nomenclature/taxonomy'){failTaxonomy=false;return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'})}
   const headers=await request.allHeaders();
   const response=await fetch('http://127.0.0.1:'+address.port+url.pathname,{method:request.method(),headers:{'X-Venue-Id':headers['x-venue-id']||'801','Content-Type':'application/json'},...(request.method()==='GET'?{}:{body:request.postData()})});
   const body=await response.text();
   if(response.ok&&(url.pathname.startsWith('/api/store/')||url.pathname==='/api/menu/ingestion'&&JSON.parse(body).data)){const stores=state.stores.get(Number(headers['x-venue-id']||801));assert.ok(stores,'authorized QA venue store');stores.set(url.pathname==='/api/menu/ingestion'?'bd_assortment_v1':decodeURIComponent(url.pathname.slice('/api/store/'.length)),JSON.parse(body).data);}
   return route.fulfill({status:response.status,contentType:'application/json',body});
  });
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',(error:Error)=>errors.push(error.message));
  try{
   const bootstrapPromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/auth/bootstrap').then(response=>response.json());
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');
   const bootstrap=await bootstrapPromise;
   const beforeWrites=writeCount;
   await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();
   const recipe=page.locator('.bd-tech-card-editor-v354');await recipe.waitFor();
   assert.equal(writeCount,beforeWrites);
   assert.equal(await recipe.getByLabel('Название',{exact:true}).count(),0,'no second mandatory ingredient-name field');
   await recipe.getByRole('button',{name:'+ Добавить ингредиент',exact:true}).click();
   const row=recipe.locator('.bd-catalog-ingredient').last();
   await row.getByLabel('Поиск по всей номенклатуре').fill('Водка Volk QA');
   await page.screenshot({path:path.join(output,viewport.width+'-single-search.png')});
   await row.locator('.bd-tech-card-groups-v375 button').filter({hasText:'Водка Volk QA'}).click();
   assert.equal(await row.getByLabel('Единица',{exact:true}).inputValue(),'мл');
   await row.getByLabel('Количество на порцию').fill('40');
   await row.locator('summary').filter({hasText:'Другое название в рецепте'}).click();
   await row.getByLabel('Название в рецепте',{exact:true}).fill('Особое название QA');
   await page.screenshot({path:path.join(output,viewport.width+'-selected-alias.png')});
   await recipe.getByRole('button',{name:'Сохранить',exact:true}).filter({visible:true}).click();await recipe.waitFor({state:'hidden'});
   let saved=(await runtimes.get(801).get('bd_assortment_v1')).body.data.recipes.find((r:{id:string})=>r.id==='recipe-espresso-801');
   const added=saved.ingredients.find((r:{name:string})=>r.name==='Особое название QA');assert.ok(added);assert.equal(added.nomenclatureItemId,target.id);assert.equal(added.purchaseProductKey,target.key);assert.equal(added.productKey,target.key);assert.equal(added.quantity,40);
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await recipe.waitFor();
   const reopened=recipe.locator('.bd-catalog-ingredient').last();
   assert.match(await reopened.innerText(),/Особое название QA/);
   await reopened.locator('.bd-recipe-selected-v511').click();
   await reopened.getByLabel('Поиск по всей номенклатуре').fill('Coffee beans');
   await reopened.locator('.bd-tech-card-groups-v375 button').filter({hasText:'Coffee beans'}).click();
   assert.equal(await reopened.getByLabel('Количество на порцию').inputValue(),'40');
   assert.equal(await reopened.getByLabel('Единица',{exact:true}).inputValue(),'мл');
   assert.equal(await recipe.locator('.bd-explicit-save-v438:visible').isDisabled(),true);
   await reopened.getByText('Уточните количество и единицу',{exact:true}).waitFor();
   await page.screenshot({path:path.join(output,viewport.width+'-incompatible-unit.png')});
   // A draft remains possible with an explicit unit-review state; confirmation does not.
   if(viewport.width<600){await recipe.getByRole('button',{name:'Дополнительные действия'}).click();await recipe.getByRole('menuitem',{name:'Сохранить черновик'}).click();}
   else await recipe.getByRole('button',{name:'Сохранить черновик',exact:true}).click();
   await recipe.waitFor({state:'hidden'});
   saved=(await runtimes.get(801).get('bd_assortment_v1')).body.data.recipes.find((r:{id:string})=>r.id==='recipe-espresso-801');
   assert.equal(saved.status,'draft');assert.equal(saved.ingredients.at(-1).name,'Coffee beans');assert.equal(saved.ingredients.at(-1).unit,'мл');
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await recipe.waitFor();
   await recipe.locator('.bd-catalog-ingredient').last().getByLabel('Единица',{exact:true}).selectOption('г');
   assert.equal(await recipe.locator('.bd-explicit-save-v438:visible').isDisabled(),false);
   assert.equal(await recipe.getByText('Техкарта готова к подтверждению',{exact:true}).count(),0);
   await page.screenshot({path:path.join(output,viewport.width+'-unit-resolved.png')});
   page.once('dialog',dialog=>dialog.dismiss());await recipe.getByRole('button',{name:'Отмена',exact:true}).filter({visible:true}).click();assert.equal(await recipe.isVisible(),true);
   page.once('dialog',dialog=>dialog.accept());await recipe.getByRole('button',{name:'Отмена',exact:true}).filter({visible:true}).click();await recipe.waitFor({state:'hidden'});
   assert.equal((await runtimes.get(801).get('bd_assortment_v1')).body.data.recipes.find((r:{id:string})=>r.id==='recipe-espresso-801').ingredients.at(-1).unit,'мл');
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await recipe.waitFor();
   await recipe.getByLabel('Количество на порцию').first().fill('13');
   page.once('dialog',dialog=>dialog.dismiss());await page.goBack();await recipe.waitFor();assert.equal(await recipe.getByLabel('Количество на порцию').first().inputValue(),'13');
   page.once('dialog',dialog=>dialog.accept());await page.goBack();await recipe.waitFor({state:'hidden'});
   await page.locator('.bd-assortment-sheet-v170.detail').waitFor({state:'visible'});
   assert.equal(new URL(page.url()).searchParams.get('itemId'),'menu-espresso-801','back restores the originating menu item');
   // The unchanged nested quick-create UI is exercised with a synthetic lookup response.
   // Recipe persistence above uses the actual store/ingestion handlers and SQLite.
   await context.route('**/api/nomenclature/quick-create?*',async route=>{
    const taxonomy=await runtimes.get(801).taxonomyGet();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,venueId:801,taxonomy:taxonomy.body.taxonomy,matches:[target],purchaseSources:[]})});
   });
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await recipe.waitFor();
   await recipe.getByRole('button',{name:'+ Добавить ингредиент',exact:true}).click();
   const missing=recipe.locator('.bd-catalog-ingredient').last();await missing.getByLabel('Поиск по всей номенклатуре').fill('Неизвестный ингредиент QA');
   await missing.getByRole('button',{name:/Создать новую позицию/}).click();
   const quick=page.getByRole('dialog',{name:'Быстрое создание номенклатуры'});await quick.waitFor();
   assert.equal(await recipe.isVisible(),true,'quick-create retains recipe context');
   await page.screenshot({path:path.join(output,viewport.width+'-quick-create-dedupe.png')});
   page.once('dialog',dialog=>dialog.accept());await page.goBack();await quick.waitFor({state:'hidden'});assert.equal(await recipe.isVisible(),true);assert.equal(await recipe.getAttribute('data-bd-unsaved-changes'),'true','nested cancel preserves dirty parent recipe');
   await missing.getByRole('button',{name:/Создать новую позицию/}).click();await quick.waitFor();
   await quick.getByRole('button',{name:/Водка Volk QA.*Использовать/}).click();await quick.waitFor({state:'hidden'});
   assert.match(await missing.locator('.bd-recipe-selected-v511').innerText(),/Водка Volk QA/);
   page.once('dialog',dialog=>dialog.accept());await recipe.getByRole('button',{name:'Отмена',exact:true}).filter({visible:true}).click();await recipe.waitFor({state:'hidden'});
   const readonlyPermissions=['inventory.view'];
   await context.route('**/api/auth/bootstrap',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...bootstrap,role:'shift_manager',permissions:readonlyPermissions,venues:bootstrap.venues.map((v:Record<string,unknown>)=>({...v,role:'shift_manager',permissions:readonlyPermissions}))})}));
   await context.route('**/api/access/active-venue',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,activeVenueId:801,role:'shift_manager',permissions:readonlyPermissions})}));
   await context.addInitScript(()=>{localStorage.setItem('bd_active_role','shift_manager');localStorage.setItem('bd_active_permissions',JSON.stringify(['inventory.view']));});
   await qa.openItem(page,server.baseUrl,'menu','menu-espresso-801');
   assert.equal(await page.getByRole('button',{name:'Редактировать техкарту',exact:true}).count(),0,'read-only inventory role cannot open the editor');
   assert.equal(await recipe.count(),0);
   assert.deepEqual(errors,[]);
   results.push({viewport,requestCount,writeCount,oneSearch:true,atomicSelectionAndAlias:true,newRowBaseUnit:true,incompatibleQuantityPreserved:true,draftDistinctFromConfirmation:true,saveReopen:true,unsavedCancel:true,quickCreateDedupeContext:true,readOnlyRoleHidden:true,backRestoresContext:true,physicalDevice:false});
  }catch(error){await page.screenshot({path:path.join(output,viewport.width+'-failure.png'),timeout:5000}).catch(()=>{});throw error}
  finally{await context.close();await new Promise<void>(resolve=>api.close(()=>resolve()));for(const runtime of runtimes.values())runtime.close()}
 }
 fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();await server.stop();await new Promise<void>(resolve=>frontend.close(()=>resolve()))}
