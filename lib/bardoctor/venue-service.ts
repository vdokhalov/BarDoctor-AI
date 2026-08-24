import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  accounts,
  domainData,
  venueMemberships,
  venues,
} from "../../db/schema";
import type { AuthenticatedAccount } from "./access-control";
import type { VenueProfile } from "./venue-profile";
import { authoritativeVenueStoreRows } from "./authoritative-persistence";
import { reconcileVenueOwnerAccess } from "./owner-access";

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

    await reconcileVenueOwnerAccess(venue.id);
    const [membership] = await db
      .select()
      .from(venueMemberships)
      .where(
        and(
          eq(venueMemberships.venueId, venue.id),
          eq(venueMemberships.accountId, actor.actorAccountId),
        ),
      )
      .limit(1);
    if (!membership || membership.role !== "owner" || membership.status !== "active") {
      throw new Error("VENUE_OWNER_PROVISIONING_FAILED");
    }

    return { venue, membership, profile };
  } catch (error) {
    if (dataAccountId) {
      await db.delete(accounts).where(eq(accounts.id, dataAccountId)).catch(() => undefined);
    }
    throw error;
  }
}
