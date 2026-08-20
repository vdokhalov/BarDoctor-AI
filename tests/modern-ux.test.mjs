import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";
import { runModernUxAudit } from "../scripts/audit-modern-ux.mjs";

test("all production routes satisfy the Modern UX RC contract", async () => {
  const result = await runModernUxAudit();
  assert.deepEqual(result, {
    routes: 58,
    surfaceTemplates: 11,
    resolvedContracts: 30,
    byCategory: {
      hierarchyAndComprehension: 5,
      accessibilityAndNavigation: 8,
      forms: 5,
      longFlowsAndStates: 7,
      responsiveAndPerceivedPerformance: 5,
    },
  });
});

test("Modern UX runtime and production bundle parse successfully", async () => {
  for (const path of [
    "../public/modern-polish.js",
    "../public/assets/index-BQGspy0I.js",
  ]) {
    const text = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotThrow(() => parse(text, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowAwaitOutsideFunction: true,
    }));
  }
});

test("built artifact contains the shared polish layer", async () => {
  const [runtime, css, response] = await Promise.all([
    readFile(new URL("../dist/client/modern-polish.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/modern-polish.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/index.js", import.meta.url), "utf8"),
  ]);
  assert.match(runtime, /Прокрутить страницу наверх/);
  assert.match(runtime, /prefers-reduced-motion/);
  assert.match(css, /\.bd-scroll-top/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(response, /modern-polish\.css\?v=20260812-modern-v158/);
  assert.match(response, /modern-polish\.js\?v=20260811-modern-v87/);
  assert.match(response, /home-visual-v151\.css\?v=20260811-home-v151/);
});
