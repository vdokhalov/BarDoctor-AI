import fs from "node:fs";

const targets = [
  new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
  new URL("./fragments/writeoff-workflow-v271.fragment.txt", import.meta.url),
];
const oldClose = 'function x(){a(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}),{replace:!0})}';
const newClose = 'function x(){window.bdNavigateBack(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}))}';

for (const target of targets) {
  let source = fs.readFileSync(target, "utf8");
  if (!source.includes(newClose)) {
    if (!source.includes(oldClose)) throw new Error(`Write-off close navigation anchor was not found in ${target.pathname}`);
    source = source.replace(oldClose, newClose);
    fs.writeFileSync(target, source);
  }
  if (!source.includes(newClose)) throw new Error(`Write-off close navigation v296 was not applied to ${target.pathname}`);
}

console.log("Write-off close navigation v296 patched");
