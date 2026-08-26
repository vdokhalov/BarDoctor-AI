export type VenueIdentity = {
  name: string;
  logoId: string | null;
};

const VENUE_LOGO_ID = /^[a-zA-Z0-9-]{20,80}$/;

export function canonicalVenueLogoId(value: unknown): string | null {
  return typeof value === "string" && VENUE_LOGO_ID.test(value) ? value : null;
}

export function venueIdentityFromJson(value: string | null): VenueIdentity {
  if (!value) return { name: "Новое заведение", logoId: null };
  try {
    const profile = JSON.parse(value) as { name?: unknown; logoId?: unknown };
    return {
      name:
        typeof profile.name === "string" && profile.name.trim()
          ? profile.name.trim()
          : "Новое заведение",
      logoId: canonicalVenueLogoId(profile.logoId),
    };
  } catch {
    return { name: "Новое заведение", logoId: null };
  }
}
