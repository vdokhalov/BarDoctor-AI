import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import runtime from './browser-runtime.cjs';
const fragment=fs.readFileSync('scripts/fragments/accounting-boundary-v514.fragment.txt','utf8');
const fixture=`import * as S from 'react';import * as i from 'react/jsx-runtime';import {createRoot} from 'react-dom/client';
localStorage.setItem('bd_active_role','owner');localStorage.setItem('bd_session_userid','fixture-user');window.bdHasClientPermission=()=>true;
const ca=()=>({'X-Fixture-Auth':'fixture'}),Ot=()=>'',bdMonthlyVenueIdPhase7=()=>Number(window.fixtureVenue||901),bdMonthMeta=()=>({start:'2026-09-01',nextStart:'2026-10-01'}),bdMonthClosingMoney=String,bdSnapshotTotal=s=>s.total;
window.requests=[];window.savedEvents=[];window.addEventListener('bd:accounting-boundary-saved',e=>window.savedEvents.push(e.detail));
window.fetch=async(url,options)=>{window.requests.push({url,...options});if(options.method==='GET')return {ok:true,json:async()=>({ok:true,data:[],updatedAt:null})};const body=JSON.parse(options.body);if(!window.persisted){window.persisted=body;throw Error('Ответ сервера потерян');}if(JSON.stringify(body)!==JSON.stringify(window.persisted))throw Error('Retry payload changed');return {ok:true,json:async()=>({ok:true,data:body.data,updatedAt:'fixture'})};};
${fragment}
function Fixture(){const[open,setOpen]=S.useState(true);return open?i.jsx(bdAccountingBoundaryEditorV514,{venueId:901,date:'2026-09-01',currency:'PMR_RUB',sectionNames:['Бар','Кухня'],onClose:()=>setOpen(false)}):i.jsx('p',{children:'Сохранено'})}createRoot(document.getElementById('root')).render(i.jsx(Fixture,{}));`;
const built=await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
const browser=await chromium.launch({headless:true,executablePath:process.env.BD_QA_BROWSER||await runtime.resolveBrowserExecutable(chromium.executablePath())});
try{for(const width of [390,412,1440]){
 const context=await browser.newContext({viewport:{width,height:844}});await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));const page=await context.newPage();await page.goto('http://localhost/');await page.addScriptTag({content:built.outputFiles[0].text});
 await page.getByLabel('Бар · PMR_RUB').fill('120.50');await page.getByLabel('Кухня · PMR_RUB').fill('0');await page.getByLabel('Источник и причина подтверждения').fill('Fixture source');await page.getByRole('checkbox').check();
 assert.equal(await page.getByLabel('Дата границы').inputValue(),'2026-09-01');assert.equal(await page.getByLabel('Дата границы').getAttribute('readonly'),'');
 await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Бар · PMR_RUB').inputValue(),'120.50');
 await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByText('Сохранено',{exact:true}).waitFor();
 const result=await page.evaluate(()=>({requests:window.requests,events:window.savedEvents}));assert.deepEqual(result.requests.map(r=>r.method),['GET','PUT','PUT']);assert.equal(result.requests[1].body,result.requests[2].body);assert.equal(result.requests[1].headers['X-Fixture-Auth'],'fixture');assert.equal(result.events.length,1);assert.equal(result.events[0].venueId,901);
 await context.close();console.log(width+'px actual React editor: required fields, explicit zero, preserved failed draft, stable-id retry, authoritative save event PASS');
}}finally{await browser.close();}
