import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  accounts,
  venueInvites,
  venueMemberships,
} from "../../../db/schema";
import {
  ACCESS_ROLES,
  defaultPermissionsFor,
  hasPermission,
  isAccessRole,
  parsePermissionOverrides,
  PERMISSION_DEFINITIONS,
  permissionsFor,
  type AccessRole,
} from "../../../lib/bardoctor/access-control";
import {
  createVenueInvite,
  INVITE_LIFETIME_HOURS,
  logAccessChange,
} from "../../../lib/bardoctor/access-service";
import {
  authenticateIdentityRequest,
  authenticateRequest,
  membershipsForAccount,
  unauthorized,
} from "../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../lib/bardoctor/http";

function restaurantName(value: string | null): string {
  if (!value) return "Новое заведение";
  try {
    const parsed = JSON.parse(value) as { name?: unknown };
    return typeof parsed.name === "string" && parsed.name.trim()
      ? parsed.name.trim()
      : "Новое заведение";
  } catch {
    return "Новое заведение";
  }
}

export async function GET(request: Request): Promise<Response> {
  const [actor, identity] = await Promise.all([
    authenticateRequest(request),
    authenticateIdentityRequest(request),
  ]);
  if (!actor || !identity) return unauthorized();

  const canManageAccess = actor.role === "owner" || hasPermission(actor, "access.manage");
  const memberFilter = canManageAccess
    ? eq(venueMemberships.venueId, actor.venueId)
    : and(
      eq(venueMemberships.venueId, actor.venueId),
      eq(venueMemberships.accountId, actor.actorAccountId),
    );
  const members = await getDb()
    .select({
      membership: venueMemberships,
      account: {
        id: accounts.id,
        firstName: accounts.firstName,
        lastName: accounts.lastName,
        appEmail: accounts.appEmail,
        phone: accounts.phone,
      },
    })
    .from(venueMemberships)
    .innerJoin(accounts, eq(venueMemberships.accountId, accounts.id))
    .where(memberFilter)
    .orderBy(venueMemberships.createdAt);
  const activeInvites = canManageAccess
    ? await getDb()
      .select({
        id: venueInvites.id,
        role: venueInvites.role,
        permissionsJson: venueInvites.permissionsJson,
        expiresAt: venueInvites.expiresAt,
        createdAt: venueInvites.createdAt,
      })
      .from(venueInvites)
      .where(
        and(
          eq(venueInvites.venueId, actor.venueId),
          isNull(venueInvites.usedAt),
          isNull(venueInvites.revokedAt),
          gt(venueInvites.expiresAt, new Date().toISOString()),
        ),
      )
      .orderBy(desc(venueInvites.createdAt))
    : [];
  const myVenues = await membershipsForAccount(identity);

  return Response.json({
    ok: true,
    venue: {
      id: actor.venueId,
      name: restaurantName(actor.restaurantJson),
      workspaceId: myVenues.find((item) => item.venue.id === actor.venueId)?.venue.workspaceId ?? null,
      isPrimary: myVenues.find((item) => item.venue.id === actor.venueId)?.venue.dataAccountId === identity.id,
    },
    current: {
      membershipId: actor.membershipId,
      role: actor.role,
      permissions: actor.permissions,
    },
    canManageAccess,
    canEditPermissions: actor.role === "owner",
    members: members.map(({ membership, account }) => {
      const role = isAccessRole(membership.role) ? membership.role : "shift_manager";
      return {
        id: membership.id,
        accountId: account.id,
        name: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
        email: account.appEmail,
        phone: account.phone,
        role,
        status: membership.status,
        employeeId: membership.employeeId,
        joinedAt: membership.joinedAt,
        permissions: permissionsFor(role, membership.permissionsJson),
        overrides: parsePermissionOverrides(membership.permissionsJson),
        isCurrent: membership.id === actor.membershipId,
      };
    }),
    invites: activeInvites.map((invite) => {
      const role = isAccessRole(invite.role) ? invite.role : "shift_manager";
      return {
        id: invite.id,
        role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        permissions: permissionsFor(role, invite.permissionsJson),
      };
    }),
    myVenues: myVenues.map((item) => ({
      id: item.venue.id,
      workspaceId: item.venue.workspaceId,
      name: restaurantName(item.dataAccount.restaurantJson),
      role: item.role,
      permissions: item.permissions,
      status: item.venue.status,
      isPrimary: item.venue.dataAccountId === identity.id,
      active: item.venue.id === actor.venueId,
    })),
    canCreateVenues: actor.role === "owner",
    roles: ACCESS_ROLES.map((role) => ({
      role,
      permissions: defaultPermissionsFor(role),
    })),
    permissionDefinitions: PERMISSION_DEFINITIONS,
    inviteLifetimeHours: INVITE_LIFETIME_HOURS,
  });
}

export async function POST(request: Request): Promise<Response> {
  const actor = await authenticateRequest(request);
  if (!actor) return unauthorized();
  if (actor.role !== "owner" && !hasPermission(actor, "access.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Только владелец может создавать приглашения" },
      { status: 403 },
    );
  }
  const parsed = await readJsonRequest<{ role?: unknown; permissions?: unknown }>(request, {
    maxBytes: 128 * 1024,
  });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const role = body.role;
  if (!isAccessRole(role) || role === "owner") {
    return Response.json(
      { ok: false, error: "Выберите роль «Управляющий» или «Менеджер»" },
      { status: 400 },
    );
  }
  if (actor.role !== "owner" && role !== "shift_manager") {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Управляющего может пригласить только владелец" },
      { status: 403 },
    );
  }

  const created = await createVenueInvite({
    actor,
    role: role as AccessRole,
    permissions: actor.role === "owner" ? body.permissions : undefined,
  });
  await logAccessChange({
    actor,
    action: "create",
    entityId: String(created.invite.id),
    entityLabel: role === "manager" ? "Приглашение управляющего" : "Приглашение менеджера",
    after: { role, expiresAt: created.invite.expiresAt },
    reason: "Создан одноразовый код приглашения",
  });
  const origin = new URL(request.url).origin;
  return Response.json({
    ok: true,
    invite: {
      id: created.invite.id,
      code: created.code,
      role,
      expiresAt: created.invite.expiresAt,
      joinUrl: `${origin}/join?code=${encodeURIComponent(created.code)}`,
    },
  }, { status: 201 });
}
