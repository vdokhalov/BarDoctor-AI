export type VenueSelection = {
  venue: {
    id: number;
    dataAccountId: number;
  };
};

export function selectVenueMembership<T extends VenueSelection>(
  memberships: T[],
  requestedVenueId: number | null | undefined,
  ownDataAccountId: number,
  fallbackOnInvalidRequest = false,
): T | null {
  if (requestedVenueId) {
    const requested = memberships.find((item) => item.venue.id === requestedVenueId) ?? null;
    if (requested || !fallbackOnInvalidRequest) return requested;
  }
  return memberships.find((item) => item.venue.dataAccountId === ownDataAccountId)
    ?? memberships[0]
    ?? null;
}
