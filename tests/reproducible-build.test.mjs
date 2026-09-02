import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release build never invokes source patch scripts", async () => {
  const [build, packageText] = await Promise.all([
    readFile(new URL("../scripts/build-verified.sh", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);
  assert.doesNotMatch(build, /patch-[\w-]+\.mjs/);
  assert.doesNotMatch(packageJson.scripts.build, /patch-/);
  assert.equal(packageJson.scripts.prebuild, undefined);
  assert.match(build, /Build changed tracked source/);
  assert.match(build, /version-built-client-asset\.mjs/);
  assert.match(build, /generate-release-manifest\.mjs/);
  assert.match(build, /validate-build-secrets\.mjs/);
  assert.match(build, /release-candidate/);
  assert.match(build, /production/);
  assert.match(build, /--untracked-files=all/);
  assert.match(build, /Release build requires an exact clean Git checkout/);
});

test("release builds require non-public Vinext build secrets", async () => {
  const [validator, patcher] = await Promise.all([
    readFile(new URL("../scripts/validate-build-secrets.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/patch-vinext-reproducible-build.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(validator, /release-candidate/);
  assert.match(validator, /production/);
  assert.match(validator, /BARDOCTOR_VINEXT_DRAFT_SECRET/);
  assert.match(validator, /BARDOCTOR_VINEXT_PRERENDER_SECRET/);
  assert.match(patcher, /vinextVersion !== "0\.0\.50"/);
  assert.match(patcher, /process\.env\.BARDOCTOR_VINEXT_DRAFT_SECRET/);
  assert.match(patcher, /process\.env\.BARDOCTOR_VINEXT_PRERENDER_SECRET/);
});

test("artifact digest has an explicit non-circular scope", async () => {
  const source = await readFile(new URL("../scripts/artifact-digest.mjs", import.meta.url), "utf8");
  assert.match(source, /release-manifest\.json/);
  assert.match(source, /files\.sort/);
  assert.match(source, /relative.*contents\.length/s);
});

test("the framework build ID is derived from release provenance", async () => {
  const source = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(source, /generateBuildId/);
  assert.match(source, /BARDOCTOR_SOURCE_COMMIT/);
  assert.match(source, /git.*rev-parse.*HEAD/s);
  assert.doesNotMatch(source, /randomUUID|randomBytes/);
});
