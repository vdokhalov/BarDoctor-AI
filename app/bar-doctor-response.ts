import { BARDOCTOR_BUILD_ID, BARDOCTOR_BUILD_VERSION } from "../lib/bardoctor/version";
import { canonicalUserShellAssets } from "../lib/bardoctor/app-shell";

const BAR_DOCTOR_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-320x568-2x-v394.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-375x667-2x-v394.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-414x736-3x-v394.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-375x812-3x-v394.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-414x896-2x-v394.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-414x896-3x-v394.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-390x844-3x-v394.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-428x926-3x-v394.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-393x852-3x-v394.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-430x932-3x-v394.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-402x874-3x-v394.png" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-440x956-3x-v394.png" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
    <script>
      (function () {
        var path = window.location.pathname;
        if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
        /* bd-native-continuity-v396 */
        var bdLaunchImagesV396 = {
          "320x568x2": "/icons/bardoctor-launch-320x568-2x-v394.png",
          "375x667x2": "/icons/bardoctor-launch-375x667-2x-v394.png",
          "414x736x3": "/icons/bardoctor-launch-414x736-3x-v394.png",
          "375x812x3": "/icons/bardoctor-launch-375x812-3x-v394.png",
          "414x896x2": "/icons/bardoctor-launch-414x896-2x-v394.png",
          "414x896x3": "/icons/bardoctor-launch-414x896-3x-v394.png",
          "390x844x3": "/icons/bardoctor-launch-390x844-3x-v394.png",
          "428x926x3": "/icons/bardoctor-launch-428x926-3x-v394.png",
          "393x852x3": "/icons/bardoctor-launch-393x852-3x-v394.png",
          "430x932x3": "/icons/bardoctor-launch-430x932-3x-v394.png",
          "402x874x3": "/icons/bardoctor-launch-402x874-3x-v394.png",
          "440x956x3": "/icons/bardoctor-launch-440x956-3x-v394.png"
        };
        var bdLaunchKeyV396 = [Math.round(screen.width), Math.round(screen.height), Math.round(devicePixelRatio || 1)].join("x");
        var bdLaunchImageV396 = bdLaunchImagesV396[bdLaunchKeyV396];
        if (bdLaunchImageV396) {
          document.documentElement.setAttribute("data-bd-launch-raster-v396", bdLaunchKeyV396);
          document.documentElement.setAttribute("data-bd-native-fullscreen-raster-v398", bdLaunchKeyV396);
          document.documentElement.style.setProperty("--bd-launch-raster-v396", 'url("' + bdLaunchImageV396 + '")');
          document.documentElement.style.setProperty("--bd-launch-raster-width-v398", Math.round(screen.width) + "px");
          document.documentElement.style.setProperty("--bd-launch-raster-height-v398", Math.round(screen.height) + "px");
          window.__bdLaunchImageV396 = bdLaunchImageV396;
        }
        /* /bd-native-continuity-v396 */
        if (path === "/" || path === "/home") {
          document.documentElement.setAttribute("data-bd-startup-pending", "v201");
        }
      /* bd-startup-frame-trace-v396 */
      if (new URLSearchParams(window.location.search).get("bd-startup-qa") === "1" && !Array.isArray(window.__bdStartupFrameTraceV396)) {
        var bdTraceStartV396 = performance.now();
        var bdTraceV396 = [];
        window.__bdStartupFrameTraceV396 = bdTraceV396;
        function bdTraceFrameV396(now) {
          var nodes = Array.from(document.querySelectorAll("[data-bd-static-startup], [data-bd-splash], [data-bd-root-splash]"));
          var visible = nodes.filter(function (node) { var style = getComputedStyle(node); return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0; });
          var owner = visible[0] || null;
          var rect = owner && owner.getBoundingClientRect();
          var style = owner && getComputedStyle(owner);
          bdTraceV396.push({ t: Math.round((now - bdTraceStartV396) * 100) / 100, count: visible.length, owner: owner && (owner.getAttribute("data-bd-static-startup") || owner.getAttribute("data-bd-splash") || owner.getAttribute("data-bd-root-splash")), rect: rect ? [rect.x, rect.y, rect.width, rect.height] : null, opacity: style ? style.opacity : null, transform: style ? style.transform : null, raster: window.__bdLaunchImageV396 || null, home: Boolean(document.querySelector("[data-bd-home-page], [data-bd-authenticated-home-shell]")) });
          if (now - bdTraceStartV396 < 10000) requestAnimationFrame(bdTraceFrameV396);
          else {
            function summarize(frames) {
              var shown = frames.filter(function (frame) { return frame.count > 0; });
              var unique = function (values) { return Array.from(new Set(values)); };
              var releaseIndex = frames.findIndex(function (frame) { return frame.count === 0; });
              return { frames: frames.length, maxVisibleCount: Math.max.apply(null, frames.map(function (frame) { return frame.count; })), owners: unique(shown.map(function (frame) { return frame.owner; })), rects: unique(shown.map(function (frame) { return JSON.stringify(frame.rect); })), opacities: unique(shown.map(function (frame) { return frame.opacity; })), transforms: unique(shown.map(function (frame) { return frame.transform; })), rasters: unique(shown.map(function (frame) { return frame.raster; })), firstHomeMs: (frames.find(function (frame) { return frame.home; }) || {}).t || null, visibleAfterRelease: releaseIndex >= 0 && frames.slice(releaseIndex + 1).some(function (frame) { return frame.count > 0; }) };
            }
            var last30 = -Infinity;
            var frames30 = bdTraceV396.filter(function (frame) { if (frame.t - last30 < 32) return false; last30 = frame.t; return true; });
            window.__bdStartupFrameResultV396 = { fps60: summarize(bdTraceV396), fps30: summarize(frames30) };
            document.documentElement.setAttribute("data-bd-startup-frame-result-v396", JSON.stringify(window.__bdStartupFrameResultV396));
          }
        }
        requestAnimationFrame(bdTraceFrameV396);
      }
      /* /bd-startup-frame-trace-v396 */
      })();
    </script>
    <style>
      /* bd-stable-splash-v394 */
      .bd-static-startup-v201 { display: none; }
      html[data-bd-startup-pending="v201"] {
        min-height: 100%;
        background: #070911;
        color-scheme: dark;
      }
      html[data-bd-startup-pending="v201"] body {
        min-height: 100%;
        margin: 0;
        overflow: hidden !important;
        background: #070911 !important;
      }
      html[data-bd-startup-pending="v201"] #root {
        min-height: 100dvh;
        background: #070911;
      }
      .bd-unified-splash-v394 {
        position: fixed;
        inset: 0;
        box-sizing: border-box;
        display: grid;
        min-height: 100dvh;
        padding: max(20px, env(safe-area-inset-top)) 24px max(20px, env(safe-area-inset-bottom));
        place-items: center;
        overflow: hidden;
        color: #fff;
        background: #070911;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        font-synthesis: none;
        text-align: center;
        -webkit-font-smoothing: antialiased;
      }
      html[data-bd-startup-pending="v201"] .bd-static-startup-v201 {
        z-index: 2147483000;
        display: grid;
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }
      .bd-unified-splash-content-v394 {
        box-sizing: border-box;
        display: flex;
        width: 100%;
        max-width: 390px;
        padding: 32px 24px;
        flex-direction: column;
        align-items: center;
        contain: layout paint style;
      }
      .bd-unified-splash-mark-v394 {
        display: block;
        width: 100px;
        height: 100px;
        margin: 0 0 24px;
        border-radius: 0;
        object-fit: cover;
      }
      .bd-unified-splash-brand-v394 {
        margin: 0;
        color: #fff !important;
        font-size: 36px;
        font-weight: 800;
        letter-spacing: -0.045em;
        line-height: 1;
        opacity: 1 !important;
        -webkit-text-fill-color: #fff !important;
      }
      .bd-unified-splash-tagline-v394 {
        margin: 12px 0 0;
        color: rgba(255, 255, 255, 0.72) !important;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0;
        line-height: 1.25;
        opacity: 1 !important;
        -webkit-text-fill-color: rgba(255, 255, 255, 0.72) !important;
      }
      @media (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-320x568-2x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-375x667-2x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-414x736-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-375x812-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-414x896-2x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-414x896-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-390x844-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-428x926-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-393x852-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-430x932-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-402x874-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      @media (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-440x956-3x-v394.png") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }
      /* bd-native-continuity-v396 */
      html[data-bd-launch-raster-v396] .bd-unified-splash-v394 {
        padding: 0 !important;
        background-color: #070911 !important;
        background-image: var(--bd-launch-raster-v396) !important;
        background-position: 0 0 !important;
        /* The standalone web viewport is shorter than screen.height on iOS.
           Size the raster to the physical screen coordinate space used by the
           native launch image instead of vertically squeezing it into 100dvh. */
        background-size: var(--bd-launch-raster-width-v398) var(--bd-launch-raster-height-v398) !important;
        background-repeat: no-repeat !important;
      }
      html[data-bd-launch-raster-v396] .bd-unified-splash-content-v394 { display: none !important; }
      /* /bd-native-continuity-v396 */
    </style>
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#070911" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="BarDoctor" />
    <meta name="bd-startup-performance" content="v343" />
    <meta name="bd-authoritative-home" content="v344" />
    <meta name="bd-authenticated-home-shell" content="v345" />
    <meta name="bd-branded-startup-handoff" content="v346" />
    <meta name="bd-coherent-startup" content="v347" />
    <meta name="bd-ios-launch-screen" content="v348" />
    <meta name="bd-single-ready-home" content="v349" />
    <meta name="bd-seamless-startup" content="v356" />
    <meta name="bd-bounded-startup-handoff" content="v357" />
    <meta name="bd-stable-splash" content="v394" />
    <meta name="bd-single-splash" content="v395" />
    <meta name="bd-native-continuity" content="v396" />
    <meta name="bd-native-fullscreen-raster" content="v398" />
    <meta name="bd-shell-first-startup" content="v397" />
    <meta name="bd-app-version" content="${BARDOCTOR_BUILD_VERSION}" />
    <meta name="bd-build-id" content="${BARDOCTOR_BUILD_ID}" />
    <title>BarDoctor</title>
    <link rel="icon" type="image/svg+xml" href="/favicon-v159.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/bardoctor-v159-favicon-32.png" />
    <link rel="shortcut icon" href="/favicon.ico?v=20260812-brand-v159" />
    <link rel="manifest" href="/manifest.json?v=20260812-brand-v159" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/bardoctor-v159-apple-180.png" />
    <link rel="preload" href="/icons/bardoctor-mark-v159.svg" as="image" type="image/svg+xml" />
    <link rel="modulepreload" href="/assets/index-BQGspy0I.js?v=20260821-inventory-reconciliation-v224-user-display-units-v236-purchase-units-v237-collapsed-tree-v239-accounting-currency-v243-warehouse-valuation-v244-inventory-workflow-v245-inventory-layer-v246-20260823-auth-login-v248-20260823-existing-venue-gate-v249-20260823-embedded-login-transition-v250-20260823-venue-setup-boundary-v251-20260823-inventory-scope-hierarchy-v256-20260823-tech-card-reconciliation-v257-20260823-tech-card-semantic-matching-v258-20260823-tech-card-entity-resolution-v259-20260826-tech-card-consistency-v299a-20260826-invoice-recognition-v2-20260824-canonical-supplier-v260-20260824-auth-bootstrap-state-v274-20260825-profile-v280a-20260825-profile-v281-20260825-profile-v282-20260825-business-health-v284-20260826-venue-identity-v297-20260826-menu-sale-size-v298-20260828-calculation-audit-v320-20260828-accounting-money-v321-20260828-authoritative-bootstrap-v324-20260828-assortment-currency-ux-v325-20260828-venue-currency-lock-v326-20260828-business-health-ux-v332-20260828-business-health-ux-v333-20260828-business-health-live-v334-20260828-business-health-canonical-v335-20260829-canonical-taxonomy-v336-20260829-startup-recovery-v341-20260829-startup-runtime-v342-20260829-startup-performance-v343-20260829-authoritative-home-v344-20260829-authenticated-home-v345-20260829-branded-startup-v346-20260829-coherent-startup-v347-20260829-single-ready-home-v349-20260826-invoice-create-canonical-v297-purchase-review-v356-purchase-receiving-v357-bd-purchase-accounting-v359-bd-taxonomy-manager-ux-v360-bd-optional-subcategory-v361-bd-classification-ux-v362-bd-alphabetical-taxonomy-v363-bd-taxonomy-action-sheet-v364-bd-nested-sections-v365-bd-nomenclature-catalog-route-v366-bd-purchase-category-options-v367-bd-tech-card-catalog-picker-v368-bd-nomenclature-uat-v369-purchase-receiving-stability-v371-bd-quick-add-purchase-v372-bd-receiving-warehouse-ux-v373-bd-dismissible-overlays-v374-bd-tech-card-search-ux-v375-bd-tech-card-costing-v376-bd-business-health-detail-v377-bd-business-health-watchdog-v378-bd-unit-product-costing-v381-bd-unit-product-costing-v382-bd-unit-product-cost-trace-v383-bd-unit-product-costing-v384-bd-unit-product-costing-v385-bd-unit-product-costing-v386-bd-unit-product-costing-v387-bd-unit-product-costing-v389-bd-unit-product-costing-v390-bd-unit-product-costing-v391-bd-unit-product-costing-v392-bd-unit-product-costing-v393-bd-warehouse-unit-integrity-v399-20260903-home-reviews-ux-v409-20260830-seamless-startup-v356-20260830-bounded-startup-v357-bd-unit-product-costing-v380b-20260901-stable-splash-v394-20260901-single-splash-v395-frame-trace1-20260829-menu-nomenclature-action-v351-bd-mobile-menu-editor-v400" />
    <!-- bd-shell-first-compat-v397 <script src="/bardoctor-preview.js?v=20260821-inventory-cache-reconciliation-v235-20260822-navigation-v247-20260829-authoritative-home-v344-20260829-authenticated-home-v345-20260829-branded-startup-v346-20260829-coherent-startup-v347-20260821-inventory-reconciliation-v224-user-display-units-v236-purchase-units-v237-collapsed-tree-v239-accounting-currency-v243-warehouse-valuation-v244-inventory-workflow-v245-inventory-layer-v246-20260823-auth-login-v248-20260823-existing-venue-gate-v249-20260823-embedded-login-transition-v250-20260823-venue-setup-boundary-v251-20260823-inventory-scope-hierarchy-v256-20260823-tech-card-reconciliation-v257-20260823-tech-card-semantic-matching-v258-20260823-tech-card-entity-resolution-v259-20260826-tech-card-consistency-v299a-20260826-invoice-recognition-v2-20260824-canonical-supplier-v260-20260824-auth-bootstrap-state-v274-20260825-profile-v280a-20260825-profile-v281-20260825-profile-v282-20260825-business-health-v284-20260826-venue-identity-v297-20260826-menu-sale-size-v298-20260828-calculation-audit-v320-20260828-accounting-money-v321-20260828-authoritative-bootstrap-v324-20260828-assortment-currency-ux-v325-20260828-venue-currency-lock-v326-20260828-business-health-ux-v332-20260828-business-health-ux-v333-20260828-business-health-live-v334-20260828-business-health-canonical-v335-20260829-canonical-taxonomy-v336-20260829-startup-recovery-v341-20260829-startup-runtime-v342-20260829-startup-performance-v343-20260829-authoritative-home-v344-20260829-authenticated-home-v345-20260829-branded-startup-v346-20260829-coherent-startup-v347-20260829-single-ready-home-v349-20260826-invoice-create-canonical-v297-purchase-review-v356-purchase-receiving-v357-bd-purchase-accounting-v359-bd-taxonomy-manager-ux-v360-bd-optional-subcategory-v361-bd-classification-ux-v362-bd-alphabetical-taxonomy-v363-bd-taxonomy-action-sheet-v364-bd-nested-sections-v365-bd-nomenclature-catalog-route-v366-bd-purchase-category-options-v367-bd-tech-card-catalog-picker-v368-bd-nomenclature-uat-v369-purchase-receiving-stability-v371-bd-quick-add-purchase-v372-bd-receiving-warehouse-ux-v373-bd-dismissible-overlays-v374-bd-tech-card-search-ux-v375-bd-tech-card-costing-v376-bd-business-health-detail-v377-bd-business-health-watchdog-v378-bd-unit-product-costing-v381-bd-unit-product-costing-v382-bd-unit-product-cost-trace-v383-bd-unit-product-costing-v384-bd-unit-product-costing-v385-bd-unit-product-costing-v386-bd-unit-product-costing-v387-bd-unit-product-costing-v389-bd-unit-product-costing-v390-bd-unit-product-costing-v391-bd-unit-product-costing-v392-bd-unit-product-costing-v393-bd-warehouse-unit-integrity-v399-20260903-home-reviews-ux-v409-20260830-seamless-startup-v356-20260830-bounded-startup-v357-bd-unit-product-costing-v380b-20260901-stable-splash-v394-20260901-single-splash-v395-frame-trace1-20260829-menu-nomenclature-action-v351" defer></script><script src="/bardoctor-preview-v396.js?v=native-continuity-v396" defer></script> -->
    <script src="/bardoctor-preview-v397.js?v=shell-first-startup-v397" defer></script>
    <link rel="stylesheet" href="/assets/index-D0AhgpbR.css?v=20260809-rc-v78" />
    <link rel="stylesheet" href="/access-entry.css?v=20260726-access-v1" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/market-entry.css?v=20260828-competitors-v329" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/opportunities-entry.css?v=20260828-opportunity-calendar-v327" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/suppliers.css?v=20260821-inventory-reconciliation-v224-purchase-review-v356-purchase-receiving-v357-bd-receiving-warehouse-ux-v373" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/warehouse.css?v=20260823-inventory-scope-hierarchy-v256-20260823-tech-card-reconciliation-v257-20260823-tech-card-semantic-matching-v258-20260823-tech-card-entity-resolution-v259-20260826-tech-card-consistency-v299a-bd-receiving-warehouse-ux-v373" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/sales-consumption-v275.css?v=20260824-sales-batch-ledger-v275" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/nomenclature-v208.css?v=20260821-warehouse-v214-purchase-units-v237-collapsed-tree-v239-20260824-canonical-supplier-v260-catalog-workflow-v353-modal-workspace-v354-publication-readiness-v355-bd-classification-ux-v362-bd-nomenclature-uat-v369" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/canonical-taxonomy-v336.css?v=20260829-menu-nomenclature-action-v351-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-menu-link-v352-catalog-workflow-v353-modal-workspace-v354-publication-readiness-v355-bd-taxonomy-manager-ux-v360-bd-classification-ux-v362-bd-taxonomy-action-sheet-v364-bd-nested-sections-v365-bd-nomenclature-uat-v369-bd-dismissible-overlays-v374" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/navigation.css?v=20260811-navigation-v85" />
    <link rel="stylesheet" href="/catalog.css?v=20260801-catalog-move-v44-20260823-tech-card-semantic-matching-v258-20260823-tech-card-entity-resolution-v259-20260826-tech-card-consistency-v299a-20260824-canonical-supplier-v260-catalog-workflow-v353-modal-workspace-v354-publication-readiness-v355-publication-readiness-v355-purchase-review-v356-purchase-receiving-v357-bd-tech-card-catalog-picker-v368-bd-tech-card-search-ux-v375-bd-mobile-menu-editor-v400" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/ai-action-plan.css?v=20260803-action-plan-v2" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/employee-detail.css?v=20260817-employee-edit-page-v206" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/employee-list.css?v=20260817-employee-edit-page-v206" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/team-dashboard-v163.css?v=20260812-team-v163" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/payroll-dashboard-v164.css?v=20260812-payroll-v164" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297" />
    <link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260812-modern-v158" />
    <link rel="stylesheet" href="/home-visual-v151.css?v=20260811-home-v151" />
    <link rel="stylesheet" href="/home-reviews-v409.css?v=20260903-home-reviews-ux-v409" />
    <link rel="stylesheet" href="/health-score-experience-v152.css?v=20260828-business-health-canonical-v335-20260829-authoritative-home-v344" />
    <link rel="stylesheet" href="/shifts-visual-v156.css?v=20260812-shifts-v158" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/finance-dashboard-v160.css?v=20260812-finance-v161" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/monthly-report-v165.css?v=20260812-monthly-v165" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/more-hub-v166.css?v=20260812-more-v166" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/equipment-command-v167.css?v=20260812-equipment-v167" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/procurement-command-v168.css?v=20260814-finance-purchase-delete-v195" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/assortment-command-v170.css?v=20260813-assortment-v171-20260823-tech-card-reconciliation-v257-20260823-tech-card-semantic-matching-v258-20260823-tech-card-entity-resolution-v259-20260826-tech-card-consistency-v299a-20260824-canonical-supplier-v260-20260828-assortment-currency-ux-v325-20260828-venue-currency-lock-v326-catalog-workflow-v353-modal-workspace-v354-publication-readiness-v355-publication-readiness-v355" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/settings-v182.css?v=20260814-notifications-v184" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/profile-v280.css?v=20260825-profile-v280" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/profile-v281.css?v=20260825-profile-v282" media="print" onload="this.media='all'" />
    <link rel="stylesheet" href="/ai-doctor-attention-v196.css?v=20260823-self-service-v255" media="print" onload="this.media='all'" />
    ${canonicalUserShellAssets()}
    <script src="/monthly-report-qa-v165.js?v=20260812-monthly-v165" defer></script>
    <script src="/more-hub-qa-v166.js?v=20260812-more-v166" defer></script>
    <script src="/equipment-qa-v167.js?v=20260812-equipment-v167" defer></script>
    <script src="/procurement-qa-v168.js?v=20260814-finance-purchase-delete-v195" defer></script>
    <script src="/assortment-qa-v170.js?v=20260813-assortment-v171" defer></script>
    <script src="/nomenclature-qa-v238.js?v=20260821-accounting-currency-v243" defer></script>
    <script src="/health-score-experience.js?v=20260828-health-startup-v332" defer></script>
    <script src="/opportunity-calendar-qa-v327.js?v=20260828-opportunity-calendar-v328" defer></script>
    <script src="/opportunity-calendar-client-v327.js?v=20260828-opportunity-calendar-v327" defer></script>
    <script src="/competitor-market-qa-v329.js?v=20260828-competitors-v329" defer></script>
    <script src="/competitor-market-client-v329.js?v=20260828-competitors-v329" defer></script>
    <script src="/server-migration-discovery-v262.js?v=20260824-controlled-migration-v262" defer></script>
    <script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body>
    <div class="bd-static-startup-v201 bd-unified-splash-v394" data-bd-static-startup="v201" data-bd-stable-splash="v394" data-bd-single-splash="v395" data-bd-native-continuity="v396" data-bd-native-fullscreen-raster="v398" data-bd-shell-first-startup="v397" role="status" aria-label="BarDoctor загружается">
      <div class="bd-unified-splash-content-v394">
        <img class="bd-unified-splash-mark-v394" src="/icons/bardoctor-mark-v159.svg" alt="" width="100" height="100" aria-hidden="true" />
        <h1 class="bd-unified-splash-brand-v394">BarDoctor</h1>
        <p class="bd-unified-splash-tagline-v394">AI-управляющий для вашего заведения</p>
      </div>
    </div>
    <div id="root"></div>
  </body>
</html>`;

export function barDoctorResponse(): Response {
  return new Response(BAR_DOCTOR_HTML, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
