import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium';
const out='outputs/stable-ui-rollback/'+engine;mkdirSync(out,{recursive:true});
const digest=()=>createHash('sha256').update(readFileSync('public/assets/index-BQGspy0I.js')).digest('hex'),hash=digest();
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:['--no-sandbox']});
const results=[];
try{for(const width of [390,820,1280]){
 const r=await recoveryRuntime(),context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1024:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript(({user,venue})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.fixture.user,venue:r.fixture.venueId});
 await context.addInitScript({content:`globalThis.__name=fn=>fn;(()=>{const NativeDate=Date,time=Date.parse('2026-10-03T12:00:00Z');function FixedDate(...args){if(new.target)return Reflect.construct(NativeDate,args.length?args:[time],new.target);return new NativeDate(time).toString();}FixedDate.prototype=NativeDate.prototype;Object.setPrototypeOf(FixedDate,NativeDate);FixedDate.now=()=>time;globalThis.Date=FixedDate;})();`});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const capture=async name=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,name+' overflow');assert.equal(await page.evaluate(()=>localStorage.getItem('bd_active_venue_id')),String(r.fixture.venueId));await page.screenshot({path:`${out}/${width}-${name}.png`,fullPage:true});await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));};
 try{
  await page.goto(r.base+'/home');await page.locator('[data-management-id]').first().waitFor();await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('[data-reference-slice]').count(),0);
  const canonical=(await r.fixture.readHealth()).data.businessHealthSnapshot.managementTopActions;
  assert.deepEqual(await page.locator('.bd-management-queue [data-management-id]').evaluateAll(rows=>rows.map(row=>row.dataset.managementId)),canonical.map(item=>String(item.managementId??item.recommendationId)));
  await capture('home');
  await page.locator('.bd-home-health-score-v332').click();await page.waitForURL(u=>u.pathname==='/health');await page.locator('.bd-health-detail-v332').waitFor();await page.waitForLoadState('networkidle');await capture('health');
  const suggestion=page.locator('.bd-curated-suggestion button').filter({hasText:'Спросить Doctor:'});await suggestion.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));await suggestion.click();await page.waitForURL(u=>u.pathname==='/analysis');await page.locator('[data-curated-answer]').waitFor();await capture('doctor-deep-link');
  await page.goto(r.base+'/analysis');const panel=page.locator('.bd-curated-doctor');await panel.locator('[data-curated-question]').first().waitFor();await page.waitForLoadState('networkidle');assert.equal(await panel.locator('[data-curated-question]').count(),7);assert.equal(await panel.locator('[data-curated-answer]').count(),0);assert.equal(await panel.getByRole('button',{name:'Обновить ответ',exact:true}).isEnabled(),false);
  await panel.locator('[data-curated-question=attention]').click();await panel.locator('[data-curated-answer=attention]').waitFor();await page.waitForLoadState('networkidle');await capture('doctor');
  for(const route of ['/shifts','/finance','/warehouse','/catalog','/salaries','/reports','/tasks','/reviews','/integrations','/settings','/more']){
   await page.goto(r.base+route);await page.waitForLoadState('networkidle');assert.ok((await page.locator('body').innerText()).trim().length>0);await capture(route.slice(1));
  }
  assert.deepEqual(errors,[]);assert.deepEqual(r.requests.filter(q=>q.status>=500),[]);
  results.push({engine,width,status:'PASS',routes:14,allHomeActions:true,sevenDoctorQuestions:true,explicitSelection:true,serverErrors:0,pageErrors:0,clientHash:hash});console.log(JSON.stringify(results.at(-1)));
 }catch(error){writeFileSync(`${out}/${width}-failure.json`,JSON.stringify({error:String(error),url:page.url(),errors,requests:r.requests},null,2));await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});throw error;}finally{await context.close();await r.close();}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));assert.equal(digest(),hash);}
