import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../db";
import { accounts, auditLog } from "../../../db/schema";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { compareStoreData } from "../../../lib/bardoctor/data-trust";
import { venueProfileFromInput } from "../../../lib/bardoctor/venue-profile";
import { normalizeAccountingCurrency } from "../../../lib/bardoctor/currency";

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "settings.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Изменять профиль заведения может владелец или управляющий" },
      { status: 403 },
    );
  }

  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 512 * 1024 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ ok: false, error: "Укажите название заведения" }, { status: 400 });
  }

  const db = getDb();
  const before = account.restaurantJson ? JSON.parse(account.restaurantJson) : null;
  const previousCurrency = normalizeAccountingCurrency(before?.currency);
  const requestedCurrency = body.currency === undefined
    ? previousCurrency
    : normalizeAccountingCurrency(body.currency);
  if (body.currency !== undefined && !requestedCurrency) {
    return Response.json(
      { ok: false, code: "INVALID_ACCOUNTING_CURRENCY", error: "Выберите поддерживаемую валюту учёта" },
      { status: 400 },
    );
  }
  if (previousCurrency && requestedCurrency && previousCurrency !== requestedCurrency) {
    const rows = await getD1().prepare(`
      SELECT store_key, data_json
      FROM domain_data
      WHERE account_id = ?
        AND store_key IN ('bd_purchase_documents', 'bd_finance_expenses', 'bd_stock_movements', 'bd_sales_batches', 'bd_payroll')
    `).bind(account.id).all<{ store_key: string; data_json: string }>();
    const hasFinancialHistory = (rows.results ?? []).some((row) => {
      try {
        const parsed = JSON.parse(row.data_json) as unknown;
        return Array.isArray(parsed)
          ? parsed.length > 0
          : Boolean(parsed && typeof parsed === "object" && Object.keys(parsed as object).length > 0);
      } catch {
        return Boolean(row.data_json?.trim());
      }
    });
    if (hasFinancialHistory) {
      return Response.json({
        ok: false,
        code: "ACCOUNTING_CURRENCY_CHANGE_REQUIRES_PLAN",
        error: "Валюта учёта не изменена: для заведения с финансовой историей нужен отдельный план перехода с effective date и проверкой исторических сумм.",
        previousCurrency,
        requestedCurrency,
      }, { status: 409 });
    }
  }
  const restaurant = venueProfileFromInput({
    ...body,
    currency: requestedCurrency ?? "",
    trackingStartDate:
      before?.trackingStartDate
      ?? body.trackingStartDate
      ?? new Date().toISOString().slice(0, 10),
  });
  const mutations = compareStoreData(before, restaurant);
  const updatedAt = new Date().toISOString();
  await db
    .update(accounts)
    .set({ restaurantJson: JSON.stringify(restaurant), updatedAt })
    .where(eq(accounts.id, account.id));

  if (mutations.length > 0) {
    const actorName =
      [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail;
    await db.insert(auditLog).values({
      accountId: account.id,
      storeKey: "restaurant_profile",
      action: before == null ? "create" : "update",
      entityId: "active",
      entityLabel: name,
      monthKey: null,
      beforeJson: before == null ? null : JSON.stringify(before),
      afterJson: JSON.stringify(restaurant),
      changedFieldsJson: JSON.stringify(mutations[0]?.changedFields ?? []),
      actorName,
      actorRole: account.role,
      reason: before == null ? "Создан профиль заведения" : "Обновлён профиль заведения",
      createdAt: updatedAt,
    });
  }

  return Response.json({ ok: true, restaurant });
}
