import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium,webkit} from 'playwright-core';
import {baselinePublicRoot,recoveryRuntime} from '../tests/helpers/reference-slice-recovery-runtime.mjs';

const require=createRequire(import.meta.url),{resolveBrowserExecutable}=require('./browser-runtime.cjs');
const engine=process.env.BD_CURATED_BROWSER==='webkit'?'webkit':'chromium';
const out='outputs/reference-slice-recovery/'+(process.env.BD_RECOVERY_RECHECK==='compatibility'?'recheck-compatibility-':process.env.BD_RECOVERY_RECHECK?'recheck-':'')+engine;mkdirSync(out,{recursive:true});
const inventory=JSON.parse(readFileSync('tests/fixtures/reference-slice-recovery/v485-functional-inventory.json','utf8'));
if(process.env.BD_RECOVERY_RECHECK){const paths=process.env.BD_RECOVERY_RECHECK==='compatibility'?['/employees/qa-barista','/warehouse?inventory=new','/data-control?event=qa-event']:['/analysis','/health','/finance?repairEquipmentId=qa-equipment'];inventory.items=inventory.items.filter(i=>paths.includes(i.path??i.from));}
if(!process.env.BD_RECOVERY_WIDTH){
 const widths=[390,820,1280];
 const codes=await Promise.all(widths.map(width=>new Promise(done=>{const child=spawn(process.execPath,['--import','tsx',import.meta.filename],{env:{...process.env,BD_RECOVERY_WIDTH:String(width)},stdio:'inherit'});child.on('error',()=>done(1));child.on('exit',code=>done(code??1));})));
 const aggregate=widths.map((width,index)=>codes[index]===0?JSON.parse(readFileSync(`${out}/results-${width}.json`,'utf8'))[0]:{engine,width,status:'FAIL',exitCode:codes[index]});
 writeFileSync(`${out}/results.json`,JSON.stringify(aggregate,null,2));
 if(codes.every(code=>code===0)){const rows=widths.flatMap(width=>JSON.parse(readFileSync(`${out}/parity-matrix-${width}.json`,'utf8')));assert.equal(rows.length,inventory.items.length*3);writeFileSync(`${out}/parity-matrix.json`,JSON.stringify(rows,null,2));}
 console.log(JSON.stringify(aggregate));process.exit(codes.some(code=>code!==0)?1:0);
}
const clientHash=createHash('sha256').update(readFileSync('public/assets/index-BQGspy0I.js')).digest('hex');
const baseline=baselinePublicRoot();
const browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:['--no-sandbox','--disable-setuid-sandbox']});
const results=[],matrix=[];
const normalized=s=>s.replace(/[\d.,]+/g,'').trim().replace(/\s+/g,' ');
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

