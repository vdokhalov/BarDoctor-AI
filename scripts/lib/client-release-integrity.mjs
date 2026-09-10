import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { patchReceiptCost } from "./phase5-receipt-cost.mjs";

const assetPattern = /\/assets\/index-BQGspy0I(?:-[a-zA-Z0-9_-]+)?\.js\b/g;
// Match emitted HTML, including HTML quoted inside the compiled Worker. Leave
// startup-response URL-prefix constants intact: they intentionally match prefixes.
const bootstrapPattern = /(\bsrc=\\?["'])(\/bardoctor-preview(?:-v\d+)?\.js(?:\?[^"'\\\s<>`]*)?)/g;

export function clientAssetName(bytes) {
  return `index-BQGspy0I-${createHash("sha256").update(bytes).digest("hex").slice(0, 12)}.js`;
}

function fingerprint(bytes) { return createHash("sha256").update(bytes).digest("hex").slice(0, 12); }

function entryFiles(root) {
  const client = path.join(root, "dist/client");
  const walk = (directory, excludeAssets) => !fs.existsSync(directory) ? [] : fs.readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return excludeAssets && entry.name === "assets" ? [] : walk(file, excludeAssets);
      return entry.isFile() && /\.(?:html|m?js)$/.test(entry.name) ? [file] : [];
    });
  return [...walk(client, true), ...walk(path.join(root, "dist/server"), false)].sort();
}

function bootstraps(source) {
  return [...source.replace(/<!--[\s\S]*?-->/g, "").matchAll(bootstrapPattern)].map(match => match[2]);
}

export function finalizeClientRelease(root, bytes) {
  const name = clientAssetName(bytes);
  fs.writeFileSync(path.join(root, "dist/client/assets", name), bytes);
  const entries = entryFiles(root).map(file => ({ file, before: fs.readFileSync(file, "utf8") }));
  const sources = new Map(entries.map(({ file, before }) => [file, before.replace(assetPattern, `/assets/${name}`)]));
  const changed = [];
  for (const { file, before } of entries) {
    const after = sources.get(file).replace(bootstrapPattern, (_match, prefix, value) => {
      const url = new URL(value.replaceAll("&amp;", "&"), "https://release.invalid");
      const loader = sources.get(path.join(root, "dist/client", url.pathname.slice(1)));
      assert.ok(loader, `Missing emitted bootstrap: ${url.pathname}`);
      assert.equal(bootstraps(loader).length, 0, `Bootstrap must load the client directly: ${url.pathname}`);
      url.searchParams.set("bd-release", fingerprint(loader));
      return prefix + url.pathname + url.search;
    });
    if (before !== after) {
      fs.writeFileSync(file, after);
      changed.push(path.relative(root, file));
    }
  }
  return { name, changed };
}

export function verifyClientRelease(root) {
  const client = path.join(root, "dist/client");
  const html = fs.readFileSync(path.join(client, "app.html"), "utf8");
  const preload = html.match(/\/assets\/(index-BQGspy0I-[a-f0-9]{12}\.js)/);
  assert.ok(preload, "Packaged HTML must reference a content-versioned client");
  const name = preload[1];
  const bytes = fs.readFileSync(path.join(client, "assets", name));
  assert.equal(clientAssetName(bytes), name, "Client filename must match its actual bytes");
  assert.deepEqual(bytes, fs.readFileSync(path.join(root, "public/assets/index-BQGspy0I.js")), "Release bytes must equal the current canonical client");
  assert.equal(patchReceiptCost(bytes.toString("utf8")), bytes.toString("utf8"), "Executed release must retain receipt-only costing");
  assert.ok(fs.existsSync(path.join(root, "dist/server/index.js")), "Compiled Worker is required for release verification");
  const entries = [];
  for (const file of entryFiles(root)) {
    const source = fs.readFileSync(file, "utf8");
    const references = [...source.matchAll(assetPattern)].map(match => match[0]);
    const loaders = bootstraps(source);
    for (const reference of references) assert.equal(reference, `/assets/${name}`, `Stale client reference in ${path.relative(root, file)}`);
    for (const reference of loaders) {
      const url = new URL(reference.replaceAll("&amp;", "&"), "https://release.invalid");
      const loader = fs.readFileSync(path.join(client, url.pathname.slice(1)), "utf8");
      assert.equal(url.searchParams.get("bd-release"), fingerprint(loader), `Stale bootstrap cache identity in ${path.relative(root, file)}`);
      const executed = [...loader.matchAll(/\bscript\.src\s*=\s*["'](\/assets\/index-BQGspy0I(?:-[a-zA-Z0-9_-]+)?\.js)/g)];
      assert.equal(executed.length, 1, `Bootstrap must select exactly one executable client: ${url.pathname}`);
      assert.equal(executed[0][1], `/assets/${name}`, `Bootstrap executes a stale client: ${url.pathname}`);
    }
    if (references.length || loaders.length) entries.push({ file: path.relative(root, file), references: references.length, loaders: loaders.length });
  }
  assert.ok(bootstraps(html).length, "Packaged HTML must have an executable bootstrap, not just a preload");
  assert.ok(entries.some(entry => entry.file.startsWith(`dist${path.sep}server${path.sep}`) && entry.loaders), "Compiled Worker must carry the verified bootstrap");
  return { name, bytes, entries };
}
