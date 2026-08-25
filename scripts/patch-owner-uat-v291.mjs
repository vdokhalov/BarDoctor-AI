import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = readFileSync(bundlePath, "utf8");
const marker = 'const bdOwnerUATFixesV291="owner-uat-v291";';
if (source.includes(marker)) {
  console.log("Owner UAT v291 patch already applied");
  process.exit(0);
}

const before = '_(P),Kse(bdCatalogStoreKey,P);const c=await qr(bdCatalogStoreKey,P);';
const after = '_(P);const c=await qr(bdCatalogStoreKey,P);Kse(bdCatalogStoreKey,P);';
if (!source.includes(before)) throw new Error("Owner UAT v291 catalog save ordering target not found");
source = marker + source.replace(before, after);
writeFileSync(bundlePath, source);
console.log("Owner UAT v291 patch applied");
