import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export const spaRoutes = [
  "/", "/about", "/add", "/analysis", "/cases", "/cases/:id", "/cases/add",
  "/catalog", "/data-control", "/design-system", "/employees", "/employees/:id", "/employees/:id/edit", "/team-access",
  "/equipment", "/equipment/:id", "/equipment/:id/history/new", "/equipment/analytics",
  "/equipment/catalog", "/events", "/events/:id", "/finance", "/finance/settings",
  "/finance/shift/:id/payroll", "/health", "/home", "/integrations", "/login",
  "/market", "/month-closing", "/more", "/nomenclature", "/notifications", "/opportunities", "/payroll",
  "/privacy", "/profile", "/register", "/reports", "/reset", "/reviews", "/salaries",
  "/salaries/:id", "/settings", "/setup", "/shifts", "/smart", "/suppliers", "/tasks",
  "/sales-import", "/supplier-alternatives", "/terms", "/venues/new", "/warehouse",
].sort();

export const additionalProductionRoutes = [
  "/assortment",
  "/forgot-password",
  "/join",
];

export const legacyCompatibilityRoutes = ["/app.html", "/decisions"];

export const auditedModules = [
  "Главная", "Смены", "Финансы", "Команда", "Ещё", "Товары", "Номенклатура", "Склад", "Закупки",
  "Накладные", "Продажи", "Техкарты", "Инвентаризации", "Списания", "Расходы",
  "Сотрудники", "Зарплаты", "Отчёты", "Поставщики", "Конкуренты", "Календарь",
  "Интеграции", "Настройки", "Профиль", "Управление заведениями", "Multi-venue",
  "AI/диагностика", "Оборудование", "Происшествия", "Дела", "Поручения",
  "Уведомления", "Контроль данных", "Роли и доступ", "Возможности/рынок", "Закрытие месяца",
];

const resolvedDefects = {
  backAndHeader: [
    "shared-accounting-back", "warehouse-parent", "reports-parent", "salaries-parent",
    "integrations-parent", "reviews-parent", "profile-back", "payroll-rules-back",
    "analysis-back", "shift-payroll-back", "equipment-catalog-back", "equipment-detail-back",
    "equipment-history-back", "equipment-analytics-back", "case-detail-back", "event-detail-back",
    "suppliers-back", "catalog-back", "about-back", "health-back", "add-close", "smart-close",
    "case-create-close", "equipment-list-back", "tasks-list-back", "events-list-back",
    "cases-list-back", "generic-raw-history-back", "shifts-root-back", "finance-root-back",
  ],
  architecture: [
    "top-level-history-chain", "spa-direct-link-fallback", "standalone-direct-link-fallback",
    "cross-venue-previous-context", "scroll-restoration",
  ],
  contextPreservation: [
    "shifts-context", "finance-context", "warehouse-context", "reports-context",
    "salaries-context", "salary-detail-context", "employees-context", "cases-context",
    "events-context", "suppliers-context", "catalog-context", "equipment-context", "tasks-context",
  ],
  safetyAndAccessibility: ["dirty-form-discard", "back-touch-target"],
  duplicateControls: [
    "warehouse-bottom-navigation",
    "market-header-home",
    "data-control-bottom-navigation",
    "integrations-embedded-bottom-navigation",
  ],
};

function requireText(source, needle, label = needle) {
  assert.ok(source.includes(needle), `Missing navigation contract: ${label}`);
}

function rejectText(source, needle, label = needle) {
  assert.ok(!source.includes(needle), `Obsolete navigation contract remains: ${label}`);
}

async function source(relativePath) {
  return readFile(new URL(relativePath, pathToFileURL(`${projectRoot}/`)), "utf8");
}

