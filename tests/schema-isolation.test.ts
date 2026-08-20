import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("migrations preserve data while allowing independent accounts under one ChatGPT identity", async () => {
  const database = new DatabaseSync(":memory:");
  const migrationDirectory = new URL("../drizzle/", import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  for (const file of migrationFiles) {
    const sql = await readFile(new URL(file, migrationDirectory), "utf8");
    database.exec(sql.replaceAll("--> statement-breakpoint", ""));
  }

  const insert = database.prepare(`
    INSERT INTO accounts (
      chatgpt_email,
      app_email,
      password_hash,
      password_salt,
      password_iterations,
      first_name,
      restaurant_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(
    "same-chatgpt@example.com",
    "isolation-a@example.com",
    "hash-a",
    "salt-a",
    100_000,
    "A",
    JSON.stringify({ name: "Кёльн" }),
  );
  insert.run(
    "same-chatgpt@example.com",
    "isolation-b@example.com",
    "hash-b",
    "salt-b",
    100_000,
    "B",
    JSON.stringify({ name: "Тестовое заведение" }),
  );

  const rows = database
    .prepare(`
      SELECT app_email AS appEmail, restaurant_json AS restaurantJson
      FROM accounts
      ORDER BY app_email
    `)
    .all() as Array<{ appEmail: string; restaurantJson: string }>;

  assert.deepEqual(
    rows.map((row) => ({
      appEmail: row.appEmail,
      restaurant: JSON.parse(row.restaurantJson),
    })),
    [
      {
        appEmail: "isolation-a@example.com",
        restaurant: { name: "Кёльн" },
      },
      {
        appEmail: "isolation-b@example.com",
        restaurant: { name: "Тестовое заведение" },
      },
    ],
  );

  const platformSecretColumns = database
    .prepare("PRAGMA table_info(platform_secrets)")
    .all() as Array<{ name: string }>;
  assert.deepEqual(
    platformSecretColumns.map((column) => column.name),
    ["key", "encrypted_value", "source_account_id", "created_at", "updated_at"],
  );

  database.close();
});
