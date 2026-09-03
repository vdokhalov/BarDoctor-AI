import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonicalName = "index-BQGspy0I.js";
const canonicalPath = path.join(root, "public/assets", canonicalName);
const source = fs.readFileSync(canonicalPath);
const hash = createHash("sha256").update(source).digest("hex").slice(0, 12);
const versionedName = `index-BQGspy0I-${hash}.js`;
const versionedPath = path.join(root, "public/assets", versionedName);

fs.writeFileSync(versionedPath, source);

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents
    .replace(/\/assets\/index-BQGspy0I\.js(?=\?v=[^"']+)/g, `/assets/${versionedName}`)
    .replace(/\/assets\/index-BQGspy0I-[a-f0-9]{12}\.js(?=\?v=[^"']+)/g, `/assets/${versionedName}`);
  fs.writeFileSync(filePath, contents);
}

console.log(`bd-versioned-client-asset-v379: ${versionedName}`);
