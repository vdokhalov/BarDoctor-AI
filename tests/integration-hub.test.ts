import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import * as XLSX from "xlsx";
import { integrationAdapterDescriptors } from "../lib/bardoctor/integrations/adapter-registry";
import { INTEGRATION_ENTITY_TYPES, type IntegrationEntityType } from "../lib/bardoctor/integrations/contracts";
import { headerSignature, suggestFieldMapping } from "../lib/bardoctor/integrations/field-mapping";
import { candidatesFromAssortment, decideMapping } from "../lib/bardoctor/integrations/mapping";
import { inspectUniversalFile, UniversalFileAdapter } from "../lib/bardoctor/integrations/universal-file-adapter";
import { validateCanonicalEnvelope } from "../lib/bardoctor/integrations/validation";

const context = {
  venueId: 17,
  externalSystem: "Test POS",
  sourceType: "file_import" as const,
  now: "2026-08-09T12:00:00.000Z",
};

async function migratedDatabase(): Promise<DatabaseSync> {
  const database = new DatabaseSync(":memory:");
  const directory = new URL("../drizzle/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
  for (const file of files) {
    database.exec((await readFile(new URL(file, directory), "utf8")).replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

function createWorkspaceVenue(
  database: DatabaseSync,
  accountId: number,
  name = "Test workspace",
): { id: number } {
  const workspace = database
    .prepare("INSERT INTO workspaces (name, created_by_account_id) VALUES (?, ?) RETURNING id")
    .get(name, accountId) as { id: number };
  return database
    .prepare("INSERT INTO venues (workspace_id, data_account_id, created_by_account_id) VALUES (?, ?, ?) RETURNING id")
    .get(workspace.id, accountId, accountId) as { id: number };
}

test("universal JSON import keeps external identity and nested purchase lines", async () => {
  const adapter = new UniversalFileAdapter();
  const result = await adapter.normalize({
    fileName: "purchase.json",
    json: {
      entityType: "purchase_document",
      externalSystem: "1C Test Export",
      records: [{
        externalId: "invoice-42",
        date: "2026-08-09",
        supplierName: "Supplier",
        currency: "MDL",
        total: 180,
        items: [{
          externalProductId: "cola-05",
          name: "Coca-Cola 0.5",
          quantity: 10,
          unit: "шт.",
          packageSize: "0.5 л",
          unitPrice: 18,
          lineTotal: 180,
        }],
      }],
    },
  }, context);

  assert.equal(result.entityType, "purchase_document");
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].venueId, 17);
  assert.equal(result.records[0].externalSystem, "1C Test Export");
  assert.equal(result.records[0].externalId, "invoice-42");
  const document = result.records[0].data as { items: Array<{ externalProduct: { externalId: string } }> };
  assert.equal(document.items[0].externalProduct.externalId, "cola-05");
});

test("flat CSV rows are grouped into one idempotent sales document", async () => {
  const adapter = new UniversalFileAdapter();
  const csv = [
    "saleExternalId,date,sourceSystem,productExternalId,productName,quantity,grossSales",
    "sale-1,2026-08-09,Poster,item-1,Кола,2,70",
    "sale-1,2026-08-09,Poster,item-2,Спрайт,1,35",
  ].join("\n");
  const result = await adapter.normalize({
    fileName: "sales.csv",
    bytes: new TextEncoder().encode(csv),
    entityType: "sale",
  }, context);

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].externalId, "sale-1");
  const sale = result.records[0].data as { items: unknown[]; totalRevenue: number };
  assert.equal(sale.items.length, 2);
  assert.equal(sale.totalRevenue, 105);
});

test("real XLSX import uses the same configurable mapping and normalization path", async () => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([{
    ERP_CODE: "P-500",
    DESCRIPTION: "Coca Cola 500ml",
    UOM: "шт.",
    COUNT_DATE: "2026-08-11",
    ON_HAND: "12,5",
  }]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Stock");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const result = await new UniversalFileAdapter().normalize({
    fileName: "stock.xlsx",
    mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes: new Uint8Array(bytes),
    entityType: "stock_balance",
    fieldMapping: {
      productExternalId: "ERP_CODE",
      productName: "DESCRIPTION",
      unit: "UOM",
      measuredAt: "COUNT_DATE",
      quantity: "ON_HAND",
    },
  }, context);
  assert.equal(result.records.length, 1);
  assert.equal(record(result.records[0].data).productExternalId, "P-500");
  assert.equal(record(result.records[0].data).quantity, 12.5);
});

