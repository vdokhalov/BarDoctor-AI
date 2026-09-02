import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "node_modules", "vinext", "package.json");
const bundlePath = path.join(root, "node_modules", "vinext", "dist", "index.js");
const vinextVersion = JSON.parse(readFileSync(packagePath, "utf8")).version;

if (vinextVersion !== "0.0.50") {
  throw new Error(`Refusing to patch unsupported vinext ${vinextVersion}; review the upstream implementation first`);
}

const replacements = [
  {
    original: 'JSON.stringify(crypto.randomUUID())',
    patched: 'JSON.stringify(process.env.BARDOCTOR_VINEXT_DRAFT_SECRET || crypto.randomUUID())',
  },
  {
    original: 'const prerenderSecret = randomBytes(32).toString("hex");',
    patched: 'const prerenderSecret = process.env.BARDOCTOR_VINEXT_PRERENDER_SECRET || randomBytes(32).toString("hex");',
  },
];

let source = readFileSync(bundlePath, "utf8");
let changed = false;
for (const { original, patched } of replacements) {
  const originalCount = source.split(original).length - 1;
  const patchedCount = source.split(patched).length - 1;
  if (originalCount === 1 && patchedCount === 0) {
    source = source.replace(original, patched);
    changed = true;
    continue;
  }
  if (originalCount === 0 && patchedCount === 1) continue;
  throw new Error("Vinext reproducibility patch did not match exactly once; dependency contents changed");
}

if (changed) writeFileSync(bundlePath, source);
console.log(`Verified reproducible-build adapter for vinext ${vinextVersion}.`);
