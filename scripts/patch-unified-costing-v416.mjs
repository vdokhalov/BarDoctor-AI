import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marker = "20260907-unified-costing-v416";
const targets = [
  "app/bar-doctor-response.ts",
  "public/app.html",
  "public/bardoctor-preview.js",
];

for (const relativePath of targets) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const next = source.replace(
    /index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/g,
    (match, version) => version.includes(marker) ? match : `${match}-${marker}`,
  );
  if (!next.includes(marker)) throw new Error(`${marker}: client asset reference missing in ${relativePath}`);
  fs.writeFileSync(filePath, next);
}

console.log(`${marker}: applied`);
