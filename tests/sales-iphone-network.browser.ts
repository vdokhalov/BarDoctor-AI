import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'node:http';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {webkit} from 'playwright-core';
import {salesIPhoneTrace} from './helpers/sales-iphone-trace';

test('real WebKit departure permits only outgoing icon cancellation, rejects API cancellation and destination HTTP errors',async()=>{
 const browser=await webkit.launch({headless:true,...(process.env.BD_WEBKIT_EXECUTABLE?{executablePath:process.env.BD_WEBKIT_EXECUTABLE}:{})});
 const server=createServer((req,res)=>{
  const url=new URL(req.url!,'http://localhost');
  if(url.pathname==='/integration-icons/pending.svg'||url.pathname==='/api/required')return;
  if(url.pathname==='/integration-icons/broken.svg'){res.writeHead(503);res.end('unavailable');return;}
  res.setHeader('content-type','text/html');
  res.end(url.pathname==='/cashier'?`<!doctype html><a href="/sales-import?mode=${url.searchParams.get('mode')}">Back</a>${url.searchParams.get('mode')==='api'?'<script>addEventListener("load",()=>setTimeout(()=>fetch("/api/required"),0))</script>':url.searchParams.get('mode')==='icon'?'<script>addEventListener("load",()=>setTimeout(()=>{const image=new Image();image.src="/integration-icons/pending.svg";document.body.append(image)},0))</script>':''}`:`<!doctype html><main>Journal</main>${url.searchParams.get('mode')==='http'?'<img src="/integration-icons/broken.svg">':''}`);
 });
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
 const directory=mkdtempSync(join(tmpdir(),'bd-iphone-network-'));
 try{for(const mode of ['icon','api','http']){
  const context=await browser.newContext();const page=await context.newPage();
  const qa=await salesIPhoneTrace(context,page,join(directory,mode+'.json'),[],[]);
  const pending=mode==='http'?null:page.waitForRequest(r=>r.url().endsWith(mode==='icon'?'/integration-icons/pending.svg':'/api/required'));
  await page.goto(base+'/cashier?mode='+mode,{waitUntil:'domcontentloaded'});if(pending)await pending;
  qa.beginCashierBack();await page.getByText('Back',{exact:true}).click();await page.waitForURL('**/sales-import?mode='+mode);await page.waitForLoadState('load');await qa.checkpoint('destination-ready');
  assert.ok(qa.networkErrors.length>0,'negative control must cause an actual browser network failure');
  if(mode==='icon')qa.assertNavigationNetwork();else assert.throws(()=>qa.assertNavigationNetwork(),/no unexpected network errors/);
  console.log(JSON.stringify({mode,rawNetworkErrors:qa.networkErrors,result:mode==='icon'?'EXPECTED_DEPARTURE':'REJECTED_AS_REQUIRED'}));await context.close();
 }}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}
});
