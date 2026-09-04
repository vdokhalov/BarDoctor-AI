/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, devices } = require("playwright-core");
const { chromiumArgs, resolveBrowserExecutable } = require("./browser-runtime.cjs");

const baseUrl = process.env.BD_QA_BASE_URL || "http://127.0.0.1:4176";
const outputDir = process.env.BD_QA_OUTPUT || "/tmp/bardoctor-startup-v357-qa";
fs.mkdirSync(outputDir, { recursive: true });

const session = {
  email: "startup-recovery-qa@bardoctor.local",
  token: "startup-recovery-qa-token",
  userId: "startup-recovery-qa-user",
};
const venue = {
  id: 901,
  workspaceId: "startup-recovery-qa",
  name: "Кёльн",
  role: "owner",
  permissions: ["finance.view", "team.view", "settings.manage"],
  status: "active",
  isPrimary: true,
};

function response(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

async function configureContext(context) {
  await context.addInitScript(({ currentSession, activeVenue }) => {
    localStorage.setItem("bd_session", currentSession.email);
    localStorage.setItem("bd_session_token", currentSession.token);
    localStorage.setItem("bd_session_userid", currentSession.userId);
    localStorage.setItem("bd_active_venue_id", String(activeVenue.id));
    localStorage.setItem("bd_active_venue_is_primary", "1");
    localStorage.setItem("bd_active_role", "owner");
    localStorage.setItem("bd_active_permissions", JSON.stringify(activeVenue.permissions));
  }, { currentSession: session, activeVenue: venue });

  await context.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/bootstrap") {
      return route.fulfill(response({
        ok: true,
        ...session,
        role: "owner",
        permissions: venue.permissions,
        activeVenueId: venue.id,
        activeWorkspaceId: venue.workspaceId,
        activeVenueIsPrimary: true,
        canCreateVenues: true,
        venues: [venue],
        bootstrap: {
          state: "ready",
          reason: "active_venue_ready",
          membershipsLoaded: true,
          venuesLoaded: true,
          activeVenueRestored: false,
          accessibleVenueCount: 1,
          confirmedOwnedVenueCount: 1,
          inaccessibleOwnedVenueCount: 0,
        },
      }));
    }
    if (url.pathname === "/api/restaurants/me") {
      return route.fulfill(response({
        ok: true,
        restaurant: {
          id: "startup-recovery-qa-venue",
          name: venue.name,
          businessType: "Бар",
          city: "Бендеры",
          region: "Центр",
          country: "Молдова",
          currency: "RUB",
          seats: 100,
          employees: 17,
          areas: [],
          workingDays: {},
        },
      }));
    }
    if (url.pathname === "/api/business-health") {
      return route.fulfill(response({ ok: true, snapshot: null, state: "insufficient_data" }));
    }
    if (url.pathname === "/api/store") return route.fulfill(response({ ok: true, entries: {} }));
    if (url.pathname.startsWith("/api/store/")) return route.fulfill(response({ ok: true, data: [] }));
    if (url.pathname === "/api/client-runtime-diagnostic") return route.fulfill(response({ ok: true }));
    return route.fulfill(response({ ok: true }));
  });
}

async function runSuccessfulHandoff(browser) {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ru-RU",
    timezoneId: "Europe/Chisinau",
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await configureContext(context);

  let bundleRequests = 0;
  let bundleReleasedAt = 0;
  await context.route("**/assets/index-BQGspy0I.js?*", async (route) => {
    bundleRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 700));
    bundleReleasedAt = Date.now();
    return route.continue();
  });

  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  await page.goto(`${baseUrl}/home`, { waitUntil: "commit", timeout: 60_000 });
  const splash = page.locator('[data-bd-static-startup="v201"]');
  await splash.waitFor({ state: "visible", timeout: 5_000 });
  await page.screenshot({ path: path.join(outputDir, "01-launch.png"), fullPage: false });

  const home = page.locator('[data-bd-home-page="v151"]');
  try {
    await home.waitFor({ state: "visible", timeout: 15_000 });
  } catch (error) {
    await page.screenshot({ path: path.join(outputDir, "01-timeout.png"), fullPage: false });
    console.error(JSON.stringify(await page.evaluate(() => ({
      path: window.location.pathname,
      startupPending: document.documentElement.getAttribute("data-bd-startup-pending"),
      startupRecovery: document.querySelector("[data-bd-startup-recovery]")?.getAttribute("data-bd-startup-recovery") || null,
      rootText: document.getElementById("root")?.textContent?.slice(0, 1000) || "",
      bodyText: document.body.textContent?.slice(0, 1000) || "",
    })), null, 2));
    console.error(runtimeErrors.join("\n"));
    throw error;
  }
  await splash.waitFor({ state: "hidden", timeout: 5_000 });
  const elapsedMs = Date.now() - bundleReleasedAt;
  await page.screenshot({ path: path.join(outputDir, "02-home.png"), fullPage: false });

  assert.ok(bundleRequests >= 1, "application bundle was not requested");
  assert.ok(elapsedMs < 5_000, `startup handoff exceeded the 5 second QA ceiling: ${elapsedMs}ms`);
  assert.equal(await page.locator('[data-bd-startup-recovery]').count(), 0, "recovery UI appeared during a successful launch");
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-bd-startup-pending")), false);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor === "rgb(255, 255, 255)"), false, "white transition frame remained after startup");
  assert.deepEqual(runtimeErrors, [], `runtime errors during successful startup:\n${runtimeErrors.join("\n")}`);
  await context.close();
  return { elapsedMs, bundleRequests };
}

async function runFailureRecovery(browser) {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ru-RU",
    timezoneId: "Europe/Chisinau",
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await configureContext(context);

  let blockedBundleRequests = 0;
  let documentRequests = 0;
  await context.route("**/home", (route) => {
    documentRequests += 1;
    return route.continue();
  });
  await context.route("**/assets/index-BQGspy0I.js?*", (route) => {
    blockedBundleRequests += 1;
    return route.abort("failed");
  });

  const page = await context.newPage();
  await page.goto(`${baseUrl}/home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const recovery = page.locator('[data-bd-startup-recovery="shell-first-startup-v397"]');
  await recovery.waitFor({ state: "visible", timeout: 5_000 });
  await page.screenshot({ path: path.join(outputDir, "03-recovery.png"), fullPage: false });
  assert.match(await recovery.textContent(), /BarDoctor не завершил загрузку.*Обновить приложение/s);
  assert.equal(blockedBundleRequests, 2, "startup made requests beyond preload plus the one application load");
  assert.equal(documentRequests, 1, "startup reloaded the document automatically");
  assert.deepEqual(await page.evaluate(() => ({
    email: localStorage.getItem("bd_session"),
    token: localStorage.getItem("bd_session_token"),
    userId: localStorage.getItem("bd_session_userid"),
  })), session);
  await context.close();
  return { blockedBundleRequests, documentRequests, sessionPreserved: true };
}

(async () => {
  const browserPath = await resolveBrowserExecutable(process.env.BD_QA_BROWSER);
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [...chromiumArgs, "--no-proxy-server", "--disable-dev-shm-usage"],
  });
  try {
    const successfulHandoff = await runSuccessfulHandoff(browser);
    const failureRecovery = await runFailureRecovery(browser);
    console.log(JSON.stringify({ ok: true, profile: "iphone-13", outputDir, successfulHandoff, failureRecovery }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});