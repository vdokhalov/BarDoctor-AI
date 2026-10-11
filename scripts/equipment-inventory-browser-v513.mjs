import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {createRequire} from 'node:module';
const runtime=createRequire(import.meta.url)('./browser-runtime.cjs');
import {patchEquipmentInventoryV513} from './patch-equipment-inventory-v513.mjs';
const source=patchEquipmentInventoryV513(fs.readFileSync('public/assets/index-BQGspy0I.js','utf8'));
const component=source.slice(source.indexOf('const bdInventoryScopeHierarchyVersion='),source.indexOf('function bdWriteoffSheet',source.indexOf('const bdInventoryScopeHierarchyVersion=')));
const navigation=fs.readFileSync('public/bardoctor-preview-v397.js','utf8');
const guard=navigation.slice(navigation.indexOf('  var bdDirtySurfaces ='),navigation.indexOf('  /* Start the application shell',navigation.indexOf('  var bdDirtySurfaces =')));
const script=`import * as S from 'react';import * as i from 'react/jsx-runtime';import * as ug from 'react-dom';import {createRoot} from 'react-dom/client';
const W={div:({initial,animate,exit,...props})=>i.jsx('div',props)};
const bdWarehouseNumber=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d,bdWarehouseDecimal=x=>String(x),bdWarehouseUnit=x=>({kg:'кг',l:'л',ml:'мл',g:'г',pcs:'шт.'}[x]||x),bdWarehouseMoney=x=>String(x),ca=()=>({}),Ot=()=>1,bdDateKey=()=> '2026-10-11',bdInventoryDisplayLabelV270=()=> 'Инвентаризация',bdConfirmInventoryDeleteV270=()=>false;
${guard}
installNavigationConsistencyGuards();
${component}
const doc={id:'inventory',status:'counting',date:'2026-10-11',items:[{productKey:'coffee',productName:'Coffee',unit:'kg',entryUnit:'шт.',entryFactor:1,expected:4.86,actual:null}],summary:{totalLines:1,countedLines:0,uncountedLines:1}};
window.writes=[];window.fail=false;window.fetch=async(url,options)=>{const body=JSON.parse(options.body);window.writes.push(body);if(window.fail)return {ok:false,json:async()=>({ok:false,error:'fixture rejected'})};if(body.items)doc.items=doc.items.map(x=>({...x,...body.items.find(y=>y.productKey===x.productKey)}));doc.status=body.action==='finalize'?'completed':body.action==='review'?'review':'counting';doc.summary={totalLines:1,countedLines:1,uncountedLines:0};return {ok:true,json:async()=>({ok:true,inventory:structuredClone(doc)})}};
createRoot(document.getElementById('root')).render(i.jsx(bdInventoryCountSheet,{initial:doc,onSaved:()=>{},onClose:()=>document.getElementById('closed').textContent='closed'}));`;
const bundle=await build({stdin:{contents:script,resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
const browser=await chromium.launch({executablePath:process.env.BD_QA_BROWSER||await runtime.resolveBrowserExecutable(chromium.executablePath()),headless:true});
try{
for(const width of [390,1440]){
const page=await browser.newPage({viewport:{width,height:844}});const errors=[],prompts=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{prompts.push(d.message());await d.accept()});
await page.setContent('<div id="root"></div><div id="closed"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});
await page.getByLabel('Фактический остаток Coffee').fill('4.82');
await page.evaluate(()=>window.fail=true);await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByText('fixture rejected').waitFor();
assert.equal(await page.locator('[role="dialog"]').getAttribute('data-bd-unsaved-changes'),'true');
await page.evaluate(()=>window.fail=false);await page.getByRole('button',{name:'Перейти к результатам',exact:true}).click();
await page.getByRole('button',{name:'Завершить инвентаризацию',exact:true}).waitFor();
assert.equal(await page.locator('[role="dialog"]').getAttribute('data-bd-unsaved-changes'),null);
assert.match(await page.locator('.bd-inventory-review-list-v245').innerText(),/4.82 кг/);
await page.getByRole('button',{name:'Завершить инвентаризацию',exact:true}).click();await page.getByText('Завершённый документ',{exact:true}).waitFor();
await page.getByRole('button',{name:'Закрыть',exact:true}).click();assert.equal(await page.locator('#closed').innerText(),'closed');
assert.equal(prompts.length,1);assert.match(prompts[0],/^Завершить инвентаризацию/);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>window.writes.filter(x=>x.action==='finalize').length),1);
console.log(JSON.stringify({width,failedSaveRemainsDirty:true,reviewCanonicalUnits:true,completedCloseWithoutFalsePrompt:true,finalizeRequests:1}));await page.close();
}
}finally{await browser.close()}
