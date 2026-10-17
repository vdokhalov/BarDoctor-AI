import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
const {resolveBrowserExecutable,chromiumArgs}=createRequire(import.meta.url)('./browser-runtime.cjs');
const out=process.env.BD_SPLASH_OUTPUT||'outputs/splash-v529';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
try{
 for(const [w,h,ratio] of [[320,568,2],[375,667,2],[414,736,3],[375,812,3],[414,896,2],[414,896,3],[390,844,3],[428,926,3],[393,852,3],[430,932,3],[402,874,3],[440,956,3],[853,1844,1]]){
 const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:ratio,reducedMotion:'reduce'});
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!=='http://splash.test')throw Error('External request');if(u.pathname==='/')return route.fulfill({body:readFileSync('public/app.html'),contentType:'text/html'});if(u.pathname==='/icons/bardoctor-splash-reference-v529.png')return route.fulfill({body:readFileSync('public'+u.pathname),contentType:'image/png'});return route.fulfill({body:'',contentType:u.pathname.endsWith('.js')?'text/javascript':'text/css'});});
 await page.goto('http://splash.test/');await page.locator('.bd-splash-art-v529 img').first().evaluate(img=>img.decode());
 const file=w===853?out+'/reference-size.png':`public/icons/bardoctor-launch-${w}x${h}-${ratio}x-v529.png`;
 await page.screenshot({path:file});if(w===390)await page.screenshot({path:out+'/mobile-390.png'});if(w===320)await page.screenshot({path:out+'/mobile-320.png'});
 await page.close();
 }
 writeFileSync(out+'/capture.json',JSON.stringify({source:'libfile_f5a7adc22dec819180235c8ed1e3fa09',profiles:13,reducedMotion:true}));
}finally{await browser.close();}
