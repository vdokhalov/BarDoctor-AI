import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../db";
import {
  accounts,
  venueMemberships,
  venues,
  workspaceMemberships,
  type Account,
  type Venue,
  type VenueMembership,
} from "../../db/schema";
import { ACCESS_ROLES, PERMISSION_KEYS, permissionsFor } from "./access-control";

export const OWNER_VENUE_MEMBERSHIP_UPSERT_SQL = `
  INSERT INTO venue_memberships (
    venue_id, account_id, role, permissions_json, status,
    employee_id, invited_by_account_id, joined_at, created_at, updated_at
  )
  SELECT
    v.id, v.created_by_account_id, 'owner', NULL, 'active',
    NULL, NULL, a.created_at, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM venues v
  INNER JOIN accounts a ON a.id = v.created_by_account_id
  WHERE v.id = ?1
    AND v.status = 'active'
    AND v.created_by_account_id IS NOT NULL
    AND a.account_kind = 'user'
  ON CONFLICT(venue_id, account_id) DO UPDATE SET
    role = 'owner',
    permissions_json = NULL,
    status = 'active',
    invited_by_account_id = NULL,
    updated_at = excluded.updated_at
`;

export const OWNER_WORKSPACE_MEMBERSHIP_UPSERT_SQL = `
  INSERT INTO workspace_memberships (
    workspace_id, account_id, role, status, joined_at, created_at, updated_at
  )
  SELECT
    v.workspace_id, v.created_by_account_id, 'owner', 'active',
    a.created_at, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM venues v
  INNER JOIN accounts a ON a.id = v.created_by_account_id
  WHERE v.id = ?1
    AND v.status = 'active'
    AND v.workspace_id IS NOT NULL
    AND v.created_by_account_id IS NOT NULL
    AND a.account_kind = 'user'
  ON CONFLICT(workspace_id, account_id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    updated_at = excluded.updated_at
`;

export type OwnerAccessReconciliation = {
  venueId: number;
  ownerAccountId: number | null;
  repaired: boolean;
  reason: "inactive_venue" | "unconfirmed_owner" | "reconciled";
};

/**
 * Restores access only for the venue-scoped, server-confirmed creator.
 * It never promotes an arbitrary member and never reactivates an archived venue.
 */
export async function reconcileVenueOwnerAccess(
  venueId: number,
): Promise<OwnerAccessReconciliation> {
  const [venue] = await getDb()
    .select({
      id: venues.id,
      status: venues.status,
      createdByAccountId: venues.createdByAccountId,
      creatorKind: accounts.accountKind,
    })
    .from(venues)
    .leftJoin(accounts, eq(accounts.id, venues.createdByAccountId))
    .where(eq(venues.id, venueId))
    .limit(1);
  if (!venue || venue.status !== "active") {
    return {
      venueId,
      ownerAccountId: venue?.createdByAccountId ?? null,
      repaired: false,
      reason: "inactive_venue",
    };
  }
  if (!venue.createdByAccountId || venue.creatorKind !== "user") {
    return {
      venueId,
      ownerAccountId: venue.createdByAccountId ?? null,
      repaired: false,
      reason: "unconfirmed_owner",
    };
  }

  const d1 = getD1();
  await d1.batch([
    d1.prepare(OWNER_WORKSPACE_MEMBERSHIP_UPSERT_SQL).bind(venueId),
    d1.prepare(OWNER_VENUE_MEMBERSHIP_UPSERT_SQL).bind(venueId),
  ]);
  return {
    venueId,
    ownerAccountId: venue.createdByAccountId,
    repaired: true,
    reason: "reconciled",
  };
}

