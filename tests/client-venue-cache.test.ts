import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test("client cache keys are isolated by both account and venue", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf('const CC="bd_session"');
  const end = bundle.indexOf('const oz="bd_sync_queue"', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const localStorage = new MemoryStorage();
  localStorage.setItem("bd_session", "owner@example.test");
  localStorage.setItem("bd_active_venue_id", "101");
  localStorage.setItem("bd_active_venue_is_primary", "1");
  localStorage.setItem(
    "bd_finance_revenue_cache__owner@example.test",
    JSON.stringify([{ id: "venue-a" }]),
  );
  const context = { localStorage };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.helpers={Pt,Zn};`,
    context,
  );
  const helpers = (context as typeof context & {
    helpers: { Pt(key: string): string; Zn(key: string): string | null };
  }).helpers;

  assert.equal(
    helpers.Pt("bd_finance_revenue_cache"),
    "bd_finance_revenue_cache__owner@example.test__venue_101",
  );
  assert.match(helpers.Zn("bd_finance_revenue_cache") ?? "", /venue-a/);

  localStorage.setItem("bd_active_venue_id", "202");
  localStorage.setItem("bd_active_venue_is_primary", "0");
  assert.equal(
    helpers.Pt("bd_finance_revenue_cache"),
    "bd_finance_revenue_cache__owner@example.test__venue_202",
  );
  assert.equal(helpers.Zn("bd_finance_revenue_cache"), null);
});

test("legacy local caches never migrate into a secondary venue or from a global key", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf('const CC="bd_session"');
  const end = bundle.indexOf('const oz="bd_sync_queue"', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const localStorage = new MemoryStorage();
  localStorage.setItem("bd_session", "owner@example.test");
  localStorage.setItem("bd_active_venue_id", "202");
  localStorage.setItem("bd_active_venue_is_primary", "0");
  localStorage.setItem(
    "bd_finance_revenue_cache__owner@example.test",
    JSON.stringify([{ id: "legacy-primary" }]),
  );
  localStorage.setItem(
    "bd_finance_revenue_cache",
    JSON.stringify([{ id: "another-account" }]),
  );
  const context = { localStorage };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.helpers={Pt,Zn};`,
    context,
  );
  const helpers = (context as typeof context & {
    helpers: { Pt(key: string): string; Zn(key: string): string | null };
  }).helpers;

  assert.equal(helpers.Zn("bd_finance_revenue_cache"), null);
  assert.equal(
    localStorage.getItem("bd_finance_revenue_cache__owner@example.test__venue_202"),
    null,
  );

  localStorage.setItem("bd_active_venue_id", "101");
  localStorage.setItem("bd_active_venue_is_primary", "1");
  localStorage.removeItem("bd_finance_revenue_cache__owner@example.test");
  assert.equal(helpers.Zn("bd_finance_revenue_cache"), null);
  assert.equal(
    localStorage.getItem("bd_finance_revenue_cache__owner@example.test__venue_101"),
    null,
  );
});

test("late API responses from a previous venue are rejected before UI state or caches can consume them", async () => {
  const shell = await readFile(
    new URL("../public/bardoctor-preview.js", import.meta.url),
    "utf8",
  );
  const start = shell.indexOf("  var nativeFetch = window.fetch.bind(window);");
  const end = shell.indexOf("\n  function loadApplication()", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const localStorage = new MemoryStorage();
  localStorage.setItem("bd_session", "owner@example.test");
  localStorage.setItem("bd_session_token", "token");
  localStorage.setItem("bd_active_venue_id", "101");
  let resolveResponse: ((response: Response) => void) | null = null;
  const nativeFetch = (...requestArguments: unknown[]) => {
    void requestArguments;
    return new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
  };
  const window = {
    location: { href: "https://bardoctor.test/", origin: "https://bardoctor.test" },
    fetch: nativeFetch,
  };
  vm.runInNewContext(shell.slice(start, end), {
    window,
    localStorage,
    URL,
    Headers,
    Request,
    DOMException,
    Response,
  });

  const pending = window.fetch("/api/store/bd_employees", {});
  localStorage.setItem("bd_active_venue_id", "202");
  assert.ok(resolveResponse);
  (resolveResponse as ((response: Response) => void) | null)?.(new Response(null, { status: 200 }));
  await assert.rejects(pending, (error: unknown) =>
    error instanceof DOMException && error.name === "AbortError"
  );
});
