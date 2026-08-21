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
import { venueProfileFromInput } from "../../../lib/bardoctor/venue-profile";
import { normalizeAccountingCurrency } from "../../../lib/bardoctor/currency";

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
  if (!actor || !identity) return unauthorized();
  const memberships = await membershipsForAccount(identity);
  return Response.json({
    ok: true,
    activeVenueId: actor.venueId,
    canCreateVenues: actor.role === "owner",
    venues: memberships.map((item) => ({
      id: item.venue.id,
      workspaceId: item.venue.workspaceId,
      name: venueName(item.dataAccount.restaurantJson),
      currency: venueCurrency(item.dataAccount.restaurantJson),
      role: item.role,
      permissions: item.permissions,
      status: item.venue.status,
      isPrimary: item.venue.dataAccountId === identity.id,
      active: item.venue.id === actor.venueId,
    })),
  });
}

export async function POST(request: Request): Promise<Response> {
  const actor = await authenticateRequest(request);
  if (!actor) return unauthorized();
  if (actor.role !== "owner") {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Новое заведение может создать только владелец" },
      { status: 403 },
    );
  }
  const parsed = await readJsonRequest<Record<string, unknown>>(request, {
    maxBytes: 512 * 1024,
  });
  if (!parsed.ok) return parsed.response;
  const profile = venueProfileFromInput(parsed.data);
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
