import { getD1 } from "../../../db";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { canReadStore } from "../../../lib/bardoctor/data-trust";
import {
  EXPENSE_STORE_KEY,
  migratePurchaseLedger,
  PURCHASE_STORE_KEY,
} from "../../../lib/bardoctor/purchases";

type StoreRow = {
  store_key: string;
  data_json: string;
  updated_at: string;
};

function array(value: string | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertStore(
  database: D1Database,
  accountId: number,
  key: string,
  value: unknown,
  updatedAt: string,
): D1PreparedStatement {
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(accountId, key, JSON.stringify(value), updatedAt);
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();

  const database = getD1();
  const result = await database.prepare(`
    SELECT store_key, data_json, updated_at
    FROM domain_data
    WHERE account_id = ?
  `).bind(account.id).all<StoreRow>();
  const rows = new Map((result.results ?? []).map((row) => [row.store_key, row]));
  const now = new Date().toISOString();
  const ledger = migratePurchaseLedger({
    documents: array(rows.get(PURCHASE_STORE_KEY)?.data_json),
    expenses: array(rows.get(EXPENSE_STORE_KEY)?.data_json),
    venueId: account.venueId,
    now,
  });

  if (ledger.changed) {
    const actorName = [account.firstName, account.lastName].filter(Boolean).join(" ")
      || account.appEmail;
    await database.batch([
      upsertStore(database, account.id, PURCHASE_STORE_KEY, ledger.documents, now),
      upsertStore(database, account.id, EXPENSE_STORE_KEY, ledger.expenses, now),
      database.prepare(`
        INSERT INTO audit_log (
          account_id, store_key, action, entity_id, entity_label, month_key,
          before_json, after_json, changed_fields_json, actor_name, actor_role,
          reason, created_at
        ) VALUES (?, ?, 'update', ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)
      `).bind(
        account.id,
        PURCHASE_STORE_KEY,
        `purchase-ledger-v2:${account.venueId}`,
        "Единый контур закупок",
        JSON.stringify(ledger.summary),
        JSON.stringify(["paymentStatus", "paidAmount", "balanceDue", "legacyKind"]),
        actorName,
        account.role,
        "Безопасная миграция: только точные связи стали платежами; несвязанные расходы сохранены как legacy",
        now,
      ),
    ]);
    rows.set(PURCHASE_STORE_KEY, {
      store_key: PURCHASE_STORE_KEY,
      data_json: JSON.stringify(ledger.documents),
      updated_at: now,
    });
    rows.set(EXPENSE_STORE_KEY, {
      store_key: EXPENSE_STORE_KEY,
      data_json: JSON.stringify(ledger.expenses),
      updated_at: now,
    });
  }

  const entries: Record<string, { data: unknown; updatedAt: string }> = {};
  for (const row of rows.values()) {
    if (!canReadStore(account, row.store_key)) continue;
    entries[row.store_key] = {
      data: JSON.parse(row.data_json),
      updatedAt: row.updated_at,
    };
  }

  return Response.json(
    { ok: true, entries },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
