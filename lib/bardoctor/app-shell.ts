export const APP_SHELL_VERSION = "20260815-startup-v201";
export const CATALOG_ACCOUNTING_VERSION = "20260820-catalog-v207";

/**
 * One asset contract for every authenticated BarDoctor user surface.
 * The same custom element owns Root / Module / Detail headers, safe areas,
 * secondary tabs and the Back interaction in both the SPA and embedded pages.
 */
export function canonicalUserShellAssets(): string {
  return `<link rel="stylesheet" href="/app-shell-v185.css?v=${APP_SHELL_VERSION}" />
    <script src="/app-shell-v185.js?v=${APP_SHELL_VERSION}" defer></script>
    <script src="/catalog-accounting-v207.js?v=${CATALOG_ACCOUNTING_VERSION}" defer></script>`;
}
