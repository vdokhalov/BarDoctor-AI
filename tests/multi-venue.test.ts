import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrationDirectory = new URL("../drizzle/", import.meta.url);
const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function migrationFiles() {
  return (await readdir(migrationDirectory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
}

async function applyMigration(database: DatabaseSync, file: string) {
  const sql = await readFile(new URL(file, migrationDirectory), "utf8");
  database.exec(sql.replaceAll("--> statement-breakpoint", ""));
}

test("multi-venue migration preserves an existing account and its complete data namespace", async () => {
  const database = new DatabaseSync(":memory:");
  const files = await migrationFiles();
  for (const file of files.filter((name) => name < "0010_")) await applyMigration(database, file);

  const account = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name, restaurant_json)
    VALUES ('legacy@example.test', 'legacy@example.test', 'Legacy', ?)
    RETURNING id
  `).get(JSON.stringify({ name: "Кёльн", city: "Бендеры" })) as { id: number };
  database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json)
    VALUES (?, 'bd_finance_revenue', ?)
  `).run(account.id, JSON.stringify([{ id: "shift-old", revenue: 42000 }]));

  for (const file of files.filter((name) => name >= "0010_")) await applyMigration(database, file);

  const migrated = database.prepare(`
    SELECT
      a.account_kind AS accountKind,
      v.id AS venueId,
      v.workspace_id AS workspaceId,
      v.status AS venueStatus,
      vm.role AS venueRole,
      wm.role AS workspaceRole,
      d.data_json AS dataJson
    FROM accounts a
    JOIN venues v ON v.data_account_id = a.id
    JOIN venue_memberships vm ON vm.venue_id = v.id AND vm.account_id = a.id
    JOIN workspace_memberships wm ON wm.workspace_id = v.workspace_id AND wm.account_id = a.id
    JOIN domain_data d ON d.account_id = a.id AND d.store_key = 'bd_finance_revenue'
    WHERE a.id = ?
  `).get(account.id) as {
    accountKind: string;
    venueId: number;
    workspaceId: number;
    venueStatus: string;
    venueRole: string;
    workspaceRole: string;
    dataJson: string;
  };

  assert.equal(migrated.accountKind, "user");
  assert.equal(migrated.workspaceId, migrated.venueId);
  assert.equal(migrated.venueStatus, "active");
  assert.equal(migrated.venueRole, "owner");
  assert.equal(migrated.workspaceRole, "owner");
  assert.deepEqual(JSON.parse(migrated.dataJson), [{ id: "shift-old", revenue: 42000 }]);
  database.close();
});

