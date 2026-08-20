import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");
const before = 'i.jsxs("summary",{className:"bd-finance-quick-add-fab"';
const after = 'i.jsxs("summary",{role:"button",className:"bd-finance-quick-add-fab"';

if (source.includes(after)) {
  console.log("Finance Quick Add summary role v161 is already applied.");
  process.exit(0);
}
if (!source.includes(before)) {
  throw new Error("Finance Quick Add summary was not found for accessibility v161.");
}

source = source.replace(before, after);
await writeFile(bundlePath, source);
console.log("Finance Quick Add summary role v161 applied.");
