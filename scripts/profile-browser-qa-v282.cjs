/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { chromiumArgs, resolveBrowserExecutable } = require("./browser-runtime.cjs");

const baseUrl = process.env.BD_QA_BASE_URL || "http://127.0.0.1:4174";
const outputDir = process.env.BD_QA_OUTPUT || "/tmp/bardoctor-profile-v282-qa";
const avatarPath = path.resolve(process.cwd(), "public/icons/bardoctor-v159-apple-180.png");
fs.mkdirSync(outputDir, { recursive: true });

const permissions = ["settings.manage", "access.manage", "finance.view", "team.view"];
const venues = [
  { id: 901, workspaceId: "profile-qa", name: "Кёльн", role: "owner", permissions, status: "active", isPrimary: true },
  { id: 902, workspaceId: "profile-qa", name: "Длинное название второго заведения", role: "manager", permissions, status: "active", isPrimary: false },
];

function venueProfile(id) {
  return id === 902
    ? { id: "secondary", name: "Длинное название второго заведения", businessType: "Кафе", city: "Кишинёв", region: "Центр", country: "Молдова", currency: "MDL", seats: 48, employees: 9, areas: [], workingDays: {} }
    : { id: "primary", name: "Кёльн", businessType: "Бар", city: "Бендеры", region: "Центр", country: "Молдова", currency: "RUB", seats: 100, employees: 17, areas: [], workingDays: {} };
}

function response(body, status = 200, contentType = "application/json") {
  return { status, contentType, body: contentType === "application/json" ? JSON.stringify(body) : body };
}

