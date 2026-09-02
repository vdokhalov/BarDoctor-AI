import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let restored = 0;

for (const relativePath of ["app/bar-doctor-response.ts", "public/app.html", "public/bardoctor-preview.js"]) {
  const filePath = path.join(root, relativePath);
  const contents = fs.readFileSync(filePath, "utf8");
  const next = contents.replace(
    /\/assets\/index-BQGspy0I-[a-f0-9]{12}\.js(?=\?v=[^"']+)/g,
    "/assets/index-BQGspy0I.js",
  );
  if (next !== contents) {
    fs.writeFileSync(filePath, next);
    restored += 1;
  }
}

if (restored !== 0 && restored !== 3) {
  throw new Error(`Expected zero or three client asset references to restore, restored ${restored}`);
}
console.log(
  restored === 3
    ? "bd-versioned-client-asset-v379: canonical references restored after build"
    : "bd-versioned-client-asset-v379: canonical references already active",
);
