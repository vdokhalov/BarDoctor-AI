import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  additionalProductionRoutes,
  legacyCompatibilityRoutes,
  spaRoutes,
} from "./audit-navigation-consistency.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const findingGroups = {
  hierarchyAndComprehension: [
    "home-money-priority",
    "finance-desktop-comparison",
    "finance-period-context",
    "ai-scan-order",
    "professional-not-found",
  ],
  accessibilityAndNavigation: [
    "global-focus-visible",
    "icon-touch-targets",
    "bottom-nav-touch-targets",
    "bottom-nav-contrast",
    "bottom-nav-safe-area",
    "scroll-top-label",
    "named-dialogs",
    "table-regions",
  ],
  forms: [
    "label-association",
    "described-validation",
    "numeric-keyboard",
    "visible-dirty-state",
    "mobile-input-zoom",
  ],
  longFlowsAndStates: [
    "global-scroll-top",
    "substantial-scroll-threshold",
    "floating-control-collision",
    "reduced-motion",
    "sticky-save-actions",
    "sticky-list-and-period-controls",
    "live-status-feedback",
  ],
  responsiveAndPerceivedPerformance: [
    "desktop-modal-sizing",
    "finance-kpi-grid",
    "sticky-table-headers",
    "busy-loading-state",
    "tabular-numeric-scan",
  ],
};

const standaloneTemplates = [
  "app/data-control/route.ts",
  "app/team-access/route.ts",
  "app/integrations/route.ts",
  "app/market/route.ts",
  "app/notifications/route.ts",
  "app/opportunities/route.ts",
  "app/sales-import/route.ts",
  "app/supplier-alternatives/route.ts",
  "app/venues/new/route.ts",
];

async function source(relativePath) {
  return readFile(new URL(relativePath, pathToFileURL(`${projectRoot}/`)), "utf8");
}

function requireText(text, needle, label = needle) {
  assert.ok(text.includes(needle), `Missing modern UX contract: ${label}`);
}

function requireOrder(text, needles, label) {
  let position = -1;
  for (const needle of needles) {
    const next = text.indexOf(needle, position + 1);
    assert.ok(next > position, `Incorrect ${label} order at: ${needle}`);
    position = next;
  }
}

