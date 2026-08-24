import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);

const marker = 'const bdEmbeddedLoginTransitionVersionV250="embedded-login-transition-v250";';
const cacheSuffix = "-20260823-embedded-login-transition-v250";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  const second = source.indexOf(before, first + 1);
  if (first < 0 || second >= 0) {
    throw new Error(`${label}: expected exactly one match`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let bundle = fs.readFileSync(bundlePath, "utf8");
if (!bundle.includes(marker)) {
  bundle = replaceOnce(
    bundle,
    'function bdAuthCompleteLoginV248(){const e=bdAuthHomeTargetV248();try{sessionStorage.removeItem("bd_venue_profile_recovery_v249"),window.location.assign(e)}catch{window.location.href=e}}',
    `${marker}function bdAuthCompleteLoginV248(){const e=bdAuthHomeTargetV248();try{sessionStorage.removeItem("bd_venue_profile_recovery_v249")}catch{}try{window.history.replaceState(window.history.state,"",e),window.location.reload()}catch{try{window.location.replace(e)}catch{window.location.href=e}}}`,
    "embedded login transition",
  );
  fs.writeFileSync(bundlePath, bundle);
}

let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes(cacheSuffix)) {
  bootstrap = replaceOnce(
    bootstrap,
    '-20260823-existing-venue-gate-v249";',
    `-20260823-existing-venue-gate-v249${cacheSuffix}";`,
    "application bundle cache token",
  );
  fs.writeFileSync(bootstrapPath, bootstrap);
}

for (const path of [appHtmlPath, responsePath]) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(cacheSuffix)) continue;
  source = replaceOnce(
    source,
    '-20260823-existing-venue-gate-v249"></script>',
    `-20260823-existing-venue-gate-v249${cacheSuffix}"></script>`,
    `${path.pathname} bootstrap cache token`,
  );
  fs.writeFileSync(path, source);
}
