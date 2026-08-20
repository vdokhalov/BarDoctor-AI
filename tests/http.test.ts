import assert from "node:assert/strict";
import test from "node:test";
import { readJsonRequest } from "../lib/bardoctor/http";

test("valid JSON object is returned to the route", async () => {
  const result = await readJsonRequest<{ value: number }>(new Request("https://example.test", {
    method: "POST",
    body: JSON.stringify({ value: 7 }),
  }));
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.data, { value: 7 });
});

test("malformed, empty, and non-object JSON receive a useful 400", async () => {
  for (const body of ['{"broken"', "", "[]", "null"]) {
    const result = await readJsonRequest(new Request("https://example.test", {
      method: "POST",
      body,
    }));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.response.status, 400);
      const payload = await result.response.json() as { code?: string; error?: string };
      assert.equal(payload.code, "INVALID_JSON");
      assert.ok(payload.error);
    }
  }
});

test("oversized JSON is rejected before route processing", async () => {
  const result = await readJsonRequest(new Request("https://example.test", {
    method: "POST",
    headers: { "content-length": "1024" },
    body: JSON.stringify({ value: "small" }),
  }), { maxBytes: 100 });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.response.status, 413);
    const payload = await result.response.json() as { code?: string };
    assert.equal(payload.code, "PAYLOAD_TOO_LARGE");
  }
});
