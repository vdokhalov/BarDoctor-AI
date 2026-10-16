import {readSalesEvents} from '../../../../lib/bardoctor/sales-event-storage';
import {readStockHistory} from "../../../../lib/bardoctor/stock-storage";
import {salesEventDocuments} from "../../../../lib/bardoctor/sales-events";
import {readStoreSnapshots,storeSnapshots,StoreWriteConflictError,withStoreCasRetries} from "../../../../lib/bardoctor/store-cas";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, getD1 } from "../../../../db";
import { domainData, venues } from "../../../../db/schema";
import {
  AUTHORITATIVE_STORE_KEYS,
  buildImmutableVenueExport,
  type AuthoritativeStoreInput,
  type AuthoritativeStoreKey,
} from "../../../../lib/bardoctor/authoritative-persistence";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";

async function createExport(
  account: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
  legacyCandidates: Partial<Record<AuthoritativeStoreKey, unknown>> = {},
) {
  const db = getDb();
  const [venue] = await db.select().from(venues).where(eq(venues.id, account.venueId)).limit(1);
  const rows = await db.select().from(domainData).where(and(
    eq(domainData.accountId, account.id),
    inArray(domainData.storeKey, [...AUTHORITATIVE_STORE_KEYS,"bd_sales_batches","bd_sales_events_v1","bd_inventory_writeoffs"]),
  ));
  const serverStores: Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>> = {};
  for (const row of rows) {
    if (!AUTHORITATIVE_STORE_KEYS.includes(row.storeKey as AuthoritativeStoreKey)) continue;
    let data: unknown;
    let parseError = false;
    try {
      data = row.storeKey==="bd_stock_movements" ? await readStockHistory(getD1(),account.id,row.dataJson) : JSON.parse(row.dataJson);
    } catch (error) {
      if(row.storeKey==="bd_stock_movements" && !(error instanceof SyntaxError))throw error;
      data = null;
      parseError = true;
    }
    serverStores[row.storeKey as AuthoritativeStoreKey] = {
      exists: true,
      data,
      updatedAt: row.updatedAt,
      parseError,
    };
  }
  const relatedKeys=["bd_sales_batches","bd_sales_events_v1","bd_inventory_writeoffs"];
  const relatedStores=Object.fromEntries(await Promise.all(relatedKeys.map(async key=>{const row=rows.find(row=>row.storeKey===key);const value=key==='bd_sales_events_v1'?await readSalesEvents(getD1(),account.id,row?.dataJson):row?JSON.parse(row.dataJson):[];if(!Array.isArray(value))throw Error('EXPORT_SOURCE_NEEDS_REVIEW');return [key,value];})));
  const original=storeSnapshots(rows.map(row=>({store_key:row.storeKey,data_json:row.dataJson,updated_at:row.updatedAt})),[...AUTHORITATIVE_STORE_KEYS,...relatedKeys]);
  const current=await readStoreSnapshots(getD1(),account.id,original.map(row=>row.key));
  if(JSON.stringify(original)!==JSON.stringify(current))throw new StoreWriteConflictError();
  const profile = account.restaurantJson ? JSON.parse(account.restaurantJson) as Record<string, unknown> : {};
  return buildImmutableVenueExport({
    venue: {
      id: account.venueId,
      name: typeof profile.name === "string" ? profile.name : null,
      workspaceId: venue?.workspaceId ?? null,
      dataAccountId: account.id,
    },
    serverStores,
    legacyCandidates,
    relatedStores,
    salesBatches:[...relatedStores.bd_sales_batches,...salesEventDocuments(relatedStores.bd_sales_events_v1,account.venueId)],
    writeOffDocuments:relatedStores.bd_inventory_writeoffs,
  });
}

function forbidden() {
  return Response.json({ ok: false, code: "OWNER_ONLY", error: "Полный data-integrity export доступен владельцу." }, { status: 403 });
}

export async function GET(request: Request): Promise<Response> { return withStoreCasRetries(request,getExport); }
async function getExport(request:Request):Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (account.role !== "owner") return forbidden();
  const snapshot = await createExport(account);
  return Response.json({ ok: true, snapshot }, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="bardoctor-venue-${account.venueId}-${snapshot.exportId}.json"`,
    },
  });
}

/** Read-only client-cache candidate audit. It deliberately never persists. */
export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (account.role !== "owner") return forbidden();
  const parsed = await readJsonRequest<{ legacyCandidates?: Partial<Record<AuthoritativeStoreKey, unknown>> }>(request);
  if (!parsed.ok) return parsed.response;
  const allowedCandidates = Object.fromEntries(Object.entries(parsed.data.legacyCandidates ?? {})
    .filter(([key]) => AUTHORITATIVE_STORE_KEYS.includes(key as AuthoritativeStoreKey))) as Partial<Record<AuthoritativeStoreKey, unknown>>;
  const snapshot = await createExport(account, allowedCandidates);
  return Response.json({
    ok: true,
    mode: "read_only_import_preview",
    approvalRequired: true,
    writesPerformed: 0,
    snapshot,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
