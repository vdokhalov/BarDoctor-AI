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
const out=(process.env.BD_MANAGEMENT_LOOP_OUT??'outputs/management-loop-targeted')+'/'+engine;mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url),{resolveBrowserExecutable}=require('./browser-runtime.cjs');
// Existing project runtime only. No browser installation or infrastructure repair.
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:['--no-sandbox','--disable-setuid-sandbox']});
const results:unknown[]=[];
try{for(const width of process.env.BD_QA_WIDTHS?.split(',').map(Number)??[390,820,1280]){
 const r=await curatedDoctorFixture({products:'./app/api/inventory/products/route',quickCreate:'./app/api/nomenclature/quick-create/route',confirm:'./app/api/purchases/confirm/route',updatePurchase:'./app/api/purchases/update/route',mappings:'./app/api/purchases/mappings/route',procurement:'./app/api/procurement/overview/route',opening:'./app/api/inventory/opening/route',evidence:'./app/api/evidence/resolve/route',taxonomy:'./app/api/nomenclature/taxonomy/route'});
 r.seed('bd_suppliers',[{id:'qa-working-supplier',name:'QA действующий поставщик',venueId:r.venueId,type:'wholesale',status:'active',currency:'MDL'}]);
 const routes:Record<string,string>={'/api/auth/bootstrap':'bootstrap','/api/restaurants/me':'restaurant','/api/users/me':'users','/api/venues':'venues','/api/store':'bulkStore','/api/business-health':'health','/api/business-health/verify':'verifyAction','/api/assortment/overview':'overview','/api/operational-days':'days','/api/shifts/close':'closeReport','/api/inventory/counts':'counts','/api/write-offs':'writeoffs','/api/access/active-venue':'activeVenue','/api/ai/diagnosis':'doctor','/api/ai/curated':'curated','/api/purchases/confirm':'confirm','/api/purchases/update':'updatePurchase','/api/purchases/mappings':'mappings','/api/procurement/overview':'procurement','/api/inventory/opening':'opening','/api/inventory/products':'products','/api/nomenclature/quick-create':'quickCreate','/api/nomenclature/taxonomy':'taxonomy','/api/evidence/resolve':'evidence','/api/management/cost-signals':'costs','/api/management/cost-signals/evaluate':'evaluateCost'};
  const bCreated=await r.api.venues.POST(r.requestAction('/api/venues','POST',{name:'QA B — отдельная кофейня',businessType:'cafe',country:'Test',city:'Isolated',currency:'MDL',timezone:'UTC'}));assert.equal(bCreated.status,201);
  const bVenue=(await bCreated.json() as {activeVenueId:number}).activeVenueId,bAccount=Number(r.sqlite.prepare('SELECT data_account_id FROM venues WHERE id=?').get(bVenue)!.data_account_id);
  const remap=(value:unknown):unknown=>Array.isArray(value)?value.map(remap):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='venueId'?bVenue:remap(v)])):typeof value==='string'?value.replaceAll('QA Стаканы','QA B Стаканы'):value;
  for(const row of r.sqlite.prepare("SELECT store_key,data_json FROM domain_data WHERE account_id=? AND store_key NOT LIKE '__bd_p4a_cost_%'").all(r.account))r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(bAccount,row.store_key,JSON.stringify(remap(JSON.parse(String(row.data_json)))),'2026-10-03T12:00:00Z');
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url||'/',`http://${req.headers.host}`),chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
  const cost=url.pathname.match(/^\/api\/management\/cost-signals\/([^/]+)(\/verify)?$/);
  const key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1],name=routes[url.pathname]??(cost?(cost[2]?'verifyCost':'detail'):key?'store':undefined);
  const request=new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})});let response:Response;
  if(name==='doctor')response=await r.api.doctor.handleDiagnosis(request);
  else if(name&&r.api[name])response=await r.api[name][req.method||'GET'](request,{params:Promise.resolve({key,action:'curated',id:cost?.[1]?decodeURIComponent(cost[1]):undefined})} as never);
  else if(!url.pathname.startsWith('/api/')&&!extname(url.pathname))response=barDoctorResponse();
  else{const file=resolve('public','.'+url.pathname);response=file.startsWith(resolve('public')+'/')&&existsSync(file)?new Response(readFileSync(file),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'} as Record<string,string>)[extname(file)]||'application/octet-stream'}}):new Response(null,{status:404});}
  if(url.pathname.startsWith('/api/'))console.info(JSON.stringify({width,path:url.pathname,method:req.method,status:response.status}));
  if(url.pathname==='/api/purchases/confirm')writeFileSync(out+'/'+width+'-purchase-save.json',JSON.stringify({status:response.status,request:JSON.parse(body.toString()),response:await response.clone().json()},null,2));
  if(url.pathname==="/api/shifts/close")writeFileSync(out+"/"+width+"-day-save.json",JSON.stringify({request:JSON.parse(body.toString()),status:response.status,response:await response.clone().json()},null,2));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);res.writeHead(500);res.end('isolated QA failure')}});
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1024:900},isMobile:width===390,hasTouch:width===390});
 await context.addInitScript(({user,venue})=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);if(!localStorage.getItem('bd_active_venue_id'))localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.user,venue:r.venueId});
 // Freeze the QA business date only. Native timers preserve document teardown and toast exits.
 // Playwright timer shims can replay callbacks from a departed document in WebKit.
 await context.addInitScript({content:`(()=>{const NativeDate=Date,time=Date.parse('2026-10-03T12:00:00Z');function FixtureDate(...args){if(new.target)return Reflect.construct(NativeDate,args.length?args:[time],new.target);return new NativeDate(time).toString();}FixtureDate.prototype=NativeDate.prototype;Object.setPrototypeOf(FixtureDate,NativeDate);FixtureDate.now=()=>time;globalThis.Date=FixtureDate;})();`});
 await context.addInitScript({content:`(()=>{if(globalThis.__qaFetchTrackingInstalled)return;Object.defineProperty(globalThis,'__qaFetchTrackingInstalled',{value:true});let pending=0;Object.defineProperty(globalThis,'__qaPendingApi',{get:()=>pending});const nativeFetch=globalThis.fetch;globalThis.fetch=function(...args){const tracked=new URL(String(args[0]?.url??args[0]),location.href).pathname.startsWith('/api/');if(!tracked)return nativeFetch.apply(this,args);pending++;return nativeFetch.apply(this,args).then(async response=>{await response.clone().arrayBuffer();return response;}).finally(()=>pending--);};})();`});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>{errors.push(error.message);console.error('LOOP PAGE ERROR',page.url(),error.stack);});page.on('response',response=>{if(response.status()>=500)errors.push('HTTP '+response.status()+' '+new URL(response.url()).pathname)});
 // Await real API bodies and a settled document before forcing navigation.
 const settle=async()=>{for(const frame of page.frames()){if(!/^https?:/.test(frame.url())||frame.isDetached())continue;try{await frame.waitForFunction(()=>{const g=globalThis as typeof globalThis & {__qaPendingApi?:number;__bdBootstrapPending?:boolean;__qaReadySignature?:string;__qaReadySince?:number};const ready=g.__qaPendingApi===0&&g.__bdBootstrapPending!==true&&document.documentElement.getAttribute('data-bd-startup-pending')!=='true',signature=location.href+'\n'+document.body.innerText,now=performance.now();if(!ready||g.__qaReadySignature!==signature){g.__qaReadySignature=signature;g.__qaReadySince=now;return false;}return now-(g.__qaReadySince??now)>=300;},null,{timeout:60000,polling:100});}catch(error){if(!frame.isDetached())throw error;}}};
 const capture=async(label:string)=>{const dimensions=await page.evaluate(()=>({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.client+1,JSON.stringify(dimensions));await page.screenshot({path:`${out}/${width}-${label}.png`,fullPage:true});};
 const stage=async(label:string)=>{const health=await r.readHealth(),attention=await r.ask('attention'),next=await r.ask('next');writeFileSync(out+'/'+width+'-'+label+'-state.json',JSON.stringify({health,attention,next,cost:await r.ask('cost'),stock:await r.ask('stock'),shifts:await r.ask('shifts'),expenses:await r.ask('expenses')},null,2));};
 const api=async(path:string,body:object,method='POST')=>page.evaluate(async({path,body,method})=>{const response=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Session-Email':localStorage.getItem('bd_session')!,'X-Session-Token':localStorage.getItem('bd_session_token')!,'X-Venue-Id':localStorage.getItem('bd_active_venue_id')!},body:JSON.stringify(body)});if(!response.ok)throw Error(await response.text());window.dispatchEvent(new CustomEvent('bd:store-updated'));return response.json()},{path,body,method});
 try{
  const assertHome=async(label:string)=>{
   const top=(await r.readHealth()).data.businessHealthSnapshot.managementTopActions[0];
   const attention=await r.ask('attention'),next=await r.ask('next');
   assert.equal(attention.facts[0]?.id,String(top.managementId??top.recommendationId));assert.equal(next.facts[0]?.id,attention.facts[0]?.id);
   await settle();await page.goto(base+'/home');await page.locator('.bd-management-queue li').first().waitFor();
   assert.equal(await page.locator('.bd-management-queue li').first().getAttribute('data-management-id'),attention.facts[0].id);
   assert.equal(await page.locator('[data-bd-home-attention]').count(),0);
   await page.locator('.bd-home-financial-details').waitFor({state:'visible'});assert.equal(await page.locator('.bd-home-financial-details').evaluate(e=>e.tagName==='DETAILS'&&!e.hasAttribute('open')),false,'Legacy Finance must be open by default');
   const compare=await page.locator('.bd-home-money-compare').innerText();assert.ok(!compare.includes('%'),compare);
   if(label==='initial'){assert.equal(await page.locator('.bd-home-money-value').innerText(),'Нет расчёта');assert.equal((await r.ask('expenses')).facts.find(f=>f.id==='registered-payroll')?.kind,'UNKNOWN');}
   await capture('home-'+label);
   await settle();await page.goto(base+'/health');await page.locator('.bd-management-queue li').first().waitFor();assert.equal(await page.locator('.bd-management-queue li').first().getAttribute('data-management-id'),attention.facts[0].id);
  };
  await assertHome('initial');
  await settle();await page.goto(base+'/analysis?venueId='+r.venueId+'&doctorQuestion=attention');
  const panel=page.locator('.bd-curated-doctor');await panel.locator('[data-curated-answer=attention]').waitFor({timeout:30000});
  await panel.getByRole('button',{name:'Другой вопрос',exact:true}).click();
  assert.equal(await panel.locator('[data-curated-question]').count(),7);assert.equal(await panel.locator('input,textarea').count(),0);
  const chooseQuestion=async(id:string)=>{if(await panel.locator('[data-curated-answer]').count())await panel.getByRole('button',{name:'Другой вопрос',exact:true}).click();await panel.locator(`[data-curated-question=${id}]`).click();};
  const examples:Record<string,CuratedAnswer>={};
  for(const question of CURATED_QUESTIONS){
   await chooseQuestion(question.id);await panel.locator(`[data-curated-answer=${question.id}]`).waitFor();
   const a=await r.ask(question.id);examples[question.id]=a;
   assert.deepEqual(await panel.locator('[data-curated-fact]').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-curated-fact'))),a.facts.map(f=>f.id));
   for(const fact of a.facts)assert.equal(await panel.locator('[data-curated-fact]').filter({has:page.locator('strong',{hasText:fact.label})}).first().getAttribute('data-curated-kind'),fact.kind);
   await capture(question.id);writeFileSync(out+'/'+width+'-'+question.id+'-dom.txt',await page.locator('body').innerText());await settle();await page.reload();await panel.locator(`[data-curated-answer=${question.id}]`).waitFor();assert.deepEqual((await r.ask(question.id)).facts,a.facts);
  }
  writeFileSync(out+'/'+width+'-answers.json',JSON.stringify(examples,null,2));
  assert.deepEqual(examples.attention.facts.map(f=>f.id),examples.attention.canonicalPriorityIds);assert.equal(examples.next.facts[0].id,examples.attention.facts[0].id);
  // All canonical CTAs preserve the question, including cost details and the critical task.
  for(const question of ['attention','next','tasks','cost'] as const){
   await chooseQuestion(question);await panel.locator(`[data-curated-answer=${question}]`).waitFor();const before=await r.ask(question);const action=before.nextActions[0];assert.ok(action);
   await panel.locator('[data-curated-action]').first().click();await page.waitForURL(url=>url.pathname===new URL(action.path,base).pathname);
   if(question==='cost'){await page.locator('[data-cost-surface=health]').getByRole('button',{name:'Открыть техкарту',exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('signalId'),new URL(action.path,base).searchParams.get('signalId'));}
   await capture('action-'+question);writeFileSync(out+'/'+width+'-action-'+question+'-dom.txt',await page.locator('body').innerText());await settle();await page.goBack();await panel.locator(`[data-curated-answer=${question}]`).waitFor();await panel.locator('[data-curated-action]').first().click();await page.waitForURL(url=>url.pathname===new URL(action.path,base).pathname);
   await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator(`[data-curated-answer=${question}]`).waitFor();assert.deepEqual((await r.ask(question)).facts,before.facts);
  }
  // Expenses have an existing destination and a scoped return, without a fabricated verification signal.
  await chooseQuestion('expenses');await panel.locator('[data-curated-answer=expenses]').waitFor();await panel.getByRole('button',{name:'Открыть зарегистрированные расходы →',exact:true}).click();await page.waitForURL(url=>url.pathname==='/finance');
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=expenses]').waitFor();
  await chooseQuestion('next');await panel.locator('[data-curated-answer=next]').waitFor();
  const taskTarget=(await r.ask('next')).nextActions[0];const taskId=new URL(taskTarget.path,base).searchParams.get('taskId');assert.ok(taskId);
  await panel.locator('[data-curated-action]').first().click();await page.waitForURL(u=>u.pathname==='/tasks');await page.getByText('Проверить безопасное состояние',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('taskId'),taskId);await capture('overdue-task-visible');
  await settle();await page.reload();await page.getByText('Проверить безопасное состояние',{exact:true}).waitFor();
  const completedWrite=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/store/bd_tasks'&&response.request().method()==='PUT'&&response.ok()&&Boolean(response.request().postData()?.includes('\"status\":\"completed\"')));
  await page.getByRole('button',{name:'Выполнить',exact:true}).click();await completedWrite;
  const tasks=r.read('bd_tasks');assert.equal(tasks.find((row:Record<string,unknown>)=>row.id===taskId)?.status,'completed');
  assert.ok((await r.readHealth()).data.businessHealthSnapshot.managementQueue.some(q=>q.linkedTaskId===taskId),'Completion without a verified outcome must not clear the underlying problem');
  // Owner QA records the checked outcome through the existing authenticated
  // domain writer. This is not inferred from navigation or task completion.
  await api('/api/store/bd_tasks',{data:tasks.map((row:Record<string,unknown>)=>row.id===taskId?{...row,actualResult:{status:'helped',checkedAt:'2026-10-03T12:00:00Z',summary:'QA проверка безопасного состояния выполнена'},outcomeStatus:'helped'}:row),reason:'QA authoritative verified task outcome'},'PUT');
  assert.ok(!(await r.readHealth()).data.businessHealthSnapshot.managementQueue.some(q=>q.linkedTaskId===taskId));
  await settle();await page.reload();await page.getByText('Проверить безопасное состояние',{exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('tab'),'history');await capture('completed-stale-task-history');
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=next]').waitFor();assert.equal((await r.ask('next')).facts[0].label,'Проверить критическое происшествие');
  await assertHome('next-after-task');await settle();await page.goto(base+'/analysis?venueId='+r.venueId+'&doctorQuestion=shifts');await panel.locator('[data-curated-answer=shifts]').waitFor();
  await stage('before-corrections');
  // Day correction uses the Phase 4B editor/writer and authoritative verification, then returns to this question.
  await chooseQuestion('shifts');await panel.locator('[data-curated-answer=shifts]').waitFor();await panel.getByRole('button',{name:'Заполнить отчёт дня →',exact:true}).click();await page.waitForURL(url=>url.pathname==='/shifts');
  const id='health:'+r.venueId+':day:2026-10-02';assert.equal((await r.verifyAction(id)).verification.result,'ACTIVE');await page.locator('[data-bd-shift-closing]').waitFor();await capture('day-editor');await stage('day-open-only');
  const editor=page.locator('[data-bd-shift-closing]');for(let step=0;step<4;step++){if(step===1)await editor.getByRole('button',{name:/QA Бариста/}).click();await editor.getByRole('button',{name:'Далее',exact:true}).click();}await editor.getByRole('button',{name:/Сохранить|Закрыть смену/}).filter({visible:true}).click();
  await page.waitForURL(url=>url.pathname==='/health'&&url.searchParams.get('checkedAction')===id,{timeout:30000});await page.locator('[data-management-verification=CONDITION_CLEARED]').waitFor();await capture('day-verified');await stage('day-authoritatively-saved');
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=shifts]').waitFor();assert.equal((await r.ask('shifts')).facts[0].status,'COMPLETE');await settle();await page.reload();await panel.locator('[data-curated-answer=shifts]').waitFor();await stage('day-reload');
  // A saved inventory draft is not verified; only finalization changes the authoritative stock fact.
  await chooseQuestion('stock');await panel.locator('[data-curated-answer=stock]').waitFor();const stock=(await r.ask('stock')).facts[0];await panel.getByRole('button',{name:'Проверить эту позицию →',exact:true}).click();await page.waitForURL(url=>url.pathname==='/warehouse');await page.locator('.bd-warehouse-product-sheet').waitFor();await capture('stock-context');writeFileSync(out+'/'+width+'-stock-context-dom.txt',await page.locator('body').innerText());
  const stockActionUrl=page.url();await settle();await page.goBack();await panel.locator('[data-curated-answer=stock]').waitFor();await page.locator('.bd-warehouse-product-sheet').waitFor({state:'hidden'});await settle();await page.goForward();await page.waitForURL(u=>u.pathname==='/warehouse'&&u.searchParams.has('product'));await page.locator('.bd-warehouse-product-sheet').waitFor();
  await settle();await page.locator('.bd-warehouse-product-sheet').getByRole('button',{name:'Закрыть карточку товара',exact:true}).click();
  await page.locator('.bd-warehouse-product-sheet').waitFor({state:'hidden'});
  assert.equal(new URL(page.url()).searchParams.get('healthAction'),stock.id);assert.equal(new URL(page.url()).searchParams.has('product'),false);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await settle();await page.reload();await page.locator('[data-management-context]').waitFor();
  assert.equal(await page.locator('.bd-warehouse-product-sheet').count(),0);assert.equal((await r.verifyAction(stock.id)).verification.result,'ACTIVE');await capture('stock-dismiss-retains-context');
  await page.getByRole('button',{name:/Провести инвентаризацию/}).click();await page.getByRole('button',{name:'Начать подсчёт',exact:true}).click();
  const quantityInputs=page.getByRole('spinbutton',{name:'Фактический остаток QA Стаканы',exact:true});await quantityInputs.first().waitFor();
  // AnimatePresence may retain the exiting setup panel while the actual
  // document panel mounts. Use the current document, not the exiting controls.
  await quantityInputs.last().fill('8');
  await page.getByRole('button',{name:'Перейти к результатам',exact:true}).last().click();await page.getByRole('button',{name:'Завершить инвентаризацию',exact:true}).last().waitFor();
  assert.equal((await r.verifyAction(stock.id)).verification.result,'ACTIVE');await stage('stock-draft-not-resolved');await capture('inventory-draft-not-resolution');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Завершить инвентаризацию',exact:true}).last().click();
  await page.waitForURL(url=>url.pathname==='/health');await page.locator('[data-management-verification=CONDITION_CLEARED]').waitFor();
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=stock]').waitFor();assert.equal((await r.ask('stock')).facts[0].value,8);await capture('stock-verified');await stage('stock-authoritatively-finalized');
  await settle();await page.reload();await panel.locator('[data-curated-answer=stock]').waitFor();assert.equal((await r.ask('stock')).facts[0].value,8);
  await stage('stock-reload');

  // The same working QA venue: correct the tracked UNKNOWN-cost position using the real purchase UI.
  await chooseQuestion('cost');await panel.locator('[data-curated-answer=cost]').waitFor();
  const costBefore=await r.ask('cost');assert.equal(costBefore.facts[0].kind,'UNKNOWN');await stage('cost-before-correction');
  await panel.locator('[data-curated-action]').first().click();await page.waitForURL(url=>url.pathname==='/health'&&url.searchParams.has('signalId'));const costId=new URL(page.url()).searchParams.get('signalId')!;
  await page.getByRole('button',{name:'Добавить закупку',exact:true}).first().waitFor();await capture('cost-signal-before-purchase');
  await page.getByRole('button',{name:'Добавить закупку',exact:true}).first().click();await page.waitForURL(url=>url.pathname==='/suppliers');
  assert.equal(new URL(page.url()).searchParams.get('signalId'),costId);await page.getByRole('button',{name:/Вручную/}).click();const purchase=page.getByRole('dialog',{name:'Проверка прихода'});await purchase.waitFor();await capture('cost-purchase-open');
  assert.equal((await r.ask('cost')).facts[0].kind,'UNKNOWN');await stage('cost-open-not-resolved');
  await purchase.getByPlaceholder('Найти существующего поставщика').fill('QA действующий поставщик');await purchase.locator('.bd-purchase-supplier-v356 button').filter({hasText:'QA действующий поставщик'}).first().click();
  await purchase.locator('label').filter({hasText:'Цена за единицу'}).locator('input').fill('37');await purchase.getByLabel('Количество',{exact:true}).fill('10');
  await capture('cost-purchase-ready');assert.equal((await r.ask('cost')).facts[0].kind,'UNKNOWN');
  if(width===390){await page.setViewportSize({width,height:430});const post=purchase.getByRole('button',{name:'Провести приход',exact:true});await post.scrollIntoViewIfNeeded();await capture('cost-purchase-keyboard-reduced');const rect=await post.boundingBox();assert.ok(rect&&rect.height>=40);await page.setViewportSize({width,height:844});}
  await purchase.getByRole('button',{name:'Провести приход',exact:true}).click();await page.waitForURL(url=>url.pathname==='/health');await page.getByRole('heading',{name:'Проверено: себестоимость рассчитана',exact:true}).first().waitFor();await capture('cost-authoritatively-verified');await stage('cost-authoritatively-purchased');
  await page.getByRole('button',{name:'Вернуться к вопросу Doctor →',exact:true}).click();await panel.locator('[data-curated-answer=cost]').waitFor();assert.equal((await r.ask('cost')).facts[0].value,37);assert.notEqual((await r.ask('cost')).facts[0].kind,'UNKNOWN');await settle();await page.reload();await panel.locator('[data-curated-answer=cost]').waitFor();assert.equal((await r.ask('cost')).facts[0].value,37);await stage('cost-reload');await capture('cost-doctor-after-reload');
  assert.equal((await r.ask('stock')).facts.find(f=>f.id===stock.id)?.value,8);assert.equal((await r.verifyAction(stock.id)).verification.result,'CONDITION_CLEARED');
  await settle();await page.goto(stockActionUrl);await page.locator('[data-management-context]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-management-context]')?.textContent?.includes('исходное условие проблемы устранено'));
  assert.equal(await page.locator('.bd-warehouse-product-sheet').count(),0);await capture('resolved-stale-stock-url');await settle();await page.reload();await page.waitForFunction(()=>document.querySelector('[data-management-context]')?.textContent?.includes('исходное условие проблемы устранено'));assert.equal(await page.locator('.bd-warehouse-product-sheet').count(),0);
  await assertHome('continue-after-corrections');
  await settle();await page.goto(base+'/health');await page.locator('.bd-management-queue li').first().waitFor();await capture('all-three-corrections-health');await settle();await page.goto(base+'/home');await page.locator('[data-bd-home-health-index]').waitFor();await capture('all-three-corrections-home');
  // A second operating venue has independent source identity. Old action URLs
  // must not resurrect a foreign product sheet after an actual venue switch.
  await settle();await page.locator('[data-bd-venue-trigger]').click();await page.locator('.bd-venue-row').filter({hasText:'QA B — отдельная кофейня'}).click();await page.waitForFunction(v=>Number(localStorage.getItem('bd_active_venue_id'))===v,bVenue);await page.waitForURL(u=>u.pathname==='/home'&&u.searchParams.get('venue')===String(bVenue));await settle();
  await settle();await page.goto(stockActionUrl);await page.locator('[data-management-context]').waitFor();assert.equal(await page.locator('.bd-warehouse-product-sheet').count(),0);assert.ok((await page.locator('[data-management-context]').innerText()).includes('Контекст другого заведения'));
  const foreign=await r.api.verifyAction.GET(r.requestAction('/api/business-health/verify?actionId='+encodeURIComponent(stock.id),'GET',undefined,r.user,bVenue));assert.equal(foreign.status,404);await capture('stale-stock-context-after-venue-switch');
  await settle();await page.locator('[data-bd-venue-trigger]').click();await page.locator('.bd-venue-row').filter({hasText:'QA Phase 4C — работающая кофейня'}).click();await page.waitForFunction(v=>Number(localStorage.getItem('bd_active_venue_id'))===v,r.venueId);await page.waitForURL(u=>u.pathname==='/warehouse'&&u.searchParams.get('venue')===String(r.venueId)&&u.searchParams.size===1);await settle();await assertHome('venue-return');
  // Every question uses server scope. A stale deep link after switching to another venue cannot leak the original facts.
  const other=await r.register('other-doctor-'+width+'@isolated.test');const response=await r.api.curated.GET(r.requestAction('/api/ai/curated?question=attention','GET',undefined,other,r.venueId),{params:Promise.resolve({action:'curated'})} as never);assert.equal(response.status,401);
  assert.deepEqual(errors,[]);results.push({width,height:width===390?844:width===820?1024:900,browser:engine,status:'PASS',questions:7,dayVerified:true,stockVerified:true,expensesReturn:true,canonicalEqual:true,taskVisible:true,taskVerifiedOutcome:true,inventoryUi:true,stockStableAfterUnrelatedPurchase:true,financialUnknownHonest:true,staleStockVenueSwitch:true,ownerUAT:false});
 }catch(error){if(process.env.CI)console.error(`::error title=Phase 4 integrated loop ${engine} ${width}::${String(error).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A')}`);await capture('failure');writeFileSync(out+'/'+width+'-failure.txt',String(error));writeFileSync(out+'/'+width+'-failure-dom.txt',await page.locator('body').innerText());await stage('failure-authoritative');throw error;}finally{await context.close();await new Promise<void>(done=>server.close(()=>done()));r.close()}
}}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2))}
console.log(JSON.stringify(results));
