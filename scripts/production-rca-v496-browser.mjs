import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium',out='outputs/v495-rca/browser-'+engine;mkdirSync(out,{recursive:true});
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
const results=[];
try{for(const width of [390,820,1280]){
 const runtime=await recoveryRuntime(),r=runtime.fixture,context=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript({content:'globalThis.__name=fn=>fn;'});
 await context.addInitScript(()=>{window.__qaTeamBeforeBootstrap=0;new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&(node.matches('[data-bd-team-module="v163"]')||node.querySelector('[data-bd-team-module="v163"]'))&&window.__bdBootstrapPending)window.__qaTeamBeforeBootstrap++;}).observe(document,{childList:true,subtree:true});});
 await context.addInitScript({content:`(()=>{const NativeDate=Date,time=Date.parse('2026-10-03T12:00:00Z');function FixtureDate(...args){if(new.target)return Reflect.construct(NativeDate,args.length?args:[time],new.target);return new NativeDate(time).toString();}FixtureDate.prototype=NativeDate.prototype;Object.setPrototypeOf(FixtureDate,NativeDate);FixtureDate.now=()=>time;globalThis.Date=FixtureDate;})();`});
 const profile=JSON.parse(String(r.sqlite.prepare('SELECT restaurant_json FROM accounts WHERE id=?').get(r.account).restaurant_json)),employees=JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(r.account,'bd_employees').data_json));
 await context.addInitScript(({user,venue,profile,employees})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));const scope=user.email+'__venue_'+venue;localStorage.setItem('bd_restaurant_cache__'+scope,JSON.stringify(profile));localStorage.setItem('bd_employees_cache__'+scope,JSON.stringify(employees));localStorage.setItem('bd_venue_context__'+user.email,JSON.stringify({venues:[{id:venue,status:'active',role:'owner',isPrimary:true,hasProfile:true}]}));localStorage.setItem('bd_active_venue_is_primary','1');localStorage.setItem('bd_role','owner');window.__qaDocumentMarker=Math.random().toString(36).slice(2);},{user:r.user,venue:r.venueId,profile,employees});
 let profileCalls=0,bootstrapDone=false,bootstrapCalls=0,profileBeforeBootstrap=0;
 await context.route('**/api/auth/bootstrap',async route=>{bootstrapCalls++;bootstrapDone=false;await new Promise(done=>setTimeout(done,300));const response=await route.fetch();bootstrapDone=true;await route.fulfill({response});});
 await context.route('**/api/restaurants/me',async route=>{profileCalls++;if(!bootstrapDone)profileBeforeBootstrap++;if(profileCalls===1)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Isolated QA transient profile read'})});await route.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(runtime.base+'/employees');await page.getByRole('heading',{name:'Не удалось восстановить доступ',exact:true}).waitFor();
  assert.equal(profileBeforeBootstrap,0);assert.equal(await page.evaluate(()=>window.__qaTeamBeforeBootstrap),0);assert.equal(profileCalls,1);assert.equal(await page.evaluate(()=>Boolean(localStorage.getItem('bd_session_token'))),true);
  const documentMarker=await page.evaluate(()=>window.__qaDocumentMarker);
  await page.getByRole('button',{name:'Повторить загрузку',exact:true}).click();await page.getByRole('button',{name:'Проверяем доступ…',exact:true}).waitFor();
  await page.locator('[data-bd-team-module="v163"]').waitFor();assert.equal(await page.getByRole('heading',{name:'Команда',exact:true}).count(),1);
  assert.equal(await page.getByText('Не удалось восстановить доступ',{exact:true}).count(),0);assert.equal(await page.evaluate(()=>window.__qaDocumentMarker),documentMarker);
  assert.ok(bootstrapCalls>=2);assert.equal(profileBeforeBootstrap,0);await page.getByLabel('Обзор команды',{exact:true}).getByRole('button',{name:'Добавить сотрудника',exact:true}).first().waitFor();
  await page.getByRole('tab',{name:'Сотрудники',exact:true}).click();await page.locator('[data-bd-team-list="directory-v163"]').waitFor();assert.equal(await page.getByText('QA Бариста',{exact:true}).count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`${out}/${width}-team.png`,fullPage:true});
  await page.waitForLoadState('networkidle');await page.reload();await page.locator('[data-bd-team-module="v163"]').waitFor();await page.waitForLoadState('networkidle');
  const headers=Object.fromEntries(r.requestAction('/api/business-health','GET').headers),healthResponse=await context.request.get(runtime.base+'/api/business-health',{headers});
  assert.equal(healthResponse.status(),200);const snapshot=(await healthResponse.json()).data.businessHealthSnapshot;assert.notEqual(snapshot.score,null);
  assert.equal(await page.evaluate(()=>window.__qaTeamBeforeBootstrap),0);assert.deepEqual(errors,[]);const result={engine,width,status:'PASS',production:false,isolatedVenue:r.venueId,actualHandlers:true,teamReady:true,profile503Retry:true,profileAfterBootstrap:true,sameDocumentRetry:true,reload:true,cachedProfile:true,noPrematureTeamCommit:true,healthSnapshotScore:snapshot.score,errors};results.push(result);console.log(JSON.stringify(result));
 }catch(error){writeFileSync(`${out}/${width}-failure.json`,JSON.stringify({error:String(error),errors,requests:runtime.requests},null,2));try{await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});}catch(captureError){writeFileSync(`${out}/${width}-capture-error.json`,JSON.stringify({error:String(captureError)},null,2));}throw error;}
 finally{await context.close();await runtime.close();}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
