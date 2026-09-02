import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { barDoctorResponse } from "../app/bar-doctor-response";
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
  const scriptPolicy = csp.match(/(?:^|; )script-src ([^;]+)/)?.[1] ?? "";
  const stylePolicy = csp.match(/(?:^|; )style-src ([^;]+)/)?.[1] ?? "";
  assert.doesNotMatch(scriptPolicy, /unsafe-inline/);
  assert.match(stylePolicy, /unsafe-inline/);
});

test("CSP hashes exactly authorize the fixed startup script and stylesheet handler", async () => {
  const response = barDoctorResponse();
  const html = await response.text();
  const policy = response.headers.get("content-security-policy") ?? "";
  const block = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(block, "missing inline script block");
  const hash = createHash("sha256").update(block).digest("base64");
  assert.ok(policy.includes(`'sha256-${hash}'`), "script hash is stale");
  const handlerHash = createHash("sha256").update("this.media='all'").digest("base64");
  assert.ok(policy.includes(`'sha256-${handlerHash}'`), "stylesheet handler hash is stale");
  assert.match(policy, /'unsafe-hashes'/);
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
