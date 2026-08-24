import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapUrl = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlUrl = new URL("../public/app.html", import.meta.url);
const responseUrl = new URL("../app/bar-doctor-response.ts", import.meta.url);

test("successful embedded login moves the current document to venue home and reloads it", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const start = bundle.indexOf("function bdAuthHomeTargetV248");
  const end = bundle.indexOf("async function Rse", start);
  const helperSource = bundle.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(bundle, /bdEmbeddedLoginTransitionVersionV250="embedded-login-transition-v250"/);

  const calls = [];
  const window = {
    location: {
      search: "?venue=1",
      reload: () => calls.push(["reload"]),
      replace: (target) => calls.push(["replace", target]),
      href: "",
    },
    history: {
      state: { from: "login" },
      replaceState: (state, title, target) => calls.push(["replaceState", state, title, target]),
    },
  };
  const sessionStorage = {
    removeItem: (key) => calls.push(["removeItem", key]),
  };
  const completeLogin = new Function(
    "window",
    "sessionStorage",
    `${helperSource}; return bdAuthCompleteLoginV248;`,
  )(window, sessionStorage);

  completeLogin();
  assert.deepEqual(calls, [
    ["removeItem", "bd_venue_profile_recovery_v249"],
    ["replaceState", { from: "login" }, "", "/home?venue=1"],
    ["reload"],
  ]);
});

test("embedded login transition release token is wired through every application shell", async () => {
  const sources = await Promise.all([
    readFile(bootstrapUrl, "utf8"),
    readFile(appHtmlUrl, "utf8"),
    readFile(responseUrl, "utf8"),
  ]);
  for (const source of sources) {
    assert.match(source, /20260823-embedded-login-transition-v250/);
  }
});
