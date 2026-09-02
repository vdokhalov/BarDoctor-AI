import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");

test("Business Health skeleton has an independent eight-second watchdog", () => {
  const start = bundle.indexOf("function c_e(){");
  const end = bundle.indexOf("function Ln(", start);
  const detail = bundle.slice(start, end);

  assert.ok(start > 0 && end > start, "Health detail component is present");
  assert.match(detail, /\[bdHealthWaitExpired,setBdHealthWaitExpired\]=S\.useState\(!1\)/);
  assert.match(detail, /setBdHealthWaitExpired\(!0\),8e3/);
  assert.match(detail, /bdHealthCanLoad=!!bdHealthProfile\|\|bdHealthWaitExpired/);
  assert.match(detail, /bdHealthLoading=!n&&bdLiveHealthStatus!=="error"&&!bdHealthWaitExpired/);
  assert.doesNotMatch(detail, /bdHealthLoading=!bdHealthCanLoad/);
});

test("Business Health still keeps the bounded API request and retry state", () => {
  assert.match(bundle, /function bdFetchBusinessHealthV377/);
  assert.match(bundle, /controller\.abort\(\),8e3/);
  assert.match(bundle, /className:"bd-health-detail-unavailable-v332"/);
  assert.match(bundle, /children:"Повторить"/);
});
