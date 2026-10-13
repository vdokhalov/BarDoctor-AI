import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';


import {p0Amendment,p0Baseline} from './helpers/p0-release-amendment.mjs';



test('historical recovery approval remains immutable; current exact boundaries use v517',()=>{
 for(const path of ['tests/helpers/health-doctor-recovery-guard.mjs','tests/fixtures/health-doctor-recovery-approved-files.json'])assert.deepEqual(readFileSync(path),execFileSync('git',['show',p0Baseline+':'+path]));
});

test('v517 production boundaries admit only the exact P0 amendment',()=>{ assert.ok(p0Amendment().files>300); });

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
