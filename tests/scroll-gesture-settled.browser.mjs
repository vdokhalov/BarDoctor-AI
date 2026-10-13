import test from 'node:test';import assert from 'node:assert/strict';import {webkit} from 'playwright-core';
import {armScrollCompletion,waitForScrollCompletion,assertIdleScroll} from './helpers/scroll-gesture-settled.mjs';
test('native wheel ends before idle; real post-gesture spontaneous shift still fails strict idle guard',async()=>{
 const browser=await webkit.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1040,height:736}});await page.setContent('<!doctype html><style>body{margin:0;height:5000px}</style><main>Isolated scroll negative control</main>');await page.evaluate(()=>{window.__scrollQAOwner=document.scrollingElement;});await page.evaluate(armScrollCompletion);await page.mouse.move(400,300);await page.mouse.wheel(0,240);await page.waitForFunction(()=>scrollY>1);const completion=await waitForScrollCompletion(page);assert.ok(completion.events>=1);assert.ok(completion.end>completion.start);
 const metrics=()=>page.evaluate(()=>({scrollTop:scrollY,documentHeight:document.documentElement.scrollHeight,probe:{observerCallbacks:0}}));const before=await metrics();await page.waitForTimeout(300);assertIdleScroll(before,await metrics(),'native wheel settled');
 const shiftBefore=await metrics();await page.evaluate(()=>{setTimeout(()=>window.scrollBy({top:24,behavior:'instant'}),50);});await page.waitForTimeout(300);const shifted=await metrics();assert.equal(shifted.scrollTop-shiftBefore.scrollTop,24);assert.throws(()=>assertIdleScroll(shiftBefore,shifted,'injected spontaneous shift'),/unexpected scroll/);
 await page.evaluate(armScrollCompletion);await assert.rejects(waitForScrollCompletion(page),/Timeout/);assert.equal(await page.evaluate(()=>window.__bdGestureCompletion),undefined);
 console.log(JSON.stringify({completion,negativeDelta:shifted.scrollTop-shiftBefore.scrollTop,missingScrollend:'TIMEOUT_AS_REQUIRED'}));
 }finally{await browser.close();}
});
