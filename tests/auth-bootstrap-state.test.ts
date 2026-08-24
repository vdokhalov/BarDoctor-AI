import assert from "node:assert/strict";
import test from "node:test";

import { classifyAuthBootstrap } from "../lib/bardoctor/bootstrap-state";
import { auditBootstrapIntegrity } from "../lib/bardoctor/bootstrap-integrity-records";

test("existing configured venue is ready and missing active selection can be restored", () => {
  assert.deepEqual(classifyAuthBootstrap({
    ownsVenue: true,
    activeVenue: { role: "owner", isPrimary: true, hasProfile: true },
    confirmedOwnedVenueStatuses: ["active"],
  }), { state: "ready", reason: "active_venue_ready" });
});

test("only a primary owner placeholder enters first-time onboarding", () => {
  assert.equal(classifyAuthBootstrap({
    ownsVenue: true,
    activeVenue: { role: "owner", isPrimary: true, hasProfile: false },
    confirmedOwnedVenueStatuses: ["active"],
  }).state, "onboarding_required");
  assert.equal(classifyAuthBootstrap({
    ownsVenue: false,
    activeVenue: { role: "manager", isPrimary: false, hasProfile: false },
    confirmedOwnedVenueStatuses: [],
  }).state, "recovery_required");
});

test("a legacy confirmed owner with only an archived venue never enters onboarding", () => {
  assert.deepEqual(classifyAuthBootstrap({
    ownsVenue: true,
    activeVenue: null,
    confirmedOwnedVenueStatuses: ["archived"],
  }), { state: "recovery_required", reason: "confirmed_owner_venue_inactive" });
});

test("bootstrap integrity audit is read-only and detects stale active venue state", () => {
  const report = auditBootstrapIntegrity({
    accounts: [{ id: 1, accountKind: "user", ownsVenue: true, restaurantJson: "{}" }],
    venues: [{ id: 10, dataAccountId: 1, createdByAccountId: 1, status: "archived" }],
    memberships: [{ id: 20, venueId: 10, accountId: 1, role: "owner", status: "active" }],
    sessions: [{ accountId: 1, activeVenueId: 10 }],
  });
  assert.equal(report.mode, "read_only");
  assert.equal(report.writesPerformed, 0);
  assert.equal(report.onboardingFlagsPersisted, false);
  assert.equal(report.counts.archivedOnlyConfirmedOwners, 1);
  assert.equal(report.counts.invalidActiveVenueReferences, 1);
  assert.equal(report.counts.duplicateFirstVenues, 0);
});
