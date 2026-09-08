import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("versioned release includes the canonical purchase editor, conversion and responsive CSS", async () => {
  const shell = await readFile("dist/client/app.html", "utf8");
  const asset = shell.match(/\/assets\/(index-BQGspy0I-([a-f0-9]{12})\.js)/);
  assert.ok(asset, "A content-versioned client artifact is required");
  const source = await readFile(`dist/client/assets/${asset[1]}`, "utf8");
  assert.equal(createHash("sha256").update(source).digest("hex").slice(0, 12), asset[2]);
  assert.match(source, /i\.jsx\(bdPurchaseUnitsV421,\{line,onChange:/);
  assert.match(source, /validatePurchaseConversionSnapshot\(line\.purchaseConversion\)/);
  assert.match(source, /В чём учитывать остаток\?/);
  assert.match(shell, /purchase-units-v421\.css/);
  assert.match(await readFile("dist/client/purchase-units-v421.css", "utf8"), /bd-purchase-package-toggle-v421/);
});
