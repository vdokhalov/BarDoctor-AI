import { env } from "cloudflare:workers";
import { getD1 } from "../../db";
import type { Account } from "../../db/schema";
import { getChatGPTEmail } from "./auth";
import { verifyPassword } from "./password";
import { cancelScheduledPush } from "./notifications";

export class LifecycleError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type OwnedVenue = { id: number; workspace_id: number; data_account_id: number; status: string; restaurant_json: string | null; other_owners: number };
const ownedQuery = `SELECT v.*, a.restaurant_json,
  (SELECT COUNT(*) FROM venue_memberships m JOIN accounts u ON u.id=m.account_id
   JOIN workspace_memberships ow ON ow.workspace_id=v.workspace_id AND ow.account_id=m.account_id AND ow.status='active'
   WHERE m.venue_id=v.id AND m.role='owner' AND m.status='active' AND u.account_kind='user' AND m.account_id<>?) other_owners
  FROM venues v JOIN accounts a ON a.id=v.data_account_id
  JOIN venue_memberships m ON m.venue_id=v.id
  JOIN workspace_memberships wm ON wm.workspace_id=v.workspace_id AND wm.account_id=m.account_id
  JOIN workspaces w ON w.id=v.workspace_id
  WHERE m.account_id=? AND m.role='owner' AND m.status='active' AND wm.status='active' AND w.status='active'`;