test("two venues in one workspace keep identical products, stock, finances and integrations independent", async () => {
  const database = new DatabaseSync(":memory:");
  for (const file of await migrationFiles()) await applyMigration(database, file);

  const owner = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name, account_kind)
    VALUES ('owner@example.test', 'owner@example.test', 'Owner', 'user') RETURNING id
  `).get() as { id: number };
  const workspace = database.prepare(`
    INSERT INTO workspaces (name, created_by_account_id) VALUES ('Company', ?) RETURNING id
  `).get(owner.id) as { id: number };
  const venueA = database.prepare(`
    INSERT INTO venues (workspace_id, data_account_id, created_by_account_id)
    VALUES (?, ?, ?) RETURNING id
  `).get(workspace.id, owner.id, owner.id) as { id: number };
  database.prepare(`
    INSERT INTO venue_memberships (venue_id, account_id, role) VALUES (?, ?, 'owner')
  `).run(venueA.id, owner.id);

  const venueDataB = database.prepare(`
    INSERT INTO accounts (
      chatgpt_email, app_email, first_name, account_kind, owns_venue, restaurant_json, migration_status
    ) VALUES ('venue-b@internal.test', 'venue-b@internal.test', 'Venue', 'venue_data', 0, ?, 'venue_data')
    RETURNING id
  `).get(JSON.stringify({ name: "Venue B", currency: "MDL" })) as { id: number };
  const venueB = database.prepare(`
    INSERT INTO venues (workspace_id, data_account_id, created_by_account_id)
    VALUES (?, ?, ?) RETURNING id
  `).get(workspace.id, venueDataB.id, owner.id) as { id: number };
  database.prepare(`
    INSERT INTO venue_memberships (venue_id, account_id, role) VALUES (?, ?, 'owner')
  `).run(venueB.id, owner.id);

  const cleanVenueCounts = database.prepare(`
    SELECT
      (SELECT COUNT(*) FROM domain_data WHERE account_id = ?) AS stores,
      (SELECT COUNT(*) FROM audit_log WHERE account_id = ?) AS auditRows,
      (SELECT COUNT(*) FROM google_connections WHERE account_id = ?) AS reviewConnections,
      (SELECT COUNT(*) FROM integration_secrets WHERE account_id = ?) AS legacyIntegrations,
      (SELECT COUNT(*) FROM integration_connections WHERE data_account_id = ?) AS integrationConnections,
      (SELECT COUNT(*) FROM integration_mappings WHERE data_account_id = ?) AS integrationMappings,
      (SELECT COUNT(*) FROM integration_sync_runs WHERE data_account_id = ?) AS integrationRuns,
      (SELECT COUNT(*) FROM integration_ingress_deliveries WHERE data_account_id = ?) AS importedDeliveries
  `).get(
    venueDataB.id,
    venueDataB.id,
    venueDataB.id,
    venueDataB.id,
    venueDataB.id,
    venueDataB.id,
    venueDataB.id,
    venueDataB.id,
  ) as Record<string, number>;
  assert.deepEqual({ ...cleanVenueCounts }, {
    stores: 0,
    auditRows: 0,
    reviewConnections: 0,
    legacyIntegrations: 0,
    integrationConnections: 0,
    integrationMappings: 0,
    integrationRuns: 0,
    importedDeliveries: 0,
  });

  const save = database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json) VALUES (?, ?, ?)
  `);
  save.run(owner.id, "bd_assortment_v1", JSON.stringify({ stockBalances: [{ name: "Coca-Cola", quantity: 50 }] }));
  save.run(venueDataB.id, "bd_assortment_v1", JSON.stringify({ stockBalances: [{ name: "Coca-Cola", quantity: 10 }] }));
  save.run(owner.id, "bd_employees_v1", JSON.stringify([{ id: "employee-a", name: "Анна" }]));
  save.run(venueDataB.id, "bd_employees_v1", JSON.stringify([{ id: "employee-b", name: "Борис" }]));
  save.run(owner.id, "bd_finance_revenue", JSON.stringify([{ id: "sale-a", revenue: 5000 }]));
  save.run(venueDataB.id, "bd_finance_revenue", JSON.stringify([{ id: "sale-b", revenue: 1300 }]));
  save.run(owner.id, "bd_month_closings", JSON.stringify([{ monthKey: "2026-07", finalProfit: 30000 }]));
  save.run(venueDataB.id, "bd_month_closings", JSON.stringify([{ monthKey: "2026-07", finalProfit: 7000 }]));

  const connection = database.prepare(`
    INSERT INTO integration_connections (
      id, venue_id, data_account_id, provider, adapter_key, source_key, display_name,
      channel, status, created_by_account_id
    ) VALUES (?, ?, ?, ?, 'universal-api-v1', ?, ?, 'rest', 'connected', ?)
  `);
  connection.run("connection-a", venueA.id, owner.id, "1c", "purchases", "1С закупки", owner.id);
  connection.run("connection-b", venueB.id, venueDataB.id, "iiko", "sales", "iiko продажи", owner.id);

  const stores = database.prepare(`
    SELECT account_id AS accountId, store_key AS storeKey, data_json AS dataJson
    FROM domain_data ORDER BY account_id, store_key
  `).all() as Array<{ accountId: number; storeKey: string; dataJson: string }>;
  const stockA = JSON.parse(stores.find((row) => row.accountId === owner.id && row.storeKey === "bd_assortment_v1")!.dataJson);
  const stockB = JSON.parse(stores.find((row) => row.accountId === venueDataB.id && row.storeKey === "bd_assortment_v1")!.dataJson);
  assert.equal(stockA.stockBalances[0].quantity, 50);
  assert.equal(stockB.stockBalances[0].quantity, 10);
  const employeeRows = stores.filter((row) => row.storeKey === "bd_employees_v1");
  assert.deepEqual(JSON.parse(employeeRows.find((row) => row.accountId === owner.id)!.dataJson), [{ id: "employee-a", name: "Анна" }]);
  assert.deepEqual(JSON.parse(employeeRows.find((row) => row.accountId === venueDataB.id)!.dataJson), [{ id: "employee-b", name: "Борис" }]);
  assert.notEqual(venueA.id, venueB.id);
  assert.notEqual(owner.id, venueDataB.id);
  database.prepare("UPDATE accounts SET restaurant_json = ? WHERE id = ?")
    .run(JSON.stringify({ name: "Venue A", currency: "RUB" }), owner.id);
  const venueCurrencies = database.prepare(`
    SELECT id, restaurant_json AS restaurantJson FROM accounts WHERE id IN (?, ?) ORDER BY id
  `).all(owner.id, venueDataB.id) as Array<{ id: number; restaurantJson: string }>;
  assert.deepEqual(venueCurrencies.map((row) => JSON.parse(row.restaurantJson).currency), ["RUB", "MDL"]);
  assert.throws(
    () => database.prepare("INSERT INTO venues (workspace_id, data_account_id, created_by_account_id) VALUES (?, ?, ?)").run(workspace.id, owner.id, owner.id),
    /UNIQUE/,
  );
  const integrations = database.prepare(`
    SELECT venue_id AS venueId, data_account_id AS dataAccountId, provider
    FROM integration_connections ORDER BY venue_id
  `).all() as Array<{ venueId: number; dataAccountId: number; provider: string }>;
  assert.deepEqual(integrations.map((row) => ({ ...row })), [
    { venueId: venueA.id, dataAccountId: owner.id, provider: "1c" },
    { venueId: venueB.id, dataAccountId: venueDataB.id, provider: "iiko" },
  ]);
  database.close();
});

