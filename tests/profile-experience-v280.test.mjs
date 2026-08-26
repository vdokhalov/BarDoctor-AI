import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
const css = fs.readFileSync("public/profile-v280.css", "utf8");
const html = fs.readFileSync("app/bar-doctor-response.ts", "utf8");
const start = bundle.indexOf('const bdProfileVersionV280="profile-v280";');
const end = bundle.indexOf("const QI=[", start);
const profile = bundle.slice(start, end);
const editorStart = bundle.indexOf("function ZCe");
const editorEnd = bundle.indexOf("function JCe", editorStart);
const venueEditor = bundle.slice(editorStart, editorEnd);

test("profile v280 is linked and parseable", () => {
  assert.ok(html.includes("/profile-v280.css"));
  assert.ok(start > 0 && end > start);
  assert.doesNotThrow(() => new Function(bundle));
});

test("profile uses the approved compact information architecture", () => {
  for (const label of [
    "Личные данные",
    "Безопасность",
    "Язык интерфейса",
    "Заведение",
    "Валюта учёта",
    "Устройства и сессии",
    "Выйти из аккаунта",
  ]) assert.ok(profile.includes(label), label);
  assert.ok(profile.includes("bdProfileSectionV280"));
  assert.ok(profile.includes("bdProfileRowV280"));
  assert.ok(profile.includes("bdVenueLogoV280"));
});

test("profile no longer exposes analytics or device reset", () => {
  for (const removed of [
    "Конкуренты рядом",
    "competitionDensity",
    "Очистить это устройство",
    "Очистить устройство и выйти",
    "localStorage.clear()",
  ]) assert.equal(profile.includes(removed), false, removed);
});

test("profile preserves real security, sessions, logout and RBAC flows", () => {
  assert.ok(profile.includes('/api/users/sessions'));
  assert.ok(profile.includes('bdSettingsSessionsSheetV182'));
  assert.ok(profile.includes('bdLogoutSession()'));
  assert.ok(profile.includes('bdHasClientPermission("settings.manage")'));
  assert.ok(profile.includes('/forgot-password'));
});

test("venue logo has server persistence, fallback and editor controls", () => {
  assert.ok(profile.includes('function bdCanonicalVenueIdentityV297'));
  assert.match(profile, /"\/api\/venues\/logo\/"\+[a-z]\.logoId/);
  assert.match(profile, /onError:\(\)=>[a-z]\(!0\)/);
  assert.ok(profile.includes('decoding:"async"'));
  assert.ok(venueEditor.includes('accept:"image/jpeg,image/png,image/webp"'));
  assert.ok(venueEditor.includes('fetch("/api/venues/logo"'));
  assert.ok(venueEditor.includes('logoId:bdNextLogoId'));
  assert.ok(venueEditor.includes('method:"DELETE"'));
  assert.equal(venueEditor.includes("Конкуренты рядом"), false);
});

test("profile layout is constrained, touch-safe and bottom-nav safe", () => {
  assert.match(css, /width:\s*min\(100%,\s*680px\)/);
  assert.match(css, /min-height:\s*56px/);
  assert.match(css, /width:\s*44px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
});
