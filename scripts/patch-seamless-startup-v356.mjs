import { existsSync, readFileSync, writeFileSync } from "node:fs";

const bundlePaths = [
  new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
  new URL("../dist/client/assets/index-BQGspy0I.js", import.meta.url),
];
const bootstrapPaths = [
  new URL("../public/bardoctor-preview.js", import.meta.url),
  new URL("../dist/client/bardoctor-preview.js", import.meta.url),
];
const shellPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
  new URL("../dist/client/app.html", import.meta.url),
];

const startupCss = `    <style>
      /* bd-seamless-startup-v356 */
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
      html[data-bd-startup-pending="v201"] .bd-static-startup-v201 {
        position: fixed;
        z-index: 2147483000;
        inset: 0;
        box-sizing: border-box;
        display: flex;
        min-height: 100dvh;
        padding: max(20px, env(safe-area-inset-top)) 24px max(20px, env(safe-area-inset-bottom));
        align-items: center;
        justify-content: center;
        overflow: hidden;
        color: #fff;
        background: #070911;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
        opacity: 1;
        transition: opacity 180ms ease-out;
      }
      html[data-bd-startup-pending="v201"] .bd-static-startup-v201.bd-static-startup-leaving-v356 {
        opacity: 0;
        pointer-events: none;
      }
      .bd-static-startup-content-v202 {
        box-sizing: border-box;
        display: flex;
        width: 100%;
        max-width: 390px;
        padding: 32px 28px;
        flex-direction: column;
        align-items: center;
      }
      .bd-static-startup-mark-v201 {
        display: grid;
        width: 92px;
        height: 92px;
        margin-bottom: 24px;
        place-items: center;
      }
      .bd-static-startup-mark-v201 img {
        display: block;
        width: 92px;
        height: 92px;
        border-radius: 25px;
        object-fit: cover;
      }
      .bd-static-startup-brand-v201 {
        margin: 0;
        color: #fff;
        font-size: 38px;
        font-weight: 850;
        letter-spacing: -0.045em;
        line-height: 1;
      }
      .bd-static-startup-brand-v201 span { color: #8b7bff; }
      .bd-static-startup-tagline-v201 {
        margin: 13px 0 0;
        color: rgba(255, 255, 255, 0.72);
        font-size: 16px;
        font-weight: 650;
        letter-spacing: -0.01em;
      }
      .bd-static-startup-status-v201 {
        display: flex;
        margin: 34px 0 0;
        align-items: center;
        gap: 10px;
        color: rgba(255, 255, 255, 0.42);
        font-size: 12px;
        font-weight: 650;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .bd-static-startup-dots-v202 { display: flex; gap: 4px; }
      .bd-static-startup-dots-v202 span {
        display: block;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #8b7bff;
        animation: bd-static-startup-dot-v356 1s ease-in-out infinite;
      }
      .bd-static-startup-dots-v202 span:nth-child(2) { animation-delay: 0.16s; }
      .bd-static-startup-dots-v202 span:nth-child(3) { animation-delay: 0.32s; }
      @keyframes bd-static-startup-dot-v356 {
        0%, 100% { opacity: 0.25; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-2px); }
      }
      @media (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) {
        html[data-bd-startup-pending="v201"] .bd-static-startup-v201 {
          padding: 0;
          background: #070911 url("/icons/bardoctor-launch-390x844-v348.png") center / 100% 100% no-repeat;
        }
        html[data-bd-startup-pending="v201"] .bd-static-startup-content-v202 { visibility: hidden; }
      }
      @media (prefers-reduced-motion: reduce) {
        html[data-bd-startup-pending="v201"] .bd-static-startup-v201 { transition-duration: 1ms; }
        .bd-static-startup-dots-v202 span { animation: none; }
      }
    </style>`;

const startupBody = `  <body>
    <div class="bd-static-startup-v201" data-bd-static-startup="v201" role="status" aria-label="BarDoctor загружается">
      <div class="bd-static-startup-content-v202">
        <div class="bd-static-startup-mark-v201" aria-hidden="true">
          <img src="/icons/bardoctor-mark-v159.svg" alt="" width="92" height="92" />
        </div>
        <h1 class="bd-static-startup-brand-v201">Bar<span>Doctor</span></h1>
        <p class="bd-static-startup-tagline-v201">AI-управляющий для вашего заведения</p>
        <p class="bd-static-startup-status-v201">
          <span>Загрузка</span>
          <span class="bd-static-startup-dots-v202" aria-hidden="true"><span></span><span></span><span></span></span>
        </p>
      </div>
    </div>
    <div id="root"></div>
  </body>`;

