import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "../node_modules/esbuild/lib/main.js";
import { candidatesFromAssortment, decideMapping } from "../lib/bardoctor/integrations/mapping";

type JsonRecord = Record<string, unknown>;

type SyncResult = {
  status: string;
  received: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ externalId: string; code: string; message: string }>;
  mappingIssues: number;
};

type SyncModule = {
  integrationRecordDedupeKey(input: {
    venueId: number;
    entityType: string;
    externalId: string;
  }): string;
  runIntegrationSync(input: {
    account: typeof account;
    connectionId: string;
    trigger: "file";
    dataType: string;
    records: JsonRecord[];
    writer: { write(input: JsonRecord): Promise<{ ok: boolean; internalId: string }> };
  }): Promise<SyncResult>;
};

class FakeStatement {
  args: unknown[] = [];

  constructor(readonly sql: string) {}

  bind(...args: unknown[]) {
    this.args = args;
    return this;
  }

  async first<T>() {
    if (!this.sql.includes("FROM domain_data")) return null;
    return { data_json: JSON.stringify(syncEnvironment.assortment ?? {}) } as T;
  }
}

class FakeD1 {
  prepare(sql: string) {
    return new FakeStatement(sql);
  }
}

type SyncTestEnvironment = {
  DB: FakeD1;
  assortment: unknown;
  connection: JsonRecord | null;
  mapping: JsonRecord | null;
  savedMappings: JsonRecord[];
  markedConflicts: JsonRecord[];
  syncItems: JsonRecord[];
  finishedRuns: JsonRecord[];
  claims: JsonRecord[];
  linkUpdates: JsonRecord[];
};

const syncEnvironment: SyncTestEnvironment = {
  DB: new FakeD1(),
  assortment: {},
  connection: null,
  mapping: null,
  savedMappings: [],
  markedConflicts: [],
  syncItems: [],
  finishedRuns: [],
  claims: [],
  linkUpdates: [],
};

(globalThis as typeof globalThis & { __BD_SYNC_ENGINE_TEST_ENV__?: SyncTestEnvironment })
  .__BD_SYNC_ENGINE_TEST_ENV__ = syncEnvironment;

