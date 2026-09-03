import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("v396 hands native iOS launch pixels to one static web owner", async () => {
  const sources = await Promise.all([readFile(new URL("public/app.html", root), "utf8"), readFile(new URL("app/bar-doctor-response.ts", root), "utf8")]);
  for (const source of sources) {
    assert.match(source, /name="bd-native-continuity" content="v396"/);
    assert.match(source, /"390x844x3": "\/icons\/bardoctor-launch-390x844-3x-v394\.png"/);
    assert.match(source, /background-image: var\(--bd-launch-raster-v396\) !important/);
    assert.match(source, /\.bd-unified-splash-content-v394 \{ display: none !important; \}/);
    assert.match(source, /data-bd-native-continuity="v396"/);
    assert.match(source, /src="\/bardoctor-preview-v396\.js\?v=[^"]+"/);
    assert.doesNotMatch(source, /bd-static-startup-leaving/);
  }
});

test("v396 removes React splash renders and releases only for Home shell", async () => {
  const bundle = await readFile(new URL("public/assets/index-BQGspy0I.js", root), "utf8");
  assert.match(bundle, /bdNativeContinuityVersionV396="v396"/);
  assert.match(bundle, /function ble\(\)\{return null\}/);
  assert.doesNotMatch(bundle, /i\.jsx\(ble,\{\}\)/);
  const gate = bundle.slice(bundle.indexOf("function bdStartupFirstPaintCompleteV201"), bundle.indexOf("function cEe(){"));
  assert.match(gate, /\[data-bd-home-page\], \[data-bd-authenticated-home-shell\]/);
  assert.doesNotMatch(gate, /shell-timeout|setTimeout|data-bd-home-health-index|snapshot-ready|opacity|transform|transition/);
});

test("v396 uses a physical bootstrap filename and content-versioned module", async () => {
  assert.ok(existsSync(new URL("public/bardoctor-preview-v396.js", root)));
  const bootstrap = await readFile(new URL("public/bardoctor-preview-v396.js", root), "utf8");
  assert.match(bootstrap, /bdStartupRecoveryVersionV341 = "native-continuity-v396"/);
  assert.match(bootstrap, /\/assets\/index-BQGspy0I(?:-[a-f0-9]{12})?\.js\?v=/);
  if (existsSync(new URL("dist/client/app.html", root))) {
    const distHtml = await readFile(new URL("dist/client/app.html", root), "utf8");
    const distBootstrap = await readFile(new URL("dist/client/bardoctor-preview-v396.js", root), "utf8");
    assert.match(distHtml, /src="\/bardoctor-preview-v396\.js\?v=[^"]+"/);
    assert.match(distBootstrap, /\/assets\/index-BQGspy0I-[a-f0-9]{12}\.js\?v=/);
  }
});

test("v396 traces 60 fps and 30 fps samples for ten seconds", async () => {
  const html = await readFile(new URL("public/app.html", root), "utf8");
  assert.match(html, /bd-startup-frame-trace-v396/);
  assert.match(html, /now - bdTraceStartV396 < 10000/);
  assert.match(html, /frame\.t - last30 < 32/);
  assert.match(html, /visibleAfterRelease/);
});
