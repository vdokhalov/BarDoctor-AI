import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const bundlePath = join(projectRoot, "public/assets/index-BQGspy0I.js");
const fragmentPath = join(scriptDirectory, "fragments/more-hub-v166.fragment.txt");
const startMarker = "/* bd-more-hub-v166:start */";
const endMarker = "/* bd-more-hub-v166:end */";
const insertionMarker = "const bdSupplierWorkspaceVersion=";

let bundle = await readFile(bundlePath, "utf8");
const fragment = (await readFile(fragmentPath, "utf8")).trim();
const existingStart = bundle.indexOf(startMarker);
const existingEnd = bundle.indexOf(endMarker);

if (existingStart >= 0 && existingEnd > existingStart) {
  bundle = bundle.slice(0, existingStart) + bundle.slice(existingEnd + endMarker.length);
}

if (bundle.includes("function t_e()")) {
  bundle = bundle.replace("function t_e()", "function bdMoreLegacyPageV165()");
}

if (!bundle.includes("function bdMoreLegacyPageV165()")) {
  throw new Error("Legacy More component was not found");
}

const insertionIndex = bundle.indexOf(insertionMarker);
if (insertionIndex < 0) throw new Error("More hub insertion marker was not found");

bundle = bundle.slice(0, insertionIndex) + fragment + "\n\n" + bundle.slice(insertionIndex);
await writeFile(bundlePath, bundle);
console.log("More hub v166 injected");
