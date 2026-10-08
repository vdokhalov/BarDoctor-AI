import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {managementActionsFixture} from '../tests/helpers/management-actions-fixture';
import {barDoctorResponse} from '../app/bar-doctor-response';
const out='outputs/management-actions-phase4b';mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url),{resolveBrowserExecutable}=require('./browser-runtime.cjs');
// Existing project runtime only. No browser installation or infrastructure repair.
const browser=await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:['--no-sandbox','--disable-setuid-sandbox']});
const results:unknown[]=[];
try{for(const width of [390,820,1280]){
 const r=await managementActionsFixture();
 const routes:Record<string,string>={'/api/auth/bootstrap':'bootstrap','/api/restaurants/me':'restaurant','/api/users/me':'users','/api/venues':'venues','/api/store':'bulkStore','/api/business-health':'health','/api/business-health/verify':'verifyAction','/api/assortment/overview':'overview','/api/operational-days':'days','/api/shifts/close':'closeReport','/api/inventory/counts':'counts','/api/write-offs':'writeoffs','/api/access/active-venue':'activeVenue','/api/ai/diagnosis':'doctor'};
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url||'/',`http://${req.headers.host}`),chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
  const key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1],name=key?'store':routes[url.pathname];
  const request=new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})});let response:Response;
  if(name==='doctor')response=await r.api.doctor.handleDiagnosis(request);
  else if(name&&r.api[name])response=await r.api[name][req.method||'GET'](request,{params:Promise.resolve({key})} as never);
  else if(!url.pathname.startsWith('/api/')&&!extname(url.pathname))response=barDoctorResponse();
  else{const file=resolve('public','.'+url.pathname);response=file.startsWith(resolve('public')+'/')&&existsSync(file)?new Response(readFileSync(file),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'} as Record<string,string>)[extname(file)]||'application/octet-stream'}}):new Response(null,{status:404});}
  if(url.pathname==="/api/shifts/close")writeFileSync(out+"/"+width+"-day-save.json",JSON.stringify({request:JSON.parse(body.toString()),status:response.status,response:await response.clone().json()},null,2));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);res.writeHead(500);res.end('isolated QA failure')}});
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1024:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript(({user,venue})=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));(window as unknown as Record<string,unknown>).__bdDisableCostManagementPhase4a=true;},{user:r.user,venue:r.venueId});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.clock.setFixedTime(new Date('2026-10-03T12:00:00Z'));
 const capture=async(label:string)=>{const dimensions=await page.evaluate(()=>({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.client+1,JSON.stringify(dimensions));await page.screenshot({path:`${out}/${width}-${label}.png`,fullPage:true});};
 const api=async(path:string,body:object,method='POST')=>page.evaluate(async({path,body,method})=>{const response=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Session-Email':localStorage.getItem('bd_session')!,'X-Session-Token':localStorage.getItem('bd_session_token')!,'X-Venue-Id':localStorage.getItem('bd_active_venue_id')!},body:JSON.stringify(body)});if(!response.ok)throw Error(await response.text());window.dispatchEvent(new CustomEvent('bd:store-updated'));return response.json()},{path,body,method});
 try{
  await page.goto(base+'/health');await page.locator('.bd-health-detail-hero-v332 .bd-home-health-ring').waitFor({timeout:30000});assert.equal(await page.locator('.bd-management-queue').count(),0);
  assert.deepEqual((await r.readHealth()).data.businessHealthSnapshot.managementTopActions.map(row=>row.priority),['critical','critical','high']);await capture('initial-legacy-health');
  await api('/api/store/bd_tasks',{data:[{id:'qa-overdue-task',issueKey:'safety',title:'Проверить безопасное состояние',priority:'critical',approvalStatus:'approved',status:'completed',deadline:'2026-10-02',actualResult:{status:'helped'},updatedAt:'2026-10-03T12:00:00Z'}],reason:'QA verified task'},'PUT');
  await api('/api/store/bd_cases',{data:[{id:'qa-critical',venueId:r.venueId,title:'Проверить критическое происшествие',priority:'critical',status:'resolved'}],reason:'QA verified incident'},'PUT');
  const dayTarget=(await r.readHealth()).data.businessHealthSnapshot.managementQueue.find(row=>row.issueKey==='unclosed-shifts')!.target as {path:string};
  await page.goto(base+dayTarget.path);await page.waitForURL(url=>url.pathname==='/shifts');
  const id='health:'+r.venueId+':day:2026-10-02';const banner=page.locator('[data-management-context]');await banner.waitFor();
  await capture('day-before-editor');writeFileSync(out+'/'+width+'-day-context.txt',await banner.innerText());await page.locator('[data-bd-shift-closing]').waitFor();assert.equal(new URL(page.url()).searchParams.get('healthAction'),id);assert.equal((await r.verifyAction(id)).verification.result,'ACTIVE');await capture('day-editor');
  // The existing editor computes/stores operational payroll; its own save is the writer.
  const editor=page.locator('[data-bd-shift-closing]');for(let step=0;step<4;step++){if(step===1)await editor.getByRole('button',{name:/QA Бариста/}).click();await editor.getByRole('button',{name:'Далее',exact:true}).click();}const save=editor.getByRole('button',{name:/Сохранить|Закрыть смену/}).filter({visible:true});assert.equal(await save.count(),1);await save.click();
  await page.waitForURL(url=>url.pathname==='/health'&&url.searchParams.get('checkedAction')===id,{timeout:30000});await page.locator('[data-management-verification=CONDITION_CLEARED]').waitFor();await capture('day-verified');
  assert.equal((await r.verifyAction(id)).verification.result,'CONDITION_CLEARED');await page.reload();await page.locator('[data-management-verification=CONDITION_CLEARED]').waitFor();
  const stockTarget=(await r.readHealth()).data.businessHealthSnapshot.managementQueue.find(row=>row.issueKey==='stock')!.target as {path:string};await page.goto(base+stockTarget.path);await page.waitForURL(url=>url.pathname==='/warehouse');await page.locator('[data-management-context]').waitFor();writeFileSync(out+"/"+width+"-stock-context.txt",await page.locator("[data-management-context]").innerText());writeFileSync(out+"/"+width+"-stock-state.json",JSON.stringify({search:await page.evaluate(()=>location.search),balances:await page.evaluate(()=>JSON.parse(localStorage.getItem("bd_assortment_v1__venue_"+localStorage.getItem("bd_active_venue_id"))||"null")),health:await r.readHealth()},null,2));await page.locator('.bd-warehouse-product-sheet').waitFor();await capture('stock-context');
  const stock=(await r.readHealth()).data.businessHealthSnapshot.managementQueue.find(row=>row.issueKey==='stock')!;const created=await api('/api/inventory/counts',{venueId:r.venueId,action:'create',date:'2026-10-03',scope:{type:'all'}}) as {inventory:{id:string;items:Record<string,unknown>[]}};
  await api('/api/inventory/counts',{venueId:r.venueId,action:'save',id:created.inventory.id,items:created.inventory.items.map(row=>({...row,actual:8}))});assert.equal((await r.verifyAction(String(stock.managementId))).verification.result,'ACTIVE');
  await api('/api/inventory/counts',{venueId:r.venueId,action:'finalize',id:created.inventory.id});await page.waitForURL(url=>url.pathname==='/health');await page.locator('[data-management-verification=CONDITION_CLEARED]').waitFor();await capture('stock-verified');
  assert.deepEqual(errors,[]);results.push({width,height:width===390?844:width===820?1024:900,status:'PASS',ownerUAT:false});
 }catch(error){await capture("failure");writeFileSync(out+"/"+width+"-failure-verify.json",JSON.stringify(await r.verifyAction("health:"+r.venueId+":day:2026-10-02"),null,2));throw error;}finally{await context.close();await new Promise<void>(done=>server.close(()=>done()));r.close()}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2))}
