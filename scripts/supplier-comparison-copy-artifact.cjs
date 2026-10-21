const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright-core'),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
(async()=>{
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const file=url.pathname==='/suppliers'?'dist/client/app.html':path.join('dist/client',url.pathname);if(fs.existsSync(file)&&fs.statSync(file).isFile()){res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}else{res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,code:'LOCAL_SCOPE_EXCLUDED'}));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));process.env.BD_QA_BASE_URL='http://127.0.0.1:'+server.address().port;
 const {openPage,procurementTab,closeSheet}=require('./procurement-browser-qa-v168.cjs');
 const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true}),store=require('./purchase-units-qa-store.cjs')();
 const out='outputs/purchase-price-preview';fs.mkdirSync(out,{recursive:true});let page;
 try{

 require('tsx/cjs');const {procurementComparisons}=require('../lib/bardoctor/procurement-analytics.ts');
 const doc=(id,date,type='invoice',supplier='a',price=120)=>({id,date,venueId:401,status:'confirmed',documentType:type,supplierId:supplier,supplierName:supplier==='a'?'Поставщик A':'Поставщик B',currency:'PMR_RUB',total:price,items:[{id:id+'-line',purchaseProductKey:'vodka-x',name:'Товар для сравнения',quantity:1,unit:'шт.',packageSize:'0,5 л',unitPrice:price,lineTotal:price,category:'alcohol'}]});
 const documents=[doc('a1','2026-06-10'),doc('a2','2026-07-10'),doc('a3','2026-08-10'),doc('offer','2026-08-11','price_list','b',109)];
 const [comparison]=procurementComparisons(documents,[{id:'a',paymentTerms:'Отсрочка 7 дней'},{id:'b',minimumOrder:'10 000 руб. ПМР',deliveryTerms:'Доставка 2 дня'}],{venueId:401,now:new Date('2026-08-12T12:00:00Z')});
 assert.equal(comparison.estimatedMonthlySaving,11);assert.equal(comparison.estimateBasis.observedBaseAmount,1500);
 const fixture=fs.readFileSync('public/procurement-qa-v168.js','utf8').replace(/var comparison = .*?;\n/, 'var comparison = '+JSON.stringify(comparison)+';\n');
 const run=await openPage(browser,{state:'e2e',extras:{tab:'overview',venue:'401'},viewport:{width:390,height:900},name:'supplier-comparison',fixtureContent:fixture});page=run.page;
 await procurementTab(page,'Сравнение').click();await page.locator('.bd-proc-compare-row-v168').first().click();const detail=page.locator('.bd-proc-sheet-v168').last();
 await detail.getByText('Разница в цене — ещё не вся выгода',{exact:true}).waitFor();const text=await detail.innerText();
 assert.match(text,/Доставка и минимальный заказ не входят/);assert.match(text,/10 000 руб. ПМР/);assert.match(text,/Доставка 2 дня/);assert.match(text,/Цена из прайса/);assert.match(text,/Цена из прошлой закупки/);assert.match(text,/Дата цены/);assert.match(text,/Средняя разница: 11 руб. ПМР/);assert.match(text,/22 руб. ПМР × 0,5 л/);assert.match(text,/3 закупки за 3 мес. с закупками/);assert.doesNotMatch(text,/PMR_RUB|product key|mapping/);
 await page.screenshot({path:out+'/supplier-conditions.png'});await detail.getByText('Разница только в цене товара',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/supplier-basis.png'});
 fs.writeFileSync(out+'/supplier-results.json',JSON.stringify({pass:true,comparison,checks:['real normalized comparison','partial supplier conditions warning','delivery and minimum visible','historical purchase versus price list','11 = 22 × .5 monthly volume','readable currency'],errors:run.issues.filter(x=>x.type==='pageerror')},null,2));assert.deepEqual(run.issues.filter(x=>x.type==='pageerror'),[]);console.log('PASS supplier comparison real analytics / compiled UI');await run.context.close();
 }catch(e){if(page&&!page.isClosed()){console.log((await page.locator('body').innerText()).slice(-6500));await page.screenshot({path:out+'/supplier-failure.png',fullPage:true});}throw e;}finally{await browser.close();store.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
