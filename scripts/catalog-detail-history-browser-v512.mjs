import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
const require=createRequire(import.meta.url),runtime=require('./browser-runtime.cjs');
process.env.BD_QA_EXPORT_ONLY='1';
const root=path.resolve('public');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(pathname.includes('.')?pathname:'/app.html'));
 if(!file.startsWith(root+'/')||!fs.existsSync(file)){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
process.env.BD_QA_BASE_URL=base;
const qa=require('./menu-consumption-browser-qa-v418.cjs');
const engine=process.env.BD_QA_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,executablePath:process.env.BD_QA_BROWSER||await runtime.resolveBrowserExecutable(engine.executablePath())});
const results=[];
const list='/catalog?venue=801&tab=recipes',card=list+'&itemId=menu-espresso-801';
const detailSelector='.bd-assortment-sheet-v170.detail',editorSelector='.bd-tech-card-editor-v354';
try {
 for(const scenario of ['ordinary','direct','external-history','reload','repeated-close','forward','venue-change','editor-cancel','escape','native-back']) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await qa.configureContext(context,qa.createMutableState(),base);
  const page=await context.newPage(),writes=[];
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/store/')&&request.method()!=='GET')writes.push(request.method())});
  const detail=page.locator(detailSelector),editor=page.locator(editorSelector);
  const at=async route=>{await page.waitForURL(base+route);await page.waitForTimeout(100);assert.equal(new URL(page.url()).pathname+new URL(page.url()).search,route)};
  const ready=async()=>{await page.waitForFunction(()=>typeof window.bdNavigate==='function');};
  const open=async()=>{await page.locator('.bd-assortment-recipe-card-v170').filter({hasText:'Espresso'}).click();await detail.waitFor();await at(card)};
  const close=async()=>{await detail.getByRole('button',{name:'Закрыть',exact:true}).click();await detail.waitFor({state:'hidden'});await at(list)};
  try {
   if(scenario==='direct'||scenario==='external-history') {
    if(scenario==='external-history'){await page.goto(base+'/outside.html').catch(()=>{});await page.evaluate(()=>history.replaceState(null,'','/foreign-entry'));}
    await page.goto(base+card);await detail.waitFor();
    if(scenario==='external-history')await page.evaluate(()=>history.replaceState({...history.state,bdPreviousUrl:'https://outside.test/',bdPreviousEntryId:'foreign'},'',location.href));
    await close();assert.equal(new URL(page.url()).origin,base);assert.equal(await editor.count(),0);
   } else {
    await page.goto(base+'/more?venue=801');await ready();await page.evaluate(route=>window.bdNavigate(route),list);
    await page.locator('.bd-assortment-recipe-card-v170').filter({hasText:'Espresso'}).waitFor();await open();
    if(scenario==='reload'){await page.reload({waitUntil:'domcontentloaded'});await detail.waitFor();}
    if(scenario==='repeated-close'){
     await detail.getByRole('button',{name:'Закрыть',exact:true}).evaluate(button=>{button.click();button.click()});await detail.waitFor({state:'hidden'});await at(list);
    } else if(scenario==='forward') {
     await close();await page.goForward();await detail.waitFor();await at(card);await close();
    } else if(scenario==='venue-change') {
     await page.evaluate(()=>{localStorage.setItem('bd_active_venue_id','802');window.dispatchEvent(new Event('bd:venue-changed'))});
     await page.waitForTimeout(200);
     assert.equal(await page.evaluate(()=>history.state.bdPreviousEntryId),'');
     if(await detail.isVisible())await detail.getByRole('button',{name:'Закрыть',exact:true}).click();
     assert.equal(new URL(page.url()).origin,base);assert.notEqual(new URL(page.url()).pathname,'/more');
    } else if(scenario==='editor-cancel') {
     await detail.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await editor.waitFor();
     const input=editor.getByLabel('Количество на порцию').first();const original=await input.inputValue();await input.fill('13');
     page.once('dialog',dialog=>dialog.dismiss());await editor.getByRole('button',{name:'Отмена',exact:true}).filter({visible:true}).click();assert.equal(await editor.isVisible(),true);assert.equal(await input.inputValue(),'13');
     page.once('dialog',dialog=>dialog.accept());await editor.getByRole('button',{name:'Отмена',exact:true}).filter({visible:true}).click();await editor.waitFor({state:'hidden'});await at(card);
     await detail.getByRole('button',{name:'Редактировать техкарту',exact:true}).click();await editor.waitFor();assert.equal(await editor.getByLabel('Количество на порцию').first().inputValue(),original);
     await editor.getByLabel('Количество на порцию').first().fill('14');
     page.once('dialog',dialog=>dialog.dismiss());await page.goBack();await page.waitForTimeout(150);assert.equal(await editor.isVisible(),true);assert.equal(await editor.getByLabel('Количество на порцию').first().inputValue(),'14');
     page.once('dialog',dialog=>dialog.accept());await page.goBack();await editor.waitFor({state:'hidden'});await at(card);await close();
    } else if(scenario==='escape') {
     await page.keyboard.press('Escape');await detail.waitFor({state:'hidden'});await at(list);
    } else if(scenario==='native-back') {
     await page.goBack();await detail.waitFor({state:'hidden'});await at(list);
    } else await close();
    if(scenario!=='venue-change') {await page.getByRole('button',{name:'Вернуться назад',exact:true}).click();await at('/more?venue=801');}
   }
   assert.deepEqual(writes,[]);results.push({scenario,engine:process.env.BD_QA_ENGINE||'chromium',pass:true,url:new URL(page.url()).pathname+new URL(page.url()).search});
  } catch(error) {console.error('Scenario failed:',scenario,page.url());throw error}
  finally {await context.close()}
 }
 console.log(JSON.stringify(results));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
