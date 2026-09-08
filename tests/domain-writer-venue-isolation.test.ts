import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "../node_modules/esbuild/lib/main.js";

type JsonRecord = Record<string, unknown>;

class FakeStatement {
  args: unknown[] = [];

  constructor(
    readonly database: FakeD1,
    readonly sql: string,
  ) {}

  bind(...args: unknown[]) {
    this.args = args;
    return this;
  }

  async all<T>() {
    if (!this.sql.includes("FROM domain_data")) return { results: [] as T[] };
    const accountId = Number(this.args[0]);
    const keys = this.args.slice(1).map(String);
    return {
      results: keys.flatMap((storeKey) => {
        const dataJson = this.database.readRaw(accountId, storeKey);
        return dataJson === undefined ? [] : [{ store_key: storeKey, data_json: dataJson } as T];
      }),
    };
  }
}

class FakeD1 {
  private readonly values = new Map<string, string>();

  private key(accountId: number, storeKey: string) {
    return `${accountId}:${storeKey}`;
  }

  seed(accountId: number, storeKey: string, value: unknown) {
    this.values.set(this.key(accountId, storeKey), JSON.stringify(value));
  }

  readRaw(accountId: number, storeKey: string) {
    return this.values.get(this.key(accountId, storeKey));
  }

  read<T>(accountId: number, storeKey: string): T {
    return JSON.parse(this.readRaw(accountId, storeKey) ?? "null") as T;
  }

  prepare(sql: string) {
    return new FakeStatement(this, sql);
  }

  async batch(statements: FakeStatement[]) {
    for (const statement of statements) {
      if (!statement.sql.includes("INSERT INTO domain_data")) continue;
      const [accountId, storeKey, dataJson] = statement.args;
      this.values.set(this.key(Number(accountId), String(storeKey)), String(dataJson));
    }
    return [];
  }
}

type WriterResult = { ok: boolean; code?: string; error?: string; internalId?: string };
type WriterModule = {
  writeCanonicalDomainEntity(input: JsonRecord): Promise<WriterResult>;
};

const testEnvironment = {} as { DB?: FakeD1 };
(globalThis as typeof globalThis & { __BD_DOMAIN_WRITER_TEST_ENV__?: typeof testEnvironment })
  .__BD_DOMAIN_WRITER_TEST_ENV__ = testEnvironment;

