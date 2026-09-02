import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBarDoctorReleaseIdentity } from "../lib/bardoctor/release-identity";
import { proxy } from "../proxy";

test("critical mutations fail before routing when the cached client contract is missing or stale", async () => {
  for (const value of [null, "0", "999", "not-a-version"]) {
    const headers = value == null ? undefined : { "X-BarDoctor-Client-Contract": value };
    const response = proxy(new Request("https://bardoctor.test/api/purchases/confirm", {
      method: "POST",
      headers,
    }));
    assert.equal(response.status, 426, String(value));
    const body = await response.json() as { code?: string };
    assert.equal(body.code, "CLIENT_UPDATE_REQUIRED");
  }
});

test("current mutations and read-only requests pass the compatibility gate", () => {
  const mutation = proxy(new Request("https://bardoctor.test/api/inventory/counts", {
    method: "POST",
    headers: { "X-BarDoctor-Client-Contract": "1" },
  }));
  assert.equal(mutation.status, 200);
  assert.equal(mutation.headers.get("x-middleware-next"), "1");
  assert.equal(proxy(new Request("https://bardoctor.test/api/purchases/confirm")).status, 200);
});

test("release identity and both browser shells advertise the same contract", async () => {
  const release = getBarDoctorReleaseIdentity("test");
  assert.equal(release.mutationContractVersion, 1);
  assert.equal(release.minimumSupportedMutationContract, 1);
  const [main, standalone, policy] = await Promise.all([
    readFile(new URL("../public/bardoctor-preview-v401.js", import.meta.url), "utf8"),
    readFile(new URL("../public/bd-route-context.js", import.meta.url), "utf8"),
    readFile(new URL("../docs/pwa-update-policy-step-1.4.md", import.meta.url), "utf8"),
  ]);
  assert.match(main, /nativeFetch\("\/api\/release"/);
  assert.match(main, /X-BarDoctor-Client-Contract", "1"/);
  assert.match(main, /response\.status === 426/);
  assert.match(standalone, /X-BarDoctor-Client-Contract", "1"/);
  assert.match(policy, /no automatic reload loop/);
});

