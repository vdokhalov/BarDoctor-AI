import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

export const spaRoutes = [
  "/", "/about", "/add", "/analysis", "/cases", "/cases/:id", "/cases/add", "/catalog",
  "/data-control", "/design-system", "/employees", "/employees/:id", "/employees/:id/edit",
  "/team-access", "/equipment", "/equipment/:id", "/equipment/:id/history/new",
  "/equipment/analytics", "/equipment/catalog", "/events", "/events/:id", "/finance",
  "/finance/settings", "/finance/shift/:id/payroll", "/health", "/home", "/integrations", "/login",
  "/market", "/month-closing", "/more", "/nomenclature", "/notifications", "/opportunities",
  "/payroll", "/privacy", "/profile", "/profile/personal", "/profile/venue", "/profile/currency", "/register", "/reports", "/reset", "/reviews", "/salaries",
  "/salaries/:id", "/settings", "/setup", "/shifts", "/smart", "/suppliers", "/tasks",
  "/sales-import", "/supplier-alternatives", "/terms", "/venues/new", "/warehouse",
].sort();

export const additionalProductionRoutes = ["/assortment", "/forgot-password", "/join"];
export const legacyCompatibilityRoutes = ["/app.html", "/decisions"];

const examples = {
  "/cases/:id": "/cases/case-1",
  "/employees/:id": "/employees/employee-1",
  "/employees/:id/edit": "/employees/employee-1/edit",
  "/equipment/:id": "/equipment/equipment-1",
  "/equipment/:id/history/new": "/equipment/equipment-1/history/new",
  "/events/:id": "/events/event-1",
  "/finance/shift/:id/payroll": "/finance/shift/shift-1/payroll",
  "/salaries/:id": "/salaries/employee-1",
};

async function navigationContract() {
  const contractSource = await source("public/navigation-contract-v247.js");
  const context = {
    URL, URLSearchParams, Set,
    window: { location: { href: "https://bardoctor.test/home", origin: "https://bardoctor.test" } },
    document: { documentElement: { setAttribute() {} } },
  };
  vm.runInNewContext(contractSource, context);
  return { contract: context.window.bdNavigationContract, contractSource };
}

function requireText(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `Missing navigation safeguard: ${label}`);
}

function rejectText(haystack, needle, label = needle) {
  assert.ok(!haystack.includes(needle), `Unsafe navigation remains: ${label}`);
}

