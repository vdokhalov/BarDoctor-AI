import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import {chromium} from 'playwright-core';import {execFileSync} from 'node:child_process';
const {resolveBrowserExecutable,chromiumArgs}=createRequire(import.meta.url)('../scripts/browser-runtime.cjs');
test('splash is accessible, responsive, static under reduced motion and never gates handoff on animation',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
 // Chromium CDP cannot emulate display-mode; project that CSS condition to screen
 // in the fixture only. This makes a standalone-only animation override observable.
 try{for(const [width,height,reducedMotion,standalone] of [[320,568,'reduce',false],[390,844,'no-preference',false],[430,932,'reduce',false],[1280,720,'reduce',false],[390,844,'no-preference',true],[390,844,'reduce',true]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion});
  await page.route('**/*',route=>{const u=new URL(route.request().url());assert.equal(u.origin,'http://splash.test');if(u.pathname==='/')return route.fulfill({body:standalone?readFileSync('public/app.html','utf8').replaceAll('@media (display-mode:standalone)','@media screen'):readFileSync('public/app.html'),contentType:'text/html'});if(u.pathname==='/icons/bardoctor-splash-reference-v529.png')return route.fulfill({body:readFileSync('public'+u.pathname),contentType:'image/png'});return route.fulfill({body:'',contentType:u.pathname.endsWith('.js')?'text/javascript':'text/css'});});
  await page.goto('http://splash.test/');await page.locator('.bd-splash-art-v529 img').first().evaluate(img=>img.decode());
  assert.equal(await page.getByRole('status',{name:'BarDoctor загружается'}).count(),1);
  assert.ok(await page.locator('.bd-unified-splash-tagline-v394').isHidden());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  const animations=await page.locator('.bd-splash-art-stage-v529').evaluate(el=>el.getAnimations({subtree:true}).map(a=>({duration:a.effect.getTiming().duration,iterations:a.effect.getTiming().iterations})));
  if(reducedMotion==='reduce')assert.deepEqual(animations,[]);else{assert.equal(animations.length,1);assert.ok(animations.every(a=>a.duration===1050&&a.iterations===1));}
  assert.equal(await page.locator('.bd-splash-art-stage-v529 img').evaluate(i=>getComputedStyle(i).opacity),'1');
  assert.equal(await page.locator('.bd-splash-art-stage-v529 img').count(),1);
  // The existing pending attribute owns visibility; animation has no completion callback.
  await page.evaluate(()=>document.documentElement.removeAttribute('data-bd-startup-pending'));
  assert.ok(await page.locator('[data-bd-static-startup]').isHidden());await page.close();
 }}finally{await browser.close();}
});
test('splash patch roundtrips only its owned markup and launch references',()=>{
 const files=['public/app.html','app/bar-doctor-response.ts'];const before=files.map(f=>readFileSync(f,'utf8'));
 const inline=before[0].match(/src="data:image\/webp;base64,([^"]+)"/);assert.ok(inline,'no network-dependent startup artwork');
 assert.deepEqual(Buffer.from(inline[1],'base64'),readFileSync('public/icons/bardoctor-splash-reference-v534.webp'),'embedded artwork preserves lossless asset bytes');
 execFileSync(process.execPath,['scripts/patch-splash-v529.mjs','--restore']);execFileSync(process.execPath,['scripts/patch-splash-v529.mjs']);
 files.forEach((file,i)=>assert.equal(readFileSync(file,'utf8'),before[i]));
 const svg=readFileSync('scripts/splash-scene-v537.svg','utf8');assert.equal((svg.match(/class="bd-lower-ink-v535"/g)||[]).length,1,'one common illustration layer');
 const patch=readFileSync('scripts/patch-splash-v529.mjs','utf8');assert.doesNotMatch(patch,/setTimeout|animationend|localStorage|\/api\//);
});