const startupCoordinator = String.raw`function bdStartupFirstPaintCompleteV201(){const e=document.documentElement;if(e.getAttribute("data-bd-startup-pending")!=="v201"||e.getAttribute("data-bd-startup-completing")==="v356")return;e.setAttribute("data-bd-startup-completing","v356");const t=document.querySelector('[data-bd-static-startup="v201"]'),n=()=>{e.removeAttribute("data-bd-startup-pending"),e.removeAttribute("data-bd-startup-completing"),t?.remove(),window.dispatchEvent(new CustomEvent("bd:startup-complete",{detail:{version:bdStartupFirstPaintVersion}}))};t?(t.classList.add("bd-static-startup-leaving-v356"),window.setTimeout(n,180)):n()}
function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un(),{isReady:r,financeReady:a}=Ai(),s=bdUseLiveBusinessHealthV335(n&&r&&!!t),{snapshot:l}=bdUseBusinessHealthSnapshotV284(),[u]=S.useState(()=>{const h=window.location.pathname,b=h==="/"?Cle():h;return b==="/home"&&bdHealthLaunchBeginV155()}),[d,f]=S.useState(()=>u?"SPLASH_LOADING":"HOME"),[m,g]=S.useState(!1);S.useEffect(()=>{if(!u)return;const h=window.setTimeout(()=>g(!0),900);return()=>window.clearTimeout(h)},[u]);const p=n&&r&&(!t||a&&(!!l||s==="ready"||s==="error"));S.useEffect(()=>{if(!u||d!=="SPLASH_LOADING"||!m||!p)return;bdHealthDiagnosticV155("server-bootstrap-ready",{snapshotId:l?.snapshotId??null,score:l?.score??null,venueReady:n,cloudReady:r,financeReady:a,healthStatus:s,calculationVersion:l?.calculationVersion,venueId:l?.venueId}),bdHealthLaunchCompleteV155("server-bootstrap-ready"),bdHealthStartupRouteHomeV155(),f("HOME")},[u,d,m,p,n,r,a,s,l]),S.useLayoutEffect(()=>{(!u||d==="HOME")&&bdStartupFirstPaintCompleteV201()},[u,d]);return!u||d==="HOME"?e:i.jsx("div",{"data-bd-root-splash":"seamless-startup-v356","data-bd-health-startup-machine":"v356","data-bd-health-startup-state":"SPLASH_LOADING","aria-hidden":"true",style:{minHeight:"100dvh",width:"100%",background:"#070911"}})}
`;