const syncModule = (async (): Promise<SyncModule> => {
  const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
  const syncPath = fileURLToPath(new URL("../lib/bardoctor/integrations/sync-engine.ts", import.meta.url));
  const output = await build({
    stdin: {
      contents: await readFile(syncPath, "utf8"),
      sourcefile: syncPath,
      resolveDir: workspaceRoot,
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    plugins: [{
      name: "sync-engine-test-dependencies",
      setup(builder) {
        builder.onResolve({ filter: /^\.\/repository$/ }, () => ({
          path: "sync-engine-repository-test",
          namespace: "sync-engine-test",
        }));
        builder.onResolve({ filter: /^\.\.\/\.\.\/\.\.\/db$/ }, () => ({
          path: "sync-engine-db-test",
          namespace: "sync-engine-test",
        }));
        builder.onLoad({ filter: /^sync-engine-db-test$/, namespace: "sync-engine-test" }, () => ({
          contents: "export function getD1() { return globalThis.__BD_SYNC_ENGINE_TEST_ENV__.DB; }",
          loader: "js",
        }));
        builder.onLoad({ filter: /^sync-engine-repository-test$/, namespace: "sync-engine-test" }, () => ({
          contents: `
            const state = () => globalThis.__BD_SYNC_ENGINE_TEST_ENV__;
            export async function connectionForTenant() { return state().connection; }
            export async function createSyncRun() { return "run-venue-isolation"; }
            export async function entityLink() { return null; }
            export async function mappingForExternal() { return state().mapping; }
            export async function claimEntityLink(input) {
              state().claims.push(input);
              return { claimed: true };
            }
            export async function createSyncItem(input) {
              state().syncItems.push(input);
              return "item-" + state().syncItems.length;
            }
            export async function updateEntityLinkStatus(input) {
              state().linkUpdates.push(input);
            }
            export async function restoreEntityLinkAfterFailedUpdate(input) {
              state().linkUpdates.push(input);
            }
            export async function finishSyncRun(input) {
              state().finishedRuns.push(input);
            }
            export async function markMappingConflict(input) {
              state().markedConflicts.push(input);
            }
            export async function saveMappingProposal(input) {
              state().savedMappings.push(input);
              return {
                id: "mapping-" + state().savedMappings.length,
                status: input.status,
                internal_id: input.internalId ?? null,
                internal_name: input.internalName ?? null,
                reason: input.reason ?? null,
              };
            }
          `,
          loader: "js",
        }));
        builder.onResolve({ filter: /^\./ }, (args) => {
          const base = args.importer ? dirname(args.importer) : workspaceRoot;
          const requested = resolve(base, args.path);
          const path = [requested, `${requested}.ts`, resolve(requested, "index.ts")]
            .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
          return path ? { path, namespace: "workspace-source" } : null;
        });
        builder.onLoad({ filter: /.*/, namespace: "workspace-source" }, async (args) => ({
          contents: await readFile(args.path, "utf8"),
          loader: args.path.endsWith(".ts") ? "ts" : "js",
        }));
        builder.onResolve({ filter: /^(?:node:|[A-Za-z@])/ }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    }],
  });
  const source = output.outputFiles[0]?.text ?? "";
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`) as Promise<SyncModule>;
})();

const account = {
  id: 17,
  actorAccountId: 17,
  venueId: 1,
  membershipId: 1,
  permissions: [],
  role: "owner",
  firstName: "Venue",
  lastName: "One",
  appEmail: "venue-1@example.test",
};

function resetSyncEnvironment(input: {
  entityType: string;
  assortment?: unknown;
  autoCreateProducts?: boolean;
  mapping?: JsonRecord | null;
}) {
  syncEnvironment.assortment = input.assortment ?? {};
  syncEnvironment.connection = {
    sync_enabled: 1,
    status: "connected",
    capabilities_json: JSON.stringify([input.entityType]),
    config_json: JSON.stringify({
      enabledEntities: [input.entityType],
      updatePolicy: "safe_upsert",
      autoCreateProducts: input.autoCreateProducts === true,
    }),
  };
  syncEnvironment.mapping = input.mapping ?? null;
  syncEnvironment.savedMappings = [];
  syncEnvironment.markedConflicts = [];
  syncEnvironment.syncItems = [];
  syncEnvironment.finishedRuns = [];
  syncEnvironment.claims = [];
  syncEnvironment.linkUpdates = [];
}

function envelope(entityType: string, externalId: string, venueId: number, data: JsonRecord): JsonRecord {
  return {
    entityType,
    externalId,
    externalSystem: "venue-isolation-test",
    venueId,
    sourceType: "api",
    syncStatus: "success",
    data,
  };
}

test("mapping candidates ignore foreign same IDs without mutating or depending on row order", () => {
  const assortment = {
    stockBalances: [
      { id: "foreign-stock", productKey: "shared-product", venueId: 2, name: "Foreign product", unit: "kg", marker: "keep" },
      { id: "local-stock", productKey: "shared-product", venueId: 1, name: "Local product", unit: "pcs" },
    ],
    menuItems: [
      { id: "shared-menu", venueId: 2, name: "Foreign menu", active: true, marker: "keep" },
      { id: "shared-menu", venueId: 1, name: "Local menu", active: true },
    ],
    recipes: [
      {
        id: "foreign-recipe",
        venueId: 2,
        ingredients: [{ purchaseProductKey: "foreign-only", name: "Foreign only", venueId: 2 }],
      },
      {
        id: "local-recipe",
        venueId: 1,
        ingredients: [
          { purchaseProductKey: "foreign-nested", name: "Foreign nested", venueId: 2 },
          { purchaseProductKey: "local-fallback", name: "Local fallback", venueId: 1 },
        ],
      },
    ],
  };
  const before = JSON.stringify(assortment);
  const stock = candidatesFromAssortment(assortment, "stock_product", 1);
  const menu = candidatesFromAssortment(assortment, "menu_item", 1);
  const reversed = {
    stockBalances: [...assortment.stockBalances].reverse(),
    menuItems: [...assortment.menuItems].reverse(),
    recipes: [...assortment.recipes].reverse(),
  };

  assert.deepEqual(stock, candidatesFromAssortment(reversed, "stock_product", 1));
  assert.deepEqual(menu, candidatesFromAssortment(reversed, "menu_item", 1));
  assert.equal(stock.find((candidate) => candidate.id === "shared-product")?.name, "Local product");
  assert.equal(stock.find((candidate) => candidate.id === "shared-product")?.identityAmbiguous, undefined);
  assert.deepEqual(stock.map((candidate) => candidate.id).sort(), ["local-fallback", "shared-product"]);
  assert.deepEqual(menu, [{ id: "shared-menu", name: "Local menu" }]);
  assert.equal(JSON.stringify(assortment), before);
});

test("mapping candidates expose duplicate local identities and refuse auto-confirmation", () => {
  const stock = candidatesFromAssortment({
    stockBalances: [
      { id: "foreign", productKey: "shared-product", venueId: 2, name: "Foreign" },
      { id: "local-z", productKey: "shared-product", venueId: 1, name: "Zulu" },
      { id: "local-a", productKey: "shared-product", venueId: 1, name: "Alpha" },
    ],
  }, "stock_product", 1);
  const menu = candidatesFromAssortment({
    menuItems: [
      { id: "shared-menu", venueId: 1, name: "Zulu", active: true },
      { id: "shared-menu", venueId: 1, name: "Alpha", active: true },
      { id: "shared-menu", venueId: 2, name: "Foreign", active: true },
    ],
  }, "menu_item", 1);

  assert.equal(stock.length, 1);
  assert.equal(stock[0].id, "shared-product");
  assert.equal(stock[0].name, "Alpha");
  assert.equal(stock[0].identityAmbiguous, true);
  assert.deepEqual(menu, [{ id: "shared-menu", name: "Alpha", identityAmbiguous: true }]);
  const decision = decideMapping({ id: "shared-product", name: "Alpha" }, stock);
  assert.equal(decision.status, "suggested");
  assert.equal(decision.confidence, 100);
  assert.equal(decision.candidate?.identityAmbiguous, true);
});

test("batch dedupe includes venue so a foreign-first record cannot suppress the local record", async () => {
  const sync = await syncModule;
  assert.equal(sync.integrationRecordDedupeKey({ venueId: 1, entityType: "supplier", externalId: "same" }), "1:supplier:same");
  assert.notEqual(
    sync.integrationRecordDedupeKey({ venueId: 1, entityType: "supplier", externalId: "same" }),
    sync.integrationRecordDedupeKey({ venueId: 2, entityType: "supplier", externalId: "same" }),
  );
  resetSyncEnvironment({ entityType: "supplier" });
  const writes: JsonRecord[] = [];
  const result = await sync.runIntegrationSync({
    account,
    connectionId: "connection-1",
    trigger: "file",
    dataType: "supplier",
    records: [
      envelope("supplier", "same", 2, { name: "Foreign supplier" }),
      envelope("supplier", "same", 1, { name: "Local supplier" }),
    ],
    writer: {
      async write(input) {
        writes.push(input);
        return { ok: true, internalId: String(input.internalId) };
      },
    },
  });

  assert.equal(result.status, "partial");
  assert.equal(result.created, 1);
  assert.equal(result.skipped, 0);
  assert.deepEqual(result.errors.map((error) => error.code), ["TENANT_MISMATCH"]);
  assert.equal(writes.length, 1);
  assert.equal((writes[0].envelope as JsonRecord).venueId, 1);
  assert.deepEqual(syncEnvironment.syncItems.map((item) => item.status), ["failed", "success"]);
});

test("auto-create fails closed when the venue has duplicate stock identities", async () => {
  const sync = await syncModule;
  const assortment = {
    stockBalances: [
      { id: "foreign", productKey: "shared-product", venueId: 2, name: "Foreign", marker: "keep" },
      { id: "local-a", productKey: "shared-product", venueId: 1, name: "Alpha" },
      { id: "local-b", productKey: "shared-product", venueId: 1, name: "Beta" },
    ],
  };
  const before = JSON.stringify(assortment);
  resetSyncEnvironment({ entityType: "product", assortment, autoCreateProducts: true });
  const writes: JsonRecord[] = [];
  const result = await sync.runIntegrationSync({
    account,
    connectionId: "connection-1",
    trigger: "file",
    dataType: "product",
    records: [envelope("product", "shared-product", 1, { name: "Alpha", unit: "pcs" })],
    writer: {
      async write(input) {
        writes.push(input);
        return { ok: true, internalId: String(input.internalId) };
      },
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.created, 0);
  assert.equal(result.mappingIssues, 1);
  assert.equal(writes.length, 0);
  assert.equal(syncEnvironment.savedMappings.length, 1);
  assert.equal(syncEnvironment.savedMappings[0].status, "suggested");
  assert.equal(syncEnvironment.savedMappings[0].internalId, "shared-product");
  assert.equal(JSON.stringify(assortment), before);
});

test("a saved create mapping becomes a conflict if its identity is now duplicated locally", async () => {
  const sync = await syncModule;
  resetSyncEnvironment({
    entityType: "product",
    assortment: {
      stockBalances: [
        { id: "local-a", productKey: "shared-product", venueId: 1, name: "Alpha" },
        { id: "local-b", productKey: "shared-product", venueId: 1, name: "Beta" },
      ],
    },
    autoCreateProducts: true,
    mapping: {
      id: "saved-mapping",
      status: "confirmed",
      internal_id: "shared-product",
      reason: "Автоматически: создать складскую позицию из доверенного Local Connector",
    },
  });
  const writes: JsonRecord[] = [];
  const result = await sync.runIntegrationSync({
    account,
    connectionId: "connection-1",
    trigger: "file",
    dataType: "product",
    records: [envelope("product", "shared-product", 1, { name: "Alpha", unit: "pcs" })],
    writer: {
      async write(input) {
        writes.push(input);
        return { ok: true, internalId: String(input.internalId) };
      },
    },
  });

  assert.equal(result.mappingIssues, 1);
  assert.equal(writes.length, 0);
  assert.equal(syncEnvironment.savedMappings.length, 0);
  assert.deepEqual(syncEnvironment.markedConflicts, [{
    tenant: account,
    mappingId: "saved-mapping",
    reason: "Связанная позиция удалена или больше недоступна в этом заведении",
  }]);
});
