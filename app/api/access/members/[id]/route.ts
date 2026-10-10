import { membershipWithJobTitle, setMemberJob } from "../../../../../lib/bardoctor/staff-job-storage";
import { and, eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../../db";
import { accounts, venueMemberships } from "../../../../../db/schema";
import {
  canManageTarget,
  isAccessRole,
  serializePermissionOverrides,
} from "../../../../../lib/bardoctor/access-control";
import { logAccessChange } from "../../../../../lib/bardoctor/access-service";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../../lib/bardoctor/http";
import { staffJobTitle, validStaffJobTitle } from "../../../../../lib/bardoctor/staff-job-title";

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
      membership: membershipWithJobTitle,
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
    jobTitle?: unknown;
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
  const requestedJobTitle = body.jobTitle === undefined
    ? nextRole === target.membership.role ? target.membership.jobTitle : null
    : body.jobTitle;
  if (!validStaffJobTitle(nextRole, requestedJobTitle)) {
    return Response.json({ ok: false, code: "STAFF_JOB_TITLE_INVALID", error: "Выберите должность сотрудника кассы" }, { status: 400 });
  }
  const jobTitle = staffJobTitle(nextRole, requestedJobTitle);
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
  const db = getD1();
  await db.batch([
    db.prepare(`UPDATE venue_memberships SET role=?,permissions_json=?,status=?,employee_id=?,updated_at=? WHERE id=? AND venue_id=?`)
      .bind(nextRole,permissionsJson,nextStatus,employeeId,updatedAt,membershipId,actor.venueId),
    setMemberJob(db,target.membership.accountId,actor.venueId,jobTitle,updatedAt),
  ]);

  const label = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.email;
  await logAccessChange({
    actor,
    action: "update",
    entityId: String(membershipId),
    entityLabel: label,
    before: {
      role: target.membership.role,
      jobTitle: target.membership.jobTitle,
      permissionsJson: target.membership.permissionsJson,
      status: target.membership.status,
    },
    after: { role: nextRole, jobTitle, permissionsJson, status: nextStatus },
    reason: nextStatus === "disabled"
      ? "Доступ сотрудника отключён"
      : "Обновлены роль и права сотрудника",
  });
  return Response.json({ ok: true });
}
