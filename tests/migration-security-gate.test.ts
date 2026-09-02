import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file: string) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("migration mutation routes fail closed behind an explicit runtime gate", async () => {
  const files = [
    "app/api/migrate/route.ts",
    "app/api/migration/capture/route.ts",
    "app/api/migration/koln-assortment/route.ts",
    "app/api/migration/koln-currency-relabel/route.ts",
    "app/api/admin/data-migrations/route.ts",
  ];
  for (const file of files) {
    const source = await read(file);
    assert.match(source, /migrationOperationsEnabled\(\)/, file);
    assert.match(source, /migrationOperationsUnavailable\(\)/, file);
  }

  const guard = await read("lib/bardoctor/migration-guard.ts");
  assert.match(guard, /BARDOCTOR_MIGRATION_OPERATIONS_ENABLED/);
  assert.match(guard, /=== "true"/);
  assert.match(guard, /status: 404/);
  assert.match(guard, /x-migration-intent/);
});

test("sensitive migration routes require platform-admin authorization", async () => {
  for (const file of [
    "app/api/migrate/route.ts",
    "app/api/migration/capture/route.ts",
    "app/api/migration/koln-assortment/route.ts",
    "app/api/migration/koln-currency-relabel/route.ts",
    "app/api/admin/data-migrations/route.ts",
  ]) {
    assert.match(await read(file), /authenticatePlatformAdmin\(request\)/, file);
  }
});

test("production-specific data operations are excluded from deployable schema migrations", async () => {
  const plugin = await read("build/sites-vite-plugin.ts");
  const manual = await read("ops/manual-migrations/0021_initialize_empty_plakuchaya_iva.sql");
  assert.match(plugin, /drizzleSource/);
  assert.doesNotMatch(plugin, /ops\/manual-migrations/);
  assert.match(manual, /User-confirmed empty venue initialization/);
});