export async function runModernUxAudit() {
  const [css, homeCss, runtime, bundle, response, layout, globals, venueSwitcher] = await Promise.all([
    source("public/modern-polish.css"),
    source("public/home-visual-v151.css"),
    source("public/modern-polish.js"),
    source("public/assets/index-BQGspy0I.js"),
    source("app/bar-doctor-response.ts"),
    source("app/layout.tsx"),
    source("app/globals.css"),
    source("public/venue-switcher.js"),
  ]);

  const routeCount = spaRoutes.length + additionalProductionRoutes.length + legacyCompatibilityRoutes.length;
  assert.equal(routeCount, 62, "Production route inventory changed during UX polish");

  requireText(response, "/modern-polish.css?v=20260812-modern-v158", "SPA polish stylesheet");
  requireText(response, "/modern-polish.js?v=20260811-modern-v87", "SPA polish runtime");
  requireText(response, "/home-visual-v151.css?v=20260811-home-v151", "Home visual specification stylesheet");
  requireText(globals, "/modern-polish.css?v=20260812-modern-v158", "Next polish stylesheet");
  requireText(globals, "/home-visual-v151.css?v=20260811-home-v151", "Next Home stylesheet");
  requireText(layout, "/modern-polish.js?v=20260811-modern-v87", "Next polish runtime");
  for (const template of standaloneTemplates) {
    const html = await source(template);
    requireText(html, "/modern-polish.css?v=20260811-modern-v87", `${template} stylesheet`);
    requireText(html, "/modern-polish.js?v=20260811-modern-v87", `${template} runtime`);
  }

  requireText(css, ".bd-scroll-top", "Scroll-to-Top component");
  requireText(runtime, 'scrollButton.innerHTML = \'<svg class="bd-scroll-top-icon"', "Scroll-to-Top icon");
  requireText(runtime, 'setAttribute("aria-label", "Прокрутить страницу наверх")', "Scroll-to-Top accessible name");
  requireText(runtime, "Math.max(560", "substantial scroll threshold");
  requireText(runtime, "bottomOffset()", "floating control collision handling");
  requireText(runtime, 'reducedMotion.matches ? "auto" : "smooth"', "reduced-motion scroll behavior");
  requireText(css, "env(safe-area-inset-bottom)", "mobile safe area");
  requireText(css, "min-width: 48px", "Scroll-to-Top width");
  requireText(css, "min-height: 48px", "Scroll-to-Top height");
  requireText(css, "border-radius: 999px", "round Scroll-to-Top control");

  requireText(css, ":focus-visible", "consistent keyboard focus");
  requireText(css, "min-width: 44px", "44px touch target width");
  requireText(css, "min-height: 44px", "44px touch target height");
  requireText(css, ".bd-sticky-context", "sticky contextual controls");
  requireText(css, ".bd-catalog-sheet-actions", "sticky catalog save actions");
  requireText(css, ".bd-procurement-sheet-actions", "sticky procurement save actions");
  requireText(css, ".bd-warehouse-product-actions", "sticky warehouse save actions");
  requireText(css, ".table-scroll thead th", "sticky table headings");
  requireText(css, "font-variant-numeric: tabular-nums", "scannable numeric values");
  requireText(css, "@media (prefers-reduced-motion: reduce)", "reduced-motion stylesheet");
  requireText(css, 'body[data-bd-route="/finance"] [data-bd-finance-results="unified-v16"]', "desktop finance comparison grid");

  requireText(runtime, "enhanceFields", "field semantics runtime");
  requireText(runtime, 'field.inputMode = integerOnly ? "numeric" : "decimal"', "numeric mobile keyboard");
  requireText(runtime, "enhanceDirtyState", "visible dirty form state");
  requireText(runtime, "enhanceDialogs", "dialog names");
  requireText(runtime, "enhanceTables", "table regions");
  requireText(runtime, "enhanceStatusFeedback", "success/error/loading announcements");
  requireText(runtime, 'loader.setAttribute("aria-busy", "true")', "loading busy state");

  requireText(bundle, 'const bdModernUxVersion="modern-v86"');
  requireText(bundle, "S.useId()", "stable form field ids");
  requireText(bundle, "htmlFor:bdFieldId", "field label association");
  requireText(bundle, '"aria-describedby":bdDescribedBy', "validation description");
  requireText(bundle, '"data-bd-ai-result":"self-service-v255"', "AI self-service briefing hook");
  requireText(bundle, 'children:"Что AI уже выяснил"', "AI ready-to-use findings");
  requireText(bundle, '"data-bd-ai-attention":"runtime-v199"', "React-native AI attention order");
  requireText(bundle, 'bdAIDoctorNormalizeV199', "legacy diagnosis runtime normalisation");
  requireText(bundle, '"data-bd-not-found":"modern-v86"', "professional not-found screen");
  assert.ok(!bundle.includes("404 Page Not Found"), "Technical English 404 copy remains");

  const homeStart = bundle.indexOf("function bdHomeDaily(");
  const homeEnd = bundle.indexOf("function Dce()", homeStart);
  assert.ok(homeStart >= 0 && homeEnd > homeStart, "Home hierarchy component not found");
  const home = bundle.slice(homeStart, homeEnd);
  requireOrder(home, [
    "bdHomeMoneyCard",
    "bdHomeReviewsCardV409",
    "bdHomeAttention",
    "bdHomeTodayCard",
    "bdHomeFreshAi",
    "bdHomeContextCardsV151",
  ], "home information hierarchy");
  assert.ok(!home.includes("bdHomeSections"), "Duplicate Home section grid remains");
  requireText(bundle, 'const bdHomeVisualVersion="home-v151"', "Home visual version");
  requireText(bundle, '"data-bd-opportunity-entry":"home-v151"', "compact opportunity context");
  requireText(bundle, '"data-bd-competitors-entry":"home-v151"', "compact competitor context");
  requireText(homeCss, ".bd-home-money-kpis", "financial KPI hierarchy");
  requireText(homeCss, ".bd-home-context-grid", "compact context cards");

  const aiStart = bundle.indexOf("function Fce(");
  const aiEnd = bundle.indexOf("function Uce()", aiStart);
  assert.ok(aiStart >= 0 && aiEnd > aiStart, "AI result component not found");
  requireOrder(bundle.slice(aiStart, aiEnd), [
    "Что происходит",
    "Что делать сегодня",
    "Контекст сегодня",
    "После смены проверю",
    "Операционные проблемы",
    "Business Health",
    "Полнота данных",
    "bdAIDoctorDataQualityV198",
    "Возможности",
    "Финансовый контекст закрытого периода",
    "История AI Doctor",
    "Обновить анализ",
  ], "React AI attention scan");
  assert.ok(!bundle.slice(aiStart, aiEnd).includes("bdAIDoctorPriorityCardV196"), "Legacy large priority cards remain in the top management briefing");

  for (const contract of [
    'return { key: "problem", order: 10 }',
    'return { key: "reason", order: 20 }',
    'return { key: "financial-effect", order: 30 }',
    'return { key: "action", order: 40 }',
    'return { key: "action-check", order: 50 }',
  ]) requireText(runtime, contract, "AI result scan order");

  requireText(venueSwitcher, "context.venues.length < 2", "single-venue switcher protection");
  requireText(venueSwitcher, "context.venues.length > 1", "multi-venue switcher behavior");

  const byCategory = Object.fromEntries(
    Object.entries(findingGroups).map(([category, findings]) => [category, findings.length]),
  );
  const findingCount = Object.values(byCategory).reduce((sum, count) => sum + count, 0);
  assert.equal(findingCount, 30);

  return {
    routes: routeCount,
    surfaceTemplates: 2 + standaloneTemplates.length,
    resolvedContracts: findingCount,
    byCategory,
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = await runModernUxAudit();
  console.log(`Modern UX audit passed: ${result.routes} routes, ${result.surfaceTemplates} shared surface templates, ${result.resolvedContracts} resolved contracts.`);
  console.log(JSON.stringify(result, null, 2));
}
