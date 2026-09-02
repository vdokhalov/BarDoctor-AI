import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const shellPaths = [new URL("public/app.html", root), new URL("app/bar-doctor-response.ts", root), new URL("dist/client/app.html", root)];
const bundlePaths = [new URL("public/assets/index-BQGspy0I.js", root), new URL("dist/client/assets/index-BQGspy0I.js", root)];
const bootstrapPaths = [new URL("public/bardoctor-preview.js", root), new URL("dist/client/bardoctor-preview.js", root)];

const launchSelector = String.raw`        /* bd-native-continuity-v396 */
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
        /* /bd-native-continuity-v396 */`;

const rasterCss = String.raw`      /* bd-native-continuity-v396 */
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
`;

const frameTrace = String.raw`      /* bd-startup-frame-trace-v396 */
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
      /* /bd-startup-frame-trace-v396 */`;

const coordinator = String.raw`function bdStartupFirstPaintCompleteV201(){const e=document.documentElement;if(e.getAttribute("data-bd-startup-pending")!=="v201"||window.__bdSplashReleasedV396===!0)return;const t=document.querySelector('[data-bd-home-page], [data-bd-authenticated-home-shell]');if(!t)return;window.__bdSplashReleasedV396=!0;const n=document.querySelector('[data-bd-static-startup="v201"]');e.removeAttribute("data-bd-startup-pending"),e.removeAttribute("data-bd-startup-completing"),n?.remove(),window.dispatchEvent(new CustomEvent("bd:startup-complete",{detail:{version:"native-continuity-v396"}}))}
function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un();bdUseLiveBusinessHealthV335(n&&!!t);const{snapshot:r}=bdUseBusinessHealthSnapshotV284(),[a]=S.useState(()=>{const l=window.location.pathname,u=l==="/"?Cle():l;if(u!=="/home")return!1;return bdHealthLaunchBeginV155(),!0});S.useLayoutEffect(()=>{a||bdStartupFirstPaintCompleteV201()},[a]),S.useEffect(()=>{if(!a)return;bdHealthStartupRouteHomeV155();let l=0,u=!1;const d=Date.now(),f=()=>{if(u)return;const m=document.querySelector('[data-bd-home-page], [data-bd-authenticated-home-shell]');if(!m)return;u=!0,window.clearInterval(l),bdHealthDiagnosticV155("shell-ready",{snapshotId:r?.snapshotId??null,score:r?.score??null,venueReady:n,hasProfile:!!t,elapsedMs:Date.now()-d,calculationVersion:r?.calculationVersion,venueId:r?.venueId}),bdHealthLaunchCompleteV155("shell-ready"),bdStartupFirstPaintCompleteV201()};return f(),l=window.setInterval(f,16),()=>{u=!0,window.clearInterval(l)}},[a]);return e}
`;

function replaceSection(source, start, end, replacement, label, path) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`${label} anchors missing in ${path.pathname}`);
  return source.slice(0, from) + replacement + source.slice(to);
}

function patchShell(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  source = source.replace(/\n\s*\/\* bd-native-continuity-v396 \*\/[\s\S]*?\/\* \/bd-native-continuity-v396 \*\//g, "");
  source = source.replace(/\n\s*\/\* bd-startup-frame-trace-v39[56] \*\/[\s\S]*?\/\* \/bd-startup-frame-trace-v39[56] \*\//g, "");
  source = source.replace(/(<script src="\/server-migration-discovery-v262\.js[^>]*><\/script>)(?:-[a-zA-Z0-9]+)+/, "$1");
  source = source.replace('        if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);', '        if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);\n' + launchSelector);
  source = source.replace("    </style>", rasterCss + "    </style>");
  source = source.replace("      })();\n    </script>", frameTrace + "\n      })();\n    </script>");
  source = source.replace(/<meta name="theme-color" content="#[0-9a-fA-F]{6}" \/>/, '<meta name="theme-color" content="#070911" />');
  if (!source.includes('name="bd-native-continuity" content="v396"')) source = source.replace('<meta name="bd-single-splash" content="v395" />', '<meta name="bd-single-splash" content="v395" />\n    <meta name="bd-native-continuity" content="v396" />');
  if (!source.includes('name="bd-native-fullscreen-raster" content="v398"')) source = source.replace('<meta name="bd-native-continuity" content="v396" />', '<meta name="bd-native-continuity" content="v396" />\n    <meta name="bd-native-fullscreen-raster" content="v398" />');
  source = source.replace(/data-bd-single-splash="v395"(?: data-bd-native-continuity="v396")?/, 'data-bd-single-splash="v395" data-bd-native-continuity="v396"');
  source = source.replace(/data-bd-native-continuity="v396"(?: data-bd-native-fullscreen-raster="v398")?/, 'data-bd-native-continuity="v396" data-bd-native-fullscreen-raster="v398"');
  source = source.replace(/\n\s*<!-- bd-bootstrap-history-v396 [\s\S]*? -->/, "");
  const moduleVersion = source.match(/\/assets\/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=([^"']+)/)?.[1];
  if (!moduleVersion) throw new Error(`Module cache identity missing in ${path.pathname}`);
  const bootstrapHistory = `20260821-inventory-cache-reconciliation-v235-20260822-navigation-v247-20260829-authoritative-home-v344-20260829-authenticated-home-v345-20260829-branded-startup-v346-20260829-coherent-startup-v347-${moduleVersion}`;
  source = source.replace(
    /\n(\s*)<script src="\/bardoctor-preview(?:-v396)?\.js(?:\?v=[^"']+)?" defer><\/script>/,
    `\n$1<!-- bd-bootstrap-history-v396 /bardoctor-preview.js?v=${bootstrapHistory} defer -->\n$1<script src="/bardoctor-preview-v396.js?v=${bootstrapHistory}" defer></script>`,
  );
  writeFileSync(path, source);
  return true;
}

function patchBundle(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  if (!source.includes('const bdNativeContinuityVersionV396="v396"')) source = source.replace('const bdSingleSplashVersionV395="v395"', 'const bdNativeContinuityVersionV396="v396";const bdSingleSplashVersionV395="v395"');
  source = source.replaceAll("i.jsx(ble,{})", "null");
  source = replaceSection(source, "function bdStartupFirstPaintCompleteV201", "function cEe(){", coordinator, "startup coordinator", path);
  writeFileSync(path, source);
  return true;
}

function patchBootstrap(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  source = source.replace(/\n\s*\/\* bd-startup-frame-trace-v395 \*\/[\s\S]*?\/\* \/bd-startup-frame-trace-v395 \*\//, "");
  source = source.replace(/var bdStartupRecoveryVersionV341 = "[^"]+";/, 'var bdStartupRecoveryVersionV341 = "native-continuity-v396";');
  writeFileSync(path, source);
  copyFileSync(path, new URL("bardoctor-preview-v396.js", path));
  return true;
}

console.log(`Native continuity v396 applied to ${bundlePaths.filter(patchBundle).length} bundle(s), ${bootstrapPaths.filter(patchBootstrap).length} bootstrap(s), and ${shellPaths.filter(patchShell).length} shell(s).`);
