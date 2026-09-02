import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("packaged release uses a physical content-versioned client asset", async () => {
  const root = process.cwd();
  const html = await readFile(path.join(root, "dist/client/app.html"), "utf8");
  const match = html.match(/\/assets\/(index-BQGspy0I-[a-f0-9]{12}\.js)/);

  assert.ok(match, "versioned client asset reference is present");
  const assetPath = path.join(root, "dist/client/assets", match[1]);
  assert.ok(existsSync(assetPath), "versioned client asset exists");

  const asset = await readFile(assetPath, "utf8");
  assert.match(asset, /bd-business-health-watchdog-v378/);
  assert.match(asset, /bdHealthWaitExpired/);
});
