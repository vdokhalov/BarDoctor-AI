import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chatgptEmail: text("chatgpt_email").notNull(),
    appEmail: text("app_email").notNull(),
    passwordHash: text("password_hash"),
    passwordSalt: text("password_salt"),
    passwordIterations: integer("password_iterations"),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name"),
    phone: text("phone"),
    accountKind: text("account_kind").notNull().default("user"),
    role: text("role").notNull().default("owner"),
    ownsVenue: integer("owns_venue", { mode: "boolean" }).notNull().default(true),
    restaurantJson: text("restaurant_json"),
    competitorsJson: text("competitors_json"),
    reviewSourcesJson: text("review_sources_json"),
    migrationStatus: text("migration_status").notNull().default("local"),
    migrationSummaryJson: text("migration_summary_json"),
    importedAt: text("imported_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("accounts_app_email_uq").on(table.appEmail),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    activeVenueId: integer("active_venue_id"),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sessions_account_id_idx").on(table.accountId),
    index("sessions_active_venue_id_idx").on(table.activeVenueId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().default("Рабочее пространство"),
    status: text("status").notNull().default("active"),
    createdByAccountId: integer("created_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("workspaces_creator_status_idx").on(table.createdByAccountId, table.status),
  ],
);

export const venues = sqliteTable(
  "venues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id").references(() => workspaces.id, {
      onDelete: "restrict",
    }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    createdByAccountId: integer("created_by_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("venues_data_account_id_uq").on(table.dataAccountId),
    index("venues_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const workspaceMemberships = sqliteTable(
  "workspace_memberships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    status: text("status").notNull().default("active"),
    joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("workspace_memberships_workspace_account_uq").on(
      table.workspaceId,
      table.accountId,
    ),
    index("workspace_memberships_account_status_idx").on(table.accountId, table.status),
    index("workspace_memberships_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const venueMemberships = sqliteTable(
  "venue_memberships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("shift_manager"),
    permissionsJson: text("permissions_json"),
    status: text("status").notNull().default("active"),
    employeeId: text("employee_id"),
    invitedByAccountId: integer("invited_by_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("venue_memberships_venue_account_uq").on(table.venueId, table.accountId),
    index("venue_memberships_account_status_idx").on(table.accountId, table.status),
    index("venue_memberships_venue_status_idx").on(table.venueId, table.status),
  ],
);

export const venueInvites = sqliteTable(
  "venue_invites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    role: text("role").notNull(),
    permissionsJson: text("permissions_json"),
    createdByAccountId: integer("created_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    usedByAccountId: integer("used_by_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("venue_invites_code_hash_uq").on(table.codeHash),
    index("venue_invites_venue_created_idx").on(table.venueId, table.createdAt),
    index("venue_invites_expires_idx").on(table.expiresAt),
  ],
);

export const domainData = sqliteTable(
  "domain_data",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    storeKey: text("store_key").notNull(),
    dataJson: text("data_json").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("domain_data_account_key_uq").on(table.accountId, table.storeKey),
    index("domain_data_account_id_idx").on(table.accountId),
  ],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    storeKey: text("store_key").notNull(),
    action: text("action").notNull(),
    entityId: text("entity_id"),
    entityLabel: text("entity_label"),
    monthKey: text("month_key"),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    changedFieldsJson: text("changed_fields_json"),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(),
    reason: text("reason"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("audit_log_account_created_idx").on(table.accountId, table.createdAt),
    index("audit_log_account_store_idx").on(table.accountId, table.storeKey),
    index("audit_log_account_month_idx").on(table.accountId, table.monthKey),
  ],
);

export const googleConnections = sqliteTable(
  "google_connections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("disconnected"),
    linkedUrl: text("linked_url"),
    placeId: text("place_id"),
    cid: text("cid"),
    lat: text("lat"),
    lng: text("lng"),
    locationName: text("location_name"),
    googleAccountId: text("google_account_id"),
    googleLocationId: text("google_location_id"),
    accessTokenEncrypted: text("access_token_encrypted"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    tokenExpiresAt: text("token_expires_at"),
    pendingLocationsJson: text("pending_locations_json"),
    lastSyncedAt: text("last_synced_at"),
    lastSyncError: text("last_sync_error"),
    autoSyncEnabled: integer("auto_sync_enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("google_connections_account_id_uq").on(table.accountId)],
);

export const oauthStates = sqliteTable(
  "oauth_states",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    redirectUri: text("redirect_uri").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("oauth_states_expires_at_idx").on(table.expiresAt)],
);

export const reviewSourceEvents = sqliteTable(
  "review_source_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    event: text("event").notNull(),
    detail: text("detail"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("review_source_events_account_source_idx").on(table.accountId, table.source)],
);

export const integrationSecrets = sqliteTable(
  "integration_secrets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_secrets_account_key_uq").on(table.accountId, table.key),
    index("integration_secrets_account_id_idx").on(table.accountId),
  ],
);

/**
 * Universal, venue-scoped integration hub.
 *
 * `dataAccountId` is deliberately stored next to `venueId`: existing BarDoctor
 * domain stores are keyed by the data-owner account, while the venue is the
 * tenant boundary exposed to users. Every integration query must match both.
 */
export const integrationConnections = sqliteTable(
  "integration_connections",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    adapterKey: text("adapter_key").notNull(),
    sourceKey: text("source_key").notNull().default("default"),
    sourceType: text("source_type").notNull().default("file_import"),
    displayName: text("display_name").notNull(),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("requires_setup"),
    syncEnabled: integer("sync_enabled", { mode: "boolean" }).notNull().default(false),
    capabilitiesJson: text("capabilities_json").notNull().default("[]"),
    configJson: text("config_json").notNull().default("{}"),
    cursorJson: text("cursor_json"),
    lastSyncAt: text("last_sync_at"),
    lastSuccessAt: text("last_success_at"),
    lastError: text("last_error"),
    createdByAccountId: integer("created_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_connections_source_uq").on(
      table.venueId,
      table.dataAccountId,
      table.adapterKey,
      table.sourceKey,
    ),
    index("integration_connections_tenant_idx").on(table.venueId, table.dataAccountId),
    index("integration_connections_tenant_status_idx").on(
      table.venueId,
      table.dataAccountId,
      table.status,
    ),
  ],
);

