import fs from "node:fs";

const targets = [
  new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
  new URL("./fragments/writeoff-workflow-v271.fragment.txt", import.meta.url),
];
const guardedBackClose = 'function x(){window.bdNavigateBack(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}))}';
const shellClose = 'function x(){window.bdNavigate(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}),{replace:!0})}';
const newClose = 'function x(){a(bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"}),{replace:!0})}';
const hardenedClose = 'function x(){const A=bdWarehouseNavigationUrlV247({writeoff:null,tab:"writeoffs"});a(A,{replace:!0}),setTimeout(()=>window.dispatchEvent(new PopStateEvent("popstate",{state:window.history.state})),0)}';

for (const target of targets) {
  let source = fs.readFileSync(target, "utf8");
  if (!source.includes(hardenedClose)) {
    const anchor = source.includes(newClose) ? newClose : source.includes(shellClose) ? shellClose : guardedBackClose;
    if (!source.includes(anchor)) throw new Error(`Write-off close navigation anchor was not found in ${target.pathname}`);
    source = source.replace(anchor, hardenedClose);
    fs.writeFileSync(target, source);
  }
  if (!source.includes(hardenedClose)) throw new Error(`Write-off close navigation v296 was not applied to ${target.pathname}`);
}

console.log("Write-off close navigation v296 patched");
