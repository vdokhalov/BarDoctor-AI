import { readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const bootstrapPath = new URL("../public/bardoctor-preview.js", import.meta.url);
const htmlPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

const obsoleteAuthProbe = `
        try {
          var bdSessionV345 = localStorage.getItem("bd_session");
          var bdTokenV345 = localStorage.getItem("bd_session_token");
          var bdVenueIdV345 = localStorage.getItem("bd_active_venue_id");
          var bdContextV345 = bdSessionV345 ? JSON.parse(localStorage.getItem("bd_venue_context__" + bdSessionV345) || "null") : null;
          var bdVenueV345 = Array.isArray(bdContextV345 && bdContextV345.venues) ? bdContextV345.venues.find(function (venue) { return String(venue && venue.id) === String(bdVenueIdV345) && venue.status !== "inactive" && venue.hasProfile !== false; }) : null;
          if (bdSessionV345 && bdTokenV345 && bdVenueV345) {
            window.__bdStartupVenueV345 = String(bdVenueV345.name || "Заведение");
          }
        } catch (error) { /* keep the public brand splash */ }`;

let bundle = readFileSync(bundlePath, "utf8");
let bootstrap = readFileSync(bootstrapPath, "utf8");
let changed = false;
const marker = 'const bdCoherentStartupVersionV347="v347"';

if (!bundle.includes(marker)) {
  const anchor = 'const bdBrandedStartupHandoffVersionV346="v346"';
  if (!bundle.includes(anchor)) throw new Error("Branded startup handoff v346 must be applied first.");
  bundle = bundle.replace(anchor, `${marker};${anchor}`);
  changed = true;
}

if (!bundle.includes('function ble(){return i.jsx("div",{"data-bd-splash":"brand-loading-v347"')) {
  const start = bundle.indexOf("function ble(){");
  const end = bundle.indexOf("\nconst j7=", start);
  if (start < 0 || end < 0) throw new Error("Startup splash component was not found.");
  const current = bundle.slice(start, end);
  const brandAt = current.indexOf('i.jsx("div",{"data-bd-splash":"brand-loading-v332"');
  if (brandAt < 0) throw new Error("Branded splash body was not found.");
  const brandSplash = current.slice(brandAt, -1).replace('"brand-loading-v332"', '"brand-loading-v347"');
  bundle = bundle.slice(0, start) + `function ble(){return ${brandSplash}}` + bundle.slice(end);
  changed = true;
}

if (!bootstrap.includes("20260829-coherent-startup-v347")) {
  const token = "20260829-branded-startup-v346";
  if (!bootstrap.includes(token)) throw new Error("Branded startup v346 cache token not found.");
  bootstrap = bootstrap.replace(token, `${token}-20260829-coherent-startup-v347`);
  changed = true;
}

for (const path of htmlPaths) {
  let html = readFileSync(path, "utf8");
  const initial = html;
  html = html.split(obsoleteAuthProbe).join("");
  html = html.replace(/\s*setTimeout\(function \(\) \{\s*document\.documentElement\.setAttribute\("data-bd-authenticated-startup", "v345"\);\s*var bdVenueLabelV346 = document\.querySelector\("\.bd-static-auth-venue-v345"\);\s*if \(bdVenueLabelV346\) bdVenueLabelV346\.textContent = window\.__bdStartupVenueV345;\s*\}, 1500\);/, "");
  if (!html.includes('name="bd-coherent-startup"')) {
    html = html.replace('<meta name="bd-branded-startup-handoff" content="v346" />', '<meta name="bd-branded-startup-handoff" content="v346" />\n    <meta name="bd-coherent-startup" content="v347" />');
  }
  html = html.replace(/(bardoctor-preview\.js\?v=[^"\n]*branded-startup-v346)(?![^"\n]*coherent-startup-v347)/g, "$1-20260829-coherent-startup-v347");
  if (html !== initial) { writeFileSync(path, html); changed = true; }
}

if (changed) {
  writeFileSync(bundlePath, bundle);
  writeFileSync(bootstrapPath, bootstrap);
  console.log("Applied coherent startup v347.");
} else console.log("Coherent startup v347 is already applied.");
