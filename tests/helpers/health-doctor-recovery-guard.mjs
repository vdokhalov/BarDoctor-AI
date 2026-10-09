import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

export const recoveryBaseline = 'ad0378431dfea73ded6e67c176dbfcae7ddf4f42';
export const recoveryFiles = Object.freeze([
  'lib/bardoctor/assortment-analytics.ts',
  'lib/bardoctor/canonical-health-inputs.ts',
  'lib/bardoctor/curated-doctor.ts',
  'lib/bardoctor/ingredient-reference.ts',
  'lib/bardoctor/management-cost-observation.ts',
  'lib/bardoctor/nomenclature-identity.ts',
  'lib/bardoctor/tech-card-ingredient-matching.ts',
  'lib/bardoctor/tech-card-reconciliation.ts',
  'lib/bardoctor/venue-ai-context.ts',
]);
export const recoveryDigest = value => createHash('sha256').update(value).digest('hex');

// Exact reviewed backend changes, not a path exemption: later edits must fail.
// Original v489/v492 manifests and all unrelated comparisons remain intact.
export function recoveryApprovedHashes(manifest = JSON.parse(readFileSync('tests/fixtures/health-doctor-recovery-approved-files.json', 'utf8'))) {
  assert.equal(manifest.baseline, recoveryBaseline);
  assert.deepEqual(Object.keys(manifest.files).sort(), [...recoveryFiles]);
  return Object.fromEntries(recoveryFiles.map(path => {
    const approved = manifest.files[path];
    assert.equal(approved.before, recoveryDigest(execFileSync('git', ['show', recoveryBaseline + ':' + path])), path + ' baseline');
    assert.notEqual(approved.after, approved.before, path + ' must be an intentional change');
    assert.equal(recoveryDigest(readFileSync(path)), approved.after, path + ' reviewed content');
    return [path, approved.after];
  }));
}
