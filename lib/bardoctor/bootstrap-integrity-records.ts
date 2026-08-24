import { ACCESS_ROLES } from "./access-control";

export type BootstrapAuditRecords = {
  accounts: Array<{ id: number; accountKind: string; ownsVenue: boolean; restaurantJson: string | null }>;
  venues: Array<{ id: number; dataAccountId: number; createdByAccountId: number | null; status: string }>;
  memberships: Array<{ id: number; venueId: number; accountId: number; role: string; status: string }>;
  sessions: Array<{ accountId: number; activeVenueId: number | null }>;
};

export function auditBootstrapIntegrity(input: BootstrapAuditRecords) {
  const users = input.accounts.filter((account) => account.accountKind === "user");
  const accountIds = new Set(users.map((account) => account.id));
  const venueById = new Map(input.venues.map((venue) => [venue.id, venue]));
  const pairCounts = new Map<string, number>();
  for (const membership of input.memberships) {
    const key = `${membership.venueId}:${membership.accountId}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  const activeMembership = (accountId: number, venueId: number) => input.memberships.some((membership) =>
    membership.accountId === accountId && membership.venueId === venueId && membership.status === "active");
  const activeAccessibleVenues = (accountId: number) => input.venues.filter((venue) =>
    venue.status === "active" && activeMembership(accountId, venue.id));
  const confirmedOwned = (accountId: number) => input.venues.filter((venue) => venue.createdByAccountId === accountId);
  const confirmedOwnersWithoutMembership = input.venues.filter((venue) =>
    venue.createdByAccountId != null && !activeMembership(venue.createdByAccountId, venue.id));
  const archivedOnlyConfirmedOwners = users.filter((account) => {
    const owned = confirmedOwned(account.id);
    return owned.length > 0 && owned.every((venue) => venue.status !== "active");
  });
  const invalidActiveVenueReferences = input.sessions.filter((session) => {
    if (session.activeVenueId == null) return false;
    const venue = venueById.get(session.activeVenueId);
    return !venue || venue.status !== "active" || !activeMembership(session.accountId, session.activeVenueId);
  });
  return {
    mode: "read_only" as const,
    onboardingFlagsPersisted: false,
    counts: {
      users: users.length,
      venues: input.venues.length,
      usersWithVenueButNoActiveMembership: users.filter((account) =>
        confirmedOwned(account.id).length > 0 && activeAccessibleVenues(account.id).length === 0).length,
      confirmedOwnersWithoutMembership: confirmedOwnersWithoutMembership.length,
      membershipsWithoutValidRole: input.memberships.filter((membership) =>
        !ACCESS_ROLES.includes(membership.role as (typeof ACCESS_ROLES)[number])).length,
      venuesWithOwnerOutsideMemberships: confirmedOwnersWithoutMembership.length,
      usersWithProfileButNoActiveVenue: users.filter((account) =>
        account.restaurantJson != null && activeAccessibleVenues(account.id).length === 0).length,
      duplicateMembershipPairs: [...pairCounts.values()].filter((count) => count > 1).length,
      duplicateFirstVenues: [...new Set(input.venues.map((venue) => venue.dataAccountId))].filter((accountId) =>
        input.venues.filter((venue) => venue.dataAccountId === accountId).length > 1).length,
      orphanMemberships: input.memberships.filter((membership) =>
        !venueById.has(membership.venueId) || !accountIds.has(membership.accountId)).length,
      invalidActiveVenueReferences: invalidActiveVenueReferences.length,
      archivedOnlyConfirmedOwners: archivedOnlyConfirmedOwners.length,
    },
    accountIds: {
      archivedOnlyConfirmedOwners: archivedOnlyConfirmedOwners.map((account) => account.id),
      invalidActiveVenueReferences: [...new Set(invalidActiveVenueReferences.map((session) => session.accountId))],
    },
    writesPerformed: 0 as const,
  };
}
