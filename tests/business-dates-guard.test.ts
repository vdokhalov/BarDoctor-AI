import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreBusinessDateBaseline,assertBusinessDateBackend,businessDateBackend} from './helpers/business-dates-guard.mjs';
test('business-date amendment accepts only the pinned implementation and preserves every other byte',()=>{
 const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
 assert.ok(restoreBusinessDateBaseline(source));assertBusinessDateBackend();
 assert.throws(()=>restoreBusinessDateBaseline(source.replace('function sg(e){','function sg(e){throw 1;')));
 assert.throws(()=>restoreBusinessDateBaseline(source+'\n// unrelated edit'));
 assert.throws(()=>restoreBusinessDateBaseline(source.replace('joined=inputs.revenueRows','joined=revenues')));
 assert.throws(()=>assertBusinessDateBackend(readFileSync(businessDateBackend,'utf8')+'\n// later edit'));
});
