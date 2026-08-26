import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  canonicalVenueLogoId,
  venueIdentityFromJson,
} from "../lib/bardoctor/venue-identity";

const validLogoId = "12345678-1234-4123-8123-123456789abc";

test("canonical venue identity resolves a stored logo and safe fallback", () => {
  assert.deepEqual(
    venueIdentityFromJson(JSON.stringify({ name: " Кёльн ", logoId: validLogoId })),
    { name: "Кёльн", logoId: validLogoId },
  );
  assert.deepEqual(venueIdentityFromJson(null), {
    name: "Новое заведение",
    logoId: null,
  });
  assert.equal(canonicalVenueLogoId("../../escape"), null);
});

test("all membership and venue APIs expose the canonical logoId", () => {
  for (const file of [
    "lib/bardoctor/auth.ts",
    "app/api/users/me/route.ts",
    "app/api/venues/route.ts",
    "app/api/access/active-venue/route.ts",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /logoId/, file);
    assert.match(source, /venueIdentityFromJson/, file);
  }
});

test("profile save refreshes one canonical venue context including its logo", () => {
  const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
  assert.match(bundle, /logoId:a\?\.logoId\?\?null,hasProfile:!0/);
  assert.match(bundle, /new CustomEvent\("bd:venue-context",\{detail:u\}\)/);
  assert.doesNotMatch(bundle, /new CustomEvent\("bd:venue-context-updated",\{detail:\{venueId:d\}\}\)/);
  assert.match(bundle, /bdHomeTodayState\(e,\[\],new Date\)\?\.operatingDate/);
});

test("venue switcher renders the canonical logo before using initials fallback", () => {
  const source = fs.readFileSync("public/venue-switcher.js", "utf8");
  assert.match(source, /function venueLogoUrl\(venue\)/);
  assert.match(source, /"\/api\/venues\/logo\/" \+ logoId/);
  assert.match(source, /renderVenueAvatar\(button\.querySelector\("\.bd-venue-monogram"\), venue\)/);
  assert.match(source, /renderVenueAvatar\(existing\.querySelector\("\.bd-venue-trigger-avatar"\), venue\)/);
  assert.match(source, /image\.addEventListener\("error"/);
  assert.match(source, /target\.textContent = fallback/);
});
