import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GET as getIntegrations } from "../app/integrations/route";
import { GET as getSettings } from "../app/settings/route";

const count = (value: string, pattern: RegExp): number =>
  (value.match(pattern) || []).length;

test("direct integrations enters the canonical SPA shell", async () => {
  const response = getIntegrations(
    new Request("https://bardoctor.test/integrations?venue=14"),
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(count(html, /data-bd-bottom-nav=/g), 0);
  assert.equal(count(html, /id="bd-canonical-bottom-nav"/g), 0);
  assert.match(html, /data-bd-static-startup="v201"[\s\S]*<div id="root"><\/div>/);
  assert.match(html, /app-shell-v185\.js/);
  assert.doesNotMatch(html, /data-bd-embedded="true"/);
});

test("embedded integrations delegates navigation to the parent shell", async () => {
  const response = getIntegrations(
    new Request("https://bardoctor.test/integrations?venue=14&embedded=1"),
  );
  const html = await response.text();

  assert.equal(count(html, /data-bd-bottom-nav=/g), 0);
  assert.equal(count(html, /id="bd-canonical-bottom-nav"/g), 0);
  assert.match(html, /data-bd-navigation-owner="parent-shell"/);
  assert.match(html, /data-bd-embedded="true"/);
});

test("settings serves the SPA shell and resolves to the existing user settings screen", async () => {
  const response = await getSettings();
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  assert.match(html, /data-bd-static-startup="v201"[\s\S]*<div id="root"><\/div>/);

  const bootstrap = await readFile(
    new URL("../public/bardoctor-preview.js", import.meta.url),
    "utf8",
  );
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  assert.match(
    bootstrap,
    /standaloneRoutes = \["\/forgot-password"\]/,
  );
  assert.doesNotMatch(
    bootstrap,
    /standaloneRoutes = \[[^\]]*"\/(?:integrations|reviews)"/,
  );
  assert.doesNotMatch(bootstrap, /standaloneRoutes = \[[^\]]*"\/settings"/);
  assert.match(
    bundle,
    /path:"\/settings",component:\(\)=>i\.jsx\(pt,\{component:bdSettingsPageV182\}\)/,
  );
  assert.match(
    bundle,
    /path:"\/integrations",component:\(\)=>i\.jsx\(pt,\{component:bdIntegrationsPage\}\)/,
  );
  assert.doesNotMatch(
    bundle,
    /path:"\/settings",component:\(\)=>i\.jsx\(pt,\{component:bdIntegrationsPage\}\)/,
  );
});

test("More keeps independent actions for settings and integrations", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );

  assert.match(
    bundle,
    /key:"integrations"[^}]*title:"Интеграции"[^}]*onClick:\(\)=>e\("\/integrations"\)/,
  );
  assert.match(
    bundle,
    /key:"settings"[^}]*title:"Настройки"[^}]*onClick:\(\)=>e\("\/settings"\)/,
  );
});

test("embedded layout has no retired navigation spacer or CSS-hidden second mount", async () => {
  const css = await readFile(
    new URL("../public/integrations.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /html\[data-bd-embedded="true"\] \.integration-page \{ padding-bottom: 28px; \}/,
  );
  assert.match(
    css,
    /html\[data-bd-embedded="true"\] body \{ padding-left: 0; \}/,
  );
  assert.doesNotMatch(
    css,
    /html\[data-bd-embedded="true"\][^{}]*\.integration-bottom-nav[^{}]*display:\s*none/s,
  );
});
