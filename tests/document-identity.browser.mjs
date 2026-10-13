import assert from 'node:assert/strict';
import test from 'node:test';
import {webkit} from 'playwright-core';
import {captureDocumentIdentity,assertDocumentIdentity} from './helpers/document-identity.mjs';
test('DOM identity rejects reload even with identical timeOrigin and rejects departed documents',async()=>{
 const browser=await webkit.launch({headless:true});
 try {
  const page=await browser.newPage();
  await page.route('http://identity.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><main>Identity</main>'}));
  await page.goto('http://identity.test/');
  const same=await captureDocumentIdentity(page);
  await page.evaluate(()=>history.pushState({},'', '/same-document'));
  assert.equal((await assertDocumentIdentity(page,same,'same-document route')).sameDocument,true);
  const jitter=await captureDocumentIdentity(page);
  await page.evaluate(()=>Object.defineProperty(performance,'timeOrigin',{configurable:true,value:performance.timeOrigin+1}));
  const result=await assertDocumentIdentity(page,jitter,'controlled timestamp drift');
  assert.equal(result.afterTimeOrigin-result.beforeTimeOrigin,1);
  await page.addInitScript(()=>Object.defineProperty(performance,'timeOrigin',{configurable:true,value:123}));
  await page.reload();const reload=await captureDocumentIdentity(page);await page.reload();
  assert.equal(await page.evaluate(()=>performance.timeOrigin),123);
  await assert.rejects(assertDocumentIdentity(page,reload,'real reload'));
  const departed=await captureDocumentIdentity(page);await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));
  await assert.rejects(assertDocumentIdentity(page,departed,'departure'),/document departed/);
 }finally{await browser.close();}
});
