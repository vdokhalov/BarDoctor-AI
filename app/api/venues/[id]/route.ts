import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { venueMemberships, venues } from "../../../../db/schema";
import {
  authenticateIdentityRequest,
  authenticateRequest,
  unauthorized,
} from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const [actor, identity] = await Promise.all([
    authenticateRequest(request),
    authenticateIdentityRequest(request),
  ]);
  if (!actor || !identity) return unauthorized();
  const parsed = await readJsonRequest<{ status?: unknown }>(request, { maxBytes: 16 * 1024 });
  if (!parsed.ok) return parsed.response;
  if (parsed.data.status !== "archived") {
    return Response.json(
      { ok: false, error: "Поддерживается только безопасная архивация" },
      { status: 400 },
    );
  }
  const { id } = await context.params;
  const venueId = Number(id);
  if (!Number.isInteger(venueId) || venueId <= 0) {
    return Response.json({ ok: false, error: "Некорректное заведение" }, { status: 400 });
  }
  if (venueId === actor.venueId) {
    return Response.json(
      { ok: false, error: "Сначала переключитесь на другое заведение" },
      { status: 409 },
    );
  }
  const [membership] = await getDb()
    .select({ id: venueMemberships.id })
    .from(venueMemberships)
    .innerJoin(venues, eq(venues.id, venueMemberships.venueId))
    .where(
      and(
        eq(venueMemberships.venueId, venueId),
        eq(venueMemberships.accountId, identity.id),
        eq(venueMemberships.role, "owner"),
        eq(venueMemberships.status, "active"),
        eq(venues.status, "active"),
      ),
    )
    .limit(1);
  if (!membership) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Архивировать заведение может только его владелец" },
      { status: 403 },
    );
  }

  await getDb()
    .update(venues)
    .set({ status: "archived", updatedAt: new Date().toISOString() })
    .where(eq(venues.id, venueId));
  return Response.json({ ok: true, venueId, status: "archived", deleted: false });
}