test("bounded XML contract rejects entities and parses line items", async () => {
  const adapter = new UniversalFileAdapter();
  await assert.rejects(
    adapter.normalize({
      fileName: "unsafe.xml",
      bytes: new TextEncoder().encode('<!DOCTYPE x [<!ENTITY file SYSTEM "file:///etc/passwd">]><BarDoctorImport />'),
      entityType: "product",
    }, context),
    /DOCTYPE/,
  );

  const xml = `<?xml version="1.0"?>
    <BarDoctorImport entityType="purchase_document" externalSystem="Legacy ERP">
      <Record>
        <externalId>doc-xml-1</externalId><date>2026-08-09</date>
        <supplierName>XML Supplier</supplierName><currency>MDL</currency><total>20</total>
        <Items><Item><externalProductId>water-1</externalProductId><name>Вода 1 л</name><quantity>1</quantity><unit>шт.</unit><packageSize>1 л</packageSize><unitPrice>20</unitPrice><lineTotal>20</lineTotal></Item></Items>
      </Record>
    </BarDoctorImport>`;
  const result = await adapter.normalize({
    fileName: "purchase.xml",
    bytes: new TextEncoder().encode(xml),
  }, context);
  assert.equal(result.records[0].externalSystem, "Legacy ERP");
  const purchase = result.records[0].data as { items: Array<{ externalProduct: { externalId: string } }> };
  assert.equal(purchase.items[0].externalProduct.externalId, "water-1");
});

test("mapping auto-confirms only a unique strong product match", () => {
  const candidates = candidatesFromAssortment({
    stockBalances: [
      { key: "cola|500ml", name: "Coca Cola 500ml", packageSize: "500 мл" },
      { key: "cola|1l", name: "Coca Cola 1l", packageSize: "1 л" },
    ],
    menuItems: [{ id: "menu-cola", name: "Кола", active: true }],
  }, "stock_product");
  const exact = decideMapping(
    { id: "external-cola", name: "Coca-Cola 0.5", packageSize: "0,5 л" },
    candidates,
  );
  assert.equal(exact.status, "confirmed");
  assert.equal(exact.candidate?.id, "cola|500ml");

  const ambiguous = decideMapping(
    { id: "external-cola", name: "Coca Cola" },
    candidates,
  );
  assert.notEqual(ambiguous.status, "confirmed");
});

test("mapping suggests one saved target across Latin and Cyrillic Coca-Cola variants", () => {
  const candidates = [{
    id: "cola-500",
    name: "Coca-Cola 0.5",
    unit: "ml",
    packageSize: "500 мл",
  }];
  const cyrillic = decideMapping(
    { id: "ext-cyr", name: "Кока-Кола 0,5л", packageSize: "0,5 л" },
    candidates,
  );
  const latin = decideMapping(
    { id: "ext-latin", name: "Coca Cola 500ml", packageSize: "500 ml" },
    candidates,
  );
  assert.equal(cyrillic.candidate?.id, "cola-500");
  assert.notEqual(cyrillic.status, "unresolved");
  assert.equal(latin.candidate?.id, "cola-500");
  assert.equal(latin.status, "confirmed");
});

test("validation rejects one bad record without inventing accounting values", async () => {
  const adapter = new UniversalFileAdapter();
  const result = await adapter.normalize({
    fileName: "bad.json",
    json: {
      entityType: "sale",
      records: [{ externalId: "bad-sale", date: "2026-08-09", items: [{ externalProductId: "x", name: "Кола", quantity: 0 }] }],
    },
  }, context);
  const issues = validateCanonicalEnvelope(result.records[0]);
  assert.ok(issues.some((issue) => issue.code === "ITEMS_REQUIRED" || issue.code === "QUANTITY_INVALID"));
});

