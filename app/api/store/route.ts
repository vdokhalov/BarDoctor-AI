import { getD1 } from "../../../db";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { AUTHORITATIVE_STORE_KEYS } from "../../../lib/bardoctor/authoritative-persistence";
import { canReadStore } from "../../../lib/bardoctor/data-trust";

type StoreRow = { store_key: string; data_json: string; updated_at: string };

/** Read-only bootstrap: missing legacy data is never materialized as empty. */
export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  const result = await getD1().prepare(`
    SELECT store_key, data_json, updated_at
    FROM domain_data
    WHERE account_id = ?
  `).bind(account.id).all<StoreRow>();
  const entries: Record<string, { data: unknown; updatedAt: string; source: "server_d1" }> = {};
  for (const row of result.results ?? []) {
    if (!canReadStore(account, row.store_key)) continue;
    entries[row.store_key] = {
      data: JSON.parse(row.data_json),
      updatedAt: row.updated_at,
      source: "server_d1",
    };
  }
  const missingAuthoritativeStores = AUTHORITATIVE_STORE_KEYS.filter((key) => !(key in entries));
  return Response.json({
    ok: true,
    entries,
    persistenceBoundary: {
      authoritativeSource: "server_d1",
      readOnly: true,
      missingAuthoritativeStores,
      complete: missingAuthoritativeStores.length === 0,
      legacyImportRequired: missingAuthoritativeStores.length > 0,
      writesPerformed: 0,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
