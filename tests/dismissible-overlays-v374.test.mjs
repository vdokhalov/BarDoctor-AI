import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../public/canonical-taxonomy-v336.css", import.meta.url), "utf8");
const shells = [
  fs.readFileSync(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/app.html", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
];

test("taxonomy action sheet has explicit and accessible exits", () => {
  assert.match(bundle, /bd-tax-node-popover-v364 bd-tax-node-popover-v374",role:"dialog","aria-modal":!0/);
  assert.match(bundle, /className:"bd-tax-node-close-v374"/);
  assert.match(bundle, /className:"bd-tax-node-done-v374"/);
  assert.match(bundle, /className:"bd-tax-node-backdrop-v374"/);
  assert.match(bundle, /"aria-label":"Закрыть меню действий"/);
});

test("taxonomy action sheet closes from Escape and browser Back", () => {
  assert.match(bundle, /Q\.key==="Escape"&&bdCloseTaxonomyActionV374\(Q\)/);
  assert.match(bundle, /history\.pushState\(n,"",location\.href\)/);
  assert.match(bundle, /window\.addEventListener\("popstate"/);
  assert.match(bundle, /removeAttribute\("open"\)/);
});

test("taxonomy action sheet keeps touch exits visible on mobile", () => {
  assert.match(css, /\.bd-tax-node-close-v374 \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
  assert.match(css, /\.bd-tax-node-backdrop-v374 \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.bd-tax-node-popover-v374 \{[\s\S]*?max-height:/);
});

test("application shells invalidate the dismissible overlay assets", () => {
  for (const shell of shells) {
    assert.match(shell, /index-BQGspy0I\.js\?v=[^"']*bd-dismissible-overlays-v374/);
  }
  for (const shell of shells.slice(0, 2)) {
    assert.match(shell, /canonical-taxonomy-v336\.css\?v=[^"']*bd-dismissible-overlays-v374/);
  }
});
