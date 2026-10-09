import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {baselinePublicRoot,recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium',out=`outputs/reference-slice-recovery/legacy-doctor-${engine}`;
mkdirSync(out,{recursive:true});
const hash=createHash('sha256').update(readFileSync('public/assets/index-BQGspy0I.js')).digest('hex'),baseline=baselinePublicRoot();
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:['--no-sandbox']});
const results=[];
try{for(const width of [390,820,1280]){const facts={};for(const version of ['v485','candidate']){
 const runtime=await recoveryRuntime(version==='v485'?baseline.root:process.cwd()),r=runtime.fixture;
 const context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1024:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript({content:'globalThis.__name=(fn)=>fn;'});
 await context.addInitScript(({user,venue})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.user,venue:r.venueId});
 // Freeze Date while keeping native timer teardown across real navigation.
 await context.addInitScript({content:`(()=>{const NativeDate=Date,time=Date.parse('2026-10-03T12:00:00Z');function FixtureDate(...args){if(new.target)return Reflect.construct(NativeDate,args.length?args:[time],new.target);return new NativeDate(time).toString();}FixtureDate.prototype=NativeDate.prototype;Object.setPrototypeOf(FixtureDate,NativeDate);FixtureDate.now=()=>time;globalThis.Date=FixtureDate;})();`});
 await context.addInitScript({content:`(()=>{if(globalThis.__qaFetchTrackingInstalled)return;Object.defineProperty(globalThis,'__qaFetchTrackingInstalled',{value:true});let pending=0;Object.defineProperty(globalThis,'__qaPendingApi',{get:()=>pending});const nativeFetch=globalThis.fetch;globalThis.fetch=function(...args){const tracked=new URL(String(args[0]?.url??args[0]),location.href).pathname.startsWith('/api/');if(!tracked)return nativeFetch.apply(this,args);pending++;return nativeFetch.apply(this,args).then(async response=>{await response.clone().arrayBuffer();return response;}).finally(()=>pending--);};})();`});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const settle=async()=>{await page.waitForLoadState('domcontentloaded');await page.waitForFunction(()=>{const ready=globalThis.__qaPendingApi===0&&document.documentElement.getAttribute('data-bd-startup-pending')!=='true',signature=location.href+'\n'+document.body.innerText,now=performance.now();if(!ready||globalThis.__qaReadySignature!==signature){globalThis.__qaReadySignature=signature;globalThis.__qaReadySince=now;return false;}return now-globalThis.__qaReadySince>=300;},null,{timeout:60000,polling:100});await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));};
 try{
  await page.goto(runtime.base+'/analysis');await settle();assert.equal(await page.locator('[data-curated-question]').count(),0);
  const run=page.getByRole('button',{name:'Запустить диагностику',exact:true});await run.waitFor();
  let failed=false;await page.route('**/api/ai/diagnosis',async route=>{if(!failed){failed=true;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'QA: временная недоступность диагностики'})});}else await route.continue();});
  await run.click();await page.getByRole('button',{name:'Попробовать снова',exact:true}).waitFor();assert.ok((await page.locator('body').innerText()).includes('QA: временная недоступность диагностики'));
  const wait=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/ai/diagnosis'&&res.status()===200);await page.getByRole('button',{name:'Попробовать снова',exact:true}).click();const response=await wait,data=await response.json();assert.equal(data.success,true);
  await page.locator('[data-bd-ai-result]').waitFor();await settle();
  facts[version]={businessHealth:data.data.intelligence.businessHealth.score,status:data.data.intelligence.businessHealth.status,inputAuthority:data.data.inputAuthority,metricProvenance:data.data.metricProvenance};
  assert.equal(await page.locator('[data-curated-question]').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('bd_active_venue_id')),String(r.venueId));
  await page.reload();await settle();await page.locator('[data-bd-ai-result]').waitFor();
  const refresh=page.getByRole('button',{name:'Обновить анализ',exact:true}).first(),refreshed=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/ai/diagnosis'&&res.status()===200);await refresh.click();assert.equal((await (await refreshed).json()).success,true);await page.locator('[data-bd-ai-result]').waitFor();await settle();
  const reportActions=[];const actionCount=await page.locator('.bd-ai-management-cta').count();assert.ok(actionCount>0,'representative legacy report has actual contextual actions');
  for(let index=0;index<actionCount;index++){
   const button=page.locator('.bd-ai-management-cta').nth(index),label=await button.innerText();await button.click();await page.waitForURL(u=>u.pathname==='/tasks');await settle();const destination=new URL(page.url());assert.equal(await page.evaluate(()=>localStorage.getItem('bd_active_venue_id')),String(r.venueId));await page.reload();await settle();assert.equal(new URL(page.url()).pathname,'/tasks');await page.goBack();await settle();await page.locator('[data-bd-ai-result]').waitFor();reportActions.push({label,destination:destination.pathname+'?tab='+destination.searchParams.get('tab'),reload:'PASS',return:'PASS',venue:'PASS'});
  }
  const footerRefresh=page.locator('.bd-ai-refresh'),footerResponse=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/ai/diagnosis'&&res.status()===200);await footerRefresh.click();assert.equal((await (await footerResponse).json()).success,true);await page.locator('[data-bd-ai-result]').waitFor();await settle();
  facts[version].reportActions=reportActions;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);assert.deepEqual(runtime.requests.filter(q=>q.status>=500),[]);
  const finance=await r.api.store.GET(r.requestAction('/api/store/bd_finance_expenses','GET'),{params:Promise.resolve({key:'bd_finance_expenses'})});assert.equal(finance.status,200);
  await page.screenshot({path:`${out}/${version}-${width}.png`,fullPage:true});results.push({engine,width,version,run:'PASS',errorRetry:'PASS (isolated injected 503)',actualHandler:'PASS (HTTP 200)',cachedReload:'PASS',refresh:'PASS',finance:'PASS',reportActions,footerRefresh:'PASS',errors});console.log(JSON.stringify(results.at(-1)));
 }catch(error){
  const state=await page.evaluate(()=>({path:location.pathname,venue:localStorage.getItem('bd_active_venue_id'),sessionPresent:!!localStorage.getItem('bd_session_token'),pendingApi:globalThis.__qaPendingApi,reportVisible:!!document.querySelector('[data-bd-ai-result]'),scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth})).catch(()=>null);
  try{writeFileSync(`${out}/${version}-${width}-failure.json`,JSON.stringify({engine,width,version,error:String(error),stack:error?.stack??null,errors,state,requests:runtime.requests},null,2));}catch{console.error("Could not persist failure diagnostics; rethrowing original test failure.");}
  await page.screenshot({path:`${out}/${version}-${width}-failure.png`,fullPage:true}).catch(()=>{});throw error;
 }finally{await context.close();await runtime.close();}
}assert.deepEqual(facts.candidate,facts.v485,'legacy diagnosis authoritative facts unchanged');writeFileSync(`${out}/facts-${width}.json`,JSON.stringify(facts,null,2));}}
finally{await browser.close();baseline.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));assert.equal(createHash('sha256').update(readFileSync('public/assets/index-BQGspy0I.js')).digest('hex'),hash);}
