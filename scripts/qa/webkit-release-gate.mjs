import { WEBKIT_LIFECYCLE_SUITES } from "./webkit-environment-classifier.mjs";

// Diagnostics may distinguish infrastructure from application failures; neither
// permits this release. Require complete coverage at one exact source commit.
export function isWebKitLifecycleReleaseReady(results) {
  const expected = new Set(WEBKIT_LIFECYCLE_SUITES.flatMap(suite => [390, 820, 1280].map(width => `${suite}:${width}`)));
  if (results.length !== expected.size || !/^[a-f0-9]{40}$/.test(results[0]?.sourceSHA || "")) return false;
  const sourceSHA = results[0].sourceSHA;
  for (const result of results) {
    if (result.status !== "PASS" || result.exitCode !== 0 || result.sourceSHA !== sourceSHA || !expected.delete(`${result.suite}:${result.width}`)) return false;
  }
  return expected.size === 0;
}
