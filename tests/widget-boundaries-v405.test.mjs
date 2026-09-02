import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");

test("five critical surfaces are isolated by a reusable render boundary", () => {
  assert.match(source, /bd-widget-boundaries-v405/);
  assert.match(source, /class bdWidgetBoundaryV405 extends S\.Component/);
  assert.match(source, /static getDerivedStateFromError\(\)/);
  assert.match(source, /componentDidCatch\(e\)/);
  for (const name of ["business-health", "ai-doctor", "reviews", "integrations", "notifications"]) {
    assert.match(source, new RegExp(`bdGuardWidgetV405\\(\\"${name}\\"`), name);
  }
});

test("a safe failure probe proves fallback scope without weakening production behavior", () => {
  assert.match(source, /bd-widget-failure/);
  assert.match(source, /BD_WIDGET_FAILURE_PROBE/);
  assert.match(source, /data-bd-widget-fallback/);
  assert.match(source, /Остальная часть BarDoctor продолжает работать/);
  assert.match(source, /window\.dispatchEvent\(new CustomEvent\("bd:widget-error"/);
});
