import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

export const p0Baseline='691ab51840266c9b6297fda7a84ee2077694a75f';
export const p0Roots=Object.freeze(['app','lib','public','scripts','worker','build','db','drizzle','migrations','.openai','.github','package.json','package-lock.json','vite.config.ts','tsconfig.json','next.config.ts','drizzle.config.ts','postcss.config.mjs','.npmrc','.gitignore','eslint.config.mjs']);
// User-approved P0 recovery plus isolated Doctor/scroll and Reports/More390 parity diagnostics + Reports wizard route repair (2026-10-13). No directory exemption.
export const p0Paths=Object.freeze([
 'scripts/patch-monthly-return-v516.mjs',
 'scripts/lib/reference-slice-recovery-compare.mjs','scripts/lib/released-reports-more-parity.mjs','scripts/reference-slice-recovery-parity.mjs',
 '.github/workflows/google-reviews-setup-v400.yml',
 'app/api/auth/bootstrap/route.ts','app/api/auth/login/route.ts','app/api/users/me/route.ts',
 'lib/bardoctor/auth-schema-error.ts','lib/bardoctor/auth-schema.ts','lib/bardoctor/auth.ts','lib/bardoctor/request-observability.ts',
 'public/assets/index-BQGspy0I.js','public/bardoctor-preview-v396.js','public/bardoctor-preview-v397.js','public/bardoctor-preview.js',
 'scripts/owner-uat-v493-browser.mjs','scripts/auth-recovery-p0-browser.ts','scripts/fragments/monthly-report-v165.fragment.txt','scripts/patch-finance-canonical-v515.mjs','scripts/patch-production-recovery-v496.mjs','scripts/sales-scroll-layout-qa.ts',
]);
export const p0Digest=value=>createHash('sha256').update(value).digest('hex');
const git=(args)=>execFileSync('git',args,{maxBuffer:64*1024*1024});
const baselineFiles=git(['ls-tree','-r','--name-only',p0Baseline,'--',...p0Roots]).toString().trim().split('\n');
const baselineSet=new Set(baselineFiles);
const baselineHashes=Object.fromEntries(git(['ls-tree','-r',p0Baseline,'--',...p0Roots]).toString().trim().split('\n').map(line=>{const [meta,path]=line.split('\t');return[path,meta.split(' ')[2]]}));
const blobHash=value=>createHash('sha1').update('blob '+Buffer.byteLength(value)+'\0').update(value).digest('hex');
export function p0Amendment({manifest=JSON.parse(readFileSync('tests/fixtures/p0-release-amendment-v517.json','utf8')),read=path=>readFileSync(path),paths=git(['ls-files','--cached','--others','--exclude-standard','--',...p0Roots]).toString().trim().split('\n')}={}){
 assert.equal(manifest.baseline,p0Baseline,'confirmed production baseline');
 assert.deepEqual(Object.keys(manifest.files).sort(),[...p0Paths].sort(),'exact approved paths');
 const expected=new Set([...baselineFiles,...p0Paths]);
 assert.deepEqual([...new Set(paths)].sort(),[...expected].sort(),'no added or removed boundary files');
 for(const path of expected){
  const actual=read(path);
  if(!p0Paths.includes(path)){assert.equal(blobHash(actual),baselineHashes[path],path+' unchanged since v517');continue;}
  const before=baselineSet.has(path)?p0Digest(git(['show',p0Baseline+':'+path])):null,item=manifest.files[path];
  assert.equal(item.before,before,path+' baseline');
  assert.notEqual(item.after,before,path+' intentional change');
  assert.equal(p0Digest(actual),item.after,path+' exact reviewed bytes');
 }
 return {baseline:p0Baseline,files:expected.size};
}
