import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";
import vm from "node:vm";
import { runNavigationAudit } from "../scripts/audit-navigation-consistency.mjs";

test("production navigation graph satisfies the RC consistency contract", async () => {
  const result = await runNavigationAudit();
  assert.deepEqual(result.routes, { current: 57, compatibility: 2, admin: 1, total: 60, spa: 54 });
  assert.equal(result.registeredStaticMetadata, 50);
  assert.equal(result.queryScreens, 10);
  assert.deepEqual(result.traps, { detected: 0, unresolved: 0 });
});

test("navigation runtime sources and patched production bundle parse successfully", async () => {
  const files = [
    new URL("../public/bardoctor-preview.js", import.meta.url),
    new URL("../public/bd-route-context.js", import.meta.url),
    new URL("../public/app-shell-v185.js", import.meta.url),
    new URL("../public/navigation-contract-v247.js", import.meta.url),
    new URL("../public/navigation-transient-v247.js", import.meta.url),
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

  const bundle = await readFile(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
  assert.match(bundle, /"aria-label":"Закрыть редактирование заведения"/);
});

test("deep-link query flows resolve to a stable logical parent without losing list context", async () => {
  const runtime = await readFile(new URL("../public/navigation-contract-v247.js", import.meta.url), "utf8");
  const context = {
    URL,
    URLSearchParams,
    Set,
    window: { location: { href: "https://bardoctor.example/suppliers", origin: "https://bardoctor.example" } },
    document: { documentElement: { setAttribute() {} } },
  };
  vm.runInNewContext(runtime, context);
  const parent = (url) => context.window.bdNavigationContract.resolve(`https://bardoctor.example${url}`).parent;

  assert.equal(
    parent("/suppliers?tab=compare&q=gin&documentId=doc-1&edit=1"),
    "/suppliers?tab=compare&q=gin",
  );
  assert.equal(
    parent("/suppliers?documentId=doc-1&edit=1&returnTo=finance"),
    "/finance",
  );
  assert.equal(
    parent("/suppliers?tab=suppliers&q=bar&supplierId=supplier-1"),
    "/suppliers?tab=suppliers&q=bar",
  );
  assert.equal(
    parent("/suppliers?tab=compare&compareKey=product%3Agin%7CRUB%7Cml"),
    "/suppliers?tab=compare",
  );
  assert.equal(
    parent("/finance?view=expenses&month=2026-08&addExpense=1"),
    "/finance?view=expenses&month=2026-08",
  );
  assert.equal(parent("/tasks?tab=week&new=1&title=Check"), "/tasks?tab=week");
  assert.equal(
    parent("/notifications?view=category&category=finance&venue=2"),
    "/notifications?venue=2",
  );
  assert.equal(
    parent("/data-control?tab=journal&event=audit-1&venue=2"),
    "/data-control?tab=journal&venue=2",
  );
  assert.equal(
    parent("/integrations?venue=2&flow=onec&connection=source-1"),
    "/integrations?venue=2",
  );
  assert.equal(parent("/finance?month=2026-08"), null);
  assert.equal(parent("/equipment/item-1"), "/equipment");
});