test("file imports reject unnamed suppliers and employees instead of inventing entities", async () => {
  const adapter = new UniversalFileAdapter();
  const supplier = await adapter.normalize({
    fileName: "suppliers.csv",
    bytes: new TextEncoder().encode("externalId,taxId\nSUP-1,123\n"),
    entityType: "supplier",
  }, context);
  const employee = await adapter.normalize({
    fileName: "employees.csv",
    bytes: new TextEncoder().encode("externalId,role\nEMP-1,Бармен\n"),
    entityType: "employee",
  }, context);
  assert.ok(validateCanonicalEnvelope(supplier.records[0]).some((issue) => issue.code === "SUPPLIER_REQUIRED"));
  assert.ok(validateCanonicalEnvelope(employee.records[0]).some((issue) => issue.code === "EMPLOYEE_NAME_REQUIRED"));
});

test("integration idempotency and mappings are isolated by venue and source", async () => {
  const database = await migratedDatabase();
  const account = database.prepare(`INSERT INTO accounts (chatgpt_email, app_email, first_name) VALUES (?, ?, ?) RETURNING id`)
    .get("owner@example.com", "owner@example.com", "Owner") as { id: number };
  const venueA = createWorkspaceVenue(database, account.id, "A");
  const accountB = database.prepare(`INSERT INTO accounts (chatgpt_email, app_email, first_name) VALUES (?, ?, ?) RETURNING id`)
    .get("owner-b@example.com", "owner-b@example.com", "Owner B") as { id: number };
  const venueB = createWorkspaceVenue(database, accountB.id, "B");

  const insertConnection = database.prepare(`
    INSERT INTO integration_connections (
      id, venue_id, data_account_id, provider, adapter_key, display_name,
      channel, status, created_by_account_id
    ) VALUES (?, ?, ?, 'poster', 'universal-file-v1', 'Poster file', 'file', 'connected', ?)
  `);
  insertConnection.run("conn-a", venueA.id, account.id, account.id);
  insertConnection.run("conn-b", venueB.id, accountB.id, accountB.id);
  assert.throws(
    () => insertConnection.run("conn-a-duplicate", venueA.id, account.id, account.id),
    /UNIQUE/,
  );
  const insertLink = database.prepare(`
    INSERT INTO integration_entity_links (
      id, venue_id, data_account_id, connection_id, entity_type, external_id,
      internal_id, payload_hash, sync_status
    ) VALUES (?, ?, ?, ?, 'sale', 'same-external-id', ?, ?, 'success')
  `);
  insertLink.run("link-a", venueA.id, account.id, "conn-a", "sale-a", "hash-a");
  insertLink.run("link-b", venueB.id, accountB.id, "conn-b", "sale-b", "hash-b");

  const rows = database.prepare(`SELECT venue_id AS venueId, internal_id AS internalId FROM integration_entity_links ORDER BY venue_id`).all() as Array<{ venueId: number; internalId: string }>;
  assert.deepEqual(rows.map((row) => ({ ...row })), [
    { venueId: venueA.id, internalId: "sale-a" },
    { venueId: venueB.id, internalId: "sale-b" },
  ]);
  assert.throws(() => insertLink.run("link-duplicate", venueA.id, account.id, "conn-a", "sale-a-2", "hash-a-2"), /UNIQUE/);
  database.close();
});

test("scalability scenario 1: every canonical entity normalizes and validates", async () => {
  const samples: Record<IntegrationEntityType, unknown> = {
    product: { externalId: "p-1", name: "Вода", unit: "шт.", packageSize: "1 л" },
    warehouse: { externalId: "wh-1", code: "MAIN", name: "Основной склад", active: true },
    purchase_document: {
      externalId: "po-1", date: "2026-08-11", supplierName: "Поставщик", currency: "MDL", total: 20,
      items: [{ externalProductId: "p-1", name: "Вода", quantity: 1, unit: "шт.", packageSize: "1 л", lineTotal: 20 }],
    },
    sale: {
      externalId: "sale-1", date: "2026-08-11", sourceSystem: "POS",
      items: [{ externalProductId: "menu-1", name: "Вода", quantity: 1, grossSales: 30 }],
    },
    stock_balance: { externalId: "bal-1", productExternalId: "p-1", productName: "Вода", quantity: 4, unit: "шт.", measuredAt: "2026-08-11" },
    write_off: { externalId: "wo-1", date: "2026-08-11", items: [{ productExternalId: "p-1", name: "Вода", quantity: 1, unit: "шт." }] },
    return: { externalId: "ret-1", date: "2026-08-11", direction: "to_supplier", items: [{ productExternalId: "p-1", name: "Вода", quantity: 1, unit: "шт." }] },
    recipe: { externalId: "rec-1", menuItemExternalId: "menu-1", name: "Вода", portions: 1, ingredients: [{ productExternalId: "p-1", name: "Вода", quantity: 1, unit: "шт." }] },
    supplier: { externalId: "sup-1", name: "Поставщик", active: true },
    employee: { externalId: "emp-1", name: "Иван Иванов", role: "Бармен", active: true },
  };
  for (const entityType of INTEGRATION_ENTITY_TYPES) {
    const result = await new UniversalFileAdapter().normalize({ json: [samples[entityType]], entityType }, context);
    assert.equal(result.records.length, 1, entityType);
    assert.deepEqual(validateCanonicalEnvelope(result.records[0]), [], entityType);
  }
});

