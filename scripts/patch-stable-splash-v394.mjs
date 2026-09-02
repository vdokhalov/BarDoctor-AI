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

const launchScreens = [
  { width: 320, height: 568, ratio: 2 },
  { width: 375, height: 667, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 896, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 440, height: 956, ratio: 3 },
];

const launchFile = ({ width, height, ratio }) =>
  `/icons/bardoctor-launch-${width}x${height}-${ratio}x-v394.png`;

for (const screen of launchScreens) {
  const asset = new URL(`public${launchFile(screen)}`, root);
  if (!existsSync(asset)) throw new Error(`Missing stable launch image: ${asset.pathname}`);
}

const launchLinks = launchScreens
  .map(
    (screen) =>
      `    <link rel="apple-touch-startup-image" href="${launchFile(screen)}" media="(device-width: ${screen.width}px) and (device-height: ${screen.height}px) and (-webkit-device-pixel-ratio: ${screen.ratio}) and (orientation: portrait)" />`,
  )
  .join("\n");

const launchMedia = launchScreens
  .map(
    (screen) => `      @media (device-width: ${screen.width}px) and (device-height: ${screen.height}px) and (-webkit-device-pixel-ratio: ${screen.ratio}) and (orientation: portrait) {
        .bd-unified-splash-v394 {
          padding: 0;
          background: #070911 url("${launchFile(screen)}") center / 100% 100% no-repeat;
        }
        .bd-unified-splash-content-v394 { visibility: hidden; }
      }`,
  )
  .join("\n");

const startupCss = `    <style>
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
        opacity: 1;
        transition: opacity 160ms ease-out;
      }
      html[data-bd-startup-pending="v201"] .bd-static-startup-v201.bd-static-startup-leaving-v394 {
        opacity: 0;
        pointer-events: none;
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
${launchMedia}
      @media (prefers-reduced-motion: reduce) {
        html[data-bd-startup-pending="v201"] .bd-static-startup-v201 { transition-duration: 1ms; }
      }
    </style>`;

const startupBody = `  <body>
    <div class="bd-static-startup-v201 bd-unified-splash-v394" data-bd-static-startup="v201" data-bd-stable-splash="v394" role="status" aria-label="BarDoctor загружается">
      <div class="bd-unified-splash-content-v394">
        <img class="bd-unified-splash-mark-v394" src="/icons/bardoctor-mark-v159.svg" alt="" width="100" height="100" aria-hidden="true" />
        <h1 class="bd-unified-splash-brand-v394">BarDoctor</h1>
        <p class="bd-unified-splash-tagline-v394">AI-управляющий для вашего заведения</p>
      </div>
    </div>
    <div id="root"></div>
  </body>`;

const reactSplash = String.raw`function ble(){return i.jsx("div",{"data-bd-splash":"stable-v394","data-bd-stable-splash":"v394",className:"bd-unified-splash-v394",children:i.jsxs("div",{className:"bd-unified-splash-content-v394",children:[i.jsx("img",{src:"/icons/bardoctor-mark-v159.svg",alt:"",width:100,height:100,"aria-hidden":"true",className:"bd-unified-splash-mark-v394"}),i.jsx("h1",{className:"bd-unified-splash-brand-v394",children:"BarDoctor"}),i.jsx("p",{className:"bd-unified-splash-tagline-v394",children:"AI-управляющий для вашего заведения"})]})})}`;

const rootRedirect = String.raw`function _le(){const[,e]=bt(),[t]=S.useState(Cle);return S.useLayoutEffect(()=>{t&&e(t)},[t]),t?i.jsx(ble,{}):i.jsx(bdBootstrapRecoveryV274,{})}`;

