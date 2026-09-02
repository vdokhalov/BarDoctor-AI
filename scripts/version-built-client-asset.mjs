import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const canonicalName = "index-BQGspy0I.js";
const canonicalPath = path.join(dist, "client", "assets", canonicalName);
assert.ok(existsSync(canonicalPath), `Built canonical asset is missing: ${canonicalPath}`);

const source = readFileSync(canonicalPath);
const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
const versionedName = `index-BQGspy0I-${hash}.js`;
const versionedPath = path.join(path.dirname(canonicalPath), versionedName);
copyFileSync(canonicalPath, versionedPath);

const textExtensions = new Set([".html", ".js", ".json", ".map", ".txt"]);
let replacements = 0;
function rewriteTree(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      rewriteTree(filePath);
      continue;
    }
    if (filePath === canonicalPath || filePath === versionedPath) continue;
    if (!textExtensions.has(path.extname(entry.name)) || statSync(filePath).size > 20_000_000) continue;
    const contents = readFileSync(filePath, "utf8");
    const next = contents.replaceAll(canonicalName, versionedName);
    if (next !== contents) {
      replacements += contents.split(canonicalName).length - 1;
      writeFileSync(filePath, next);
    }
  }
}

rewriteTree(path.join(dist, "client"));
rewriteTree(path.join(dist, "server"));
assert.ok(replacements >= 3, `Expected built client references to be versioned, found ${replacements}`);
rmSync(canonicalPath);

console.log(`Versioned built client asset: ${versionedName}; references updated: ${replacements}`);
