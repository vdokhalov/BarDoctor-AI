import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createRequire } from 'node:module';
import { chromium, webkit } from 'playwright-core';
import { healthInputsFixture } from '../tests/helpers/health-inputs-fixture';
import { barDoctorResponse } from '../app/bar-doctor-response';
import { waitForSalesHostReads } from '../tests/helpers/sales-navigation-settled';
import { webkitLifecycleEvidence } from './qa/webkit-lifecycle-evidence';
import type { Page } from 'playwright-core';
// The host-read guard requires a Health read after the final Store read.
// Canonical Health reads D1 directly; bootstrap response order is not evidence freshness.
async function waitForHealthHostReads(page: Page, evidence: ReturnType<typeof webkitLifecycleEvidence>) {
  evidence.guard(true);
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/business-health', { headers: {
      'X-Session-Email': localStorage.getItem('bd_session') || '',
      'X-Session-Token': localStorage.getItem('bd_session_token') || '',
      'X-Venue-Id': localStorage.getItem('bd_active_venue_id') || '',
    } });
    await response.json();
    return response.status;
  });
  assert.equal(status, 200);
  evidence.guard(false);
  await waitForSalesHostReads(page);
}
type HealthEnvelope = { data: { businessHealth: { components: { id: string; score: number | null }[] }; businessHealthSnapshot: { inputRevision: string } } };
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require('./browser-runtime.cjs');
const engine = process.env.BD_HEALTH_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ headless: true, ...(process.env.BD_WEBKIT_EVIDENCE && engine === webkit ? { executablePath: resolve("scripts/qa/webkit-native-trace.sh") } : {}), ...(engine === chromium ? { executablePath: await resolveBrowserExecutable(chromium.executablePath()), args: chromiumArgs } : {}) });
const out = `outputs/health-inputs-phase3a9/${engine === webkit ? 'webkit' : 'chromium'}`; mkdirSync(out, { recursive: true }); const results: unknown[] = [];
const observations: ReturnType<typeof webkitLifecycleEvidence>[] = [];
const widths = process.env.BD_HEALTH_WIDTH ? [Number(process.env.BD_HEALTH_WIDTH)] : [390,820,1280];
assert.ok(widths.every(width => [390,820,1280].includes(width)));
try { for (const width of widths) {
  const evidence = webkitLifecycleEvidence("health-inputs-phase3a9", width);
  observations.push(evidence);
  const r = await healthInputsFixture();
  r.seed('bd_month_closings', [{ id:'closed-qa', monthKey:'2026-09', status:'closed', snapshot:{ revenue:1000, finalProfit:300, profitMarginPercent:30, payroll:100, costOfGoods:200, otherExpenses:200, writeoffs:0, taxes:0, utilities:0 } }]);
  const server = createServer(async (req,res) => { try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`), chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); const body=Buffer.concat(chunks), key=url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string,string> = {'/api/auth/bootstrap':'bootstrap','/api/restaurants/me':'restaurant','/api/users/me':'users','/api/venues':'venues','/api/store':'bulkStore','/api/business-health':'health'};
    const request = new Request(url, { method:req.method, headers:req.headers as HeadersInit, ...(body.length ? { body } : {}) }); let response: Response;
    if (url.pathname === '/api/ai/diagnosis') response = await r.api.doctor.handleDiagnosis(request);
    else if (key || routes[url.pathname]) response = await r.api[key ? 'store' : routes[url.pathname]][req.method || 'GET'](request, { params:Promise.resolve({key}) } as never);
    else if (['/home','/health','/ai','/login','/'].includes(url.pathname)) response = barDoctorResponse();
    else { const file=resolve('public','.'+url.pathname); response=file.startsWith(resolve('public')) && existsSync(file) ? new Response(readFileSync(file), { headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'} as Record<string,string>)[extname(file)] || 'application/octet-stream'} }) : new Response(null,{status:404}); }
    if (url.pathname === '/api/business-health' || url.pathname === '/api/store/bd_assortment_v1') await evidence.health(request, response);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  } catch(error) { console.error(error);res.writeHead(500);res.end('fixture failure'); } });
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done)); const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const context=await browser.newContext({viewport:{width,height:900}}), errors:string[]=[];
  try {
    await evidence.attach(context, base, r.owner.token);
    await context.exposeBinding('__bdPerfObserve',()=>{}); await context.addInitScript({path:resolve('scripts/qa/sales-navigation-probe.js')});
    await context.addInitScript(({owner,venueId})=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));}, {owner:r.owner,venueId:r.venueId});
    await context.route('**/assets/index-BQGspy0I*.js*',async route=>{const url=new URL(route.request().url()),file=resolve('public','.'+url.pathname); await route.fulfill({contentType:'application/javascript',body:readFileSync(file,'utf8')+'\nwindow.__phase9={current:()=>bdBusinessHealthGetSharedV284(),accept:e=>bdBusinessHealthCommitEnvelopeV284(e)};'});});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.clock.setFixedTime(new Date('2026-10-03T12:00:00Z'));await page.goto(base+'/home');await page.waitForLoadState('networkidle');await waitForHealthHostReads(page, evidence);
    const call=async(path:string,method='GET',body?:object)=>page.evaluate(async({path,method,body})=>{const response=await fetch(path,{method,headers:{'Content-Type':'application/json','X-Session-Email':localStorage.getItem('bd_session')||'','X-Session-Token':localStorage.getItem('bd_session_token')||'','X-Venue-Id':localStorage.getItem('bd_active_venue_id')||''},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json() as HealthEnvelope};},{path,method,body});
    const a=await call('/api/business-health');assert.equal(a.status,200);assert.equal(a.body.data.businessHealth.components.find((c:{id:string})=>c.id==='operations')!.score,90);
    const d=await call('/api/ai/diagnosis','POST',{profile:{},equipment:[{repairCount:100}],cases:[{priority:'critical',status:'open'}]});assert.equal(d.status,200);assert.deepEqual(d.body.data.businessHealthSnapshot,a.body.data.businessHealthSnapshot);
    await page.waitForFunction(()=>Boolean((window as unknown as {__phase9:{current:()=>{snapshot:unknown}}}).__phase9?.current().snapshot));await page.screenshot({path:`${out}/${width}-known-zero.png`,fullPage:true});
    r.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key='bd_operational_reports_v1'").run(r.accountId);const partial=await call('/api/business-health');assert.equal(partial.body.data.businessHealth.components.find((c:{id:string})=>c.id==='operations')!.score,null);assert.notEqual(partial.body.data.businessHealthSnapshot.inputRevision,a.body.data.businessHealthSnapshot.inputRevision);await page.evaluate(body=>(window as unknown as {__phase9:{accept:(body:unknown)=>unknown}}).__phase9.accept(body),partial.body);
    await page.waitForFunction(()=>(window as unknown as {__phase9:{current:()=>{snapshot:{zones:{id:string;score:number|null}[]}}}}).__phase9.current().snapshot.zones.find(zone=>zone.id==='operations')?.score===null);
    await page.screenshot({path:`${out}/${width}-missing-source.png`,fullPage:true});await waitForHealthHostReads(page, evidence);await page.reload();await page.waitForLoadState('networkidle');
    // Reproduce a Store read finishing after bootstrap Health without altering its data.
    evidence.guard(true,'store');assert.equal((await call('/api/store/bd_assortment_v1')).status,200);evidence.guard(false);
    await waitForHealthHostReads(page, evidence);assert.equal((await call('/api/business-health')).body.data.businessHealth.components.find((c:{id:string})=>c.id==='operations')!.score,null);
    const foreign=await r.register(`health-switch-${width}@isolated.test`);evidence.scopeDenial(foreign.activeVenueId);await page.evaluate(id=>localStorage.setItem('bd_active_venue_id',String(id)),foreign.activeVenueId);const denied=await call('/api/business-health');assert.equal(denied.status,401);assert.equal(JSON.stringify(denied.body).includes('closed-qa'),false);assert.deepEqual(errors,[]);
    await evidence.completed(page,context);
    results.push({width,status:'PASS',homeDoctorEqual:true,revisionChange:true,reload:true,venueSwitch:true,pageErrors:errors});
  } catch(error) { const page=context.pages()[0];if(page){await evidence.failure(error, page, context);await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});writeFileSync(`${out}/${width}-failure.html`,await page.content());}throw error; }
  finally { evidence.lifecycle("context-close-start");await context.close();evidence.lifecycle("context-close-end");await new Promise<void>(done=>server.close(()=>done()));r.close(); }
} } finally { for(const observation of observations)observation.lifecycle("browser-close-start");await browser.close();for(const observation of observations)observation.lifecycle("browser-close-end");writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2)); }
console.log(JSON.stringify(results));
