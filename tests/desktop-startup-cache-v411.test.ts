import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { barDoctorStartupResponseV411 } from "../app/bar-doctor-startup-v411";

const staleAsset = "/bardoctor-preview-v397.js?v=shell-first-startup-v397";
const currentAsset = "/bardoctor-preview-v397.js?v=desktop-startup-v411";

test("desktop startup shell forces the current bootstrap asset", async () => {
  const response = await barDoctorStartupResponseV411();
  const html = await response.text();

  assert.equal(html.includes(currentAsset), true);
  assert.equal(html.includes(staleAsset), false);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.match(response.headers.get("cache-control") ?? "", /must-revalidate/);
});

test("root, catch-all and settings routes use the startup hotfix response", () => {
  for (const path of ["app/route.ts", "app/[...path]/route.ts", "app/settings/route.ts"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /barDoctorStartupResponseV411/);
  }
});
