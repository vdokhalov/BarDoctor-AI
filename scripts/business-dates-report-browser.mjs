import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {chromium,webkit} from 'playwright-core';
import {recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium';
const out='outputs/business-dates-report/'+engine;mkdirSync(out,{recursive:true});
const sourceHash=()=>createHash('sha256').update(readFileSync('public/assets/index-BQGspy0I.js')).digest('hex'),clientSha256=sourceHash();
const r=await recoveryRuntime(),f=r.fixture,venueId=f.venueId;
const read=key=>f.read(key);
const milk={id:'milk',productKey:'milk',key:'milk',name:'QA Молоко',unit:'l',unitModelVersion:4,venueId,active:true};
const assortment=read('bd_assortment_v1');assortment.nomenclature.push(milk);assortment.stockBalances.push({...milk,current:40,averageUnitCost:20,inventoryValue:800,currency:'MDL',packageOptions:['1 л']});f.seed('bd_assortment_v1',assortment);
f.seed('bd_stock_movements',[{id:'milk-receipt',venueId,type:'receipt',date:'2026-10-01',productKey:'milk',amount:40,unit:'l',costAmount:800,costStatus:'KNOWN',currency:'MDL',sourceDocumentId:'qa-milk',sourceLineId:'milk',createdAt:'2026-10-01T08:00:00Z',status:'active'}]);
f.seed('bd_employees',[{id:'anna',name:'Анна QA',status:'active',venueId,payrollRuleId:'qa-rule',hireDate:'2026-10-01'},{id:'boris',name:'Борис QA',status:'active',venueId,payrollRuleId:'qa-rule'},{id:'vera',name:'Вера QA',status:'active',venueId,payrollRuleId:'qa-rule'}]);
f.seed('bd_payroll_rules',[{id:'qa-rule',name:'200 за смену QA',venueId,blocks:[{id:'rate',type:'shift_rate',enabled:true,amount:200}]}]);
const pairs=[['anna','boris'],['anna','vera'],['anna','boris'],['anna','vera'],['anna','boris'],['boris','vera'],['boris','vera']];
f.seed('bd_finance_revenue',pairs.map((ids,n)=>({id:'shift'+n,venueId,date:'2026-10-'+String(n+2).padStart(2,'0'),revenue:1000,currency:'MDL',receipts:10,staffing:ids.map(employeeId=>({employeeId})),closingStatus:'closed',payrollBreakdown:{total:400,perEmployee:Object.fromEntries(ids.map(id=>[id,200]))}})));
f.seed('bd_sales_events_v1',[]);f.seed('bd_operational_reports_v1',[]);f.seed('bd_payroll_entries',[{id:'qa-bonus',venueId,employeeId:'anna',date:'2026-10-02',type:'bonus',amount:10,currency:'MDL',comment:'QA dated bonus'}]);
f.seed('bd_finance_expenses',[{id:'qa-expense',venueId,date:'2026-10-02',amount:30,currency:'MDL',category:'repairs',description:'QA dated expense'}]);
const profile=JSON.parse(f.sqlite.prepare('SELECT restaurant_json FROM accounts WHERE id=?').get(f.account).restaurant_json);f.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({...profile,timezone:'Europe/Chisinau',trackingStartDate:'2026-10-09'}),f.account);
const browser=engine==='webkit'?await webkit.launch({headless:true,...(process.env.BD_WEBKIT_EXECUTABLE?{executablePath:process.env.BD_WEBKIT_EXECUTABLE}:{})}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
await context.addInitScript({content:'globalThis.__name=fn=>fn;'});
await context.addInitScript(({user,venue})=>{localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:f.user,venue:venueId});
const page=await context.newPage(),errors=[],checks=[];page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(String(e)));
try{
 for(const route of ['/finance?month=2026-10','/reports?month=2026-10','/salaries/anna?month=2026-10','/warehouse?tab=movements']){
  await page.goto(r.base+route);await page.waitForLoadState('networkidle');if(!route.startsWith('/salaries'))await page.getByText('QA Phase 4C — работающая кофейня',{exact:true}).waitFor();
  const text=await page.locator('body').innerText();
  if(route.startsWith('/finance')){assert.match(text,/7 из 7 прошедших смен/);assert.match(text,/70 чеков · 7 смен/);assert.match(text,/не денежный поток/);}
  if(route.startsWith('/reports')){assert.match(text,/7 из 7 смен/);assert.match(text,/Полнота данных смен/);assert.match(text,/не внесены начальные остатки/);assert.match(text,/месяц ещё не завершён/);assert.match(text,/2 окт\./);assert.match(text,/8 окт\./);assert.doesNotMatch(text,/1 окт\./);}
  if(route.startsWith('/warehouse')){assert.match(text,/Приход · 1 окт\./);assert.doesNotMatch(text,/30 сент/);}
  if(route.startsWith('/salaries')){assert.match(text,/Начислено по сменам · 5/);assert.match(text,/2 окт\./);assert.doesNotMatch(text,/1 окт\./);}
  await page.reload();await page.waitForLoadState('networkidle');if(!route.startsWith('/salaries'))await page.getByText('QA Phase 4C — работающая кофейня',{exact:true}).waitFor();assert.equal(await page.locator('body').innerText(),text,'reload: '+route);checks.push(route+' rendered and reloaded with venue dates');writeFileSync(out+'/'+route.split('?')[0].replaceAll('/','_')+'.txt',text);
  await page.screenshot({path:out+'/'+route.split('?')[0].replaceAll('/','_')+'.png',fullPage:true});
 }
 assert.deepEqual(errors,[]);assert.equal(sourceHash(),clientSha256);assert.ok(r.requests.some(x=>x.path==='/api/auth/bootstrap'&&x.status===200));assert.ok(!r.requests.some(x=>x.status>=500));const result={status:'PASS',engine,timezone:'America/Los_Angeles',venueTimezone:'Europe/Chisinau',production:false,actualHandlers:true,clientSha256,checks,requests:r.requests};writeFileSync(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:'PASS',engine,checks}));
}finally{await context.close();await browser.close();await r.close();}
