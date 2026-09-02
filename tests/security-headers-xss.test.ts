import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { escapeHtml } from "../lib/bardoctor/html";
import { securityHeaders } from "../lib/bardoctor/security-headers";
import { proxy } from "../proxy";

test("global responses receive one compatible security-header baseline", () => {
  const expected = securityHeaders();
  const response = proxy();
  for (const [name, value] of Object.entries(expected)) {
    assert.equal(response.headers.get(name), value, name);
  }
  const csp = response.headers.get("content-security-policy") ?? "";
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
});

test("HTML payload-like user strings are encoded as text", () => {
  const payloads = [
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    '<svg onload="alert(1)"></svg>',
    "&lt;script&gt;alert(1)&lt;/script&gt;",
  ];
  for (const payload of payloads) {
    const escaped = escapeHtml(payload);
    assert.doesNotMatch(escaped, /[<>"']/);
    assert.match(escaped, /&(?:lt|amp;lt);/);
  }
});

test("server-rendered user-data documents use the shared encoder", async () => {
  const [migrationPreview, inventoryPrint] = await Promise.all([
    readFile(new URL("../app/migration-preview/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/bardoctor/inventory-counts.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migrationPreview, /import \{ escapeHtml \}/);
  assert.match(inventoryPrint, /import \{ escapeHtml \}/);
  assert.doesNotMatch(migrationPreview, /function escapeHtml/);
  assert.doesNotMatch(inventoryPrint, /function escapeHtml/);
});
