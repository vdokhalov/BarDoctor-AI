import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {appendFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const baseline='84bb207a374af35dfc6cd152776a9821f6c13a1d';
export const reviewedHead='b5eabbd02fadce02091deb6595998751b9fa40cc';
export const branch='refs/heads/feat/staff-pin-pos-20261015';
// Only this explicitly reviewed CI policy amendment may accompany the frozen product diff.
export const policyPaths=['.github/workflows/google-reviews-setup-v400.yml','scripts/ci-required-gates.mjs','scripts/ci-storage-migration-scope.mjs','tests/ci-change-scope.test.mjs','tests/ci-storage-migration-scope.test.mjs','tests/fixtures/storage-migration-scope.json','tests/fixtures/p0-release-amendment-v517.json','tests/helpers/p0-release-amendment.mjs'];
const digest=value=>createHash('sha256').update(value).digest('hex');
const git=(args,cwd)=>execFileSync('git',args,{cwd,maxBuffer:64*1024*1024});
export function assertScope({event,ref,head,manifest,changes,read}){
 assert.equal(event,'workflow_dispatch','manual dispatch only');assert.equal(ref,branch,'approved branch only');
 assert.match(head,/^[a-f0-9]{40}$/,'exact commit');assert.equal(manifest.baseline,baseline);assert.equal(manifest.reviewedHead,reviewedHead);
 const expected=Object.keys(manifest.files).filter(p=>!policyPaths.includes(p)).sort();
 assert.deepEqual(changes.filter(c=>!policyPaths.includes(c.path)).map(c=>c.path).sort(),expected,'complete product diff');
 for(const c of changes){assert.ok(['A','M'].includes(c.status),'no deletion/rename');assert.equal(c.mode,'100644','regular source files only');if(policyPaths.includes(c.path))continue;
  const approved=manifest.files[c.path];assert.equal(digest(read(head,c.path)),approved.after,c.path+' reviewed bytes');
  assert.equal(c.status,approved.before===null?'A':'M',c.path+' change kind');
  assert.equal(approved.before===null?null:digest(read(baseline,c.path)),approved.before,c.path+' deployed bytes');
 }
 return 'storage-migration';
}
export function classifyStorage({event,ref,head,cwd=process.cwd()}){
 assert.equal(git(['rev-parse','HEAD'],cwd).toString().trim(),head,'checkout must match exact SHA');
 git(['merge-base','--is-ancestor',reviewedHead,head],cwd);
 const manifest=JSON.parse(readFileSync(cwd+'/tests/fixtures/storage-migration-scope.json','utf8'));
 const changes=git(['diff','--name-status','--no-renames',baseline,head],cwd).toString().trim().split('\n').filter(Boolean).map(line=>{const [status,path]=line.split('\t');const mode=git(['ls-tree',head,'--',path],cwd).toString().split(' ')[0];return {status,path,mode};});
 // The manifest cannot broaden product scope: regenerate the original reviewed diff independently.
 const original=git(['diff','--name-only',baseline,reviewedHead],cwd).toString().trim().split('\n');
 assert.deepEqual(Object.keys(manifest.files).sort(),original.sort(),'fixed reviewed manifest paths');
 for(const path of original){const item=manifest.files[path];assert.equal(item.after,digest(git(['show',reviewedHead+':'+path],cwd)),path+' fixed reviewed hash');const exists=git(['ls-tree',baseline,'--',path],cwd).length>0;assert.equal(item.before,exists?digest(git(['show',baseline+':'+path],cwd)):null,path+' fixed baseline hash');}
 return assertScope({event,ref,head,manifest,changes,read:(sha,path)=>git(['show',sha+':'+path],cwd)});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const mode=classifyStorage({event:process.env.GITHUB_EVENT_NAME,ref:process.env.GITHUB_REF,head:process.env.GITHUB_SHA});appendFileSync(process.env.GITHUB_OUTPUT,`mode=${mode}\n`);console.log(`Approved storage migration diff ${baseline}..${process.env.GITHUB_SHA}`);}
