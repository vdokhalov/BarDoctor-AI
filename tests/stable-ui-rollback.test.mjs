import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';

const baseline='dcc0541780db52d8c02b0c3a74f3ea0d31cbce24';
const production='7d4eeb44ea9ac0419d55881e846268bc31da57ee';
const read=path=>readFileSync(path,'utf8');
const before=path=>execFileSync('git',['show',production+':'+path],{maxBuffer:64*1024*1024});
const functions=source=>new Map(parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));

test('Home, Health and legacy Doctor render exactly as v485; V1.2 is absent from the executable client',()=>{
 const source=read('public/assets/index-BQGspy0I.js'),actual=functions(source);
 const expected=functions(execFileSync('git',['show',baseline+':public/assets/index-BQGspy0I.js'],{maxBuffer:64*1024*1024}).toString());
 for(const name of ['bdHomeDaily','c_e','Uce'])assert.equal(actual.get(name)?.replace('i.jsx(bdManagementVerificationPhase4b,{venue:Number(bdCostHealthVenue.activeVenueId)}),',''),expected.get(name),name);
 assert.doesNotMatch(source,/bdReferenceUIV1|bd-reference-render|reference-slice-v1:start|bdIntelligenceModuleV1|bdCuratedClientPhase4c|i\.jsx\(bdManagementHomePhase4|i\.jsx\(bdManagementQueuePhase4b/);
 for(const path of ['app/bar-doctor-response.ts','public/app.html'])assert.doesNotMatch(read(path),/intelligence-v1\.css/);
});

test('all production APIs, schema, domain calculations, credentials contracts and dependencies remain byte-identical',()=>{
 const files=execFileSync('git',['ls-tree','-r','--name-only',production,'app/api','lib/bardoctor','drizzle','migrations','db','package-lock.json','.openai/hosting.json']).toString().trim().split('\n');
 const ui=new Set(['lib/bardoctor/client/curated-doctor.tsx','lib/bardoctor/client/management-actions.tsx','lib/bardoctor/client/intelligence-ui.tsx']);
 assert.ok(files.length>300);
 for(const path of files.filter(p=>!ui.has(p)))assert.deepEqual(readFileSync(path),before(path),path);
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
