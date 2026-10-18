import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{execFileSync}from'node:child_process';import{createRequire}from'node:module';import{chromium}from'playwright-core';
const require=createRequire(import.meta.url),{PNG}=require('pngjs'),{resolveBrowserExecutable,chromiumArgs}=require('../scripts/browser-runtime.cjs');
const out=process.env.BD_SPLASH_GEOMETRY_OUTPUT||'outputs/splash-geometry-v532';
function title(buffer){const p=PNG.sync.read(buffer);let lo=p.height,hi=0;for(let y=p.height*.3|0;y<p.height*.65;y++)for(let x=0;x<p.width;x++){let k=(y*p.width+x)*4;if(p.data[k]>205&&p.data[k+1]>205&&p.data[k+2]>205){lo=Math.min(lo,y);hi=Math.max(hi,y);}}return(lo+hi+1)/6;}
function line(buffer){const p=PNG.sync.read(buffer);let best={y:0,n:0};for(let y=p.height*.65|0;y<p.height*.95;y++){let n=0;for(let x=0;x<p.width;x++){const k=(y*p.width+x)*4;if(p.data[k]>110&&p.data[k+1]>140&&p.data[k+2]>180)n++;}if(n>best.n)best={y,n};}return best.y/3;}
test('native and standalone artwork share screen coordinates across viewport and container offsets',async()=>{
 mkdirSync(out,{recursive:true});const before=execFileSync('git',['show','58e6a3bc:public/app.html'],{encoding:'utf8'}),after=readFileSync('public/app.html','utf8');
 assert.match(after,/viewport-fit=cover/);assert.match(after,/name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
 const browser=await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs}),rows=[];
 try{for(const p of [{w:390,h:844,heights:[844,797,763],safe:47},{w:393,h:852,heights:[852,793,759],safe:59}]){
 const native=readFileSync(`public/icons/bardoctor-launch-${p.w}x${p.h}-3x-v529.png`),expected=title(native),expectedLine=line(native);
 for(const height of p.heights)for(const version of ['before','after']){
 const page=await browser.newPage({viewport:{width:p.w,height},screen:{width:p.w,height:p.h},deviceScaleFactor:3,reducedMotion:'reduce'});
 // Model the standalone signal; desktop Chromium is NOT an actual iOS PWA.
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
 await page.route('**/*',r=>{const u=new URL(r.request().url());assert.equal(u.origin,'http://splash.test');return r.fulfill({body:u.pathname==='/'?(version==='before'?before:after):u.pathname.endsWith('.png')?readFileSync('public'+u.pathname):'',contentType:u.pathname==='/'?'text/html':u.pathname.endsWith('.png')?'image/png':'text/javascript'});});
 await page.goto('http://splash.test/');await page.locator('.bd-splash-art-stage-v529 img').first().evaluate(i=>i.decode());
 const file=`${out}/${p.w}x${p.h}-${height}-${version}.png`,shot=await page.screenshot({path:file}),actual=title(shot),lineY=line(shot);rows.push({screen:[p.w,p.h],height,version,expected,titleY:actual,error:actual-expected,lineY,expectedLine,lineError:lineY-expectedLine});
 if(version==='after'){
 assert.ok(Math.abs(lineY-expectedLine)<.7,'lower artwork agrees with native');
 assert.ok(Math.abs(actual-expected)<.7,JSON.stringify(rows.at(-1)));
 // Offset the container by the modelled safe area; it must NOT move artwork.
 await page.addStyleTag({content:`.bd-splash-art-v529{top:${p.safe}px!important;left:8px!important;overflow:visible!important}`});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 let shifted=title(await page.screenshot());assert.ok(Math.abs(shifted-expected)<.7,'container origin compensated');
 // A visual viewport pan is a coordinate translation, not a safe-area inset.
 await page.evaluate(y=>Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:y}),p.safe);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 let visual=title(await page.screenshot())-p.safe;assert.ok(Math.abs(visual-expected)<.7,'layout to visual coordinates compensated');
 rows.at(-1).containerOriginError=shifted-expected;rows.at(-1).visualOriginError=visual-expected;
 await page.evaluate(()=>Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:0}));
 await page.setViewportSize({width:p.w,height:p.heights.at(-1)});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.ok(Math.abs(title(await page.screenshot())-expected)<.7,'resize does not recenter');
 }
 await page.close();
 }} }finally{await browser.close();}
 writeFileSync(out+'/measurements.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
});
