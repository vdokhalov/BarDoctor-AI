import assert from "node:assert/strict";
import test from "node:test";
import { selectVenueMembership } from "../lib/bardoctor/venue-selection";

const memberships = [
  { label: "joined", venue: { id: 11, dataAccountId: 900 } },
  { label: "owned", venue: { id: 22, dataAccountId: 200 } },
];

test("data requests never fall back when an explicit venue is unauthorized", () => {
  assert.equal(selectVenueMembership(memberships, 999, 200), null);
  assert.equal(selectVenueMembership(memberships, 11, 200)?.label, "joined");
});

test("requests without a venue prefer the owner's venue, then an active membership", () => {
  assert.equal(selectVenueMembership(memberships, null, 200)?.label, "owned");
  assert.equal(selectVenueMembership(memberships, null, 999)?.label, "joined");
});

test("bootstrap may heal a stale venue without granting that venue access", () => {
  assert.equal(selectVenueMembership(memberships, 999, 200, true)?.label, "owned");
});