const writerModule = (async (): Promise<WriterModule> => {
  const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
  const writerPath = fileURLToPath(new URL("../lib/bardoctor/integrations/domain-writer.ts", import.meta.url));
  const output = await build({
    stdin: {
      contents: await readFile(writerPath, "utf8"),
      sourcefile: writerPath,
      resolveDir: workspaceRoot,
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    plugins: [{
      name: "cloudflare-test-env",
      setup(builder) {
        builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
          path: "cloudflare-test-env",
          namespace: "domain-writer-test",
        }));
        builder.onLoad({ filter: /.*/, namespace: "domain-writer-test" }, () => ({
          contents: "export const env = globalThis.__BD_DOMAIN_WRITER_TEST_ENV__;",
          loader: "js",
        }));
        builder.onResolve({ filter: /^\./ }, (args) => {
          const base = args.importer ? dirname(args.importer) : workspaceRoot;
          const requested = resolve(base, args.path);
          if (requested.toLocaleLowerCase("en") === resolve(workspaceRoot, "db").toLocaleLowerCase("en")) {
            return { path: "domain-writer-db-test", namespace: "domain-writer-db-test" };
          }
          const path = [requested, `${requested}.ts`, resolve(requested, "index.ts")]
            .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
          return path ? { path, namespace: "workspace-source" } : null;
        });
        builder.onLoad({ filter: /.*/, namespace: "domain-writer-db-test" }, () => ({
          contents: "export function getD1() { return globalThis.__BD_DOMAIN_WRITER_TEST_ENV__.DB; }",
          loader: "js",
        }));
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
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`) as Promise<WriterModule>;
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

function envelope(entityType: string, externalId: string, data: JsonRecord): JsonRecord {
  return {
    entityType,
    externalId,
    externalSystem: "test-integration",
    venueId: 1,
    sourceType: "api",
    syncStatus: "success",
    data,
  };
}

const ASSORTMENT = "bd_assortment_v1";
const MOVEMENTS = "bd_stock_movements";
const SNAPSHOTS = "bd_inventory_snapshots";
const RETURNS = "bd_inventory_returns";
const EXPENSES = "bd_finance_expenses";

test("integration product upsert preserves a foreign same-key row byte-for-byte", async () => {
  const writer = await writerModule;
  const database = new FakeD1();
  testEnvironment.DB = database;
  const foreign = {
    id: "foreign-product",
    productKey: "shared-product",
    venueId: 2,
    name: "Foreign product",
    current: 91,
    unit: "pcs",
    marker: { preserve: true },
  };
  const localDecoy = {
    id: "local-decoy",
    productKey: "local-decoy-key",
    venueId: 1,
    name: "Local decoy",
    current: 3,
    unit: "pcs",
    marker: { preserve: "decoy" },
  };
  database.seed(account.id, ASSORTMENT, {
    stockBalances: [
      foreign,
      {
        id: "local-product",
        productKey: "shared-product",
        venueId: 1,
        name: "Local product",
        current: 4,
        unit: "pcs",
      },
      localDecoy,
    ],
    inventoryProductAliases: [
      { from: "external-product-key", to: "shared-product", venueId: 1 },
      { from: "external-product-key", to: "local-decoy-key", venueId: 2 },
    ],
  });
  const frozenForeign = JSON.stringify(foreign);
  const frozenDecoy = JSON.stringify(localDecoy);
  const data = { name: "Updated external name", unit: "pcs", packageSize: "1 pcs" };
  const result = await writer.writeCanonicalDomainEntity({
    account,
    entityType: "product",
    data,
    envelope: envelope("product", "external-product", data),
    internalId: "external-product-key",
  });

  assert.equal(result.ok, true);
  const assortment = database.read<JsonRecord>(account.id, ASSORTMENT);
  const balances = assortment.stockBalances as JsonRecord[];
  assert.equal(JSON.stringify(balances.find((item) => item.id === "foreign-product")), frozenForeign);
  assert.equal(JSON.stringify(balances.find((item) => item.id === "local-decoy")), frozenDecoy);
  const local = balances.find((item) => item.id === "local-product");
  assert.equal(local?.externalName, "Updated external name");
  assert.equal(local?.venueId, 1);
});

test("integration product deactivation fails closed while local consumption references it", async () => {
  const writer = await writerModule;
  const database = new FakeD1();
  testEnvironment.DB = database;
  const assortment = {
    menuItems: [{
      id: "bottled-water",
      venueId: 1,
      active: true,
      consumptionMode: "DIRECT_ITEM",
      readyProduct: { nomenclatureItemId: "water-item" },
    }],
    nomenclature: [{ id: "water-item", productKey: "water-key", venueId: 1, active: true, unit: "pcs", name: "Water" }],
    stockBalances: [{ id: "water-balance", nomenclatureItemId: "water-item", productKey: "water-key", venueId: 1, active: true, current: 0, unit: "pcs", name: "Water" }],
  };
  database.seed(account.id, ASSORTMENT, assortment);
  const before = database.readRaw(account.id, ASSORTMENT);
  const data = { name: "Water", unit: "pcs", packageSize: "1 pcs", active: false };
  const result = await writer.writeCanonicalDomainEntity({
    account,
    entityType: "product",
    data,
    envelope: envelope("product", "water", data),
    internalId: "water-key",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "PRODUCT_IN_USE");
  assert.equal(database.readRaw(account.id, ASSORTMENT), before);
});

test("integration product writer fails closed on duplicate same-venue product keys", async () => {
  const writer = await writerModule;
  const database = new FakeD1();
  testEnvironment.DB = database;
  database.seed(account.id, ASSORTMENT, {
    stockBalances: [
      { id: "duplicate-a", productKey: "duplicate-key", venueId: 1, name: "A", unit: "pcs" },
      { id: "duplicate-b", productKey: "duplicate-key", venueId: 1, name: "B", unit: "pcs" },
    ],
  });
  const before = database.readRaw(account.id, ASSORTMENT);
  const data = { name: "Updated", unit: "pcs", packageSize: "1 pcs" };
  const result = await writer.writeCanonicalDomainEntity({
    account,
    entityType: "product",
    data,
    envelope: envelope("product", "duplicate", data),
    internalId: "duplicate-key",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVENTORY_REFERENCE_AMBIGUOUS");
  assert.equal(database.readRaw(account.id, ASSORTMENT), before);
});

test("integration stock count updates only the local same-key balance and snapshot", async () => {
  const writer = await writerModule;
  const database = new FakeD1();
  testEnvironment.DB = database;
  const foreignBalance = {
    id: "foreign-balance",
    productKey: "shared-product",
    venueId: 2,
    name: "Foreign stock",
    unit: "pcs",
    current: 90,
    warehouseBalances: { foreign: { quantity: 90, unit: "pcs" } },
    marker: { preserve: "balance" },
  };
  const foreignSnapshot = {
    id: "same-snapshot",
    venueId: 2,
    status: "confirmed",
    marker: { preserve: "snapshot" },
  };
  const foreignMovement = {
    id: "foreign-movement",
    venueId: 2,
    productKey: "shared-product",
    amount: 90,
    marker: { preserve: "movement" },
  };
  database.seed(account.id, ASSORTMENT, {
    stockBalances: [
      foreignBalance,
      {
        id: "local-balance",
        productKey: "shared-product",
        venueId: 1,
        name: "Local stock",
        unit: "pcs",
        current: 5,
      },
    ],
  });
  database.seed(account.id, MOVEMENTS, [foreignMovement]);
  database.seed(account.id, SNAPSHOTS, [foreignSnapshot]);
  const frozenForeignBalance = JSON.stringify(foreignBalance);
  const frozenForeignSnapshot = JSON.stringify(foreignSnapshot);
  const frozenForeignMovement = JSON.stringify(foreignMovement);
  const data = {
    productKey: "shared-product",
    productName: "Local stock",
    warehouseExternalId: "local-warehouse",
    quantity: 7,
    unit: "pcs",
    measuredAt: "2026-09-08",
  };
  const result = await writer.writeCanonicalDomainEntity({
    account,
    entityType: "stock_balance",
    data,
    envelope: envelope("stock_balance", "same-snapshot", data),
    internalId: "same-snapshot",
  });

  assert.equal(result.ok, true);
  const assortment = database.read<JsonRecord>(account.id, ASSORTMENT);
  const balances = assortment.stockBalances as JsonRecord[];
  assert.equal(JSON.stringify(balances.find((item) => item.id === "foreign-balance")), frozenForeignBalance);
  assert.equal(balances.find((item) => item.id === "local-balance")?.current, 7);
  const snapshots = database.read<JsonRecord[]>(account.id, SNAPSHOTS);
  assert.equal(JSON.stringify(snapshots.find((item) => item.venueId === 2)), frozenForeignSnapshot);
  assert.equal(snapshots.find((item) => item.venueId === 1)?.id, "same-snapshot");
  const movements = database.read<JsonRecord[]>(account.id, MOVEMENTS);
  assert.equal(JSON.stringify(movements.find((item) => item.id === "foreign-movement")), frozenForeignMovement);
  assert.equal(movements.find((item) => item.venueId === 1)?.productKey, "shared-product");
});

test("integration return preserves foreign same-key stock, document, expense and movement", async () => {
  const writer = await writerModule;
  const database = new FakeD1();
  testEnvironment.DB = database;
  const foreignBalance = {
    id: "foreign-return-balance",
    productKey: "shared-product",
    venueId: 2,
    name: "Foreign return stock",
    unit: "pcs",
    current: 50,
    averageUnitCost: 10,
    marker: { preserve: "balance" },
  };
  const foreignDocument = { id: "same-return", venueId: 2, marker: { preserve: "document" } };
  const foreignExpense = { id: "integration:same-return", venueId: 2, marker: { preserve: "expense" } };
  const foreignMovement = { id: "foreign-return-movement", venueId: 2, marker: { preserve: "movement" } };
  database.seed(account.id, ASSORTMENT, {
    stockBalances: [
      foreignBalance,
      {
        id: "local-return-balance",
        productKey: "shared-product",
        venueId: 1,
        name: "Local return stock",
        unit: "pcs",
        current: 5,
        averageUnitCost: 10,
      },
    ],
  });
  database.seed(account.id, MOVEMENTS, [foreignMovement]);
  database.seed(account.id, RETURNS, [foreignDocument]);
  database.seed(account.id, EXPENSES, [foreignExpense]);
  const frozen = [foreignBalance, foreignDocument, foreignExpense, foreignMovement].map((value) => JSON.stringify(value));
  const data = {
    date: "2026-09-08",
    direction: "from_customer",
    currency: "MDL",
    items: [{ id: "return-line", productKey: "shared-product", name: "Local return stock", quantity: 2, unit: "pcs", amount: 20 }],
  };
  const result = await writer.writeCanonicalDomainEntity({
    account,
    entityType: "return",
    data,
    envelope: envelope("return", "same-return", data),
    internalId: "same-return",
  });

  assert.equal(result.ok, true);
  const assortment = database.read<JsonRecord>(account.id, ASSORTMENT);
  const balances = assortment.stockBalances as JsonRecord[];
  assert.equal(JSON.stringify(balances.find((item) => item.id === "foreign-return-balance")), frozen[0]);
  assert.equal(balances.find((item) => item.id === "local-return-balance")?.current, 7);
  const documents = database.read<JsonRecord[]>(account.id, RETURNS);
  assert.equal(JSON.stringify(documents.find((item) => item.venueId === 2)), frozen[1]);
  assert.equal(documents.find((item) => item.venueId === 1)?.id, "same-return");
  const expenses = database.read<JsonRecord[]>(account.id, EXPENSES);
  assert.equal(JSON.stringify(expenses.find((item) => item.venueId === 2)), frozen[2]);
  assert.equal(expenses.find((item) => item.venueId === 1)?.id, "integration:same-return");
  const movements = database.read<JsonRecord[]>(account.id, MOVEMENTS);
  assert.equal(JSON.stringify(movements.find((item) => item.venueId === 2)), frozen[3]);
  assert.equal(movements.find((item) => item.venueId === 1)?.productKey, "shared-product");
});

test("integration recipe rejects duplicate local owners before priority can first-win", async () => {
  const writer = await writerModule;
  const database = new FakeD1();
  testEnvironment.DB = database;
  const assortment = {
    menuItems: [{ id: "espresso", venueId: 1, consumptionMode: "RECIPE", active: true }],
    stockBalances: [{ id: "beans-balance", nomenclatureItemId: "beans", productKey: "beans-key", venueId: 1, active: true, unit: "g" }],
    nomenclature: [{ id: "beans", productKey: "beans-key", venueId: 1, active: true, unit: "g" }],
    recipes: [
      { id: "recipe-high", menuItemId: "espresso", venueId: 1, current: true, status: "confirmed", reviewStatus: "approved", sourcePriority: 100, source: "integration", externalId: "old" },
      { id: "recipe-second", menuItemId: "espresso", venueId: 1, current: true, status: "confirmed", reviewStatus: "approved" },
    ],
  };
  database.seed(account.id, ASSORTMENT, assortment);
  const before = database.readRaw(account.id, ASSORTMENT);
  const data = {
    menuItemId: "espresso",
    name: "Espresso",
    ingredients: [{ id: "beans-line", nomenclatureItemId: "beans", name: "Beans", quantity: 8, unit: "g" }],
  };
  const result = await writer.writeCanonicalDomainEntity({
    account,
    entityType: "recipe",
    data,
    envelope: envelope("recipe", "new-recipe", data),
    internalId: "new-recipe",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "CONSUMPTION_MODE_CONFLICT");
  assert.equal(database.readRaw(account.id, ASSORTMENT), before);
});

test("integration recipe updates its canonical current object while preserving inactive and foreign history", async () => {
  const writer = await writerModule;
  const database = new FakeD1();
  testEnvironment.DB = database;
  const inactiveHistory = {
    id: "recipe-history",
    menuItemId: "espresso",
    venueId: 1,
    lifecycleStatus: "inactive",
    status: "confirmed",
    reviewStatus: "approved",
    marker: { preserve: "history" },
  };
  const foreignRecipe = {
    id: "recipe-foreign",
    menuItemId: "espresso",
    venueId: 2,
    current: true,
    status: "confirmed",
    reviewStatus: "approved",
    marker: { preserve: "foreign" },
  };
  database.seed(account.id, ASSORTMENT, {
    menuItems: [{ id: "espresso", venueId: 1, consumptionMode: "RECIPE", active: true }],
    stockBalances: [{ id: "beans-balance", nomenclatureItemId: "beans", productKey: "beans-key", venueId: 1, active: true, unit: "g" }],
    nomenclature: [{ id: "beans", productKey: "beans-key", venueId: 1, active: true, unit: "g" }],
    recipes: [
      { id: "recipe-current", menuItemId: "espresso", venueId: 1, current: true, status: "confirmed", reviewStatus: "approved", source: "integration", externalId: "existing" },
      inactiveHistory,
      foreignRecipe,
    ],
  });
  const frozenHistory = JSON.stringify(inactiveHistory);
  const frozenForeign = JSON.stringify(foreignRecipe);
  const data = {
    menuItemId: "espresso",
    name: "Espresso",
    ingredients: [{ id: "beans-line", nomenclatureItemId: "beans", name: "Beans", quantity: 9, unit: "g" }],
  };
  const result = await writer.writeCanonicalDomainEntity({
    account,
    entityType: "recipe",
    data,
    envelope: envelope("recipe", "updated-recipe", data),
    internalId: "updated-recipe",
  });

  assert.equal(result.ok, true);
  const recipes = database.read<JsonRecord>(account.id, ASSORTMENT).recipes as JsonRecord[];
  assert.equal((recipes.find((item) => item.id === "recipe-current")?.ingredients as JsonRecord[])[0]?.quantity, 9);
  assert.equal(JSON.stringify(recipes.find((item) => item.id === "recipe-history")), frozenHistory);
  assert.equal(JSON.stringify(recipes.find((item) => item.id === "recipe-foreign")), frozenForeign);
});

test("integration recipe rejects duplicate menu owners inside one venue", async () => {
  const writer = await writerModule;
  const database = new FakeD1();
  testEnvironment.DB = database;
  const assortment = {
    menuItems: [
      { id: "espresso", venueId: 1, consumptionMode: "RECIPE", active: true },
      { id: "espresso", venueId: 1, consumptionMode: "RECIPE", active: true },
      { id: "espresso", venueId: 2, consumptionMode: "NONE", active: true },
    ],
    recipes: [],
  };
  database.seed(account.id, ASSORTMENT, assortment);
  const before = database.readRaw(account.id, ASSORTMENT);
  const data = { menuItemId: "espresso", name: "Espresso", ingredients: [] };
  const result = await writer.writeCanonicalDomainEntity({
    account,
    entityType: "recipe",
    data,
    envelope: envelope("recipe", "new-recipe", data),
    internalId: "new-recipe",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "DUPLICATE_MENU_ITEM_ID");
  assert.equal(database.readRaw(account.id, ASSORTMENT), before);
});
