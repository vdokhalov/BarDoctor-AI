import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { venueProfileFromInput } from "../lib/bardoctor/venue-profile";

test("venue profile accepts only canonical server logo identifiers", () => {
  const valid = "12345678-1234-1234-1234-123456789012";
  assert.equal(venueProfileFromInput({ name: "Venue", logoId: valid }).logoId, valid);
  assert.equal(venueProfileFromInput({ name: "Venue", logoId: "../../escape" }).logoId, null);
  assert.equal(venueProfileFromInput({ name: "Venue", logoId: "data:image/png;base64,abc" }).logoId, null);
});

test("venue logo routes are authenticated, venue-scoped and permission protected", () => {
  const upload = fs.readFileSync("app/api/venues/logo/route.ts", "utf8");
  const item = fs.readFileSync("app/api/venues/logo/[id]/route.ts", "utf8");
  assert.ok(upload.includes("authenticateRequest(request)"));
  assert.ok(upload.includes('hasPermission(account, "settings.manage")'));
  assert.ok(upload.includes("venues/${account.id}/logos/${id}"));
  assert.ok(upload.includes("MAX_LOGO_BYTES"));
  assert.ok(item.includes("authenticateRequest(request)"));
  assert.ok(item.includes('hasPermission(account, "settings.manage")'));
  assert.ok(item.includes("profile?.logoId === id"));
  assert.ok(item.includes("bucket()?.delete"));
});

