import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const htmlPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

let bundle = readFileSync(bundlePath, "utf8");
let bootstrap = readFileSync(bootstrapPath, "utf8");
let changed = false;
const marker = 'const bdBrandedStartupHandoffVersionV346="v346"';

if (!bundle.includes(marker)) {
  const anchor = 'const bdAuthenticatedHomeShellVersionV345="v345"';
  if (!bundle.includes(anchor)) throw new Error("Authenticated Home shell v345 must be applied first.");
  bundle = bundle.replace(anchor, `${marker};${anchor}`);
  changed = true;
}

const desiredGate = 'function ble(){const e=!!(Ot()&&gz()&&bdVenueAccessV249()),[t,n]=S.useState(!1);';
if (!bundle.includes(desiredGate)) {
  const start = bundle.indexOf("function ble(){");
  const end = bundle.indexOf("\nconst j7=", start);
  if (start < 0 || end < 0) throw new Error("Startup splash component was not found.");
  const current = bundle.slice(start, end);
  const fallbackAnchor = '?i.jsx(bdAuthenticatedHomeBootV345,{}):';
  const fallbackAt = current.indexOf(fallbackAnchor);
  if (fallbackAt < 0) throw new Error("Authenticated Home v345 splash gate was not found.");
  const brandSplash = current.slice(fallbackAt + fallbackAnchor.length, -1);
  const replacement = `${desiredGate}S.useEffect(()=>{if(!e)return;const r=setTimeout(()=>n(!0),1500);return()=>clearTimeout(r)},[e]);return e&&t?i.jsx(bdAuthenticatedHomeBootV345,{}):${brandSplash}}`;
  bundle = bundle.slice(0, start) + replacement + bundle.slice(end);
  changed = true;
}

if (!bootstrap.includes("20260829-branded-startup-v346")) {
  const token = "20260829-authenticated-home-v345";
  if (!bootstrap.includes(token)) throw new Error("Authenticated Home v345 cache token not found.");
  bootstrap = bootstrap.replace(token, `${token}-20260829-branded-startup-v346`);
  changed = true;
}

for (const path of htmlPaths) {
  let html = readFileSync(path, "utf8");
  const initial = html;
  html = html.replace(
    'document.documentElement.setAttribute("data-bd-authenticated-startup", "v345");\n            window.__bdStartupVenueV345 = String(bdVenueV345.name || "Заведение");',
    'window.__bdStartupVenueV345 = String(bdVenueV345.name || "Заведение");\n            setTimeout(function () {\n              document.documentElement.setAttribute("data-bd-authenticated-startup", "v345");\n              var bdVenueLabelV346 = document.querySelector(".bd-static-auth-venue-v345");\n              if (bdVenueLabelV346) bdVenueLabelV346.textContent = window.__bdStartupVenueV345;\n            }, 1500);',
  );
  if (!html.includes('name="bd-branded-startup-handoff"')) {
    html = html.replace('<meta name="bd-authenticated-home-shell" content="v345" />', '<meta name="bd-authenticated-home-shell" content="v345" />\n    <meta name="bd-branded-startup-handoff" content="v346" />');
  }
  html = html.replace(/(bardoctor-preview\.js\?v=[^"\n]*authenticated-home-v345)(?![^"\n]*branded-startup-v346)/g, "$1-20260829-branded-startup-v346");
  if (html !== initial) { writeFileSync(path, html); changed = true; }
}

if (changed) {
  writeFileSync(bundlePath, bundle);
  writeFileSync(bootstrapPath, bootstrap);
  console.log("Applied branded startup handoff v346.");
} else console.log("Branded startup handoff v346 is already applied.");