const coordinator = String.raw`function bdStartupFirstPaintCompleteV201(){const e=document.documentElement;if(e.getAttribute("data-bd-startup-pending")!=="v201"||e.getAttribute("data-bd-startup-completing")==="v394")return;e.setAttribute("data-bd-startup-completing","v394");const t=document.querySelector('[data-bd-static-startup="v201"]'),n=()=>{e.removeAttribute("data-bd-startup-pending"),e.removeAttribute("data-bd-startup-completing"),t?.remove(),window.dispatchEvent(new CustomEvent("bd:startup-complete",{detail:{version:bdStartupFirstPaintVersion}}))};t?(t.classList.add("bd-static-startup-leaving-v394"),window.setTimeout(n,160)):n()}
function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un();bdUseLiveBusinessHealthV335(n&&!!t);const{snapshot:r}=bdUseBusinessHealthSnapshotV284(),[a]=S.useState(()=>{const l=window.location.pathname,u=l==="/"?Cle():l;if(u!=="/home")return!1;return bdHealthLaunchBeginV155(),!0});S.useLayoutEffect(()=>{a||bdStartupFirstPaintCompleteV201()},[a]),S.useEffect(()=>{if(!a)return;bdHealthStartupRouteHomeV155();let l=!1,u=0;const d=Date.now(),f=m=>{if(l)return;l=!0,window.clearInterval(u),window.clearTimeout(h),bdHealthDiagnosticV155(m,{snapshotId:r?.snapshotId??null,score:r?.score??null,venueReady:n,hasProfile:!!t,elapsedMs:Date.now()-d,calculationVersion:r?.calculationVersion,venueId:r?.venueId}),bdHealthLaunchCompleteV155(m),bdStartupFirstPaintCompleteV201()},m=()=>{const y=Date.now()-d,j=document.querySelector('[data-bd-home-page="v151"], [data-bd-bootstrap-state], [data-bd-startup-recovery]');y>=350&&j&&f("shell-ready")},h=window.setTimeout(()=>f("shell-timeout"),1800);return m(),u=window.setInterval(m,50),()=>{l=!0,window.clearInterval(u),window.clearTimeout(h)}},[a]);return e}
`;

function replaceSection(source, startAnchor, endAnchor, replacement, label, path) {
  const start = source.indexOf(startAnchor);
  const end = source.indexOf(endAnchor, start);
  if (start < 0 || end < 0) throw new Error(`${label} anchors missing in ${path.pathname}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function patchBundle(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  if (!source.includes('const bdStableSplashVersionV394="v394"')) {
    const marker = 'const bdBoundedStartupHandoffVersionV357="v357"';
    if (!source.includes(marker)) throw new Error(`Bounded startup marker missing in ${path.pathname}`);
    source = source.replace(marker, `const bdStableSplashVersionV394="v394";${marker}`);
  }
  source = source.replace(/const Ele=(?:const Ele=)+/, "const Ele=");
  source = replaceSection(source, "function ble(){", "\nconst j7=", `${reactSplash}\n`, "React splash", path);
  source = replaceSection(source, "function _le(){", "const Ele=", rootRedirect, "Root redirect", path);
  source = replaceSection(source, "function bdStartupFirstPaintCompleteV201", "function cEe(){", coordinator, "Startup coordinator", path);
  writeFileSync(path, source);
  return true;
}

function patchBootstrap(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  source = source.replace(/var bdStartupRecoveryVersionV341 = "[^"]+";/, 'var bdStartupRecoveryVersionV341 = "stable-splash-v394";');
  source = source.replace(/(?:-20260901-stable-splash-v394)+/g, "");
  source = source.replace(/(index-BQGspy0I\.js\?v=[^"\n]*)/, "$1-20260901-stable-splash-v394");
  writeFileSync(path, source);
  return true;
}

function patchShell(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  source = source.replace(/\s*<link rel="apple-touch-startup-image"[^>]*\/>/g, "");
  source = source.replace(
    '    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    `    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n${launchLinks}`,
  );
  const styleStart = source.indexOf("    <style>\n      /* bd-");
  const styleEnd = source.indexOf("    </style>", styleStart);
  if (styleStart < 0 || styleEnd < 0) throw new Error(`Startup styles missing in ${path.pathname}`);
  source = source.slice(0, styleStart) + startupCss + source.slice(styleEnd + "    </style>".length);
  const bodyStart = source.indexOf("  <body>");
  const bodyEnd = source.indexOf("  </body>", bodyStart);
  if (bodyStart < 0 || bodyEnd < 0) throw new Error(`Startup body missing in ${path.pathname}`);
  source = source.slice(0, bodyStart) + startupBody + source.slice(bodyEnd + "  </body>".length);
  if (!source.includes('name="bd-stable-splash" content="v394"')) {
    source = source.replace(
      '<meta name="bd-bounded-startup-handoff" content="v357" />',
      '<meta name="bd-bounded-startup-handoff" content="v357" />\n    <meta name="bd-stable-splash" content="v394" />',
    );
  }
  source = source.replace(/(?:-20260901-stable-splash-v394)+/g, "");
  source = source.replace(/(index-BQGspy0I\.js\?v=[^"\n]*)/, "$1-20260901-stable-splash-v394");
  source = source.replace(/(bardoctor-preview\.js\?v=[^"\n]*)/, "$1-20260901-stable-splash-v394");
  writeFileSync(path, source);
  return true;
}

const bundles = bundlePaths.filter(patchBundle).length;
const bootstraps = bootstrapPaths.filter(patchBootstrap).length;
const shells = shellPaths.filter(patchShell).length;
console.log(`Stable splash v394 applied to ${bundles} bundle(s), ${bootstraps} bootstrap(s), and ${shells} shell(s).`);
await import("./patch-single-splash-v395.mjs");