export const integrationCredentials = sqliteTable(
  "integration_credentials",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    rotatedAt: text("rotated_at"),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_credentials_connection_key_uq").on(
      table.venueId,
      table.dataAccountId,
      table.connectionId,
      table.key,
    ),
    index("integration_credentials_tenant_idx").on(table.venueId, table.dataAccountId),
  ],
);

export const integrationMappings = sqliteTable(
  "integration_mappings",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    externalId: text("external_id").notNull(),
    externalName: text("external_name").notNull(),
    externalUnit: text("external_unit"),
    internalId: text("internal_id"),
    internalName: text("internal_name"),
    status: text("status").notNull().default("unresolved"),
    confidence: integer("confidence").notNull().default(0),
    reason: text("reason"),
    externalPayloadJson: text("external_payload_json"),
    confirmedByAccountId: integer("confirmed_by_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    confirmedAt: text("confirmed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_mappings_external_uq").on(
      table.venueId,
      table.dataAccountId,
      table.connectionId,
      table.entityType,
      table.externalId,
    ),
    index("integration_mappings_tenant_status_idx").on(
      table.venueId,
      table.dataAccountId,
      table.status,
    ),
  ],
);

export const integrationEntityLinks = sqliteTable(
  "integration_entity_links",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    externalId: text("external_id").notNull(),
    internalId: text("internal_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    externalUpdatedAt: text("external_updated_at"),
    syncStatus: text("sync_status").notNull().default("success"),
    lastSyncRunId: text("last_sync_run_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_entity_links_external_uq").on(
      table.venueId,
      table.dataAccountId,
      table.connectionId,
      table.entityType,
      table.externalId,
    ),
    index("integration_entity_links_internal_idx").on(
      table.venueId,
      table.dataAccountId,
      table.entityType,
      table.internalId,
    ),
  ],
);

