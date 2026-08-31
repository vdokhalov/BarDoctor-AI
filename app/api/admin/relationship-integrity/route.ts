import { inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { domainData, venues as venueTable } from "../../../../db/schema";
import { auditDataIntegrity } from "../../../../lib/bardoctor/data-integrity-audit";
import {
  adminForbidden,
  authenticatePlatformAdmin,
} from "../../../../lib/bardoctor/platform-admin";

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const STORE_KEYS = [
  "bd_assortment_v1",
  "bd_purchase_documents",
  "bd_stock_movements",
  "bd_inventory_writeoffs",
  "bd_sales_batches",
] as const;

function parsed(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value) as unknown; } catch { return fallback; }
}

/** Platform-admin-only, read-only relationship diagnostics across venue stores. */
export async function GET(request: Request): Promise<Response> {
  if (!await authenticatePlatformAdmin(request)) return adminForbidden();

  const db = getDb();
  const [venueRows, storeRows] = await Promise.all([
    db.select({ id: venueTable.id, accountId: venueTable.dataAccountId, status: venueTable.status }).from(venueTable),
    db.select({ accountId: domainData.accountId, key: domainData.storeKey, json: domainData.dataJson })
      .from(domainData).where(inArray(domainData.storeKey, [...STORE_KEYS])),
  ]);
  const stores = new Map(storeRows.map((row) => [`${row.accountId}:${row.key}`, row.json]));
  const generatedAt = new Date();
  const venues = venueRows.map((venue) => {
    const store = (key: typeof STORE_KEYS[number], fallback: unknown) =>
      parsed(stores.get(`${venue.accountId}:${key}`), fallback);
    const report = auditDataIntegrity({
      assortment: store("bd_assortment_v1", {}),
      purchaseDocuments: list(store("bd_purchase_documents", [])),
      stockMovements: list(store("bd_stock_movements", [])),
      writeOffDocuments: list(store("bd_inventory_writeoffs", [])),
      salesBatches: list(store("bd_sales_batches", [])),
      venueId: venue.id,
      now: generatedAt,
    });
    return {
      venue: { id: venue.id, name: `Заведение №${venue.id}`, status: venue.status },
      counts: report.counts,
      findings: report.findings,
      affectedRecords: report.reconciliation.affectedRecords,
      writesPerformed: report.reconciliation.writesPerformed,
    };
  });

  return Response.json({
    ok: true,
    generatedAt: generatedAt.toISOString(),
    mode: "platform_admin_read_only_dry_run",
    writesPerformed: 0,
    summary: {
      venuesChecked: venues.length,
      venuesWithFindings: venues.filter((venue) => venue.findings.length > 0).length,
      findings: venues.reduce((sum, venue) => sum + venue.findings.length, 0),
      affectedRecords: venues.reduce((sum, venue) => sum + venue.affectedRecords, 0),
    },
    venues,
  }, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-BarDoctor-Data-Mode": "read-only-dry-run",
    },
  });
}
