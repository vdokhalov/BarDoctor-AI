import { getD1 } from "../../../db";
import { authenticateReadOnlyRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { canManagePosPrivilegedAction, hasPermission, isAccessRole, permissionsFor } from "../../../lib/bardoctor/access-control";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { venueTimeFromJson } from "../../../lib/bardoctor/venue-time";
import { staffJobTitle, validStaffJobTitle } from "../../../lib/bardoctor/staff-job-title";
import { SALES_EVENT_STORE_KEY, type SalesEventContext } from "../../../lib/bardoctor/sales-events";
import { POS_ORDER_STORE_KEY } from "../../../lib/bardoctor/pos-orders";
import { buildPosLiveOverview, type PosOverviewMember } from "../../../lib/bardoctor/pos-live-overview";

const STORE_KEYS = [POS_ORDER_STORE_KEY, SALES_EVENT_STORE_KEY, "bd_finance_revenue", "bd_assortment_v1"];
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
function needsReview(): never { throw new Error("POS_OVERVIEW_STORE_NEEDS_REVIEW"); }

/** A single read-only transaction observes the orders, paid facts and active roster together. */
export async function GET(request: Request): Promise<Response> {
  try {
    const account = await authenticateReadOnlyRequest(request); if (!account) return unauthorized();
    if (!canManagePosPrivilegedAction(account) || !hasPermission(account, "sales.view")) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
    const query = new URL(request.url).searchParams, shiftId = query.get("shiftId");
    if (!shiftId || shiftId !== shiftId.trim() || shiftId.length > 160) return reply({ ok: false, code: "POS_OVERVIEW_SHIFT_REQUIRED", error: "Выберите кассовую смену." }, 400);
    if (query.has("venueId") && query.get("venueId") !== String(account.venueId)) return reply({ ok: false, code: "VENUE_CHANGED" }, 403);
    const database = getD1();
    const results = await database.batch<Record<string, unknown>>([
      database.prepare("SELECT store_key,data_json FROM domain_data WHERE account_id=? AND store_key IN (?,?,?,?)").bind(account.id, ...STORE_KEYS),
      database.prepare(`SELECT vm.id AS membershipId, vm.account_id AS accountId, a.first_name AS firstName, a.last_name AS lastName,
        vm.role, vm.job_title AS jobTitle, vm.permissions_json AS permissionsJson
        FROM venue_memberships vm JOIN accounts a ON a.id=vm.account_id
        JOIN venues v ON v.id=vm.venue_id
        JOIN workspace_memberships wm ON wm.workspace_id=v.workspace_id AND wm.account_id=vm.account_id
        JOIN workspaces w ON w.id=v.workspace_id
        WHERE vm.venue_id=? AND v.data_account_id=? AND vm.status='active' AND a.account_kind='user'
          AND v.status='active' AND wm.status='active' AND w.status='active'
        ORDER BY vm.account_id`).bind(account.venueId, account.id),
    ]);
    if (results.length !== 2 || results.some(result => result.success !== true || !Array.isArray(result.results))) throw new Error("POS_OVERVIEW_UNAVAILABLE");
    const roster = results[1].results!;
    const current = roster.find(member => member.membershipId === account.membershipId && member.accountId === account.actorAccountId);
    if (!current || !isAccessRole(current.role) || !canManagePosPrivilegedAction({ role: current.role })
      || !hasPermission({ role: current.role, permissions: permissionsFor(current.role, typeof current.permissionsJson === "string" ? current.permissionsJson : null) }, "sales.view")) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
    const members: PosOverviewMember[] = roster.map(member => {
      if (!Number.isSafeInteger(member.accountId) || Number(member.accountId) <= 0 || typeof member.firstName !== "string"
        || member.lastName != null && typeof member.lastName !== "string" || !isAccessRole(member.role) || !validStaffJobTitle(member.role, member.jobTitle)) throw new Error("POS_OVERVIEW_ROSTER_NEEDS_REVIEW");
      return { accountId: Number(member.accountId), name: [member.firstName, member.lastName].filter(Boolean).join(" "), role: member.role,
        jobTitle: staffJobTitle(member.role, member.jobTitle) };
    });
    const stores = new Map<string, unknown>();
    for (const item of results[0].results!) {
      if (typeof item.store_key !== "string" || typeof item.data_json !== "string" || stores.has(item.store_key)) needsReview();
      stores.set(item.store_key, JSON.parse(item.data_json));
    }
    const valueOrAbsent = (key: string, fallback: unknown) => stores.has(key) ? stores.get(key) : fallback;
    const rows = (key: string) => { const value = valueOrAbsent(key, []); if (!Array.isArray(value) || value.some(item => !record(item))) needsReview(); return value; };
    const assortment = valueOrAbsent("bd_assortment_v1", {}); if (!record(assortment)) needsReview();
    if ("menuItems" in assortment && (!Array.isArray(assortment.menuItems) || assortment.menuItems.some(item => !record(item)))) needsReview();
    const events = rows(SALES_EVENT_STORE_KEY);
    if (events.some(event => typeof event.id !== "string" || !event.id || typeof event.fingerprint !== "string" || !record(event.batch)
      || !Array.isArray(event.prices) || event.prices.some((price: unknown) => !record(price)) || !Array.isArray(event.originalMovements)
      || typeof event.acceptedAt !== "string" || !Number.isFinite(Date.parse(event.acceptedAt)) || !["POSTED", "REVERSED"].includes(event.status))) needsReview();
    const context: SalesEventContext = { ...venueTimeFromJson(account.restaurantJson), venueId: account.venueId, currency: accountingCurrencyFromRestaurantJson(account.restaurantJson) || "",
      now: new Date().toISOString(), actor: { accountId: account.actorAccountId, name: [account.firstName, account.lastName].filter(Boolean).join(" "), role: current.role },
      assortment: { menuItems: assortment.menuItems ?? [] }, events, revenues: rows("bd_finance_revenue"), movements: [], mappings: [], warehouseRoutes: [], warehouses: [], closedMonths: new Set() };
    return reply({ ok: true, ...buildPosLiveOverview(context, rows(POS_ORDER_STORE_KEY), members, shiftId) });
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ ok: false, code: "POS_OVERVIEW_STORE_NEEDS_REVIEW", error: "Данные смены требуют проверки. Итоги не рассчитаны." }, 409);
    if (error instanceof Error && error.message === "POS_OVERVIEW_SHIFT_NOT_FOUND") return reply({ ok: false, code: error.message, error: "Кассовая смена не найдена в выбранном заведении." }, 404);
    if (error instanceof Error && /^(POS_OVERVIEW_|POS_ORDER_|POS_DISCOUNT_|SALES_EVENT_)/.test(error.message) && error.message !== "POS_OVERVIEW_UNAVAILABLE") {
      return reply({ ok: false, code: error.message, error: "Данные смены требуют проверки. Итоги не рассчитаны." }, error.message.endsWith("ACCESS_DENIED") ? 403 : 409);
    }
    return reply({ ok: false, code: "POS_OVERVIEW_UNAVAILABLE", error: "Не удалось прочитать актуальные данные. Обновите обзор." }, 503);
  }
}
