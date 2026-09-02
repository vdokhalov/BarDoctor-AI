import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");

test("Business Health detail does not wait for unrelated cloud-store reconciliation", () => {
  const start = bundle.indexOf("function c_e(){");
  const end = bundle.indexOf("function Ln(", start);
  const detail = bundle.slice(start, end);

  assert.ok(start > 0 && end > start, "Health detail component is present");
  assert.match(detail, /\{profile:bdHealthProfile\}=Un\(\)/);
  assert.match(detail, /bdUseLiveBusinessHealthV335\(bdHealthCanLoad\)/);
  assert.match(detail, /(?:l=bdHealthCanLoad\?n:null|const l=n)/);
  assert.doesNotMatch(detail, /\{isReady:t\}=Ai\(\)/);
});

test("Business Health request has a bounded loading state", () => {
  assert.match(bundle, /function bdFetchBusinessHealthV377/);
  assert.match(bundle, /new AbortController/);
  assert.match(bundle, /controller\.abort\(\),8e3/);
  assert.match(bundle, /Business Health request timed out/);
  assert.match(bundle, /bdHealthLoading=(?:!bdHealthCanLoad\|\|!n&&bdLiveHealthStatus!=="error"|!n&&bdLiveHealthStatus!=="error"&&!bdHealthWaitExpired)/);
});
