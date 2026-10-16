import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

export const p0Baseline='691ab51840266c9b6297fda7a84ee2077694a75f';
export const p0Roots=Object.freeze(['app','lib','public','scripts','worker','build','db','drizzle','migrations','.openai','.github','package.json','package-lock.json','vite.config.ts','tsconfig.json','next.config.ts','drizzle.config.ts','postcss.config.mjs','.npmrc','.gitignore','eslint.config.mjs']);
// User-approved P0 recovery plus isolated Doctor/scroll and audited 390/820/1280 released-module parity and current-picker harness diagnostics + Reports wizard route repair (2026-10-13). No directory exemption.
// Confirmed 2026-10-13 mandatory harness consent/workday fixture repairs; QA only.
// Three-blocker repair: exact workday view reconciliation and strict QA lifecycle evidence.
// Confirmed B2 cross-document double-touch repair and its three asset references.
// Chromium release parity: independent CI observations plus mandatory scoped More/Reports capture.
// Preserve child-owned Sales document across query echo; real external navigation stays active.
// Owner-approved v519 Sales mobile gap fix and strict geometry assertion (2026-10-15).
// Pin both files exactly; later CSS/harness edits remain forbidden.
// Owner-approved conservative CI routing (2026-10-15); exact CI bytes remain pinned.
// Owner-authorized staff PIN development (2026-10-15), exact bytes only; not publication approval.
// Owner-approved PIN server-page navigation repair and focused real-shell regression.
// Owner-approved active-roster PIN linkage and scoped QA (2026-10-16), no data backfill.
// Owner-authorized local stock journal integration (2026-10-16); exact bytes, no publication or production cutover.
// Owner-authorized local sales event normalization and review fixes (2026-10-16); no publication.
// Authorized local QA3389 migration runner, no production execution (2026-10-16).
// Approved manual storage migration gate; full/UI routing unchanged (2026-10-16).
export const p0Paths=Object.freeze([
 "scripts/ci-storage-migration-scope.mjs",
 "app/api/migration/journals/route.ts",
 "drizzle/0034_journal_migration_runner.sql",
 "lib/bardoctor/journal-migration-runner.ts",

 "app/api/operational-days/route.ts",
 "app/api/pos-overview/route.ts",
 "app/api/workdays/route.ts",
 "drizzle/0033_sales_event_journal.sql",
 "lib/bardoctor/daily-revenue.ts",
 "lib/bardoctor/evidence-resolver.ts",
 "lib/bardoctor/pos-orders.ts",
 "lib/bardoctor/sales-event-history.ts",
 "lib/bardoctor/sales-event-storage.ts",

 "app/api/admin/relationship-integrity/route.ts",
 "app/api/assortment/overview/route.ts",
 "app/api/data-integrity/export/route.ts",
 "app/api/inventory/counts/route.ts",
 "app/api/inventory/movements/route.ts",
 "app/api/inventory/opening/route.ts",
 "app/api/inventory/products/route.ts",
 "app/api/inventory/valuation/route.ts",
 "app/api/migration/koln-assortment/route.ts",
 "app/api/migration/koln-currency-relabel/route.ts",
 "app/api/pos-orders/route.ts",
 "app/api/procurement/overview/route.ts",
 "app/api/purchases/cancel/route.ts",
 "app/api/purchases/confirm/route.ts",
 "app/api/purchases/delete/route.ts",
 "app/api/purchases/hybrid-production-qa/route.ts",
 "app/api/purchases/repost/route.ts",
 "app/api/purchases/update/route.ts",
 "app/api/sales-batches/import/route.ts",
 "app/api/sales-batches/route.ts",
 "app/api/sales-events/route.ts",
 "app/api/sales/confirm/route.ts",
 "app/api/shifts/close/route.ts",
 "app/api/store/[key]/route.ts",
 "app/api/store/route.ts",
 "app/api/write-offs/route.ts",
 "app/migration-preview/route.ts",
 "drizzle/0032_stock_journal.sql",
 "lib/bardoctor/authoritative-persistence.ts",
 "lib/bardoctor/canonical-health-inputs.ts",
 "lib/bardoctor/cost-evidence.ts",
 "lib/bardoctor/integrations/domain-writer.ts",
 "lib/bardoctor/inventory.ts",
 "lib/bardoctor/management-cost-observation.ts",
 "lib/bardoctor/management-cost-signals.ts",
 "lib/bardoctor/opening-stock.ts",
 "lib/bardoctor/platform-persistence-service.ts",
 "lib/bardoctor/sales-consumption.ts",
 "lib/bardoctor/sales-events.ts",
 "lib/bardoctor/stock-evidence.ts",
 "lib/bardoctor/stock-journal.ts",
 "lib/bardoctor/stock-retention.ts",
 "lib/bardoctor/stock-storage.ts",
 "lib/bardoctor/store-cas.ts",
 "lib/bardoctor/venue-ai-context.ts",
 "lib/bardoctor/verified-month-close.ts",
 "lib/bardoctor/write-offs.ts",
 'app/api/access/members/[id]/route.ts',
 'public/team-access.js','scripts/staff-pin-navigation-browser.ts',
 'drizzle/0031_staff_login_attempt_limits.sql',
 'drizzle/0030_staff_login_revocation_epoch.sql',
 'lib/bardoctor/staff-login-source.ts',
 'public/staff-login-entry.js',
 'lib/bardoctor/staff-login-name.ts',
 'drizzle/0029_staff_login.sql',
 'drizzle/0028_staff_pin_revocation.sql',
 'app/bar-doctor-response.ts',
 'app/login/route.ts',
 'app/api/staff-pin/members/route.ts','app/api/staff-pin/session/route.ts','app/staff-access/route.ts','app/staff-login/route.ts','app/team-access/route.ts','drizzle/0026_staff_pin_credentials.sql','drizzle/0027_staff_pin_sessions.sql','lib/bardoctor/access-control.ts','lib/bardoctor/pos-auth-guard.ts','lib/bardoctor/staff-pin-cookie.ts','lib/bardoctor/staff-pin-credentials.ts','lib/bardoctor/staff-pin-crypto.ts','lib/bardoctor/staff-pin-gateway.ts','lib/bardoctor/staff-pin-members.ts','lib/bardoctor/staff-pin-session.ts','public/cashier.js','public/staff-access.js','public/staff-login.js','scripts/staff-pin-browser.ts','worker/index.ts',
 'scripts/patch-sales-navigation-performance.mjs',
 'scripts/cashier-presentation-browser.ts',
 'scripts/ci-change-scope.mjs','scripts/ci-required-gates.mjs',
 'public/cashier.css',
 'public/app-shell-v185.css','scripts/sales-shell-geometry-browser.ts',
 'scripts/recheck-chromium-parity-ci-snapshots.mjs',
 'public/sales-navigation.js','app/cashier/route.ts','app/sales-entry/route.ts','app/sales-import/route.ts',
 'scripts/derived-metrics-phase3a8-browser.ts','scripts/patch-operational-day-phase1a.mjs','scripts/qa/webkit-environment-classifier.mjs','scripts/qa/webkit-lifecycle-evidence.ts','scripts/qa/webkit-session-observer.js',
 'scripts/acquisition-stock-phase3a7-browser.ts','scripts/finance-inputs-phase3a6-browser.ts','scripts/operational-day-browser.ts','scripts/pos1-browser-qa.ts','scripts/pos1-hardening-browser.ts','scripts/restricted-manager-regression.mjs','scripts/sales-browser-qa-phase5.ts','scripts/sales-iphone-browser.ts','scripts/sales-navigation-performance.ts','scripts/sales-observations-browser.ts','scripts/sales-ux2-browser.ts',
 'scripts/management-cost-phase4a-browser.ts','scripts/management-cost-correction-phase4a-browser.ts','scripts/recheck-parity-ci-snapshots.mjs',
 'scripts/mobile-navigation-qa-v269.cjs',
 'scripts/venue-timezone-browser.ts',
 'scripts/menu-consumption-browser-qa-v418.cjs',
 'scripts/owner-qa-regressions-browser.mjs','scripts/reference-slice-legacy-doctor-browser.mjs',
 'scripts/lib/stable-ui-v485.mjs','scripts/lib/health-request-lifecycle.mjs','scripts/patch-qa-audit-v513.mjs',
 'scripts/lib/released-module-parity.mjs','scripts/recheck-released-parity-390.mjs',
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
