import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {p0Amendment,p0Baseline,p0Paths,p0Roots} from './helpers/p0-release-amendment.mjs';

test('v517 amendment pins exact files, baseline and bytes; rejects additional or missing paths',()=>{
 const manifest=JSON.parse(readFileSync('tests/fixtures/p0-release-amendment-v517.json','utf8'));
 assert.ok(p0Amendment());
 const extra=structuredClone(manifest);extra.files['lib/bardoctor/operational-day.ts']=extra.files[p0Paths[0]];assert.throws(()=>p0Amendment({manifest:extra}));
 const wrong=structuredClone(manifest);wrong.baseline='HEAD';assert.throws(()=>p0Amendment({manifest:wrong}));
 const digest=structuredClone(manifest);digest.files[p0Paths[0]].after='0'.repeat(64);assert.throws(()=>p0Amendment({manifest:digest}));
 const before=structuredClone(manifest);before.files[p0Paths[0]].before='0'.repeat(64);assert.throws(()=>p0Amendment({manifest:before}));
 for(const path of [p0Paths[0],'lib/bardoctor/staff-pin-session.ts','lib/bardoctor/staff-pin-credentials.ts','worker/index.ts','public/cashier.css','scripts/cashier-presentation-browser.ts','scripts/ci-change-scope.mjs','scripts/ci-required-gates.mjs','public/app-shell-v185.css','scripts/sales-shell-geometry-browser.ts','lib/bardoctor/auth.ts','lib/bardoctor/operational-day.ts','db/schema.ts','worker/index.ts','build/sites-vite-plugin.ts','.openai/hosting.json','package.json','package-lock.json']){
  assert.throws(()=>p0Amendment({read:(name:string)=>name===path?Buffer.concat([readFileSync(name),Buffer.from('\n// unreviewed')]):readFileSync(name)}),path);
 }
 const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--',...p0Roots],{encoding:'utf8'}).trim().split('\n');
 assert.throws(()=>p0Amendment({paths:[...paths,'app/api/unapproved/route.ts']}));
 assert.throws(()=>p0Amendment({paths:paths.filter(path=>path!=='lib/bardoctor/auth.ts')}));
});
test('v517 aggregate scripts retain every gate and dependency entry byte-for-byte',()=>{
 for(const path of ['package.json','package-lock.json'])assert.deepEqual(readFileSync(path),execFileSync('git',['show',p0Baseline+':'+path],{maxBuffer:8*1024*1024}));
});
test('historical approval implementations and manifests remain immutable',()=>{
 for(const path of ['tests/helpers/pos-release-amendment.mjs','tests/helpers/health-doctor-recovery-guard.mjs','tests/helpers/business-dates-guard.mjs','tests/fixtures/pos-release-amendment.json','tests/fixtures/health-doctor-recovery-approved-files.json'])assert.deepEqual(readFileSync(path),execFileSync('git',['show',p0Baseline+':'+path]));
});
