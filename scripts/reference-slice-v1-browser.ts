import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {CURATED_QUESTIONS} from '../lib/bardoctor/curated-doctor-contracts';
import {curatedDoctorFixture} from '../tests/helpers/curated-doctor-fixture';
import {barDoctorResponse} from '../app/bar-doctor-response';
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium';
const out='outputs/design-system-v1/'+(process.env.BD_REFERENCE_BASELINE==='1'?'baseline':'actual')+'/'+engine;mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url),{resolveBrowserExecutable}=require('./browser-runtime.cjs');
// Existing project runtime only. No browser installation or infrastructure repair.
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:['--no-sandbox','--disable-setuid-sandbox']});
const results:unknown[]=[];
try{for(const width of [390,820,1280]){
 const r=await curatedDoctorFixture();
 const routes:Record<string,string>={'/api/auth/bootstrap':'bootstrap','/api/restaurants/me':'restaurant','/api/users/me':'users','/api/venues':'venues','/api/store':'bulkStore','/api/business-health':'health','/api/business-health/verify':'verifyAction','/api/assortment/overview':'overview','/api/operational-days':'days','/api/shifts/close':'closeReport','/api/inventory/counts':'counts','/api/write-offs':'writeoffs','/api/access/active-venue':'activeVenue','/api/ai/diagnosis':'doctor','/api/ai/curated':'curated','/api/management/cost-signals':'costs','/api/management/cost-signals/evaluate':'evaluateCost'};
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url||'/',`http://${req.headers.host}`),chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
  const cost=url.pathname.match(/^\/api\/management\/cost-signals\/([^/]+)(\/verify)?$/);
  const key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1],name=routes[url.pathname]??(cost?(cost[2]?'verifyCost':'detail'):key?'store':undefined);
  const request=new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})});let response:Response;
  if(name==='doctor')response=await r.api.doctor.handleDiagnosis(request);
  else if(name&&r.api[name])response=await r.api[name][req.method||'GET'](request,{params:Promise.resolve({key,action:'curated',id:cost?.[1]?decodeURIComponent(cost[1]):undefined})} as never);
  else if(!url.pathname.startsWith('/api/')&&!extname(url.pathname))response=barDoctorResponse();
  else{const file=resolve('public','.'+url.pathname);response=file.startsWith(resolve('public')+'/')&&existsSync(file)?new Response(readFileSync(file),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'} as Record<string,string>)[extname(file)]||'application/octet-stream'}}):new Response(null,{status:404});}
  if(url.pathname==="/api/shifts/close")writeFileSync(out+"/"+width+"-day-save.json",JSON.stringify({request:JSON.parse(body.toString()),status:response.status,response:await response.clone().json()},null,2));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);res.writeHead(500);res.end('isolated QA failure')}});
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1024:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript(({user,venue})=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.user,venue:r.venueId});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=500)errors.push('HTTP '+response.status()+' '+new URL(response.url()).pathname)});await page.clock.setFixedTime(new Date('2026-10-03T12:00:00Z'));
 const visit=async(url:string)=>{await page.waitForLoadState('networkidle');await page.goto(url);await page.waitForLoadState('networkidle');};
 const audit=async()=>page.evaluate(()=>{
  const root=document.querySelector('[data-reference-slice]')!;
  const visibility={test(e:Element){if(!e.getClientRects().length)return false;for(let p=e.parentElement;p;p=p.parentElement){if(p.tagName==='DETAILS'&&!p.hasAttribute('open')&&!p.querySelector(':scope>summary')?.contains(e))return false;}return true;}};
  const text=[] as {label:string;size:number;weight:number;color:string;background:string}[];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let n:Node|null;while((n=walker.nextNode())){if(!n.textContent?.trim())continue;const e=n.parentElement!;if(!visibility.test(e))continue;const css=getComputedStyle(e);let bg=e,background='rgb(255, 255, 255)';while(bg){const c=getComputedStyle(bg).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){background=c;break;}bg=bg.parentElement!;}text.push({label:n.textContent.trim().slice(0,100),size:parseFloat(css.fontSize),weight:Number(css.fontWeight),color:css.color,background});}
  const controls=Array.from(root.querySelectorAll('button,summary')).filter(visibility.test).map(e=>({label:e.textContent?.trim(),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}));
  return {text,controls,width:root.getBoundingClientRect().width};
 });
 const luminance=(color:string)=>{const channels=(color.match(/[\d.]+/g)??[]).slice(0,3).map(Number).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
 const capture=async(label:string)=>{
  if(process.env.BD_REFERENCE_BASELINE!=='1'&&await page.locator('.bd-score-ring').count()){await page.locator('.bd-score-ring[data-score-shown=true]').waitFor();await page.locator('.bd-score-fill').evaluateAll(async elements=>{await Promise.all(elements.flatMap(e=>e.getAnimations().map(a=>a.finished)));});}
  const dimensions=await page.evaluate(()=>({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.client+1,JSON.stringify(dimensions));
  const scope=await audit();if(process.env.BD_REFERENCE_BASELINE!=='1'){
   assert.ok(width===390||scope.width>width*.65,'Reference surface must use tablet/desktop width');
   for(const c of scope.controls)assert.ok(c.height>=43.5&&c.width>=43.5,JSON.stringify(c));
   for(const t of scope.text){const a=luminance(t.color),b=luminance(t.background),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(contrast>=((t.size>=24||t.size>=18.66&&t.weight>=700)?3:4.5),JSON.stringify({contrast,...t}));assert.ok([400,500,600,700].includes(t.weight),JSON.stringify(t));assert.ok(t.size>=12,JSON.stringify(t));}
  }
  writeFileSync(`${out}/${width}-${label}-accessibility.json`,JSON.stringify(scope,null,2));
  await page.screenshot({path:`${out}/${width}-${label}.png`,fullPage:false});
  await page.screenshot({path:`${out}/${width}-${label}-full.png`,fullPage:true});
 };

 try{
  const authoritative={health:(await r.readHealth()).data.businessHealthSnapshot,answers:Object.fromEntries(await Promise.all(CURATED_QUESTIONS.map(async q=>[q.id,await r.ask(q.id)])))};
  writeFileSync(out+'/'+width+'-authoritative.json',JSON.stringify(authoritative,null,2));
  for(const route of ['home','health']){await visit(base+'/'+route);await page.locator('.bd-management-queue [data-management-id]').first().waitFor({timeout:30000});await capture(route);
   if(route==='home'&&process.env.BD_REFERENCE_BASELINE!=='1')assert.deepEqual(await page.locator('.bd-score-ring').evaluate(async ring=>{
    const fill=ring.querySelector('.bd-score-fill')!,style=(ring as HTMLElement).style,offset=style.getPropertyValue('--bd-score-offset');
    style.setProperty('--bd-score-offset','42');await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    const result={animations:fill.getAnimations().length,offset:parseFloat(getComputedStyle(fill).strokeDashoffset)};
    style.setProperty('--bd-score-offset',offset);return result;
   }),{animations:0,offset:42},'Score changes after first appearance must render immediately without replay');
  }
  await visit(base+'/analysis?venueId='+r.venueId);
  await page.locator('[data-curated-question=stock]').waitFor({timeout:30000});assert.equal(await page.locator('[data-curated-question]').count(),7);await capture('doctor-before');
  await page.locator('[data-curated-question=stock]').click();await page.locator('[data-curated-answer=stock]').waitFor();await capture('doctor-after');
  if(process.env.BD_REFERENCE_BASELINE!=='1'){
   assert.equal(await page.locator('[data-curated-question]').count(),0);
   assert.ok(await page.locator('.bd-doctor-heading').evaluate(e=>e===document.activeElement));
   assert.ok((await page.locator('.bd-doctor-heading').boundingBox())!.y<150);
   await page.getByRole('button',{name:'Другой вопрос',exact:true}).click();assert.equal(await page.locator('[data-curated-question]').count(),7);
   await page.locator('[data-curated-question=attention]').focus();await page.keyboard.press('Tab');assert.ok(await page.locator('[data-curated-question]:focus').evaluate(e=>getComputedStyle(e).outlineStyle!=='none'));
   await page.emulateMedia({reducedMotion:'reduce'});await visit(base+'/home');await page.locator('.bd-score-ring[data-score-shown=true]').waitFor();await page.locator('.bd-score-fill').waitFor();assert.equal(await page.locator('.bd-score-fill').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');assert.equal(await page.locator('.bd-score-fill').evaluate(e=>e.getAnimations().length),0);await visit(base+'/analysis?venueId='+r.venueId);await page.locator('[data-curated-question=stock]').waitFor();
   // A separately isolated partial-stock scenario proves honest action absence.
   r.seed('bd_opening_stock_v1',[]);r.seed('bd_inventory_snapshots',[]);await page.evaluate(()=>window.dispatchEvent(new CustomEvent('bd:store-updated')));
   await page.locator('[data-curated-question=stock]').click();await page.locator('[data-curated-answer=stock]').waitFor();
   const unknown=await r.ask('stock');assert.equal(unknown.nextActions.length,0);await page.getByText('Действие пока не подтверждено.',{exact:true}).waitFor();await capture('doctor-after-unknown');
   await visit(base+'/analysis?venueId='+r.venueId+'&returnTo=home');await page.locator('[data-curated-question=stock]').click();await page.locator('[data-curated-answer=stock]').waitFor();await page.getByRole('button',{name:'На главную',exact:true}).click();await page.waitForURL(url=>url.pathname==='/home');
  }
  await page.waitForLoadState('networkidle');assert.deepEqual(errors,[]);results.push({width,status:'PASS'});
 }catch(error){await page.screenshot({path:out+'/'+width+'-failure.png',fullPage:true});writeFileSync(out+'/'+width+'-failure.txt',String(error));throw error;}finally{await context.close();await new Promise<void>(done=>server.close(()=>done()));r.close()}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2))}
console.log(JSON.stringify(results));
