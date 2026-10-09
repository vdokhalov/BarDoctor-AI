import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {recoveryApprovedHashes,recoveryBaseline,recoveryFiles} from './helpers/health-doctor-recovery-guard.mjs';

test('recovery approval is exact and cannot admit another file or later edit',()=>{
 const manifest=JSON.parse(readFileSync('tests/fixtures/health-doctor-recovery-approved-files.json','utf8'));
 assert.deepEqual(Object.keys(recoveryApprovedHashes()),[...recoveryFiles]);
 const extra=structuredClone(manifest);extra.files['lib/bardoctor/auth.ts']=extra.files[recoveryFiles[0]];
 assert.throws(()=>recoveryApprovedHashes(extra));
 const changed=structuredClone(manifest);changed.files[recoveryFiles[0]].after='0'.repeat(64);
 assert.throws(()=>recoveryApprovedHashes(changed));
 const wrongBase=structuredClone(manifest);wrongBase.baseline='HEAD';
 assert.throws(()=>recoveryApprovedHashes(wrongBase));
});

test('all API, auth, provider, schema, bindings and other backend files stay byte-identical to v501',()=>{
 const roots=['app/api','lib/bardoctor','db','drizzle','migrations','.openai/hosting.json','package-lock.json'];
 const paths=execFileSync('git',['ls-tree','-r','--name-only',recoveryBaseline,...roots],{encoding:'utf8'}).trim().split('\n');
 const current=execFileSync('git',['ls-files','--',...roots],{encoding:'utf8'}).trim().split('\n');
 assert.deepEqual(current,paths,'no added or removed production boundary files');
 assert.ok(paths.length>300);
 const approved=recoveryApprovedHashes();
 for(const path of paths){
  if(Object.hasOwn(approved,path))continue; // Exact contents already asserted above.
  assert.deepEqual(readFileSync(path),execFileSync('git',['show',recoveryBaseline+':'+path],{maxBuffer:64*1024*1024}),path);
 }
});

test('linked and unlinked stress use actual authenticated handlers within the hard CPU budget',{timeout:180000},()=>{
 const output=execFileSync(process.execPath,['--import','tsx','scripts/health-doctor-recovery-cpu.mjs'],{
  encoding:'utf8',maxBuffer:4*1024*1024,timeout:170000,
  env:{...process.env,BD_RECOVERY_BASELINE:'',BD_RECOVERY_PRODUCTS:'1000',BD_RECOVERY_MENUS:'60',BD_RECOVERY_MOVEMENTS:'8000',BD_RECOVERY_SCENARIOS:'linked,unlinked',BD_RECOVERY_QUESTIONS:'health,attention,cost',BD_RECOVERY_OUTPUT:'outputs/health-doctor-recovery/ci-stress'},
 });
 const results=output.trim().split('\n').filter(line=>line.startsWith('{')).map(line=>JSON.parse(line)).filter(value=>value.actualHandlers===true);
 assert.equal(results.length,6);
 for(const result of results){
  assert.equal(result.actualHandlers,true);assert.equal(result.production,false);
  assert.ok(result.cpuMs<10000,`${result.scenario}/${result.question}: ${result.cpuMs}ms`);
 }
 console.log(output.trim());
});
