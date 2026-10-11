import { getD1 } from '../../db';
import { type AuthenticatedAccount, hasPermission, isAccessRole, permissionPayload } from './access-control';
import { accountingCurrencyFromRestaurantJson } from './currency';
import { compareStoreData } from './data-trust';
import { stableJson } from './authoritative-persistence';
import { runStoreCasBatch, storeSnapshots, StoreWriteConflictError } from './store-cas';
import { venueDate, venueTimeFromJson } from './venue-time';

const KEY = 'bd_inventory_snapshots';
type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const same = (a: unknown, b: unknown) => stableJson(a) === stableJson(b);
const physical = (value: Row) => value.scope != null || value.internalId != null || value.status === 'completed'
  || Array.isArray(value.items) && value.items.some(item => row(item).valuationKnown != null);
const failure = (code: string, status = 422, monthKey?: string) => ({ code, status, monthKey });
function months(date: string): string[] {
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  return [date.slice(0, 7), `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}`];
}
function boundarySlot(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  if (value.endsWith('-01')) return value;
  date.setUTCDate(date.getUTCDate() + 1);
  return date.getUTCDate() === 1 ? date.toISOString().slice(0, 10) : null;
}

/** Validate only modified accounting documents; unchanged legacy/physical captures stay untouched. */
export function validateAccountingBoundaryChange(input: { before: unknown; after: unknown; venueId: number; currency: string | null; today: string; closedMonths: Set<string>; reason: unknown }) {
  if (!Array.isArray(input.before) || !Array.isArray(input.after)) return failure('BOUNDARY_ARRAY_REQUIRED');
  const before = input.before.map(row), after = input.after.map(row);
  for (const values of [before, after]) {
    const ids = values.map(value => value.id);
    if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) return failure('BOUNDARY_ID_AMBIGUOUS', 409);
    const dates = values.map(value => boundarySlot(value.date)).filter(Boolean);
    if (new Set(dates).size !== dates.length) return failure('BOUNDARY_DATE_AMBIGUOUS', 409);
  }
  if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 500) return failure('BOUNDARY_REASON_REQUIRED');
  const changed = compareStoreData(before, after);
  for (const mutation of changed) {
    for (const value of [mutation.before, mutation.after]) {
      if (value == null) continue;
      const item = row(value);
      if (physical(item) || item.items != null || item.scope != null || item.internalId != null) return failure('PHYSICAL_INVENTORY_PROTECTED', 409);
      if (Number(item.venueId) !== input.venueId && !(value === mutation.before && (item.venueId == null || item.venueId === 'primary'))) return failure('BOUNDARY_SCOPE_MISMATCH');
      const date = String(item.date ?? '');
      if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])-01$/.test(date) || date > input.today) return failure('BOUNDARY_DATE_INVALID');
      const locked = months(date).find(month => input.closedMonths.has(month));
      if (locked) return failure('MONTH_LOCKED', 423, locked);
    }
    if (mutation.after == null) continue;
    const item = row(mutation.after), sections = row(item.sections), entries = Object.entries(sections);
    const allowedFields = new Set(['id', 'venueId', 'date', 'sections', 'total', 'currency', 'note', 'createdAt', 'updatedAt', 'status']);
    if (Object.entries(item).some(([key, value]) => !allowedFields.has(key) && !same(row(mutation.before)[key], value))) return failure('BOUNDARY_FIELDS_INVALID');
    if (item.currency !== input.currency || !input.currency) return failure('BOUNDARY_CURRENCY_MISMATCH');
    if (!entries.length || entries.length > 50 || entries.some(([name, value]) => !name.trim() || name.length > 120 || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12)) return failure('BOUNDARY_SECTIONS_INVALID');
    const total = Math.round(entries.reduce((sum, [, value]) => sum + Number(value), 0) * 100) / 100;
    if (Object.hasOwn(item, 'total') && (typeof item.total !== 'number' || !Number.isFinite(item.total) || item.total < 0 || Math.round(item.total * 100) !== Math.round(total * 100))) return failure('BOUNDARY_TOTAL_MISMATCH');
    if (typeof item.note !== 'string' || !item.note.trim() || item.note.length > 4000) return failure('BOUNDARY_NOTE_REQUIRED');
    if (item.status != null && item.status !== 'confirmed') return failure('BOUNDARY_STATUS_INVALID');
  }
  return null;
}

