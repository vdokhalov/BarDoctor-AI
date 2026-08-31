import { existsSync, readFileSync, writeFileSync } from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const imagePath = new URL("../public/icons/bardoctor-launch-390x844-v348.png", import.meta.url);
const htmlPaths = [
  new URL("../public/app.html", import.meta.url),
  new URL("../app/bar-doctor-response.ts", import.meta.url),
];

if (!existsSync(imagePath)) throw new Error("iOS launch image v348 is missing.");
let bundle = readFileSync(bundlePath, "utf8");
let changed = false;
const marker = 'const bdIosLaunchScreenVersionV348="v348"';
if (!bundle.includes(marker)) {
  const anchor = 'const bdCoherentStartupVersionV347="v347"';
  if (!bundle.includes(anchor)) throw new Error("Coherent startup v347 must be applied first.");
  bundle = bundle.replace(anchor, `${marker};${anchor}`);
  writeFileSync(bundlePath, bundle);
  changed = true;
}

const launchLink = '    <link rel="apple-touch-startup-image" href="/icons/bardoctor-launch-390x844-v348.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />';
for (const path of htmlPaths) {
  let html = readFileSync(path, "utf8");
  const initial = html;
  if (!html.includes("bardoctor-launch-390x844-v348.png")) {
    html = html.replace('    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />', `    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n${launchLink}`);
  }
  if (!html.includes('name="bd-ios-launch-screen"')) {
    html = html.replace('<meta name="bd-coherent-startup" content="v347" />', '<meta name="bd-coherent-startup" content="v347" />\n    <meta name="bd-ios-launch-screen" content="v348" />');
  }
  if (html !== initial) { writeFileSync(path, html); changed = true; }
}

console.log(changed ? "Applied iOS launch screen v348." : "iOS launch screen v348 is already applied.");