export const integrationSyncRuns = sqliteTable(
  "integration_sync_runs",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    trigger: text("trigger").notNull(),
    dataType: text("data_type").notNull(),
    status: text("status").notNull().default("pending"),
    sourceName: text("source_name"),
    receivedCount: integer("received_count").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    mappingIssueCount: integer("mapping_issue_count").notNull().default(0),
    errorsJson: text("errors_json").notNull().default("[]"),
    retryOfRunId: text("retry_of_run_id"),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("integration_sync_runs_tenant_created_idx").on(
      table.venueId,
      table.dataAccountId,
      table.createdAt,
    ),
    index("integration_sync_runs_connection_status_idx").on(table.connectionId, table.status),
  ],
);

export const integrationSyncItems = sqliteTable(
  "integration_sync_items",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => integrationSyncRuns.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    externalId: text("external_id").notNull(),
    internalId: text("internal_id"),
    status: text("status").notNull(),
    payloadHash: text("payload_hash").notNull(),
    payloadJson: text("payload_json").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    mappingId: text("mapping_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_sync_items_run_external_uq").on(
      table.runId,
      table.entityType,
      table.externalId,
    ),
    index("integration_sync_items_tenant_status_idx").on(
      table.venueId,
      table.dataAccountId,
      table.status,
    ),
  ],
);

export const integrationFieldMappingTemplates = sqliteTable(
  "integration_field_mapping_templates",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    name: text("name").notNull(),
    fileKind: text("file_kind").notNull(),
    headerSignature: text("header_signature").notNull(),
    mappingJson: text("mapping_json").notNull(),
    defaultsJson: text("defaults_json").notNull().default("{}"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdByAccountId: integer("created_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_field_templates_signature_uq").on(
      table.venueId,
      table.dataAccountId,
      table.connectionId,
      table.entityType,
      table.headerSignature,
    ),
    index("integration_field_templates_tenant_idx").on(table.venueId, table.dataAccountId),
  ],
);

export const integrationIngressTokens = sqliteTable(
  "integration_ingress_tokens",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    tokenHash: text("token_hash").notNull(),
    scopesJson: text("scopes_json").notNull().default("[]"),
    lastUsedAt: text("last_used_at"),
    expiresAt: text("expires_at"),
    revokedAt: text("revoked_at"),
    createdByAccountId: integer("created_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_ingress_tokens_hash_uq").on(table.tokenHash),
    index("integration_ingress_tokens_connection_idx").on(
      table.venueId,
      table.dataAccountId,
      table.connectionId,
    ),
  ],
);

export const integrationIngressDeliveries = sqliteTable(
  "integration_ingress_deliveries",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    deliveryId: text("delivery_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: text("status").notNull().default("processing"),
    attemptCount: integer("attempt_count").notNull().default(1),
    runId: text("run_id").references(() => integrationSyncRuns.id, { onDelete: "set null" }),
    cursorJson: text("cursor_json"),
    error: text("error"),
    receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_ingress_deliveries_external_uq").on(
      table.venueId,
      table.dataAccountId,
      table.connectionId,
      table.deliveryId,
    ),
    index("integration_ingress_deliveries_tenant_status_idx").on(
      table.venueId,
      table.dataAccountId,
      table.status,
    ),
  ],
);

