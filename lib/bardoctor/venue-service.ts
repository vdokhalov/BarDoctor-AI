import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  accounts,
  domainData,
  venueMemberships,
  venues,
  workspaceMemberships,
} from "../../db/schema";
import type { AuthenticatedAccount } from "./access-control";
import type { VenueProfile } from "./venue-profile";
import { authoritativeVenueStoreRows } from "./authoritative-persistence";

function internalVenueEmail(): string {
  return `venue-${crypto.randomUUID()}@tenant.bardoctor.invalid`;
}

export async function createVenueForOwner(
  actor: AuthenticatedAccount,
  profile: VenueProfile,
) {
  if (actor.role !== "owner") throw new Error("VENUE_CREATE_FORBIDDEN");
  if (!profile.name) throw new Error("VENUE_NAME_REQUIRED");

  const db = getDb();
  const [currentVenue] = await db
    .select()
    .from(venues)
    .where(
      and(
        eq(venues.id, actor.venueId),
        eq(venues.status, "active"),
      ),
    )
    .limit(1);
  if (!currentVenue?.workspaceId) throw new Error("VENUE_WORKSPACE_MISSING");

  const now = new Date().toISOString();
  const dataEmail = internalVenueEmail();
  let dataAccountId: number | null = null;
  try {
    const [dataAccount] = await db
      .insert(accounts)
      .values({
        chatgptEmail: dataEmail,
        appEmail: dataEmail,
        firstName: "Venue",
        accountKind: "venue_data",
        role: "owner",
        ownsVenue: false,
        restaurantJson: JSON.stringify(profile),
        migrationStatus: "server_authoritative",
        updatedAt: now,
      })
      .returning({ id: accounts.id });
    dataAccountId = dataAccount.id;

    const [venue] = await db
      .insert(venues)
      .values({
        workspaceId: currentVenue.workspaceId,
        dataAccountId,
        status: "active",
        createdByAccountId: actor.actorAccountId,
        updatedAt: now,
      })
      .returning();

    await db
      .insert(domainData)
      .values(authoritativeVenueStoreRows({
        dataAccountId,
        venueId: venue.id,
        updatedAt: now,
      }))
      .onConflictDoNothing({ target: [domainData.accountId, domainData.storeKey] });

    const [membership] = await db
      .insert(venueMemberships)
      .values({
        venueId: venue.id,
        accountId: actor.actorAccountId,
        role: "owner",
        status: "active",
        joinedAt: now,
        updatedAt: now,
      })
      .returning();

    await db
      .insert(workspaceMemberships)
      .values({
        workspaceId: currentVenue.workspaceId,
        accountId: actor.actorAccountId,
        role: "owner",
        status: "active",
        joinedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [workspaceMemberships.workspaceId, workspaceMemberships.accountId],
        set: { role: "owner", status: "active", updatedAt: now },
      });

    return { venue, membership, profile };
  } catch (error) {
    if (dataAccountId) {
      await db.delete(accounts).where(eq(accounts.id, dataAccountId)).catch(() => undefined);
    }
    throw error;
  }
}