test("scalability scenario 2: automatic field mapping recognizes localized headers", () => {
  const mapping = suggestFieldMapping([
    "ID документа", "Дата", "Поставщик", "Код товара", "Наименование", "Количество",
  ], "purchase_document");
  assert.equal(mapping.documentExternalId, "ID документа");
  assert.equal(mapping.productExternalId, "Код товара");
  assert.equal(mapping.productName, "Наименование");
  assert.equal(mapping.quantity, "Количество");
});

test("scalability scenario 3: explicit field mapping handles an arbitrary supplier export", async () => {
  const csv = "ERP_CODE,DESCRIPTION,UOM,COUNT_DATE,ON_HAND\nP-77,Сироп,шт.,2026-08-11,12\n";
  const result = await new UniversalFileAdapter().normalize({
    fileName: "odd.csv",
    bytes: new TextEncoder().encode(csv),
    entityType: "stock_balance",
    fieldMapping: {
      productExternalId: "ERP_CODE",
      productName: "DESCRIPTION",
      unit: "UOM",
      measuredAt: "COUNT_DATE",
      quantity: "ON_HAND",
    },
  }, context);
  assert.equal(record(result.records[0].data).productExternalId, "P-77");
  assert.equal(record(result.records[0].data).quantity, 12);
});

test("scalability scenario 4: previews are stable and never expose more than five sample rows", async () => {
  const csv = ["externalId,name", ...Array.from({ length: 20 }, (_, index) => `p-${index},Товар ${index}`)].join("\n");
  const inspection = await inspectUniversalFile({
    fileName: "products.csv",
    bytes: new TextEncoder().encode(csv),
    entityType: "product",
  });
  assert.equal(inspection.recordCount, 20);
  assert.equal(inspection.sample.length, 5);
  assert.equal(inspection.headerSignature, headerSignature(["externalId", "name"], "spreadsheet"));
});

test("scalability scenario 5: a 2001-row export is bounded to 2000 records with a warning", async () => {
  const csv = ["externalId,name", ...Array.from({ length: 2_001 }, (_, index) => `p-${index},Товар ${index}`)].join("\n");
  const result = await new UniversalFileAdapter().normalize({
    fileName: "large.csv",
    bytes: new TextEncoder().encode(csv),
    entityType: "product",
  }, context);
  assert.equal(result.records.length, 2_000);
  assert.match(result.warnings.join(" "), /первые 2000/i);
});

test("mass supplier, warehouse and employee imports use bounded D1 batches", async () => {
  const [syncEngine, domainWriter, businessWriter] = await Promise.all([
    readFile(new URL("../lib/bardoctor/integrations/sync-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/bardoctor/integrations/domain-writer.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/integration-hub/business-writer.ts", import.meta.url), "utf8"),
  ]);
  assert.match(syncEngine, /input\.dataType === "supplier" \|\| input\.dataType === "warehouse" \|\| input\.dataType === "employee"/);
  assert.match(syncEngine, /pendingWrites\.length >= 250/);
  assert.match(syncEngine, /existingLink\?\.sync_status === "success"/);
  assert.match(domainWriter, /start \+= 7/);
  assert.match(domainWriter, /writeCanonicalSimpleListBatch/);
  assert.match(businessWriter, /async writeBatch\(inputs\)/);
});

test("scalability scenario 6: cancellation remains explicit instead of becoming an upsert", async () => {
  const result = await new UniversalFileAdapter().normalize({
    json: [{ externalId: "supplier-deleted", operation: "delete" }],
    entityType: "supplier",
  }, context);
  assert.equal(result.records[0].operation, "delete");
  assert.deepEqual(validateCanonicalEnvelope(result.records[0]), []);
});