export function lifecycleVenueName(venue: OwnedVenue): string {
  try { return String(JSON.parse(venue.restaurant_json || "{}").name || `Заведение №${venue.id}`); }
  catch { return `Заведение №${venue.id}`; }
}
export async function ownedLifecycleVenues(accountId: number): Promise<OwnedVenue[]> {
  return (await getD1().prepare(ownedQuery).bind(accountId, accountId).all<OwnedVenue>()).results;
}
async function ownedVenue(accountId: number, venueId: number): Promise<OwnedVenue> {
  const venue = (await ownedLifecycleVenues(accountId)).find(v => v.id === venueId);
  if (!venue) throw new LifecycleError(403, "Управлять заведением может только его владелец.");
  return venue;
}
// An invalid predicate aborts the entire D1 batch (including earlier statements).
function guard(accountId: number, predicate: string, values: unknown[] = []) {
  return getD1().prepare(`INSERT INTO domain_data(account_id,store_key,data_json)
    SELECT ?, '__bd_lifecycle_guard__', NULL WHERE NOT (${predicate})`).bind(accountId, ...values);
}
function ownerGuard(accountId: number, venue: OwnedVenue) {
  return guard(accountId, `EXISTS (SELECT 1 FROM venue_memberships m JOIN venues v ON v.id=m.venue_id
    WHERE m.account_id=? AND m.venue_id=? AND m.role='owner' AND m.status='active' AND v.status=? AND v.data_account_id=?
    AND EXISTS(SELECT 1 FROM workspace_memberships wm JOIN workspaces w ON w.id=wm.workspace_id
      WHERE wm.workspace_id=v.workspace_id AND wm.account_id=m.account_id AND wm.status='active' AND w.status='active'))`,
  [accountId, venue.id, venue.status, venue.data_account_id]);
}
export async function setVenueArchive(accountId: number, venueId: number, status: "active" | "archived") {
  const venue = await ownedVenue(accountId, venueId);
  if (!['active','archived'].includes(venue.status)) throw new LifecycleError(409, "Удаление уже начато. Повторите удаление, чтобы завершить очистку.");
  const db = getD1();
  await db.batch([ownerGuard(accountId, venue),
    db.prepare("UPDATE venues SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, venueId),
    ...(status === "archived" ? [db.prepare("UPDATE sessions SET active_venue_id=NULL WHERE active_venue_id=?").bind(venueId)] : []),
  ]);
  return { ok: true, venueId, status, deleted: false };
}
async function removePrefixes(prefixes: string[]) {
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!bucket) throw new LifecycleError(503, "Хранилище недоступно. Очистка не завершена; повторите удаление.");
  for (const prefix of prefixes) {
    // Delete the first page repeatedly: cursors may become invalid as objects disappear.
    for (;;) {
      const page = await bucket.list({ prefix, limit: 1000 });
      if (!page.objects.length) break;
      await bucket.delete(page.objects.map(object => object.key));
    }
  }
}
const operationalTables = ["domain_data", "audit_log", "google_connections", "oauth_states", "review_source_events", "integration_secrets", "ai_usage_limits", "ai_usage_events"];
async function cancelStoredNotifications(accountId: number, venueId?: number) {
  // An already claimed provider request must settle before we can cancel its result.
  // Keep the venue quarantined and return a retryable result instead of deleting its job.
  const scope = venueId === undefined ? 'account_id=?' : 'venue_id=?';
  const scopeId = venueId ?? accountId;
  const leased = await getD1().prepare(`SELECT 1 FROM notification_jobs WHERE ${scope} AND status='dispatching' AND leased_at>? LIMIT 1`)
    .bind(scopeId, new Date(Date.now() - 15 * 60_000).toISOString()).first();
  if (leased) throw new LifecycleError(503, "Завершается отправка уведомления. Доступ к заведению закрыт; повторите удаление через минуту.");
  const deliveryScope = venueId === undefined ? 'd.account_id=?' : 'EXISTS(SELECT 1 FROM notification_jobs j WHERE j.venue_id=? AND j.account_id=d.account_id AND j.dedupe_key=d.dedupe_key)';
  const rows = await getD1().prepare(`SELECT d.account_id,d.provider_message_id,d.dedupe_key FROM notification_deliveries d WHERE ${deliveryScope} AND d.status='scheduled' AND d.provider_message_id IS NOT NULL`)
    .bind(scopeId).all<{ account_id: number; provider_message_id: string; dedupe_key: string }>();
  for (const row of rows.results) {
    if (await cancelScheduledPush(row.account_id, row.provider_message_id, row.dedupe_key)) continue;
    const current = await getD1().prepare("SELECT status FROM notification_deliveries WHERE account_id=? AND dedupe_key=?").bind(row.account_id, row.dedupe_key).first<{ status: string }>();
    if (current?.status !== 'expired') throw new LifecycleError(503, "Не удалось отменить запланированное уведомление. Повторите удаление.");
  }
}
export async function deleteOwnedVenue(accountId: number, venueId: number, confirmation: unknown) {
  const db = getD1();
  const receipt = `__bd_deleted_venue_${venueId}`;
  if (await db.prepare("SELECT 1 FROM domain_data WHERE account_id=? AND store_key=?").bind(accountId, receipt).first()) {
    return { ok: true, venueId, deleted: true, alreadyDeleted: true };
  }
  const venue = await ownedVenue(accountId, venueId);
  if (typeof confirmation !== 'string' || confirmation !== lifecycleVenueName(venue)) {
    throw new LifecycleError(400, "Введите точное название удаляемого заведения.");
  }
  // Durable quarantine: auth, switcher and integration ingress all require active venues.
  await db.batch([ownerGuard(accountId, venue),
    db.prepare("UPDATE venues SET status='deleting',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(venueId),
    db.prepare("UPDATE sessions SET active_venue_id=NULL WHERE active_venue_id=?").bind(venueId),
    db.prepare("UPDATE notification_jobs SET status='cancelled' WHERE venue_id=? AND (status<>'dispatching' OR leased_at<?)")
      .bind(venueId, new Date(Date.now() - 15 * 60_000).toISOString()),
    db.prepare("UPDATE integration_connections SET sync_enabled=0,status='disabled' WHERE venue_id=?").bind(venueId),
    db.prepare("UPDATE integration_ingress_tokens SET revoked_at=CURRENT_TIMESTAMP WHERE venue_id=?").bind(venueId),
  ]);
  await cancelStoredNotifications(venue.data_account_id, venueId);
  await removePrefixes(['venues','purchases','sales','catalog','employees'].map(prefix => `${prefix}/${venue.data_account_id}/`));
  const statements = [ownerGuard(accountId, { ...venue, status: 'deleting' }),
    db.prepare("DELETE FROM venue_migration_operations WHERE venue_id=?").bind(venueId),
    db.prepare("DELETE FROM venue_migration_exports WHERE venue_id=?").bind(venueId),
    db.prepare("DELETE FROM ai_usage_events WHERE venue_id=?").bind(venueId),
    db.prepare("DELETE FROM invoice_recognition_jobs WHERE venue_id=? AND account_id=?").bind(venueId, venue.data_account_id),
    db.prepare("DELETE FROM notification_deliveries WHERE EXISTS(SELECT 1 FROM notification_jobs j WHERE j.venue_id=? AND j.account_id=notification_deliveries.account_id AND j.dedupe_key=notification_deliveries.dedupe_key)").bind(venueId),
    db.prepare("DELETE FROM notification_jobs WHERE venue_id=?").bind(venueId),
    db.prepare("DELETE FROM venues WHERE id=?").bind(venueId),
    db.prepare("DELETE FROM workspaces WHERE id=? AND NOT EXISTS(SELECT 1 FROM venues WHERE workspace_id=?)").bind(venue.workspace_id, venue.workspace_id),
    ...operationalTables.map(table => db.prepare(`DELETE FROM ${table} WHERE account_id=?`).bind(venue.data_account_id)),
    // The initial venue can share a physical row with a living user's identity.
    db.prepare(`UPDATE accounts SET owns_venue=0,restaurant_json=NULL,competitors_json=NULL,review_sources_json=NULL,
      migration_status='server_authoritative',migration_summary_json=NULL WHERE id=?`).bind(venue.data_account_id),
    db.prepare("DELETE FROM accounts WHERE id=? AND account_kind='venue_data' AND chatgpt_email NOT LIKE 'deleted-%@identity.bardoctor.invalid'").bind(venue.data_account_id),
    db.prepare("UPDATE accounts SET account_kind='deleted_identity' WHERE id=? AND account_kind='venue_data' AND chatgpt_email LIKE 'deleted-%@identity.bardoctor.invalid'").bind(venue.data_account_id),
    db.prepare("INSERT OR REPLACE INTO domain_data(account_id,store_key,data_json) VALUES (?,?,'{}')").bind(accountId, receipt),
  ];
  await db.batch(statements);
  return { ok: true, venueId, deleted: true };
}
export async function deletedIdentityKey(email: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()));
  return `deleted-${Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('')}@identity.bardoctor.invalid`;
}
export async function identityWasDeleted(email: string): Promise<boolean> {
  return Boolean(await getD1().prepare("SELECT 1 FROM accounts WHERE chatgpt_email=? AND account_kind<>'user' LIMIT 1").bind(await deletedIdentityKey(email)).first());
}
export async function deleteOwnAccount(account: Account, request: Request, body: { password?: string; confirmation?: string; deleteVenues?: Record<string, string> }) {
  if (body.confirmation !== 'УДАЛИТЬ АККАУНТ') throw new LifecycleError(400, "Введите УДАЛИТЬ АККАУНТ для подтверждения.");
  const verified = account.passwordHash
    ? await verifyPassword(typeof body.password === 'string' ? body.password : '', account)
    : getChatGPTEmail(request) === account.chatgptEmail;
  if (!verified) throw new LifecycleError(403, account.passwordHash ? "Неверный пароль. Аккаунт не удалён." : "Подтвердите вход через связанную учётную запись или установите пароль штатным восстановлением доступа.");
  const owned = await ownedLifecycleVenues(account.id);
  const lastOwner = owned.filter(venue => venue.other_owners === 0);
  for (const venue of lastOwner) {
    if (body.deleteVenues?.[String(venue.id)] !== lifecycleVenueName(venue)) {
      throw new LifecycleError(409, `Вы — последний владелец «${lifecycleVenueName(venue)}». Передайте владение или отдельно подтвердите удаление этого заведения.`);
    }
  }
  // Validate every confirmation before changing any venue. Other owners' venues are preserved.
  for (const venue of lastOwner) await deleteOwnedVenue(account.id, venue.id, body.deleteVenues?.[String(venue.id)]);
  await cancelStoredNotifications(account.id);
  await removePrefixes([`users/${account.id}/`]);
  const db = getD1();
  const remaining = await ownedLifecycleVenues(account.id);
  if (remaining.some(venue => venue.other_owners === 0)) throw new LifecycleError(409, "Состав владельцев изменился. Обновите список перед удалением аккаунта.");
  const marker = await deletedIdentityKey(account.appEmail);
  const commands = [guard(account.id, `NOT EXISTS (SELECT 1 FROM venue_memberships m JOIN venues v ON v.id=m.venue_id
    WHERE m.account_id=? AND m.role='owner' AND m.status='active' AND NOT EXISTS
    (SELECT 1 FROM venue_memberships other JOIN accounts a ON a.id=other.account_id
     JOIN workspace_memberships wm ON wm.workspace_id=v.workspace_id AND wm.account_id=other.account_id AND wm.status='active'
     WHERE other.venue_id=v.id AND other.role='owner' AND other.status='active' AND other.account_id<>? AND a.account_kind='user'))`, [account.id, account.id]),
    db.prepare(`UPDATE venues SET created_by_account_id=(SELECT MIN(m.account_id) FROM venue_memberships m JOIN accounts a ON a.id=m.account_id
      JOIN workspace_memberships wm ON wm.workspace_id=venues.workspace_id AND wm.account_id=m.account_id AND wm.status='active'
      WHERE m.venue_id=venues.id AND m.role='owner' AND m.status='active' AND m.account_id<>? AND a.account_kind='user') WHERE created_by_account_id=?`).bind(account.id, account.id),
    ...['sessions','venue_memberships','workspace_memberships','notification_preferences','notification_devices','notification_deliveries','notification_jobs','platform_admin_rate_limits','platform_admins'].map(table => db.prepare(`DELETE FROM ${table} WHERE account_id=?`).bind(account.id)),
    db.prepare("DELETE FROM oauth_states WHERE account_id=?").bind(account.id),
    db.prepare("DELETE FROM venue_invites WHERE created_by_account_id=?").bind(account.id),
    db.prepare(`UPDATE accounts SET account_kind=CASE WHEN EXISTS(SELECT 1 FROM venues WHERE data_account_id=accounts.id) THEN 'venue_data' ELSE 'deleted_identity' END,
      app_email=?,chatgpt_email=?,password_hash=NULL,password_salt=NULL,password_iterations=NULL,
      first_name='Удалённый пользователь',last_name=NULL,phone=NULL,avatar_id=NULL,role='member',owns_venue=0,
      migration_summary_json=NULL,migration_status='server_authoritative',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(`deleted-${crypto.randomUUID()}@identity.bardoctor.invalid`, marker, account.id),
    db.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key LIKE '__bd_deleted_venue_%'").bind(account.id),
    ...operationalTables.map(table => db.prepare(`DELETE FROM ${table} WHERE account_id=? AND NOT EXISTS(SELECT 1 FROM venues WHERE data_account_id=?)`).bind(account.id, account.id)),
    db.prepare(`UPDATE accounts SET restaurant_json=NULL,competitors_json=NULL,review_sources_json=NULL WHERE id=? AND account_kind='deleted_identity'`).bind(account.id),
  ];
  // Anonymous technical IDs retain shared business history and immutable admin audit FKs.
  // They cannot authenticate and cannot be found or attached by email on registration.
  await db.batch(commands);
  return { ok: true, deleted: true };
}
export function lifecycleFailure(error: unknown): Response {
  return Response.json({ ok: false, error: error instanceof LifecycleError ? error.message : "Операция не завершена. Обновите список и повторите попытку.", retryable: true },
    { status: error instanceof LifecycleError ? error.status : 503, headers: { 'Cache-Control': 'private, no-store' } });
}
