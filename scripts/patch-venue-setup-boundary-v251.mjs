import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const appHtmlPath = new URL("../public/app.html", import.meta.url);
const responsePath = new URL("../app/bar-doctor-response.ts", import.meta.url);

const marker = 'const bdVenueSetupBoundaryVersionV251="venue-setup-boundary-v251";';
const cacheSuffix = "-20260823-venue-setup-boundary-v251";

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
    'const bdExistingVenueGateVersionV249="existing-venue-gate-v249";',
    `const bdExistingVenueGateVersionV249="existing-venue-gate-v249";${marker}`,
    "venue setup boundary marker",
  );
  bundle = replaceOnce(
    bundle,
    'return r?{id:String(t),name:String(r.name||"")}:null',
    'return r?{id:String(t),name:String(r.name||""),hasProfile:r.hasProfile!==!1}:null',
    "venue profile state",
  );
  bundle = replaceOnce(
    bundle,
    'function bdVenueHomeV249(){const e=bdVenueAccessV249();return e?"/home?venue="+encodeURIComponent(e.id):"/home"}function Cle(){return Ot()?(Fse()||bdVenueAccessV249()?bdVenueHomeV249():"/setup"):"/login"}',
    'function bdVenueHomeV249(){const e=bdVenueAccessV249();return e?"/home?venue="+encodeURIComponent(e.id):"/home"}function bdVenueConfiguredV251(){return bdVenueAccessV249()?.hasProfile===!0}function Cle(){return Ot()?(Fse()||bdVenueConfiguredV251()?bdVenueHomeV249():"/setup"):"/login"}',
    "root setup boundary",
  );
  bundle = replaceOnce(
    bundle,
    'function oEe({component:e}){return Ot()?bdVenueAccessV249()?i.jsx(cS,{to:bdVenueHomeV249()}):i.jsx(e,{}):i.jsx(cS,{to:"/login"})}function pt({component:e}){if(!Ot())return i.jsx(cS,{to:"/login"});const{profile:n,isReady:r}=Un();return r?n?i.jsx(e,{}):bdVenueAccessV249()?i.jsx(bdVenueProfileRecoveryV249,{}):i.jsx(cS,{to:"/setup"}):i.jsx(ble,{})}',
    'function oEe({component:e}){return Ot()?bdVenueConfiguredV251()?i.jsx(cS,{to:bdVenueHomeV249()}):i.jsx(e,{}):i.jsx(cS,{to:"/login"})}function pt({component:e}){if(!Ot())return i.jsx(cS,{to:"/login"});const{profile:n,isReady:r}=Un();return r?n?i.jsx(e,{}):bdVenueConfiguredV251()?i.jsx(bdVenueProfileRecoveryV249,{}):i.jsx(cS,{to:"/setup"}):i.jsx(ble,{})}',
    "configured venue route guards",
  );
  fs.writeFileSync(bundlePath, bundle);
}

let bootstrap = fs.readFileSync(bootstrapPath, "utf8");
if (!bootstrap.includes(cacheSuffix)) {
  bootstrap = replaceOnce(
    bootstrap,
    '-20260823-embedded-login-transition-v250";',
    `-20260823-embedded-login-transition-v250${cacheSuffix}";`,
    "application bundle cache token",
  );
  fs.writeFileSync(bootstrapPath, bootstrap);
}

for (const path of [appHtmlPath, responsePath]) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(cacheSuffix)) continue;
  source = replaceOnce(
    source,
    '-20260823-embedded-login-transition-v250"></script>',
    `-20260823-embedded-login-transition-v250${cacheSuffix}"></script>`,
    `${path.pathname} bootstrap cache token`,
  );
  fs.writeFileSync(path, source);
}
