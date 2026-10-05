import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {restrictedManagerRuntime} from './qa/restricted-manager-runtime.mjs';

const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const r=await restrictedManagerRuntime(),browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:chromiumArgs});
const results=[],out='outputs/restricted-manager-403/'+(process.env.BD_QA_NEGATIVE_ONLY?'negative-controls':'regression');mkdirSync(out,{recursive:true});
const expectedRestricted=new Set(['/api/store/bd_finance_expenses','/api/business-health','/api/ai/diagnosis','/api/recommendations/check','/api/ai/curated']);
function acceptance(role,requests,errors){
 assert.deepEqual(errors,[],role+' browser errors');
 for(const req of requests.filter(req=>req.status>=400)){
  assert.ok(role==='manager'&&req.status===403&&req.body?.code==='ACCESS_DENIED'&&expectedRestricted.has(req.path),`${role}: unexpected ${req.status} ${req.path}`);
  if(req.path==='/api/ai/curated')assert.equal(req.body.availability,'RESTRICTED','Curated denial must retain the authoritative source restriction contract');
  assert.ok(!req.body.data);assert.ok(!JSON.stringify(req.body).includes('FINANCE PRIVATE SENTINEL'));
 }
}
// The acceptance itself must never allow a denial for a permitted actor or any 5xx.
for(const bad of [{status:403,body:{code:'ACCESS_DENIED'}},{status:401,body:{code:'UNAUTHORIZED'}},{status:500,body:{code:'ACCESS_DENIED'}}]){
 assert.throws(()=>acceptance('owner',[{path:'/api/store/bd_finance_expenses',...bad}],[]));
 if(bad.status!==403)assert.throws(()=>acceptance('manager',[{path:'/api/store/bd_finance_expenses',...bad}],[]));
}
assert.throws(()=>acceptance('manager',[],['uncaught error']));
// The new read endpoint adds one exact expected denial, never a blanket AI exception.
for(const role of ['owner','permitted'])assert.throws(()=>acceptance(role,[{path:'/api/ai/curated',status:403,body:{code:'ACCESS_DENIED',availability:'RESTRICTED'}}],[]));
for(const [status,body] of [[401,{code:'UNAUTHORIZED'}],[500,{code:'ACCESS_DENIED',availability:'RESTRICTED'}],[403,{code:'OTHER_DENIAL',availability:'RESTRICTED'}],[403,{code:'ACCESS_DENIED'}],[403,{code:'ACCESS_DENIED',availability:'RESTRICTED',data:{private:true}}]])assert.throws(()=>acceptance('manager',[{path:'/api/ai/curated',status,body}],[]));
async function settled(page){
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-bd-startup-pending'));
 await page.waitForFunction(()=>!window.__qaPending&&Date.now()-window.__qaLastRequest>800);
}
async function login(page,user){
 await page.goto(r.base+'/login?venue='+r.venueId);await page.locator('input[type=email]').fill(user.email);await page.locator('input[type=password]').fill('Isolated-Test-Password-123!');
 await page.getByRole('button',{name:'Войти',exact:true}).click();await page.waitForURL('**/home*');await settled(page);
}
async function cloudReady(page){
 return page.evaluate(()=>{
  const node=document.querySelector('#root')?.firstElementChild,key=node&&Object.keys(node).find(key=>key.startsWith('__reactFiber$'));let fiber=key&&node[key],cloud,restaurant;
  while(fiber){const value=fiber.memoizedProps?.value;if(value&&'financeReady' in value)cloud=value;if(value&&'profile' in value&&'isReady' in value)restaurant=value;fiber=fiber.return;}
  return {cloudReady:cloud?.isReady,financeReady:cloud?.financeReady,restaurantReady:restaurant?.isReady,authReady:window.__bdAuthBootstrapV274?.state};
 });
}
async function call(page,path,method='GET',body,venueId){
 return page.evaluate(async({path,method,body,venueId})=>{
  const headers={Accept:'application/json','Content-Type':'application/json','X-Session-Email':localStorage.getItem('bd_session')||'','X-Session-Token':localStorage.getItem('bd_session_token')||'',...(venueId?{'X-Venue-Id':String(venueId)}:{})};
  const res=await fetch(path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:res.status,body:await res.json()};
 },{path,method,body,venueId});
}
try{
 if(!process.env.BD_QA_NEGATIVE_ONLY)for(const width of [1280,390])for(const role of ['manager','permitted','owner']){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.exposeBinding('__qaUnhandled',(_,message)=>errors.push('unhandledrejection: '+message));
  await context.addInitScript(()=>{
   window.__qaPending=0;window.__qaLastRequest=Date.now();const original=window.fetch;
   window.fetch=async(...args)=>{window.__qaPending++;try{return await original(...args)}finally{window.__qaPending--;window.__qaLastRequest=Date.now()}};
   window.addEventListener('unhandledrejection',event=>window.__qaUnhandled(event.reason?.message||String(event.reason)));
  });
  const paths=[];await login(page,r[role]);const start=r.network.length;await page.reload();await settled(page);
  const bootstrap=await cloudReady(page);assert.deepEqual(bootstrap,{cloudReady:true,financeReady:true,restaurantReady:true,authReady:'ready'});
  for(const path of ['/home','/finance','/sales-import','/shifts','/catalog','/warehouse','/equipment','/reviews','/health','/analysis']){
   await page.goto(r.base+path+'?venue='+r.venueId);await settled(page);
   assert.equal(await page.evaluate(()=>Number(localStorage.getItem('bd_active_venue_id'))),r.venueId);
   if(path!=='/sales-import')assert.ok((await page.locator('body').innerText()).trim().length>0,path+' blank UI');
   if(path==='/sales-import')await page.frameLocator('iframe[title="Продажи и склад"]').locator('#journal-count').filter({hasText:'документов'}).waitFor();
   if(role==='manager'){
    const body=await page.locator('body').innerText();assert.ok(!body.includes('FINANCE PRIVATE SENTINEL'));assert.ok(!body.replace(/\s/g,'').includes('98765'));
    if(path==='/analysis'){assert.equal(await page.locator('[data-curated-answer]').count(),0);assert.match(await page.locator('[data-curated-venue] [role="alert"]').innerText(),/Факты сейчас не подтверждены/);}
   }
   assert.deepEqual(errors,[],role+' '+path);paths.push(path);
  }
  const finance=await call(page,'/api/store/bd_finance_expenses','GET',undefined,r.venueId);
  assert.equal(finance.status,role==='manager'?403:200);
  if(role==='manager')assert.ok(!finance.body.data);else assert.equal(finance.body.data[0].amount,98765);
  const curatedPath='/api/ai/curated?question=attention&venueId='+r.venueId;
  for(const [path,method,body] of [['/api/business-health','GET'],[curatedPath,'GET'],['/api/ai/diagnosis','POST',{}],['/api/recommendations/check','POST',{recommendations:[{}]}]]){
   // Permitted roles exercise the source boundary through Health; avoid a real AI/provider call.
   if(role!=='manager'&&path!=='/api/business-health'&&path!==curatedPath)continue;
   const response=await call(page,path,method,body,r.venueId);assert.equal(response.status,role==='manager'?403:200);
   if(role==='manager')assert.equal(response.body.availability,'RESTRICTED');
   else if(path===curatedPath){assert.equal(response.body.data.authority,'DETERMINISTIC_CANONICAL_SERVER');assert.equal(response.body.data.scope.venueId,r.venueId);assert.equal(response.body.data.question.id,'attention');}
  }
  acceptance(role,r.network.slice(start),errors);
  if(role==='owner'){
   const created=await call(page,'/api/venues','POST',{name:'Second Isolated QA',businessType:'bar',country:'Moldova',city:'QA',currency:'MDL',timezone:'UTC'});
   assert.equal(created.status,201);const second=created.body.venue;
   await page.evaluate(venue=>{void window.bdVenueSwitcher.switchVenue(venue)},second);
   await page.waitForFunction(id=>Number(localStorage.getItem('bd_active_venue_id'))===id,second.id);await settled(page);
   assert.equal((await call(page,'/api/store/bd_finance_expenses','GET',undefined,second.id)).body.data,null);
   await page.evaluate(id=>{void window.bdVenueSwitcher.switchVenue({id,role:'owner'})},r.venueId);
   await page.waitForFunction(id=>Number(localStorage.getItem('bd_active_venue_id'))===id,r.venueId);await settled(page);
   assert.equal((await call(page,'/api/store/bd_finance_expenses','GET',undefined,r.venueId)).body.data[0].amount,98765);
  }
  await page.goto(r.base+'/profile');await settled(page);await page.getByRole('button',{name:'Выйти из аккаунта'}).click();await page.waitForURL('**/login*');
  await login(page,r.manager);const reloginStart=r.network.length;await page.reload();await settled(page);assert.deepEqual(errors,[]);
  assert.ok(!(await page.locator('body').innerText()).includes('FINANCE PRIVATE SENTINEL'));
  const denied=await call(page,'/api/store/bd_finance_expenses','GET',undefined,r.venueId);assert.equal(denied.status,403);assert.ok(!denied.body.data);
  acceptance('manager',r.network.slice(reloginStart),errors);
  await page.screenshot({path:out+'/'+role+'-'+width+'.png',fullPage:true});
  results.push({role,width,paths,financeStatus:finance.status,pageErrors:errors,bootstrap,logoutLoginReload:'PASS',venueSwitch:role==='owner'?'PASS':'not applicable'});
  writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.at(-1)));await context.close();
 }
 // A foreign identity cannot select or read the QA venue, independent of UI filters.
 // A blank same-origin QA document avoids the product's intentional response
 // scope guard: API assertions need the server's response for explicit foreign headers.
 const context=await browser.newContext(),page=await context.newPage();await page.goto(r.base+'/__qa_api_probe');
 const foreign=await page.evaluate(async({token,email,ownVenueId,venueId})=>{
  const read=async id=>{const res=await fetch('/api/store/bd_finance_expenses',{headers:{'X-Session-Token':token,'X-Session-Email':email,'X-Venue-Id':String(id)}});return{status:res.status,body:await res.json()}};
  return{own:await read(ownVenueId),foreign:await read(venueId)};
 },{token:r.foreign.token,email:r.foreign.email,ownVenueId:r.foreign.activeVenueId,venueId:r.venueId});
 assert.equal(foreign.own.status,200);assert.equal(foreign.foreign.status,401);assert.ok(!foreign.foreign.body.data);await context.close();
 // Real browser negative controls: normal acceptance must reject unexpected
 // denials/server failures. Do not convert these deliberately failing controls to a UI PASS.
 for(const [status,code] of [[403,'OTHER_DENIAL'],[500,'SERVER_ERROR'],[403,'ACCESS_DENIED']]){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{window.__qaPending=0;window.__qaLastRequest=Date.now();const fetchOriginal=window.fetch;window.fetch=async(...args)=>{window.__qaPending++;try{return await fetchOriginal(...args)}finally{window.__qaPending--;window.__qaLastRequest=Date.now()}}});
  await login(page,r.owner);const start=r.network.length;r.inject({path:'/api/store/bd_finance_expenses',status,body:{ok:false,code,error:'Synthetic fault probe'}});
  await page.reload();await settled(page);
  assert.ok(r.network.slice(start).some(req=>req.path==='/api/store/bd_finance_expenses'&&req.status===status&&req.body?.code===code),`${status} fault was not exercised`);
  // A cached, fast React consumer may catch a rejection before the browser's
  // unhandled event. HTTP failures must still fail acceptance regardless of timing.
  assert.throws(()=>acceptance('owner',r.network.slice(start),errors));
  results.push({negativeControl:{status,code},strictAcceptanceRejected:true,pageErrors:errors});r.inject(null);await context.close();
 }
 results.push({foreignVenue:'PASS',strictUnexpected401403500:'PASS',strictPageerror:'PASS'});writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
}finally{await browser.close();await r.close();}
