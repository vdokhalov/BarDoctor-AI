import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {classifyWebKitLifecycle} from '../scripts/qa/webkit-environment-classifier.mjs';
const fixture=JSON.parse(readFileSync('tests/fixtures/month-read-disposal-evidence.json','utf8'));
const classify=evidence=>classifyWebKitLifecycle({suite:evidence.suite,width:390,exitCode:0,trace:readFileSync('tests/fixtures/month-read-disposal-process.log','utf8'),evidence});
test('recorded WebKit request IDs prove reader disposal and same-scope HTTP200 replacement',()=>{
 assert.equal(classify(structuredClone(fixture)).status,'PASS');
});
const first=fixture.failedRequests[0].requestId;
for(const [name,change] of [
 ['no request ID',e=>delete e.failedRequests[0].requestId],
 ['no owning dispose',e=>e.events=e.events.filter(x=>!(x.type==='month-reader-dispose'&&x.requestId===first))],
 ['unrelated disposal',e=>e.events.find(x=>x.type==='month-reader-dispose'&&x.requestId===first).requestId='other'],
 ['no signal abort',e=>e.events=e.events.filter(x=>!(x.type==='request-abort'&&x.requestId===first))],
 ['non-abort rejection',e=>e.events.find(x=>x.type==='request-rejected'&&x.requestId===first).errorName='TypeError'],
 ['network error without abort',e=>e.events.find(x=>x.type==='request-rejected'&&x.requestId===first).aborted=false],
 ['real network failure',e=>e.failedRequests[0].error='WebKit encountered an internal error'],
 ['POST cannot be exempted',e=>e.failedRequests[0].method='POST'],
 ['another endpoint',e=>e.failedRequests[0].path='/api/business-health'],
 ['no successful replacement',e=>e.events=e.events.filter(x=>x.type!=='request-result')],
 ['replacement in another venue',e=>e.events.filter(x=>x.type==='request-start'&&x.requestId!==first).forEach(x=>x.venueId='999')],
 ['replacement in another month',e=>e.events.filter(x=>x.type==='request-start'&&x.requestId!==first).forEach(x=>x.monthKey='2030-01')],
 ['replacement in another document',e=>e.events.filter(x=>x.type==='request-start'&&x.requestId!==first).forEach(x=>x.documentId='other')],
 ['HTTP500 remains fatal',e=>e.events.push({type:'http-response',path:'/api/month-close',status:500,at:e.completion.at-1})],
 ['unexpected 403 remains fatal',e=>e.events.push({type:'http-response',path:'/api/month-close',status:403,at:e.completion.at-1})],
 ['real page exception',e=>e.pageErrors.push({at:e.completion.at-1,message:'real error'})],
 ['late cancellation',e=>e.failedRequests[0].at+=5000],
 ['unproven navigation during read',e=>{const s=e.events.find(x=>x.type==='request-start'&&x.requestId===first);e.events.push({type:'navigation',documentId:s.documentId,at:s.at+1,event:'pagehide'});}]
])test('cancellation guard rejects '+name,()=>{
 const e=structuredClone(fixture);change(e);assert.equal(classify(e).status,'FAIL');
});
