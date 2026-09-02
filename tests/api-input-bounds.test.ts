import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { readJsonRequest } from "../lib/bardoctor/http";

async function routeFiles(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) files.push(...await routeFiles(url));
    else if (entry.name === "route.ts") files.push(url);
  }
  return files;
}

test("every remaining direct API body parser has an explicit encoded-byte bound", async () => {
  const files = await routeFiles(new URL("../app/api/", import.meta.url));
  const unbounded: string[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (!/request\.(?:json|text)\(\)/.test(source)) continue;
    if (!/TextEncoder\(\)\.encode\([^)]*\)\.byteLength\s*>/.test(source)) {
      unbounded.push(file.pathname);
    }
  }
  assert.deepEqual(unbounded, []);
});

test("shared JSON parser rejects declared, actual, malformed and non-object payloads", async () => {
  const declared = await readJsonRequest(new Request("https://bardoctor.test", {
    method: "POST",
    headers: { "Content-Length": "100" },
    body: "{}",
  }), { maxBytes: 10 });
  assert.equal(declared.ok, false);
  if (!declared.ok) assert.equal(declared.response.status, 413);

  const actual = await readJsonRequest(new Request("https://bardoctor.test", {
    method: "POST",
    body: JSON.stringify({ value: "x".repeat(100) }),
  }), { maxBytes: 20 });
  assert.equal(actual.ok, false);
  if (!actual.ok) assert.equal(actual.response.status, 413);

  const malformed = await readJsonRequest(new Request("https://bardoctor.test", { method: "POST", body: "{" }));
  assert.equal(malformed.ok, false);
  if (!malformed.ok) assert.equal(malformed.response.status, 400);

  const array = await readJsonRequest(new Request("https://bardoctor.test", { method: "POST", body: "[]" }));
  assert.equal(array.ok, false);
  if (!array.ok) assert.equal(array.response.status, 400);
});

