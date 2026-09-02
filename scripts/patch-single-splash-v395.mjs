import { existsSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const bundlePaths = [
  new URL("public/assets/index-BQGspy0I.js", root),
  new URL("dist/client/assets/index-BQGspy0I.js", root),
];
const bootstrapPaths = [
  new URL("public/bardoctor-preview.js", root),
  new URL("dist/client/bardoctor-preview.js", root),
];
const shellPaths = [
  new URL("public/app.html", root),
  new URL("app/bar-doctor-response.ts", root),
  new URL("dist/client/app.html", root),
];

const reactSplash = "function ble(){return null}";
const rootRedirect = String.raw`function _le(){const[,e]=bt(),[t]=S.useState(Cle);return S.useLayoutEffect(()=>{t&&e(t)},[t]),t?null:i.jsx(bdBootstrapRecoveryV274,{})}`;
const protectedGuard = String.raw`function pt({component:e}){if(!Ot())return i.jsx(cS,{to:"/login"});const t=bdAuthBootstrapV274(),n=window.location.pathname==="/home";if(t.state==="onboarding_required")return i.jsx(cS,{to:"/setup"});if(t.state!=="ready")return t.state==="loading"?(n?i.jsx(bdAuthenticatedHomeBootV345,{}):null):i.jsx(bdBootstrapRecoveryV274,{});const{profile:r,isReady:a}=Un();return a?r?i.jsx(e,{}):i.jsx(bdBootstrapRecoveryV274,{}):n?i.jsx(bdAuthenticatedHomeBootV345,{}):null}`;
const coordinator = String.raw`function bdStartupFirstPaintCompleteV201(){const e=document.documentElement;if(e.getAttribute("data-bd-startup-pending")!=="v201"||window.__bdSplashReleasedV395===!0)return;window.__bdSplashReleasedV395=!0;const t=document.querySelector('[data-bd-static-startup="v201"]');e.removeAttribute("data-bd-startup-pending"),e.removeAttribute("data-bd-startup-completing"),t?.remove(),window.dispatchEvent(new CustomEvent("bd:startup-complete",{detail:{version:"single-splash-v395"}}))}
function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un();bdUseLiveBusinessHealthV335(n&&!!t);const{snapshot:r}=bdUseBusinessHealthSnapshotV284(),[a]=S.useState(()=>{const l=window.location.pathname,u=l==="/"?Cle():l;if(u!=="/home")return!1;return bdHealthLaunchBeginV155(),!0});S.useLayoutEffect(()=>{a||bdStartupFirstPaintCompleteV201()},[a]),S.useEffect(()=>{if(!a)return;bdHealthStartupRouteHomeV155();let l=!1,u=0;const d=Date.now(),f=m=>{if(l)return;l=!0,window.clearInterval(u),window.clearTimeout(h),bdHealthDiagnosticV155(m,{snapshotId:r?.snapshotId??null,score:r?.score??null,venueReady:n,hasProfile:!!t,elapsedMs:Date.now()-d,calculationVersion:r?.calculationVersion,venueId:r?.venueId}),bdHealthLaunchCompleteV155(m),bdStartupFirstPaintCompleteV201()},m=()=>{const y=Date.now()-d,j=document.querySelector('[data-bd-home-page="v151"], [data-bd-authenticated-home-shell="v345"], [data-bd-bootstrap-state], [data-bd-startup-recovery]');y>=450&&j&&f("shell-ready")},h=window.setTimeout(()=>f("shell-timeout"),1500);return m(),u=window.setInterval(m,32),()=>{l=!0,window.clearInterval(u),window.clearTimeout(h)}},[a]);return e}
`;

const frameTraceBootstrap = String.raw`  /* bd-startup-frame-trace-v395 */
  if (new URLSearchParams(window.location.search).get("bd-startup-qa") === "1" && !Array.isArray(window.__bdStartupFrameTraceV395)) {
    var bdStartupFrameTraceStartedV395 = performance.now();
    var bdStartupFrameTraceV395 = [];
    window.__bdStartupFrameTraceV395 = bdStartupFrameTraceV395;
    function bdSampleStartupFrameV395(now) {
      var nodes = Array.from(document.querySelectorAll("[data-bd-static-startup], [data-bd-splash], [data-bd-root-splash]"));
      var visible = nodes.filter(function (node) {
        var nodeStyle = getComputedStyle(node);
        return nodeStyle.display !== "none" && nodeStyle.visibility !== "hidden" && Number(nodeStyle.opacity) > 0;
      });
      var owner = visible[0] || null;
      var content = owner && owner.querySelector(".bd-unified-splash-content-v394");
      var rect = owner && owner.getBoundingClientRect();
      var contentRect = content && content.getBoundingClientRect();
      var style = owner && getComputedStyle(owner);
      bdStartupFrameTraceV395.push({
        t: Math.round((now - bdStartupFrameTraceStartedV395) * 100) / 100,
        count: visible.length,
        owner: owner && (owner.getAttribute("data-bd-static-startup") || owner.getAttribute("data-bd-splash") || owner.getAttribute("data-bd-root-splash")),
        x: rect ? rect.x : null,
        y: rect ? rect.y : null,
        width: rect ? rect.width : null,
        height: rect ? rect.height : null,
        contentX: contentRect ? contentRect.x : null,
        contentY: contentRect ? contentRect.y : null,
        contentWidth: contentRect ? contentRect.width : null,
        contentHeight: contentRect ? contentRect.height : null,
        opacity: style ? style.opacity : null,
        transform: style ? style.transform : null,
        home: Boolean(document.querySelector("[data-bd-home-page], [data-bd-authenticated-home-shell]")),
      });
      if (now - bdStartupFrameTraceStartedV395 < 3000) requestAnimationFrame(bdSampleStartupFrameV395);
      else {
        window.__bdStartupFrameTraceV395Complete = true;
        function summarize(input) {
          var visibleFrames = input.filter(function (frame) { return frame.count > 0; });
          function unique(values) { return Array.from(new Set(values)); }
          return {
            frames: input.length,
            visibleFrames: visibleFrames.length,
            maxVisibleCount: Math.max.apply(null, input.map(function (frame) { return frame.count; })),
            owners: unique(visibleFrames.map(function (frame) { return frame.owner; })),
            rects: unique(visibleFrames.map(function (frame) { return [frame.x, frame.y, frame.width, frame.height].join(","); })),
            contentRects: unique(visibleFrames.map(function (frame) { return [frame.contentX, frame.contentY, frame.contentWidth, frame.contentHeight].join(","); })),
            opacities: unique(visibleFrames.map(function (frame) { return frame.opacity; })),
            transforms: unique(visibleFrames.map(function (frame) { return frame.transform; })),
            firstInvisibleMs: (input.find(function (frame) { return frame.count === 0; }) || {}).t || null,
            firstHomeMs: (input.find(function (frame) { return frame.home; }) || {}).t || null,
          };
        }
        var last30 = -Infinity;
        var trace30 = bdStartupFrameTraceV395.filter(function (frame) {
          if (frame.t - last30 < 32) return false;
          last30 = frame.t;
          return true;
        });
        document.documentElement.setAttribute("data-bd-startup-frame-result-v395", JSON.stringify({
          fps60: summarize(bdStartupFrameTraceV395),
          fps30: summarize(trace30),
        }));
      }
    }
    requestAnimationFrame(bdSampleStartupFrameV395);
  }
  /* /bd-startup-frame-trace-v395 */`;
const frameTraceInline = frameTraceBootstrap.replace(/^  /gm, "      ");

function replaceSection(source, startAnchor, endAnchor, replacement, label, path) {
  const start = source.indexOf(startAnchor);
  const end = source.indexOf(endAnchor, start);
  if (start < 0 || end < 0) throw new Error(`${label} anchors missing in ${path.pathname}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function patchBundle(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  if (!source.includes('const bdSingleSplashVersionV395="v395"')) {
    const marker = 'const bdStableSplashVersionV394="v394"';
    if (!source.includes(marker)) throw new Error(`Stable splash marker missing in ${path.pathname}`);
    source = source.replace(marker, `const bdSingleSplashVersionV395="v395";${marker}`);
  }
  source = replaceSection(source, "function ble(){", "\nconst j7=", `${reactSplash}\n`, "React splash", path);
  source = replaceSection(source, "function _le(){", "const Ele=", rootRedirect, "Root redirect", path);
  source = replaceSection(source, "function pt({component:e})", "const bdEmbeddedPagePaths", protectedGuard, "Protected route guard", path);
  source = replaceSection(source, "function bdStartupFirstPaintCompleteV201", "function cEe(){", coordinator, "Startup coordinator", path);
  writeFileSync(path, source);
  return true;
}

function patchBootstrap(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  source = source.replace(/\n  \/\* bd-startup-frame-trace-v395 \*\/[\s\S]*?  \/\* \/bd-startup-frame-trace-v395 \*\//, "");
  source = source.replace('  "use strict";', `  "use strict";\n\n${frameTraceBootstrap}`);
  source = source.replace(/var bdStartupRecoveryVersionV341 = "[^"]+";/, 'var bdStartupRecoveryVersionV341 = "single-splash-v395";');
  source = source.replace(/\s*\|\| Boolean\(document\.querySelector\('\[data-bd-root-splash\], \[data-bd-splash\]'\)\)/, "");
  source = source.replace(/(?:-20260901-single-splash-v395(?:-frame-trace1)?)+/g, "");
  source = source.replace(/(index-BQGspy0I\.js\?v=[^"\n]*)/, "$1-20260901-single-splash-v395-frame-trace1");
  writeFileSync(path, source);
  return true;
}

function patchShell(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  source = source.replace(/\n      \/\* bd-startup-frame-trace-v395 \*\/[\s\S]*?      \/\* \/bd-startup-frame-trace-v395 \*\//, "");
  source = source.replace("      })();\n    </script>", `${frameTraceInline}\n      })();\n    </script>`);
  source = source.replace(/\n    <script src="\/startup-frame-trace-v395\.js" defer><\/script>/, "");
  source = source.replace(/\n    <script>\n      \/\* bd-startup-frame-trace-v395 \*\/[\s\S]*?    <\/script>/, "");
  source = source.replace("transition: opacity 160ms ease-out;", "transition: none !important;");
  source = source.replace(/\n\s*html\[data-bd-startup-pending="v201"\] \.bd-static-startup-v201\.bd-static-startup-leaving-v394 \{[\s\S]*?\n\s*\}/, "");
  source = source.replace(/\n\s*@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\s*\}/, "");
  source = source.replace("opacity: 1;\n        transition: none !important;", "opacity: 1 !important;\n        transform: none !important;\n        transition: none !important;");
  source = source.replace('data-bd-stable-splash="v394" role="status"', 'data-bd-stable-splash="v394" data-bd-single-splash="v395" role="status"');
  if (!source.includes('name="bd-single-splash" content="v395"')) {
    source = source.replace(
      '<meta name="bd-stable-splash" content="v394" />',
      '<meta name="bd-stable-splash" content="v394" />\n    <meta name="bd-single-splash" content="v395" />',
    );
  }
  source = source.replace(/(?:-20260901-single-splash-v395(?:-frame-trace1)?)+/g, "");
  source = source.replace(/(index-BQGspy0I\.js\?v=[^"\n]*)/, "$1-20260901-single-splash-v395-frame-trace1");
  source = source.replace(/(bardoctor-preview\.js\?v=[^"\n]*)/, "$1-20260901-single-splash-v395-frame-trace1");
  writeFileSync(path, source);
  return true;
}

const bundles = bundlePaths.filter(patchBundle).length;
const bootstraps = bootstrapPaths.filter(patchBootstrap).length;
const shells = shellPaths.filter(patchShell).length;
console.log(`Single splash v395 applied to ${bundles} bundle(s), ${bootstraps} bootstrap(s), and ${shells} shell(s).`);
