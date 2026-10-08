import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium',out='outputs/health-doctor-performance/legacy-'+engine;mkdirSync(out,{recursive:true});
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:['--no-sandbox']});
const results=[];
try{for(const width of [390,820,1280]){
 const r=await recoveryRuntime(),context=await browser.newContext({viewport:{width,height:900}});
 await context.addInitScript({content:'globalThis.__name=fn=>fn;'});
 await context.addInitScript(({user,venue})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.fixture.user,venue:r.fixture.venueId});
 let mode='normal',delay=0;const calls=[],errors=[],timings=[];
 await context.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;
  if(['/api/business-health','/api/business-health/verify','/api/ai/curated'].includes(path)){calls.push(path);
   if(path==='/api/business-health/verify'){
    if(mode==='error')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Isolated verification failure'})});
    if(mode==='stalled')return;
    if(delay)await new Promise(done=>setTimeout(done,delay));
   }
  }await route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const attempt of ['first','repeat']){const started=Date.now(),from=calls.length;await page.goto(r.base+'/health');await page.locator('.bd-health-detail-score-v332').waitFor();await page.waitForLoadState('networkidle');timings.push({surface:'health',attempt,visibleMs:Date.now()-started,healthReads:calls.slice(from).filter(p=>p==='/api/business-health').length});}
  await page.goto(r.base+'/analysis');await page.getByRole('button',{name:'Запустить диагностику',exact:true}).waitFor();await page.waitForLoadState('networkidle');assert.equal(calls.filter(p=>p==='/api/ai/curated').length,0);assert.equal(await page.locator('[data-curated-question]').count(),0);
  // Independent correction verification survives the removed priority queue.
  const id='health:'+r.fixture.venueId+':day:2026-10-02';
  await page.goto(r.base+'/health?venueId='+r.fixture.venueId+'&checkedAction='+encodeURIComponent(id));
  const verification=page.getByRole('region',{name:'Результат проверки исправления'});
  await page.locator('[data-management-verification]').waitFor();await page.waitForLoadState('networkidle');assert.equal(await page.locator('.bd-management-queue').count(),0);
  delay=600;const from=calls.length,slowRead=page.waitForRequest(req=>new URL(req.url()).pathname==='/api/business-health/verify');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));const initialSlowRequest=await slowRead;
  const reread=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/business-health/verify'&&res.request()!==initialSlowRequest);
  await page.evaluate(()=>{for(let n=0;n<35;n++)window.dispatchEvent(new Event('bd:store-updated'));window.dispatchEvent(new Event('focus'));});await reread;await page.waitForLoadState('networkidle');
  assert.equal(calls.slice(from).filter(p=>p==='/api/business-health/verify').length,2,'Burst notifications coalesce to initial and one post-write read');
  // WebKit can report networkidle before the JSON consumer finishes. Focus is
  // deliberately ignored during an active read; a new data-update intent must
  // survive it. Observe the injected response rather than infer a scheduler state.
  delay=0;mode='error';const failedRead=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/business-health/verify'&&res.status()===503);
  await page.evaluate(()=>window.dispatchEvent(new Event('bd:store-updated')));await failedRead;await verification.getByRole('alert').waitFor();
  mode='normal';const recoveredRead=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/business-health/verify'&&res.status()===200);
  await page.evaluate(()=>window.dispatchEvent(new Event('bd:store-updated')));await recoveredRead;await verification.getByRole('alert').waitFor({state:'detached'});await page.locator('[data-management-verification]').waitFor();
  mode='stalled';const started=Date.now();await page.evaluate(()=>window.dispatchEvent(new Event('bd:store-updated')));await verification.getByRole('alert').filter({hasText:'Сервер не ответил вовремя'}).waitFor({timeout:20000});assert.equal(await verification.getByText('Проверяем результат исправления…',{exact:true}).count(),0);timings.push({surface:'correction-verification',attempt:'timeout',visibleMs:Date.now()-started});
  mode='normal';await page.goto(r.base+'/health');await page.locator('.bd-health-detail-score-v332').waitFor();
  assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/${width}.png`,fullPage:true});results.push({width,status:'PASS',hiddenCuratedReads:0,legacyDoctor:true,coalescedVerificationReads:2,timings});console.log(JSON.stringify(results.at(-1)));
 }catch(error){await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});writeFileSync(`${out}/${width}-failure.json`,JSON.stringify({error:String(error),url:page.url(),calls,errors},null,2));throw error;}finally{await context.close();await r.close();}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
