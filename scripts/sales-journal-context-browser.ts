import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {GET as journal} from '../app/sales-import/route';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const out='outputs/sales-journal-context';mkdirSync(out,{recursive:true});
const row=(id:string,date:string,status='POSTED')=>({id,venueId:3392,readOnly:true,source:'POS_API',status,businessDate:date,createdAt:date+'T12:00:00Z',acceptedAt:date+'T12:00:00Z',revenue:50,currency:'PMR_RUB',theoreticalCost:10,lines:[],prices:[{name:'Тестовый напиток',quantity:1,unitPrice:50,total:50}],payments:[{method:'CASH'}],shiftId:'s1',actor:{accountId:154,name:'Тестовый сотрудник'}});
const payload={ok:true,venueId:3392,timezone:'UTC',currency:'PMR_RUB',batches:[row('old-batch','2026-09-30'),row('current','2026-10-22'),row('reversed','2026-09-30','REVERSED')],menu:[],shifts:[{id:'s1',label:'Тестовая смена'}],capabilities:{create:false,reverse:false},kpis:{},dataQuality:{issues:[]}};
let posts=0;
const server=createServer(async(req,res)=>{const url=new URL(req.url||'/','http://local');let response:Response;
 if(req.method!=='GET')posts++;
 if(url.pathname==='/sales-import'&&url.searchParams.has('hostfixture')){url.searchParams.delete('hostfixture');url.searchParams.set('embedded','1');response=new Response('<iframe title="Local host fixture" style="width:390px;height:844px" src="'+url.pathname+url.search.replaceAll('&','&amp;')+'"></iframe>',{headers:{'Content-Type':'text/html'}});}
 else if(url.pathname==='/sales-import')response=journal(new Request(url));
 else if(url.pathname==='/api/sales-batches')response=Response.json(payload);
 else if(url.pathname==='/api/sales-events')response=Response.json({ok:true,venueId:3392,venueName:'Тестовое заведение',actor:{accountId:154},permissions:{post:false},shifts:[],workday:{ok:true}});
 else if(url.pathname.startsWith('/api/store/'))response=Response.json({ok:true,data:null});
 else if(url.pathname.startsWith('/api/'))response=Response.json({ok:false},{status:403});
 else{const assets=process.env.ARTIFACT_ROOT||'public',p=resolve(assets,'.'+url.pathname);response=p.startsWith(resolve(assets)+'/')&&existsSync(p)?new Response(readFileSync(p),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'} as Record<string,string>)[extname(p)]||'application/octet-stream'}}):new Response(null,{status:404});}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});
try{const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>{localStorage.setItem('bd_session','local-test');localStorage.setItem('bd_active_venue_id','3392');});const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const url=base+'/sales-import?embedded=1&venue=3392';
 await page.goto(url);await page.locator('[data-batch="old-batch"]').waitFor();
 await page.locator('.journal-filters summary').click();await page.locator('#journal-from').fill('2026-09-30');await page.locator('#journal-to').fill('2026-09-30');await page.locator('#journal-status').selectOption('POSTED');
 assert.equal(await page.locator('#batch-list [data-batch]').count(),1);
 await page.reload();await page.locator('[data-batch="old-batch"]').waitFor();
 const actual={from:await page.locator('#journal-from').inputValue(),status:await page.locator('#journal-status').inputValue()};
 if(process.env.BASELINE==='1'){assert.deepEqual(actual,{from:'',status:''});await page.goto(url+'&batch=old-batch');await page.locator('#editor-dialog[open]').waitFor();writeFileSync(out+'/baseline.json',JSON.stringify({reloadLosesFilters:true,oldBatchDirectOpens:true,errors}));console.log('BASELINE reproduced filter reset; old batch direct open PASS');}
 else{
 assert.deepEqual(actual,{from:'2026-09-30',status:'POSTED'});
 await page.locator('[data-batch="old-batch"]').click();await page.locator('#editor-dialog[open]').waitFor();assert.match(page.url(),/batch=old-batch/);
 await page.goBack();await page.locator('#editor-dialog').waitFor({state:'hidden'});assert.equal(await page.locator('#journal-from').inputValue(),'2026-09-30');
 await page.goForward();await page.locator('#editor-dialog[open]').waitFor();
 await page.reload();await page.locator('#editor-dialog[open]').waitFor();await page.locator('#editor-close').click();await page.locator('#editor-dialog').waitFor({state:'hidden'});
 await page.locator('#refresh').click();await page.waitForTimeout(150);assert.equal(await page.locator('#editor-dialog').evaluate((x:HTMLDialogElement)=>x.open),false);
 await page.goto(url+'&j_from=2026-09-30&j_to=2026-09-30&j_status=REVERSED');await page.locator('[data-batch="reversed"]').waitFor();assert.equal(await page.locator('#batch-list [data-batch]').count(),1);
 await page.locator('.journal-filters summary').click();await page.locator('#journal-status').selectOption('POSTED');await page.locator('[data-batch="old-batch"]').waitFor();
 await page.goBack();await page.locator('[data-batch="reversed"]').waitFor();await page.goForward();await page.locator('[data-batch="old-batch"]').waitFor();
 await page.locator('#journal-reset').click();assert.equal(await page.locator('#batch-list [data-batch]').count(),3);await page.reload();await page.locator('[data-batch="current"]').waitFor();assert.equal(await page.locator('#journal-from').inputValue(),'');
 // Legacy deep link opens, closes without reopening on refresh/reload.
 await page.goto(url+'&batch=old-batch');await page.locator('#editor-dialog[open]').waitFor();await page.locator('#editor-close').click();await page.locator('#editor-dialog').waitFor({state:'hidden'});assert.ok(!new URL(page.url()).searchParams.has('batch'));
 await page.reload();await page.locator('[data-batch="current"]').waitFor();assert.equal(await page.locator('#editor-dialog').evaluate((x:HTMLDialogElement)=>x.open),false);
 await page.screenshot({path:out+'/journal-390.png'});
 let releaseOld!:()=>void;const oldGate=new Promise<void>(done=>releaseOld=done);let sawOld!:()=>void;const oldSeen=new Promise<void>(done=>sawOld=done);let loads=0;
 await page.route('**/api/sales-batches',async route=>{if(++loads===1){sawOld();await oldGate;await route.fulfill({json:{...payload,batches:[row('stale','2026-01-01')]}});}else await route.fulfill({json:payload});});
 await page.locator('#refresh').click();await oldSeen;await page.locator('#refresh').click();await page.locator('[data-batch="current"]').waitFor();await page.waitForTimeout(100);releaseOld();await page.waitForTimeout(150);assert.equal(await page.locator('[data-batch="stale"]').count(),0);assert.equal(await page.locator('#batch-list [data-batch]').count(),3);await page.unroute('**/api/sales-batches');
 let release!:()=>void;const gate=new Promise<void>(done=>release=done);let arrived!:()=>void;const seen=new Promise<void>(done=>arrived=done);
 await page.route('**/api/sales-batches',async route=>{arrived();await gate;await route.fulfill({json:payload});});
 await page.locator('#refresh').click();await seen;
 await page.evaluate(()=>{localStorage.setItem('bd_active_venue_id','9999');window.dispatchEvent(new StorageEvent('storage',{key:'bd_active_venue_id'}));});release();await page.waitForTimeout(150);assert.equal(await page.locator('#batch-list [data-batch]').count(),0);assert.equal(await page.locator('#editor-dialog').evaluate((x:HTMLDialogElement)=>x.open),false);
 await page.close();const host=await context.newPage();await host.goto(base+'/sales-import?hostfixture=1&venue=3392');const frame=host.frameLocator('iframe');await frame.locator('[data-batch="current"]').waitFor();await frame.locator('.journal-filters summary').click();await frame.locator('#journal-status').selectOption('REVERSED');assert.equal(new URL(host.url()).searchParams.get('j_status'),'REVERSED');await host.reload();await host.frameLocator('iframe').locator('[data-batch="reversed"]').waitFor();assert.equal(await host.frameLocator('iframe').locator('#journal-status').inputValue(),'REVERSED');await host.close();
 assert.deepEqual(errors,[]);writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',scenarios:['reload date/status','direct filter link','batch reload/back/forward/close','legacy batch does not reopen after close','filter back/forward/reset','venue switch clears and rejects late response','out-of-order refresh ignored','same-origin host URL mirrors filters and reload restores iframe'],posts,errors},null,2));console.log('PASS journal context browser');}

 assert.equal(posts,0);await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));}
