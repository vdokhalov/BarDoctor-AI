import test from 'node:test';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {readFileSync,existsSync} from 'node:fs';
import {assertScope,baseline,reviewedHead,branch,policyPaths} from '../scripts/ci-storage-migration-scope.mjs';
import {assertRequiredGates,fullGates} from '../scripts/ci-required-gates.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function sample(){return {event:'workflow_dispatch',ref:branch,head:'a'.repeat(40),manifest:{baseline,reviewedHead,files:{'lib/approved.ts':{before:hash('before'),after:hash('after')}}},changes:[{path:'lib/approved.ts',status:'M',mode:'100644'}],read:sha=>sha===baseline?'before':'after'};}
test('scope accepts exact approved manual diff and rejects altered bytes, broadened paths, modes and context',()=>{
 assert.equal(assertScope(sample()),'storage-migration');
 for(const patch of [{event:'push'},{event:'pull_request'},{ref:'refs/heads/main'},{head:'HEAD'},{read:()=> 'changed'},{changes:[]},{changes:[...sample().changes,{path:'app/new.ts',status:'A',mode:'100644'}]},{changes:[{...sample().changes[0],status:'D'}]},{changes:[{...sample().changes[0],mode:'120000'}]},{manifest:{...sample().manifest,baseline:'wrong'}},{manifest:{...sample().manifest,reviewedHead:'wrong'}}])assert.throws(()=>assertScope({...sample(),...patch}));
 assert.ok(!policyPaths.includes('lib/approved.ts'));assert.ok(!policyPaths.includes('app/api/sales-events/route.ts'));
});
function results(){return {changes:{result:'success',outputs:{mode:'storage-migration'}},'storage-migration':{result:'success'},'sales-presentation':{result:'skipped'},...Object.fromEntries(fullGates.map(n=>[n,{result:'skipped'}]))};}
test('storage aggregate fails closed for every missing, failed, cancelled or skipped selected job',()=>{
 assert.doesNotThrow(()=>assertRequiredGates(results()));
 for(const name of ['changes','storage-migration'])for(const result of ['failure','cancelled','skipped',undefined]){const jobs=results();jobs[name].result=result;assert.throws(()=>assertRequiredGates(jobs));}
 const missing=results();delete missing['storage-migration'];assert.throws(()=>assertRequiredGates(missing));
 for(const name of [...fullGates,'sales-presentation']){const jobs=results();jobs[name].result='success';assert.throws(()=>assertRequiredGates(jobs));}
 const typo=results();typo.changes.outputs.mode='storage';assert.throws(()=>assertRequiredGates(typo));
});
test('manual storage job keeps native D1/R2, consumers and exact SHA controls without broad browser aliases',()=>{
 const workflow=readFileSync('.github/workflows/google-reviews-setup-v400.yml','utf8');
 const block=workflow.split('  storage-migration:\n')[1].split('  sales-presentation:\n')[0];
 assert.match(block,/timeout-minutes: 25/);assert.match(block,/ci-storage-migration-scope\.mjs/);
 for(const file of ['journal-migration-runner.test.ts','journal-migration-runner-d1.test.mjs','stock-journal-d1.test.mjs','sales-event-journal-d1.test.mjs','stock-journal-lifecycle.test.ts','sales-event-journal.test.ts','pos-live-overview.test.ts','account-lifecycle.test.ts','evidence-resolver-phase3a1.test.ts','valuation-api.test.ts','inventory-counts-api.test.ts','sales-workday-gate.test.ts','platform-persistence-audit.test.ts','domain-writer-venue-isolation.test.ts'])assert.ok(block.includes('tests/'+file),file);
 for(const path of block.match(/tests\/[\w.-]+/g)||[])assert.ok(existsSync(path),path);
 assert.doesNotMatch(block,/npm test|browser|playwright|health-doctor/);
 assert.match(workflow,/if \[\[ "\$RELEASE_SCOPE" == "storage-migration" \]\]; then\n            node scripts\/ci-storage-migration-scope.mjs\n            exit 0/);
 assert.ok(!workflow.split('  workflow_dispatch:')[0].split('  push:')[1].includes('feat/staff-pin-pos-20261015'),'approved branch push must not auto-start broad CI');
 assert.match(workflow,/needs: \[changes, storage-migration,/);
});
