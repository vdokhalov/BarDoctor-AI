import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";
import vm from "node:vm";
import { runNavigationAudit } from "../scripts/audit-navigation-consistency.mjs";

test("production navigation graph satisfies the RC consistency contract", async () => {
  const result = await runNavigationAudit();
  assert.deepEqual(result.routes, { current: 56, compatibility: 2, total: 58, spa: 53 });
  assert.equal(result.modules, 35);
  assert.deepEqual(result.defects, {
    found: 54,
    fixed: 54,
    byCategory: {
      backAndHeader: 30,
      architecture: 5,
      contextPreservation: 13,
      safetyAndAccessibility: 2,
      duplicateControls: 4,
    },
  });
});

test("navigation runtime sources and patched production bundle parse successfully", async () => {
  const files = [
    new URL("../public/bardoctor-preview.js", import.meta.url),
    new URL("../public/bd-route-context.js", import.meta.url),
    new URL("../public/app-shell-v185.js", import.meta.url),
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotThrow(() => parse(source, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowAwaitOutsideFunction: true,
    }));
  }

  const runtime = await readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");
  assert.match(runtime, /var previousSameRoute = bdCanReturnToPreviousContext\(state\)/);
  assert.match(runtime, /if \(previousSameRoute \|\| \(bdCanReturnToPreviousContext\(state\)/);
});

test("deep-link query flows resolve to a stable logical parent without losing list context", async () => {
  const runtime = await readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8");
  const start = runtime.indexOf("function bdNavigationPathname(value)");
  const end = runtime.indexOf("function bdCanReturnToPreviousContext(state)", start);
  assert.ok(start >= 0 && end > start);
  const context = {
    URL,
    window: { location: { href: "https://bardoctor.example/suppliers" } },
  };
  vm.runInNewContext(`${runtime.slice(start, end)}
globalThis.queryParent = bdQueryParentUrl;
globalThis.logicalParent = bdLogicalParentUrl;`, context);

  assert.equal(
    context.queryParent("/suppliers?tab=compare&q=gin&documentId=doc-1&edit=1"),
    "/suppliers?tab=compare&q=gin",
  );
  assert.equal(
    context.queryParent("/suppliers?documentId=doc-1&edit=1&returnTo=finance"),
    "/finance",
  );
  assert.equal(
    context.queryParent("/suppliers?tab=suppliers&q=bar&supplierId=supplier-1"),
    "/suppliers?tab=suppliers&q=bar",
  );
  assert.equal(
    context.queryParent("/suppliers?tab=compare&compareKey=product%3Agin%7CRUB%7Cml"),
    "/suppliers?tab=compare",
  );
  assert.equal(
    context.queryParent("/finance?view=expenses&month=2026-08&addExpense=1"),
    "/finance?view=expenses&month=2026-08",
  );
  assert.equal(context.queryParent("/tasks?tab=week&new=1&title=Check"), "/tasks?tab=week");
  assert.equal(
    context.queryParent("/notifications?view=category&category=finance&venue=2"),
    "/notifications?venue=2",
  );
  assert.equal(
    context.queryParent("/data-control?tab=journal&event=audit-1&venue=2"),
    "/data-control?tab=journal&venue=2",
  );
  assert.equal(
    context.queryParent("/integrations?venue=2&flow=onec&connection=source-1"),
    "/integrations?venue=2",
  );
  assert.equal(context.queryParent("/finance?month=2026-08"), null);
  assert.equal(context.logicalParent("/equipment/item-1"), "/equipment");
});