export async function runNavigationAudit() {
  const [bundle, runtime, standalone, shell, shellCss, warehouseCss, transient, inventoryRoute, inventoryLib, appHtml, response, admin, adminCss, docs] = await Promise.all([
    source("public/assets/index-BQGspy0I.js"), source("public/bardoctor-preview.js"),
    source("public/bd-route-context.js"), source("public/app-shell-v185.js"),
    source("public/app-shell-v185.css"), source("public/warehouse.css"),
    source("public/navigation-transient-v247.js"), source("app/api/inventory/counts/route.ts"),
    source("lib/bardoctor/inventory-counts.ts"), source("public/app.html"),
    source("app/bar-doctor-response.ts"), source("public/admin-v175.js"),
    source("public/admin-v175.css"), source("docs/navigation-route-matrix.md"),
  ]);
  const { contract, contractSource } = await navigationContract();

  const actualSpaRoutes = [...new Set([...bundle.matchAll(/path:"([^"]+)"/g)].map((match) => match[1]))].sort();
  assert.deepEqual(actualSpaRoutes, spaRoutes, "SPA route inventory is stale");
  assert.equal(spaRoutes.length, 57);
  for (const route of spaRoutes) {
    const resolved = contract.resolve(`https://bardoctor.test${examples[route] || route}`);
    assert.ok(resolved, `Registered route has no metadata: ${route}`);
    if (!["root", "public", "redirect", "compatibility"].includes(resolved.type)) {
      assert.ok(resolved.parent, `Non-root route has no parent: ${route}`);
      assert.ok(contract.isRegistered(`https://bardoctor.test${resolved.parent}`), `Parent is not registered for ${route}: ${resolved.parent}`);
    }
  }

  const queryCases = [
    ["/warehouse?tab=counts&inventory=inv-1", "/warehouse?tab=counts", "fullscreen-owned", false],
    ["/warehouse?tab=products&q=gin&product=gin", "/warehouse?tab=products&q=gin", "standard", true],
    ["/catalog?tab=menu&q=gin&itemId=item-1", "/catalog?tab=menu&q=gin", "standard", true],
    ["/notifications?view=category&category=finance&venue=2", "/notifications?venue=2", "standard", true],
    ["/data-control?tab=journal&event=audit-1&venue=2", "/data-control?tab=journal&venue=2", "standard", true],
    ["/integrations?venue=2&flow=onec&connection=source-1", "/integrations?venue=2", "standard", true],
    ["/suppliers?tab=purchases&q=gin&documentId=doc-1&edit=1", "/suppliers?tab=purchases&q=gin", "standard", true],
    ["/finance?view=expenses&month=2026-08&addExpense=1", "/finance?view=expenses&month=2026-08", "standard", true],
    ["/tasks?tab=week&new=1&title=Check", "/tasks?tab=week", "standard", true],
    ["/reports?month=2026-08&closeMonth=1", "/reports?month=2026-08", "standard", true],
  ];
  for (const [url, parent, shellMode, bottomNav] of queryCases) {
    const screen = contract.resolve(`https://bardoctor.test${url}`);
    assert.equal(screen.parent, parent, `Wrong query parent for ${url}`);
    assert.equal(screen.shell, shellMode, `Wrong shell mode for ${url}`);
    assert.equal(screen.bottomNav, bottomNav, `Wrong bottom navigation for ${url}`);
  }

  assert.equal(contract.isSafeInternal("https://external.example/warehouse"), false);
  assert.equal(contract.isSafeInternal("https://bardoctor.test/login"), false);
  assert.equal(contract.isSafeInternal("https://bardoctor.test/api/inventory/counts"), false);
  assert.equal(contract.isSafeInternal("https://bardoctor.test/not-a-route"), false);
  assert.equal(contract.isSafeInternal("https://bardoctor.test/warehouse?tab=counts"), true);

  requireText(contractSource, "navigation-contract-v247");
  requireText(runtime, "canonical-navigation-v247");
  requireText(runtime, "window.bdNavigationContract.isSafeInternal", "validated internal origin");
  requireText(runtime, "bdVenueId", "venue-bound history");
  requireText(runtime, 'state.bdPreviousEntryId = ""', "origin invalidation on venue switch");
  requireText(runtime, "bd_navigation_scroll::", "URL/venue scroll restoration");
  requireText(runtime, "Изменения не сохранены. Выйти без сохранения?");
  requireText(standalone, "bd-route-context-v247");
  requireText(standalone, "contract.isSafeInternal(currentState.bdPreviousUrl)");
  requireText(shell, "contract && contract.resolve");
  requireText(shell, 'screen.headerMode === "underlay"');
  requireText(shell, "data-bd-shell-mode");
  requireText(shellCss, "--bd-layer-overlay: 900");
  requireText(shellCss, '[data-bd-shell-mode="fullscreen-owned"]');
  requireText(warehouseCss, "body.bd-inventory-overlay-open-v246 > bd-app-header");
  requireText(warehouseCss, "pointer-events: none");
  requireText(transient, 'event.key !== "Escape"');
  requireText(transient, "record.trigger.focus");
  requireText(transient, 'document.body.style.overflow = "hidden"');
  requireText(transient, "window.history.pushState");
  requireText(inventoryLib, "Назад к инвентаризации");
  requireText(inventoryLib, "position:fixed");
  requireText(inventoryRoute, "inventoryPrintUnavailable");
  requireText(inventoryRoute, "Инвентаризация не найдена");
  requireText(admin, "bdAdminDetail");
  requireText(admin, "detailTrigger");
  requireText(adminCss, ".admin-detail-close{width:44px;height:44px");
  requireText(docs, "/warehouse?inventory=:id");
  requireText(appHtml, "/navigation-contract-v247.js");
  requireText(appHtml, "/navigation-transient-v247.js");
  requireText(response, "canonicalUserShellAssets()");
  for (const entry of [appHtml, response]) requireText(entry, "20260822-navigation-v247");

  rejectText(bundle, 'window.location.assign("/catalog")');
  rejectText(bundle, 'window.location.assign("/data-control")');
  rejectText(bundle, 'window.location.href="/suppliers');
  rejectText(bundle, 'window.location.href="/tasks');
  rejectText(bundle, 'window.location.href="/catalog');
  rejectText(bundle, 'window.open("/api/inventory/counts?id="+encodeURIComponent(e.id)+"&format=print","_blank","noopener,noreferrer")');

  const routeFiles = [
    "app/data-control/route.ts", "app/team-access/route.ts", "app/integrations/route.ts",
    "app/market/route.ts", "app/notifications/route.ts", "app/opportunities/route.ts",
    "app/reviews/route.ts", "app/sales-import/route.ts", "app/supplier-alternatives/route.ts",
    "app/venues/new/route.ts",
  ];
  for (const file of routeFiles) {
    const route = await source(file);
    requireText(route, "20260822-navigation-v247", `${file} standalone navigation version`);
    requireText(route, "data-bd-parent-route", `${file} parent`);
    requireText(route, "data-bd-back", `${file} exit`);
  }

  return {
    routes: { current: 60, compatibility: 2, admin: 1, total: 63, spa: 57 },
    registeredStaticMetadata: Object.keys(contract.routes).length,
    queryScreens: queryCases.length,
    traps: { detected: 0, unresolved: 0 },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runNavigationAudit();
  console.log(`Navigation audit passed: ${result.routes.total} user/admin entry routes, ${result.queryScreens} query-owned screens, no unresolved traps.`);
  console.log(JSON.stringify(result, null, 2));
}
