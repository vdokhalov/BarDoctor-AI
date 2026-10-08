import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
test('legacy client keeps curated API dormant and repeated presentation preparation is lossless',()=>{
 const file='public/assets/index-BQGspy0I.js',before=readFileSync(file,'utf8');
 execFileSync(process.execPath,['scripts/patch-curated-doctor-phase4c.mjs']);
 assert.equal(readFileSync(file,'utf8'),before);parse(before,{ecmaVersion:'latest',sourceType:'module'});
 const client=readFileSync('lib/bardoctor/client/curated-doctor.tsx','utf8');assert.ok(!client.includes('<input'));assert.match(client,/AbortController/);assert.match(client,/value.scope.venueId!==venue/);assert.match(client,/actor\(\)===currentActor/);assert.match(client,/CANONICAL_SERVER_REREAD|DETERMINISTIC_CANONICAL_SERVER/);
 for(const marker of ['bdCuratedDoctorPhase4c','bdCuratedHealthSuggestionPhase4c','bdCuratedReturnPhase4c'])assert.ok(!before.includes(marker));
 assert.ok(before.includes('bdCostHealthPhase4a'));
 assert.ok(before.includes('bdManagementModulePhase4b')); // independent Tasks/Day/Stock fixes retained
});
