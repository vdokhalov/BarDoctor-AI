import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {GET} from '../app/opportunities/route';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const root=resolve(process.env.ARTIFACT_ROOT||'public');
const server=createServer(async(req,res)=>{try{const url=new URL(req.url!,'http://localhost');if(url.pathname==='/opportunities'){const r=GET(new Request(url));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
const file=resolve(root,'.'+url.pathname);if(!file.startsWith(root)||!existsSync(file)){res.writeHead(404);res.end();return;}let bytes=readFileSync(file);if(url.pathname==='/opportunity-calendar-qa-v327.js')bytes=Buffer.from(bytes.toString().replaceAll('Кёльн','Тестовый календарь').replace('activationDate: startDate','activationDate: id === "halloween" ? "2026-10-29" : startDate').replaceAll('city: "Бендеры"','city: "Бендеры", timezone: "Europe/Chisinau"').replaceAll('Анонс за 10 дней','Тизер за 30 дней, полная программа за 14 дней, напоминание за 48 часов.').replaceAll('2026-09-01','2026-09-16').replace('if (method === "GET" &&', 'if(method!=="GET"){window.__bdUnexpectedWrites=(window.__bdUnexpectedWrites||0)+1;throw Error("Unexpected fixture mutation");} if (method === "GET" &&'));
if(url.pathname==='/opportunities.js'&&process.env.BASELINE_CALENDAR)bytes=readFileSync(process.env.BASELINE_CALENDAR);
res.setHeader('Content-Type',extname(file)==='.js'?'application/javascript':extname(file)==='.css'?'text/css':'image/svg+xml');res.end(bytes);}catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+(server.address() as any).port;
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs});mkdirSync('outputs/opportunity-timing',{recursive:true});
try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.clock.install({time:new Date('2026-10-23T12:00:00Z')});let writes=0;page.on('request',r=>{if(r.url().includes('/api/')&&r.method()!=='GET')writes++;});const path=base+'/opportunities?embedded=1&qaOpportunity=v327';await page.goto(path);await page.locator('#halloween summary').click();
if(process.env.BASELINE_CALENDAR){assert.ok(!(await page.locator('#halloween').innerText()).includes('Срок прошёл'));console.log('BASELINE REPRODUCED: old 30/14-day advice and 16Sep deadline unmarked on 23Oct');}else{
const check=async()=>{assert.match(await page.locator('#halloween').innerText(),/Тизер за 30 дней — Срок прошёл/);assert.match(await page.locator('#halloween').innerText(),/полная программа за 14 дней — Срок прошёл/);assert.match(await page.locator('#halloween').innerText(),/16 сентября 2026 г. · Срок прошёл/);assert.equal(await page.locator('#summary-nearest-value').innerText(),'8 дней');};await check();
await page.locator('#halloween .recommendation-grid').scrollIntoViewIfNeeded();await page.screenshot({path:'outputs/opportunity-timing/calendar-390.png'});await page.reload();await page.locator('#halloween summary').click();await check();
await page.clock.setFixedTime(new Date('2026-10-24T12:00:00Z'));await page.reload();await page.locator('#halloween summary').click();assert.equal(await page.locator('#summary-nearest-value').innerText(),'7 дней');assert.ok(!(await page.locator('#halloween .event-copy').innerText()).includes('Событие прошло'));
await page.clock.setFixedTime(new Date('2026-10-30T23:30:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(await page.locator('#summary-nearest-value').innerText(),'Сегодня');await page.reload();await page.locator('#halloween summary').click();assert.equal(await page.locator('#summary-nearest-value').innerText(),'Сегодня');
await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'));await page.reload();await page.locator('#halloween summary').click();assert.match(await page.locator('#halloween').innerText(),/Событие прошло/);assert.equal(await page.locator('#summary-nearest-value').innerText(),'—');
await page.clock.setFixedTime(new Date('2026-08-01T12:00:00Z'));await page.reload();await page.locator('#halloween summary').click();assert.ok(!(await page.locator('#halloween').innerText()).includes('Срок прошёл'));
assert.equal(writes,0);assert.equal(await page.evaluate(()=>(window as any).__bdUnexpectedWrites||0),0);console.log('PASS compiled calendar: saved plan, reload, venue midnight, past, distant; no API writes or AI calls');}
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