test("roles remain per venue and an unrelated user has no membership-based access", async () => {
  const database = new DatabaseSync(":memory:");
  for (const file of await migrationFiles()) await applyMigration(database, file);
  const insertAccount = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name) VALUES (?, ?, ?) RETURNING id
  `);
  const owner = insertAccount.get("owner@roles.test", "owner@roles.test", "Owner") as { id: number };
  const manager = insertAccount.get("manager@roles.test", "manager@roles.test", "Manager") as { id: number };
  const outsider = insertAccount.get("outsider@roles.test", "outsider@roles.test", "Outsider") as { id: number };
  const workspace = database.prepare("INSERT INTO workspaces (name, created_by_account_id) VALUES ('Roles', ?) RETURNING id").get(owner.id) as { id: number };
  const venueA = database.prepare("INSERT INTO venues (workspace_id, data_account_id, created_by_account_id) VALUES (?, ?, ?) RETURNING id").get(workspace.id, owner.id, owner.id) as { id: number };
  const dataB = insertAccount.get("data-b@roles.test", "data-b@roles.test", "Venue") as { id: number };
  const venueB = database.prepare("INSERT INTO venues (workspace_id, data_account_id, created_by_account_id) VALUES (?, ?, ?) RETURNING id").get(workspace.id, dataB.id, owner.id) as { id: number };
  const membership = database.prepare("INSERT INTO venue_memberships (venue_id, account_id, role) VALUES (?, ?, ?)");
  membership.run(venueA.id, manager.id, "owner");
  membership.run(venueB.id, manager.id, "manager");

  const roles = database.prepare("SELECT venue_id AS venueId, role FROM venue_memberships WHERE account_id = ? ORDER BY venue_id").all(manager.id) as Array<{ venueId: number; role: string }>;
  assert.deepEqual(roles.map((row) => ({ ...row })), [
    { venueId: venueA.id, role: "owner" },
    { venueId: venueB.id, role: "manager" },
  ]);
  const outsiderMembership = database
    .prepare("SELECT COUNT(*) AS count FROM venue_memberships WHERE account_id = ? AND venue_id = ?")
    .get(outsider.id, venueB.id) as { count: number };
  assert.equal(outsiderMembership.count, 0);
  database.close();
});

test("multi-venue endpoints enforce membership, persist active session and create no copied domain data", async () => {
  const [auth, switchRoute, joinRoute, venueService, venueRoute, client, createPage, switcherCss, createCss, createSelectsCss, createClient, locationData, opportunities, shellClient] = await Promise.all([
    read("lib/bardoctor/auth.ts"),
    read("app/api/access/active-venue/route.ts"),
    read("app/api/access/join/route.ts"),
    read("lib/bardoctor/venue-service.ts"),
    read("app/api/venues/route.ts"),
    read("public/venue-switcher.js"),
    read("app/venues/new/route.ts"),
    read("public/venue-switcher.css"),
    read("public/venue-create.css"),
    read("public/venue-create-selects.css"),
    read("public/venue-create.js"),
    read("public/venue-location-data.js"),
    read("public/opportunities.js"),
    read("public/bardoctor-preview.js"),
  ]);
  assert.match(auth, /eq\(venueMemberships\.accountId, account\.id\)/);
  assert.match(auth, /eq\(venues\.status, "active"\)/);
  assert.match(auth, /eq\(workspaceMemberships\.status, "active"\)/);
  assert.match(auth, /activeVenueId: sessions\.activeVenueId/);
  assert.match(auth, /requestedHeader != null/);
  assert.match(switchRoute, /venueContextForAccount\(account, venueId\)/);
  assert.match(switchRoute, /rememberActiveVenueForRequest/);
  assert.match(joinRoute, /rememberActiveVenueForRequest/);
  assert.match(venueService, /accountKind: "venue_data"/);
  assert.match(venueService, /restaurantJson: JSON\.stringify\(profile\)/);
  assert.doesNotMatch(venueService, /domainData|bd_employees|bd_assortment|bd_finance|integrationConnections/);
  assert.match(venueRoute, /cleanVenue: true/);
  assert.match(client, /window\.location\.replace\(safeTargetForVenue\(result\.activeVenueId\)\)/);
  assert.match(client, /selected \? "Текущее" : "Перейти"/);
  assert.match(client, /После переключения все данные и инструменты откроются для выбранного заведения/);
  assert.match(client, /installResponseGuard/);
  assert.match(client, /bd:venue-will-change/);
  assert.match(client, /requestAnimationFrame/);
  assert.match(client, /context\.venues\.length < 2/);
  assert.match(client, /syncVenueFromLocation/);
  assert.match(client, /addEventListener\("popstate", syncVenueFromLocation\)/);
  assert.match(createPage, /Данные не копируются/);
  assert.match(createPage, /name="businessType"/);
  assert.match(createPage, /<select id="venue-country" name="country"/);
  assert.match(createPage, /<select id="venue-city" name="city"/);
  assert.doesNotMatch(createPage, /country-list|list="country-list"/);
  assert.match(createPage, /name="currency"/);
  assert.match(createClient, /initialiseLocationFields/);
  assert.match(createClient, /countryCode: selectedCountryCode\(\)/);
  assert.match(createClient, /renderCities\(true\)/);
  assert.match(locationData, /code:"MD",name:"Молдова"/);
  assert.match(locationData, /MD:\["Кишинёв","Тирасполь","Бельцы","Бендеры"/);
  assert.match(createClient, /window\.location\.replace\("\/login"\)/);
  assert.match(createClient, /window\.location\.replace\("\/home\?venue="/);
  assert.match(client, /bd-venues-entry bd-more-system-row/);
  assert.match(client, /managementCard\.appendChild\(existing\)/);
  assert.match(shellClient, /bd-data-control-entry bd-more-system-row/);
  assert.match(shellClient, /managementCard\.appendChild\(entry\)/);
  assert.doesNotMatch(client, /main\.insertBefore\(entry, main\.firstChild\)/);
  assert.match(switcherCss, /@media\(min-width:1024px\)/);
  assert.match(switcherCss, /@media\(max-width:520px\)/);
  assert.match(switcherCss, /\.bd-data-control-entry\.bd-more-system-row,\.bd-venues-entry\.bd-more-system-row/);
  assert.match(createCss, /@media\(max-width:620px\)/);
  assert.match(createCss, /@media\(min-width:1000px\)/);
  assert.match(createSelectsCss, /\.select-control select/);
  assert.match(createSelectsCss, /select:disabled/);
  assert.match(opportunities, /_venue_/);
});

test("AI Doctor decision memory is loaded only from the active venue data account", async () => {
  const attention = await read("lib/bardoctor/ai-doctor-attention.ts");

  assert.match(attention, /eq\(domainData\.accountId, account\.id\)/);
  assert.match(attention, /inArray\(domainData\.storeKey, keys\)/);
  assert.match(attention, /"bd_tasks", "bd_action_tasks", "bd_decisions"/);
  assert.doesNotMatch(attention, /workspaceId|activeVenueId|venueId\s*\?\?/);
});

test("service integrations authenticate secondary venue data through an active human membership", async () => {
  const writer = await read("app/api/integration-hub/business-writer.ts");
  assert.match(writer, /eq\(venues\.dataAccountId, input\.dataAccountId\)/);
  assert.match(writer, /eq\(accounts\.accountKind, "user"\)/);
  assert.match(writer, /eq\(venueMemberships\.status, "active"\)/);
  assert.match(writer, /eq\(workspaceMemberships\.status, "active"\)/);
  assert.match(writer, /const token = await issueSession\(identity\)/);
  assert.doesNotMatch(writer, /issueSession\(input\.account\)/);
});