/** Runtime identity and health of an installed Local Connector agent. */
export const integrationConnectorAgents = sqliteTable(
  "integration_connector_agents",
  {
    id: text("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    machineIdHash: text("machine_id_hash").notNull(),
    machineName: text("machine_name").notNull(),
    agentVersion: text("agent_version").notNull(),
    operatingSystem: text("operating_system"),
    adapterKey: text("adapter_key").notNull().default("onec-common-catering-v1"),
    platformVersion: text("platform_version"),
    configurationName: text("configuration_name"),
    configurationVersion: text("configuration_version"),
    infobaseName: text("infobase_name"),
    readOnly: integer("read_only", { mode: "boolean" }).notNull().default(true),
    status: text("status").notNull().default("connected"),
    autoSync: integer("auto_sync", { mode: "boolean" }).notNull().default(false),
    intervalMinutes: integer("interval_minutes").notNull().default(60),
    lastEntityType: text("last_entity_type"),
    importedCount: integer("imported_count").notNull().default(0),
    lastSeenAt: text("last_seen_at").notNull(),
    lastSyncAt: text("last_sync_at"),
    lastError: text("last_error"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("integration_connector_agents_machine_uq").on(
      table.venueId,
      table.dataAccountId,
      table.connectionId,
      table.machineIdHash,
    ),
    index("integration_connector_agents_tenant_seen_idx").on(
      table.venueId,
      table.dataAccountId,
      table.lastSeenAt,
    ),
  ],
);

export const platformSecrets = sqliteTable(
  "platform_secrets",
  {
    key: text("key").primaryKey(),
    encryptedValue: text("encrypted_value").notNull(),
    sourceAccountId: integer("source_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("platform_secrets_source_account_id_idx").on(table.sourceAccountId)],
);

export const aiUsageLimits = sqliteTable(
  "ai_usage_limits",
  {
    accountId: integer("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    usedRequests: integer("used_requests").notNull().default(0),
    requestLimit: integer("request_limit").notNull().default(250),
    periodKey: text("period_key").notNull().default("legacy"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
);

/** Provider-reported operational metadata. Customer prompts and responses are excluded. */
export const aiUsageEvents = sqliteTable(
  "ai_usage_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    actorAccountId: integer("actor_account_id").references(() => accounts.id, { onDelete: "set null" }),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
    requestId: text("request_id").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    feature: text("feature").notNull().default("other"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    totalTokens: integer("total_tokens"),
    status: text("status").notNull(),
    latencyMs: integer("latency_ms"),
    errorCode: text("error_code"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("ai_usage_events_request_uq").on(table.requestId),
    index("ai_usage_events_created_idx").on(table.createdAt),
    index("ai_usage_events_venue_created_idx").on(table.venueId, table.createdAt),
    index("ai_usage_events_actor_created_idx").on(table.actorAccountId, table.createdAt),
    index("ai_usage_events_feature_created_idx").on(table.feature, table.createdAt),
  ],
);

export const notificationPreferences = sqliteTable(
  "notification_preferences",
  {
    accountId: integer("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    shiftAlerts: integer("shift_alerts", { mode: "boolean" }).notNull().default(true),
    taskAlerts: integer("task_alerts", { mode: "boolean" }).notNull().default(true),
    equipmentAlerts: integer("equipment_alerts", { mode: "boolean" }).notNull().default(true),
    incidentAlerts: integer("incident_alerts", { mode: "boolean" }).notNull().default(true),
    calendarAlerts: integer("calendar_alerts", { mode: "boolean" }).notNull().default(true),
    financeAlerts: integer("finance_alerts", { mode: "boolean" }).notNull().default(true),
    quietStart: text("quiet_start").notNull().default("23:00"),
    quietEnd: text("quiet_end").notNull().default("08:00"),
    timezone: text("timezone").notNull().default("Europe/Chisinau"),
    lastTestAt: text("last_test_at"),
    lastRunAt: text("last_run_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
);

/** Device/subscription telemetry. Preferences remain account-scoped. */
export const notificationDevices = sqliteTable(
  "notification_devices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    deviceKey: text("device_key").notNull(),
    subscriptionId: text("subscription_id"),
    permission: text("permission").notNull().default("default"),
    optedIn: integer("opted_in", { mode: "boolean" }).notNull().default(false),
    active: integer("active", { mode: "boolean" }).notNull().default(false),
    lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("notification_devices_account_device_uq").on(table.accountId, table.deviceKey),
    index("notification_devices_active_seen_idx").on(table.active, table.lastSeenAt),
    index("notification_devices_subscription_idx").on(table.subscriptionId),
  ],
);

export const notificationDeliveries = sqliteTable(
  "notification_deliveries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    targetUrl: text("target_url").notNull().default("/home"),
    status: text("status").notNull(),
    providerMessageId: text("provider_message_id"),
    detail: text("detail"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("notification_deliveries_account_dedupe_uq").on(
      table.accountId,
      table.dedupeKey,
    ),
    index("notification_deliveries_account_created_idx").on(
      table.accountId,
      table.createdAt,
    ),
  ],
);

/** Durable BarDoctor-owned jobs for notifications beyond the provider scheduling horizon. */
export const notificationJobs = sqliteTable(
  "notification_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
    sourceType: text("source_type").notNull().default("system"),
    sourceId: text("source_id"),
    category: text("category").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    targetUrl: text("target_url").notNull().default("/home"),
    targetAt: text("target_at").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    status: text("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: text("next_attempt_at"),
    leasedAt: text("leased_at"),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("notification_jobs_account_dedupe_uq").on(table.accountId, table.dedupeKey),
    index("notification_jobs_dispatch_idx").on(table.status, table.targetAt, table.nextAttemptAt),
    index("notification_jobs_source_idx").on(table.accountId, table.sourceType, table.sourceId),
    index("notification_jobs_venue_status_idx").on(table.venueId, table.status),
  ],
);

/** Append-only state transitions for notification jobs. */
export const notificationJobEvents = sqliteTable(
  "notification_job_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: integer("job_id").notNull().references(() => notificationJobs.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    detail: text("detail"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("notification_job_events_job_created_idx").on(table.jobId, table.createdAt)],
);

/** Platform-level operators. This boundary is intentionally independent from venue roles. */
export const platformAdmins = sqliteTable(
  "platform_admins",
  {
    accountId: integer("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "restrict" }),
    permissionsJson: text("permissions_json").notNull().default('["platform.admin"]'),
    status: text("status").notNull().default("active"),
    provisionedBy: text("provisioned_by").notNull().default("manual"),
    grantedByAccountId: integer("granted_by_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    /** Reserved enforcement hook; MFA is not implemented by the current auth stack. */
    mfaRequired: integer("mfa_required", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("platform_admins_status_idx").on(table.status),
  ],
);

/** Immutable operational history for platform administration, separate from venue audit. */
export const platformAdminAudit = sqliteTable(
  "platform_admin_audit",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    adminAccountId: integer("admin_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    result: text("result").notNull(),
    reason: text("reason"),
    requestId: text("request_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("platform_admin_audit_created_idx").on(table.createdAt),
    index("platform_admin_audit_admin_created_idx").on(table.adminAccountId, table.createdAt),
    index("platform_admin_audit_target_idx").on(table.targetType, table.targetId),
  ],
);

/** Durable rate-limit buckets for sensitive Internal Admin operations. */
export const platformAdminRateLimits = sqliteTable(
  "platform_admin_rate_limits",
  {
    key: text("key").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    windowStartedAt: text("window_started_at").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("platform_admin_rate_limits_account_action_idx").on(table.accountId, table.action),
  ],
);

/** Immutable pre-migration payload. Rows are append-only and never contain credentials. */
export const venueMigrationExports = sqliteTable(
  "venue_migration_exports",
  {
    exportId: text("export_id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    sourceCommit: text("source_commit").notNull(),
    schemaVersion: text("schema_version").notNull(),
    checksum: text("checksum").notNull(),
    payloadJson: text("payload_json").notNull(),
    recordCountsJson: text("record_counts_json").notNull(),
    generatedAt: text("generated_at").notNull(),
    createdByAccountId: integer("created_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("venue_migration_exports_venue_created_idx").on(table.venueId, table.createdAt),
    uniqueIndex("venue_migration_exports_venue_checksum_uq").on(table.venueId, table.checksum),
  ],
);

/** Durable, idempotent per-venue cutover record. A platform batch is intentionally forbidden. */
export const venueMigrationOperations = sqliteTable(
  "venue_migration_operations",
  {
    operationId: text("operation_id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    dataAccountId: integer("data_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    exportId: text("export_id")
      .notNull()
      .references(() => venueMigrationExports.exportId, { onDelete: "restrict" }),
    sourceCommit: text("source_commit").notNull(),
    status: text("status").notNull().default("prepared"),
    planJson: text("plan_json").notNull(),
    affectedStoreKeysJson: text("affected_store_keys_json").notNull(),
    beforeChecksum: text("before_checksum").notNull(),
    afterChecksum: text("after_checksum"),
    cutoverAt: text("cutover_at"),
    rollbackAt: text("rollback_at"),
    failureReason: text("failure_reason"),
    createdByAccountId: integer("created_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("venue_migration_operations_venue_created_idx").on(table.venueId, table.createdAt),
    index("venue_migration_operations_status_idx").on(table.status),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type VenueMembership = typeof venueMemberships.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NotificationDevice = typeof notificationDevices.$inferSelect;
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type VenueMigrationExport = typeof venueMigrationExports.$inferSelect;
export type VenueMigrationOperation = typeof venueMigrationOperations.$inferSelect;
