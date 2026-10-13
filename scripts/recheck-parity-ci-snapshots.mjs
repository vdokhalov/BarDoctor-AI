import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {compareRecoveryParity} from './lib/reference-slice-recovery-compare.mjs';

// Offline replay of immutable CI evidence. Missing browser observations remain FAIL.
assert.ok(process.argv[2], 'Supply the extracted CI38399627118 WebKit snapshot directory');
const directory=resolve(process.argv[2]),out=resolve(process.argv[3]??'outputs/parity-ci-offline');
const manifest=JSON.parse(readFileSync('tests/fixtures/parity-ci-2ab-manifest.json'));
const digest=value=>createHash('sha256').update(value).digest('hex');
const read=name=>{const bytes=readFileSync(resolve(directory,name));assert.equal(digest(bytes),manifest.files[name],name+' exact CI evidence');return JSON.parse(bytes);};
const inventory=JSON.parse(readFileSync('tests/fixtures/reference-slice-recovery/v485-functional-inventory.json'));
assert.equal(inventory.items.length,290);mkdirSync(out,{recursive:true});
const results=[];
for(const width of [390,820,1280]) {
  const inputs=read(`candidate-${width}-inputs.json`);
  assert.deepEqual(read(`v485-${width}-inputs.json`),inputs,'identical business inputs');
  assert.equal(inputs.clientHash,digest(readFileSync('public/assets/index-BQGspy0I.js')),'unchanged captured product');
  assert.equal(inputs.inventoryHash,digest(JSON.stringify(inventory)),'complete captured inventory');
  assert.equal(inputs.baselineCommit,'dcc0541780db52d8c02b0c3a74f3ea0d31cbce24');
  const versions={};
  for(const version of ['v485','candidate']) {
    versions[version]=read(`${version}-${width}-runtime.json`);
    assert.deepEqual(Object.keys(versions[version]).sort(),[...new Set(inventory.items.map(item=>item.path??item.from))].sort());
    assert.deepEqual(read(`${version}-${width}-requests.json`).filter(request=>request.status>=500),[]);
    const errors=read(`${version}-${width}-runtime-errors.json`);
    if(version==='candidate')assert.deepEqual(errors,[]);
    else {
      // The already documented historical Payroll defect is preserved in the pinned raw evidence.
      assert.equal(errors.length,1);assert.equal(errors[0].knownPayroll,true);
      assert.equal(errors[0].path,'/salaries');assert.match(errors[0].message,/e\.split is not a function/);
    }
  }
  const rows=compareRecoveryParity(inventory,versions,'webkit',width);
  writeFileSync(resolve(out,`parity-matrix-${width}.json`),JSON.stringify(rows,null,2)+'\n');
  const failures=rows.filter(row=>row.verdict!=='PASS');
  results.push({width,pass:rows.length-failures.length,fail:failures.length,failures:failures.map(row=>({id:row.id,error:row.error.split('\n')[0]}))});
}
writeFileSync(resolve(out,'results.json'),JSON.stringify({run:manifest.run,head:manifest.head,artifact:manifest.artifact,mode:'offline; no new browser measurements',results},null,2)+'\n');
for(const {width,pass,fail} of results)console.log(JSON.stringify({width,pass,fail}));
if(results.some(result=>result.fail))process.exitCode=1;
