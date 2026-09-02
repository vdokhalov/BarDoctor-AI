import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("STEP 1.2 evidence remains fail-closed", async () => {
  const [surfaceText, diffText, report, runbook] = await Promise.all([
    text("docs/evidence/step-1.2/production-schema-surface.json"),
    text("docs/evidence/step-1.2/schema-diff.json"),
    text("docs/production-safety-verification-step-1.2.md"),
    text("docs/production-disaster-recovery.md"),
  ]);
  const surface = JSON.parse(surfaceText);
  const diff = JSON.parse(diffText);

  assert.equal(surface.mode, "read-only");
  assert.equal(surface.releaseCandidate.gitSha, "9f48337be90008d63467a2abe52b05498c52d7bc");
  assert.equal(surface.releaseCandidate.expectedSchema, "0021");
  assert.equal(surface.releaseCandidate.canonicalMigrationCount, 22);
  assert.equal(surface.production.tableCount, 37);
  assert.equal(diff.summary.tablesMatchedByNameAndColumnSet, 37);
  assert.equal(diff.summary.missing, 0);
  assert.equal(diff.summary.extra, 0);
  assert.equal(diff.summary.differentColumnSets, 0);
  assert.equal(diff.summary.fullSchemaCompatibility, "UNKNOWN");
  assert.equal(diff.summary.migrationLedger, "UNKNOWN");
  assert.ok(diff.objects.every((entry) => entry.status === "UNKNOWN"));

  assert.match(report, /Status: \*\*BLOCKED BY ACCESS\*\*/);
  assert.match(report, /P0 after: \*\*2\*\*/);
  assert.match(report, /❌ NO-GO/);
  assert.match(report, /\*\*НЕЛЬЗЯ\*\*/);
  assert.doesNotMatch(report, /P0-0[45][\s\S]{0,80}\*\*PASS\*\*/);

  for (const heading of [
    "Incident",
    "Detection",
    "Decision authority",
    "Backup selection",
    "Restore target",
    "Restore procedure",
    "Schema validation",
    "Integrity validation",
    "Application smoke",
    "Venue isolation",
    "Traffic switch procedure",
    "Rollback",
    "Communication",
    "Post-incident checks",
  ]) {
    assert.match(runbook, new RegExp(`^## ${heading}$`, "m"));
  }
});
