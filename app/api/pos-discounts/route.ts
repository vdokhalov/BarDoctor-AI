import { getD1 } from "../../../db";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { POS_DISCOUNT_STORE_KEY, canConfigurePosDiscounts, canApplyPosDiscounts, parsePosDiscountRules, planPosDiscountRule, posDiscountRuleView, type PosDiscountRuleCommand } from "../../../lib/bardoctor/pos-discounts";

const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
async function load(account: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const db = getD1(), snapshots = await readStoreSnapshots(db, account.id, [POS_DISCOUNT_STORE_KEY]);
  if (snapshots[0].dataJson != null && JSON.parse(snapshots[0].dataJson) === null) throw new Error("POS_DISCOUNT_STORE_NEEDS_REVIEW");
  const rules = parsePosDiscountRules(snapshots[0].dataJson == null ? null : JSON.parse(snapshots[0].dataJson));
  const context = { venueId: account.venueId, currency: accountingCurrencyFromRestaurantJson(account.restaurantJson) || "", now: new Date().toISOString(),
    actor: { accountId: account.actorAccountId, name: [account.firstName, account.lastName].filter(Boolean).join(" "), role: account.role, ...(account.jobTitle ? { jobTitle: account.jobTitle } : {}) } };
  return { db, snapshots, rules, context };
}
function controlled(error: unknown): Response {
  if (error instanceof SyntaxError) return reply({ ok: false, code: "POS_DISCOUNT_STORE_NEEDS_REVIEW", error: "Правила скидок требуют проверки. Ничего не изменено." }, 409);
  if (error instanceof Error && error.message.startsWith("POS_DISCOUNT_")) {
    const denied = error.message.endsWith("ACCESS_DENIED");
    return reply({ ok: false, code: error.message, error: denied ? "Настройка скидок доступна только владельцу и управляющему."
      : error.message === "POS_DISCOUNT_REVISION_CONFLICT" ? "Правило изменено на другом устройстве. Обновите его перед сохранением."
      : "Проверьте название, значение и валюту скидки. Процент должен быть от 0 до 100, сумма неотрицательной, с точностью до двух знаков." }, denied ? 403 : 409);
  }
  throw error;
}
export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  if (!hasPermission(account, "sales.view") || !canApplyPosDiscounts(account)) return reply({ ok: false, code: "ACCESS_DENIED", error: "Скидки доступны только руководству." }, 403);
  try {
    const { rules, context } = await load(account), configure = canConfigurePosDiscounts(account);
    return reply({ ok: true, venueId: account.venueId, currency: context.currency,
      rules: rules.filter(rule => rule.venueId === account.venueId && (configure || rule.active)).map(posDiscountRuleView),
      permissions: { configure, apply: hasPermission(account, "sales.create") && canApplyPosDiscounts(account) } });
  } catch (error) { return controlled(error); }
}
export async function POST(request: Request): Promise<Response> { return withStoreCasRetries(request, command); }
async function command(request: Request): Promise<Response> {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  if (!canConfigurePosDiscounts(account) || !hasPermission(account, "sales.create")) return reply({ ok: false, code: "ACCESS_DENIED", error: "Настройка скидок доступна только владельцу и управляющему." }, 403);
  const parsed = await readJsonRequest<PosDiscountRuleCommand & { venueId: number }>(request, { maxBytes: 20_000 });
  if (!parsed.ok) return parsed.response;
  if (parsed.data.venueId !== account.venueId) return reply({ ok: false, code: "VENUE_CHANGED" }, 409);
  try {
    const { db, snapshots, rules, context } = await load(account), plan = await planPosDiscountRule(context, rules, parsed.data);
    const result = { ok: true, duplicate: plan.duplicate, rule: posDiscountRuleView(plan.rule), rules: plan.rules.filter(rule => rule.venueId === account.venueId).map(posDiscountRuleView) };
    if (plan.duplicate) return reply(result);
    const statements = [db.prepare(`INSERT INTO domain_data (account_id,store_key,data_json,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(account.id, POS_DISCOUNT_STORE_KEY, JSON.stringify(plan.rules), context.now),
      db.prepare(`INSERT INTO audit_log (account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at)
      VALUES (?,?,?,?,?,NULL,?,?,?,?,?,?,?)`).bind(account.id, POS_DISCOUNT_STORE_KEY, "save_discount_rule", plan.rule.id, plan.rule.name,
        JSON.stringify(rules.find(rule => rule.id === plan.rule.id) ?? null), JSON.stringify(plan.rule), '["name","kind","value","active","revision"]', context.actor.name, context.actor.role, "Настройка правила скидки", context.now)];
    await runStoreCasBatch(db, account.id, snapshots, statements, context.now);
    return reply(result, 201);
  } catch (error) { return controlled(error); }
}
