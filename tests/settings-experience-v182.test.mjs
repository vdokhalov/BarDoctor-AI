import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function settingsFragment(bundle) {
  const start = bundle.indexOf("/* bd-settings-v182:start */");
  const end = bundle.indexOf("/* bd-settings-v182:end */", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return bundle.slice(start, end);
}

test("Settings v182 replaces the placeholder on the independent canonical route", async () => {
  const [bundle, bootstrap] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/bardoctor-preview.js"),
  ]);
  const settings = settingsFragment(bundle);

  assert.match(bundle, /path:"\/settings",component:\(\)=>i\.jsx\(pt,\{component:bdSettingsPageV182\}\)/);
  assert.match(bundle, /path:"\/integrations",component:\(\)=>i\.jsx\(pt,\{component:bdIntegrationsPage\}\)/);
  assert.match(settings, /data-bd-settings/);
  assert.match(settings, /showBottomNav:!0/);
  assert.match(settings, /window\.bdNavigateBack\("\/more"\)/);
  assert.match(settings, /data-bd-venue-host":"settings-v182/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260815-seamless-startup-v202/);
  assert.doesNotMatch(settings, /bdIntegrationsPage|Integration Layer|OneSignal|Local Connector/);
});

test("Settings v182 uses real account, auth, session and export mechanisms", async () => {
  const [bundle, meRoute, sessionsRoute, exportRoute, auth] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("app/api/users/me/route.ts"),
    read("app/api/users/sessions/route.ts"),
    read("app/api/users/export/route.ts"),
    read("lib/bardoctor/auth.ts"),
  ]);
  const settings = settingsFragment(bundle);

  assert.match(settings, /\{user:t\}=Joe\(\)/);
  assert.match(settings, /Профиль и контактные данные/);
  assert.match(settings, /t\?\.auth\?\.canChangePassword/);
  assert.match(settings, /fetch\("\/api\/users\/sessions"/);
  assert.match(settings, /fetch\("\/api\/users\/export"/);
  assert.match(settings, /await bdLogoutSession\(\),sz\(\),yz\(\)/);
  assert.match(meRoute, /canChangePassword: Boolean\(account\.passwordHash && account\.chatgptEmail\)/);
  assert.match(sessionsRoute, /authenticateIdentityRequest\(request\)/);
  assert.match(sessionsRoute, /revokeOtherAuthenticatedSessions/);
  assert.doesNotMatch(sessionsRoute, /tokenHash/);
  assert.match(exportRoute, /scope: "personal-account-data"/);
  assert.match(exportRoute, /membershipsForAccount\(account\)/);
  assert.doesNotMatch(exportRoute, /domainData|restaurantJson:/);
  assert.match(auth, /ne\(sessions\.tokenHash, currentTokenHash\)/);
});

test("Settings v182 exposes no fake preference or unsafe account deletion controls", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const settings = settingsFragment(bundle);

  assert.match(settings, /Язык интерфейса/);
  assert.match(settings, /value:"Русский"/);
  assert.match(settings, /Тема интерфейса/);
  assert.match(settings, /value:"Светлая"/);
  assert.match(settings, /Валюта и часовой пояс настраиваются для каждого заведения/);
  assert.doesNotMatch(settings, /Удаление аккаунта|Регион и формат|MFA|Поддержка/);
  assert.doesNotMatch(settings, /\/api\/preferences|savePreference|currency:/);
});

test("Settings v182 links only real legal resources and reads canonical build metadata", async () => {
  const [bundle, css, response, appHtml, version] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/settings-v182.css"),
    read("app/bar-doctor-response.ts"),
    read("public/app.html"),
    read("lib/bardoctor/version.ts"),
  ]);
  const settings = settingsFragment(bundle);

  assert.match(settings, /Политика конфиденциальности/);
  assert.match(settings, /Условия тестирования/);
  assert.match(settings, /bdSettingsBuildVersionV182/);
  assert.match(response, /meta name="bd-app-version" content="\$\{BARDOCTOR_BUILD_VERSION\}"/);
  assert.match(response, /settings-v182\.css\?v=20260814-notifications-v184/);
  assert.match(appHtml, /meta name="bd-app-version" content="202"/);
  assert.match(version, /BARDOCTOR_BUILD_VERSION = "206"/);
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test("Settings entry is account-level and no longer gated by venue settings permission", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const hubStart = bundle.indexOf("/* bd-more-hub-v166:start */");
  const hubEnd = bundle.indexOf("/* bd-more-hub-v166:end */", hubStart);
  const hub = bundle.slice(hubStart, hubEnd);

  assert.match(hub, /\{key:"settings",icon:m\$,title:"Настройки",description:"Аккаунт, приложение и безопасность"/);
  assert.doesNotMatch(hub, /y&&\{key:"settings"/);
});

test("Settings remains reachable when legacy health records have no date", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  assert.match(bundle, /function L7\(e,t,n\)\{if\(typeof e!=="string"\)return!1;/);
  assert.match(bundle, /function BS\(e,t,n\)\{if\(typeof e!=="string"\)return!1;/);
  assert.match(bundle, /bdHealthRouteActiveV182\?zC\(/);
  assert.match(bundle, /bdHealthRouteActiveV182\?bdHealthLatestClosedMonthV153\(/);
});