function patchBundle(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  if (!source.includes('const bdSeamlessStartupVersionV356="v356"')) {
    const marker = 'const bdSingleReadyHomeVersionV349="v349"';
    if (!source.includes(marker)) throw new Error(`Single-ready Home v349 marker missing in ${path.pathname}`);
    source = source.replace(marker, `const bdSeamlessStartupVersionV356="v356";${marker}`);
  }

  const recoveryStart = source.indexOf("function bdHomeStartupRecoveryV349()");
  const homeStart = source.indexOf("function Dce(){", recoveryStart >= 0 ? recoveryStart : 0);
  if (recoveryStart >= 0 && homeStart > recoveryStart) {
    source = source.slice(0, recoveryStart) + source.slice(homeStart);
  }

  const refreshedHomeStart = source.indexOf("function Dce(){");
  const homeEnd = source.indexOf("const q7=", refreshedHomeStart);
  if (refreshedHomeStart < 0 || homeEnd < 0) throw new Error(`Home anchors missing in ${path.pathname}`);
  let home = source.slice(refreshedHomeStart, homeEnd);
  home = home.replace(
    /,\[bdHomeStartupTimedOutV349,bdSetHomeStartupTimedOutV349\]=S\.useState\(!1\);S\.useEffect\(\(\)=>\{const e=window\.setTimeout\(\(\)=>bdSetHomeStartupTimedOutV349\(!0\),15e3\);return\(\)=>window\.clearTimeout\(e\)\},\[\]\);if\(!g\|\|!bdHomeFinanceReady\)return[\s\S]*?;return i\.jsx\(nt,/,
    ";return i.jsx(nt,",
  );
  if (/bdHomeStartupTimedOutV349|data-bd-root-splash":"single-ready-home-v349|children:i\.jsx\(ble/.test(home)) {
    throw new Error(`The second Home splash still exists in ${path.pathname}`);
  }
  source = source.slice(0, refreshedHomeStart) + home + source.slice(homeEnd);

  const coordinatorStart = source.indexOf("function bdStartupFirstPaintCompleteV201");
  const coordinatorEnd = source.indexOf("function cEe(){", coordinatorStart);
  if (coordinatorStart < 0 || coordinatorEnd < 0) throw new Error(`Startup coordinator anchors missing in ${path.pathname}`);
  source = source.slice(0, coordinatorStart) + startupCoordinator + source.slice(coordinatorEnd);
  writeFileSync(path, source);
  return true;
}

function patchShell(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  const styleStart = source.indexOf("    <style>\n      /* bd-static-startup-fastpaint-v343 */");
  const styleEnd = source.indexOf("    </style>", styleStart);
  if (styleStart < 0 || styleEnd < 0) {
    if (!source.includes("bd-seamless-startup-v356")) throw new Error(`Startup style anchors missing in ${path.pathname}`);
  } else {
    source = source.slice(0, styleStart) + startupCss + source.slice(styleEnd + "    </style>".length);
  }

  const bodyStart = source.indexOf("  <body>");
  const bodyEnd = source.indexOf("  </body>", bodyStart);
  if (bodyStart < 0 || bodyEnd < 0) throw new Error(`Body anchors missing in ${path.pathname}`);
  source = source.slice(0, bodyStart) + startupBody + source.slice(bodyEnd + "  </body>".length);
  if (!source.includes('name="bd-seamless-startup" content="v356"')) {
    source = source.replace(
      '<meta name="bd-single-ready-home" content="v349" />',
      '<meta name="bd-single-ready-home" content="v349" />\n    <meta name="bd-seamless-startup" content="v356" />',
    );
  }
  source = source.replace(/(?:-20260830-seamless-startup-v356)+/g, "-20260830-seamless-startup-v356");
  source = source.replace(
    /(index-BQGspy0I\.js\?v=[^"\n]*)(?![^"\n]*seamless-startup-v356)/,
    "$1-20260830-seamless-startup-v356",
  );
  source = source.replace(
    /(bardoctor-preview\.js\?v=[^"\n]*)(?![^"\n]*seamless-startup-v356)/,
    "$1-20260830-seamless-startup-v356",
  );
  writeFileSync(path, source);
  return true;
}

function patchBootstrap(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  source = source.replace(/(?:-20260830-seamless-startup-v356)+/g, "-20260830-seamless-startup-v356");
  if (!/index-BQGspy0I\.js\?v=[^"\n]*seamless-startup-v356/.test(source)) {
    source = source.replace(/(index-BQGspy0I\.js\?v=[^"\n]*)/, "$1-20260830-seamless-startup-v356");
  }
  source = source
    .replace("var bdStartupRecoveryVersionV341 = \"startup-performance-v343\";", "var bdStartupRecoveryVersionV341 = \"seamless-startup-v356\";")
    .replace("background:#f7f8fc;color:#151a2d", "background:#070911;color:#fff")
    .replace("border:1px solid #e3e6ef;border-radius:22px;background:#fff;box-shadow:0 18px 50px rgba(25,31,66,.12)", "border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#11152a;box-shadow:0 18px 50px rgba(0,0,0,.28)")
    .replace("color:#667085;font-size:14px", "color:rgba(255,255,255,.68);font-size:14px")
    .replace("color:#98a2b3;font-size:11px", "color:rgba(255,255,255,.42);font-size:11px");
  writeFileSync(path, source);
  return true;
}

const bundles = bundlePaths.filter(patchBundle).length;
const shells = shellPaths.filter(patchShell).length;
const bootstraps = bootstrapPaths.filter(patchBootstrap).length;
console.log(`Seamless startup v356 applied to ${bundles} bundle(s), ${shells} shell(s), and ${bootstraps} bootstrap(s).`);
