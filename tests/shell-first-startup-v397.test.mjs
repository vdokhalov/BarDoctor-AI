import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

for (const path of ["public/app.html", "app/bar-doctor-response.ts"]) {
  test(`${path} starts the cached shell with the compact v397 bootstrap`, async () => {
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /bd-shell-first-startup" content="v397/);
    assert.match(source, /src="\/bardoctor-preview-v401\.js\?v=p0-release-blockers-v401" defer/);
    assert.match(source, /modulepreload" href="\/assets\/index-BQGspy0I\.js\?v=[^"]*startup-performance-v343/);
    assert.doesNotMatch(source, /<script src="\/server-migration-discovery-v262\.js[^>]*><\/script>-/);
  });
}

test("v397 bootstrap renders before auth and business-data refresh", async () => {
  const path = new URL("public/bardoctor-preview-v401.js", root);
  assert.ok(existsSync(path));
  const source = await readFile(path, "utf8");
  const load = source.indexOf("  loadApplication();");
  const auth = source.indexOf('await fetch("/api/auth/bootstrap"');
  assert.ok(load > 0 && auth > load, "application shell must start before auth refresh");
  assert.match(source, /cached_shell_ready_v397/);
  assert.match(source, /void refreshServerInventoryCacheV235\(\)/);
  assert.doesNotMatch(source, /await refreshServerInventoryCacheV235\(\)/);
});
