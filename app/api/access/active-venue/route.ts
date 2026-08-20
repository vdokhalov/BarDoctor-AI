import {
  authenticateIdentityRequest,
  rememberActiveVenueForRequest,
  unauthorized,
  venueContextForAccount,
} from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";

function venueName(value: string | null): string {
  if (!value) return "Новое заведение";
  try {
    const profile = JSON.parse(value) as { name?: unknown };
    return typeof profile.name === "string" && profile.name.trim()
      ? profile.name.trim()
      : "Новое заведение";
  } catch {
    return "Новое заведение";
  }
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const parsed = await readJsonRequest<{ venueId?: number }>(request, { maxBytes: 16 * 1024 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const venueId = Number(body.venueId);
  if (!Number.isInteger(venueId) || venueId <= 0) {
    return Response.json({ ok: false, error: "Некорректное заведение" }, { status: 400 });
  }
  const context = await venueContextForAccount(account, venueId);
  if (!context) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Доступ к заведению отключён" },
      { status: 403 },
    );
  }
  await rememberActiveVenueForRequest(request, account.id, venueId);
  return Response.json({
    ok: true,
    activeVenueId: venueId,
    activeWorkspaceId: context.venue.workspaceId,
    activeVenueIsPrimary: context.venue.dataAccountId === account.id,
    venueName: venueName(context.dataAccount.restaurantJson),
    role: context.role,
    permissions: context.permissions,
  });
}
