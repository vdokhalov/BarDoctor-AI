import { readFile } from "node:fs/promises";

import { auditDataIntegrity } from "../lib/bardoctor/data-integrity-audit";

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error("Usage: npx tsx scripts/data-integrity-dry-run.ts <venue-export.json>");
}
const payload = JSON.parse(await readFile(sourcePath, "utf8")) as Record<string, unknown>;
const report = auditDataIntegrity({
  assortment: payload.assortment ?? {},
  purchaseDocuments: Array.isArray(payload.purchaseDocuments) ? payload.purchaseDocuments : [],
  stockMovements: Array.isArray(payload.stockMovements) ? payload.stockMovements : [],
  inventorySnapshots: Array.isArray(payload.inventorySnapshots) ? payload.inventorySnapshots : [],
  venueId: Number(payload.venueId) || undefined,
});
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
