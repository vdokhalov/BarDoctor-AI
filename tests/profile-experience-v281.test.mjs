import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
const css = fs.readFileSync("public/profile-v281.css", "utf8");
const html = fs.readFileSync("app/bar-doctor-response.ts", "utf8");
const navigation = fs.readFileSync("public/navigation-contract-v247.js", "utf8");
const polish = fs.readFileSync("public/modern-polish.js", "utf8");
const venueSwitcher = fs.readFileSync("public/venue-switcher.js", "utf8");
const start = bundle.indexOf('bdProfileVersionV281="profile-v281"');
const end = bundle.indexOf("const QI=[", start);
const profile = bundle.slice(start, end);

test("profile v281 assets and corrected routes are linked and parseable", () => {
  assert.ok(html.includes("/profile-v281.css"));
  assert.ok(start > 0 && end > start);
  assert.doesNotThrow(() => new Function(bundle));
  for (const route of ["/profile/personal", "/profile/venue", "/profile/currency"]) {
    assert.ok(bundle.includes(`path:"${route}"`), route);
    assert.ok(navigation.includes(`"${route}"`), route);
  }
  assert.ok(bundle.includes('path:"/profile",component:()=>i.jsx(pt,{component:e_e})'));
});

test("profile restores the canonical venue switch host and stable loading geometry", () => {
  assert.ok(profile.includes('data-bd-canonical-venue-host'));
  assert.ok(profile.includes("bd-profile-venue-host-v281"));
  assert.ok(profile.includes("bd-profile-loading-v281"));
  assert.match(css, /\.bd-profile-venue-host-v281 \.bd-venue-trigger\.bd-venue-trigger-inline/);
  assert.match(css, /min-height:\s*720px/);
  assert.match(css, /width:\s*88px;\s*height:\s*88px/);
  assert.ok(venueSwitcher.includes('inlineHost.hasAttribute("data-bd-canonical-venue-host")'));
  assert.ok(venueSwitcher.includes("context.venues.length < 2 && !profileHost"));
});

test("user and venue cards navigate to dedicated fullscreen editors", () => {
  assert.ok(profile.includes('A("/profile/personal")'));
  assert.ok(profile.includes('A("/profile/venue")'));
  assert.ok(profile.includes('data-bd-profile-editor":"personal-v281"'));
  assert.ok(profile.includes('data-bd-profile-editor":"venue-v281"'));
  assert.equal(profile.includes("i.jsx(JCe"), false);
  assert.equal(profile.includes("i.jsx(ZCe"), false);
});

test("currency has an isolated flow and saves only the current venue currency", () => {
  assert.ok(profile.includes('A("/profile/currency")'));
  assert.ok(profile.includes('data-bd-profile-editor":"currency-v281"'));
  assert.ok(profile.includes("bdAccountingCurrencyOptionsV243().map"));
  assert.ok(profile.includes("await n({...e,currency:s})"));
  assert.equal(profile.includes('A("/profile/currency")?()=>A("/profile/venue")'), false);
});

test("fullscreen editors own scrolling, start at top, avoid autofocus and hide global navigation", () => {
  assert.ok(profile.includes('showBottomNav:!1'));
  assert.ok(profile.includes('scrollTo?.({top:0,behavior:"auto"})'));
  assert.ok(profile.includes("document.activeElement instanceof HTMLElement"));
  assert.equal(profile.includes("autoFocus"), false);
  assert.ok(profile.includes("bdSetDetailsOpen(!bdDetailsOpen)"));
  assert.ok(profile.includes('disabled:l||!a.name.trim()||!T,children:l?"Сохраняем…":"Сохранить"'));
  assert.equal(profile.includes('disabled:u||!a.name.trim()||!T,children:u?"Сохраняем…":"Сохранить"'), false);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /height:\s*calc\(100dvh - 65px\) !important/);
  assert.match(css, /background:\s*hsl\(var\(--card\)\) !important/);
  assert.match(css, /border:\s*1px solid hsl\(var\(--border\)\) !important/);
  assert.match(css, /border:\s*1px solid hsl\(var\(--card-border\)\)/);
  assert.match(css, /body\.bd-profile-editor-active-v281 \.bd-scroll-top/);
  assert.ok(polish.includes("bd-profile-editor-active-v281"));
});

test("editors preserve server authority, RBAC and venue logo persistence", () => {
  assert.ok(profile.includes('bdHasClientPermission("settings.manage")'));
  assert.ok(profile.includes('fetch("/api/venues/logo"'));
  assert.ok(profile.includes('method:"DELETE"'));
  assert.ok(profile.includes("await t({...e"));
  assert.ok(bundle.includes('if(!await Xoe(a))throw new Error("Не удалось сохранить личные данные")'));
  assert.equal(profile.includes("role:U"), false);
});

test("legacy profile regressions stay removed", () => {
  for (const removed of ["Конкуренты рядом", "Очистить это устройство", "Очистить устройство и выйти"]) {
    assert.equal(profile.includes(removed), false, removed);
  }
});
