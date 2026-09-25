import {
  authenticateIdentityRequest,
  authenticateRequest,
  membershipsForAccount,
  rememberActiveVenueForRequest,
  unauthorized,
} from "../../../lib/bardoctor/auth";
import { permissionsFor } from "../../../lib/bardoctor/access-control";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { createVenueForOwner } from "../../../lib/bardoctor/venue-service";
import { canonicalVenueTimezone, venueDate } from "../../../lib/bardoctor/venue-time";
import { venueProfileFromInput } from "../../../lib/bardoctor/venue-profile";
import { normalizeAccountingCurrency } from "../../../lib/bardoctor/currency";
import { venueIdentityFromJson } from "../../../lib/bardoctor/venue-identity";
import { ownedLifecycleVenues } from "../../../lib/bardoctor/account-lifecycle";

function venueCurrency(value: string | null): string | null {
  if (!value) return null;
  try {
    const profile = JSON.parse(value) as { currency?: unknown };
    return normalizeAccountingCurrency(profile.currency);
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const [actor, identity] = await Promise.all([
    authenticateRequest(request),
    authenticateIdentityRequest(request),
  ]);
  if (!identity) return unauthorized();
  const memberships = await membershipsForAccount(identity);
  return Response.json({
    ok: true,
    activeVenueId: actor?.venueId ?? null,
    canCreateVenues: actor?.role === "owner" || memberships.length === 0 || (await ownedLifecycleVenues(identity.id)).length > 0,
    venues: memberships.map((item) => {
      const venueIdentity = venueIdentityFromJson(item.dataAccount.restaurantJson);
      return {
        id: item.venue.id,
        workspaceId: item.venue.workspaceId,
        name: venueIdentity.name,
        logoId: venueIdentity.logoId,
        currency: venueCurrency(item.dataAccount.restaurantJson),
        role: item.role,
        permissions: item.permissions,
        status: item.venue.status,
        isPrimary: item.venue.dataAccountId === identity.id,
        active: item.venue.id === actor?.venueId,
      };
    }),
  });
}

export async function POST(request: Request): Promise<Response> {
  const identity = await authenticateIdentityRequest(request);
  if (!identity) return unauthorized();
  const memberships = await membershipsForAccount(identity);
  const mayCreate = memberships.length === 0 || memberships.some(item => item.role === "owner") || (await ownedLifecycleVenues(identity.id)).length > 0;
  if (!mayCreate) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Новое заведение может создать только владелец" },
      { status: 403 },
    );
  }
  const actor = { ...identity, actorAccountId: identity.id, venueId: memberships.find(item => item.role === "owner")?.venue.id ?? 0, workspaceId: 0, role: "owner" as const, permissions: permissionsFor("owner") };
  const parsed = await readJsonRequest<Record<string, unknown>>(request, {
    maxBytes: 512 * 1024,
  });
  if (!parsed.ok) return parsed.response;
  if (parsed.data.timezone !== undefined && !canonicalVenueTimezone(parsed.data.timezone)) {
    return Response.json({ ok: false, code: "INVALID_VENUE_TIMEZONE", error: "Выберите часовой пояс заведения из списка." }, { status: 400 });
  }
  const profile = venueProfileFromInput({
    ...parsed.data,
    trackingStartDate:
      parsed.data.trackingStartDate ?? venueDate(new Date().toISOString(), canonicalVenueTimezone(parsed.data.timezone) || "UTC"),
  });
  if (!profile.name) {
    return Response.json({ ok: false, error: "Укажите название заведения" }, { status: 400 });
  }
  if (!profile.businessType) {
    return Response.json({ ok: false, error: "Укажите тип заведения" }, { status: 400 });
  }
  if (!profile.country || !profile.city) {
    return Response.json(
      { ok: false, error: "Укажите страну и город — они нужны для аналитики BarDoctor" },
      { status: 400 },
    );
  }
  if (!profile.currency) {
    return Response.json({ ok: false, error: "Укажите валюту учёта" }, { status: 400 });
  }

  try {
    const created = await createVenueForOwner(actor, profile);
    await rememberActiveVenueForRequest(request, actor.actorAccountId, created.venue.id);
    return Response.json({
      ok: true,
      activeVenueId: created.venue.id,
      venue: {
        id: created.venue.id,
        workspaceId: created.venue.workspaceId,
        name: profile.name,
        logoId: profile.logoId,
        role: "owner",
        permissions: permissionsFor("owner"),
        status: created.venue.status,
        isPrimary: false,
      },
      cleanVenue: true,
    }, { status: 201 });
  } catch (error) {
    console.error(
      "BarDoctor venue creation failed",
      error instanceof Error ? error.message : "Unknown venue creation error",
    );
    return Response.json(
      { ok: false, error: "Не удалось создать заведение. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