test("scalability scenario 7: capability matrix is honest for ready and future adapters", () => {
  const descriptors = integrationAdapterDescriptors();
  const universal = descriptors.find((item) => item.key === "universal-api-v1");
  const oneC = descriptors.find((item) => item.key === "1c");
  assert.deepEqual(universal?.capabilities, [...INTEGRATION_ENTITY_TYPES]);
  assert.equal(universal?.capabilityMatrix.webhooks, "supported");
  assert.deepEqual(oneC?.capabilities, []);
  assert.equal(oneC?.availability, "requires_local_agent");
});

test("scalability scenario 8: tenant guard rejects a token linked across venues", async () => {
  const database = await migratedDatabase();
  const a = database.prepare("INSERT INTO accounts (chatgpt_email, app_email, first_name) VALUES ('a@x.test','a@x.test','A') RETURNING id").get() as { id: number };
  const b = database.prepare("INSERT INTO accounts (chatgpt_email, app_email, first_name) VALUES ('b@x.test','b@x.test','B') RETURNING id").get() as { id: number };
  const venueA = createWorkspaceVenue(database, a.id, "A");
  const venueB = createWorkspaceVenue(database, b.id, "B");
  database.prepare(`INSERT INTO integration_connections (id, venue_id, data_account_id, provider, adapter_key, source_key, display_name, channel, status, sync_enabled, created_by_account_id) VALUES ('c-a', ?, ?, 'api', 'universal-api-v1', 'a', 'A', 'rest', 'connected', 1, ?)`)
    .run(venueA.id, a.id, a.id);
  assert.throws(() => database.prepare(`INSERT INTO integration_ingress_tokens (id, venue_id, data_account_id, connection_id, label, token_prefix, token_hash, scopes_json, created_by_account_id) VALUES ('t-x', ?, ?, 'c-a', 'x', 'bd_live_x', 'hash-x', '[]', ?)`)
    .run(venueB.id, b.id, b.id), /INTEGRATION_TENANT_MISMATCH/);
  database.close();
});

test("scalability scenario 9: delivery ids are independent per connection but unique inside one source", async () => {
  const database = await migratedDatabase();
  const owner = database.prepare("INSERT INTO accounts (chatgpt_email, app_email, first_name) VALUES ('owner@x.test','owner@x.test','Owner') RETURNING id").get() as { id: number };
  const venue = createWorkspaceVenue(database, owner.id, "Owner");
  const connection = database.prepare(`INSERT INTO integration_connections (id, venue_id, data_account_id, provider, adapter_key, source_key, display_name, channel, status, sync_enabled, created_by_account_id) VALUES (?, ?, ?, 'api', 'universal-api-v1', ?, ?, 'rest', 'connected', 1, ?)`);
  connection.run("c-1", venue.id, owner.id, "one", "One", owner.id);
  connection.run("c-2", venue.id, owner.id, "two", "Two", owner.id);
  const delivery = database.prepare(`INSERT INTO integration_ingress_deliveries (id, venue_id, data_account_id, connection_id, delivery_id, payload_hash) VALUES (?, ?, ?, ?, 'batch-1', 'hash')`);
  delivery.run("d-1", venue.id, owner.id, "c-1");
  delivery.run("d-2", venue.id, owner.id, "c-2");
  assert.throws(() => delivery.run("d-3", venue.id, owner.id, "c-1"), /UNIQUE/);
  database.close();
});

test("scalability scenario 10: token hashes are globally unique and plaintext has no schema column", async () => {
  const database = await migratedDatabase();
  const columns = database.prepare("PRAGMA table_info(integration_ingress_tokens)").all() as Array<{ name: string }>;
  assert.equal(columns.some((column) => /secret|plain|token_value/.test(column.name)), false);
  assert.equal(columns.some((column) => column.name === "token_hash"), true);
  const indexes = database.prepare("PRAGMA index_list(integration_ingress_tokens)").all() as Array<{ name: string; unique: number }>;
  assert.ok(indexes.some((index) => index.name === "integration_ingress_tokens_hash_uq" && index.unique === 1));
  database.close();
});

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
