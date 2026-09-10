import { existsSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const shellPaths = [
  new URL("public/app.html", root),
  new URL("app/bar-doctor-response.ts", root),
  new URL("dist/client/app.html", root),
];
const bootstrapPaths = [
  new URL("public/bardoctor-preview-v396.js", root),
  new URL("dist/client/bardoctor-preview-v396.js", root),
];

// A fresh embedded browser may have no session. The SPA renders /login rather
// than Home; release the launch overlay only after that auth surface commits.
function patchAuthHandoff(path) {
  if (!existsSync(path)) return false;
  const source = readFileSync(path, "utf8");
  if (source.includes("bd-auth-splash-handoff-v423")) return false;
  const original = 'function bdAuthPageLifecycle(){S.useEffect(()=>{document.body.classList.add("bd-auth-active");return()=>document.body.classList.remove("bd-auth-active")},[])}';
  if (!source.includes(original)) throw new Error("Auth page lifecycle contract missing");
  const replacement = `function bdAuthPageLifecycle(){
S.useLayoutEffect(()=>{
  /* bd-auth-splash-handoff-v423: a committed login is a valid startup result. */
  if(!["/login","/register"].includes(window.location.pathname))return;
  if(!document.querySelector('main[data-bd-auth="split-v1"]'))return;
  if(document.documentElement.getAttribute("data-bd-startup-pending")!=="v201")return;
  document.documentElement.removeAttribute("data-bd-startup-pending");
  document.documentElement.removeAttribute("data-bd-startup-completing");
  document.querySelector('[data-bd-static-startup="v201"]')?.remove();
  window.__bdSplashReleasedV396=true;
  window.dispatchEvent(new CustomEvent("bd:startup-complete",{detail:{version:"auth-handoff-v423"}}));
},[]);
S.useEffect(()=>{document.body.classList.add("bd-auth-active");return()=>document.body.classList.remove("bd-auth-active")},[])};
`;
  writeFileSync(path, source.replace(original, replacement));
  return true;
}

function legacyModuleSource() {
  const source = readFileSync(new URL("public/bardoctor-preview-v396.js", root), "utf8");
  const match = source.match(/script\.src = "(\/assets\/index-BQGspy0I\.js\?v=[^"]+)"/);
  if (!match) throw new Error("v396 module cache identity is missing");
  return match[1];
}

function patchBootstrap(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");

  source = source.replace(
    '  window.__bdAuthBootstrapV274 = { state: "loading", reason: "auth_bootstrap_pending" };',
    `  /* bd-shell-first-startup-v397: render from the last verified local shell while auth refreshes. */
  var bdCachedSessionV397 = localStorage.getItem("bd_session");
  var bdCachedTokenV397 = localStorage.getItem("bd_session_token");
  var bdCachedVenueV397 = localStorage.getItem("bd_active_venue_id");
  window.__bdAuthBootstrapV274 = bdCachedSessionV397 && bdCachedTokenV397
    ? (bdCachedVenueV397
      ? { state: "ready", reason: "cached_shell_ready_v397" }
      : { state: "onboarding_required", reason: "cached_shell_needs_venue_v397" })
    : { state: "unauthenticated", reason: "cached_shell_no_session_v397" };`,
  );
  source = source.replace(
    '  var bdStartupRecoveryVersionV341 = "native-continuity-v396";',
    '  var bdStartupRecoveryVersionV341 = "shell-first-startup-v397";',
  );
  source = source.replace(
    /script\.src = "(\/assets\/index-BQGspy0I(?:-[a-f0-9]{12})?\.js)\?v=[^"]+";/,
    'script.src = "$1?v=startup-performance-v343-shell-first-v397-auth-handoff-v423-root-handoff-v424";',
  );
  source = source.replace(
    /  try \{\r?\n    var demoEmail = "demo@bardoctor\.app";/,
    `  /* Start the application shell before any network-bound auth or business refresh. */
  observePurchaseConfirmation();
  installProtectedOriginalLinks();
  installNavigationConsistencyGuards();
  loadApplication();

  try {
    var demoEmail = "demo@bardoctor.app";`,
  );
  source = source.replace(
    '      await refreshServerInventoryCacheV235();',
    '      void refreshServerInventoryCacheV235();',
  );
  source = source.replace(
    '      localStorage.removeItem("bd_active_venue_is_primary");',
    `      localStorage.removeItem("bd_active_venue_is_primary");
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
        return;
      }`,
  );
  source = source.replace(
    /  observePurchaseConfirmation\(\);\r?\n  installProtectedOriginalLinks\(\);\r?\n  installNavigationConsistencyGuards\(\);\r?\n  loadApplication\(\);\r?\n  injectSupplierAlternativesEntry\(\);/,
    '  injectSupplierAlternativesEntry();',
  );

  const output = new URL("bardoctor-preview-v397.js", path);
  const observability = readFileSync(new URL("public/bd-request-observability.js", root), "utf8");
  writeFileSync(output, observability + "\n" + source);
  return true;
}

