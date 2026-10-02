import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {restrictedManagerRuntime} from './qa/restricted-manager-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const root=resolve(process.env.BD_QA_SOURCE_ROOT||'.'),label=process.env.BD_QA_LABEL||'current',mode=process.env.BD_QA_MODE||'diagnose';
const out=resolve(process.env.BD_QA_OUT||'outputs/restricted-manager-403',label);mkdirSync(out,{recursive:true});
const r=await restrictedManagerRuntime(root),browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:chromiumArgs});
const results=[];
async function login(page,user){await page.goto(r.base+'/login');await page.locator('input[type=email]').fill(user.email);await page.locator('input[type=password]').fill('Isolated-Test-Password-123!');await page.getByRole('button',{name:'Войти',exact:true}).click();await page.waitForURL('**/home*');await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-bd-startup-pending'));}
try{
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390});const page=await context.newPage(),pageErrors=[],networkErrors=[],consoleErrors=[],rejections=[],handledLater=[];await page.exposeBinding('__qaRejection',({frame},event)=>{(event.kind==='unhandled'?rejections:handledLater).push({...event,url:frame.url()});});
  page.on('pageerror',error=>pageErrors.push({message:error.message,stack:error.stack}));page.on('requestfailed',req=>networkErrors.push({path:new URL(req.url()).pathname,error:req.failure()?.errorText}));page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});
  await context.addInitScript(()=>{window.__qaUnhandled=[];window.__qaHandled=[];window.addEventListener('rejectionhandled',event=>{const data={kind:'handled',message:event.reason?.message??String(event.reason),at:performance.now()};window.__qaHandled.push(data);window.__qaRejection(data);});window.addEventListener('unhandledrejection',event=>{const data={kind:'unhandled',message:event.reason?.message??String(event.reason),stack:event.reason?.stack,at:performance.now()};window.__qaUnhandled.push(data);window.__qaRejection(data);});});
  const begin=r.network.length;await login(page,r.manager);await page.waitForTimeout(2000);await page.reload();await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-bd-startup-pending'));await page.waitForTimeout(2000);
  const state=await page.evaluate(()=>({unhandled:window.__qaUnhandled,handledLater:window.__qaHandled,venueId:localStorage.getItem('bd_active_venue_id'),auth:window.__bdAuthBootstrapV274,body:document.body.innerText,root:document.querySelector('#root')?.children.length}));
  const requests=r.network.slice(begin),denied=requests.filter(req=>req.path==='/api/store/bd_finance_expenses'&&req.status===403);assert.ok(denied.length);for(const deniedRow of denied){assert.equal(deniedRow.body.code,'ACCESS_DENIED');assert.ok(!deniedRow.body.data);assert.ok(!JSON.stringify(deniedRow.body).includes('FINANCE PRIVATE SENTINEL'));}
  assert.equal(Number(state.venueId),r.venueId);assert.equal(state.auth.state,'ready');assert.ok(!state.body.includes('FINANCE PRIVATE SENTINEL'));assert.ok(!state.body.includes('98765'));
  if(mode==='diagnose'){assert.ok(pageErrors.some(e=>e.message==='GET /api/store/bd_finance_expenses failed'));assert.ok(rejections.some(e=>e.message==='GET /api/store/bd_finance_expenses failed'));}
  else{assert.deepEqual(pageErrors,[]);assert.deepEqual(rejections,[]);}
  // Authorized navigation must remain usable despite the denied warm source.
  await page.goto(r.base+'/sales-import?venue='+r.venueId);await page.frameLocator('iframe[title="Продажи и склад"]').locator('#journal-count').filter({hasText:'документов'}).waitFor();
  const row={label,mode,width,deniedFinance:denied,bootstrap:state.auth,navigationToSales:'PASS',pageErrors,networkErrors,consoleErrors,unhandled:rejections,handledLater,homeText:state.body,requests};results.push(row);await page.screenshot({path:out+'/sales-'+width+'.png',fullPage:true});writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({label,width,finance403:denied.length,pageErrors:pageErrors.map(e=>e.message),unhandled:rejections.map(e=>e.message),bootstrap:state.auth.state,navigation:'PASS'}));await context.close();
 }
}finally{await browser.close();await r.close();}