async function runProfile(browser, label, viewport) {
  const state = { activeVenueId: 901, avatarId: null, user: { firstName: "Виталий", lastName: "Дохалов", phone: "+373 77822595" } };
  const context = await browser.newContext({ viewport, locale: "ru-RU", timezoneId: "Europe/Chisinau", colorScheme: "light", reducedMotion: "reduce", isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });
  const errors = [];
  await context.addInitScript(({ allowed, venueList }) => {
    const email = "profile-qa@bardoctor.local";
    localStorage.setItem("bd_session", email);
    localStorage.setItem("bd_session_token", "profile-qa-token");
    localStorage.setItem("bd_session_userid", "profile-qa-user");
    localStorage.setItem("bd_active_venue_id", "901");
    localStorage.setItem("bd_active_venue_is_primary", "1");
    localStorage.setItem("bd_active_role", "owner");
    localStorage.setItem("bd_active_permissions", JSON.stringify(allowed));
    localStorage.setItem("bd_venue_context__" + email, JSON.stringify({ activeVenueId: 901, activeWorkspaceId: "profile-qa", canCreateVenues: true, venues: venueList }));
  }, { allowed: permissions, venueList: venues });
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.pathname === "/api/auth/bootstrap") return route.fulfill(response({ ok: true, email: "profile-qa@bardoctor.local", userId: "profile-qa-user", token: "profile-qa-token", firstName: state.user.firstName, lastName: state.user.lastName, phone: state.user.phone, avatarId: state.avatarId, role: state.activeVenueId === 902 ? "manager" : "owner", permissions, activeVenueId: state.activeVenueId, activeWorkspaceId: "profile-qa", activeVenueIsPrimary: state.activeVenueId === 901, canCreateVenues: true, venues, bootstrap: { state: "ready", reason: "active_venue_ready", membershipsLoaded: true, venuesLoaded: true, activeVenueRestored: false, accessibleVenueCount: 2, confirmedOwnedVenueCount: 2, inaccessibleOwnedVenueCount: 0 } }));
    if (url.pathname === "/api/users/me" && method === "GET") return route.fulfill(response({ ok: true, user: { ...state.user, email: "vitaliy@example.com", avatarId: state.avatarId, role: state.activeVenueId === 902 ? "manager" : "owner", permissions, auth: { method: "password", canChangePassword: true }, activeVenueId: state.activeVenueId, activeWorkspaceId: "profile-qa", activeVenueIsPrimary: state.activeVenueId === 901, canCreateVenues: true, venues } }));
    if (url.pathname === "/api/users/me" && method === "PATCH") { Object.assign(state.user, request.postDataJSON()); return route.fulfill(response({ ok: true })); }
    if (url.pathname === "/api/restaurants/me") return route.fulfill(response({ ok: true, restaurant: venueProfile(state.activeVenueId) }));
    if (url.pathname === "/api/access/active-venue" && method === "POST") { state.activeVenueId = Number(request.postDataJSON().venueId); return route.fulfill(response({ ok: true, activeVenueId: state.activeVenueId, activeWorkspaceId: "profile-qa", activeVenueIsPrimary: state.activeVenueId === 901, role: state.activeVenueId === 902 ? "manager" : "owner", permissions })); }
    if (url.pathname === "/api/users/avatar" && method === "POST") { state.avatarId = "avatar-profile-qa-1234567890"; return route.fulfill(response({ ok: true, avatar: { id: state.avatarId, mimeType: "image/png", size: 1024 } })); }
    if (url.pathname === `/api/users/avatar/${state.avatarId}` && method === "GET") return route.fulfill(response(fs.readFileSync(avatarPath), 200, "image/png"));
    if (url.pathname.startsWith("/api/users/avatar/") && method === "DELETE") { state.avatarId = null; return route.fulfill(response({ ok: true, avatarId: null })); }
    if (url.pathname === "/api/users/sessions") return route.fulfill(response({ ok: true, sessions: [{ id: "current", current: true }] }));
    if (url.pathname === "/api/store") return route.fulfill(response({ ok: true, entries: {} }));
    if (url.pathname === "/api/migrate") return route.fulfill(response({ ok: true, imported: [], skipped: [] }));
    return route.fulfill(response({ ok: true }));
  });

  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ""}`));

  await page.goto(`${baseUrl}/profile`, { waitUntil: "networkidle" });
  await page.locator('[data-bd-profile="profile-v282"]').waitFor({ state: "visible" });
  assert.equal(await page.locator('[data-bd-venue-trigger]').count(), 1, `${label}: duplicate venue switcher`);
  assert.equal(await page.locator('text=Конкуренты рядом').count(), 0);
  assert.equal(await page.locator('text=Очистить данные этого устройства').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${label}: profile horizontal overflow`);
  await page.screenshot({ path: path.join(outputDir, `${label}-profile-top.png`), fullPage: true });

  await page.locator('[data-bd-venue-trigger]').click();
  await page.getByText("Длинное название второго заведения", { exact: true }).last().click();
  await page.getByText("MDL", { exact: true }).waitFor();
  assert.ok((await page.locator("body").innerText()).includes("Управляющий · Длинное название второго заведения"));
  await page.screenshot({ path: path.join(outputDir, `${label}-profile-switched.png`), fullPage: true });

  await page.getByText("Личные данные", { exact: true }).click();
  await page.locator('[data-bd-profile-editor="personal-v282"]').waitFor({ state: "visible" });
  const personalGeometry = await page.evaluate(() => {
    const header = document.querySelector("bd-app-header")?.getBoundingClientRect();
    const editor = document.querySelector('[data-bd-profile-editor="personal-v282"]')?.getBoundingClientRect();
    const avatar = document.querySelector(".bd-profile-avatar-editor-v281")?.getBoundingClientRect();
    return { scrollTop: document.querySelector("[data-bd-app-main]")?.scrollTop || 0, headerBottom: header?.bottom || 0, editorTop: editor?.top || 0, avatarTop: avatar?.top || 0 };
  });
  assert.equal(personalGeometry.scrollTop, 0);
  assert.ok(personalGeometry.editorTop <= personalGeometry.headerBottom + 2, `${label}: duplicated editor header gap`);
  assert.ok(personalGeometry.avatarTop - personalGeometry.headerBottom < 48, `${label}: personal top gap too large`);
  assert.equal(await page.locator('#bd-canonical-bottom-nav:visible, nav[data-bd-bottom-nav]:visible').count(), 0);
  assert.equal(await page.locator('.bd-scroll-top:visible').count(), 0);
  await page.screenshot({ path: path.join(outputDir, `${label}-personal-initial.png`), fullPage: true });

  if (viewport.width < 700) {
    await page.locator('input[type="file"]').setInputFiles(avatarPath);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await page.locator('[data-bd-profile="profile-v282"]').waitFor({ state: "visible" });
    assert.equal(await page.locator('.bd-profile-user-v280 .bd-user-avatar-v282 img').count(), 1, `${label}: avatar not shown after save`);
    await page.screenshot({ path: path.join(outputDir, `${label}-profile-avatar.png`), fullPage: true });

    await page.locator('.bd-profile-venue-head-v280').click();
    await page.locator('[data-bd-profile-editor="venue-v282"]').waitFor({ state: "visible" });
    const venueGeometry = await page.evaluate(() => {
      const header = document.querySelector("bd-app-header")?.getBoundingClientRect();
      const logo = document.querySelector(".bd-venue-logo-editor-v281")?.getBoundingClientRect();
      return { scrollTop: document.querySelector("[data-bd-app-main]")?.scrollTop || 0, headerBottom: header?.bottom || 0, logoTop: logo?.top || 0 };
    });
    assert.equal(venueGeometry.scrollTop, 0);
    assert.ok(venueGeometry.logoTop - venueGeometry.headerBottom < 48, `${label}: venue top gap too large`);
    await page.screenshot({ path: path.join(outputDir, `${label}-venue-initial.png`), fullPage: true });
    await page.getByLabel("Регион / район").focus();
    await page.setViewportSize({ width: viewport.width, height: 520 });
    await page.getByLabel("Регион / район").scrollIntoViewIfNeeded();
    assert.equal(await page.getByLabel("Регион / район").isVisible(), true);
    assert.equal(await page.locator('bd-app-header').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${label}: editor horizontal overflow`);
    await page.screenshot({ path: path.join(outputDir, `${label}-venue-keyboard.png`), fullPage: false });
  }

  assert.deepEqual(errors, [], `${label}: runtime errors\n${errors.join("\n")}`);
  await context.close();
}

(async () => {
  const browserPath = await resolveBrowserExecutable(process.env.BD_QA_BROWSER);
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [...chromiumArgs, "--no-proxy-server", "--disable-dev-shm-usage"],
  });
  try {
    await runProfile(browser, "mobile-390", { width: 390, height: 844 });
    await runProfile(browser, "mobile-320", { width: 320, height: 700 });
    await runProfile(browser, "desktop-1366", { width: 1366, height: 900 });
    console.log(JSON.stringify({ ok: true, viewports: ["390x844", "320x700", "1366x900"], outputDir }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
