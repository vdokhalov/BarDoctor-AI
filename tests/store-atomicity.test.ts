import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { persistStoreMutationAtomic } from "../lib/bardoctor/store-persistence";

test("store persistence sends business mutation and all audits in one D1 batch", async () => {
  const statements: Array<{ sql: string; values?: unknown[] }> = [];
  let batchInput: unknown[] = [];
  const database = {
    prepare(sql: string) {
      const statement = {
        sql,
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          statements.push(statement);
          return statement;
        },
      };
      return statement;
    },
    async batch(input: unknown[]) {
      batchInput = input;
      return input.map((_, index) => ({ meta: { changes: index === 0 ? 1 : 1 } }));
    },
  } as unknown as D1Database;

  const committed = await persistStoreMutationAtomic({
    database,
    accountId: 7,
    storeKey: "bd_tasks",
    dataJson: "[]",
    previousRevision: 2,
    nextRevision: 3,
    mutationId: "operation-1",
    updatedAt: "2026-09-02T12:00:00.000Z",
    actorName: "QA",
    actorRole: "owner",
    audits: [{
      action: "update",
      entityId: "task-1",
      entityLabel: "Task",
      monthKey: null,
      beforeJson: "{}",
      afterJson: "{}",
      changedFieldsJson: "[]",
      reason: "QA",
    }],
  });

  assert.equal(committed, true);
  assert.equal(batchInput.length, 2);
  assert.match(statements[0].sql, /WHERE account_id = \? AND store_key = \? AND revision = \?/);
  assert.match(statements[1].sql, /WHERE EXISTS[\s\S]*mutation_id = \?/);
});

test("generic store route has no standalone business upsert followed by audit writes", async () => {
  const route = await readFile(
    new URL("../app/api/store/[key]/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /persistStoreMutationAtomic\(/);
  assert.match(route, /STORE_CONCURRENT_MODIFICATION/);
  const persistenceSection = route.slice(route.indexOf("const updatedAt"));
  assert.doesNotMatch(persistenceSection, /\.insert\(domainData\)/);
  assert.doesNotMatch(persistenceSection, /\.insert\(auditLog\)/);
});
