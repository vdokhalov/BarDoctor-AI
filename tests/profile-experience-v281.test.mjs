import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bundle = fs.readFileSync("public/assets/index-BQGspy0I.js", "utf8");
const css = fs.readFileSync("public/profile-v281.css", "utf8");
const html = fs.readFileSync("app/bar-doctor-response.ts", "utf8");
const navigation = fs.readFileSync("public/navigation-contract-v247.js", "utf8");
const polish = fs.readFileSync("public/modern-polish.js", "utf8");
const venueSwitcher = fs.readFileSync("public/venue-switcher.js", "utf8");
const appShell = fs.readFileSync("public/app-shell-v185.js", "utf8");
const appShellCss = fs.readFileSync("public/app-shell-v185.css", "utf8");
const start = bundle.indexOf('bdProfileVersionV282="profile-v282"');
const end = bundle.indexOf("const QI=[", start);
const profile = bundle.slice(start, end);

test("profile v282 assets and corrected routes are linked and parseable", () => {
  assert.ok(html.includes("/profile-v281.css?v=20260825-profile-v282"));
  assert.ok(start > 0 && end > start);
  assert.doesNotThrow(() => new Function(bundle));
  for (const route of ["/profile/personal", "/profile/venue", "/profile/currency"]) {
    assert.ok(bundle.includes(`path:"${route}"`), route);
    assert.ok(navigation.includes(`"${route}"`), route);
  }
  assert.ok(bundle.includes('path:"/profile",component:()=>i.jsx(pt,{component:e_e})'));
});

test("profile uses the one canonical header venue switcher with stable loading geometry", () => {
  assert.equal(profile.includes("bd-profile-venue-host-v281"), false);
  assert.equal(profile.includes("data-bd-canonical-venue-host"), false);
  assert.equal(profile.includes('i.jsx(WCe,{title:"Профиль"'), false);
  assert.ok(profile.includes("bd-profile-loading-v281"));
  assert.match(appShell, /config\.variant !== "detail" \|\| window\.location\.pathname === "\/profile"/);
  assert.match(appShell, /config\.variant === "detail" && window\.location\.pathname !== "\/profile"/);
  assert.ok(venueSwitcher.includes('inlineHost.hasAttribute("data-bd-canonical-venue-host")'));
  assert.ok(venueSwitcher.includes("context.venues.length < 2 && !profileHost"));
  assert.match(css, /min-height:\s*720px/);
});

test("user and venue cards navigate to dedicated fullscreen editors", () => {
  assert.ok(profile.includes('A("/profile/personal")'));
  assert.ok(profile.includes('A("/profile/venue")'));
  assert.ok(profile.includes('data-bd-profile-editor":"personal-v282"'));
  assert.ok(profile.includes('data-bd-profile-editor":"venue-v282"'));
  assert.equal(profile.includes("i.jsx(JCe"), false);
  assert.equal(profile.includes("i.jsx(ZCe"), false);
});

test("currency has an isolated flow and saves only the current venue currency", () => {
  assert.ok(profile.includes('A("/profile/currency")'));
  assert.ok(profile.includes('data-bd-profile-editor":"currency-v282"'));
  assert.ok(profile.includes("bdAccountingCurrencyOptionsV243().map"));
  assert.ok(profile.includes("await n({...e,currency:s})"));
});

test("fullscreen editors start at top, avoid duplicate headers and hide global navigation", () => {
  assert.ok(profile.includes('showBottomNav:!1'));
  assert.ok(profile.includes('scrollTo?.({top:0,behavior:"auto"})'));
  assert.ok(profile.includes("document.activeElement instanceof HTMLElement"));
  assert.equal(profile.includes("autoFocus"), false);
  assert.equal(profile.includes("bdProfileEditorHeaderV281"), false);
  assert.match(css, /height:\s*calc\(100dvh - var\(--bd-header-total\)\) !important/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(appShellCss, /fullscreen-owned[\s\S]*display:\s*none !important/);
  assert.match(css, /body\.bd-profile-editor-active-v281 \.bd-scroll-top/);
  assert.ok(polish.includes("bd-profile-editor-active-v281"));
});

test("shared UserAvatar supports server image, stable fallback and upload replacement or removal", () => {
  assert.ok(profile.includes("function bdUserAvatarV282"));
  assert.ok(profile.includes('"/api/users/avatar/"+e.avatarId'));
  assert.ok(profile.includes('fetch("/api/users/avatar"'));
  assert.ok(profile.includes('method:"DELETE"'));
  assert.ok(profile.includes('avatarId:_'));
  assert.ok(profile.includes('children:e.avatarId||d?"Заменить фото":"Загрузить фото"'));
  assert.ok(profile.includes('children:"Удалить"'));
  assert.match(css, /\.bd-user-avatar-v282\s*\{/);
  assert.match(css, /width:\s*var\(--bd-user-avatar-size/);
  assert.match(css, /object-fit:\s*cover/);
  assert.equal(profile.includes("Фото профиля пока не используется"), false);
});

test("editors preserve server authority, RBAC and venue logo persistence", () => {
  assert.ok(profile.includes('bdHasClientPermission("settings.manage")'));
  assert.ok(profile.includes('fetch("/api/venues/logo"'));
  assert.ok(profile.includes("await t({...e"));
  assert.ok(bundle.includes('if(!await Xoe(a))throw new Error("Не удалось сохранить личные данные")'));
  assert.equal(profile.includes("role:U"), false);
});

test("legacy profile regressions stay removed", () => {
  for (const removed of ["Конкуренты рядом", "Очистить это устройство", "Очистить устройство и выйти"]) {
    assert.equal(profile.includes(removed), false, removed);
  }
});
