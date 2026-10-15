import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {compareRecoveryParity} from './lib/reference-slice-recovery-compare.mjs';

// Offline only. Never expands the browser inventory or adopts unverified input.
const directory=resolve(process.argv[2]??'outputs/reference-slice-recovery/remaining-18-390-webkit');
const read=name=>JSON.parse(readFileSync(resolve(directory,name),'utf8'));
const digest=value=>createHash('sha256').update(value).digest('hex');
const scope=JSON.parse(readFileSync('tests/fixtures/p0-parity-remaining-390.json','utf8'));
const inventory=JSON.parse(readFileSync('tests/fixtures/reference-slice-recovery/v485-functional-inventory.json','utf8'));
inventory.items=inventory.items.filter(item=>scope.paths.includes(item.path)||scope.actions.includes(item.id));
assert.equal(inventory.items.length,22);
const inputs=read('candidate-390-inputs.json');assert.deepEqual(read('v485-390-inputs.json'),inputs,'identical deterministic business inputs');
assert.equal(inputs.clientHash,digest(readFileSync('public/assets/index-BQGspy0I.js')),'exact captured candidate required');
assert.equal(inputs.baselineCommit,'dcc0541780db52d8c02b0c3a74f3ea0d31cbce24');
assert.equal(inputs.inventoryHash,digest(JSON.stringify(inventory)));
assert.equal(inputs.domainHash,'c33bb7123a2f9f170a7ddb43dd7b881bfbf1cf0b5687bec5ec16f67a62f05c7f');
assert.equal(inputs.healthHash,'769e6ec6a4b8b38329a25afe87a90cb8c9b7a28868cd392e6a282f136b5c7840');
const versions={};
for(const version of ['v485','candidate']) {
  versions[version]=read(version+'-390-runtime.json');
  assert.deepEqual(Object.keys(versions[version]).sort(),[...scope.paths].sort());
  assert.deepEqual(read(version+'-390-runtime-errors.json'),[]);
  assert.deepEqual(read(version+'-390-requests.json').filter(request=>request.status>=500),[]);
}
const matrix=compareRecoveryParity(inventory,versions,'webkit',390);
writeFileSync(resolve(directory,'reviewed-parity-matrix-390.json'),JSON.stringify(matrix,null,2)+'\n');
const result={scope:'18 affected origins + 4 changed actions; not a full290 parity claim',width:390,engine:'webkit',pass:matrix.filter(row=>row.verdict==='PASS').length,fail:matrix.filter(row=>row.verdict!=='PASS').length,clientHash:inputs.clientHash};
writeFileSync(resolve(directory,'reviewed-results-390.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
for(const row of matrix.filter(row=>row.verdict!=='PASS'))console.error(JSON.stringify(row));
if(result.fail)process.exitCode=1;
