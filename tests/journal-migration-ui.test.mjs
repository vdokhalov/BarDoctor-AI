import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {createRequire} from 'node:module';
const {resolveBrowserExecutable,chromiumArgs}=createRequire(import.meta.url)('../scripts/browser-runtime.cjs');
const lifecycleHtml=readFileSync('app/settings/lifecycle/route.ts','utf8').split('export const LIFECYCLE_HTML = `')[1].split('`;')[0];
const html=readFileSync('app/settings/journal-migration/route.ts','utf8').split('export const MIGRATION_HTML = `')[1].split('`;')[0];
test('QA3389 visible controls: bounded steps, reload, uncertain response, abort/refresh and 390px layout',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});let state={scope:{venueId:3389,accountId:1},ok:true,run:null,stock:null,events:null,log:[]},failNext=false;const calls=[];
 await page.addInitScript(()=>{localStorage.setItem('bd_session','owner@isolated.test');localStorage.setItem('bd_session_token','test-only');localStorage.setItem('bd_active_venue_id','3389');});
 await page.route('https://isolated.test/**',async route=>{const url=new URL(route.request().url());
  if(['/api/users/lifecycle','/api/venues'].includes(url.pathname))return route.fulfill({json:{ok:true,venues:[{id:3389,name:'QA3389',status:'active'}],canCreateVenues:false}});
  if(url.pathname==='/api/migration/journals'){
   assert.equal(route.request().headers()['x-venue-id'],'3389');assert.equal(route.request().headers()['x-session-token'],'test-only');
   if(failNext){failNext=false;return route.fulfill({status:503,json:{ok:false}});}
   if(route.request().method()==='POST'){const body=route.request().postDataJSON();calls.push(body);assert.equal(body.venueId,3389);assert.equal(body.confirmation,'JOURNAL_CUTOVER:3389');
    if(body.action==='prepare')state={...state,run:{venue_id:3389,run_id:'same-run',backup_key:'backup/'+ 'a'.repeat(150),backup_hash:'f'.repeat(64),phase:'BACKED_UP',paused:0,revision:0}};
    else{assert.equal(body.runId,'same-run');if(body.action==='abort')state.run.phase='ABORTED';if(body.action==='refresh')state.run.phase='BACKED_UP';if(body.action==='step')state.run.phase='STAGED';}
   }return route.fulfill({json:state});
  }
  if(url.pathname==='/settings/journal-migration')return route.fulfill({contentType:'text/html; charset=utf-8',body:html});
  if(url.pathname==='/settings/lifecycle')return route.fulfill({contentType:'text/html; charset=utf-8',body:lifecycleHtml});
  return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript',body:readFileSync('public'+url.pathname,'utf8')});
 });
 await page.goto('https://isolated.test/settings/lifecycle');await page.getByRole('link',{name:'Перенос журналов заведения'}).click();await page.locator('#controls:not([hidden])').waitFor();assert.equal(calls.length,0);assert.ok(await page.locator('#prepare').isDisabled());await page.locator('#confirmation').check();await page.locator('#prepare').click();await page.getByText('same-run',{exact:true}).waitFor();assert.equal(calls.length,1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#step').click();await page.getByText('STAGED',{exact:true}).waitFor();assert.equal(calls.length,2);
 await page.reload();await page.getByText('same-run',{exact:true}).waitFor();assert.equal(calls.length,2);
 failNext=true;await page.locator('#step').click();await page.locator('#controls').waitFor({state:'hidden'});await page.locator('#status').click();await page.locator('#controls:not([hidden])').waitFor();assert.equal(calls.length,2);
 await page.locator('#abort').click();await page.getByText('ABORTED',{exact:true}).waitFor();assert.ok(await page.locator('#refresh').isDisabled());await page.locator('#confirmation').check();await page.locator('#refresh').click();await page.getByText('BACKED_UP',{exact:true}).waitFor();assert.equal(calls.length,4);
 state.run.phase='STOCK_ACTIVE';state.run.paused=1;state.stock={venue_id:3389,state:'active',copied_count:438,source_count:438};state.events={venue_id:3389,state:'verified',copied_count:25,source_count:25};await page.locator('#status').click();await page.getByText('STOCK_ACTIVE',{exact:true}).waitFor();assert.ok(await page.locator('#abort').isHidden());assert.match(await page.locator('#readiness').textContent(),/во время паузы недоступна/);
 state.run.phase='COMPLETE';state.events.state='active';await page.locator('#status').click();await page.getByText('COMPLETE',{exact:true}).waitFor();assert.match(await page.locator('#readiness').textContent(),/во время паузы недоступна/);
 state.run.paused=0;await page.locator('#status').click();await page.getByText('Перенос завершён. Пауза снята. Можно продолжить работу.').waitFor();assert.ok(await page.locator('#step').isHidden());
 await page.getByRole('link',{name:'← Заведения и аккаунт'}).click();await page.getByRole('heading',{name:'Заведения и аккаунт'}).waitFor();
 }finally{await browser.close();}
});
