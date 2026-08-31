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

const coordinator = String.raw`function bdHealthStartupGateV155({children:e}){const{profile:t,isReady:n}=Un();bdUseLiveBusinessHealthV335(n&&!!t);const{snapshot:r}=bdUseBusinessHealthSnapshotV284(),[a]=S.useState(()=>{const l=window.location.pathname,u=l==="/"?Cle():l;if(u!=="/home")return!1;return bdHealthLaunchBeginV155(),!0});S.useLayoutEffect(()=>{a||bdStartupFirstPaintCompleteV201()},[a]),S.useEffect(()=>{if(!a)return;bdHealthStartupRouteHomeV155();let l=!1,u=0;const d=Date.now(),f=m=>{if(l)return;l=!0,window.clearInterval(u),window.clearTimeout(h),window.clearTimeout(g),bdHealthDiagnosticV155(m,{snapshotId:r?.snapshotId??null,score:r?.score??null,venueReady:n,hasProfile:!!t,elapsedMs:Date.now()-d,calculationVersion:r?.calculationVersion,venueId:r?.venueId}),bdHealthLaunchCompleteV155(m),bdStartupFirstPaintCompleteV201()},m=()=>{const y=Date.now()-d,j=document.querySelector('[data-bd-home-page="v151"]'),v=document.querySelector('[data-bd-home-health-index="business-health-v344-loading"], [data-bd-home-money="authoritative-loading-v344"]');y>=650&&j&&!v&&f("home-ready")},h=window.setTimeout(m,650),g=window.setTimeout(()=>f("bounded-home-handoff"),3500);return u=window.setInterval(m,80),()=>{l=!0,window.clearInterval(u),window.clearTimeout(h),window.clearTimeout(g)}},[a]);return e}
`;

function stripStartupSuffixes(source) {
  return source.replace(/-20260830-(?:seamless-startup-v356|bounded-startup-v357)/g, "");
}

function patchBundle(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  if (!source.includes('const bdBoundedStartupHandoffVersionV357="v357"')) {
    const marker = 'const bdSeamlessStartupVersionV356="v356"';
    if (!source.includes(marker)) throw new Error(`Seamless startup v356 marker missing in ${path.pathname}`);
    source = source.replace(marker, `const bdBoundedStartupHandoffVersionV357="v357";${marker}`);
  }
  const start = source.indexOf("function bdHealthStartupGateV155");
  const end = source.indexOf("function cEe(){", start);
  if (start < 0 || end < 0) throw new Error(`Startup coordinator anchors missing in ${path.pathname}`);
  source = source.slice(0, start) + coordinator + source.slice(end);
  writeFileSync(path, source);
  return true;
}

function patchBootstrap(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  source = stripStartupSuffixes(source);
  source = source.replace(
    /(index-BQGspy0I\.js\?v=[^"\n]*)/,
    "$1-20260830-seamless-startup-v356-20260830-bounded-startup-v357",
  );
  source = source.replace(
    'var bdStartupRecoveryVersionV341 = "seamless-startup-v356";',
    'var bdStartupRecoveryVersionV341 = "bounded-startup-v357";',
  );
  const recoveryStart = source.indexOf("  function bdRecoverStartupV341(reason, failureDetail) {");
  const recoveryEnd = source.indexOf('\n  window.addEventListener("bd:startup-complete"', recoveryStart);
  if (recoveryStart < 0 || recoveryEnd < 0) throw new Error(`Recovery anchors missing in ${path.pathname}`);
  const recovery = String.raw`  function bdRecoverStartupV341(reason, failureDetail) {
    if (!bdStartupPathV341() || bdStartupHealthyV341 || bdStartupRecoveryVisibleV341) return;
    if (failureDetail) {
      bdStartupFailureDetailV342 = failureDetail;
      bdReportStartupFailureV342(failureDetail);
    }
    bdRenderStartupRecoveryV341(reason, failureDetail || bdStartupFailureDetailV342);
  }
`;
  source = source.slice(0, recoveryStart) + recovery + source.slice(recoveryEnd);
  writeFileSync(path, source);
  return true;
}

function patchShell(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");
  if (!source.includes('name="bd-bounded-startup-handoff" content="v357"')) {
    source = source.replace(
      '<meta name="bd-seamless-startup" content="v356" />',
      '<meta name="bd-seamless-startup" content="v356" />\n    <meta name="bd-bounded-startup-handoff" content="v357" />',
    );
  }
  source = stripStartupSuffixes(source);
  source = source.replace(
    /(index-BQGspy0I\.js\?v=[^"\n]*)/,
    "$1-20260830-seamless-startup-v356-20260830-bounded-startup-v357",
  );
  source = source.replace(
    /(bardoctor-preview\.js\?v=[^"\n]*)/,
    "$1-20260830-seamless-startup-v356-20260830-bounded-startup-v357",
  );
  writeFileSync(path, source);
  return true;
}

const bundles = bundlePaths.filter(patchBundle).length;
const bootstraps = bootstrapPaths.filter(patchBootstrap).length;
const shells = shellPaths.filter(patchShell).length;
console.log(`Bounded startup handoff v357 applied to ${bundles} bundle(s), ${bootstraps} bootstrap(s), and ${shells} shell(s).`);
