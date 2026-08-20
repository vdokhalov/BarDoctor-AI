import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { venueInvites } from "../../../../../db/schema";
import { hasPermission } from "../../../../../lib/bardoctor/access-control";
import {
  logAccessChange,
  revokeInvite,
} from "../../../../../lib/bardoctor/access-service";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const actor = await authenticateRequest(request);
  if (!actor) return unauthorized();
  if (actor.role !== "owner" && !hasPermission(actor, "access.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав" },
      { status: 403 },
    );
  }
  const { id } = await context.params;
  const inviteId = Number(id);
  const [invite] = await getDb()
    .select()
    .from(venueInvites)
    .where(
      and(
        eq(venueInvites.id, inviteId),
        eq(venueInvites.venueId, actor.venueId),
      ),
    )
    .limit(1);
  if (!invite) {
    return Response.json({ ok: false, error: "Приглашение не найдено" }, { status: 404 });
  }
  if (actor.role !== "owner" && invite.role !== "shift_manager") {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Приглашение управляющего отменяет владелец" },
      { status: 403 },
    );
  }
  const revoked = await revokeInvite(inviteId, actor.venueId);
  if (!revoked) {
    return Response.json(
      { ok: false, error: "Приглашение уже использовано или отменено" },
      { status: 409 },
    );
  }
  await logAccessChange({
    actor,
    action: "delete",
    entityId: String(inviteId),
    entityLabel: invite.role === "manager" ? "Приглашение управляющего" : "Приглашение менеджера",
    before: { role: invite.role, expiresAt: invite.expiresAt },
    reason: "Код приглашения отозван",
  });
  return Response.json({ ok: true });
}

