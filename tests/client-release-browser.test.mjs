import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { Miniflare } from "miniflare";
import { patchReceiptCost } from "../scripts/lib/phase5-receipt-cost.mjs";

test("built Worker and static HTML execute the final receipt-only client on mobile and desktop", { timeout: 120000 }, async () => {
  const require = createRequire(import.meta.url);
  const { chromium, devices } = require("playwright-core");
  const { resolveBrowserExecutable, chromiumArgs } = require("../scripts/browser-runtime.cjs");
  const client = path.resolve("dist/client");
  const workerConfig = JSON.parse(fs.readFileSync("dist/server/wrangler.json", "utf8"));
  const server = path.resolve("dist/server");
  const modules = ["index.js", ...fs.readdirSync(server, { recursive: true })
    .filter(file => file !== "index.js" && /\.(?:m?js)$/.test(file)).sort()]
    .map(file => ({ type: "ESModule", path: path.join(server, file) }));
  const staticHtml = fs.readFileSync(path.join(client, "app.html"), "utf8");
  const expected = staticHtml.match(/\/assets\/(index-BQGspy0I-([a-f0-9]{12})\.js)/);
  assert.ok(expected);
  const staticResponse = request => {
    const filename = path.resolve(client, "." + new URL(request.url).pathname);
    assert.ok(filename.startsWith(client + path.sep));
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) return new Response(null, { status: 404 });
    return new Response(fs.readFileSync(filename));
  };
  // The actual compiled Worker supplies HTML. Browser API traffic is deliberately
  // denied below; this test neither copies nor contacts a production database.
  const worker = new Miniflare({ modules, modulesRoot: server,
    compatibilityDate: workerConfig.compatibility_date, compatibilityFlags: workerConfig.compatibility_flags,
    d1Databases: ["DB"], r2Buckets: ["BUCKET"], serviceBindings: { ASSETS: staticResponse } });
  let browser;
  try {
    const response = await worker.dispatchFetch("http://offline.test/home");
    assert.equal(response.status, 200, "Actual compiled Worker must serve startup HTML");
    const workerHtml = await response.text();
    browser = await chromium.launch({ executablePath: await resolveBrowserExecutable(chromium.executablePath()), args: chromiumArgs, headless: true });
    for (const profile of [{ name: "iPhone 13", options: devices["iPhone 13"] }, { name: "desktop", options: { viewport: { width: 1280, height: 720 } } }]) {
      for (const [entry, html] of [["static", staticHtml], ["worker", workerHtml]]) {
        const context = await browser.newContext(profile.options);
        try {
          const errors = [], requested = new Set();
          await context.route("**/*", async route => {
            const url = new URL(route.request().url());
            assert.equal(url.origin, "http://offline.test", "Release smoke cannot contact an external service");
            if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ ok: false, needsLogin: true }) });
            if (!/\.[a-z0-9]+$/i.test(url.pathname)) return route.fulfill({ contentType: "text/html", body: html });
            const filename = path.resolve(client, "." + url.pathname);
            assert.ok(filename.startsWith(client + path.sep));
            const body = fs.readFileSync(filename);
            if (/\/assets\/index-BQGspy0I.*\.js$/.test(url.pathname)) {
              requested.add(url.pathname);
              assert.equal(url.pathname, "/assets/" + expected[1]);
              assert.equal(createHash("sha256").update(body).digest("hex").slice(0, 12), expected[2]);
              assert.equal(patchReceiptCost(body.toString("utf8")), body.toString("utf8"));
            }
            return route.fulfill({ body, contentType: filename.endsWith(".js") ? "text/javascript" : filename.endsWith(".css") ? "text/css" : "application/octet-stream" });
          });
          const page = await context.newPage();
          page.on("pageerror", error => errors.push(error.message));
          await page.goto("http://offline.test/home", { waitUntil: "domcontentloaded" });
          await page.waitForURL("**/login", { timeout: 10000 });
          const email = page.locator('input[type="email"]');
          await email.click({ timeout: 5000 });
          await email.fill("release-test@example.invalid");
          assert.equal(await email.inputValue(), "release-test@example.invalid");
          const scripts = await page.evaluate(() => Array.from(document.scripts).map(script => script.src).filter(Boolean));
          const executed = scripts.filter(src => /\/assets\/index-BQGspy0I.*\.js/.test(src));
          assert.equal(executed.length, 1, "Inspect executable scripts, not modulepreload alone");
          assert.equal(new URL(executed[0]).pathname, "/assets/" + expected[1]);
          const loader = scripts.find(src => /\/bardoctor-preview-v397\.js/.test(src));
          assert.ok(loader);
          const loaderBytes = fs.readFileSync(path.join(client, new URL(loader).pathname));
          assert.equal(new URL(loader).searchParams.get("bd-release"), createHash("sha256").update(loaderBytes).digest("hex").slice(0, 12));
          assert.deepEqual([...requested], ["/assets/" + expected[1]]);
          assert.deepEqual(errors, []);
          console.info(JSON.stringify({ entry, profile: profile.name, viewport: profile.options.viewport, executedAsset: expected[1], receiptOnly: true, loginInteractive: true }));
        } finally { await context.close(); }
      }
    }
  } finally { if (browser) await browser.close(); await worker.dispose(); }
});
