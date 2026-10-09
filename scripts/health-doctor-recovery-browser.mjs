import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium';
const out='outputs/health-doctor-recovery/browser-'+engine;mkdirSync(out,{recursive:true});
// Explicit missing-provider QA, never substitute a successful provider response.
for(const key of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','AI_INTEGRATIONS_ANTHROPIC_API_KEY'])assert.equal(Boolean(process.env[key]),false,'Missing-provider test requires no ambient AI credential');
const browser=engine==='webkit'?await webkit.launch({headless:true,...(process.env.BD_WEBKIT_EXECUTABLE?{executablePath:process.env.BD_WEBKIT_EXECUTABLE}:{})}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
const results=[];
try{for(const width of [390,820,1280]){
 const r=await recoveryRuntime(),context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript({content:'globalThis.__name=fn=>fn;'});
 // Match the existing isolated server fixture clock; otherwise its snapshot is stale by definition.
 await context.addInitScript({content:`(()=>{const NativeDate=Date,time=Date.parse('2026-10-03T12:00:00Z');function FixtureDate(...args){if(new.target)return Reflect.construct(NativeDate,args.length?args:[time],new.target);return new NativeDate(time).toString();}FixtureDate.prototype=NativeDate.prototype;Object.setPrototypeOf(FixtureDate,NativeDate);FixtureDate.now=()=>time;globalThis.Date=FixtureDate;})();`});
 await context.addInitScript(({user,venue})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.fixture.user,venue:r.fixture.venueId});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const attempt of ['first','reload']){
   const responsePromise=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/business-health'&&res.status()===200);
   if(attempt==='first')await page.goto(r.base+'/health');else await page.reload();
   const health=await(await responsePromise).json();assert.notEqual(health.data.businessHealthSnapshot.score,null);
   await page.locator('.bd-health-detail-hero-v332 .bd-home-health-ring').waitFor();
   await page.screenshot({path:`${out}/${width}-health-${attempt}.png`,fullPage:true});
  }
  await page.goto(r.base+'/analysis');const launch=page.getByRole('button',{name:'Запустить диагностику',exact:true});await launch.waitFor();
  const diagnosisPromise=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/ai/diagnosis'&&res.request().method()==='POST');
  await launch.click();const response=await diagnosisPromise,diagnosis=await response.json();
  assert.equal(response.status(),200);assert.equal(diagnosis.success,true);assert.equal(diagnosis.context.provider.available,false);
  assert.notEqual(diagnosis.data.businessHealthSnapshot.score,null);
  await page.getByText('Что делать сегодня',{exact:true}).waitFor();
  await page.getByText('Проверить безопасное состояние',{exact:true}).first().waitFor();
  await page.waitForLoadState('networkidle');
  await page.screenshot({path:`${out}/${width}-doctor-fallback.png`,fullPage:true});
  writeFileSync(`${out}/${width}-doctor-visible.txt`,await page.locator('body').innerText());
  await page.reload();await page.getByText('Что делать сегодня',{exact:true}).waitFor();
  await page.getByText('Проверить безопасное состояние',{exact:true}).first().waitFor();
  await page.waitForLoadState('networkidle');
  await page.screenshot({path:`${out}/${width}-doctor-reload.png`,fullPage:true});
  assert.equal(await page.getByText('Ошибка диагностики',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(errors,[]);
  const result={engine,width,status:'PASS',actualHandlers:true,isolated:true,healthScore:true,healthReload:true,diagnosisFallback:true,providerLive:'BLOCKED_NO_NEW_QA_KEY',doctorReload:true};results.push(result);console.log(JSON.stringify(result));
 }catch(error){await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});writeFileSync(`${out}/${width}-failure.json`,JSON.stringify({error:String(error),errors,requests:r.requests},null,2));throw error;}
 finally{await context.close();await r.close();}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
