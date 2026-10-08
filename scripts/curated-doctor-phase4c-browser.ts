import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {CURATED_QUESTIONS,type CuratedAnswer} from '../lib/bardoctor/curated-doctor-contracts';
import {curatedDoctorFixture} from '../tests/helpers/curated-doctor-fixture';
import {barDoctorResponse} from '../app/bar-doctor-response';
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium';
const out='outputs/curated-doctor-phase4c/'+engine;mkdirSync(out,{recursive:true});
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
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=500)errors.push('HTTP '+response.status()+' '+new URL(response.url()).pathname)});await page.clock.install({time:new Date('2026-10-03T12:00:00Z')}); // Let toast exit animations advance while retaining the QA business date.
 const capture=async(label:string)=>{const dimensions=await page.evaluate(()=>({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.client+1,JSON.stringify(dimensions));await page.screenshot({path:`${out}/${width}-${label}.png`,fullPage:true});};
 const api=async(path:string,body:object,method='POST')=>page.evaluate(async({path,body,method})=>{const response=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Session-Email':localStorage.getItem('bd_session')!,'X-Session-Token':localStorage.getItem('bd_session_token')!,'X-Venue-Id':localStorage.getItem('bd_active_venue_id')!},body:JSON.stringify(body)});if(!response.ok)throw Error(await response.text());window.dispatchEvent(new CustomEvent('bd:store-updated'));return response.json()},{path,body,method});
 try{
  await page.goto(base+'/analysis?venueId='+r.venueId+'&doctorQuestion=attention');
  const panel=page.locator('.bd-curated-doctor');await panel.locator('[data-curated-answer=attention]').waitFor({timeout:30000});
  assert.equal(await panel.locator('[data-curated-question]').count(),7);assert.equal(await panel.locator('input,textarea').count(),0);
  const chooseQuestion=async(id:string)=>{await panel.locator(`[data-curated-question=${id}]`).click();};
  const examples:Record<string,CuratedAnswer>={};
  for(const question of CURATED_QUESTIONS){
   await chooseQuestion(question.id);await panel.locator(`[data-curated-answer=${question.id}]`).waitFor();
   const a=await r.ask(question.id);examples[question.id]=a;
   assert.deepEqual(await panel.locator('[data-curated-fact]').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-curated-fact'))),a.facts.map(f=>f.id));
   for(const fact of a.facts)assert.equal(await panel.locator('[data-curated-fact]').filter({has:page.locator('strong',{hasText:fact.label})}).first().getAttribute('data-curated-kind'),fact.kind);
   await capture(question.id);await page.reload();await panel.locator(`[data-curated-answer=${question.id}]`).waitFor();assert.deepEqual((await r.ask(question.id)).facts,a.facts);
  }
  writeFileSync(out+'/'+width+'-answers.json',JSON.stringify(examples,null,2));
  assert.deepEqual(examples.attention.facts.map(f=>f.id),examples.attention.canonicalPriorityIds);assert.equal(examples.next.facts[0].id,examples.attention.facts[0].id);
  // All canonical CTAs preserve the question, including cost details and the critical task.
  for(const question of ['attention','next','tasks','cost'] as const){
   await chooseQuestion(question);await panel.locator(`[data-curated-answer=${question}]`).waitFor();const before=await r.ask(question);const action=before.nextActions[0];assert.ok(action);
   await panel.locator('[data-curated-action]').first().click();await page.waitForURL(url=>url.pathname===new URL(action.path,base).pathname);
   if(question==='cost'){await page.locator('[data-cost-surface=health]').getByRole('button',{name:'Открыть техкарту',exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('signalId'),new URL(action.path,base).searchParams.get('signalId'));}
   await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator(`[data-curated-answer=${question}]`).waitFor();assert.deepEqual((await r.ask(question)).facts,before.facts);
  }
  // Expenses have an existing destination and a scoped return, without a fabricated verification signal.
  await chooseQuestion('expenses');await panel.locator('[data-curated-answer=expenses]').waitFor();await panel.getByRole('button',{name:'Открыть зарегистрированные расходы →',exact:true}).click();await page.waitForURL(url=>url.pathname==='/finance');
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=expenses]').waitFor();
  // Day correction uses the Phase 4B editor/writer and authoritative verification, then returns to this question.
  await chooseQuestion('shifts');await panel.locator('[data-curated-answer=shifts]').waitFor();await panel.getByRole('button',{name:'Заполнить отчёт дня →',exact:true}).click();await page.waitForURL(url=>url.pathname==='/shifts');
  const id='health:'+r.venueId+':day:2026-10-02';assert.equal((await r.verifyAction(id)).verification.result,'ACTIVE');await page.locator('[data-bd-shift-closing]').waitFor();await capture('day-editor');
  const editor=page.locator('[data-bd-shift-closing]');for(let step=0;step<4;step++){if(step===1)await editor.getByRole('button',{name:/QA Бариста/}).click();await editor.getByRole('button',{name:'Далее',exact:true}).click();}await editor.getByRole('button',{name:/Сохранить|Закрыть смену/}).filter({visible:true}).click();
  await page.waitForURL(url=>url.pathname==='/health'&&url.searchParams.get('checkedAction')===id,{timeout:30000});await page.locator('[data-management-verification=CONDITION_CLEARED]').waitFor();await capture('day-verified');
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=shifts]').waitFor();assert.equal((await r.ask('shifts')).facts[0].status,'COMPLETE');
  // A saved inventory draft is not verified; only finalization changes the authoritative stock fact.
  await chooseQuestion('stock');await panel.locator('[data-curated-answer=stock]').waitFor();const stock=(await r.ask('stock')).facts[0];await panel.getByRole('button',{name:'Проверить эту позицию →',exact:true}).click();await page.waitForURL(url=>url.pathname==='/warehouse');await page.locator('.bd-warehouse-product-sheet').waitFor();await capture('stock-context');
  const created=await api('/api/inventory/counts',{venueId:r.venueId,action:'create',date:'2026-10-03',scope:{type:'all'}}) as {inventory:{id:string;items:Record<string,unknown>[]}};
  await api('/api/inventory/counts',{venueId:r.venueId,action:'save',id:created.inventory.id,items:created.inventory.items.map(row=>({...row,actual:8}))});assert.equal((await r.verifyAction(stock.id)).verification.result,'ACTIVE');
  await api('/api/inventory/counts',{venueId:r.venueId,action:'finalize',id:created.inventory.id});await page.waitForURL(url=>url.pathname==='/health');await page.locator('[data-management-verification=CONDITION_CLEARED]').waitFor();
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=stock]').waitFor();assert.equal((await r.ask('stock')).facts[0].value,8);await capture('stock-verified');
  await page.reload();await panel.locator('[data-curated-answer=stock]').waitFor();assert.equal((await r.ask('stock')).facts[0].value,8);
  // An untracked cost issue uses the catalogue's real search contract; it does not pretend an editor is open.
  r.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key LIKE '__bd_p4a_cost_%'").run(r.account);
  await chooseQuestion('cost');await panel.locator('[data-curated-answer=cost]').waitFor();await panel.getByRole('button',{name:'Найти позицию в техкартах →',exact:true}).click();await page.waitForURL(url=>url.pathname==='/catalog'&&url.searchParams.get('q')==='QA Чай');
  await page.locator('.bd-assortment-command-v170').getByText('QA Чай',{exact:true}).first().waitFor();await capture('untracked-cost-search');
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=cost]').waitFor();assert.equal((await r.ask('cost')).facts[0].kind,'UNKNOWN');
  // Every question uses server scope. A stale deep link after switching to another venue cannot leak the original facts.
  const other=await r.register('other-doctor-'+width+'@isolated.test');const response=await r.api.curated.GET(r.requestAction('/api/ai/curated?question=attention','GET',undefined,other,r.venueId),{params:Promise.resolve({action:'curated'})} as never);assert.equal(response.status,401);
  assert.deepEqual(errors,[]);results.push({width,height:width===390?844:width===820?1024:900,browser:engine,status:'PASS',questions:7,dayVerified:true,stockVerified:true,expensesReturn:true,canonicalEqual:true,ownerUAT:false});
 }catch(error){await capture('failure');writeFileSync(out+'/'+width+'-failure.txt',String(error));throw error;}finally{await context.close();await new Promise<void>(done=>server.close(()=>done()));r.close()}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2))}
console.log(JSON.stringify(results));
