import fs from "node:fs";
import path from "node:path";
import { finalizeClientRelease } from "./lib/client-release-integrity.mjs";

const root = process.cwd();
const canonicalName = "index-BQGspy0I.js";
const canonicalPath = path.join(root, "public/assets", canonicalName);
const source = fs.readFileSync(canonicalPath);

if (!source.includes(Buffer.from("bd-unit-product-costing-v387"))) {
  throw new Error("The packaged canonical client asset does not contain v387 legacy-key package costing");
}

const { name: versionedName } = finalizeClientRelease(root, source);

console.log(`bd-unit-product-costing-v387: finalized ${versionedName}`);
