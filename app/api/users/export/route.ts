import {
  authenticateIdentityRequest,
  membershipsForAccount,
  unauthorized,
} from "../../../../lib/bardoctor/auth";

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

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const memberships = await membershipsForAccount(account);
  const payload = {
    exportedAt: new Date().toISOString(),
    scope: "personal-account-data",
    account: {
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.appEmail,
      phone: account.phone,
      avatarId: account.avatarId,
      registeredAt: account.createdAt,
    },
    venueAccess: memberships.map((item) => ({
      venueId: item.venue.id,
      venueName: venueName(item.dataAccount.restaurantJson),
      role: item.role,
      permissions: item.permissions,
      joinedAt: item.membership.joinedAt,
    })),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="bardoctor-personal-data.json"',
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
