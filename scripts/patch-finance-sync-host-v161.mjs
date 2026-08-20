import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

if (source.includes('"data-bd-sync-host":"finance-v161"')) {
  console.log("Finance sync host v161 is already applied.");
  process.exit(0);
}

const oldHost = String.raw`i.jsxs("div",{className:"bd-finance-header-actions",children:[i.jsx("div",{"data-bd-venue-host":"finance-v160",className:"bd-finance-venue-host"})`;
const newHost = String.raw`i.jsxs("div",{className:"bd-finance-header-actions",children:[i.jsx("div",{"data-bd-sync-host":"finance-v161",className:"bd-finance-sync-host"}),i.jsx("div",{"data-bd-venue-host":"finance-v160",className:"bd-finance-venue-host"})`;

if (!source.includes(oldHost)) {
  throw new Error("Finance header action host was not found for sync v161.");
}

source = source.replace(oldHost, newHost);
await writeFile(bundlePath, source);
console.log("Finance sync host v161 applied.");
