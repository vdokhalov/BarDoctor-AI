import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  accounts,
  domainData,
  venueMemberships,
  venues,
  workspaces,
} from "../../db/schema";
import {
  AUTHORITATIVE_STORE_KEYS,
  type AuthoritativeStoreInput,
  type AuthoritativeStoreKey,
} from "./authoritative-persistence";
import type { PlatformVenueInput } from "./platform-persistence-audit";

export type LegacyCandidatesByVenue = Record<string, Partial<Record<AuthoritativeStoreKey, unknown>>>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function positiveInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function venueName(value: string | null): string | null {
  if (!value) return null;
  try {
    const name = record(JSON.parse(value)).name;
    return typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : null;
  } catch {
    return null;
  }
}

export function sanitizeLegacyCandidates(value: unknown): LegacyCandidatesByVenue {
  const root = record(value);
  return Object.fromEntries(Object.entries(root).flatMap(([venueId, candidate]) => {
    if (!positiveInteger(venueId)) return [];
    const allowed = Object.fromEntries(Object.entries(record(candidate)).filter(([key]) =>
      AUTHORITATIVE_STORE_KEYS.includes(key as AuthoritativeStoreKey))) as Partial<Record<AuthoritativeStoreKey, unknown>>;
    return Object.keys(allowed).length ? [[venueId, allowed]] : [];
  }));
}

export async function readPlatformPersistenceInventory(
  legacyCandidatesByVenue: LegacyCandidatesByVenue = {},
) {
  const db = getDb();
  const [venueRows, accountRows, workspaceRows, membershipRows, storeRows] = await Promise.all([
    db.select({ venue: venues, dataAccount: accounts })
      .from(venues)
      .innerJoin(accounts, eq(venues.dataAccountId, accounts.id)),
    db.select({ id: accounts.id, accountKind: accounts.accountKind }).from(accounts),
    db.select({ id: workspaces.id, status: workspaces.status }).from(workspaces),
    db.select({ id: venueMemberships.id }).from(venueMemberships),
    db.select({
      accountId: domainData.accountId,
      storeKey: domainData.storeKey,
      dataJson: domainData.dataJson,
      updatedAt: domainData.updatedAt,
    }).from(domainData).where(inArray(domainData.storeKey, [...AUTHORITATIVE_STORE_KEYS])),
  ]);
  const storesByAccount = new Map<number, Partial<Record<AuthoritativeStoreKey, AuthoritativeStoreInput>>>();
  for (const row of storeRows) {
    if (!AUTHORITATIVE_STORE_KEYS.includes(row.storeKey as AuthoritativeStoreKey)) continue;
    let data: unknown;
    let parseError = false;
    try {
      data = JSON.parse(row.dataJson);
    } catch {
      data = null;
      parseError = true;
    }
    const stores = storesByAccount.get(row.accountId) ?? {};
    stores[row.storeKey as AuthoritativeStoreKey] = {
      exists: true,
      data,
      updatedAt: row.updatedAt,
      parseError,
    };
    storesByAccount.set(row.accountId, stores);
  }
  const venueInputs: PlatformVenueInput[] = venueRows.map(({ venue, dataAccount }) => ({
    id: venue.id,
    dataAccountId: venue.dataAccountId,
    workspaceId: venue.workspaceId,
    name: venueName(dataAccount.restaurantJson),
    status: venue.status,
    migrationStatus: dataAccount.migrationStatus,
    serverStores: storesByAccount.get(venue.dataAccountId) ?? {},
    legacyCandidates: legacyCandidatesByVenue[String(venue.id)],
  }));
  return {
    venues: venueInputs,
    accountCount: accountRows.length,
    userAccountCount: accountRows.filter((account) => account.accountKind === "user").length,
    tenantCount: workspaceRows.length,
    activeTenantCount: workspaceRows.filter((workspace) => workspace.status === "active").length,
    membershipCount: membershipRows.length,
  };
}
