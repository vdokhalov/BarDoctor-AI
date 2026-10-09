import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownerQaApprovedHashes,ownerQaFunctionNames} from './helpers/owner-qa-guard.mjs';
test('owner QA approval admits only the five exact implemented function repairs',()=>{
 assert.deepEqual(Object.keys(ownerQaApprovedHashes()).sort(),[...ownerQaFunctionNames].sort());
 const original=JSON.parse(readFileSync('tests/fixtures/owner-qa-approved-functions.json','utf8'));
 for(const mutate of [m=>m.functions.Uce=m.functions.bdWriteoffBaseV271,m=>m.baseline='HEAD',m=>m.implementation='HEAD',m=>m.functions.bdWriteoffBaseV271.before='0'.repeat(64),m=>m.functions.bdWriteoffBaseV271.after='0'.repeat(64)]){
  const changed=structuredClone(original);mutate(changed);assert.throws(()=>ownerQaApprovedHashes(changed));
 }
 const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');
 assert.throws(()=>ownerQaApprovedHashes(original,source.replace('function bdWriteoffBaseV271(e,t){','function bdWriteoffBaseV271(e,t){/* unexpected later edit */')));
});
