import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const DDL = /\b(?:CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+(?:TABLE|INDEX)|CREATE\s+(?:UNIQUE\s+)?INDEX|PRAGMA\s+table_info)\b/i;

async function sourceFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(item));
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) result.push(item);
  }
  return result;
}

test("HTTP and application runtime code contains no schema DDL", async () => {
  const roots = ["app", "lib", "worker"];
  const files = (await Promise.all(roots.map(sourceFiles))).flat();
  const violations: string[] = [];
  for (const file of files) {
    if (DDL.test(await readFile(file, "utf8"))) violations.push(file);
  }
  assert.deepEqual(violations, []);
});
