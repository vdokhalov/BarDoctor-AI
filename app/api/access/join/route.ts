import {
  authenticateIdentityRequest,
  rememberActiveVenueForRequest,
  unauthorized,
  venueContextForAccount,
} from "../../../../lib/bardoctor/auth";
import { claimVenueInvite } from "../../../../lib/bardoctor/access-service";
import { readJsonRequest } from "../../../../lib/bardoctor/http";

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const parsed = await readJsonRequest<{ code?: string }>(request, { maxBytes: 16 * 1024 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.code?.trim()) {
    return Response.json({ ok: false, error: "Введите код приглашения" }, { status: 400 });
  }
  const membership = await claimVenueInvite(account, body.code);
  if (!membership) {
    return Response.json(
      { ok: false, error: "Код недействителен, уже использован или доступ уже подключён" },
      { status: 400 },
    );
  }
  const context = await venueContextForAccount(account, membership.venueId);
  if (!context) {
    return Response.json(
      { ok: false, error: "Доступ создан, но заведение пока недоступно" },
      { status: 409 },
    );
  }
  await rememberActiveVenueForRequest(request, account.id, membership.venueId);
  return Response.json({
    ok: true,
    activeVenueId: membership.venueId,
    role: membership.role,
    permissions: context.permissions,
    activeWorkspaceId: context.venue.workspaceId,
    activeVenueIsPrimary: context.venue.dataAccountId === account.id,
    message: "Заведение подключено к вашему аккаунту",
  });
}
