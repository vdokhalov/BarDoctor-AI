import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

export const legacyTopLevelHeaderFamilies = [
  "access-header",
  "bd-assortment-header-v170",
  "bd-catalog-header",
  "bd-eq-detail-header-v167",
  "bd-eq-header-v167",
  "bd-finance-header-v160",
  "bd-home-header",
  "bd-more-header-v166",
  "bd-payroll-header-v164",
  "bd-proc-header-v168",
  "bd-procurement-header",
  "bd-settings-header-v182",
  "bd-shifts-header",
  "bd-team-header",
  "bd-team-module-header-v163",
  "integration-header",
  "market-topbar",
  "notification-header",
  "opportunity-topbar",
  "push-topbar",
  "topbar",
  "trust-header",
  "venue-topbar",
];

export async function runHeaderSystemAudit() {
  const [shell, css, bundle, response, preview, venue, ...routes] = await Promise.all([
    source("public/app-shell-v185.js"),
    source("public/app-shell-v185.css"),
    source("public/assets/index-BQGspy0I.js"),
    source("app/bar-doctor-response.ts"),
    source("public/bardoctor-preview.js"),
    source("public/venue-switcher.js"),
    ...[
      "app/market/route.ts",
      "app/opportunities/route.ts",
      "app/data-control/route.ts",
      "app/team-access/route.ts",
      "app/integrations/route.ts",
      "app/notifications/route.ts",
      "app/reviews/route.ts",
      "app/sales-import/route.ts",
      "app/supplier-alternatives/route.ts",
      "app/venues/new/route.ts",
    ].map(source),
  ]);

  assert.equal(legacyTopLevelHeaderFamilies.length, 23);
  assert.match(shell, /class BdAppHeader extends HTMLElement/);
  assert.match(shell, /customElements\.define\("bd-app-header", BdAppHeader\)/);
  assert.match(shell, /variants: \["root", "module", "detail"\]/);
  assert.match(shell, /window\.bdUserRouteInventoryV247/);
  assert.match(css, /--bd-safe-top: env\(safe-area-inset-top, 0px\)/);
  assert.match(css, /--bd-safe-bottom: env\(safe-area-inset-bottom, 0px\)/);
  assert.match(css, /min-width: 44px/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /\[data-bd-legacy-header="true"\] \{ display: none !important; \}/);
  assert.match(css, /\[data-bd-tabs="canonical-v247"\]/);
  assert.match(css, /--bd-layer-overlay: 900/);
  assert.match(css, /data-bd-shell-mode="fullscreen-owned"/);
  assert.match(response, /canonicalUserShellAssets\(\)/);
  assert.match(preview, /window\.bdNavigateBack = function/);
  assert.match(preview, /window\.bdNavigate = function/);
  assert.match(preview, /bdDispatchNavigationChange/);
  assert.match(preview, /var standaloneRoutes = \["\/forgot-password"\]/);
  assert.match(venue, /\[data-bd-canonical-venue-host\]/);
  assert.match(bundle, /bdEmbeddedPagePaths=.*"\/reviews".*"\/sales-import".*"\/supplier-alternatives".*"\/venues\/new"/s);
  assert.match(bundle, /component:\(\)=>i\.jsx\(pt,\{component:bdReviewsPage\}\)/);

  routes.forEach((route) => {
    assert.match(route, /canonicalUserShellAssets\(\)/);
    assert.match(route, /embedded/i);
    assert.match(route, /barDoctorResponse\(\)/);
  });

  return {
    legacyTopLevelHeaderFamilies: legacyTopLevelHeaderFamilies.length,
    canonicalHeaderComponents: 1,
    variants: ["root", "module", "detail"],
    standaloneProductRoutesInSpaShell: routes.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(await runHeaderSystemAudit(), null, 2));
}
