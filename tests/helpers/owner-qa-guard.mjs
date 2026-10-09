import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {parse} from 'acorn';

const baseline='fa836b711941c39984c40a40e3b9b45e88265014';
const implementation='27a223e7db9988d6cee394b73ac07bb9442067c7';
export const ownerQaFunctionNames=Object.freeze(['bdWriteoffDefaultUnitV271','bdWriteoffDisplayQuantityV271','bdWriteoffBaseV271','bdWriteoffLineV271','bdEquipmentWorkOrderEditorV167']);
const digest=value=>createHash('sha256').update(value).digest('hex');
function hashes(source){return Object.fromEntries(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration'&&ownerQaFunctionNames.includes(n.id.name)).map(n=>[n.id.name,digest(source.slice(n.start,n.end))]));}
const revisionHashes=revision=>hashes(execFileSync('git',['show',revision+':public/assets/index-BQGspy0I.js'],{encoding:'utf8',maxBuffer:64*1024*1024}));
/** Frozen implementation commit; editing a fixture cannot approve later code or extra functions. */
export function ownerQaApprovedHashes(manifest=JSON.parse(readFileSync('tests/fixtures/owner-qa-approved-functions.json','utf8')),source=readFileSync('public/assets/index-BQGspy0I.js','utf8')){
 assert.deepEqual(Object.keys(manifest).sort(),['baseline','functions','implementation']);
 assert.equal(manifest.baseline,baseline);assert.equal(manifest.implementation,implementation);
 assert.deepEqual(Object.keys(manifest.functions).sort(),[...ownerQaFunctionNames].sort());
 const before=revisionHashes(baseline),after=revisionHashes(implementation),actual=hashes(source);
 const historic=JSON.parse(readFileSync('tests/fixtures/reference-slice-recovery/v489-function-hashes.json','utf8'));
 for(const name of ownerQaFunctionNames){
  assert.deepEqual(manifest.functions[name],{before:before[name],after:after[name]},name+' exact reviewed delta');
  assert.equal(before[name],historic[name],name+' original v489 protection');
  assert.equal(actual[name],after[name],name+' exact implementation');
 }
 return after;
}