export async function writeAccountingBoundaries(account: AuthenticatedAccount, body: { data?: unknown; baseData?: unknown; reason?: string }) {
  const response = (value: unknown, status = 200) => Response.json(value, { status });
  const denied = () => response({ ok: false, code: 'ACCESS_DENIED', error: 'Нет прав на изменение учётных остатков.' }, 403);
  const allowed = (value: AuthenticatedAccount) => ['owner', 'manager', 'shift_manager'].includes(value.role) && hasPermission(value, 'inventory.manage');
  if (!allowed(account)) return denied();
  const database = getD1(), now = new Date().toISOString();
  const accessSql = `SELECT json_object('role',vm.role,'permissions',vm.permissions_json,'workspace',v.workspace_id,'dataAccount',v.data_account_id) FROM venues v JOIN workspaces w ON w.id=v.workspace_id AND w.status='active' JOIN venue_memberships vm ON vm.venue_id=v.id AND vm.account_id=? AND vm.status='active' JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=vm.account_id AND wm.status='active' WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND vm.id=?`;
  const accessArgs = [account.actorAccountId, account.venueId, account.id, account.membershipId];
  const loaded = await database.prepare(`SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=? AND store_key IN (?,?) UNION ALL SELECT '__profile__',restaurant_json,updated_at FROM accounts WHERE id=? UNION ALL SELECT '__access__',(${accessSql}),NULL`).bind(account.id, KEY, 'bd_month_closings', account.id, ...accessArgs).all<{ store_key: string; data_json: string; updated_at: string | null }>();
  const values = loaded.results ?? [], profile = values.find(value => value.store_key === '__profile__'), access = values.find(value => value.store_key === '__access__');
  if (!profile?.data_json || !access?.data_json) return denied();
  let before: unknown, closings: unknown, live: Row;
  const snapshots = storeSnapshots(values, [KEY, 'bd_month_closings']);
  try { before = JSON.parse(snapshots[0].dataJson ?? '[]'); closings = JSON.parse(snapshots[1].dataJson ?? '[]'); live = row(JSON.parse(access.data_json)); } catch { return response({ ok: false, code: 'BOUNDARY_INPUTS_NEED_REVIEW' }, 422); }
  if (!isAccessRole(live.role) || !allowed({ ...account, ...permissionPayload(live.role, typeof live.permissions === 'string' ? live.permissions : null) })) return denied();
  if (same(before, body.data)) return response({ ok: true, data: before, updatedAt: snapshots[0].updatedAt, auditedChanges: 0, mergedConflicts: 0, idempotent: true });
  if (!Object.hasOwn(body, 'baseData') || !same(before, body.baseData ?? [])) return response({ ok: false, code: 'STORE_WRITE_CONFLICT', error: 'Остатки изменились. Загрузите актуальные данные перед сохранением.' }, 409);
  if (!Array.isArray(closings) || closings.some(value => !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(String(row(value).monthKey)) || !['closed', 'reopened'].includes(String(row(value).status)) || row(value).venueId != null && row(value).venueId !== 'primary' && Number(row(value).venueId) !== account.venueId) || new Set(closings.map(value => row(value).monthKey)).size !== closings.length) return response({ ok: false, code: 'BOUNDARY_INPUTS_NEED_REVIEW' }, 422);
  const problem = validateAccountingBoundaryChange({ before, after: body.data, venueId: account.venueId, currency: accountingCurrencyFromRestaurantJson(profile.data_json), today: venueDate(now, venueTimeFromJson(profile.data_json).timezone), closedMonths: new Set(closings.filter(value => row(value).status === 'closed').map(value => String(row(value).monthKey))), reason: body.reason });
  if (problem) return response({ ok: false, ...problem, error: problem.code === 'MONTH_LOCKED' ? 'Затронутый месяц закрыт. Сначала откройте его штатным действием.' : 'Учётные остатки не сохранены. Проверьте дату, суммы, валюту и основание.' }, problem.status);
  const mutations = compareStoreData(before, body.data);
  if (!mutations.length) return response({ ok: true, data: before, updatedAt: snapshots[0].updatedAt, auditedChanges: 0, mergedConflicts: 0, idempotent: true });
  const guard = database.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?,'__bd_accounting_boundary_guard__',NULL,? WHERE NOT (EXISTS(SELECT 1 FROM accounts WHERE id=? AND restaurant_json IS ?) AND (${accessSql}) IS ?)`).bind(account.id, now, account.id, profile.data_json, ...accessArgs, access.data_json);
  const write = database.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(account.id, KEY, JSON.stringify(body.data), now);
  const actorName = [account.firstName, account.lastName].filter(Boolean).join(' ') || account.appEmail;
  const audits = mutations.map(mutation => database.prepare(`INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(account.id, KEY, mutation.action, mutation.entityId, mutation.entityLabel, mutation.monthKey, mutation.before == null ? null : JSON.stringify(mutation.before), mutation.after == null ? null : JSON.stringify(mutation.after), JSON.stringify(mutation.changedFields), actorName, live.role, body.reason!.trim(), now));
  try { await runStoreCasBatch(database, account.id, snapshots, [guard, write, ...audits], now); }
  catch (error) { if (error instanceof StoreWriteConflictError) return response({ ok: false, code: 'STORE_WRITE_CONFLICT', error: 'Данные или доступ изменились. Обновите страницу.' }, 409); throw error; }
  return response({ ok: true, data: body.data, updatedAt: now, auditedChanges: mutations.length, mergedConflicts: 0 });
}