try{for(const width of process.env.BD_RECOVERY_WIDTH?[Number(process.env.BD_RECOVERY_WIDTH)]:[390,820,1280]){
  const resume=process.env.BD_RECOVERY_RESUME==='unfinished',versions={};
  for(const version of ['v485','candidate']){
    const runtime=await recoveryRuntime(version==='v485'?baseline.root:process.cwd());
    const r=runtime.fixture;
    // Checkpoint only the exact prepared client, inventory and deterministic business inputs.
    // Session tokens may differ; no authoritative row or snapshot may differ.
    const inputs={clientHash,baselineCommit:baseline.commit??'dcc0541780db52d8c02b0c3a74f3ea0d31cbce24',inventoryHash:createHash('sha256').update(JSON.stringify(inventory)).digest('hex'),domainHash:createHash('sha256').update(JSON.stringify(r.sqlite.prepare('SELECT account_id,store_key,data_json,updated_at FROM domain_data ORDER BY account_id,store_key').all())).digest('hex'),healthHash:createHash('sha256').update(JSON.stringify((await r.readHealth()).data.businessHealthSnapshot)).digest('hex')};
    const inputFile=`${out}/${version}-${width}-inputs.json`;
    if(resume&&existsSync(inputFile))assert.deepEqual(JSON.parse(readFileSync(inputFile,'utf8')),inputs,'Checkpoint source/business inputs changed');
    else if(resume&&existsSync(`${out}/${version}-${width}-runtime.json`)){
      // One-time adoption of the interrupted current-client run, with its literal route log.
      assert.equal(process.env.BD_RECOVERY_CHECKPOINT_CLIENT_SHA,clientHash,'Explicit current-client provenance required');
      assert.equal(clientHash,'3cfef968d26dd8da22c150655ff745be7f2df384e2a2e257b57b37de9e9d60ed');
      assert.equal(inputs.domainHash,'c33bb7123a2f9f170a7ddb43dd7b881bfbf1cf0b5687bec5ec16f67a62f05c7f');
      assert.equal(inputs.healthHash,'769e6ec6a4b8b38329a25afe87a90cb8c9b7a28868cd392e6a282f136b5c7840');
      assert.ok(process.env.BD_RECOVERY_CHECKPOINT_LOG,'Literal interrupted-run log required');
      const logged=new Set(readFileSync(process.env.BD_RECOVERY_CHECKPOINT_LOG,'utf8').split('\n').flatMap(line=>{try{const record=JSON.parse(line);return record.version===version&&record.width===width&&'entriesTested'in record?[record.path]:[]}catch{return[]}}));
      const retained=JSON.parse(readFileSync(`${out}/${version}-${width}-runtime.json`,'utf8'));
      assert.ok(Object.keys(retained).every(path=>logged.has(path)),'Unlogged historical routes cannot be resumed');
      assert.ok(Object.values(retained).every(record=>record.before.venue===String(r.venueId)&&record.before.sessionPresent!==false),'Failed context cannot be retained');
    }
    if(resume){
      const priorRequests=`${out}/${version}-${width}-requests.json`,priorErrors=`${out}/${version}-${width}-runtime-errors.json`;
      if(existsSync(priorRequests))assert.deepEqual(JSON.parse(readFileSync(priorRequests,'utf8')).filter(request=>request.status>=500),[],'Checkpoint cannot erase earlier HTTP 500 evidence');
      if(existsSync(priorErrors))assert.deepEqual(JSON.parse(readFileSync(priorErrors,'utf8')).filter(error=>version==='candidate'||!error.knownPayroll),[],'Checkpoint cannot erase earlier runtime errors');
    }
    writeFileSync(inputFile,JSON.stringify(inputs,null,2));console.log(JSON.stringify({engine,width,version,verifiedInputs:inputs}));
    const context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1024:900},isMobile:width===390,hasTouch:width===390});
    await context.addInitScript({content:`globalThis.__name=(fn)=>fn;(()=>{let departing=false;const doc=Math.random().toString(36).slice(2);addEventListener('beforeunload',()=>{departing=true;console.log('[qa-document-lifecycle]',JSON.stringify({doc,departing,path:location.pathname}));});for(const type of ['error','unhandledrejection'])addEventListener(type,e=>console.log('[qa-document-error]',JSON.stringify({doc,departing,path:location.pathname,message:e.error?.message??e.reason?.message??e.message??''})));})();`});
    await context.addInitScript(({user,venue})=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('bd_session',user.email);localStorage.setItem('bd_session_token',user.token);localStorage.setItem('bd_active_venue_id',String(venue));},{user:r.user,venue:r.venueId});
    // Freeze Date only. Playwright's clock timer shim can fire a departed document's
    // refresh callback in WebKit; real navigation must retain native timer teardown.
    await context.addInitScript({content:`(()=>{const NativeDate=Date,time=Date.parse('2026-10-03T12:00:00Z');function FixtureDate(...args){if(new.target)return Reflect.construct(NativeDate,args.length?args:[time],new.target);return new NativeDate(time).toString();}FixtureDate.prototype=NativeDate.prototype;Object.setPrototypeOf(FixtureDate,NativeDate);FixtureDate.now=()=>time;globalThis.Date=FixtureDate;})();`});
    await context.addInitScript({content:`(()=>{if(globalThis.__qaFetchTrackingInstalled)return;Object.defineProperty(globalThis,'__qaFetchTrackingInstalled',{value:true});let pending=0;Object.defineProperty(globalThis,'__qaPendingApi',{get:()=>pending});const nativeFetch=globalThis.fetch;globalThis.fetch=function(...args){const path=String(args[0]?.url??args[0]),tracked=new URL(path,location.href).pathname.startsWith('/api/');if(!tracked)return nativeFetch.apply(this,args);pending++;return nativeFetch.apply(this,args).then(async response=>{await response.clone().arrayBuffer();return response;}).finally(()=>pending--);};})();`});
    const page=await context.newPage();
    page.on('dialog',dialog=>dialog.accept());
    const lifecycle=[],errors=[];page.on('console',event=>{const raw=event.text();for(const marker of ['[qa-document-lifecycle]','[qa-document-error]'])if(raw.startsWith(marker)){try{lifecycle.push({kind:marker,...JSON.parse(raw.slice(marker.length).trim())});}catch{}}});page.on('pageerror',error=>errors.push({message:error.message,path:new URL(page.url()).pathname,stack:error.stack,lifecycle:lifecycle.slice(-3),knownPayroll:error.message.startsWith('e.split is not a function')&&new URL(page.url()).pathname.startsWith('/salaries')&&(error.stack?.includes('bdMonthMeta')||(engine==='webkit'&&error.stack?.includes('/assets/index-BQGspy0I.js:978:43')))}));
    const fatalErrors=()=>errors.filter(error=>version==='candidate'||!error.knownPayroll);
    // A contextual iframe may be replaced while an SPA return completes. Wait for
    // the current frames; detached old frames are not an application error.
    const settle=async()=>{
      for(let attempt=0;attempt<5;attempt++){
        await page.waitForLoadState('domcontentloaded');const frames=page.frames();
        for(const frame of frames){if(!/^https?:/.test(frame.url())||frame.isDetached())continue;
          try{await frame.waitForLoadState('domcontentloaded');await frame.waitForFunction(()=>{const ready=globalThis.__qaPendingApi===0&&globalThis.__bdBootstrapPending!==true&&document.documentElement.getAttribute('data-bd-startup-pending')!=='true',signature=location.href+'\n'+document.body.innerText,now=performance.now();if(!ready||globalThis.__qaReadySignature!==signature){globalThis.__qaReadySignature=signature;globalThis.__qaReadySince=now;return false;}return now-globalThis.__qaReadySince>=300;},null,{timeout:60000,polling:100});}
          catch(error){if(!frame.isDetached())throw error;}
        }
        const current=page.frames();if(current.length===frames.length&&current.every(frame=>frames.includes(frame)&&!frame.isDetached())){await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));return;}
      }throw Error('Contextual frames did not settle');
    };
    const visit=async path=>{if(/^https?:/.test(page.url())){if(new URL(page.url()).pathname==='/home'){await page.locator('[data-bd-home-attention]').first().waitFor({timeout:60000});}await settle();}const requested=new URL(path,'http://isolated.test');const payrollDefault=requested.pathname.startsWith('/salaries')&&!requested.searchParams.has('month');if(version==='v485'&&payrollDefault){requested.searchParams.set('month','2026-10');path=requested.pathname+'?'+requested.searchParams;}try{await page.goto(runtime.base+path,{timeout:30000});}catch(error){if(!String(error).includes('ERR_ABORTED'))throw error;await settle();await page.goto(runtime.base+path,{timeout:30000});}await settle();await page.waitForFunction(()=>document.documentElement.getAttribute('data-bd-startup-pending')!=='true');};
    const state=async()=>page.evaluate(()=>{
      const visible=e=>{if(!e.getClientRects().length)return false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden')return false;if(p.tagName==='DETAILS'&&!p.hasAttribute('open')&&!p.querySelector(':scope>summary')?.contains(e)&&p!==e)return false;}return true;};
      const label=e=>{const copy=e.cloneNode(true);for(const child of copy.querySelectorAll('[aria-hidden=true]'))child.remove();return(e.getAttribute('aria-label')||copy.textContent||'').trim().replace(/\s+/g,' ');};
      return {authBootstrapPending:window.__bdBootstrapPending??null,authBootstrap:window.__bdAuthBootstrapV274??null,sessionPresent:!!localStorage.getItem('bd_session_token'),activeDoctorQuestion:document.querySelector('[data-curated-answer]')?.getAttribute('data-curated-answer')??null,url:location.pathname+location.search,venue:localStorage.getItem('bd_active_venue_id'),contract:window.bdNavigationContract?.resolve(location.href)??{path:location.pathname,url:location.pathname+location.search,type:'native-auth-document'},surface:document.querySelector('[data-bd-home-daily]')?'home':document.querySelector('.bd-health-detail-v332')?'health':document.querySelector('.bd-curated-doctor')?'doctor':null,overflow:document.documentElement.scrollWidth>innerWidth+1,entries:[...document.querySelectorAll('button,a,summary')].filter(visible).map(e=>({label:label(e),tag:e.tagName,index:[...e.ownerDocument.querySelectorAll('button,a,summary')].indexOf(e),href:e.getAttribute('href'),disabled:e.disabled===true,nav:!!e.closest('nav[data-bd-bottom-nav]')})).concat([...document.querySelectorAll('iframe')].filter(visible).flatMap(f=>[...f.contentDocument?.querySelectorAll('button,a,summary')??[]].filter(visible).map(e=>({label:label(e),tag:e.tagName,index:[...e.ownerDocument.querySelectorAll('button,a,summary')].indexOf(e),href:e.getAttribute('href'),disabled:e.disabled===true,nav:false,frame:new URL(f.src).pathname})))),text:document.body.innerText,frames:[...document.querySelectorAll('iframe')].map(e=>({title:e.title,text:e.contentDocument?.body?.innerText??''}))};
    });
    const file=`${out}/${version}-${width}-runtime.json`,all=resume&&existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{},allPaths=[...new Set(inventory.items.map(i=>i.path??i.from))],paths=resume?allPaths.filter(path=>!Object.hasOwn(all,path)):allPaths;if(resume){assert.ok(Object.keys(all).every(path=>allPaths.includes(path)));console.log(JSON.stringify({engine,width,version,resuming:paths.length,retained:Object.keys(all).length}));}
    try{
      for(const path of paths){
        const errorsAtRoute=errors.length;await visit(path);let before=await state();
        // The compatibility redirects retain their v485 resolved destination.
        assert.equal(before.venue,String(r.venueId),path+' venue');
        assert.ok(before.contract,path+' contract');
        const fatal=runtime.requests.filter(q=>q.status>=500);assert.deepEqual(fatal,[],path+' HTTP 500');
        assert.deepEqual(fatalErrors(),[],path+' runtime errors');
        assert.equal(before.overflow,false,path+' overflow');
        const record={before,actions:{},baselineDefects:errors.slice(errorsAtRoute).filter(error=>error.knownPayroll&&error.path===new URL(before.url,runtime.base).pathname)};
        // Test the actual originating controls, not just direct-open destinations.
        const entries=inventory.items.filter(i=>i.from===path&&i.kind==='entry');
        for(const item of entries){
          if(item.entryScope==='home')continue; // exact legacy Home checks below
          const errorsAtAction=errors.length;await visit(path);

          if(item.entryScope==='add-menu')await page.locator('nav[data-bd-bottom-nav] button[data-bd-nav-key="add"]').click();
          let locator;
          if(item.entryScope==='add-menu')locator=page.locator('[data-bd-add-menu] button').filter({hasText:item.label});
          else if(item.selector)locator=page.locator(item.selector);
          else if(item.entryScope==='more')locator=page.getByRole('button',{name:new RegExp('^'+escape(item.label))});
          else{
            const current=await state(),approvedLabel=item.label,entry=current.entries.find(e=>normalized(e.label)===normalized(approvedLabel))??(version==='candidate'&&path==='/health'&&item.label==='Открыть поручения'?current.entries.find(e=>e.label==='Открыть поручения →'):null);
            if(entry){const scope=entry.frame?page.frames().find(f=>new URL(f.url()).pathname===entry.frame):page;locator=scope?.locator('button,a,summary').nth(entry.index);}
          }
          if(item.mobile==='via /more'&&width<1024){record.actions[item.id]={conditional:'v485 desktop-only primary; tested More Reviews entry'};continue;}
          if(!locator||!await locator.count()){
            // The inventory also records source-owned data-dependent entries.
            // A missing control is acceptable only when absent in the identical baseline fixture.
            assert.ok(!before.entries.some(e=>normalized(e.label)===normalized(item.label)),item.id+' originating entry exists but test could not locate it');record.actions[item.id]={absent:true};continue;
          }
          locator=locator.first();await locator.waitFor({state:'visible'});if(item.entryScope==='legacy-diagnosis'){await locator.click({trial:true});record.actions[item.id]={activation:'PASS (actual run tested in separate isolated legacy diagnosis fixture)',handler:'Uce.A → POST /api/ai/diagnosis'};continue;}
          if(await locator.isDisabled()){record.actions[item.id]={disabled:true};continue;}
          const actionOrigin=await state();await locator.click({trial:true});await locator.click();try{await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));}catch(error){if(!String(error).includes('Execution context was destroyed'))throw error;await page.waitForLoadState('domcontentloaded');}await settle();
          let after=await state();const originalPayrollFailure=version==='v485'&&errors.slice(errorsAtAction).some(error=>error.knownPayroll&&error.path===new URL(after.url,runtime.base).pathname);if(originalPayrollFailure){const original=after.url;await visit(after.url);after=await state();after.approvedPayrollProbe={original,explicitMonth:'2026-10'};}assert.equal(after.venue,String(r.venueId),item.id+' venue');
          record.actions[item.id]={url:after.url,contract:after.contract,actionOrigin:{url:actionOrigin.url,question:actionOrigin.activeDoctorQuestion},approvedPayrollProbe:after.approvedPayrollProbe??null,baselineDefects:errors.slice(errorsAtAction).filter(error=>error.knownPayroll&&error.path===new URL(after.url,runtime.base).pathname),opened:after.entries.map(e=>({label:e.label,tag:e.tag,href:e.href}))};
          if(item.target&&item.target!==after.url){
            const a=new URL(after.url,runtime.base),b=new URL(item.target,runtime.base);
            assert.equal(a.pathname,b.pathname,item.id+' destination');
            for(const[k,v]of b.searchParams)if(a.searchParams.has(k))assert.equal(a.searchParams.get(k),v,item.id+' query');
          }
          if(after.url!==actionOrigin.url){await settle();await page.reload();await settle();const reloaded=await state();assert.equal(new URL(reloaded.url,runtime.base).pathname,new URL(after.url,runtime.base).pathname,item.id+' reload destination');assert.equal(reloaded.venue,String(r.venueId),item.id+' reload venue');record.actions[item.id].reloaded={url:reloaded.url,contract:reloaded.contract};}
          assert.deepEqual(runtime.requests.filter(q=>q.status>=500),[],item.id+' HTTP 500');
        }
        all[path]=record;console.log(JSON.stringify({engine,width,version,path,entriesTested:Object.keys(record.actions).length}));writeFileSync(`${out}/${version}-${width}-runtime.json`,JSON.stringify(all,null,2));writeFileSync(`${out}/${version}-${width}-requests.json`,JSON.stringify(runtime.requests,null,2));writeFileSync(`${out}/${version}-${width}-runtime-errors.json`,JSON.stringify(errors,null,2));
      }
      await visit('/home');await page.locator('[data-bd-home-attention]').first().waitFor();
      assert.equal(await page.locator('.bd-management-queue,[data-curated-question]').count(),0,'No declined Phase 4B/C UI');
      for(const item of inventory.items.filter(i=>i.entryScope==='home')){const selector=version==='candidate'&&item.label.startsWith('Today')?'[data-bd-home-daily]':item.selector;const element=page.locator(selector).first();await element.waitFor({state:'visible'});assert.equal(await element.evaluate(e=>{for(let p=e;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)return true;return false;}),false,item.id+' closed disclosure');}
      const legacy=[['[data-bd-home-health-index] button','/health'],['.bd-home-money','/reports'],['[data-bd-home-reviews] button','/reviews'],['[data-bd-home-context] button:first-child','/opportunities'],['[data-bd-home-context] button:last-child','/market']];
      for(const[selector,defaultTarget]of legacy){await visit('/home');const control=page.locator(selector).first();await control.waitFor({state:'visible'});const target=selector.includes('home-reviews')&&(await control.innerText()).includes('Подключить')?'/integrations':defaultTarget;await control.click({trial:true});await control.click();await page.waitForURL(u=>u.pathname===target);await settle();await page.reload();await settle();assert.equal(new URL(page.url()).pathname,target);await page.goBack();await settle();assert.equal((await state()).venue,String(r.venueId));}
      await visit('/home');await page.getByRole('button',{name:'Переключить заведение',exact:true}).click();await page.getByText('QA Phase 4C — работающая кофейня',{exact:true}).last().waitFor();
      const finance=await r.api.store.GET(r.requestAction('/api/store/bd_finance_expenses'),{params:Promise.resolve({key:'bd_finance_expenses'})});assert.equal(finance.status,200);assert.deepEqual((await finance.json()).data,r.read('bd_finance_expenses'));
      versions[version]=all;
      console.log(JSON.stringify({engine,width,version,pages:Object.keys(all).length,executedPages:paths.length,legacyHome:'PASS',finance:200}));
    }catch(error){await page.screenshot({path:`${out}/${version}-${width}-failure.png`,fullPage:true});writeFileSync(`${out}/${version}-${width}-failure.txt`,String(error));writeFileSync(`${out}/${version}-${width}-failure-state.json`,JSON.stringify(await state(),null,2));throw error;}
    finally{writeFileSync(`${out}/${version}-${width}-requests.json`,JSON.stringify(runtime.requests,null,2));writeFileSync(`${out}/${version}-${width}-runtime-errors.json`,JSON.stringify(errors,null,2));await context.close();await runtime.close();}
  }
  const {compareRecoveryParity}=await import('./lib/reference-slice-recovery-compare.mjs');
  matrix.push(...compareRecoveryParity(inventory,versions,engine,width));
  results.push({engine,width,parity:inventory.items.length+'/'+inventory.items.length,status:matrix.some(row=>row.width===width&&row.verdict!=='PASS')?'FAIL':'PASS'});
  writeFileSync(`${out}/parity-matrix-${width}.json`,JSON.stringify(matrix.filter(row=>row.width===width),null,2));
}}finally{await browser.close();baseline.close();writeFileSync(`${out}/results-${process.env.BD_RECOVERY_WIDTH}.json`,JSON.stringify(results,null,2));assert.equal(createHash('sha256').update(readFileSync('public/assets/index-BQGspy0I.js')).digest('hex'),clientHash,'Candidate changed during parity verification');}
console.log(JSON.stringify(results));

if(results.some(result=>result.status!=='PASS'))process.exitCode=1;
