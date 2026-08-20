import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  presentAuditEvent,
  sourceFromAudit,
  type AuditRowLike,
} from "../lib/bardoctor/audit-presentation";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const baseRow: AuditRowLike = {
  id: 42,
  storeKey: "bd_finance_expenses",
  action: "update",
  entityId: "expense-42",
  entityLabel: "Ремонт",
  monthKey: "2026-08",
  beforeJson: JSON.stringify({ amount: 1200, source: "user" }),
  afterJson: JSON.stringify({ amount: 1500, source: "user" }),
  changedFieldsJson: JSON.stringify(["amount"]),
  actorName: "Виталий",
  actorRole: "owner",
  reason: "Исправлена сумма",
  createdAt: "2026-08-13T14:02:00.000Z",
};

test("audit presentation turns a stored change into a human old-to-new event", () => {
  const event = presentAuditEvent(baseRow, { role: "owner", permissions: [] });

  assert.equal(event.module, "Финансы");
  assert.equal(event.source, "user");
  assert.equal(event.actorName, "Виталий");
  assert.equal(event.title, "Изменено: Ремонт");
  assert.equal(event.summary, "1 200 ₽ → 1 500 ₽");
  assert.deepEqual(event.diffs, [{
    field: "amount",
    label: "Сумма",
    before: "1 200 ₽",
    after: "1 500 ₽",
  }]);
  assert.equal(event.relatedUrl, "/finance");
  assert.doesNotMatch(JSON.stringify(event), /undefined|null\s*→/);
});

test("Local Connector changes are attributed to 1C rather than to a user", () => {
  const row: AuditRowLike = {
    ...baseRow,
    storeKey: "bd_purchase_documents",
    entityId: "invoice-1245",
    entityLabel: "Накладная №1245",
    afterJson: JSON.stringify({
      amount: 28430,
      source: "integration",
      sourceType: "local_connector",
      externalSystem: "1С:Общепит",
    }),
    beforeJson: JSON.stringify({
      amount: 28100,
      source: "integration",
      sourceType: "local_connector",
      externalSystem: "1С:Общепит",
    }),
    actorName: "integration-worker",
    actorRole: "system",
    reason: "Local Connector applied an idempotent update",
  };

  assert.equal(sourceFromAudit(row).kind, "local_connector");
  const event = presentAuditEvent(row, { role: "owner", permissions: [] });
  assert.equal(event.actorName, null);
  assert.equal(event.sourceLabel, "1С:Общепит");
  assert.equal(event.actionLabel, "Обновлено интеграцией");
  assert.equal(event.relatedUrl, "/suppliers?documentId=invoice-1245");
});

test("legacy initial array snapshots keep their integration source and object label", () => {
  const row: AuditRowLike = {
    ...baseRow,
    storeKey: "bd_purchase_documents",
    action: "create",
    entityId: null,
    entityLabel: null,
    beforeJson: null,
    afterJson: JSON.stringify([{
      id: "invoice-legacy",
      title: "Накладная №1245",
      source: "integration",
      sourceType: "local_connector",
      externalSystem: "1С:Общепит",
    }]),
    changedFieldsJson: JSON.stringify(["value"]),
  };

  const event = presentAuditEvent(row, { role: "owner", permissions: [] });
  assert.equal(event.source, "local_connector");
  assert.equal(event.objectLabel, "Накладная №1245");
  assert.equal(event.actorName, null);
  assert.deepEqual(event.diffs, []);
});

test("audit viewing does not bypass finance and people permissions", () => {
  const event = presentAuditEvent(baseRow, {
    role: "shift_manager",
    permissions: ["audit.view"],
  });

  assert.equal(event.actorName, "Пользователь");
  assert.equal(event.summary, "Значения скрыты согласно правам");
  assert.deepEqual(event.diffs, []);
  assert.equal(event.relatedUrl, null);
  assert.equal(event.reason, null);
});

test("trust center API and UI enforce venue scope, honest states and immutable presentation", async () => {
  const [api, route, client, store, teamRoute] = await Promise.all([
    read("app/api/audit/route.ts"),
    read("app/data-control/route.ts"),
    read("public/data-control.js"),
    read("app/api/store/[key]/route.ts"),
    read("app/team-access/route.ts"),
  ]);

  assert.match(api, /hasPermission\(account, "audit\.view"\)/);
  assert.match(api, /WHERE account_id = \?/);
  assert.match(api, /venue_id = \? AND data_account_id = \?/);
  assert.match(api, /status = issueRows\.length \? "attention" : "unknown"/);
  assert.match(api, /searchParams\.get\("format"\) === "csv"/);
  assert.doesNotMatch(api, /export async function (?:POST|PUT|PATCH|DELETE)/);

  assert.match(route, /data-tab="overview">Обзор/);
  assert.match(route, /data-tab="journal">Журнал/);
  assert.match(route, /data-tab="periods">Периоды/);
  assert.doesNotMatch(route, /data-tab="access"|data-tab="exchange"|bottom-nav/);
  assert.match(client, /requestSequence/);
  assert.match(client, /AbortController/);
  assert.match(client, /bd_data_control_context_v171:/);
  assert.match(client, /error\.status === 403/);
  assert.match(client, /Проверенных проблем нет/);

  assert.match(store, /action: "blocked"/);
  assert.match(store, /code: "MONTH_LOCKED"/);
  assert.match(store, /status: 423/);
  assert.match(store, /action: "conflict"/);

  assert.match(teamRoute, /Роли и доступ/);
  assert.match(teamRoute, /data-bd-parent-route="\/employees"/);
});
