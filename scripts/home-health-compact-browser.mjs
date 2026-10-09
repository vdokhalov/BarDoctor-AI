import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium';
const out='outputs/home-health-compact'+(engine==='webkit'?'-webkit':'');mkdirSync(out,{recursive:true});
const baseline=path=>execFileSync('git',['show','772ceee943028b9982b53c957b6472d09cd180e4:'+path],{maxBuffer:64*1024*1024});
const browser=engine==='webkit'?await webkit.launch({headless:true,...(process.env.BD_WEBKIT_EXECUTABLE?{executablePath:process.env.BD_WEBKIT_EXECUTABLE}:{})}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
const results=[];
try{for(const [version,width] of [['before',390],... [375,390,430,820,1280].map(width=>['after',width])]){
 const r=await recoveryRuntime(),context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500});
 await context.addInitScript({content:'globalThis.__name=fn=>fn;'});
 await context.addInitScript(({user,venue})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.fixture.user,venue:r.fixture.venueId});
 if(version==='before'){
  await context.route('**/assets/index-BQGspy0I*.js',route=>route.fulfill({contentType:'application/javascript',body:baseline('public/assets/index-BQGspy0I.js')}));
  await context.route('**/health-score-experience-v152.css*',route=>route.fulfill({contentType:'text/css',body:baseline('public/health-score-experience-v152.css')}));
 }
 const page=await context.newPage();
 try{
  await page.goto(r.base+'/home');await page.locator('.bd-home-daily .bd-home-health-ring').waitFor();await page.waitForLoadState('networkidle');
  const actualScore=await page.locator('.bd-home-daily .bd-home-health-value strong').textContent();
  // Layout-only 83/100 fixture, never a claim about this isolated venue's actual score.
  await page.locator('.bd-home-daily .bd-home-health-value strong').evaluate(e=>{e.textContent='83';});
  const metrics=await page.evaluate(()=>{
   const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const root='.bd-home-daily > .bd-home-health-card-v332';
   return {card:box(root),ring:box(root+' .bd-home-health-ring'),value:box(root+' .bd-home-health-value'),score:box(root+' .bd-home-health-value strong'),denominator:box(root+' .bd-home-health-value small'),button:box(root+' .bd-home-health-score-v332'),attention:box('[data-bd-home-attention]'),cost:document.querySelectorAll('[data-cost-surface=home]').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  if(version==='after'){
   assert.equal(metrics.cost,0);assert.equal(metrics.overflow,false);assert.ok(metrics.button.height>=44);
   assert.equal(r.requests.filter(x=>x.path.startsWith('/api/management/cost-signals')).length,0);
   for(const box of [metrics.score,metrics.denominator]){assert.ok(box.x>metrics.ring.x+8&&box.right<metrics.ring.right-8);assert.ok(box.y>metrics.ring.y+8&&box.bottom<metrics.ring.bottom-8);}
   assert.ok(Math.abs(metrics.value.x+metrics.value.width/2-metrics.ring.x-metrics.ring.width/2)<1);
   assert.ok(Math.abs(metrics.value.y+metrics.value.height/2-metrics.ring.y-metrics.ring.height/2)<1);
  }
  await page.locator('.bd-home-daily .bd-home-health-value strong').evaluate((e,value)=>{e.textContent=value;},actualScore);
  await page.screenshot({path:`${out}/${version}-${width}.png`,fullPage:true});results.push({version,width,...metrics});
 }finally{await context.close();await r.close();}
}
 const before=results.find(x=>x.version==='before'),after=results.find(x=>x.version==='after'&&x.width===390);
 assert.ok(after.card.height<before.card.height);assert.ok(after.attention.y<before.attention.y);
 console.log(JSON.stringify({status:'PASS',cardHeightBefore:before.card.height,cardHeightAfter:after.card.height,attentionMovedUp:before.attention.y-after.attention.y,viewports:[375,390,430,820,1280]}));
}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