/** Repairs only active venues created by this account and only when drift exists. */
export async function reconcileConfirmedOwnerVenues(accountId: number): Promise<number[]> {
  const rows = await getD1().prepare(`
    SELECT v.id
    FROM venues v
    INNER JOIN accounts a ON a.id = v.created_by_account_id AND a.account_kind = 'user'
    LEFT JOIN venue_memberships vm
      ON vm.venue_id = v.id AND vm.account_id = v.created_by_account_id
    LEFT JOIN workspace_memberships wm
      ON wm.workspace_id = v.workspace_id AND wm.account_id = v.created_by_account_id
    WHERE v.status = 'active'
      AND v.created_by_account_id = ?1
      AND (
        vm.id IS NULL OR vm.role <> 'owner' OR vm.status <> 'active' OR vm.permissions_json IS NOT NULL
        OR wm.id IS NULL OR wm.role <> 'owner' OR wm.status <> 'active'
      )
    ORDER BY v.id
  `).bind(accountId).all<{ id: number }>();
  const repaired: number[] = [];
  for (const row of rows.results ?? []) {
    const result = await reconcileVenueOwnerAccess(row.id);
    if (result.reason === "reconciled") repaired.push(row.id);
  }
  return repaired;
}

export type OwnerAccessIntegrityAudit = {
  mode: "read_only";
  permissionModel: "venue_membership_owner_wildcard";
  counts: {
    totalVenues: number;
    activeVenues: number;
    venuesWithoutConfirmedOwner: number;
    venuesWithoutActiveOwnerMembership: number;
    confirmedOwnersWithoutOwnerRole: number;
    confirmedOwnersWithoutWorkspaceOwnerRole: number;
    invalidMembershipRoles: number;
    ownerMembershipsWithOverrides: number;
    duplicateActiveOwnerRoles: number;
    orphanVenueMemberships: number;
    ownerMarkerMismatches: number;
    permissionCatalog: number;
    ownerResolvedPermissions: number;
    ownerMissingPermissions: number;
  };
  venueIds: {
    withoutConfirmedOwner: number[];
    withoutActiveOwnerMembership: number[];
    confirmedOwnerDrift: number[];
    confirmedOwnerWorkspaceDrift: number[];
    duplicateActiveOwnerRoles: number[];
    ownerMarkerMismatches: number[];
  };
  writesPerformed: 0;
};

type OwnerAuditAccount = Pick<Account, "id" | "accountKind" | "ownsVenue">;
type OwnerAuditVenue = Pick<Venue, "id" | "status" | "workspaceId" | "dataAccountId" | "createdByAccountId">;
type OwnerAuditMembership = Pick<VenueMembership, "venueId" | "accountId" | "role" | "status" | "permissionsJson">;
type OwnerAuditWorkspaceMembership = Pick<
  typeof workspaceMemberships.$inferSelect,
  "workspaceId" | "accountId" | "role" | "status"
>;

