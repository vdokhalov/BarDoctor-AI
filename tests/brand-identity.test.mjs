import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("the cloche + pulse mark is the only application icon artwork", async () => {
  const [mark, favicon] = await Promise.all([
    readFile(new URL("../public/icons/bardoctor-mark-v159.svg", import.meta.url), "utf8"),
    readFile(new URL("../public/favicon-v159.svg", import.meta.url), "utf8"),
  ]);

  for (const svg of [mark, favicon]) {
    assert.match(svg, /viewBox="0 0 512 512"/);
    assert.match(svg, /#050A20/i);
    assert.match(svg, /#D14CFF/i);
    assert.match(svg, /#18C9FF/i);
    assert.match(svg, /M116 336c0-97\.2 62\.7-176 140-176s140 78\.8 140 176/);
    assert.match(svg, /M92 336h113l39-88 50 154 40-110 25 44h61/);
    assert.doesNotMatch(svg, /<text\b/i);
  }
});

test("all install, maskable, Apple and favicon raster sizes are present", async () => {
  const expected = new Map([
    ["bardoctor-v159-512.png", 512],
    ["bardoctor-v159-192.png", 192],
    ["bardoctor-v159-maskable-512.png", 512],
    ["bardoctor-v159-maskable-192.png", 192],
    ["bardoctor-v159-apple-180.png", 180],
    ["bardoctor-v159-favicon-64.png", 64],
    ["bardoctor-v159-favicon-32.png", 32],
    ["bardoctor-v159-favicon-16.png", 16],
  ]);

  for (const [name, size] of expected) {
    const buffer = await readFile(new URL(`../public/icons/${name}`, import.meta.url));
    assert.deepEqual(pngDimensions(buffer), { width: size, height: size });
    assert.ok(buffer.byteLength > 500, `${name} must contain rendered artwork`);
  }

  const [legacy192, versioned192, legacy512, versioned512, legacyApple, versionedApple] =
    await Promise.all([
      readFile(new URL("../public/icons/icon-192.png", import.meta.url)),
      readFile(new URL("../public/icons/bardoctor-v159-192.png", import.meta.url)),
      readFile(new URL("../public/icons/icon-512.png", import.meta.url)),
      readFile(new URL("../public/icons/bardoctor-v159-512.png", import.meta.url)),
      readFile(new URL("../public/icons/apple-touch-icon.png", import.meta.url)),
      readFile(new URL("../public/icons/bardoctor-v159-apple-180.png", import.meta.url)),
    ]);
  assert.ok(legacy192.equals(versioned192));
  assert.ok(legacy512.equals(versioned512));
  assert.ok(legacyApple.equals(versionedApple));
});

test("manifest and HTML metadata use cache-busted v159 brand assets", async () => {
  const [manifest, response, layout, appHtml] = await Promise.all([
    readFile(new URL("../app/manifest.json/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
  ]);

  assert.match(manifest, /bardoctor-v159-192\.png/);
  assert.match(manifest, /bardoctor-v159-512\.png/);
  assert.match(manifest, /bardoctor-v159-maskable-192\.png/);
  assert.match(manifest, /bardoctor-v159-maskable-512\.png/);
  assert.match(manifest, /purpose: "any"/);
  assert.match(manifest, /purpose: "maskable"/);
  assert.match(manifest, /background_color: "#070b24"/);
  assert.match(manifest, /no-cache, max-age=0, must-revalidate/);
  assert.doesNotMatch(manifest, /purpose: "any maskable"/);

  for (const html of [response, layout, appHtml]) {
    assert.match(html, /manifest\.json\?v=20260812-brand-v159/);
    assert.match(html, /bardoctor-v159-apple-180\.png/);
    assert.match(html, /favicon-v159\.svg/);
  }
  assert.match(response, /rel="preload" href="\/icons\/bardoctor-mark-v159\.svg"/);
  assert.match(response, /bardoctor-preview\.js\?v=20260815-seamless-startup-v202/);
  assert.match(appHtml, /bardoctor-preview\.js\?v=20260815-seamless-startup-v202/);
});

test("splash and interface brand marks use the same symbol without BD letters", async () => {
  const [bundle, routes] = await Promise.all([
    readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8"),
    Promise.all([
      "market/route.ts",
      "data-control/route.ts",
      "opportunities/route.ts",
      "venues/new/route.ts",
      "forgot-password/page.tsx",
      "notifications/route.ts",
    ].map((path) => readFile(new URL(`../app/${path}`, import.meta.url), "utf8")))
      .then((parts) => parts.join("\n")),
  ]);

  assert.match(bundle, /data-bd-brand-splash":"v159/);
  assert.match(bundle, /data-bd-brand-mark":"cloche-pulse-v159/);
  assert.match(bundle, /src:"\/icons\/bardoctor-mark-v159\.svg"/);
  assert.match(bundle, /function Wle\(\{onStart:e\}\).*data-bd-brand-mark":"cloche-pulse-v159/s);
  assert.match(bundle, /children:"Bar"/);
  assert.match(bundle, /children:"Doctor"/);
  assert.doesNotMatch(bundle, /bd-auth-brand-mark",children:"BD"/);
  assert.doesNotMatch(bundle, /i\.jsx\("span",\{children:"BD"\}\)/);
  assert.doesNotMatch(bundle, /children:i\.jsxs\("svg",\{width:"34",height:"34"/);

  assert.match(routes, /bardoctor-mark-v159\.svg/);
  assert.doesNotMatch(routes, />BD</);
  assert.doesNotMatch(routes, /icons\/icon-192\.png/);
});

test("the retired production logo file is removed", async () => {
  await assert.rejects(
    stat(new URL("../public/bardoctor-logo.png", import.meta.url)),
    (error) => error?.code === "ENOENT",
  );
});
