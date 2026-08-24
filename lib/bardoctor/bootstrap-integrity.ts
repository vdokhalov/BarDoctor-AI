import { getDb } from "../../db";
import { accounts, sessions, venueMemberships, venues } from "../../db/schema";
import { auditBootstrapIntegrity } from "./bootstrap-integrity-records";

export { auditBootstrapIntegrity } from "./bootstrap-integrity-records";

export async function readBootstrapIntegrityAudit() {
  const db = getDb();
  const [accountRows, venueRows, membershipRows, sessionRows] = await Promise.all([
    db.select({ id: accounts.id, accountKind: accounts.accountKind, ownsVenue: accounts.ownsVenue, restaurantJson: accounts.restaurantJson }).from(accounts),
    db.select({ id: venues.id, dataAccountId: venues.dataAccountId, createdByAccountId: venues.createdByAccountId, status: venues.status }).from(venues),
    db.select({ id: venueMemberships.id, venueId: venueMemberships.venueId, accountId: venueMemberships.accountId, role: venueMemberships.role, status: venueMemberships.status }).from(venueMemberships),
    db.select({ accountId: sessions.accountId, activeVenueId: sessions.activeVenueId }).from(sessions),
  ]);
  return auditBootstrapIntegrity({
    accounts: accountRows,
    venues: venueRows,
    memberships: membershipRows,
    sessions: sessionRows,
  });
}
