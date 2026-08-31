import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bundlePath = path.join(root, "public/assets/index-BQGspy0I.js");
const marker = "bd-quick-add-purchase-v372";
let source = fs.readFileSync(bundlePath, "utf8");

function replaceExactly(before, after, label, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected}, found ${count}`);
  source = source.split(before).join(after);
}

if (!source.includes(marker)) {
  replaceExactly(
    "function Tle(){",
    'const bdQuickAddPurchaseVersionV372="v372";/* bd-quick-add-purchase-v372 */\nfunction Tle(){',
    "Quick-add version marker",
  );

  replaceExactly(
    "function f(m){a(!1);t(m)}",
    'function f(m){a(!1);if(String(m).startsWith("/suppliers?create=1")&&window.location.pathname.startsWith("/suppliers")){window.dispatchEvent(new CustomEvent("bd:open-purchase-entry-v372"));return}t(m)}',
    "Same-page purchase action",
  );

  replaceExactly(
    'S.useEffect(()=>{if(!n||!ue)return;const w=new URLSearchParams(t);if(w.get("create")==="1"||w.get("scan")==="1"){Y(!0),window.bdSyncNavigationQuery({create:null,scan:null})}},[n,t,ue]);const fe=',
    'S.useEffect(()=>{if(!n||!ue)return;const w=new URLSearchParams(t);if(w.get("create")==="1"||w.get("scan")==="1"){Y(!0),window.bdSyncNavigationQuery({create:null,scan:null})}},[n,t,ue]);S.useEffect(()=>{const w=()=>Y(!0);return window.addEventListener("bd:open-purchase-entry-v372",w),()=>window.removeEventListener("bd:open-purchase-entry-v372",w)},[]);const fe=',
    "Purchase-entry event bridge",
  );

  fs.writeFileSync(bundlePath, source);
}

for (const relativePath of [
  "app/bar-doctor-response.ts",
  "public/app.html",
  "public/bardoctor-preview.js",
]) {
  const filePath = path.join(root, relativePath);
  let contents = fs.readFileSync(filePath, "utf8");
  contents = contents.replace(
    /index-BQGspy0I\.js\?v=([^"']+)/g,
    (match, version) => version.includes(marker)
      ? match
      : `index-BQGspy0I.js?v=${version}-${marker}`,
  );
  fs.writeFileSync(filePath, contents);
}

console.log(`${marker}: applied`);
