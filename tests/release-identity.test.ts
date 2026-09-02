import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBarDoctorReleaseIdentity } from "../lib/bardoctor/release-identity";

const requiredKeys = [
  "appVersion",
  "buildNumber",
  "gitCommit",
  "buildTimestamp",
  "schemaVersion",
  "environment",
  "mutationContractVersion",
  "minimumSupportedMutationContract",
] as const;

test("release identity exposes the complete non-secret contract", () => {
  const identity = getBarDoctorReleaseIdentity("test");
  assert.deepEqual(Object.keys(identity).sort(), [...requiredKeys].sort());
  for (const key of requiredKeys.slice(0, 6)) assert.equal(typeof identity[key], "string");
  assert.equal(identity.mutationContractVersion, 1);
  assert.equal(identity.minimumSupportedMutationContract, 1);
  assert.equal(identity.environment, "test");
});

test("release and health routes use runtime environment and disable caching", async () => {
  const [releaseRoute, healthRoute] = await Promise.all([
    readFile(new URL("../app/api/release/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/healthz/route.ts", import.meta.url), "utf8"),
  ]);
  for (const route of [releaseRoute, healthRoute]) {
    assert.match(route, /runtimeEnv\("BARDOCTOR_ENVIRONMENT"\)/);
    assert.match(route, /"Cache-Control": "no-store, max-age=0"/);
  }
  assert.match(healthRoute, /release: getBarDoctorReleaseIdentity/);
});
