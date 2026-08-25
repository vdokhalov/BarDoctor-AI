import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { accounts } from "../../../../db/schema";
import {
  authenticateIdentityRequest,
  authenticateRequest,
  membershipsForAccount,
  unauthorized,
} from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";

export async function GET(request: Request): Promise<Response> {
  const [account, actor] = await Promise.all([
    authenticateIdentityRequest(request),
    authenticateRequest(request),
  ]);
  if (!account || !actor) return unauthorized();
  const memberships = await membershipsForAccount(account);

  return Response.json({
    ok: true,
    user: {
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.appEmail,
      phone: account.phone,
      avatarId: account.avatarId,
      auth: {
        method: account.passwordHash ? "password" : "identity",
        canChangePassword: Boolean(account.passwordHash && account.chatgptEmail),
      },
      role: actor.role,
      permissions: actor.permissions,
      activeVenueId: actor.venueId,
      activeWorkspaceId: memberships.find((item) => item.venue.id === actor.venueId)?.venue.workspaceId ?? null,
      activeVenueIsPrimary: actor.id === account.id,
      canCreateVenues: actor.role === "owner",
      venues: memberships.map((item) => ({
        id: item.venue.id,
        workspaceId: item.venue.workspaceId,
        role: item.role,
        permissions: item.permissions,
        status: item.venue.status,
        isPrimary: item.venue.dataAccountId === account.id,
        name: (() => {
          try {
            const profile = item.dataAccount.restaurantJson
              ? JSON.parse(item.dataAccount.restaurantJson) as { name?: unknown }
              : null;
            return typeof profile?.name === "string" && profile.name.trim()
              ? profile.name.trim()
              : "Новое заведение";
          } catch {
            return "Новое заведение";
          }
        })(),
      })),
    },
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();

  const parsed = await readJsonRequest<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>(request, { maxBytes: 64 * 1024 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const update: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (body.firstName !== undefined) update.firstName = body.firstName.trim();
  if (body.lastName !== undefined) update.lastName = body.lastName.trim() || null;
  if (body.phone !== undefined) update.phone = body.phone.trim() || null;

  await getDb().update(accounts).set(update).where(eq(accounts.id, account.id));
  return Response.json({ ok: true });
}
