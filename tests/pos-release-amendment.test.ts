import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {posAmendment,posBaseline,posPaths} from './helpers/pos-release-amendment.mjs';
test('POS amendment pins exact files and bytes while preserving untouched release boundaries',()=>{
 const manifest=JSON.parse(readFileSync('tests/fixtures/pos-release-amendment.json','utf8'));
 const view=posAmendment();
 assert.deepEqual(view.read('app/api/sales-events/route.ts'),execFileSync('git',['show',posBaseline+':app/api/sales-events/route.ts']));
 const extra=structuredClone(manifest);extra.files['lib/bardoctor/operational-day.ts']=extra.files[posPaths[0]];assert.throws(()=>posAmendment(extra));
 const wrong=structuredClone(manifest);wrong.baseline='HEAD';assert.throws(()=>posAmendment(wrong));
 const digest=structuredClone(manifest);digest.files[posPaths[0]].after='0'.repeat(64);assert.throws(()=>posAmendment(digest));
 const altered=(path:string)=>Buffer.concat([readFileSync(path),Buffer.from('\n// unreviewed')]);
 assert.throws(()=>posAmendment(manifest,(path:string)=>path===posPaths[0]?altered(path):readFileSync(path)));
 const unchanged='lib/bardoctor/operational-day.ts';
 const changedView=posAmendment(manifest,(path:string)=>path===unchanged?altered(path):readFileSync(path));
 assert.throws(()=>assert.deepEqual(changedView.read(unchanged),execFileSync('git',['show',posBaseline+':'+unchanged])));
 assert.ok(view.paths(['unexpected/new.ts']).includes('unexpected/new.ts'));
 assert.throws(()=>posAmendment(manifest,(path:string)=>path==='package.json'?Buffer.from(JSON.stringify({...JSON.parse(readFileSync(path,'utf8')),unapproved:true})):readFileSync(path)));
});
test('npm aggregate removes only the duplicate artifact preparation; artifact lifecycle preserves every gate',()=>{
 const before=JSON.parse(execFileSync('git',['show',posBaseline+':package.json'],{encoding:'utf8'})).scripts;
 const after=JSON.parse(readFileSync('package.json','utf8')).scripts;
 assert.equal(after.test,before.test.replace(/^npm run pretest:artifact && /,''));
 for(const [name,value] of Object.entries(before))if(name!=='test')assert.equal(after[name],value,name);
 assert.equal(Object.keys(after).length,Object.keys(before).length);
});