export function auditOwnerAccessRecords(input: {
  accounts: OwnerAuditAccount[];
  venues: OwnerAuditVenue[];
  venueMemberships: OwnerAuditMembership[];
  workspaceMemberships?: OwnerAuditWorkspaceMembership[];
}): OwnerAccessIntegrityAudit {
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const venueById = new Map(input.venues.map((venue) => [venue.id, venue]));
  const activeVenues = input.venues.filter((venue) => venue.status === "active");
  const activeOwnerMemberships = input.venueMemberships.filter((membership) =>
    membership.role === "owner" && membership.status === "active");
  const ownerCounts = new Map<number, number>();
  for (const membership of activeOwnerMemberships) {
    ownerCounts.set(membership.venueId, (ownerCounts.get(membership.venueId) ?? 0) + 1);
  }
  const withoutConfirmedOwner = activeVenues.filter((venue) => {
    const creator = venue.createdByAccountId ? accountById.get(venue.createdByAccountId) : null;
    return !creator || creator.accountKind !== "user";
  }).map((venue) => venue.id);
  const withoutActiveOwnerMembership = activeVenues
    .filter((venue) => (ownerCounts.get(venue.id) ?? 0) === 0)
    .map((venue) => venue.id);
  const confirmedOwnerDrift = activeVenues.filter((venue) => {
    if (!venue.createdByAccountId || accountById.get(venue.createdByAccountId)?.accountKind !== "user") return false;
    return !input.venueMemberships.some((membership) =>
      membership.venueId === venue.id
      && membership.accountId === venue.createdByAccountId
      && membership.role === "owner"
      && membership.status === "active"
      && membership.permissionsJson == null);
  }).map((venue) => venue.id);
  const confirmedOwnerWorkspaceDrift = activeVenues.filter((venue) => {
    if (!venue.createdByAccountId || accountById.get(venue.createdByAccountId)?.accountKind !== "user") return false;
    if (!venue.workspaceId) return true;
    return !(input.workspaceMemberships ?? []).some((membership) =>
      membership.workspaceId === venue.workspaceId
      && membership.accountId === venue.createdByAccountId
      && membership.role === "owner"
      && membership.status === "active");
  }).map((venue) => venue.id);
  const duplicateActiveOwnerRoles = activeVenues
    .filter((venue) => (ownerCounts.get(venue.id) ?? 0) > 1)
    .map((venue) => venue.id);
  const ownerMarkerMismatches = input.venues.filter((venue) => {
    const dataAccount = accountById.get(venue.dataAccountId);
    if (!dataAccount || dataAccount.accountKind !== "user") return false;
    return Boolean(dataAccount.ownsVenue) !== (venue.createdByAccountId === dataAccount.id);
  }).map((venue) => venue.id);
  const permissionCatalog = PERMISSION_KEYS.length;
  const ownerResolvedPermissions = permissionsFor("owner").length;
  return {
    mode: "read_only",
    permissionModel: "venue_membership_owner_wildcard",
    counts: {
      totalVenues: input.venues.length,
      activeVenues: activeVenues.length,
      venuesWithoutConfirmedOwner: withoutConfirmedOwner.length,
      venuesWithoutActiveOwnerMembership: withoutActiveOwnerMembership.length,
      confirmedOwnersWithoutOwnerRole: confirmedOwnerDrift.length,
      confirmedOwnersWithoutWorkspaceOwnerRole: confirmedOwnerWorkspaceDrift.length,
      invalidMembershipRoles: input.venueMemberships.filter((membership) =>
        !ACCESS_ROLES.includes(membership.role as (typeof ACCESS_ROLES)[number])).length,
      ownerMembershipsWithOverrides: activeOwnerMemberships.filter((membership) => membership.permissionsJson != null).length,
      duplicateActiveOwnerRoles: duplicateActiveOwnerRoles.length,
      orphanVenueMemberships: input.venueMemberships.filter((membership) =>
        !venueById.has(membership.venueId) || !accountById.has(membership.accountId)).length,
      ownerMarkerMismatches: ownerMarkerMismatches.length,
      permissionCatalog,
      ownerResolvedPermissions,
      ownerMissingPermissions: Math.max(0, permissionCatalog - ownerResolvedPermissions),
    },
    venueIds: {
      withoutConfirmedOwner,
      withoutActiveOwnerMembership,
      confirmedOwnerDrift,
      confirmedOwnerWorkspaceDrift,
      duplicateActiveOwnerRoles,
      ownerMarkerMismatches,
    },
    writesPerformed: 0,
  };
}

export async function readOwnerAccessIntegrityAudit(): Promise<OwnerAccessIntegrityAudit> {
  const db = getDb();
  const [accountRows, venueRows, venueMembershipRows, workspaceMembershipRows] = await Promise.all([
    db.select({ id: accounts.id, accountKind: accounts.accountKind, ownsVenue: accounts.ownsVenue }).from(accounts),
    db.select({
      id: venues.id,
      status: venues.status,
      workspaceId: venues.workspaceId,
      dataAccountId: venues.dataAccountId,
      createdByAccountId: venues.createdByAccountId,
    }).from(venues),
    db.select({
      venueId: venueMemberships.venueId,
      accountId: venueMemberships.accountId,
      role: venueMemberships.role,
      status: venueMemberships.status,
      permissionsJson: venueMemberships.permissionsJson,
    }).from(venueMemberships),
    db.select({
      workspaceId: workspaceMemberships.workspaceId,
      accountId: workspaceMemberships.accountId,
      role: workspaceMemberships.role,
      status: workspaceMemberships.status,
    }).from(workspaceMemberships),
  ]);
  return auditOwnerAccessRecords({
    accounts: accountRows,
    venues: venueRows,
    venueMemberships: venueMembershipRows,
    workspaceMemberships: workspaceMembershipRows,
  });
}
