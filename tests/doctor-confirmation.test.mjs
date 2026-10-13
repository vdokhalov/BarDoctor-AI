import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {confirmDoctorAction} from './helpers/doctor-confirmation.mjs';
function fixture(message='Платный AI Doctor: один запрос, до 8000 выходных токенов. Test'){
 const calls=[];const dialog={type:()=> 'confirm',message:()=>message,accept:async()=>calls.push('accept'),dismiss:async()=>calls.push('dismiss')};
 return {calls,page:{waitForEvent:async type=>{assert.equal(type,'dialog');calls.push('wait');return dialog;}},button:{click:async()=>calls.push('click')}};
}
test('QA waits for and validates explicit confirmation before accepting',async()=>{const f=fixture();await confirmDoctorAction(f.page,f.button);assert.deepEqual(f.calls,['wait','click','accept']);});
test('unexpected consent is dismissed and fails instead of being silently accepted',async()=>{const f=fixture('Delete data?');await assert.rejects(confirmDoctorAction(f.page,f.button),/match/);assert.deepEqual(f.calls,['wait','click','dismiss']);});
test('historical client without consent retains one direct click',async()=>{const f=fixture();await confirmDoctorAction(f.page,f.button,{required:false});assert.deepEqual(f.calls,['click']);});
test('all mandatory legacy Doctor action harnesses use shared consent and an isolated model',()=>{
 const workflow=readFileSync('.github/workflows/google-reviews-setup-v400.yml','utf8');
 for(const name of ['owner-uat-v493-browser.mjs','reference-slice-legacy-doctor-browser.mjs']){assert.ok(workflow.includes(name));const s=readFileSync('scripts/'+name,'utf8');assert.match(s,/confirmDoctorAction/);assert.match(s,/ownerDoctorMock\(\)/);assert.match(s,/model\.runtimeOptions/);}
 const legacy=readFileSync('scripts/reference-slice-legacy-doctor-browser.mjs','utf8');for(const action of ['run','refresh','footerRefresh']){assert.ok(legacy.includes('await runConfirmed('+action+')'));assert.ok(!legacy.includes('await '+action+'.click()'));}assert.match(legacy,/runConfirmed\(page.getByRole\('button',\{name:'Попробовать снова'/);assert.match(legacy,/diagnosisRequests,4/);assert.match(legacy,/model.calls.length,3/);assert.match(legacy,/maxTokens===8000/);
 for(const name of ['stable-ui-rollback-browser.mjs','health-doctor-performance-browser.mjs']){const s=readFileSync('scripts/'+name,'utf8');assert.ok(workflow.includes(name));assert.doesNotMatch(s,/name:'Запустить диагностику',exact:true\}\)\.click/);}
});

test('restricted manager exercises real server denial only after exact shared consent',()=>{
 const s=readFileSync('scripts/restricted-manager-regression.mjs','utf8');
 assert.match(s,/await confirmDoctorAction\(page,page.getByRole/);assert.match(s,/Legacy diagnosis must exercise the server permission boundary/);assert.match(s,/assert.equal\(req.status,403\)/);assert.match(s,/assert.equal\(req.body\?\.availability,'RESTRICTED'\)/);assert.match(s,/assert.ok\(!req.body\?\.data\)/);
});
