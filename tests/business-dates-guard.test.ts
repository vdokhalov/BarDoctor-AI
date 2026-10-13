import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertBusinessDateBackend,businessDateBackend} from './helpers/business-dates-guard.mjs';
import {p0Amendment} from './helpers/p0-release-amendment.mjs';
test('v517 amendment preserves business dates and rejects later client/backend edits',()=>{
 const asset='public/assets/index-BQGspy0I.js',source=readFileSync(asset,'utf8');
 assert.ok(p0Amendment());assertBusinessDateBackend();
 for(const changed of [source.replace('function sg(e){','function sg(e){throw 1;'),source+'\n// unrelated edit',source.replace('joined=inputs.revenueRows','joined=revenues')]){
  assert.notEqual(changed,source);assert.throws(()=>p0Amendment({read:(path:string)=>path===asset?Buffer.from(changed):readFileSync(path)}));
 }
 assert.throws(()=>assertBusinessDateBackend(readFileSync(businessDateBackend,'utf8')+'\n// later edit'));
});
