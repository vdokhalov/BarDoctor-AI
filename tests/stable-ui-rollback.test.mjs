import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {recoveryApprovedHashes,recoveryDigest} from './helpers/health-doctor-recovery-guard.mjs';

import {businessDateBackend,assertBusinessDateBackend} from './helpers/business-dates-guard.mjs';

const baseline='dcc0541780db52d8c02b0c3a74f3ea0d31cbce24';
const production='7d4eeb44ea9ac0419d55881e846268bc31da57ee';
const read=path=>readFileSync(path,'utf8');
const before=path=>execFileSync('git',['show',production+':'+path],{maxBuffer:64*1024*1024});
const functions=source=>new Map(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));

test('legacy Doctor remains v485; owner-UAT repairs restore full Health and reachable Doctor without V1.2',()=>{
 const source=read('public/assets/index-BQGspy0I.js'),actual=functions(source);
 const expected=functions(execFileSync('git',['show',baseline+':public/assets/index-BQGspy0I.js'],{maxBuffer:64*1024*1024}).toString());
 assert.equal(actual.get('Uce'),expected.get('Uce'));
 assert.doesNotMatch(actual.get('bdHomeDaily'),/managementCompact:!0|phase4a-home-ai-entry-retained-in-more/);
 assert.match(actual.get('bdHomeDaily'),/bdLegacyDoctorEntryV493/);
 assert.match(actual.get('c_e'),/bdLegacyHealthRingV493/);
 assert.match(actual.get('t_e'),/key:"ai-doctor"/);
 assert.doesNotMatch(source,/bdReferenceUIV1|bd-reference-render|reference-slice-v1:start|bdIntelligenceModuleV1|bdCuratedClientPhase4c|i\.jsx\(bdManagementHomePhase4|i\.jsx\(bdManagementQueuePhase4b/);
 for(const path of ['app/bar-doctor-response.ts','public/app.html'])assert.doesNotMatch(read(path),/intelligence-v1\.css/);
});

test('production APIs, schema, auth and unrelated modules stay identical outside reviewed UAT repair files',()=>{
 const files=execFileSync('git',['ls-tree','-r','--name-only',production,'app/api','lib/bardoctor','drizzle','migrations','db','package-lock.json','.openai/hosting.json']).toString().trim().split('\n');
 const ui=new Set(['lib/bardoctor/client/curated-doctor.tsx','lib/bardoctor/client/management-actions.tsx','lib/bardoctor/client/intelligence-ui.tsx',
 'lib/bardoctor/finance-inputs.ts','lib/bardoctor/client/canonical-read.ts','lib/bardoctor/client/management-cost.tsx',
 'lib/bardoctor/request-observability.ts','lib/bardoctor/canonical-health-inputs.ts',
 'app/api/business-health/route.ts','lib/bardoctor/health-operations-inputs.ts']);
 assert.ok(files.length>300);
 const recovery=recoveryApprovedHashes();assertBusinessDateBackend();
 for(const path of files.filter(p=>!ui.has(p))){
  if(path===businessDateBackend)continue; // Exact pinned date/count repair asserted above.
  if(Object.hasOwn(recovery,path))assert.equal(recoveryDigest(readFileSync(path)),recovery[path],path);
  else assert.deepEqual(readFileSync(path),before(path),path);
 }
});

test('release preparation cannot reinstall the rejected design or lose Payroll and performance fixes',()=>{
 const source=read('public/assets/index-BQGspy0I.js');
 execFileSync(process.execPath,['scripts/patch-curated-doctor-phase4c.mjs','--restore']);
 execFileSync(process.execPath,['scripts/patch-management-actions-phase4b.mjs','--restore']);
 execFileSync(process.execPath,['scripts/patch-management-actions-phase4b.mjs']);
 execFileSync(process.execPath,['scripts/patch-curated-doctor-phase4c.mjs']);
 assert.equal(read('public/assets/index-BQGspy0I.js'),source);
 assert.equal(source.split('window.bdReadNavigationQuery("month",bdPayrollInitialMonth())').length-1,2);
 for(const path of ['lib/bardoctor/client/curated-doctor.tsx','lib/bardoctor/client/management-actions.tsx']){
  assert.match(read(path),/readCanonicalJson/);assert.match(read(path),/canonicalReadScheduler/);
 }
 assert.match(read('lib/bardoctor/client/curated-doctor.tsx'),/!ready\|\|!answerView/);
});
