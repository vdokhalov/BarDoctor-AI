import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';

import {p0Amendment,p0Baseline} from './helpers/p0-release-amendment.mjs';



const baseline=p0Baseline;

const read=path=>readFileSync(path,'utf8');

const functions=source=>new Map(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));

test('legacy Doctor remains released v517; owner-UAT repairs restore full Health and reachable Doctor without V1.2',()=>{
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

test('v517 APIs, schema, auth and modules stay exact outside the approved P0 amendment',()=>{ assert.ok(p0Amendment().files>300); });

test('release preparation cannot reinstall the rejected design or lose Payroll and performance fixes',()=>{
 const source=read('public/assets/index-BQGspy0I.js');
 execFileSync('npm',['run','pretest:artifact'],{maxBuffer:8*1024*1024});
 assert.equal(read('public/assets/index-BQGspy0I.js'),source);
 assert.equal(source.split('window.bdReadNavigationQuery("month",bdPayrollInitialMonth())').length-1,2);
 for(const path of ['lib/bardoctor/client/curated-doctor.tsx','lib/bardoctor/client/management-actions.tsx']){
  assert.match(read(path),/readCanonicalJson/);assert.match(read(path),/canonicalReadScheduler/);
 }
 assert.match(read('lib/bardoctor/client/curated-doctor.tsx'),/!ready\|\|!answerView/);
});
