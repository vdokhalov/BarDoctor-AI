import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [bootstrap, staticHtml, responseSource] = await Promise.all([
  readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
]);

test("v341 forces a coherent bootstrap and application bundle refresh", () => {
  assert.match(staticHtml, /bardoctor-preview\.js\?v=[^"\n]*startup-runtime-v342/);
  assert.match(responseSource, /bardoctor-preview\.js\?v=[^"\n]*startup-runtime-v342/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=[^"\n]*startup-runtime-v342/);
});

test("v341 recovers a failed Home startup without deleting session data", () => {
  const recoveryStart = bootstrap.indexOf("function bdRecoverStartupV341");
  const recoveryEnd = bootstrap.indexOf('window.addEventListener("bd:startup-complete"', recoveryStart);
  const recovery = bootstrap.slice(recoveryStart, recoveryEnd);
  assert.match(bootstrap, /data-bd-startup-recovery/);
  assert.match(bootstrap, /script\.addEventListener\("error"/);
  assert.match(bootstrap, /bd:startup-complete/);
  assert.match(bootstrap, /bdStartupWatchdogV341/);
  assert.match(bootstrap, /Сессия и данные сохранены/);
  assert.ok(recoveryStart >= 0 && recoveryEnd > recoveryStart);
  assert.doesNotMatch(recovery, /localStorage\.clear\(/);
});