function patchShell(path) {
  if (!existsSync(path)) return false;
  let source = readFileSync(path, "utf8");

  source = source.replace(/\n\s*<!-- bd-shell-first-compat-v397[\s\S]*?-->/, "");
  source = source.replace(/\n\s*<!-- compatibility: src="\/bardoctor-preview-v396\.js\?v=native-continuity-v396" defer -->/, "");
  source = source.replace(/(?:\r?\n\s*<script src="\/bardoctor-preview-v397\.js\?v=[^"]+" defer><\/script>)+/g, "");
  source = source.replace(/\n\s*<!-- bd-bootstrap-history-v396[\s\S]*?-->/, "");
  source = source.replace(/\n\s*<script src="\/bardoctor-preview-v396\.js\?v=[^"]+" defer><\/script>/, "");
  const legacySource = legacyModuleSource();
  const moduleSource = legacySource.includes("menu-nomenclature-action-v351")
    ? legacySource
    : `${legacySource}-20260829-menu-nomenclature-action-v351`;
  const moduleVersion = moduleSource.split("?v=")[1];
  const bootstrapVersion = `20260821-inventory-cache-reconciliation-v235-20260822-navigation-v247-20260829-authoritative-home-v344-20260829-authenticated-home-v345-20260829-branded-startup-v346-20260829-coherent-startup-v347-${moduleVersion}`;
  source = source.replace(
    /rel="modulepreload" href="(\/assets\/index-BQGspy0I(?:-[a-f0-9]{12})?\.js)\?v=[^"]+"/,
    (_match, pathname) => `rel="modulepreload" href="${pathname}?v=${moduleVersion}"`,
  );
  source = source.replace(
    /(\s*<link rel="modulepreload"[^>]+>)/,
    `$1
    <!-- bd-shell-first-compat-v397 <script src="/bardoctor-preview.js?v=${bootstrapVersion}" defer></script><script src="/bardoctor-preview-v396.js?v=native-continuity-v396" defer></script> -->
    <script src="/bardoctor-preview-v397.js?v=shell-first-startup-v397-observability-v1-auth-handoff-v423-root-handoff-v424-error-location-v425" defer></script>`,
  );
  source = source.replace(
    /(<script src="\/server-migration-discovery-v262\.js[^>]*><\/script>)(?:-[a-zA-Z0-9]+)+/,
    "$1",
  );
  if (!source.includes('name="bd-shell-first-startup" content="v397"')) {
    source = source.replace(
      '<meta name="bd-native-continuity" content="v396" />',
      '<meta name="bd-native-continuity" content="v396" />\n    <meta name="bd-shell-first-startup" content="v397" />',
    );
  }
  source = source.replace(
    /data-bd-native-continuity="v396"(?: data-bd-native-fullscreen-raster="v398")?(?: data-bd-shell-first-startup="v397")? role="status"/,
    'data-bd-native-continuity="v396" data-bd-native-fullscreen-raster="v398" data-bd-shell-first-startup="v397" role="status"',
  );
  writeFileSync(path, source);
  return true;
}

const authBundles = [new URL("public/assets/index-BQGspy0I.js", root), new URL("dist/client/assets/index-BQGspy0I.js", root)];
console.log(`Shell-first startup v397 applied to ${authBundles.filter(patchAuthHandoff).length} auth handoff(s), ${bootstrapPaths.filter(patchBootstrap).length} bootstrap(s) and ${shellPaths.filter(patchShell).length} shell(s).`);
