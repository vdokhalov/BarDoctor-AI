import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accounts, auditLog } from "../../../db/schema";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { compareStoreData } from "../../../lib/bardoctor/data-trust";
import { venueProfileFromInput } from "../../../lib/bardoctor/venue-profile";

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

  const restaurant = venueProfileFromInput(body);

  const db = getDb();
  const before = account.restaurantJson ? JSON.parse(account.restaurantJson) : null;
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

  return Response.json({ ok: true });
}
