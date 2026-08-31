import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const htmlPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

const bundleMarker = 'const bdStartupPerformanceVersionV343="v343"';
let bundle = readFileSync(bundlePath, "utf8");
let bootstrap = readFileSync(bootstrapPath, "utf8");
let changed = false;

function replaceBundleOnce(before, after, label) {
  const count = bundle.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  bundle = bundle.replace(before, after);
  changed = true;
}

if (!bundle.includes(bundleMarker)) {
  const anchor = 'const bdStartupRuntimeHardeningVersionV342="v342"';
  if (!bundle.includes(anchor)) throw new Error("Startup runtime hardening v342 must be applied first.");
  bundle = bundle.replace(anchor, `${bundleMarker};${anchor}`);
  changed = true;
}

if (!bundle.includes("S.useState(()=>bz()),[r,a]=S.useState(()=>bz()!==null)")) {
  replaceBundleOnce(
    "S.useState(null),[r,a]=S.useState(!1)",
    "S.useState(()=>bz()),[r,a]=S.useState(()=>bz()!==null)",
    "hydrate the cached restaurant profile before the network refresh",
  );
}

// Cloud data still reports its own readiness to data-dependent screens. The
// startup gate below no longer waits for it, so Home can paint cached content
// while reconciliation finishes without exposing incomplete stores elsewhere.
if (bundle.includes("function Woe({children:e}){const{isReady:t,profile:n}=Un(),[r,a]=S.useState(!0)")) {
  replaceBundleOnce(
    "function Woe({children:e}){const{isReady:t,profile:n}=Un(),[r,a]=S.useState(!0)",
    "function Woe({children:e}){const{isReady:t,profile:n}=Un(),[r,a]=S.useState(!1)",
    "preserve cloud readiness for data-dependent screens",
  );
}

if (bundle.includes("let u=!1;return(async()=>{const d=await Xse();")) {
  replaceBundleOnce(
    "let u=!1;return(async()=>{const d=await Xse();",
    "let u=!1;return a(!1),(async()=>{const d=await Xse();",
    "preserve cloud reconciliation readiness",
  );
}

if (!bundle.includes("function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un(),{isReady:r}=Ai();bdUseLiveBusinessHealthV335(n&&r&&!!t);bdUseBusinessHealthSnapshotV284();S.useLayoutEffect(()=>{bdStartupFirstPaintCompleteV201()},[]);return e}")) {
  const start = bundle.indexOf("function bdHealthStartupGateV155");
  const end = bundle.indexOf("function cEe()", start);
  if (start < 0 || end < 0) throw new Error("Business Health startup gate markers not found.");
  bundle = bundle.slice(0, start)
    + "function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un(),{isReady:r}=Ai();bdUseLiveBusinessHealthV335(n&&r&&!!t);bdUseBusinessHealthSnapshotV284();S.useLayoutEffect(()=>{bdStartupFirstPaintCompleteV201()},[]);return e}"
    + bundle.slice(end);
  changed = true;
}

if (bundle.includes("bdCanonicalSnapshot=bdHomeCloudReady?g:null")) {
  replaceBundleOnce(
    "bdCanonicalSnapshot=bdHomeCloudReady?g:null",
    "bdCanonicalSnapshot=g",
    "show the last canonical Business Health snapshot immediately",
  );
}

if (bundle.includes('bdHealthLoading=!bdHomeCloudReady||!g&&bdLiveHealthStatus!=="error"')) {
  replaceBundleOnce(
    'bdHealthLoading=!bdHomeCloudReady||!g&&bdLiveHealthStatus!=="error"',
    'bdHealthLoading=!g&&bdLiveHealthStatus!=="error"',
    "keep Business Health loading local to a missing snapshot",
  );
}

if (bootstrap.includes('var bdStartupRecoveryVersionV341 = "startup-runtime-v342";')) {
  bootstrap = bootstrap.replace(
    'var bdStartupRecoveryVersionV341 = "startup-runtime-v342";',
    'var bdStartupRecoveryVersionV341 = "startup-performance-v343";',
  );
  changed = true;
}

if (!bootstrap.includes("20260829-startup-performance-v343")) {
  const token = "20260829-startup-runtime-v342";
  if (!bootstrap.includes(token)) throw new Error("Startup runtime v342 cache token not found.");
  bootstrap = bootstrap.replace(token, `${token}-20260829-startup-performance-v343`);
  changed = true;
}

const moduleSource = bootstrap.match(/script\.src = "([^"]+index-BQGspy0I\.js[^"]*)";/)?.[1];
if (!moduleSource) throw new Error("Application module URL not found.");

const criticalStyles = [
  "/assets/index-D0AhgpbR.css",
  "/navigation.css",
  "/brand-identity-v159.css",
  "/modern-polish.css",
  "/home-visual-v151.css",
  "/health-score-experience-v152.css",
  "/venue-switcher.css",
  "/app-shell-v185.css",
];

function optimizeHtml(path) {
  let html = readFileSync(path, "utf8");
  const initial = html;

  if (!html.includes('name="bd-startup-performance"')) {
    html = html.replace(
      '<meta name="bd-app-version"',
      '<meta name="bd-startup-performance" content="v343" />\n    <meta name="bd-app-version"',
    );
  }

  html = html.replace(/<link rel="stylesheet" href="([^"]+)"(\s*\/?)>/g, (tag, href, close) => {
    if (criticalStyles.some((critical) => href.startsWith(critical))) return tag;
    if (tag.includes('media="print"')) return tag;
    return `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'"${close}>`;
  });

  if (!html.includes('rel="modulepreload"') || !html.includes("startup-performance-v343")) {
    const preload = `    <link rel="modulepreload" href="${moduleSource}" />\n`;
    html = html.replace('    <link rel="preload" href="/icons/bardoctor-mark-v159.svg" as="image" type="image/svg+xml" />\n', (match) => match + preload);
  }

  html = html.replace(/<script src="([^"]+)"(?![^>]*\b(?:defer|async)\b)([^>]*)><\/script>/g, '<script src="$1" defer$2></script>');

  if (!html.includes("bd-static-startup-fastpaint-v343")) {
    html = html.replace(
      "      .bd-static-startup-v201 { display: none; }",
      "      /* bd-static-startup-fastpaint-v343 */\n      .bd-static-startup-v201 { display: none; }",
    );
  }

  if (html !== initial) {
    writeFileSync(path, html);
    changed = true;
  }
}

optimizeHtml(htmlPaths[0]);
optimizeHtml(htmlPaths[1]);

writeFileSync(bundlePath, bundle);
writeFileSync(bootstrapPath, bootstrap);

console.log(changed ? "Applied startup performance v343." : "Startup performance v343 is intact.");
