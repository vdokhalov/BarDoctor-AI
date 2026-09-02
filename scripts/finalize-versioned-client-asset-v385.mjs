import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distRoot = path.join(root, "dist/client");
const canonicalName = "index-BQGspy0I.js";
const canonicalPath = path.join(root, "public/assets", canonicalName);
const source = fs.readFileSync(canonicalPath);

if (!source.includes(Buffer.from("bd-unit-product-costing-v387"))) {
  throw new Error("The packaged canonical client asset does not contain v387 legacy-key package costing");
}

const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
const versionedName = `index-BQGspy0I-${hash}.js`;
fs.writeFileSync(path.join(distRoot, "assets", versionedName), source);

for (const relativePath of ["app.html", "bardoctor-preview.js"]) {
  const filePath = path.join(distRoot, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(
    /\/assets\/index-BQGspy0I(?:-[a-f0-9]{12})?\.js(?=\?v=[^"']+)/g,
    `/assets/${versionedName}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`bd-unit-product-costing-v387: finalized ${versionedName}`);
