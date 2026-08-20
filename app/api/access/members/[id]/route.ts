import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { accounts, venueMemberships } from "../../../../../db/schema";
import {
  canManageTarget,
  isAccessRole,
  serializePermissionOverrides,
} from "../../../../../lib/bardoctor/access-control";
import { logAccessChange } from "../../../../../lib/bardoctor/access-service";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../../lib/bardoctor/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const actor = await authenticateRequest(request);
  if (!actor) return unauthorized();
  const { id } = await context.params;
  const membershipId = Number(id);
  if (!Number.isInteger(membershipId) || membershipId <= 0) {
    return Response.json({ ok: false, error: "Некорректный участник" }, { status: 400 });
  }
  const [target] = await getDb()
    .select({
      membership: venueMemberships,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
      email: accounts.appEmail,
    })
    .from(venueMemberships)
    .innerJoin(accounts, eq(venueMemberships.accountId, accounts.id))
    .where(
      and(
        eq(venueMemberships.id, membershipId),
        eq(venueMemberships.venueId, actor.venueId),
      ),
    )
    .limit(1);
  if (!target || !canManageTarget(actor, target.membership)) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Вы не можете изменить права этого участника" },
      { status: 403 },
    );
  }

  const parsed = await readJsonRequest<{
    role?: unknown;
    permissions?: unknown;
    status?: unknown;
    employeeId?: unknown;
  }>(request, { maxBytes: 128 * 1024 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const nextRole = body.role === undefined ? target.membership.role : body.role;
  if (!isAccessRole(nextRole) || nextRole === "owner") {
    return Response.json({ ok: false, error: "Некорректная роль" }, { status: 400 });
  }
  if (actor.role !== "owner" && nextRole !== "shift_manager") {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Роль управляющего меняет только владелец" },
      { status: 403 },
    );
  }
  const nextStatus = body.status === undefined ? target.membership.status : body.status;
  if (nextStatus !== "active" && nextStatus !== "disabled") {
    return Response.json({ ok: false, error: "Некорректный статус доступа" }, { status: 400 });
  }
  const permissionsJson = actor.role === "owner" && body.permissions !== undefined
    ? serializePermissionOverrides(nextRole, body.permissions)
    : target.membership.permissionsJson;
  const employeeId = body.employeeId === undefined
    ? target.membership.employeeId
    : typeof body.employeeId === "string" && body.employeeId.trim()
      ? body.employeeId.trim().slice(0, 120)
      : null;
  const updatedAt = new Date().toISOString();
  await getDb()
    .update(venueMemberships)
    .set({
      role: nextRole,
      permissionsJson,
      status: nextStatus,
      employeeId,
      updatedAt,
    })
    .where(eq(venueMemberships.id, membershipId));

  const label = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.email;
  await logAccessChange({
    actor,
    action: "update",
    entityId: String(membershipId),
    entityLabel: label,
    before: {
      role: target.membership.role,
      permissionsJson: target.membership.permissionsJson,
      status: target.membership.status,
    },
    after: { role: nextRole, permissionsJson, status: nextStatus },
    reason: nextStatus === "disabled"
      ? "Доступ сотрудника отключён"
      : "Обновлены роль и права сотрудника",
  });
  return Response.json({ ok: true });
}