export async function runNavigationAudit() {
  const [
    bundle, bootstrap, standalone, css, shellCss, shell, response, market, integrations, assortment,
    salesCss, notificationsCss, venueCss, supplierAlternativesCss, recoveryCss,
  ] = await Promise.all([
    source("public/assets/index-BQGspy0I.js"),
    source("public/bardoctor-preview.js"),
    source("public/bd-route-context.js"),
    source("public/navigation.css"),
    source("public/app-shell-v185.css"),
    source("public/app-shell-v185.js"),
    source("app/bar-doctor-response.ts"),
    source("app/market/route.ts"),
    source("app/integrations/route.ts"),
    source("app/assortment/route.ts"),
    source("public/sales-import.css"),
    source("public/notifications.css"),
    source("public/venue-create.css"),
    source("public/supplier-alternatives.css"),
    source("app/forgot-password/forgot-password.css"),
  ]);

  const actualSpaRoutes = [...new Set([...bundle.matchAll(/path:\"([^\"]+)\"/g)].map((match) => match[1]))].sort();
  assert.deepEqual(actualSpaRoutes, spaRoutes, "The audited SPA route inventory is stale");
  assert.equal(spaRoutes.length, 54);
  assert.equal(spaRoutes.length + additionalProductionRoutes.length, 57);
  assert.equal(spaRoutes.length + additionalProductionRoutes.length + legacyCompatibilityRoutes.length, 59);

  requireText(bootstrap, 'window.location.pathname === "/join"', "invite route");
  requireText(bootstrap, 'window.location.pathname === "/decisions"', "legacy decisions route");
  requireText(bootstrap, 'window.location.pathname === "/app.html"', "legacy app.html route");
  requireText(assortment, 'new URL("/catalog"', "assortment alias");

  requireText(bootstrap, 'var bdNavigationVersion = "canonical-navigation-v185"');
  requireText(bootstrap, "window.bdNavigateBack = function");
  requireText(bootstrap, "window.bdLogicalParentRoute = bdLogicalParentRoute");
  requireText(bootstrap, "window.bdLogicalParentUrl = bdLogicalParentUrl");
  requireText(bootstrap, "function bdQueryParentUrl(value)");
  requireText(bootstrap, '["documentId", "supplierId", "compareKey"]', "procurement detail query parent");
  requireText(bootstrap, '["documentId", "supplierId", "compareKey", "edit", "returnTo"]', "procurement query cleanup");
  requireText(bootstrap, '["closeShift", "addExpense", "repairEquipmentId"]', "finance flow query parent");
  requireText(bootstrap, '["new", "title", "responsible"]', "task create query parent");
  requireText(bootstrap, "function bdSeedDirectLinkParent()");
  requireText(bootstrap, "function bdCanReturnToPreviousContext(state)");
  requireText(bootstrap, "String(state.bdVenueId) !== String(bdActiveVenueId())");
  requireText(bootstrap, 'state.bdPreviousEntryId = ""', "cross-venue history reset");
  requireText(bootstrap, 'state.bdPreviousUrl = ""', "cross-venue URL reset");
  requireText(bootstrap, "bd_navigation_scroll::");
  requireText(bootstrap, "window.bdReadNavigationQuery");
  requireText(bootstrap, "window.bdSyncNavigationQuery");
  requireText(bootstrap, "Изменения не сохранены. Выйти без сохранения?");
  requireText(bootstrap, "bdUpdateSurfaceDirty(dirtySurface)");
  requireText(bootstrap, "surface && bdIsSaveControl(control)");
  rejectText(bootstrap, "if (!dirtySurface || Date.now() < bdSaveIntentUntil)", "save-click discard bypass");
  rejectText(bootstrap, "if (!bdVisibleDirtySurface() || Date.now() < bdSaveIntentUntil)", "browser Back discard bypass");
  requireText(bootstrap, 'var bdTopLevelRoutes = ["/home", "/shifts", "/finance", "/employees", "/more"]');
  requireText(
    bootstrap,
    'var standaloneRoutes = ["/forgot-password"]',
    "authenticated product routes remain in the SPA shell",
  );
  requireText(bundle, 'path:"/settings",component:()=>i.jsx(pt,{component:bdSettingsPageV182})', "user settings route");
  requireText(bundle, 'path:"/integrations",component:()=>i.jsx(pt,{component:bdIntegrationsPage})', "integrations route");
  rejectText(bundle, 'path:"/settings",component:()=>i.jsx(pt,{component:bdIntegrationsPage})', "settings/integrations route collision");
  requireText(bootstrap, "bdNavigationPathname(sourceUrl) !== bdNavigationPathname(targetUrl)");
  requireText(bootstrap, "!bdQueryParentUrl(targetUrl)");

  for (const contextMarker of [
    "bdFinanceNavigationContext", "bdWarehouseNavigationContext", "bdReportNavigationContext",
    "bdSalariesNavigationContext", "bdSalaryNavigationContext", "bdEmployeeNavigationContext",
    "bdCasesNavigationContext", "bdEventsNavigationContext", "bdEquipmentNavigationContext",
    "bdTasksNavigationContext",
  ]) requireText(bundle, contextMarker);
  requireText(bundle, 'window.bdSyncNavigationQuery({month:toe(selected.year,selected.month)})', "shift period context");
  requireText(bundle, 'window.bdSyncNavigationQuery({tab:r==="documents"?null:r,q:y||null})', "supplier context");
  requireText(bundle, 'window.bdSyncNavigationQuery({tab:r==="menu"?null:r})', "catalog context");

  requireText(bundle, 'gridTemplateColumns:"repeat(6,minmax(0,1fr))"');
  rejectText(bundle, '{key:"warehouse",name:"Склад",href:"/warehouse"', "duplicate Warehouse bottom-nav destination");
  rejectText(bundle, 'function GCe(){const[e,t]=bt(),n=S.useCallback(a=>{t(a)},[t]),r=S.useCallback(()=>{window.history.back()}');
  requireText(bundle, 'onClick:()=>window.bdNavigateBack("/equipment")');
  requireText(bundle, 'onClick:()=>window.bdNavigateBack("/cases")');
  requireText(bundle, 'onClick:()=>window.bdNavigateBack("/events")');
  requireText(bundle, 'onClick:()=>window.bdNavigateBack("/salaries")');
  requireText(bundle, 'bdAccountingHeader,{title:"Склад",back:"/more"');
  requireText(bundle, 'bdAccountingHeader,{title:"Месячный отчёт",back:"/finance"');
  requireText(bundle, 'bdSalaryHeaderV164,{title:"Зарплаты",context:bdSalaryContext,back:bdSalaryReturnTo');
  requireText(bundle, 'bdSalaryEmployeeHrefV164(T.employee.id,bdSalaryListContext)', "salary employee context");
  requireText(bundle, 'window.bdReadNavigationQuery("return","team")', "context-aware salary bottom navigation");

  requireText(css, "bd-navigation-consistency-v85");
  requireText(css, "min-width: 44px");
  requireText(css, "min-height: 44px");
  requireText(css, 'a[aria-label="Назад"]');
  requireText(response, "20260811-navigation-v85");
  requireText(salesCss, "width: 44px");
  requireText(salesCss, "env(safe-area-inset-top)");
  requireText(notificationsCss, "grid-template-columns: 46px minmax(0, 1fr) auto");
  requireText(notificationsCss, "width: 44px");
  requireText(venueCss, ".icon-button{display:grid;width:44px;height:44px;");
  requireText(supplierAlternativesCss, "env(safe-area-inset-top)");
  requireText(recoveryCss, "min-height: 44px");
  requireText(shellCss, "--bd-safe-top: env(safe-area-inset-top, 0px)", "canonical top safe area");
  requireText(shellCss, "--bd-safe-bottom: env(safe-area-inset-bottom, 0px)", "canonical bottom safe area");
  requireText(shellCss, '[data-bd-tabs="canonical-v185"]', "canonical tabs");
  requireText(shell, 'customElements.define("bd-app-header", BdAppHeader)', "one canonical header component");
  requireText(shell, 'variants: ["root", "module", "detail"]', "header variants");
  requireText(shell, 'data-bd-legacy-header', "legacy header deprecation");
  requireText(bundle, 'function bdSalesImportPage()', "sales import shell route");
  requireText(bundle, 'function bdSupplierAlternativesPage()', "supplier alternatives shell route");
  requireText(bundle, 'function bdVenueCreatePage()', "venue creation shell route");
  requireText(bundle, 'component:()=>i.jsx(pt,{component:bdReviewsPage})', "review layer shell route");

  requireText(standalone, "bdSyntheticParent: true");
  requireText(standalone, "bdPreviousUrl: parentRoute");
  requireText(standalone, "window.history.forward()");
  requireText(standalone, "Изменения не сохранены. Выйти без сохранения?");

  const standaloneContracts = {
    "app/data-control/route.ts": "/more",
    "app/team-access/route.ts": "/employees",
    "app/integrations/route.ts": "/more",
    "app/market/route.ts": "/home",
    "app/notifications/route.ts": "/more",
    "app/opportunities/route.ts": "/home",
    "app/sales-import/route.ts": "/warehouse",
    "app/supplier-alternatives/route.ts": "/suppliers",
    "app/venues/new/route.ts": "/more",
  };
  for (const [routeFile, parent] of Object.entries(standaloneContracts)) {
    const routeSource = await source(routeFile);
    requireText(routeSource, 'bd-route-context.js?v=20260814-navigation-v185', `${routeFile} helper`);
    requireText(routeSource, `data-bd-parent-route="${parent}"`, `${routeFile} parent`);
    requireText(routeSource, "data-bd-back", `${routeFile} Back control`);
  }
  rejectText(market, "home-button", "duplicate Market Home control");
  requireText(integrations, 'href="/more"', "Integrations parent destination");
  requireText(
    integrations,
    'canonicalAppNavigationForRequest(request, "more")',
    "embedded integrations delegates canonical navigation to its parent shell",
  );
  requireText(integrations, 'data-bd-navigation-owner="${navigationOwner}"');

  const defectsByCategory = Object.fromEntries(
    Object.entries(resolvedDefects).map(([category, defects]) => [category, defects.length]),
  );
  const defectCount = Object.values(defectsByCategory).reduce((total, count) => total + count, 0);
  assert.equal(defectCount, 54);

  return {
    routes: {
      current: 57,
      compatibility: 2,
      total: 59,
      spa: spaRoutes.length,
    },
    modules: auditedModules.length,
    defects: {
      found: defectCount,
      fixed: defectCount,
      byCategory: defectsByCategory,
    },
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = await runNavigationAudit();
  console.log(`Navigation audit passed: ${result.routes.total} routes (${result.routes.current} current + ${result.routes.compatibility} compatibility), ${result.modules} modules.`);
  console.log(`Defects: ${result.defects.found} found, ${result.defects.fixed} fixed.`);
  console.log(JSON.stringify(result, null, 2));
}
