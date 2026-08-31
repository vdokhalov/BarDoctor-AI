export const APP_SHELL_VERSION = "20260828-embedded-back-v331";
export const CATALOG_ACCOUNTING_VERSION = "20260820-catalog-v208";

/**
 * One asset contract for every authenticated BarDoctor user surface.
 * The same custom element owns Root / Module / Detail headers, safe areas,
 * secondary tabs and the Back interaction in both the SPA and embedded pages.
 */
export function canonicalUserShellAssets(): string {
  return `<link rel="stylesheet" href="/app-shell-v185.css?v=${APP_SHELL_VERSION}" />
    <script src="/navigation-contract-v247.js?v=${APP_SHELL_VERSION}" defer></script>
    <script src="/app-shell-v185.js?v=${APP_SHELL_VERSION}" defer></script>
    <script src="/navigation-transient-v247.js?v=${APP_SHELL_VERSION}" defer></script>
    <script src="/catalog-accounting-v207.js?v=${CATALOG_ACCOUNTING_VERSION}" defer></script>`;
}
