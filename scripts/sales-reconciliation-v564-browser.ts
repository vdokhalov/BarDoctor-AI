import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {lifecycleRuntime} from '../tests/helpers/lifecycle-runtime';
import {GET as salesPage} from '../app/sales-import/route';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const r=await lifecycleRuntime({reconcile:'./app/api/sales-reconciliation/route'},{now:'2026-10-20T19:00:00Z'});
const owner=await r.register('reconciliation-browser@isolated.test'),venueId=owner.activeVenueId;
r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"UTC"}',owner.userId);
const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(owner.userId,key,JSON.stringify(value),'2026-10-20T19:00:00Z');
const revenue={id:'legacy-browser',venueId,date:'2026-10-02',revenue:1000,receipts:10};
const batch={id:'batch-browser',venueId,shiftId:revenue.id,businessDate:revenue.date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:180,lines:[{id:'line',salesBatchId:'batch-browser',rawName:'Капучино',menuItemId:'coffee',quantity:20,unit:'порция',processingStatus:'POSTED',currency:'MDL',theoreticalCost:180,recipeSnapshot:{recipeId:'recipe',capturedAt:'2026-10-09T16:00:00Z',ingredients:[{productKey:'coffee',baseQuantityTotal:20,unitCost:9,totalCost:180,costStatus:'KNOWN_VALUE',currency:'MDL'}]}}]};
put('bd_finance_revenue',[revenue]);put('bd_sales_batches',[batch]);
for(const key of ['bd_sales_documents','bd_sales_events_v1','bd_month_closings','bd_sales_reconciliations_v1','bd_stock_movements'])put(key,[]);
let loseResponse=false;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url??'/','http://localhost');let response:Response;
 if(url.pathname==='/api/sales-reconciliation'){
  const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
  response=await (r.api as any).reconcile[req.method??'GET'](new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})}));
  if(loseResponse&&body.length&&JSON.parse(body.toString()).action==='apply'&&response.status===201){loseResponse=false;res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,code:'UPSTREAM_RESPONSE_LOST'}));return;}
 }else if(url.pathname==='/sales-import'){
  // Component probe using the shipped journal HTML; other journal controllers are outside this scoped test.
  const original=salesPage(new Request('http://localhost/sales-import?embedded=1'));
  const html=(await original.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('/sales-reconciliation.js')?m:'');
  response=new Response(html,{headers:original.headers});
 }else{const path=resolve('public','.'+url.pathname);response=path.startsWith(resolve('public')+'/')&&existsSync(path)?new Response(readFileSync(path),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'} as any)[extname(path)]??'application/octet-stream'}}):new Response(null,{status:404});}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:chromiumArgs});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 await context.addInitScript(owner=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(owner.activeVenueId));},owner);
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+(server.address() as any).port+'/sales-import');
 await page.locator('#legacy-reconciliation summary').click();
 await page.locator('#reconciliation-from').fill('2026-10-02');await page.locator('#reconciliation-to').fill('2026-10-02');await page.locator('#reconciliation-load').click();
 await page.locator('#reconciliation-selection input').check();await page.locator('#reconciliation-kind').selectOption('SYNTHETIC_FIXTURE');
 await page.locator('#reconciliation-reference').fill('Isolated browser fixture original weekly report');await page.locator('#reconciliation-method').fill('Explicit quantity coverage checked using original test report; historical sale prices unavailable.');await page.locator('#reconciliation-coverage').check();
 await page.locator('#reconciliation-form button[type=submit]').click();await page.locator('#reconciliation-preview').waitFor({state:'visible'});
 assert.equal(await page.locator('#reconciliation-apply').isDisabled(),true);
 assert.match(await page.locator('#reconciliation-summary').innerText(),/180 MDL/);
 const downloadPromise=page.waitForEvent('download');await page.locator('#reconciliation-backup').click();const download=await downloadPromise;const backup=JSON.parse(readFileSync((await download.path())!,'utf8'));assert.equal(backup.backup.before[0].revenue.revenue,1000);
 await page.locator('#reconciliation-backup-saved').check();
 put('bd_finance_revenue',[{...revenue,revenue:1001}]);await page.locator('#reconciliation-apply').click();await page.getByRole('button',{name:'Проверить результат операции'}).waitFor();
 await page.getByRole('button',{name:'Проверить результат операции'}).click();await page.waitForFunction(()=>document.getElementById('reconciliation-status')?.textContent?.includes('не выполнена'));assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='legacy_sales.reconcile'").get()!.n,0);
 put('bd_finance_revenue',[revenue]);await page.locator('#reconciliation-form button[type=submit]').click();await page.locator('#reconciliation-preview').waitFor({state:'visible'});const dl=page.waitForEvent('download');await page.locator('#reconciliation-backup').click();await dl;await page.locator('#reconciliation-backup-saved').check();
 loseResponse=true;await page.locator('#reconciliation-apply').click();await page.getByRole('button',{name:'Проверить результат операции'}).waitFor();await page.getByRole('button',{name:'Проверить результат операции'}).click();await page.waitForFunction(()=>document.getElementById('reconciliation-status')?.textContent?.includes('уже сохранена'));
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='legacy_sales.reconcile'").get()!.n,1);
 assert.deepEqual(JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").get(owner.userId)!.data_json)),[]);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 mkdirSync('/workspace/checkpoint/sales-reconciliation-v564',{recursive:true});await page.screenshot({path:'/workspace/checkpoint/sales-reconciliation-v564/browser-390.png',fullPage:true});
 console.log('PASS: 390px journal component, selection/preview, backup gate/download, stale preview rejected, uncertain committed response resolved by status, one audit, stock unchanged, no horizontal overflow.');
 await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));r.close();}
