import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {webkit} from 'playwright-core';
import {recoveryRuntime} from './helpers/reference-slice-recovery-runtime.mjs';
import {installApiReadTracker} from '../scripts/qa/api-read-tracker.mjs';
const runtime=await recoveryRuntime(),browser=await webkit.launch({headless:true}),results=[];
try {
 for(const width of [390,820,1280]) {
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(({user,venue})=>{if(!/^http/.test(location.protocol))return;localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:runtime.fixture.user,venue:runtime.fixture.venueId});
  await context.addInitScript(installApiReadTracker);
  await context.addInitScript(()=>{globalThis.__financeRefreshTicks=0;const native=setInterval;window.setInterval=(fn,delay,...args)=>native(()=>{if(delay===15000)globalThis.__financeRefreshTicks++;fn(...args)},delay);});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const settle=()=>page.waitForFunction(()=>{
   const ready=globalThis.__qaPendingApi===0&&globalThis.__bdBootstrapPending!==true&&document.documentElement.getAttribute('data-bd-startup-pending')!=='true';
   if(!ready){globalThis.__financeQuietSince=performance.now();return false;}
   globalThis.__financeQuietSince??=performance.now();return performance.now()-globalThis.__financeQuietSince>=500;
  },null,{timeout:60000});
  for(let iteration=0;iteration<3;iteration++){
   await page.goto(runtime.base+'/finance');await settle();
   assert.match(await page.locator('body').innerText(),/Финансы/);
   const count=()=>runtime.requests.filter(r=>r.path==='/api/month-close').length;
   const before=count(),ticks=await page.evaluate(()=>globalThis.__financeRefreshTicks);await page.waitForTimeout(600);const elapsedTicks=await page.evaluate(()=>globalThis.__financeRefreshTicks)-ticks;assert.ok(count()-before<=elapsedTicks,'settled inputs may refresh only on scheduled ticks, not render');
   await page.goto(runtime.base+'/analysis');await settle();
   assert.deepEqual(errors,[],'no runtime errors during Finance departure');
   assert.equal(await page.evaluate(()=>localStorage.getItem('bd_active_venue_id')),String(runtime.fixture.venueId));
  }
  assert.deepEqual(runtime.requests.filter(r=>r.status>=500),[]);
  results.push({engine:'webkit',width,transitions:3,status:'PASS',runtimeErrors:errors.length});
  console.log(JSON.stringify(results.at(-1)));await context.close();
 }
}finally{await browser.close();await runtime.close();mkdirSync('outputs/p0-finance-lifecycle',{recursive:true});writeFileSync('outputs/p0-finance-lifecycle/results.json',JSON.stringify(results,null,2));}
