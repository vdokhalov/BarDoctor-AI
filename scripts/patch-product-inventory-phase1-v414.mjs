import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const versionTargets = [
  new URL("../app/bar-doctor-response.ts", import.meta.url),
  new URL("../public/app.html", import.meta.url),
  new URL("../public/bardoctor-preview.js", import.meta.url),
];
const marker = "20260906-product-inventory-safety-v414";
let bundle = readFileSync(bundlePath, "utf8");
const start = bundle.indexOf("function bdCatRecipeEditor");
const end = bundle.indexOf("function bdCatImportReview", start);
if (start < 0 || end < 0) throw new Error("recipe editor segment not found");
const unsafe = "current:Math.max(0,bdCatNumber(G.current)),";
const editor = bundle.slice(start, end);
if (editor.includes(unsafe)) {
  const nextEditor = editor.replace(unsafe, "");
  if (nextEditor.includes(unsafe)) throw new Error("multiple recipe current mutations remain");
  bundle = bundle.slice(0, start) + nextEditor + bundle.slice(end);
}
const patchedEditor = bundle.slice(start, bundle.indexOf("function bdCatImportReview", start));
if (!patchedEditor.includes('metadataSource:"recipe"') || patchedEditor.includes(unsafe)) {
  throw new Error("recipe metadata payload safety invariant failed");
}
writeFileSync(bundlePath, bundle);

for (const target of versionTargets) {
  let source = readFileSync(target, "utf8");
  if (!source.includes(marker)) source = source.replaceAll("20260823-latest-cost-copy-v412", `20260823-latest-cost-copy-v412-${marker}`);
  writeFileSync(target, source);
}

console.log("Applied product/inventory safety v414.");
