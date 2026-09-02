import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { previewPurchaseAccountingMigration } from "../lib/bardoctor/accounting-money-migration";

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) throw new Error("usage: input.json output.json");
const bytes = await readFile(inputPath);
const root = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
const snapshot = root.snapshot as Record<string, unknown>;
const stores = snapshot.stores as Record<string, unknown>;
const documents = Array.isArray(stores.bd_purchase_documents) ? stores.bd_purchase_documents : [];
const preview = previewPurchaseAccountingMigration({
  documents,
  accountingCurrency: "RUB",
  legacyRubSemanticAmbiguous: true,
});
const output = {
  schemaVersion: "bardoctor.accounting-money-migration-preview.v1",
  createdAt: "2026-08-28T00:00:00.000Z",
  mode: "read_only",
  scope: { venueId: 1, dataAccountId: 1, venue: "Кёльн" },
  currentStoredAccountingCurrency: "RUB",
  rubSemanticStatus: "AMBIGUOUS_ISO_RUB_VS_PMR_RUB",
  source: {
    exportId: snapshot.exportId,
    stableChecksum: (snapshot.checksum as Record<string, unknown>)?.value,
    physicalSha256: createHash("sha256").update(bytes).digest("hex"),
  },
  preview,
  writesPerformed: 0,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, counts: {
  total: preview.recordsTotal,
  noAction: preview.noActionRequired.length,
  safe: preview.safeAutoNormalization.length,
  requiresFx: preview.requiresFx.length,
  sourceVerification: preview.requiresSourceVerification.length,
  ambiguous: preview.ambiguous.length,
} }));
