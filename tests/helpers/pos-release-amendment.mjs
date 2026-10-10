import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export const posBaseline='4644a85c2843f0f51935555c4122facc3e1030ad';
export const posDigest=value=>createHash('sha256').update(value).digest('hex');
const revision=path=>execFileSync('git',['show',posBaseline+':'+path],{maxBuffer:64*1024*1024});
// Exact POS/staff scope, never a directory exemption. Existing release manifests remain unchanged.
export const posPaths=Object.freeze([
  'app/api/access/active-venue/route.ts','app/api/access/invites/[id]/route.ts','app/api/access/join/route.ts','app/api/access/members/[id]/route.ts','app/api/access/route.ts',
  'app/api/pos-discounts/route.ts','app/api/pos-orders/route.ts','app/api/pos-overview/route.ts','app/api/sales-batches/route.ts','app/api/sales-events/route.ts',
  'lib/bardoctor/access-control.ts','lib/bardoctor/access-service.ts','lib/bardoctor/auth.ts','lib/bardoctor/cost-evidence.ts','lib/bardoctor/data-trust.ts','lib/bardoctor/evidence-resolver.ts',
  'lib/bardoctor/pos-auth-guard.ts','lib/bardoctor/pos-discounts.ts','lib/bardoctor/pos-live-overview.ts','lib/bardoctor/pos-orders.ts','lib/bardoctor/pos-shift-cash.ts','lib/bardoctor/pos-shift-report.ts','lib/bardoctor/sales-consumption.ts','lib/bardoctor/sales-events.ts','lib/bardoctor/staff-job-title.ts','lib/bardoctor/staff-job-storage.ts',
]);
export function posAmendment(manifest=JSON.parse(readFileSync('tests/fixtures/pos-release-amendment.json','utf8')),read=(path)=>readFileSync(path)){
 assert.equal(manifest.baseline,posBaseline);
 assert.deepEqual(Object.keys(manifest.files).sort(),[...posPaths].sort());
 const baselinePaths=new Set(execFileSync('git',['ls-tree','-r','--name-only',posBaseline],{encoding:'utf8'}).trim().split('\n'));
 const old=new Map();
 for(const path of posPaths){
  const item=manifest.files[path],before=baselinePaths.has(path)?revision(path):null;
  assert.equal(item.before,before===null?null:posDigest(before),path+' baseline');
  assert.notEqual(item.after,item.before,path+' intentional amendment');
  assert.equal(posDigest(read(path)),item.after,path+' exact POS implementation');
  old.set(path,before);
 }
 // Preserve the historical package bytes only after proving the sole allowed
 // change: remove duplicate preparation from the aggregate test command.
 const packageBefore=revision('package.json');
 assert.equal(read('package.json').toString(),packageBefore.toString().replace('"test": "npm run pretest:artifact && ','"test": "'),'exact aggregate preparation change');
 old.set('package.json',packageBefore);
 return {
  paths(paths){return paths.filter(path=>!old.has(path)||old.get(path)!==null);},
  read(path){return old.has(path)?old.get(path):read(path);},
 };
}
