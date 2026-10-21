const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright-core'),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
(async()=>{
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const file=url.pathname==='/suppliers'?'dist/client/app.html':path.join('dist/client',url.pathname);if(fs.existsSync(file)&&fs.statSync(file).isFile()){res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}else{res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,code:'LOCAL_SCOPE_EXCLUDED'}));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));process.env.BD_QA_BASE_URL='http://127.0.0.1:'+server.address().port;
 const {openPage,procurementTab,closeSheet}=require('./procurement-browser-qa-v168.cjs');
 const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true}),store=require('./purchase-units-qa-store.cjs')();
 const out='outputs/purchase-price-preview';fs.mkdirSync(out,{recursive:true});let page;
 try{
 const analytics={nomenclatureCosts:[{productKey:'qa-liquid',complete:true,costBasisMethod:'latest_confirmed_receipt',unitPrice:100,unit:'l',currency:'RUB',purchaseDocumentId:'old-receipt',purchaseDate:'2026-01-01'}],menuItems:[{id:'drink',name:'Тестовый напиток',recipeCostStatus:'KNOWN',recipeCost:5,techCardStatus:'approved',costCurrency:'RUB',ingredientRows:[{productKey:'qa-liquid',complete:true,cost:5,amount:50,unit:'ml',currency:'RUB'}]}]};
 const run=await openPage(browser,{state:'e2e',extras:{tab:'overview',qaScenario:'phase4-conversion',venue:'401'},viewport:{width:390,height:844},name:'purchase-preview',setupRoutes:async context=>{
  await context.route('**/api/assortment/overview',route=>route.fulfill({json:{ok:true,venueId:401,analytics}}));
  await context.route('**/api/tech-cards/nomenclature?*',route=>route.fulfill({json:{ok:true,...store.select(new URL(route.request().url()).searchParams.get('q'))}}));
  await context.route('**/api/purchases/confirm',route=>route.fulfill({status:201,json:store.confirm(route.request().postDataJSON().document)}));
 }});page=run.page;page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log(e.stack);});
 const original=JSON.stringify(store.reload());
 const open=async()=>{await procurementTab(page,'Обзор').click();await page.locator('.bd-proc-quick-grid-v168 button').filter({hasText:'Добавить покупку'}).click();await page.locator('.bd-proc-source-grid-v168 button').filter({hasText:'Вручную'}).click();};
 await open();const editor=page.locator('.bd-procurement-sheet'),panel=page.locator('[data-purchase-price-preview]');
 await editor.getByLabel('Поиск поставщика',{exact:true}).fill('ВПРОК');await editor.locator('.bd-purchase-supplier-results-v356 button').filter({hasText:'ВПРОК'}).first().click();
 await editor.locator('label.bd-procurement-field').filter({hasText:'Название в документе'}).locator('input').fill('Preview QA');
 await panel.getByText('Пока неизвестно: для этих товаров не найдены связанные блюда.',{exact:true}).waitFor();
 await editor.locator('.bd-invoice-mapping-v356').getByRole('button',{name:'Сопоставить',exact:true}).click();await editor.getByLabel('Поиск номенклатуры для строки накладной').fill('Phase 4 whisky');await editor.locator('.bd-invoice-mapping-results-v356 button').filter({hasText:'Phase 4 whisky'}).click();
 const units=editor.locator('[data-bd-purchase-units="v421"]');await units.getByLabel('Количество',{exact:true}).fill('2');await units.getByLabel('Единица прихода',{exact:true}).selectOption('l');
 const price=()=>editor.locator('label.bd-procurement-field').filter({hasText:/Цена за единицу|Цена упаковки/}).locator('input');
 await price().fill('200');await panel.getByText(/5,00\s*₽ → 10,00\s*₽ за одну продажу/,{exact:true}).waitFor();
 await price().fill('150');await panel.getByText(/5,00\s*₽ → 7,50\s*₽ за одну продажу/,{exact:true}).waitFor();
 await units.getByLabel('Товар пришёл упаковками').check();await units.getByLabel('Количество упаковок',{exact:true}).fill('2');await units.getByLabel('Количество в упаковке',{exact:true}).fill('500');await units.getByLabel('Единица содержимого',{exact:true}).selectOption('ml');await price().fill('75');
 await panel.getByText(/5,00\s*₽ → 7,50\s*₽ за одну продажу/,{exact:true}).waitFor();assert.equal(JSON.stringify(store.reload()),original);
 await page.screenshot({path:out+'/preview.png',fullPage:true});
 await editor.locator('button.bd-procurement-primary').click();await editor.waitFor({state:'detached'});const saved=store.reload();assert.equal(saved.stockMovements.length,1);assert.equal(saved.stockMovements[0].amount,1);assert.equal(saved.documents[0].items[0].purchaseConversion.normalizedUnitCost,150);
 await page.reload({waitUntil:'networkidle'});assert.deepEqual(store.reload(),saved);
 await open();await editor.locator('label.bd-procurement-field').filter({hasText:'Название в документе'}).locator('input').fill('Discard preview');await editor.getByRole('button',{name:'Не сохранять',exact:true}).click();await editor.waitFor({state:'detached'});assert.deepEqual(store.reload(),saved);await page.reload({waitUntil:'networkidle'});assert.deepEqual(store.reload(),saved);
 await open();await editor.locator('label.bd-procurement-field').filter({hasText:'Название в документе'}).locator('input').fill('Unknown baseline');
 await editor.locator('.bd-invoice-mapping-v356').getByRole('button',{name:'Сопоставить',exact:true}).click();await editor.getByLabel('Поиск номенклатуры для строки накладной').fill('Спрайт 0,5л.');await editor.locator('.bd-invoice-mapping-results-v356 button').filter({hasText:'Спрайт 0,5л.'}).click();
 await units.getByLabel('Количество',{exact:true}).fill('1');await price().fill('10');await panel.getByText('Нет предыдущей закупки с подтверждённой ценой.',{exact:true}).waitFor();
 await page.goBack();await editor.waitFor({state:'detached'});assert.deepEqual(store.reload(),saved);
 assert.deepEqual(errors,[]);const html=fs.readFileSync('dist/client/app.html','utf8'),asset=html.match(/(index-BQGspy0I-[a-f0-9]+\.js)/)[1];const hash=crypto.createHash('sha256').update(fs.readFileSync('dist/client/assets/'+asset)).digest('hex');
 fs.writeFileSync(out+'/results.json',JSON.stringify({pass:true,artifact:asset,hash,checks:['unknown baseline','price change','pack ml/l','preview no mutation','ordinary posting exactly once','reload no repost','discard/reload unchanged','missing receipt unknown','browser Back unchanged'],errors,fixture:'existing procurement UI fixture + SQLite purchase normalization/posting'},null,2));console.log('PASS',hash);
 }catch(e){if(page){console.log((await page.locator('body').innerText()).slice(-6500));await page.screenshot({path:out+'/failure.png',fullPage:true});}throw e;}finally{await browser.close();store.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
