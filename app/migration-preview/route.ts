import { getD1 } from "../../db";
import {
  authenticateIdentityRequest,
  findAccountByAppEmail,
  getChatGPTEmail,
  unauthorized,
  venueContextForAccount,
} from "../../lib/bardoctor/auth";
import { buildAssortmentMigrationPreview } from "../../lib/bardoctor/assortment-migration-preview";
import { ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY } from "../../lib/bardoctor/inventory";
import { PURCHASE_STORE_KEY, SUPPLIER_STORE_KEY } from "../../lib/bardoctor/purchases";

type StoreRow = { store_key: string; data_json: string };

const KOLN_VENUE_ID = 1;
const KOLN_DATA_ACCOUNT_ID = 1;

function parse(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value) as unknown; } catch { return fallback; }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(request: Request): Promise<Response> {
  const sessionIdentity = await authenticateIdentityRequest(request);
  const chatgptEmail = getChatGPTEmail(request);
  const chatgptIdentity = chatgptEmail ? await findAccountByAppEmail(chatgptEmail) : null;
  const identities = [sessionIdentity, chatgptIdentity].filter((identity, index, rows) =>
    Boolean(identity) && rows.findIndex((row) => row?.id === identity?.id) === index
  );
  if (!identities.length) return unauthorized();
  let ownerAuthorized = false;
  for (const identity of identities) {
    const candidate = await venueContextForAccount(identity!, KOLN_VENUE_ID);
    if (candidate?.role === "owner" && candidate.venue.id === KOLN_VENUE_ID && candidate.dataAccount.id === KOLN_DATA_ACCOUNT_ID) {
      ownerAuthorized = true;
      break;
    }
  }
  if (!ownerAuthorized) {
    return Response.json(
      { ok: false, code: "KOLN_OWNER_ONLY", error: "Preview доступен только владельцу authoritative Кёльна" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const result = await getD1().prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?, ?)
  `).bind(KOLN_DATA_ACCOUNT_ID, PURCHASE_STORE_KEY, SUPPLIER_STORE_KEY, STOCK_MOVEMENT_STORE_KEY, ASSORTMENT_STORE_KEY).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const preview = buildAssortmentMigrationPreview({
    venueId: KOLN_VENUE_ID,
    purchases: parse(stores.get(PURCHASE_STORE_KEY), []),
    suppliers: parse(stores.get(SUPPLIER_STORE_KEY), []),
    stockMovements: parse(stores.get(STOCK_MOVEMENT_STORE_KEY), []),
    serverAssortmentExists: stores.has(ASSORTMENT_STORE_KEY),
    sourceStorePresence: {
      purchases: stores.has(PURCHASE_STORE_KEY),
      suppliers: stores.has(SUPPLIER_STORE_KEY),
      stockMovements: stores.has(STOCK_MOVEMENT_STORE_KEY),
      assortment: stores.has(ASSORTMENT_STORE_KEY),
    },
  });
  console.info("KOLN_ASSORTMENT_MIGRATION_PREVIEW", JSON.stringify({
    venueId: KOLN_VENUE_ID,
    dataAccountId: KOLN_DATA_ACCOUNT_ID,
    verdict: preview.verdict,
    sources: preview.sources,
    coverage: preview.coverage,
    proposal: {
      totalPositions: preview.proposal.totalPositions,
      safePositions: preview.proposal.safePositions,
      reviewPositions: preview.proposal.reviewPositions,
      statusCounts: preview.proposal.statusCounts,
    },
    duplicates: {
      exactDuplicateSupplierLines: preview.duplicates.exactDuplicateSupplierLines,
      probable: preview.duplicates.probable.length,
      identifierConflicts: preview.duplicates.identifierConflicts.length,
    },
    blockers: preview.blockers,
    writesPerformed: preview.writesPerformed,
  }));
  const body = JSON.stringify({
    ok: true,
    venue: { id: KOLN_VENUE_ID, dataAccountId: KOLN_DATA_ACCOUNT_ID, name: "Кёльн" },
    featureFlagRequiredState: "legacy",
    preview,
  }, null, 2);
  const apply = new URL(request.url).searchParams.get("apply") === "confirmed";
  return new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Кёльн · canonical migration preview</title><style>body{margin:0;background:#111;color:#eee;font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}pre{white-space:pre-wrap;word-break:break-word;margin:0;padding:24px;max-width:1200px}#koln-migration-output{margin:24px;padding:20px;border:1px solid #555;border-radius:12px;background:#1b1b1b;font:16px/1.55 system-ui}</style>${apply ? '<script src="/koln-assortment-migration-v1.js" defer></script>' : ""}</head><body>${apply ? '<section id="koln-migration-output">Подготавливаю migration…</section>' : ""}<pre>${escapeHtml(body)}</pre></body></html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-BarDoctor-Data-Mode": "controlled-read-only-migration-preview",
    },
  });
}
