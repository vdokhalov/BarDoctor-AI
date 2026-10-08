import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium';
const out='outputs/owner-uat-v493/'+engine;mkdirSync(out,{recursive:true});
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
const results=[];
try{for(const width of [390,820,1280]){
 const runtime=await recoveryRuntime(),r=runtime.fixture;
 const context=await browser.newContext({viewport:{width,height:width===390?844:1024},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript({content:'globalThis.__name=fn=>fn;'});
 await context.addInitScript({content:`(()=>{const NativeDate=Date,time=Date.parse('2026-10-03T12:00:00Z');function FixtureDate(...args){if(new.target)return Reflect.construct(NativeDate,args.length?args:[time],new.target);return new NativeDate(time).toString();}FixtureDate.prototype=NativeDate.prototype;Object.setPrototypeOf(FixtureDate,NativeDate);FixtureDate.now=()=>time;globalThis.Date=FixtureDate;})();`});
 await context.addInitScript(({user,venue})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.user,venue:r.venueId});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const settle=async()=>{await page.waitForLoadState('networkidle');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');assert.equal(await page.evaluate(()=>localStorage.getItem('bd_active_venue_id')),String(r.venueId));};
 try{
  const headers=Object.fromEntries(r.requestAction('/api/business-health','GET').headers);
  const sourceBefore=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY id').all();
  const response=await context.request.get(runtime.base+'/api/business-health',{headers});assert.equal(response.status(),200);
  const snapshot=(await response.json()).data.businessHealthSnapshot;assert.notEqual(snapshot.score,null);assert.equal(Number(snapshot.venueId),r.venueId);
  assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY id').all(),sourceBefore,'Health must remain read-only');
  await page.goto(runtime.base+'/home');await page.locator('.bd-home-health-ring').waitFor();await settle();
  assert.equal(Number(await page.locator('.bd-home-health-ring strong').first().innerText()),snapshot.score);
  assert.ok(await page.locator('.bd-home-health-zones-v332>*').count()>0);await page.getByRole('button',{name:'Открыть AI Doctor',exact:true}).waitFor();
  assert.equal(await page.locator('.bd-management-queue,[data-curated-question],[data-reference-slice]').count(),0);
  await page.screenshot({path:`${out}/${width}-home.png`,fullPage:true});
  await page.getByRole('button',{name:'Открыть AI Doctor',exact:true}).click();await page.waitForURL(u=>u.pathname==='/analysis');
  const run=page.getByRole('button',{name:'Запустить диагностику',exact:true});await run.waitFor();
  let injected=false;await page.route('**/api/ai/diagnosis',route=>{if(!injected){injected=true;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Isolated QA negative control'})});}return route.continue();});
  await run.click();await page.getByRole('button',{name:'Попробовать снова',exact:true}).waitFor();
  const diagnosed=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/ai/diagnosis'&&response.status()===200);
  await page.getByRole('button',{name:'Попробовать снова',exact:true}).click();assert.equal((await(await diagnosed).json()).success,true);
  await page.locator('[data-bd-ai-result]').waitFor();await settle();await page.reload();await page.locator('[data-bd-ai-result]').waitFor();await settle();
  await page.screenshot({path:`${out}/${width}-doctor.png`,fullPage:true});
  await page.goto(runtime.base+'/health');await page.locator('.bd-health-detail-hero-v332 .bd-home-health-ring').waitFor();await settle();
  assert.ok(await page.locator('.bd-health-impact-v332 button').count()>0);await page.getByRole('button',{name:'AI Doctor',exact:true}).click();await page.waitForURL(u=>u.pathname==='/analysis');await settle();
  await page.goto(runtime.base+'/more');await page.getByRole('button',{name:/AI Doctor/}).click();await page.waitForURL(u=>u.pathname==='/analysis');await settle();
  const routes=['/health','/shifts','/finance','/warehouse','/catalog','/salaries','/reports','/tasks','/reviews','/integrations','/settings','/more'];
  for(const path of routes){await page.goto(runtime.base+path);await settle();assert.ok((await page.locator('body').innerText()).length>0);if(path==='/shifts'){await page.locator('[data-bd-shifts-page="v158"]').waitFor();const shift=page.locator('[data-bd-shifts-page="v158"] .bd-shift-card').filter({hasText:'2 октября'});assert.equal((await shift.locator('.bd-shift-card-revenue').innerText()).replace(/\s+/g,' '),'200,00 MDL');assert.equal(await shift.locator('.bd-shift-card-metrics b').first().innerText(),'4');}await page.screenshot({path:`${out}/${width}-${path.slice(1)}.png`,fullPage:true});}
  for(const [key,path]of [['home','/home'],['shifts','/shifts'],['finance','/finance'],['team','/employees'],['more','/more']]){
   const link=page.locator(`[data-bd-nav-key="${key}"]:visible`).first();await link.waitFor();await link.click();await page.waitForURL(u=>u.pathname===path);await settle();
   if(key==='team'){await page.locator('[data-bd-team-module="v163"]').waitFor();assert.equal(await page.getByText('Не удалось восстановить доступ',{exact:true}).count(),0);}
  }
  // Deliberately stall only the isolated transport; production is never called.
  await page.route('**/api/management/cost-signals/evaluate',()=>undefined);
  await page.goto(runtime.base+'/home');await page.locator('[data-cost-surface="home"][data-cost-state="ERROR"]').waitFor({timeout:20000});
  assert.match(await page.locator('[data-cost-surface="home"]').innerText(),/недоступна|не ответил вовремя/);
  await page.unroute('**/api/management/cost-signals/evaluate');await page.getByRole('button',{name:'Повторить проверку',exact:true}).click();
  await page.waitForFunction(()=>{const el=document.querySelector('[data-cost-surface="home"]');return el&&!['LOADING','ERROR'].includes(el.getAttribute('data-cost-state'));});
  await settle();assert.deepEqual(errors,[]);assert.deepEqual(runtime.requests.filter(q=>q.status>=500),[]);
  assert.equal(await page.locator('[data-curated-question]').count(),0);
  const result={engine,width,status:'PASS',environment:'isolated SQLite / actual handlers',production:false,health:{score:snapshot.score,currentSnapshot:true,readOnly:true,ring:true,zones:true},doctor:{homeEntry:true,healthEntry:true,moreEntry:true,actualDiagnosis200:true,controlled503Retry:true,cachedReload:true},cost:{stalledRequestError:true,retryRecovery:true},coreRoutes:routes.length,jsErrors:0,serverErrors:0};results.push(result);console.log(JSON.stringify(result));
 }catch(error){writeFileSync(`${out}/${width}-failure.json`,JSON.stringify({error:String(error),errors,requests:runtime.requests},null,2));await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});throw error;}
 finally{await context.close();await runtime.close();}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
