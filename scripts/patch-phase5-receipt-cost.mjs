import fs from "node:fs";
import { patchReceiptCost } from "./lib/phase5-receipt-cost.mjs";
const file = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const source = fs.readFileSync(file, "utf8");
const patched = patchReceiptCost(source);
if (patched !== source) fs.writeFileSync(file, patched);
console.log("Phase 5: receipt-only operational costing applied");
