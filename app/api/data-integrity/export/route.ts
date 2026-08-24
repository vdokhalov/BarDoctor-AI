import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
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
    inArray(domainData.storeKey, [...AUTHORITATIVE_STORE_KEYS]),
  ));
  const serverStores: Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>> = {};
  for (const row of rows) {
    if (!AUTHORITATIVE_STORE_KEYS.includes(row.storeKey as AuthoritativeStoreKey)) continue;
    let data: unknown;
    let parseError = false;
    try {
      data = JSON.parse(row.dataJson);
    } catch {
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
  });
}

function forbidden() {
  return Response.json({ ok: false, code: "OWNER_ONLY", error: "Полный data-integrity export доступен владельцу." }, { status: 403 });
}

export async function GET(request: Request): Promise<Response> {
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
